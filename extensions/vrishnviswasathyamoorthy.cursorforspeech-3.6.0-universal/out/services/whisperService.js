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
exports.WhisperService = void 0;
const vscode = __importStar(require("vscode"));
class WhisperService {
    constructor(configService) {
        this.configService = configService;
        this._onTranscriptionResult = new vscode.EventEmitter();
        this.onTranscriptionResult = this._onTranscriptionResult.event;
        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.apiKey = null;
        // Get API key from configuration
        this.apiKey = vscode.workspace.getConfiguration('cursorforspeech').get('whisperApiKey') || null;
    }
    async initialize() {
        if (!this.apiKey) {
            throw new Error('OpenAI API key not configured. Please set cursorforspeech.whisperApiKey in settings.');
        }
    }
    async startRecording() {
        if (this.isRecording) {
            return;
        }
        try {
            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Create MediaRecorder
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });
            this.audioChunks = [];
            this.mediaRecorder.onstop = async () => {
                await this.processAudio();
                // Stop all tracks to release microphone
                stream.getTracks().forEach(track => track.stop());
            };
            // Process audio chunks in real-time for better responsiveness
            this.mediaRecorder.ondataavailable = async (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                    // Process audio every 2 seconds for real-time feedback
                    if (this.audioChunks.length >= 4) { // 4 chunks * 500ms = 2 seconds
                        await this.processAudioChunk();
                        this.audioChunks = []; // Clear processed chunks
                    }
                }
            };
            this.mediaRecorder.start(500); // Collect data every 500ms for better real-time experience
            this.isRecording = true;
            vscode.window.showInformationMessage('🎤 Recording with Whisper... Speak now!');
        }
        catch (error) {
            console.error('Failed to start recording:', error);
            throw new Error('Failed to access microphone. Please check permissions.');
        }
    }
    async stopRecording() {
        if (!this.isRecording || !this.mediaRecorder) {
            return;
        }
        this.mediaRecorder.stop();
        this.isRecording = false;
    }
    async processAudioChunk() {
        if (this.audioChunks.length === 0) {
            return;
        }
        try {
            // Combine current audio chunks
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
            // Convert to base64
            const base64Audio = await this.blobToBase64(audioBlob);
            // Send to OpenAI Whisper API for real-time processing
            const transcription = await this.transcribeWithWhisper(base64Audio);
            if (transcription && transcription.trim()) {
                this._onTranscriptionResult.fire({
                    text: transcription,
                    isComplete: false,
                    confidence: 0.8,
                    isInterim: true
                });
            }
        }
        catch (error) {
            console.error('Failed to process audio chunk:', error);
            // Don't show error for interim processing to avoid spam
        }
    }
    async processAudio() {
        if (this.audioChunks.length === 0) {
            return;
        }
        try {
            // Combine audio chunks
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
            // Convert to base64
            const base64Audio = await this.blobToBase64(audioBlob);
            // Send to OpenAI Whisper API
            const transcription = await this.transcribeWithWhisper(base64Audio);
            if (transcription) {
                this._onTranscriptionResult.fire({
                    text: transcription,
                    isComplete: true,
                    confidence: 1.0
                });
            }
        }
        catch (error) {
            console.error('Failed to process audio:', error);
            vscode.window.showErrorMessage(`Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async transcribeWithWhisper(base64Audio) {
        if (!this.apiKey) {
            throw new Error('OpenAI API key not configured');
        }
        try {
            const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'whisper-1',
                    file: base64Audio,
                    language: this.getLanguageCode(this.configService.getLanguage()),
                    response_format: 'text'
                })
            });
            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
            }
            const transcription = await response.text();
            return transcription.trim();
        }
        catch (error) {
            console.error('Whisper API error:', error);
            throw error;
        }
    }
    async blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result;
                // Remove data URL prefix
                const base64 = result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
    getLanguageCode(language) {
        const languageMap = {
            'auto': 'en',
            'english': 'en',
            'spanish': 'es',
            'french': 'fr',
            'german': 'de',
            'italian': 'it',
            'portuguese': 'pt',
            'russian': 'ru',
            'chinese': 'zh',
            'japanese': 'ja',
            'korean': 'ko',
            'arabic': 'ar',
            'hindi': 'hi',
            'dutch': 'nl',
            'swedish': 'sv',
            'norwegian': 'no',
            'danish': 'da',
            'finnish': 'fi',
            'polish': 'pl',
            'turkish': 'tr',
            'thai': 'th',
            'vietnamese': 'vi'
        };
        return languageMap[language] || 'en';
    }
    dispose() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
        }
        this._onTranscriptionResult.dispose();
    }
}
exports.WhisperService = WhisperService;
//# sourceMappingURL=whisperService.js.map