const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const os = require('os');

let statusBarItem;
let recordingPanel;

function activate(context) {
    console.log('🎤 Complete Voice AI Assistant activated!');
    
    // Show activation message
    vscode.window.showInformationMessage('🎤 Complete Voice AI Assistant activated!');
    
    try {
        // Create the working mic icon (keeping the proven code)
        statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right, 
            1000
        );
        
        statusBarItem.text = "$(microphone) Voice AI";
        statusBarItem.tooltip = "Click to start voice recording";
        statusBarItem.command = 'voiceAI.record'; // Now connects to full recording system
        statusBarItem.show();
        context.subscriptions.push(statusBarItem);
        
        console.log('✅ Voice AI mic icon created successfully');
        
    } catch (error) {
        console.error('❌ Failed to create mic icon:', error);
        vscode.window.showErrorMessage('Failed to create mic icon: ' + error.message);
    }
    
    // Register all commands
    const recordCommand = vscode.commands.registerCommand('voiceAI.record', startRecording);
    const settingsCommand = vscode.commands.registerCommand('voiceAI.settings', openSettings);
    const testCommand = vscode.commands.registerCommand('voiceAI.testSettings', testSettings);
    
    context.subscriptions.push(recordCommand, settingsCommand, testCommand);
    
    console.log('✅ Complete Voice AI Assistant fully activated');
}

let isRecording = false;
let recordingProcess = null;

async function startRecording() {
    console.log('🎤 Starting Windows system recording...');
    
    if (recordingPanel) {
        recordingPanel.reveal();
        return;
    }
    
    recordingPanel = vscode.window.createWebviewPanel(
        'voiceRecording',
        'Voice AI Recording',
        vscode.ViewColumn.Beside,
        {
            enableScripts: true,
            retainContextWhenHidden: true
        }
    );
    
    recordingPanel.webview.html = getRecordingHTML();
    
    recordingPanel.webview.onDidReceiveMessage(async (message) => {
        switch (message.command) {
            case 'startSystemRecording':
                await startSystemRecording();
                break;
            case 'stopSystemRecording':
                await stopSystemRecording();
                break;
            case 'copyText':
                await vscode.env.clipboard.writeText(message.text);
                vscode.window.showInformationMessage('✅ Text copied to clipboard!');
                break;
            case 'sendToChatGPT':
                await sendToChatGPT(message.text);
                break;
            case 'openSettings':
                openSettings();
                break;
        }
    });
    
    recordingPanel.onDidDispose(() => {
        recordingPanel = null;
        if (isRecording) {
            stopSystemRecording();
        }
    });
}

async function startSystemRecording() {
    if (isRecording) {
        vscode.window.showWarningMessage('Recording is already in progress');
        return;
    }

    try {
        vscode.window.showInformationMessage('🔴 Starting Windows system recording...');
        isRecording = true;

        const { spawn } = require('child_process');
        const tempDir = os.tmpdir();
        const audioFile = path.join(tempDir, `voice_recording_${Date.now()}.wav`);

        const recordCmd = spawn('powershell', [
            '-Command',
            `
            Add-Type -TypeDefinition '
            using System;
            using System.Runtime.InteropServices;
            public class WinMM {
                [DllImport("winmm.dll", SetLastError = true)]
                public static extern uint mciSendString(string lpstrCommand, System.Text.StringBuilder lpstrReturnString, int uReturnLength, IntPtr hwndCallback);
            }';
            
            $null = [WinMM]::mciSendString("open new Type waveaudio Alias recsound", $null, 0, [IntPtr]::Zero);
            $null = [WinMM]::mciSendString("record recsound", $null, 0, [IntPtr]::Zero);
            
            Write-Host "RECORDING_STARTED";
            Read-Host;
            
            $null = [WinMM]::mciSendString("stop recsound", $null, 0, [IntPtr]::Zero);
            $null = [WinMM]::mciSendString("save recsound ${audioFile}", $null, 0, [IntPtr]::Zero);
            $null = [WinMM]::mciSendString("close recsound", $null, 0, [IntPtr]::Zero);
            Write-Host "RECORDING_SAVED:${audioFile}";
            `
        ]);

        recordingProcess = {
            process: recordCmd,
            audioFile: audioFile
        };

        recordCmd.stdout.on('data', (data) => {
            const output = data.toString();
            console.log('Recording output:', output);
            
            if (output.includes('RECORDING_STARTED')) {
                vscode.window.showInformationMessage('🎤 System recording active! Click Stop when finished.');
                if (recordingPanel) {
                    recordingPanel.webview.postMessage({
                        command: 'recordingStarted'
                    });
                }
            }
            
            if (output.includes('RECORDING_SAVED')) {
                console.log('Audio file created:', audioFile);
                vscode.window.showInformationMessage('📁 Audio saved! Processing...');
                processRecordedAudio(audioFile);
            }
        });

        recordCmd.stderr.on('data', (data) => {
            console.error('Recording error:', data.toString());
        });

        recordCmd.on('close', (code) => {
            console.log(`Recording process exited with code ${code}`);
            isRecording = false;
            recordingProcess = null;
        });

    } catch (error) {
        console.error('Error starting system recording:', error);
        vscode.window.showErrorMessage(`Failed to start recording: ${error.message}`);
        isRecording = false;
    }
}

async function stopSystemRecording() {
    if (!isRecording || !recordingProcess) {
        vscode.window.showWarningMessage('No recording in progress');
        return;
    }

    try {
        vscode.window.showInformationMessage('⏹️ Stopping system recording...');
        
        // Send input to PowerShell to stop recording
        recordingProcess.process.stdin.write('\n');
        recordingProcess.process.stdin.end();
        
        if (recordingPanel) {
            recordingPanel.webview.postMessage({
                command: 'recordingStopped'
            });
        }

    } catch (error) {
        console.error('Error stopping recording:', error);
        vscode.window.showErrorMessage(`Failed to stop recording: ${error.message}`);
    }
}

async function processRecordedAudio(audioFilePath) {
    try {
        if (!fs.existsSync(audioFilePath)) {
            throw new Error('Audio file not found');
        }

        const fileStats = fs.statSync(audioFilePath);
        if (fileStats.size === 0) {
            throw new Error('Audio file is empty - recording may have failed');
        }

        vscode.window.showInformationMessage(`🔄 Processing audio file (${Math.round(fileStats.size/1024)}KB)...`);

        // Real OpenAI transcription
        const config = vscode.workspace.getConfiguration('voiceAI');
        const apiKey = config.get('openaiApiKey');
        
        console.log('Debug - API Key check:', apiKey ? 'API key is set' : 'API key is missing');
        console.log('Debug - Config object:', config);
        console.log('Debug - All voiceAI settings:', {
            apiKey: apiKey ? '***HIDDEN***' : 'NOT SET',
            transcriptionModel: config.get('transcriptionModel'),
            gptModel: config.get('gptModel'),
            temperature: config.get('temperature'),
            audioQuality: config.get('audioQuality')
        });
        
        if (!apiKey || apiKey.trim() === '') {
            const errorMessage = 'Please set your OpenAI API key in settings (⚙️ Voice AI Settings) to enable transcription.';
            console.error('API key missing or empty');
            
            if (recordingPanel) {
                recordingPanel.webview.postMessage({
                    command: 'results',
                    transcription: errorMessage,
                    feedback: null // Don't show AI feedback section
                });
            }
            vscode.window.showWarningMessage('OpenAI API key not configured. Click ⚙️ Voice AI Settings to configure.');
            return;
        }

        try {
            // Dynamically import OpenAI to avoid activation issues
            const OpenAI = require('openai');
            const openai = new OpenAI({ apiKey });
            
            // Transcribe the audio file
            const transcription = await openai.audio.transcriptions.create({
                file: fs.createReadStream(audioFilePath),
                model: config.get('transcriptionModel') || 'gpt-4o-transcribe',
                temperature: config.get('temperature') || 0.1,
                language: 'en'
            });

                    // Just send transcription, no automatic AI feedback
        if (recordingPanel) {
            recordingPanel.webview.postMessage({
                command: 'results',
                transcription: transcription.text,
                feedback: null // No automatic feedback
            });
        }
        } catch (openaiError) {
            console.error('OpenAI error:', openaiError);
            if (recordingPanel) {
                recordingPanel.webview.postMessage({
                    command: 'results', 
                    transcription: `Audio recorded (${Math.round(fileStats.size/1024)}KB). Please set your OpenAI API key in settings for transcription.`,
                    feedback: null // Don't show AI feedback section on error
                });
            }
        }
        
        vscode.window.showInformationMessage('✅ Processing completed!');

        // Clean up temp file
        try {
            fs.unlinkSync(audioFilePath);
        } catch (cleanupError) {
            console.warn('Failed to cleanup audio file:', cleanupError);
        }

    } catch (error) {
        console.error('Processing error:', error);
        vscode.window.showErrorMessage(`Processing failed: ${error.message}`);
        
        if (recordingPanel) {
            recordingPanel.webview.postMessage({
                command: 'error',
                message: error.message
            });
        }
    }
}



function openSettings() {
    vscode.commands.executeCommand('workbench.action.openSettings', 'voiceAI');
}

function testSettings() {
    const config = vscode.workspace.getConfiguration('voiceAI');
    const apiKey = config.get('openaiApiKey');
    
    const settingsInfo = {
        apiKey: apiKey ? `Set (${apiKey.length} characters)` : 'NOT SET',
        transcriptionModel: config.get('transcriptionModel') || 'Not set',
        gptModel: config.get('gptModel') || 'Not set',
        temperature: config.get('temperature') || 'Not set',
        audioQuality: config.get('audioQuality') || 'Not set'
    };
    
    console.log('Voice AI Settings Test:', settingsInfo);
    
    const message = `Voice AI Settings Test:
• API Key: ${settingsInfo.apiKey}
• Transcription Model: ${settingsInfo.transcriptionModel}
• GPT Model: ${settingsInfo.gptModel}
• Temperature: ${settingsInfo.temperature}
• Audio Quality: ${settingsInfo.audioQuality}

${apiKey ? '✅ API Key is configured!' : '❌ API Key is missing - click ⚙️ Voice AI Settings to configure'}`;
    
    vscode.window.showInformationMessage(message, 'Open Settings', 'Copy Debug Info').then(selection => {
        if (selection === 'Open Settings') {
            openSettings();
        } else if (selection === 'Copy Debug Info') {
            vscode.env.clipboard.writeText(JSON.stringify(settingsInfo, null, 2));
            vscode.window.showInformationMessage('Debug info copied to clipboard!');
        }
    });
}

async function sendToChatGPT(text) {
    try {
        const config = vscode.workspace.getConfiguration('voiceAI');
        const apiKey = config.get('openaiApiKey');
        
        console.log('Debug ChatGPT - API Key check:', apiKey ? 'API key is set' : 'API key is missing');
        
        if (!apiKey || apiKey.trim() === '') {
            const errorMessage = 'Please set your OpenAI API key in settings (⚙️ Voice AI Settings) to use ChatGPT.';
            console.error('ChatGPT: API key missing or empty');
            
            if (recordingPanel) {
                recordingPanel.webview.postMessage({
                    command: 'chatGPTResponse',
                    response: errorMessage
                });
            }
            vscode.window.showWarningMessage('OpenAI API key not configured for ChatGPT. Click ⚙️ Voice AI Settings to configure.');
            return;
        }

        // Get ChatGPT response
        const OpenAI = require('openai');
        const openai = new OpenAI({ apiKey });
        
        const gptResponse = await openai.chat.completions.create({
            model: config.get('gptModel') || 'gpt-4o',
            messages: [
                {
                    role: 'user',
                    content: text
                }
            ],
            temperature: config.get('temperature') || 0.1,
            max_tokens: 1000
        });
        
        if (recordingPanel) {
            recordingPanel.webview.postMessage({
                command: 'chatGPTResponse',
                response: gptResponse.choices[0].message.content
            });
        }
        
    } catch (error) {
        console.error('ChatGPT error:', error);
        if (recordingPanel) {
            recordingPanel.webview.postMessage({
                command: 'chatGPTResponse',
                response: `Error: ${error.message}. Please check your API key in settings.`
            });
        }
    }
}

function getRecordingHTML() {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Voice AI Recording</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            padding: 20px;
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            margin: 0;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
        }
        h1 {
            text-align: center;
            margin-bottom: 15px;
            font-size: 20px;
        }
        .record-section {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 8px;
        }
        .record-button {
            background: #007ACC;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 20px;
            font-size: 14px;
            cursor: pointer;
            margin: 5px;
            transition: all 0.3s;
            min-width: 160px;
        }
        .record-button:hover {
            background: #005a9e;
            transform: scale(1.05);
        }
        .record-button:disabled {
            background: #666;
            cursor: not-allowed;
            transform: none;
        }
        .recording {
            background: #dc3545 !important;
            animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.7; }
            100% { opacity: 1; }
        }
        .status {
            text-align: center;
            margin: 10px 0;
            font-weight: bold;
            font-size: 13px;
        }
        .status.recording {
            color: #dc3545;
        }
        .status.processing {
            color: #ffc107;
        }
        .status.complete {
            color: #28a745;
        }
        .results {
            margin-top: 30px;
        }
        .result-section {
            margin: 20px 0;
            padding: 20px;
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 8px;
        }
        .result-section h3 {
            margin-top: 0;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 15px;
        }
        .copy-button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 15px;
            border-radius: 4px;
            cursor: pointer;
            margin-top: 10px;
            transition: background 0.3s;
        }
        .copy-button:hover {
            background: var(--vscode-button-hoverBackground);
        }
        textarea {
            width: 100%;
            min-height: 60px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            padding: 8px;
            border-radius: 4px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 12px;
            line-height: 1.3;
            resize: vertical;
            box-sizing: border-box;
        }
        .button-row {
            display: flex;
            gap: 10px;
            margin-top: 10px;
        }
        .button-row .copy-button {
            flex: 1;
            margin-top: 0;
        }
        .error {
            background: var(--vscode-inputValidation-errorBackground);
            color: var(--vscode-inputValidation-errorForeground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
        }
        .settings-link {
            text-align: center;
            margin: 20px 0;
        }
        .settings-button {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎤 Voice AI Assistant</h1>
        
        <div class="record-section">
            <button id="recordButton" class="record-button">🎤 Start Recording</button>
            <div id="status" class="status">Ready to record with Windows system</div>
        </div>
        
        <div class="settings-link">
            <button class="settings-button" onclick="openSettings()">⚙️ Open Settings</button>
        </div>
        
        <div id="results" class="results" style="display: none;">
            <div class="result-section">
                <h3>📝 Transcription</h3>
                <textarea id="transcriptionText" readonly placeholder="Your transcribed speech will appear here..."></textarea>
                <div class="button-row">
                    <button class="copy-button" onclick="copyTranscription()">📋 Copy</button>
                    <button class="copy-button" onclick="sendTranscriptionToChatGPT()">💬 Send to ChatGPT</button>
                </div>
            </div>
            
            <div class="result-section" id="feedbackSection" style="display: none;">
                <h3>🤖 ChatGPT Response</h3>
                <textarea id="feedbackText" readonly placeholder="ChatGPT response will appear here..."></textarea>
                <div class="button-row">
                    <button class="copy-button" onclick="copyFeedback()">📋 Copy</button>
                </div>
            </div>
        </div>
        
        <div id="errorSection" class="error" style="display: none;">
            <strong>❌ Error:</strong> <span id="errorMessage"></span>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let mediaRecorder = null;
        let audioChunks = [];
        let isRecording = false;

        const recordButton = document.getElementById('recordButton');
        const status = document.getElementById('status');
        const results = document.getElementById('results');
        const transcriptionText = document.getElementById('transcriptionText');
        const feedbackText = document.getElementById('feedbackText');
        const errorSection = document.getElementById('errorSection');
        const errorMessage = document.getElementById('errorMessage');

        recordButton.addEventListener('click', toggleRecording);

        async function toggleRecording() {
            if (!isRecording) {
                await startRecording();
            } else {
                stopRecording();
            }
        }

        async function startRecording() {
            try {
                console.log('Starting Windows system recording...');
                
                // Use Windows system recording instead of browser
                vscode.postMessage({
                    command: 'startSystemRecording'
                });
                
                isRecording = true;
                recordButton.textContent = '⏹️ Stop Recording';
                recordButton.classList.add('recording');
                status.textContent = '🔴 Starting Windows system recording...';
                status.className = 'status recording';
                results.style.display = 'none';
                errorSection.style.display = 'none';
                
            } catch (error) {
                console.error('Recording error:', error);
                showError('Could not start Windows system recording.');
            }
        }

        function stopRecording() {
            if (isRecording) {
                console.log('Stopping Windows system recording...');
                
                vscode.postMessage({
                    command: 'stopSystemRecording'
                });
                
                isRecording = false;
                recordButton.textContent = '🎤 Start Recording';
                recordButton.classList.remove('recording');
                status.textContent = '⏳ Stopping recording and processing...';
                status.className = 'status processing';
            }
        }

        function copyTranscription() {
            vscode.postMessage({
                command: 'copyText',
                text: transcriptionText.value
            });
        }

        function copyFeedback() {
            vscode.postMessage({
                command: 'copyText',
                text: feedbackText.value
            });
        }

        function sendTranscriptionToChatGPT() {
            // Show loading state
            const feedbackSection = document.getElementById('feedbackSection');
            feedbackSection.style.display = 'block';
            feedbackText.value = 'Sending to ChatGPT...';
            
            vscode.postMessage({
                command: 'sendToChatGPT',
                text: transcriptionText.value
            });
        }



        function openSettings() {
            vscode.postMessage({
                command: 'openSettings'
            });
        }

        function showError(message) {
            errorMessage.textContent = message;
            errorSection.style.display = 'block';
            status.textContent = 'Ready to record';
            status.className = 'status';
        }

        // Listen for messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            console.log('Received message:', message);
            
            switch (message.command) {
                case 'recordingStarted':
                    isRecording = true;
                    recordButton.textContent = '⏹️ Stop Recording';
                    recordButton.classList.add('recording');
                    status.textContent = '🔴 Windows recording active! Click Stop when finished.';
                    status.className = 'status recording';
                    break;
                    
                case 'recordingStopped':
                    isRecording = false;
                    recordButton.textContent = '🎤 Start Recording';
                    recordButton.classList.remove('recording');
                    status.textContent = '⏳ Processing recorded audio...';
                    status.className = 'status processing';
                    break;
                    
                case 'results':
                    transcriptionText.value = message.transcription;
                    results.style.display = 'block';
                    
                    // Always hide feedback section initially
                    const feedbackSection = document.getElementById('feedbackSection');
                    feedbackSection.style.display = 'none';
                    
                    status.textContent = '✅ Complete! Results ready.';
                    status.className = 'status complete';
                    errorSection.style.display = 'none';
                    break;
                    
                case 'chatGPTResponse':
                    const feedbackSectionResponse = document.getElementById('feedbackSection');
                    feedbackSectionResponse.style.display = 'block';
                    feedbackText.value = message.response;
                    break;
                    
                case 'error':
                    showError(message.message);
                    isRecording = false;
                    recordButton.textContent = '🎤 Start Recording';
                    recordButton.classList.remove('recording');
                    break;
            }
        });
    </script>
</body>
</html>`;
}

function deactivate() {
    console.log('🎤 Complete Voice AI Assistant deactivated');
    if (statusBarItem) {
        statusBarItem.dispose();
    }
    if (recordingPanel) {
        recordingPanel.dispose();
    }
}

module.exports = {
    activate,
    deactivate
};