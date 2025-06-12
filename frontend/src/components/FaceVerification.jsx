import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './FaceVerification.css';

const FaceVerification = () => {
    const [step, setStep] = useState(1); // 1: First capture, 2: Second capture
    const [firstImage, setFirstImage] = useState(null);
    const [secondImage, setSecondImage] = useState(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [error, setError] = useState(null);
    const [verificationResult, setVerificationResult] = useState(null);
    const [livenessStatus, setLivenessStatus] = useState({
        isLive: false,
        blinkDetected: false,
        headMovementDetected: false
    });
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const canvasRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        startCamera();
        return () => {
            stopCamera();
        };
    }, []);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                } 
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                streamRef.current = stream;
            }
        } catch (err) {
            setError('Error accessing camera: ' + err.message);
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
    };

    const capturePhoto = async () => {
        if (!videoRef.current) return;

        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0);
        
        const photo = canvas.toDataURL('image/jpeg');

        // Check liveness before capturing
        try {
            const livenessResponse = await axios.post('http://localhost:8000/face/detect-liveness', {
                image: photo
            });

            if (!livenessResponse.data.is_live) {
                setError('Please ensure you are a real person. Try blinking or moving your head slightly.');
                return;
            }

            if (step === 1) {
                setFirstImage(photo);
                setStep(2);
            } else {
                setSecondImage(photo);
                verifyFaces();
            }
        } catch (err) {
            setError('Liveness check failed: ' + (err.response?.data?.detail || err.message));
        }
    };

    const verifyFaces = async () => {
        try {
            setIsCapturing(true);
            setError(null);

            const verificationResponse = await axios.post('http://localhost:8000/face/verify-faces', {
                first_image: firstImage,
                second_image: secondImage
            });

            if (!verificationResponse.data.verified) {
                setError('Face verification failed. Please try again.');
                setStep(1);
                return;
            }

            setVerificationResult({
                verified: true,
                similarity: verificationResponse.data.similarity_score
            });

            // Store verification status in localStorage
            localStorage.setItem('faceVerified', 'true');
            
            // Navigate to exam form
            navigate('/test-interface');
        } catch (err) {
            setError('Verification failed: ' + (err.response?.data?.detail || err.message));
            setStep(1);
        } finally {
            setIsCapturing(false);
        }
    };

    const retry = () => {
        setStep(1);
        setFirstImage(null);
        setSecondImage(null);
        setError(null);
        setVerificationResult(null);
        setLivenessStatus({
            isLive: false,
            blinkDetected: false,
            headMovementDetected: false
        });
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl">
                <h2 className="text-2xl font-bold mb-4 text-center">
                    {step === 1 ? 'Step 1: Capture your first photo' : 'Step 2: Capture your second photo'}
                </h2>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        {error}
                    </div>
                )}

                <div className="relative aspect-video bg-gray-200 rounded-lg overflow-hidden mb-4">
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                    />
                    <canvas
                        ref={canvasRef}
                        className="absolute top-0 left-0 w-full h-full"
                        style={{ display: 'none' }}
                    />
                </div>

                <div className="mb-4">
                    <p className="text-gray-600 text-center">
                        {step === 1 
                            ? 'Please look at the camera and capture your first photo'
                            : 'Please look at the camera and capture your second photo'}
                    </p>
                    <p className="text-sm text-gray-500 text-center mt-2">
                        Make sure to blink or move your head slightly to verify liveness
                    </p>
                </div>

                <div className="flex justify-center gap-4">
                    <button
                        onClick={capturePhoto}
                        disabled={isCapturing}
                        className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
                    >
                        {isCapturing ? 'Processing...' : 'Capture Photo'}
                    </button>
                    <button
                        onClick={retry}
                        className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
                    >
                        Retry
                    </button>
                </div>

                {verificationResult && (
                    <div className="mt-4 p-4 bg-green-100 rounded">
                        <p className="text-green-700">
                            Verification successful! Similarity score: {(verificationResult.similarity * 100).toFixed(2)}%
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FaceVerification; 