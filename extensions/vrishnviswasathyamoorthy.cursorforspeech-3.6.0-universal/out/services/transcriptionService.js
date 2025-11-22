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
exports.TranscriptionService = void 0;
const vscode = __importStar(require("vscode"));
const asrManager_1 = require("../core/asrManager");
const audioRecorder_1 = require("../core/audioRecorder");
const voicePanel_1 = require("../voicePanel");
class TranscriptionService {
    constructor(context, configService) {
        this.context = context;
        this.configService = configService;
        this._onStateChange = new vscode.EventEmitter();
        this.onStateChange = this._onStateChange.event;
        this._onTranscriptionResult = new vscode.EventEmitter();
        this.onTranscriptionResult = this._onTranscriptionResult.event;
        this.currentState = 'idle';
        this.lastTranscript = '';
        this.disposables = [];
        // Context used for extension lifecycle management
        void this.context; // Suppress unused parameter warning
        this.asrManager = new asrManager_1.ASRManager(context);
        this.audioRecorder = new audioRecorder_1.AudioRecorder();
        // ASR manager listeners removed - speech recognition is now handled in webview
        // Listen to configuration changes
        this.disposables.push(this.configService.onConfigurationChanged(() => {
            // Refresh ASR configuration if needed
            this.asrManager.updateConfiguration({
                language: this.configService.getLanguage(),
                maxTokens: this.configService.getMaxTokens()
            });
        }));
    }
    async initialize() {
        try {
            this.updateState('loading');
            // Skip ASR manager initialization since speech recognition is handled in webview
            // Just mark as ready
            this.updateState('idle');
        }
        catch (error) {
            console.error('Failed to initialize transcription service:', error);
            this.updateState('error');
            throw error;
        }
    }
    async toggleRecording(extensionUri, configService, whisperService) {
        // Since speech recognition is now handled in the webview,
        // we need to communicate with the webview to toggle recording
        try {
            await voicePanel_1.VoicePanel.toggleRecording(extensionUri, this, configService, whisperService);
        }
        catch (error) {
            console.error('Failed to toggle recording:', error);
            vscode.window.showErrorMessage('Failed to access voice recording. Please open the Voice panel manually.');
        }
    }
    async startRecording() {
        // Recording is now handled directly in the webview
        // This method is kept for compatibility but delegates to toggleRecording
        await this.toggleRecording();
    }
    async stopRecording() {
        // Recording is now handled directly in the webview
        // This method is kept for compatibility but delegates to toggleRecording
        await this.toggleRecording();
    }
    updateState(newState) {
        if (this.currentState !== newState) {
            this.currentState = newState;
            this._onStateChange.fire(newState);
        }
    }
    // handleTranscriptionResult method removed - transcription is now handled in webview
    getLastTranscript() {
        return this.lastTranscript;
    }
    // insertTextInEditor method removed - text insertion is now handled in webview
    // mapASRStateToTranscriptionState method removed - not needed anymore
    dispose() {
        this._onStateChange.dispose();
        this._onTranscriptionResult.dispose();
        this.asrManager.dispose();
        this.audioRecorder.dispose();
        this.disposables.forEach(d => d.dispose());
    }
}
exports.TranscriptionService = TranscriptionService;
//# sourceMappingURL=transcriptionService.js.map