import React, { useEffect, useRef } from "react";
import { audioMonitoringService } from "../services/audioMonitoringService";

const MicStatus = ({ isMonitoring, isSuspicious }) => {
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const analyser = audioMonitoringService.analyser;

    if (!analyser || !isMonitoring) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw microphone icon
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const micSize = 30;

      // Draw mic base
      ctx.beginPath();
      ctx.arc(centerX, centerY, micSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = isSuspicious ? "#dc3545" : "#28a745";
      ctx.fill();

      // Draw mic stand
      ctx.beginPath();
      ctx.moveTo(centerX - 5, centerY + micSize / 2);
      ctx.lineTo(centerX + 5, centerY + micSize / 2);
      ctx.lineTo(centerX + 8, centerY + micSize);
      ctx.lineTo(centerX - 8, centerY + micSize);
      ctx.closePath();
      ctx.fillStyle = isSuspicious ? "#dc3545" : "#28a745";
      ctx.fill();

      // Draw sound waves
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;
      const waveHeight = (average / 255) * 50;
      const numWaves = 3;

      for (let i = 0; i < numWaves; i++) {
        const radius = micSize + (i + 1) * 15;
        const opacity = 1 - i / numWaves;

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = isSuspicious
          ? `rgba(220, 53, 69, ${opacity})`
          : `rgba(40, 167, 69, ${opacity})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isMonitoring, isSuspicious]);

  return (
    <div className="mic-status">
      <canvas
        ref={canvasRef}
        width={120}
        height={120}
        style={{
          display: "block",
          margin: "0 auto",
        }}
      />
      <div className="mic-status-text">
        {isSuspicious ? (
          <span className="text-danger">⚠️ Suspicious Audio Detected</span>
        ) : (
          <span className="text-success">✓ Audio Monitoring Active</span>
        )}
      </div>
    </div>
  );
};

export default MicStatus;
