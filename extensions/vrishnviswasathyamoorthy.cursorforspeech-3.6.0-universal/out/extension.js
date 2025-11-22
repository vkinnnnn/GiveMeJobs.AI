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
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const voicePanel_1 = require("./voicePanel");
const transcriptionService_1 = require("./services/transcriptionService");
const configurationService_1 = require("./services/configurationService");
const whisperService_1 = require("./services/whisperService");
let transcriptionService;
let configurationService;
let whisperService;
function activate(context) {
    console.log('Cursor for Speech extension is now active!');
    // Initialize services
    configurationService = new configurationService_1.ConfigurationService();
    transcriptionService = new transcriptionService_1.TranscriptionService(context, configurationService);
    whisperService = new whisperService_1.WhisperService(configurationService);
    // Register commands
    const toggleRecordingCommand = vscode.commands.registerCommand('cursorforspeech.toggleRecording', async () => {
        await transcriptionService.toggleRecording(context.extensionUri, configurationService, whisperService);
    });
    const openVoicePanelCommand = vscode.commands.registerCommand('cursorforspeech.openVoicePanel', () => {
        voicePanel_1.VoicePanel.createOrShow(context.extensionUri, transcriptionService, configurationService, whisperService);
    });
    const sendSelectionToChatCommand = vscode.commands.registerCommand('cursorforspeech.sendSelectionToChat', async () => {
        const editor = vscode.window.activeTextEditor;
        const selected = editor?.document.getText(editor.selection) ?? '';
        if (!selected) {
            vscode.window.showInformationMessage('No selection to send.');
            return;
        }
        await vscode.env.clipboard.writeText(selected);
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
        vscode.window.showInformationMessage('Selection copied. Paste into chat with Ctrl/Cmd+V.');
    });
    const selectLanguageCommand = vscode.commands.registerCommand('cursorforspeech.selectLanguage', async () => {
        const languages = [
            { label: 'Auto Detect', value: 'auto' },
            { label: 'English', value: 'english' },
            { label: 'Chinese', value: 'chinese' },
            { label: 'German', value: 'german' },
            { label: 'Spanish', value: 'spanish' },
            { label: 'Russian', value: 'russian' },
            { label: 'Korean', value: 'korean' },
            { label: 'French', value: 'french' },
            { label: 'Japanese', value: 'japanese' },
            { label: 'Portuguese', value: 'portuguese' },
            { label: 'Turkish', value: 'turkish' },
            { label: 'Polish', value: 'polish' },
            { label: 'Italian', value: 'italian' },
            { label: 'Dutch', value: 'dutch' },
            { label: 'Arabic', value: 'arabic' },
            { label: 'Swedish', value: 'swedish' },
            { label: 'Finnish', value: 'finnish' },
            { label: 'Norwegian', value: 'norwegian' },
            { label: 'Danish', value: 'danish' },
            { label: 'Hindi', value: 'hindi' },
            { label: 'Thai', value: 'thai' },
            { label: 'Vietnamese', value: 'vietnamese' }
        ];
        const selectedLanguage = await vscode.window.showQuickPick(languages, {
            placeHolder: 'Select language for voice recognition'
        });
        if (selectedLanguage) {
            await configurationService.setLanguage(selectedLanguage.value);
            vscode.window.showInformationMessage(`Voice recognition language set to: ${selectedLanguage.label}`);
        }
    });
    // Register status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'cursorforspeech.toggleRecording';
    statusBarItem.text = '$(mic) Speech';
    statusBarItem.tooltip = 'Toggle Voice Recording (Ctrl+Shift+V / Cmd+Shift+V)';
    statusBarItem.show();
    // Update status bar based on transcription state
    transcriptionService.onStateChange((state) => {
        switch (state) {
            case 'idle':
                statusBarItem.text = '$(mic) Speech';
                statusBarItem.backgroundColor = undefined;
                break;
            case 'recording':
                statusBarItem.text = '$(primitive-square) Recording';
                statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
                break;
            case 'transcribing':
                statusBarItem.text = '$(sync~spin) Transcribing';
                statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
                break;
            case 'disabled':
                statusBarItem.text = '$(mic-off) Speech';
                statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
                break;
            case 'loading':
                statusBarItem.text = '$(sync~spin) Loading';
                statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
                break;
        }
    });
    // Add subscriptions to context
    context.subscriptions.push(toggleRecordingCommand, openVoicePanelCommand, selectLanguageCommand, sendSelectionToChatCommand, statusBarItem, transcriptionService);
    // Initialize the transcription service
    transcriptionService.initialize().catch(error => {
        console.error('Failed to initialize transcription service:', error);
        // Don't show error message since speech recognition is handled in webview
    });
    // Check for API key and show setup notification
    const apiKey = vscode.workspace.getConfiguration('cursorforspeech').get('whisperApiKey');
    const useWhisper = vscode.workspace.getConfiguration('cursorforspeech').get('useWhisper');
    if (useWhisper && (!apiKey || apiKey.trim() === '')) {
        vscode.window.showInformationMessage('🔑 OpenAI API Key Required for Whisper', 'Setup API Key', 'Use Free Mode').then(selection => {
            if (selection === 'Setup API Key') {
                vscode.commands.executeCommand('workbench.action.openSettings', 'cursorforspeech.whisperApiKey');
                vscode.window.showInformationMessage('📝 Paste your OpenAI API key in the settings. Get one at: https://platform.openai.com/api-keys');
            }
            else if (selection === 'Use Free Mode') {
                vscode.workspace.getConfiguration('cursorforspeech').update('useWhisper', false, vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage('✅ Switched to free Web Speech API mode');
            }
        });
    }
    // Automatically open the voice panel
    voicePanel_1.VoicePanel.createOrShow(context.extensionUri, transcriptionService, configurationService, whisperService);
}
exports.activate = activate;
function deactivate() {
    if (transcriptionService) {
        transcriptionService.dispose();
    }
    if (whisperService) {
        whisperService.dispose();
    }
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map