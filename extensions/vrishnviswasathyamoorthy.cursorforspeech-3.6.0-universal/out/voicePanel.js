"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoicePanel = void 0;
const vscode = __importStar(require("vscode"));
class VoicePanel {
    static async toggleRecording(extensionUri, transcriptionService, configService, whisperService) {
        if (VoicePanel.currentPanel) {
            // Send message to the webview to toggle recording
            VoicePanel.currentPanel._panel.webview.postMessage({ type: 'toggleRecordingFromExtension' });
        }
        else if (extensionUri && transcriptionService && configService) {
            // If no panel is open but we have the required parameters, open it
            VoicePanel.createOrShow(extensionUri, transcriptionService, configService, whisperService);
            // Wait a moment for the panel to initialize, then send the toggle message
            setTimeout(() => {
                if (VoicePanel.currentPanel) {
                    VoicePanel.currentPanel._panel.webview.postMessage({ type: 'toggleRecordingFromExtension' });
                }
            }, 100);
        }
        else {
            // If no panel is open and we don't have the parameters, show a message
            vscode.window.showInformationMessage('Please open the Voice panel first using the "Open Voice Panel" command.');
        }
    }
    static createOrShow(extensionUri, transcriptionService, configService, whisperService) {
        // Always use ViewColumn.Two to open in the right panel, connected to the border
        const column = vscode.ViewColumn.Two;
        if (VoicePanel.currentPanel) {
            // If panel already exists, just reveal it in the same column
            VoicePanel.currentPanel._panel.reveal(column);
            return;
        }
        const panel = vscode.window.createWebviewPanel(VoicePanel.viewType, 'Voice', column, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [
                vscode.Uri.joinPath(extensionUri, 'media'),
                vscode.Uri.joinPath(extensionUri, 'out', 'compiled')
            ]
        });
        VoicePanel.currentPanel = new VoicePanel(panel, extensionUri, transcriptionService, configService, whisperService);
    }
    constructor(panel, extensionUri, transcriptionService, configService, whisperService) {
        this.transcriptionService = transcriptionService;
        this.configService = configService;
        this.whisperService = whisperService;
        this._disposables = [];
        this._panel = panel;
        this._extensionUri = extensionUri;
        // Suppress unused parameter warning
        void this.whisperService;
        this._update();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case 'toggleRecording':
                    // Send message to webview to toggle recording
                    this._panel.webview.postMessage({ type: 'toggleRecordingFromExtension' });
                    break;
                case 'selectLanguage':
                    await this.configService.setLanguage(message.language);
                    this._update();
                    break;
                case 'toggleAutoInsert':
                    await this.configService.setAutoInsertInEditor(message.enabled);
                    this._update();
                    break;
                case 'toggleWhisper':
                    await vscode.workspace.getConfiguration('cursorforspeech').update('useWhisper', message.enabled, vscode.ConfigurationTarget.Global);
                    this._update();
                    break;
                case 'insertTranscriptInEditor':
                    await vscode.env.clipboard.writeText(message.text || '');
                    await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
                    break;
                case 'copyTranscript':
                    await vscode.env.clipboard.writeText(message.text || '');
                    vscode.window.showInformationMessage('Transcript copied to clipboard');
                    break;
                case 'sendToCursorChat':
                    await vscode.env.clipboard.writeText(message.text || '');
                    // Try opening chat in Cursor/VS Code
                    const candidateCommands = [
                        'workbench.action.chat.openInChatEditor',
                        'workbench.action.openChat',
                        'workbench.panel.chat.view.focus',
                        'cursor.openChat'
                    ];
                    for (const cmd of candidateCommands) {
                        try {
                            await vscode.commands.executeCommand(cmd);
                            break;
                        }
                        catch { /* ignore */ }
                    }
                    vscode.window.showInformationMessage('Transcript copied. Paste into chat using Ctrl/Cmd+V.');
                    break;
            }
        }, null, this._disposables);
        // Web Speech API is now handled directly in the webview
    }
    dispose() {
        VoicePanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
    _update() {
        const webview = this._panel.webview;
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }
    _getHtmlForWebview(webview) {
        const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
        const nonce = getNonce();
        const initialTranscript = this.transcriptionService.getLastTranscript() || '';
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${styleVSCodeUri}" rel="stylesheet">
                <title>Cursor for Speech Voice Panel</title>
                <style>
                    body {
                        padding: 12px;
                        font-family: var(--vscode-font-family);
                        margin: 0;
                        font-size: 13px;
                        background: var(--vscode-editor-background);
                    }
                    .container {
                        width: 300px;
                        max-width: 300px;
                        min-width: 300px;
                        margin: 0;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 12px;
                        padding-bottom: 8px;
                        border-bottom: 1px solid var(--vscode-panel-border);
                    }
                    .header h2 {
                        margin: 0;
                        font-size: 14px;
                        color: var(--vscode-foreground);
                        font-weight: 600;
                    }
                    .mic-section {
                        text-align: center;
                        margin-bottom: 16px;
                    }
                    .mic-button {
                        width: 60px;
                        height: 60px;
                        border-radius: 50%;
                        border: 2px solid var(--vscode-button-background);
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 24px;
                        margin: 0 auto 8px;
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    }
                    .mic-button:hover {
                        background: var(--vscode-button-hoverBackground);
                        transform: scale(1.05);
                        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    }
                    .mic-button.recording {
                        background: #ff4444;
                        border-color: #ff4444;
                        animation: pulse 1.5s infinite;
                        box-shadow: 0 0 20px rgba(255, 68, 68, 0.4);
                    }
                    .mic-button.transcribing {
                        background: var(--vscode-progressBar-background);
                        animation: spin 2s linear infinite;
                    }
                    .mic-button:disabled {
                        opacity: 0.6;
                        cursor: not-allowed;
                        transform: none;
                    }
                    @keyframes pulse {
                        0%, 100% { 
                            transform: scale(1);
                            box-shadow: 0 0 20px rgba(255, 68, 68, 0.4);
                        }
                        50% { 
                            transform: scale(1.1);
                            box-shadow: 0 0 30px rgba(255, 68, 68, 0.6);
                        }
                    }
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                    .status {
                        text-align: center;
                        margin: 8px 0;
                        color: var(--vscode-foreground);
                        font-size: 12px;
                        font-weight: 500;
                        padding: 4px 8px;
                        border-radius: 4px;
                        background: var(--vscode-input-background);
                        border: 1px solid var(--vscode-input-border);
                    }
                    .status.recording {
                        background: rgba(255, 68, 68, 0.1);
                        border-color: #ff4444;
                        color: #ff4444;
                    }
                    .status.transcribing {
                        background: rgba(0, 122, 255, 0.1);
                        border-color: #007aff;
                        color: #007aff;
                    }
                    .settings {
                        margin-top: 12px;
                        padding: 12px;
                        border: 1px solid var(--vscode-panel-border);
                        border-radius: 6px;
                        background: var(--vscode-panel-background);
                    }
                    .setting-row {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin: 8px 0;
                        font-size: 12px;
                    }
                    select, input[type="checkbox"] {
                        background: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        border: 1px solid var(--vscode-input-border);
                        padding: 2px;
                        border-radius: 2px;
                        font-size: 11px;
                    }
                    .help-text {
                        font-size: 10px;
                        color: var(--vscode-descriptionForeground);
                        margin-top: 8px;
                        line-height: 1.2;
                    }
                    .transcript-section {
                        margin-top: 12px;
                        padding: 12px;
                        border: 1px solid var(--vscode-panel-border);
                        border-radius: 6px;
                        background: var(--vscode-panel-background);
                    }
                    .transcript-section h3 {
                        margin: 0 0 8px 0;
                        font-size: 13px;
                        font-weight: 600;
                        color: var(--vscode-foreground);
                    }
                    .transcript-box {
                        width: 100%;
                        height: 80px;
                        resize: vertical;
                        background: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        border: 1px solid var(--vscode-input-border);
                        border-radius: 4px;
                        padding: 8px;
                        font-size: 12px;
                        font-family: var(--vscode-font-family);
                        line-height: 1.4;
                        transition: border-color 0.2s ease;
                    }
                    .transcript-box:focus {
                        outline: none;
                        border-color: var(--vscode-focusBorder);
                    }
                    .transcript-box.interim {
                        border-color: #007aff;
                        background: rgba(0, 122, 255, 0.05);
                    }
                    .action-buttons {
                        margin-top: 8px;
                        display: flex;
                        gap: 6px;
                        flex-wrap: wrap;
                    }
                    .action-buttons button {
                        font-size: 11px;
                        padding: 6px 12px;
                        border: none;
                        border-radius: 4px;
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        cursor: pointer;
                        transition: all 0.2s ease;
                        font-weight: 500;
                    }
                    .action-buttons button:hover {
                        background: var(--vscode-button-hoverBackground);
                        transform: translateY(-1px);
                    }
                    .action-buttons button:active {
                        transform: translateY(0);
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>🎤 Voice to Text</h2>
                    </div>
                    
                    <div class="mic-section">
                        <button id="micButton" class="mic-button">
                            <span id="micIcon">🎤</span>
                        </button>
                        <div id="status" class="status">Ready - Click to record</div>
                    </div>

                    <div class="settings">
                        <h3 style="margin: 4px 0; font-size: 12px;">Settings</h3>
                        
                        <div class="setting-row">
                            <label for="languageSelect">Language:</label>
                            <select id="languageSelect">
                                <option value="auto">Auto Detect</option>
                                <option value="english">English</option>
                                <option value="chinese">Chinese</option>
                                <option value="german">German</option>
                                <option value="spanish">Spanish</option>
                                <option value="french">French</option>
                                <option value="japanese">Japanese</option>
                                <option value="korean">Korean</option>
                                <option value="russian">Russian</option>
                                <option value="portuguese">Portuguese</option>
                                <option value="italian">Italian</option>
                                <option value="dutch">Dutch</option>
                                <option value="arabic">Arabic</option>
                                <option value="hindi">Hindi</option>
                                <option value="thai">Thai</option>
                                <option value="vietnamese">Vietnamese</option>
                            </select>
                        </div>

                        <div class="setting-row">
                            <label for="autoInsertCheck">Auto-insert in editor:</label>
                            <input type="checkbox" id="autoInsertCheck" ${this.configService.getAutoInsertInEditor() ? 'checked' : ''}>
                        </div>

                        <div class="setting-row">
                            <label for="useWhisperCheck">Use Whisper (better accuracy):</label>
                            <input type="checkbox" id="useWhisperCheck" ${vscode.workspace.getConfiguration('cursorforspeech').get('useWhisper') ? 'checked' : ''}>
                        </div>
                    </div>

                    <div class="transcript-section">
                        <h3>Live Transcript</h3>
                        <textarea id="transcriptBox" class="transcript-box" placeholder="Your speech will appear here in real-time...">${initialTranscript.replace(/`/g, '\`')}</textarea>
                        <div class="action-buttons">
                            <button id="btnInsert">📝 Insert</button>
                            <button id="btnCopy">📋 Copy</button>
                            <button id="btnSend">💬 Send to Chat</button>
                        </div>
                    </div>

                    <div class="help-text">
                        <strong>Tips:</strong><br>
                        • Click mic to record • Ctrl+Shift+V hotkey<br>
                        • Grant microphone permission when asked<br>
                        • Uses Web Speech API for transcription
                    </div>
                </div>

                <script nonce="${nonce}">
                    const vscode = acquireVsCodeApi();
                    const micButton = document.getElementById('micButton');
                    const micIcon = document.getElementById('micIcon');
                    const status = document.getElementById('status');
                    const languageSelect = document.getElementById('languageSelect');
                    const autoInsertCheck = document.getElementById('autoInsertCheck');
                    const useWhisperCheck = document.getElementById('useWhisperCheck');
                    const transcriptBox = document.getElementById('transcriptBox');
                    const btnInsert = document.getElementById('btnInsert');
                    const btnCopy = document.getElementById('btnCopy');
                    const btnSend = document.getElementById('btnSend');

                    // Set initial language
                    languageSelect.value = '${this.configService.getLanguage()}';

                    let currentState = 'idle';
                    let recognition = null;
                    let isRecording = false;

                    // Initialize Web Speech API
                    function initializeSpeechRecognition() {
                        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                            updateStatus('Web Speech API not supported in this browser', 'error');
                            return false;
                        }

                        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                        recognition = new SpeechRecognition();
                        recognition.continuous = false;
                        recognition.interimResults = true;
                        recognition.maxAlternatives = 1;

                        recognition.onstart = () => {
                            isRecording = true;
                            updateUI('recording');
                        };

                        recognition.onresult = (event) => {
                            let interimTranscript = '';
                            let finalTranscript = '';

                            for (let i = event.resultIndex; i < event.results.length; i++) {
                                const result = event.results[i];
                                const transcript = result[0].transcript;
                                const confidence = result[0].confidence;

                                if (result.isFinal) {
                                    finalTranscript += transcript;
                                } else {
                                    interimTranscript += transcript;
                                }

                                // Update transcript box with real-time results
                                const currentText = transcriptBox.value;
                                const newText = currentText + finalTranscript + interimTranscript;
                                transcriptBox.value = newText;
                                
                                // Add visual feedback for interim results
                                if (!result.isFinal) {
                                    transcriptBox.classList.add('interim');
                                } else {
                                    transcriptBox.classList.remove('interim');
                                }
                                
                                // Auto-scroll to bottom
                                transcriptBox.scrollTop = transcriptBox.scrollHeight;
                            }
                        };

                        recognition.onerror = (event) => {
                            isRecording = false;
                            updateUI('idle');
                            
                            let errorMessage = 'Speech recognition error';
                            switch (event.error) {
                                case 'no-speech':
                                    errorMessage = 'No speech detected. Please try again.';
                                    break;
                                case 'audio-capture':
                                    errorMessage = 'Microphone access denied or not available.';
                                    break;
                                case 'not-allowed':
                                    errorMessage = 'Microphone permission denied. Please allow microphone access.';
                                    break;
                                case 'network':
                                    errorMessage = 'Network error. Check your internet connection.';
                                    break;
                                default:
                                    errorMessage = \`Speech recognition error: \${event.error}\`;
                            }
                            
                            updateStatus(errorMessage, 'error');
                        };

                        recognition.onend = () => {
                            isRecording = false;
                            if (currentState === 'recording') {
                                updateUI('idle');
                            }
                        };

                        return true;
                    }

                    function updateStatus(message, type = 'info') {
                        status.textContent = message;
                        status.className = 'status ' + type;
                    }

                    // Check if Whisper is enabled and API key is configured
                    const useWhisper = ${vscode.workspace.getConfiguration('cursorforspeech').get('useWhisper')};
                    const hasApiKey = '${vscode.workspace.getConfiguration('cursorforspeech').get('whisperApiKey')}'.trim() !== '';
                    
                    if (useWhisper && !hasApiKey) {
                        updateStatus('⚠️ OpenAI API key required for Whisper', 'error');
                        micButton.disabled = true;
                        micButton.title = 'Configure OpenAI API key in settings to use Whisper';
                    } else {
                        // Initialize speech recognition on page load
                        if (!initializeSpeechRecognition()) {
                            updateStatus('Speech recognition not available', 'error');
                            micButton.disabled = true;
                        }
                    }

                    micButton.addEventListener('click', () => {
                        if (!recognition) {
                            updateStatus('Speech recognition not available', 'error');
                            return;
                        }

                        if (isRecording) {
                            // Stop recording
                            recognition.stop();
                            updateUI('idle');
                        } else {
                            // Start recording
                            try {
                                // Set language
                                const langCode = mapLanguageToCode(languageSelect.value);
                                recognition.lang = langCode;
                                
                                // Start recognition
                                recognition.start();
                                updateUI('recording');
                            } catch (error) {
                                updateStatus('Failed to start recording: ' + error.message, 'error');
                                updateUI('idle');
                            }
                        }
                    });

                    function mapLanguageToCode(language) {
                        const languageMap = {
                            'auto': 'en-US',
                            'english': 'en-US',
                            'spanish': 'es-ES',
                            'french': 'fr-FR',
                            'german': 'de-DE',
                            'italian': 'it-IT',
                            'portuguese': 'pt-BR',
                            'russian': 'ru-RU',
                            'chinese': 'zh-CN',
                            'japanese': 'ja-JP',
                            'korean': 'ko-KR',
                            'arabic': 'ar-SA',
                            'hindi': 'hi-IN',
                            'dutch': 'nl-NL',
                            'swedish': 'sv-SE',
                            'norwegian': 'no-NO',
                            'danish': 'da-DK',
                            'finnish': 'fi-FI',
                            'polish': 'pl-PL',
                            'turkish': 'tr-TR',
                            'thai': 'th-TH',
                            'vietnamese': 'vi-VN'
                        };
                        return languageMap[language] || 'en-US';
                    }

                    languageSelect.addEventListener('change', (e) => {
                        vscode.postMessage({ 
                            type: 'selectLanguage', 
                            language: e.target.value 
                        });
                    });

                    autoInsertCheck.addEventListener('change', (e) => {
                        vscode.postMessage({ 
                            type: 'toggleAutoInsert', 
                            enabled: e.target.checked 
                        });
                    });

                    useWhisperCheck.addEventListener('change', (e) => {
                        if (e.target.checked) {
                            // Check if API key is configured when enabling Whisper
                            const hasApiKey = '${vscode.workspace.getConfiguration('cursorforspeech').get('whisperApiKey')}'.trim() !== '';
                            if (!hasApiKey) {
                                vscode.window.showWarningMessage(
                                    'OpenAI API key required for Whisper. Configure it in settings?',
                                    'Open Settings',
                                    'Cancel'
                                ).then(selection => {
                                    if (selection === 'Open Settings') {
                                        vscode.commands.executeCommand('workbench.action.openSettings', 'cursorforspeech.whisperApiKey');
                                    } else {
                                        // Uncheck the box if user cancels
                                        useWhisperCheck.checked = false;
                                    }
                                });
                                return;
                            }
                        }
                        
                        vscode.postMessage({ 
                            type: 'toggleWhisper', 
                            enabled: e.target.checked 
                        });
                    });

                    // Listen for messages from the extension
                    window.addEventListener('message', event => {
                        const message = event.data;
                        if (message.type === 'toggleRecordingFromExtension') {
                            // Simulate a click on the mic button
                            micButton.click();
                        }
                    });

                    // State and transcript updates are now handled locally in the webview
                    btnInsert.addEventListener('click', () => {
                        vscode.postMessage({ type: 'insertTranscriptInEditor', text: transcriptBox.value });
                    });

                    btnCopy.addEventListener('click', () => {
                        vscode.postMessage({ type: 'copyTranscript', text: transcriptBox.value });
                    });

                    btnSend.addEventListener('click', () => {
                        vscode.postMessage({ type: 'sendToCursorChat', text: transcriptBox.value });
                    });

                    function updateUI(state) {
                        currentState = state;
                        micButton.className = 'mic-button ' + state;
                        
                        switch (state) {
                            case 'idle':
                                micIcon.textContent = '🎤';
                                status.textContent = 'Ready - Click to record';
                                status.className = 'status';
                                micButton.disabled = false;
                                break;
                            case 'recording':
                                micIcon.textContent = '⏹️';
                                status.textContent = '🎙️ Listening... Speak now!';
                                status.className = 'status recording';
                                micButton.disabled = false;
                                break;
                            case 'transcribing':
                                micIcon.textContent = '⚙️';
                                status.textContent = '🔄 Processing...';
                                status.className = 'status transcribing';
                                micButton.disabled = true;
                                break;
                            case 'loading':
                            case 'initializing':
                                micIcon.textContent = '⏳';
                                status.textContent = '🔄 Initializing...';
                                status.className = 'status';
                                micButton.disabled = true;
                                break;
                            case 'error':
                                micIcon.textContent = '❌';
                                status.textContent = '❌ Error occurred';
                                status.className = 'status';
                                micButton.disabled = true;
                                break;
                            case 'disabled':
                                micIcon.textContent = '🔇';
                                status.textContent = '🔇 Disabled';
                                status.className = 'status';
                                micButton.disabled = true;
                                break;
                        }
                    }
                </script>
            </body>
            </html>`;
    }
}
exports.VoicePanel = VoicePanel;
VoicePanel.viewType = 'cursorForSpeechVoicePanel';
function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
//# sourceMappingURL=voicePanel.js.map