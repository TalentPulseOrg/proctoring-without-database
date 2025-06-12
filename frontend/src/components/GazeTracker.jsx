import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import '../styles/GazeTracker.css';

const GazeTracker = ({ isProctoring }) => {
    const [gazeStatus, setGazeStatus] = useState('Tracking gaze...');
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);

    useEffect(() => {
        if (!isProctoring) return;

        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (error) {
                console.error('Error accessing camera:', error);
                setGazeStatus('Error accessing camera');
            }
        };

        startCamera();

        const interval = setInterval(checkGaze, 1000);

        return () => {
            clearInterval(interval);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [isProctoring]);

    const checkGaze = async () => {
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
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));
            
            // Create form data
            const formData = new FormData();
            formData.append('image', blob);

            // Send to backend
            const response = await axios.post('http://localhost:8000/api/proctoring/gaze/analyze', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            const { gaze_direction } = response.data;
            
            // Update status based on gaze direction
            switch (gaze_direction) {
                case 'center':
                    setGazeStatus('Gaze direction: center');
                    break;
                case 'up':
                    setGazeStatus('Gaze direction: away(up)');
                    break;
                case 'down':
                    setGazeStatus('Gaze direction: away(down)');
                    break;
                case 'left':
                    setGazeStatus('Gaze direction: away(left)');
                    break;
                case 'right':
                    setGazeStatus('Gaze direction: away(right)');
                    break;
                default:
                    setGazeStatus('Tracking gaze...');
            }
        } catch (error) {
            console.error('Error analyzing gaze:', error);
            setGazeStatus('Error analyzing gaze');
        }
    };

    return (
        <div className="gaze-tracker">
            <div className="gaze-status">{gazeStatus}</div>
            <video
                ref={videoRef}
                autoPlay
                playsInline
                style={{ display: 'none' }}
            />
            <canvas
                ref={canvasRef}
                style={{ display: 'none' }}
            />
        </div>
    );
};

export default GazeTracker; 