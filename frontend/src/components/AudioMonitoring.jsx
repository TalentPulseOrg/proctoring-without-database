import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import useAudioMonitor from '../hooks/useAudioMonitor';
import MicVisualizer from './MicVisualizer';
import AudioWarningModal from './AudioWarningModal';

const Container = styled.div`
  position: fixed;
  bottom: 20px;
  left: 20px;
  z-index: 1000;
`;

const AudioMonitoring = ({ onSuspiciousActivity }) => {
    const [showModal, setShowModal] = useState(false);
    const {
        isMonitoring,
        audioLevel,
        isSuspicious,
        error,
        startMonitoring,
        stopMonitoring,
        initializeAudio
    } = useAudioMonitor();

    useEffect(() => {
        const setupAudio = async () => {
            const initialized = await initializeAudio();
            if (initialized) {
                startMonitoring();
            }
        };

        setupAudio();

        return () => {
            stopMonitoring();
        };
    }, [initializeAudio, startMonitoring, stopMonitoring]);

    useEffect(() => {
        if (isSuspicious && onSuspiciousActivity) {
            setShowModal(true);
            onSuspiciousActivity({
                type: 'audio',
                level: audioLevel,
                timestamp: new Date().toISOString()
            });
        }
    }, [isSuspicious, audioLevel, onSuspiciousActivity]);

    const handleCloseModal = () => {
        setShowModal(false);
    };

    if (error) {
        console.error('Audio monitoring error:', error);
    }

    return (
        <Container>
            <MicVisualizer
                audioLevel={audioLevel}
                isSuspicious={isSuspicious}
                isMonitoring={isMonitoring}
            />
            {showModal && (
                <AudioWarningModal
                    isOpen={showModal}
                    onClose={handleCloseModal}
                    message="Suspicious audio activity detected"
                />
            )}
        </Container>
    );
};

AudioMonitoring.propTypes = {
    onSuspiciousActivity: PropTypes.func
};

export default AudioMonitoring; 