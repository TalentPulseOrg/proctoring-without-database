import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { analyzeLighting } from '../utils/lightingAnalyzer';
import * as faceapi from 'face-api.js';

const WebcamMonitor = ({ testId }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [suspiciousActivity, setSuspiciousActivity] = useState(null);
  const [lightingStatus, setLightingStatus] = useState(null);
  const [lastLightingCheck, setLastLightingCheck] = useState(0);
  const [showLightingToast, setShowLightingToast] = useState(false);
  const [gazeDirection, setGazeDirection] = useState('Tracking gaze...');
  const LIGHTING_CHECK_INTERVAL = 5000; // Check lighting every 5 seconds

  useEffect(() => {
    let stream = null;
    let captureInterval = null;
    let lightingCheckInterval = null;
    let toastTimeout = null;
    let gazeCheckInterval = null;

    const loadFaceApiModels = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
      } catch (err) {
        console.error('Error loading face-api models:', err);
        setError('Failed to load face detection models');
      }
    };

    const detectGaze = async () => {
      if (!videoRef.current || !isStreaming) return;

      try {
        const detections = await faceapi.detectAllFaces(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions()
        ).withFaceLandmarks();

        if (detections.length === 0) {
          setGazeDirection('No face detected');
          return;
        }

        const face = detections[0];
        const landmarks = face.landmarks.positions;
        
        // Get key facial landmarks
        const leftEye = landmarks[36]; // Left eye left corner
        const rightEye = landmarks[45]; // Right eye right corner
        const nose = landmarks[30]; // Nose tip
        const leftMouth = landmarks[48]; // Left mouth corner
        const rightMouth = landmarks[54]; // Right mouth corner

        // Calculate face orientation
        const eyeDistance = Math.abs(leftEye.x - rightEye.x);
        const mouthDistance = Math.abs(leftMouth.x - rightMouth.x);
        const verticalOffset = nose.y - ((leftEye.y + rightEye.y) / 2);

        // Determine gaze direction
        if (Math.abs(verticalOffset) < eyeDistance * 0.2) {
          // Looking center
          setGazeDirection('Gaze direction: center');
        } else if (verticalOffset > 0) {
          // Looking down
          setGazeDirection('Gaze direction: away(down)');
        } else {
          // Looking up
          setGazeDirection('Gaze direction: away(up)');
        }

        // Check horizontal direction
        const faceCenter = (leftEye.x + rightEye.x) / 2;
        const videoCenter = videoRef.current.videoWidth / 2;
        const horizontalOffset = faceCenter - videoCenter;

        if (Math.abs(horizontalOffset) > eyeDistance * 0.5) {
          if (horizontalOffset > 0) {
            setGazeDirection('Gaze direction: away(right)');
          } else {
            setGazeDirection('Gaze direction: away(left)');
          }
        }
      } catch (err) {
        console.error('Error detecting gaze:', err);
      }
    };

    const startWebcam = async () => {
      try {
        console.log('Requesting webcam access...');
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 640 },
            height: { ideal: 480 }
          } 
        });
        
        if (videoRef.current) {
          console.log('Webcam stream obtained, setting up video element');
          videoRef.current.srcObject = stream;
          setIsStreaming(true);
        }

        // Load face-api models
        await loadFaceApiModels();

        // Start periodic capture for suspicious activity
        captureInterval = setInterval(captureAndAnalyze, 15000); // Every 15 seconds
        
        // Start periodic lighting check
        console.log('Starting lighting check interval');
        lightingCheckInterval = setInterval(checkLighting, LIGHTING_CHECK_INTERVAL);

        // Start gaze detection
        gazeCheckInterval = setInterval(detectGaze, 100); // Check gaze every 100ms
      } catch (err) {
        console.error('Webcam error:', err);
        setError('Failed to access webcam: ' + err.message);
      }
    };

    const checkLighting = () => {
      console.log('Checking lighting...');
      if (!videoRef.current || !canvasRef.current) {
        console.error('Video or canvas ref not available');
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight);
      
      const context = canvas.getContext('2d');

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw current video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Analyze lighting
      const lightingAnalysis = analyzeLighting(canvas);
      console.log('Lighting analysis result:', lightingAnalysis);
      
      setLightingStatus(lightingAnalysis);
      setLastLightingCheck(Date.now());

      // Show toast if lighting is not adequate
      if (!lightingAnalysis.is_adequate) {
        setShowLightingToast(true);
        // Clear any existing timeout
        if (toastTimeout) {
          clearTimeout(toastTimeout);
        }
        // Hide toast after 5 seconds
        toastTimeout = setTimeout(() => {
          setShowLightingToast(false);
        }, 5000);
      }
    };

    const captureAndAnalyze = async () => {
      if (!videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw current video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      try {
        // Convert canvas to blob
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
        
        // Create form data
        const formData = new FormData();
        formData.append('file', blob, 'snapshot.jpg');
        formData.append('test_id', testId);

        // Send to backend
        const response = await axios.post(
          'http://localhost:8000/api/tests/save-snapshot',
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );

        console.log('Webcam analysis response:', response.data);

        // Handle suspicious activity
        if (response.data.face_count > 1) {
          console.warn('Suspicious activity detected:', response.data);
          setSuspiciousActivity({
            timestamp: new Date().toLocaleTimeString(),
            faceCount: response.data.face_count
          });

          // Log the suspicious activity
          try {
            await axios.post('http://localhost:8000/monitoring/log-event', {
              test_id: testId,
              event_type: 'suspicious_activity',
              timestamp: new Date().toISOString(),
              details: {
                face_count: response.data.face_count,
                saved_image_path: response.data.saved_image_path
              }
            });
          } catch (logError) {
            console.error('Error logging suspicious activity:', logError);
          }
        }
      } catch (err) {
        console.error('Error capturing and analyzing:', err);
        setError('Failed to capture and analyze: ' + err.message);
      }
    };

    startWebcam();

    // Cleanup
    return () => {
      if (captureInterval) {
        clearInterval(captureInterval);
      }
      if (lightingCheckInterval) {
        clearInterval(lightingCheckInterval);
      }
      if (gazeCheckInterval) {
        clearInterval(gazeCheckInterval);
      }
      if (toastTimeout) {
        clearTimeout(toastTimeout);
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [testId]);

  // Get lighting status color and icon
  const getLightingStatusStyle = () => {
    if (!lightingStatus) return { backgroundColor: '#666', message: 'Checking lighting...' };
    
    switch (lightingStatus.status) {
      case 'normal':
        return { backgroundColor: '#4CAF50', message: 'Lighting is good' };
      case 'too_dark':
        return { backgroundColor: '#f44336', message: 'Room is too dark' };
      case 'too_bright':
        return { backgroundColor: '#ff9800', message: 'Room is too bright' };
      default:
        return { backgroundColor: '#666', message: 'Checking lighting...' };
    }
  };

  const lightingStyle = getLightingStatusStyle();

  return (
    <div className="webcam-monitor">
      <div className="webcam-container" style={{ width: '320px', height: '240px', position: 'fixed', bottom: '20px', right: '20px', zIndex: 1000 }}>
        {/* Gaze Tracking Label */}
        <div style={{
          position: 'absolute',
          top: '-80px',
          left: '0',
          right: '0',
          backgroundColor: '#2196F3',
          color: 'white',
          padding: '8px',
          borderRadius: '8px 8px 0 0',
          fontSize: '14px',
          textAlign: 'center',
          transition: 'background-color 0.3s ease',
          boxShadow: '0 -2px 4px rgba(0,0,0,0.1)'
        }}>
          {gazeDirection}
        </div>

        {/* Lighting Status Tab */}
        <div style={{
          position: 'absolute',
          top: '-40px',
          left: '0',
          right: '0',
          backgroundColor: lightingStyle.backgroundColor,
          color: 'white',
          padding: '8px',
          borderRadius: '8px 8px 0 0',
          fontSize: '14px',
          textAlign: 'center',
          transition: 'background-color 0.3s ease',
          boxShadow: '0 -2px 4px rgba(0,0,0,0.1)'
        }}>
          {lightingStyle.message}
        </div>

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        {error && (
          <div className="error-message" style={{ color: 'red', marginTop: '10px' }}>
            {error}
          </div>
        )}
        {suspiciousActivity && (
          <div className="suspicious-alert" style={{ 
            position: 'absolute', 
            top: '10px', 
            left: '10px', 
            right: '10px',
            backgroundColor: 'rgba(255, 0, 0, 0.8)',
            color: 'white',
            padding: '8px',
            borderRadius: '4px',
            fontSize: '14px'
          }}>
            ⚠️ Multiple faces detected ({suspiciousActivity.faceCount}) at {suspiciousActivity.timestamp}
          </div>
        )}
      </div>

      {/* Lighting Toast */}
      {showLightingToast && lightingStatus && !lightingStatus.is_adequate && (
        <div className="lighting-toast" style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: 'rgba(255, 165, 0, 0.9)',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '4px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
          animation: 'slideIn 0.3s ease-out',
          zIndex: 1001,
          maxWidth: '300px'
        }}>
          ⚠️ {lightingStatus.message}
        </div>
      )}
    </div>
  );
};

export default WebcamMonitor; 