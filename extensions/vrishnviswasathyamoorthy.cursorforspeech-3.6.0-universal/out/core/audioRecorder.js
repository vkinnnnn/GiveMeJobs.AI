"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudioRecorder = void 0;
class AudioRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.stream = null;
        this.isRecording = false;
    }
    async startRecording() {
        if (this.isRecording) {
            throw new Error('Recording is already in progress');
        }
        try {
            // Request microphone access
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 16000,
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });
            // Determine the best MIME type
            const mimeTypes = [
                'audio/webm;codecs=opus',
                'audio/ogg;codecs=opus',
                'audio/wav',
                'audio/mp4',
                'audio/webm'
            ];
            let selectedMimeType;
            for (const mimeType of mimeTypes) {
                if (MediaRecorder.isTypeSupported(mimeType)) {
                    selectedMimeType = mimeType;
                    break;
                }
            }
            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: selectedMimeType
            });
            this.audioChunks = [];
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };
            this.mediaRecorder.start();
            this.isRecording = true;
        }
        catch (error) {
            this.cleanup();
            throw error;
        }
    }
    async stopRecording() {
        if (!this.isRecording || !this.mediaRecorder) {
            return null;
        }
        return new Promise((resolve, reject) => {
            if (!this.mediaRecorder) {
                reject(new Error('MediaRecorder not available'));
                return;
            }
            this.mediaRecorder.onstop = async () => {
                try {
                    const audioBlob = new Blob(this.audioChunks, {
                        type: this.mediaRecorder?.mimeType || 'audio/webm'
                    });
                    const audioData = await this.processAudioBlob(audioBlob);
                    this.cleanup();
                    resolve(audioData);
                }
                catch (error) {
                    this.cleanup();
                    reject(error);
                }
            };
            this.mediaRecorder.onerror = (event) => {
                this.cleanup();
                reject(new Error(`MediaRecorder error: ${event.error}`));
            };
            this.mediaRecorder.stop();
            this.isRecording = false;
        });
    }
    async processAudioBlob(blob) {
        const arrayBuffer = await blob.arrayBuffer();
        const audioContext = new AudioContext({ sampleRate: 16000 });
        try {
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            // Convert to mono if stereo
            let audioData;
            if (audioBuffer.numberOfChannels === 1) {
                audioData = audioBuffer.getChannelData(0);
            }
            else {
                // Mix down to mono
                const left = audioBuffer.getChannelData(0);
                const right = audioBuffer.getChannelData(1);
                audioData = new Float32Array(left.length);
                for (let i = 0; i < left.length; i++) {
                    audioData[i] = (left[i] + right[i]) / 2;
                }
            }
            // Resample to 16kHz if necessary
            if (audioBuffer.sampleRate !== 16000) {
                audioData = this.resampleAudio(audioData, audioBuffer.sampleRate, 16000);
            }
            return audioData;
        }
        finally {
            await audioContext.close();
        }
    }
    resampleAudio(audioData, fromRate, toRate) {
        if (fromRate === toRate) {
            return audioData;
        }
        const ratio = fromRate / toRate;
        const newLength = Math.round(audioData.length / ratio);
        const result = new Float32Array(newLength);
        for (let i = 0; i < newLength; i++) {
            const index = i * ratio;
            const indexFloor = Math.floor(index);
            const indexCeil = Math.min(indexFloor + 1, audioData.length - 1);
            const fraction = index - indexFloor;
            result[i] = audioData[indexFloor] * (1 - fraction) + audioData[indexCeil] * fraction;
        }
        return result;
    }
    cleanup() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
    }
    dispose() {
        this.cleanup();
    }
}
exports.AudioRecorder = AudioRecorder;
//# sourceMappingURL=audioRecorder.js.map