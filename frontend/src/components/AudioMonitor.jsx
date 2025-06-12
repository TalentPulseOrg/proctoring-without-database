import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FaMicrophone, FaMicrophoneSlash } from 'react-icons/fa';
import styled from 'styled-components';

const AudioMonitorContainer = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  backdrop-filter: blur(8px);
`;

const MicStatus = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const MicIcon = styled.div`
  font-size: 20px;
  color: ${props => {
    if (!props.isActive) return '#666';
    return props.isSuspicious ? '#ff4444' : '#4CAF50';
  }};
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
`;

const StatusText = styled.span`
  font-size: 14px;
  color: ${props => {
    if (!props.isActive) return '#666';
    return props.isSuspicious ? '#ff4444' : '#4CAF50';
  }};
  font-weight: 500;
`;

const SoundWaves = styled.div`
  display: flex;
  align-items: center;
  gap: 3px;
  height: 32px;
  padding: 0 4px;
`;

const WaveBar = styled.div`
  width: 4px;
  background-color: ${props => {
    if (!props.isActive) return '#666';
    return props.isSuspicious ? '#ff4444' : '#4CAF50';
  }};
  height: ${props => props.height}%;
  border-radius: 2px;
  transition: all 0.1s ease;
`;

const WarningModal = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  z-index: 1001;
  text-align: center;
  animation: fadeIn 0.3s ease;
  max-width: 90%;
  width: 320px;

  @keyframes fadeIn {
    from { opacity: 0; transform: translate(-50%, -48%); }
    to { opacity: 1; transform: translate(-50%, -50%); }
  }
`;

const WarningTitle = styled.h3`
  color: #ff4444;
  margin: 0 0 12px 0;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
`;

const WarningMessage = styled.p`
  color: #333;
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
`;

const AudioMonitor = () => {
  const [audioLevel, setAudioLevel] = useState(0);
  const [isSuspicious, setIsSuspicious] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [warningCount, setWarningCount] = useState(0);
  
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const animationFrameRef = useRef(null);
  const warningTimeoutRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const lastWarningTimeRef = useRef(0);

  // Constants for audio analysis
  const SUSPICIOUS_THRESHOLD = -45; // dB (increased from -35 to be less sensitive)
  const NORMAL_THRESHOLD = -65; // dB (increased from -60 to be less sensitive)
  const WARNING_COOLDOWN = 15000; // 15 seconds (increased from 10 seconds)
  const SILENCE_THRESHOLD = -75; // dB (increased from -70 to be less sensitive)
  const SILENCE_DURATION = 3000; // 3 seconds (increased from 2 seconds)
  const MAX_WARNINGS = 3;
  const AUDIO_SMOOTHING = 0.85; // Increased smoothing factor for more stable readings

  const initializeAudio = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      setHasPermission(true);
      setIsActive(true);

      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 44100
      });
      
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      analyserRef.current.smoothingTimeConstant = AUDIO_SMOOTHING; // Apply smoothing
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      dataArrayRef.current = new Float32Array(analyserRef.current.frequencyBinCount);
      
      startAudioAnalysis();
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setHasPermission(false);
      setIsActive(false);
    }
  }, []);

  const startAudioAnalysis = useCallback(() => {
    let lastDb = -60; // Initialize with a reasonable value
    let consecutiveSuspiciousCount = 0;
    let consecutiveNormalCount = 0;
    const SUSPICIOUS_THRESHOLD_COUNT = 3; // Number of consecutive readings needed
    const NORMAL_THRESHOLD_COUNT = 5; // Number of consecutive readings needed

    const analyzeAudio = () => {
      if (!analyserRef.current || !dataArrayRef.current) return;

      analyserRef.current.getFloatTimeDomainData(dataArrayRef.current);
      
      // Calculate RMS (Root Mean Square) of the audio data
      let sum = 0;
      for (let i = 0; i < dataArrayRef.current.length; i++) {
        sum += dataArrayRef.current[i] * dataArrayRef.current[i];
      }
      const rms = Math.sqrt(sum / dataArrayRef.current.length);
      
      // Convert to decibels with proper scaling and smoothing
      const currentDb = 20 * Math.log10(Math.max(rms, 1e-10));
      const smoothedDb = lastDb * 0.7 + currentDb * 0.3; // Apply additional smoothing
      lastDb = smoothedDb;
      
      setAudioLevel(smoothedDb);

      // Check for suspicious audio with consecutive readings
      const now = Date.now();
      if (smoothedDb > SUSPICIOUS_THRESHOLD) {
        consecutiveSuspiciousCount++;
        consecutiveNormalCount = 0;
        
        if (consecutiveSuspiciousCount >= SUSPICIOUS_THRESHOLD_COUNT) {
          setIsSuspicious(true);
          if (now - lastWarningTimeRef.current > WARNING_COOLDOWN && warningCount < MAX_WARNINGS) {
            setShowWarning(true);
            setWarningCount(prev => prev + 1);
            lastWarningTimeRef.current = now;
            
            if (warningTimeoutRef.current) {
              clearTimeout(warningTimeoutRef.current);
            }
            warningTimeoutRef.current = setTimeout(() => {
              setShowWarning(false);
            }, 3000);
          }
        }
      } else if (smoothedDb < NORMAL_THRESHOLD) {
        consecutiveNormalCount++;
        if (consecutiveNormalCount >= NORMAL_THRESHOLD_COUNT) {
          consecutiveSuspiciousCount = 0;
          setIsSuspicious(false);
        }
      } else {
        // Reset counters if in the middle range
        consecutiveSuspiciousCount = Math.max(0, consecutiveSuspiciousCount - 1);
        consecutiveNormalCount = Math.max(0, consecutiveNormalCount - 1);
      }

      // Check for silence with consecutive readings
      if (smoothedDb < SILENCE_THRESHOLD) {
        if (!silenceTimerRef.current) {
          silenceTimerRef.current = setTimeout(() => {
            setIsActive(false);
          }, SILENCE_DURATION);
        }
      } else {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        setIsActive(true);
      }

      animationFrameRef.current = requestAnimationFrame(analyzeAudio);
    };

    analyzeAudio();
  }, [warningCount]);

  useEffect(() => {
    initializeAudio();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [initializeAudio]);

  const generateWaveBars = () => {
    const bars = [];
    const numBars = 12;
    const baseHeight = 15;
    
    for (let i = 0; i < numBars; i++) {
      const height = Math.min(
        100,
        Math.max(
          5,
          baseHeight + (audioLevel + 60) * 2 + Math.sin(i * 0.5) * 10
        )
      );
      bars.push(
        <WaveBar
          key={i}
          height={height}
          isSuspicious={isSuspicious}
          isActive={isActive}
        />
      );
    }
    return bars;
  };

  if (!hasPermission) {
    return null;
  }

  return (
    <>
      <AudioMonitorContainer>
        <MicStatus>
          <MicIcon isSuspicious={isSuspicious} isActive={isActive}>
            {isActive ? <FaMicrophone /> : <FaMicrophoneSlash />}
          </MicIcon>
          <StatusText isSuspicious={isSuspicious} isActive={isActive}>
            {isActive ? (isSuspicious ? 'Suspicious Audio' : 'Normal') : 'Microphone Off'}
          </StatusText>
        </MicStatus>
        <SoundWaves>
          {generateWaveBars()}
        </SoundWaves>
      </AudioMonitorContainer>
      
      {showWarning && (
        <WarningModal>
          <WarningTitle>
            <span>⚠️</span>
            Suspicious Audio Detected
          </WarningTitle>
          <WarningMessage>
            {warningCount >= MAX_WARNINGS 
              ? 'Multiple audio violations detected. This incident will be reported.'
              : 'Please maintain a quiet environment during the exam.'}
          </WarningMessage>
        </WarningModal>
      )}
    </>
  );
};

export default AudioMonitor; 