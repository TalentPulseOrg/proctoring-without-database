import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';

const MicContainer = styled.div`
  position: fixed;
  bottom: 20px;
  left: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  z-index: 1000;
`;

const MicIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: ${props => props.isSuspicious ? '#ff4444' : '#4CAF50'};
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: background-color 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);

  &::before {
    content: '';
    width: 12px;
    height: 20px;
    background-color: white;
    border-radius: 6px;
    position: relative;
  }

  &::after {
    content: '';
    position: absolute;
    bottom: -4px;
    width: 16px;
    height: 8px;
    background-color: white;
    border-radius: 0 0 8px 8px;
  }
`;

const WaveCanvas = styled.canvas`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
`;

const StatusText = styled.div`
  font-size: 12px;
  color: ${props => props.isSuspicious ? '#ff4444' : '#4CAF50'};
  font-weight: 500;
  text-align: center;
  background-color: rgba(255, 255, 255, 0.9);
  padding: 4px 8px;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const MicVisualizer = ({ audioLevel, isSuspicious, isMonitoring }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isMonitoring) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    let phase = 0;

    const drawWave = () => {
      ctx.clearRect(0, 0, width, height);
      
      const amplitude = Math.min(30, Math.max(5, Math.abs(audioLevel) / 2));
      const frequency = 0.05;
      
      ctx.beginPath();
      ctx.strokeStyle = isSuspicious ? '#ff4444' : '#4CAF50';
      ctx.lineWidth = 2;

      for (let x = 0; x < width; x++) {
        const y = height / 2 + 
          Math.sin(x * frequency + phase) * amplitude;
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();
      phase += 0.1;
      animationRef.current = requestAnimationFrame(drawWave);
    };

    drawWave();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioLevel, isSuspicious, isMonitoring]);

  return (
    <MicContainer>
      <MicIcon isSuspicious={isSuspicious}>
        <WaveCanvas
          ref={canvasRef}
          width={80}
          height={80}
        />
      </MicIcon>
      <StatusText isSuspicious={isSuspicious}>
        {isSuspicious ? 'Suspicious Audio Detected' : 'Audio Monitoring Active'}
      </StatusText>
    </MicContainer>
  );
};

MicVisualizer.propTypes = {
  audioLevel: PropTypes.number.isRequired,
  isSuspicious: PropTypes.bool.isRequired,
  isMonitoring: PropTypes.bool.isRequired,
};

export default MicVisualizer; 