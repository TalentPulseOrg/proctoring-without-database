import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useScreenMonitor } from "../contexts/ScreenMonitorContext";
import { AudioMonitoringProvider } from "../contexts/AudioMonitoringContext";
import { BrowserControlsProvider } from "../contexts/BrowserControlsContext";
import ScreenMonitorStatus from "./ScreenMonitorStatus";
import AudioMonitoring from './AudioMonitoring';
import GazeTracker from './GazeTracker';
import { analyzeLighting } from '../utils/lightingAnalyzer';
import '../styles/AudioMonitoring.css';

export default function TestInterface() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [testData, setTestData] = useState(null);
  const [suspiciousActivity, setSuspiciousActivity] = useState(null);
  const [lightingStatus, setLightingStatus] = useState(null);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [isTestStarted, setIsTestStarted] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const captureIntervalRef = useRef(null);
  const lightingCheckIntervalRef = useRef(null);
  const navigate = useNavigate();
  const { startMonitoring, stopMonitoring } = useScreenMonitor();

  // Initialize test data
  useEffect(() => {
    const initializeTest = async () => {
      try {
        // Get test details from localStorage
        const testDetails = localStorage.getItem('testDetails');
        const formData = localStorage.getItem('testFormData');
        
        if (!testDetails || !formData) {
          console.log("No test data found, redirecting to exam page");
          navigate('/test-interface');
          return;
        }

        const parsedTestDetails = JSON.parse(testDetails);
        const parsedFormData = JSON.parse(formData);
        
        // Generate questions using the AI
        const response = await axios.post('http://localhost:8000/api/tests/generate', {
          skill: parsedTestDetails.skill,
          num_questions: parsedTestDetails.numQuestions,
          duration: parsedTestDetails.duration
        });

        setTestData({
          ...parsedTestDetails,
          questions: response.data.questions,
          candidate_id: parsedFormData.email,
          candidate_name: parsedFormData.name
        });
      } catch (error) {
        console.error("Error initializing test:", error);
        setError("Failed to initialize test. Please try again.");
      }
    };

    initializeTest();
  }, [navigate]);

  // Start webcam monitoring when test is started
  useEffect(() => {
    if (!isTestStarted || !testData) return;

    const startMonitoringWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsWebcamActive(true);

          // Wait for video to be ready
          await new Promise((resolve) => {
            if (videoRef.current.readyState >= 2) {
              resolve();
            } else {
              videoRef.current.onloadeddata = resolve;
            }
          });

          // Start periodic capture
          if (captureIntervalRef.current) {
            clearInterval(captureIntervalRef.current);
          }

          captureIntervalRef.current = setInterval(() => {
            takeWebcamSnapshot();
          }, 5000);

          // Start periodic lighting check
          if (lightingCheckIntervalRef.current) {
            clearInterval(lightingCheckIntervalRef.current);
          }

          lightingCheckIntervalRef.current = setInterval(checkLighting, 5000);
        }
      } catch (err) {
        console.error('Failed to access webcam:', err);
        setError('Failed to access webcam: ' + err.message);
      }
    };

    const checkLighting = () => {
      if (!videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const lightingAnalysis = analyzeLighting(canvas);
      setLightingStatus(lightingAnalysis);
    };

    startMonitoringWebcam();

    return () => {
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
      }
      if (lightingCheckIntervalRef.current) {
        clearInterval(lightingCheckIntervalRef.current);
      }
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, [isTestStarted, testData]);

  // Timer effect
  useEffect(() => {
    if (!isTestStarted || !testData) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isTestStarted, testData]);

  const handleStartTest = async () => {
    try {
      // Start screen capture
      await axios.post('http://localhost:8000/api/monitoring/start-screen-capture', {
        test_id: testData.testId
      });
      
      setIsTestStarted(true);
      setTimeLeft(testData.duration * 60);
      startMonitoring();
    } catch (err) {
      console.error('Error starting screen capture:', err);
      setError('Failed to start screen capture: ' + err.message);
    }
  };

  const handleAnswer = (questionIndex, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
  };

  const calculateScore = () => {
    if (!testData?.questions) return 0;
    return testData.questions.reduce((score, question, index) => {
      return score + (answers[index] === question.correct_answer ? 1 : 0);
    }, 0);
  };

  const handleSubmit = async () => {
    if (!testData) return;

    try {
      setIsSubmitting(true);
      setError(null);

      // Stop monitoring and screen capture before submitting
      stopMonitoring();
      await axios.post('http://localhost:8000/api/monitoring/stop-screen-capture', {
        test_id: testData.testId
      });

      const score = calculateScore();
      const result = {
        score: score,
        total: testData.questions.length,
        timestamp: new Date().toISOString(),
        skill: testData.skill,
        candidate_name: testData.candidate_name,
        candidate_id: testData.candidate_id,
        violations: JSON.parse(localStorage.getItem('test_violations') || '[]').map(v => ({
          timestamp: v.timestamp || new Date().toISOString(),
          type: v.type || 'unknown',
          details: v.details || {}
        })),
        screen_captures: JSON.parse(localStorage.getItem('screen_captures') || '[]').map(c => ({
          timestamp: c.timestamp || new Date().toISOString(),
          image_path: c.image_path || ''
        })),
        audio_events: JSON.parse(localStorage.getItem('audioEvents') || '[]').map(e => ({
          timestamp: e.timestamp || new Date().toISOString(),
          level: parseFloat(e.level) || 0.0,
          type: e.type || 'unknown'
        }))
      };

      // Submit result to backend using the correct endpoint
      const response = await axios.post('http://localhost:8000/api/tests/submit', result);

      // Store result in localStorage
      let existingResults = JSON.parse(localStorage.getItem('testResults') || '[]');
      existingResults.push({
        ...result,
        test_id: testData.testId,
        percentage: (result.score / result.total) * 100,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString()
      });
      localStorage.setItem('testResults', JSON.stringify(existingResults));

      // Clear test data
      localStorage.removeItem('testDetails');
      localStorage.removeItem('testFormData');
      localStorage.removeItem('test_violations');
      localStorage.removeItem('screen_captures');
      localStorage.removeItem('audioEvents');

      // Navigate to home page after successful submission
      navigate('/test-results');
    } catch (err) {
      console.error('Error submitting test:', err);
      setError('Failed to submit test. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const takeWebcamSnapshot = async () => {
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
      formData.append('image', blob, 'snapshot.jpg');
      formData.append('test_id', testData.testId);

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

      console.log('Snapshot saved:', response.data);

      // Handle suspicious activity
      if (response.data.face_count > 1) {
        setSuspiciousActivity({
          timestamp: new Date().toLocaleTimeString(),
          faceCount: response.data.face_count
        });

        // Log the suspicious activity
        try {
          await axios.post('http://localhost:8000/monitoring/log-event', {
            test_id: testData.testId,
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
      console.error('Error taking snapshot:', err);
      setError('Failed to take webcam snapshot: ' + err.message);
    }
  };

  if (!testData) {
    return <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>;
  }

  if (!isTestStarted) {
    return (
      <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
        <div className="relative py-3 sm:max-w-xl sm:mx-auto">
          <div className="relative px-4 py-10 bg-white mx-8 md:mx-0 shadow rounded-3xl sm:p-10">
            <div className="max-w-md mx-auto">
              <div className="divide-y divide-gray-200">
                <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                  <h2 className="text-2xl font-bold mb-8 text-center text-gray-900">Test Details</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Test Information</h3>
                      <p className="mt-2 text-sm text-gray-600">
                        Skill: {testData.skill}<br />
                        Duration: {testData.duration} minutes<br />
                        Questions: {testData.numQuestions}
                      </p>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Instructions</h3>
                      <ul className="mt-2 text-sm text-gray-600 list-disc list-inside space-y-2">
                        <li>You will need a working webcam and microphone</li>
                        <li>The test will be in fullscreen mode</li>
                        <li>You cannot switch tabs or windows during the test</li>
                        <li>Your screen and audio will be monitored</li>
                        <li>You will be warned for any suspicious activity</li>
                      </ul>
                    </div>

                    <div className="pt-4">
                      <button
                        onClick={handleStartTest}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Start Test
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AudioMonitoringProvider candidateId={testData.candidate_id}>
      <BrowserControlsProvider>
        <div className="test-interface">
          <div className="monitoring-controls">
            <ScreenMonitorStatus />
            <AudioMonitoring />
          </div>

          <div className="max-w-2xl mx-auto p-4">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <div className="flex justify-between mb-4">
              <div className="text-lg font-medium">
                Time Left: {Math.floor(timeLeft / 60)}:{timeLeft % 60 < 10 ? "0" : ""}
                {timeLeft % 60}
              </div>
              <div className="text-lg font-medium">
                Question {currentQuestion + 1} of {testData.questions.length}
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-6">
                {testData.questions[currentQuestion].question}
              </h2>
              <div className="space-y-3">
                {testData.questions[currentQuestion].options.map(
                  (option, optIndex) => {
                    const isSelected = answers[currentQuestion] === option;
                    return (
                      <button
                        key={optIndex}
                        onClick={() => handleAnswer(currentQuestion, option)}
                        className={`w-full p-4 text-left rounded-lg transition-all duration-200 ${
                          isSelected
                            ? "bg-blue-100 border-2 border-blue-500 text-blue-700 font-medium"
                            : "bg-white border-2 border-gray-200 hover:bg-gray-50 hover:border-blue-300"
                        }`}
                        disabled={isSubmitting}
                      >
                        <div className="flex items-center">
                          <div className={`w-6 h-6 rounded-full border-2 mr-3 flex items-center justify-center ${
                            isSelected ? "border-blue-500 bg-blue-500" : "border-gray-300"
                          }`}>
                            {isSelected && (
                              <div className="w-3 h-3 rounded-full bg-white"></div>
                            )}
                          </div>
                          <span>{option}</span>
                        </div>
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <button
                onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                disabled={currentQuestion === 0}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Previous
              </button>
              
              {currentQuestion < testData.questions.length - 1 ? (
                <button
                  onClick={() => setCurrentQuestion(prev => prev + 1)}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Test'}
                </button>
              )}
            </div>
          </div>

          {/* Webcam Preview with Status */}
          <div className="webcam-container" style={{ width: '320px', height: '240px', position: 'fixed', bottom: '20px', right: '20px', zIndex: 1000 }}>
            {/* Gaze Tracker */}
            <div style={{
              position: 'absolute',
              top: '-100px',
              left: '0',
              right: '0',
              zIndex: 1002
            }}>
              <GazeTracker isProctoring={isTestStarted} />
            </div>

            {/* Lighting Status Bar */}
            <div style={{
              position: 'absolute',
              top: '-40px',
              left: '0',
              right: '0',
              backgroundColor: lightingStatus?.status === 'normal' ? '#4CAF50' : 
                             lightingStatus?.status === 'too_dark' ? '#f44336' : 
                             lightingStatus?.status === 'too_bright' ? '#ff9800' : '#666',
              color: 'white',
              padding: '8px',
              borderRadius: '8px 8px 0 0',
              fontSize: '14px',
              textAlign: 'center',
              transition: 'background-color 0.3s ease',
              boxShadow: '0 -2px 4px rgba(0,0,0,0.1)',
              zIndex: 1001
            }}>
              {lightingStatus?.status === 'normal' ? 'Lighting is good' :
               lightingStatus?.status === 'too_dark' ? 'Room is too dim' :
               lightingStatus?.status === 'too_bright' ? 'Room is too bright' : 'Checking lighting...'}
            </div>

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            
            {/* Status Overlays */}
            <div className="status-overlays" style={{ position: 'absolute', top: '10px', left: '10px', right: '10px' }}>
              {!isWebcamActive && (
                <div className="webcam-status" style={{ 
                  backgroundColor: 'rgba(255, 0, 0, 0.8)',
                  color: 'white',
                  padding: '8px',
                  borderRadius: '4px',
                  fontSize: '14px',
                  marginBottom: '8px'
                }}>
                  ⚠️ Webcam not active
                </div>
              )}
              
              {suspiciousActivity && (
                <div className="suspicious-alert" style={{ 
                  backgroundColor: 'rgba(255, 0, 0, 0.8)',
                  color: 'white',
                  padding: '8px',
                  borderRadius: '4px',
                  fontSize: '14px',
                  marginBottom: '8px'
                }}>
                  ⚠️ Multiple faces detected ({suspiciousActivity.faceCount}) at {suspiciousActivity.timestamp}
                </div>
              )}
            </div>
          </div>
        </div>
      </BrowserControlsProvider>
    </AudioMonitoringProvider>
  );
}
