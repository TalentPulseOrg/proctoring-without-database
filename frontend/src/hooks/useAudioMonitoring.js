import { useState, useEffect, useCallback } from 'react';
import { audioMonitoringService } from '../services/audioMonitoringService';

export const useAudioMonitoring = () => {
    const [isInitialized, setIsInitialized] = useState(false);
    const [isMonitoring, setIsMonitoring] = useState(false);
    const [error, setError] = useState(null);
    const [suspiciousEvents, setSuspiciousEvents] = useState([]);

    const initialize = useCallback(async () => {
        try {
            const success = await audioMonitoringService.initializeAudio();
            setIsInitialized(success);
            setError(null);
            return success;
        } catch (err) {
            setError('Failed to initialize audio monitoring');
            return false;
        }
    }, []);

    const startMonitoring = useCallback(() => {
        if (!isInitialized) return false;
        
        const success = audioMonitoringService.startMonitoring((event) => {
            setSuspiciousEvents(prev => [...prev, event]);
            // Store in localStorage for persistence
            const storedEvents = JSON.parse(localStorage.getItem('audioEvents') || '[]');
            localStorage.setItem('audioEvents', JSON.stringify([...storedEvents, event]));
        });
        
        setIsMonitoring(success);
        return success;
    }, [isInitialized]);

    const stopMonitoring = useCallback(() => {
        audioMonitoringService.stopMonitoring();
        setIsMonitoring(false);
    }, []);

    const clearEvents = useCallback(() => {
        audioMonitoringService.clearSuspiciousEvents();
        setSuspiciousEvents([]);
        localStorage.removeItem('audioEvents');
    }, []);

    // Load stored events on mount
    useEffect(() => {
        const storedEvents = JSON.parse(localStorage.getItem('audioEvents') || '[]');
        setSuspiciousEvents(storedEvents);
    }, []);

    return {
        isInitialized,
        isMonitoring,
        error,
        suspiciousEvents,
        initialize,
        startMonitoring,
        stopMonitoring,
        clearEvents
    };
}; 