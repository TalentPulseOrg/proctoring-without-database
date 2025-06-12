import React, { createContext, useContext, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import useAudioMonitor from '../hooks/useAudioMonitor';
import AudioMonitoringService from '../services/audioMonitoringService';

const AudioMonitoringContext = createContext(null);

export const AudioMonitoringProvider = ({ children, candidateId }) => {
  const [warningCount, setWarningCount] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  const {
    initializeAudio,
    stopMonitoring,
    isMonitoring,
    audioLevel,
    isSuspicious,
    error
  } = useAudioMonitor({
    warningThreshold: -30,
    smoothingFactor: 0.8,
  });

  const handleSuspiciousAudio = useCallback(async () => {
    try {
      await AudioMonitoringService.logAudioEvent({
        candidateId,
        audioLevel,
        eventType: 'suspicious_audio',
      });
      
      setWarningCount(prev => prev + 1);
      setModalMessage('Suspicious audio activity detected. Please maintain a quiet environment.');
      setIsModalOpen(true);
    } catch (error) {
      console.error('Failed to log suspicious audio event:', error);
    }
  }, [candidateId, audioLevel]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const value = {
    initializeAudio,
    stopMonitoring,
    isMonitoring,
    audioLevel,
    isSuspicious,
    error,
    warningCount,
    isModalOpen,
    modalMessage,
    closeModal,
    handleSuspiciousAudio,
  };

  return (
    <AudioMonitoringContext.Provider value={value}>
      {children}
    </AudioMonitoringContext.Provider>
  );
};

AudioMonitoringProvider.propTypes = {
  children: PropTypes.node.isRequired,
  candidateId: PropTypes.string.isRequired,
};

export const useAudioMonitoring = () => {
  const context = useContext(AudioMonitoringContext);
  if (!context) {
    throw new Error('useAudioMonitoring must be used within an AudioMonitoringProvider');
  }
  return context;
};

export default AudioMonitoringContext; 