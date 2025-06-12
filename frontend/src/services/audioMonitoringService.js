import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

class AudioMonitoringService {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.mediaStream = null;
        this.isMonitoring = false;
        this.volumeThreshold = -50; // dB threshold for suspicious activity
        this.suspiciousEvents = [];
    }

    async initializeAudio() {
        try {
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = this.audioContext.createMediaStreamSource(this.mediaStream);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            source.connect(this.analyser);
            return true;
        } catch (error) {
            console.error('Error accessing microphone:', error);
            return false;
        }
    }

    startMonitoring(callback) {
        if (!this.analyser) return false;
        
        this.isMonitoring = true;
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const checkAudio = () => {
            if (!this.isMonitoring) return;
            
            this.analyser.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b) / bufferLength;
            const db = 20 * Math.log10(average / 255);
            
            if (db > this.volumeThreshold) {
                const event = {
                    timestamp: new Date().toISOString(),
                    level: db,
                    type: 'audio_spike'
                };
                this.suspiciousEvents.push(event);
                if (callback) callback(event);
            }
            
            requestAnimationFrame(checkAudio);
        };
        
        checkAudio();
        return true;
    }

    stopMonitoring() {
        this.isMonitoring = false;
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
        }
        if (this.audioContext) {
            this.audioContext.close();
        }
    }

    getSuspiciousEvents() {
        return this.suspiciousEvents;
    }

    clearSuspiciousEvents() {
        this.suspiciousEvents = [];
    }

    static async logAudioEvent(eventData) {
        try {
            // Only attempt to log if the API is available
            const response = await axios.post(`${API_BASE_URL}/api/audio-events`, {
                ...eventData,
                timestamp: new Date().toISOString(),
            });
            return response.data;
        } catch (error) {
            // Silently handle API errors - the frontend will still work
            console.debug('Audio event logging failed:', error.message);
            return null;
        }
    }

    static async getAudioEvents(candidateId) {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/audio-events/${candidateId}`);
            return response.data;
        } catch (error) {
            console.debug('Failed to fetch audio events:', error.message);
            return [];
        }
    }
}

export default AudioMonitoringService; 