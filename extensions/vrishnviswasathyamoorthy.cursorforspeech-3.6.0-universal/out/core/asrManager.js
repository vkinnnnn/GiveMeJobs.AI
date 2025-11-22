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
exports.ASRManager = void 0;
const vscode = __importStar(require("vscode"));
class ASRManager {
    constructor(context) {
        this.context = context;
        this._onStateChange = new vscode.EventEmitter();
        this.onStateChange = this._onStateChange.event;
        this._onTranscriptionResult = new vscode.EventEmitter();
        this.onTranscriptionResult = this._onTranscriptionResult.event;
        this.currentState = 'uninitialized';
        this.recognition = null;
        void this.context; // Suppress unused parameter warning
    }
    async initialize() {
        this.updateState('initializing');
        try {
            // Web Speech API will be handled in the webview context
            // For now, we'll mark as ready and let the webview handle the actual speech recognition
            this.updateState('ready');
            vscode.window.showInformationMessage('🎤 Voice recognition ready! Model: Web Speech API');
        }
        catch (error) {
            console.error('ASR initialization failed:', error);
            this.updateState('error');
            vscode.window.showErrorMessage(`Speech recognition failed to initialize: ${error}`);
            throw error;
        }
    }
    async transcribe(_audioData, _language) {
        // Transcription is now handled directly in the webview
        // This method is kept for compatibility but does nothing
        console.log('Transcription handled in webview');
    }
    updateConfiguration(config) {
        // Configuration is applied during recognition start
        console.log('ASR configuration updated:', config);
    }
    // Web Speech API methods removed - now handled in webview
    // Language mapping moved to webview
    updateState(newState) {
        if (this.currentState !== newState) {
            this.currentState = newState;
            this._onStateChange.fire(newState);
        }
    }
    dispose() {
        if (this.recognition) {
            this.recognition = null;
        }
        this._onStateChange.dispose();
        this._onTranscriptionResult.dispose();
    }
}
exports.ASRManager = ASRManager;
//# sourceMappingURL=asrManager.js.map