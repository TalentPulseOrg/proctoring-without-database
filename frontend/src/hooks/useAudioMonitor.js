import { useState, useEffect, useCallback, useRef } from 'react';
import AudioMonitoringService from '../services/audioMonitoringService';

const useAudioMonitor = () => {
    const [isMonitoring, setIsMonitoring] = useState(false);
    const [audioLevel, setAudioLevel] = useState(0);
    const [isSuspicious, setIsSuspicious] = useState(false);
    const [error, setError] = useState(null);
    const serviceRef = useRef(null);

    const initializeAudio = useCallback(async () => {
        try {
            if (!serviceRef.current) {
                serviceRef.current = new AudioMonitoringService();
            }
            const success = await serviceRef.current.initializeAudio();
            if (!success) {
                throw new Error('Failed to initialize audio');
            }
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        }
    }, []);

    const startMonitoring = useCallback(async () => {
        try {
            if (!serviceRef.current) {
                const initialized = await initializeAudio();
                if (!initialized) return;
            }

            serviceRef.current.startMonitoring((event) => {
                setAudioLevel(event.level);
                setIsSuspicious(true);
                
                // Log the event to the backend
                AudioMonitoringService.logAudioEvent({
                    level: event.level,
                    type: event.type
                }).catch(console.error);
            });

            setIsMonitoring(true);
            setError(null);
        } catch (err) {
            setError(err.message);
            setIsMonitoring(false);
        }
    }, [initializeAudio]);

    const stopMonitoring = useCallback(() => {
        if (serviceRef.current) {
            serviceRef.current.stopMonitoring();
            setIsMonitoring(false);
            setAudioLevel(0);
            setIsSuspicious(false);
            serviceRef.current = null;
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (serviceRef.current) {
                stopMonitoring();
            }
        };
    }, [stopMonitoring]);

    return {
        isMonitoring,
        audioLevel,
        isSuspicious,
        error,
        startMonitoring,
        stopMonitoring,
        initializeAudio
    };
};

export default useAudioMonitor; 