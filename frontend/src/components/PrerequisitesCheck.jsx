import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FaceAuth from './FaceAuth';

const PrerequisitesCheck = () => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState('system');
    const [systemChecks, setSystemChecks] = useState({
        camera: false,
        microphone: false,
        browser: false
    });
    const [error, setError] = useState('');

    useEffect(() => {
        checkSystemRequirements();
    }, []);

    const checkSystemRequirements = async () => {
        try {
            // Check camera
            const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
            cameraStream.getTracks().forEach(track => track.stop());
            setSystemChecks(prev => ({ ...prev, camera: true }));

            // Check microphone
            const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            micStream.getTracks().forEach(track => track.stop());
            setSystemChecks(prev => ({ ...prev, microphone: true }));

            // Check browser compatibility
            const isModernBrowser = 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;
            setSystemChecks(prev => ({ ...prev, browser: isModernBrowser }));

            // If all checks pass, move to face authentication
            if (isModernBrowser) {
                setTimeout(() => {
                    setCurrentStep('face');
                }, 2000);
            }
        } catch (err) {
            setError(`System check failed: ${err.message}`);
        }
    };

    const handleFaceAuthSuccess = () => {
        // Navigate to exam page
        navigate('/test-interface');
    };

    if (error) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
                    <h2 className="text-2xl font-bold text-red-600 mb-4">System Check Failed</h2>
                    <p className="text-gray-700 mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (currentStep === 'system') {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
                    <h2 className="text-2xl font-bold mb-4">System Requirements Check</h2>
                    
                    <div className="space-y-4">
                        <div className="flex items-center">
                            <div className={`w-4 h-4 rounded-full mr-3 ${systemChecks.camera ? 'bg-green-500' : 'bg-gray-300'}`} />
                            <span>Camera Access</span>
                        </div>
                        
                        <div className="flex items-center">
                            <div className={`w-4 h-4 rounded-full mr-3 ${systemChecks.microphone ? 'bg-green-500' : 'bg-gray-300'}`} />
                            <span>Microphone Access</span>
                        </div>
                        
                        <div className="flex items-center">
                            <div className={`w-4 h-4 rounded-full mr-3 ${systemChecks.browser ? 'bg-green-500' : 'bg-gray-300'}`} />
                            <span>Browser Compatibility</span>
                        </div>
                    </div>

                    {Object.values(systemChecks).every(check => check) && (
                        <div className="mt-6 text-center text-green-600">
                            All system checks passed! Proceeding to face authentication...
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return <FaceAuth onSuccess={handleFaceAuthSuccess} />;
};

export default PrerequisitesCheck; 