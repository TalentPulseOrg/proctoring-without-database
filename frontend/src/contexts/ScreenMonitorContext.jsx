import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const ScreenMonitorContext = createContext();

export const useScreenMonitor = () => useContext(ScreenMonitorContext);

export const ScreenMonitorProvider = ({ children }) => {
    const [warningCount, setWarningCount] = useState(3);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isTestActive, setIsTestActive] = useState(false);
    const [showWarning, setShowWarning] = useState(false);
    const [warningMessage, setWarningMessage] = useState('');
    const navigate = useNavigate();
    const violationTimeoutRef = useRef(null);
    const isHandlingViolationRef = useRef(false);
    const fullscreenRetryRef = useRef(null);
    const keyHandlerRef = useRef(null);

    // Get the correct fullscreen method for the browser
    const getFullscreenElement = () => {
        return document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement;
    };

    // Get the correct requestFullscreen method for the browser
    const getRequestFullscreenMethod = (element) => {
        return element.requestFullscreen ||
            element.webkitRequestFullscreen ||
            element.mozRequestFullScreen ||
            element.msRequestFullscreen;
    };

    // Global key handler to prevent Escape key
    const preventEscapeKey = useCallback((e) => {
        if (e.key === 'Escape' || e.keyCode === 27) {
            e.preventDefault();
            e.stopPropagation();
            handleViolation('escape_key_pressed');
            return false;
        }
    }, []);

    // Initialize fullscreen and monitoring
    const startMonitoring = useCallback(() => {
        // Set up global key handler immediately
        if (keyHandlerRef.current) {
            document.removeEventListener('keydown', keyHandlerRef.current, true);
        }
        keyHandlerRef.current = preventEscapeKey;
        document.addEventListener('keydown', keyHandlerRef.current, true);

        // Force fullscreen immediately
        const element = document.documentElement;
        const requestFullscreen = getRequestFullscreenMethod(element);
        if (requestFullscreen) {
            requestFullscreen.call(element).catch(error => {
                console.error('Error entering fullscreen:', error);
                handleViolation('fullscreen_error');
            });
        }

        setIsTestActive(true);
        startScreenCapture();
    }, [preventEscapeKey]);

    // Handle fullscreen change with retry mechanism
    useEffect(() => {
        const handleFullscreenChange = () => {
            const isCurrentlyFullscreen = getFullscreenElement() !== null;
            setIsFullscreen(isCurrentlyFullscreen);

            if (!isCurrentlyFullscreen && isTestActive) {
                handleViolation('fullscreen_exit');
                
                // Retry entering fullscreen every 500ms until successful
                if (fullscreenRetryRef.current) {
                    clearInterval(fullscreenRetryRef.current);
                }
                
                fullscreenRetryRef.current = setInterval(() => {
                    if (!getFullscreenElement() && isTestActive) {
                        const element = document.documentElement;
                        const requestFullscreen = getRequestFullscreenMethod(element);
                        if (requestFullscreen) {
                            requestFullscreen.call(element);
                        }
                    } else {
                        clearInterval(fullscreenRetryRef.current);
                    }
                }, 500);
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);

        // Initial fullscreen check
        if (isTestActive && !getFullscreenElement()) {
            const element = document.documentElement;
            const requestFullscreen = getRequestFullscreenMethod(element);
            if (requestFullscreen) {
                requestFullscreen.call(element);
            }
        }

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
            document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
            if (fullscreenRetryRef.current) {
                clearInterval(fullscreenRetryRef.current);
            }
        };
    }, [isTestActive]);

    // Handle visibility change (tab switch)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && isTestActive) {
                handleViolation('tab_switch');
                // Force fullscreen when tab becomes visible again
                if (!document.hidden) {
                    const element = document.documentElement;
                    const requestFullscreen = getRequestFullscreenMethod(element);
                    if (requestFullscreen) {
                        requestFullscreen.call(element);
                    }
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [isTestActive]);

    // Handle window blur
    useEffect(() => {
        const handleBlur = () => {
            if (isTestActive) {
                handleViolation('window_blur');
                // Force fullscreen when window regains focus
                window.addEventListener('focus', () => {
                    if (isTestActive && !getFullscreenElement()) {
                        const element = document.documentElement;
                        const requestFullscreen = getRequestFullscreenMethod(element);
                        if (requestFullscreen) {
                            requestFullscreen.call(element);
                        }
                    }
                }, { once: true });
            }
        };

        window.addEventListener('blur', handleBlur);
        return () => window.removeEventListener('blur', handleBlur);
    }, [isTestActive]);

    // Handle violations with debounce
    const handleViolation = useCallback((violationType) => {
        // If already handling a violation or test is not active, ignore
        if (isHandlingViolationRef.current || !isTestActive) return;

        // Set handling flag
        isHandlingViolationRef.current = true;

        // Clear any existing timeout
        if (violationTimeoutRef.current) {
            clearTimeout(violationTimeoutRef.current);
        }

        // Set a timeout to prevent multiple violations from being processed at once
        violationTimeoutRef.current = setTimeout(() => {
            setWarningCount(prevCount => {
                const newCount = prevCount - 1;
                
                // Store violation in localStorage
                const violations = JSON.parse(localStorage.getItem('test_violations') || '[]');
                violations.push({
                    type: violationType,
                    timestamp: new Date().toISOString(),
                });
                localStorage.setItem('test_violations', JSON.stringify(violations));

                // Show warning message
                const message = `${violationType.replace('_', ' ')} detected. ${newCount} warnings remaining.`;
                setWarningMessage(message);
                setShowWarning(true);

                // Hide warning after 3 seconds
                setTimeout(() => {
                    setShowWarning(false);
                }, 3000);

                if (newCount <= 0) {
                    handleTestTermination();
                } else {
                    const element = document.documentElement;
                    const requestFullscreen = getRequestFullscreenMethod(element);
                    if (requestFullscreen) {
                        requestFullscreen.call(element);
                    }
                }

                return newCount;
            });

            // Reset handling flag after a delay
            setTimeout(() => {
                isHandlingViolationRef.current = false;
            }, 1000);
        }, 100);
    }, [isTestActive]);

    // Handle test termination
    const handleTestTermination = useCallback(() => {
        setIsTestActive(false);
        if (fullscreenRetryRef.current) {
            clearInterval(fullscreenRetryRef.current);
        }
        if (keyHandlerRef.current) {
            document.removeEventListener('keydown', keyHandlerRef.current, true);
        }
        localStorage.setItem('test_terminated', 'true');
        localStorage.setItem('termination_reason', 'multiple_violations');
        navigate('/');
    }, [navigate]);

    // Simulate screen capture
    const startScreenCapture = useCallback(() => {
        const captureInterval = setInterval(() => {
            if (!isTestActive) {
                clearInterval(captureInterval);
                return;
            }

            // Store capture timestamp in localStorage
            const captures = JSON.parse(localStorage.getItem('screen_captures') || '[]');
            captures.push({
                timestamp: new Date().toISOString(),
            });
            localStorage.setItem('screen_captures', JSON.stringify(captures));
        }, 15000); // Every 15 seconds

        return () => clearInterval(captureInterval);
    }, [isTestActive]);

    // Cleanup function
    const stopMonitoring = useCallback(() => {
        setIsTestActive(false);
        if (fullscreenRetryRef.current) {
            clearInterval(fullscreenRetryRef.current);
        }
        if (keyHandlerRef.current) {
            document.removeEventListener('keydown', keyHandlerRef.current, true);
        }
        if (getFullscreenElement()) {
            document.exitFullscreen?.() ||
            document.webkitExitFullscreen?.() ||
            document.mozCancelFullScreen?.() ||
            document.msExitFullscreen?.();
        }
    }, []);

    const value = {
        warningCount,
        isFullscreen,
        isTestActive,
        startMonitoring,
        stopMonitoring,
        showWarning,
        warningMessage
    };

    return (
        <ScreenMonitorContext.Provider value={value}>
            {children}
            {showWarning && (
                <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
                    {warningMessage}
                </div>
            )}
        </ScreenMonitorContext.Provider>
    );
}; 