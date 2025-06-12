import React, { createContext, useContext, useEffect, useCallback, useState } from 'react';
import { useScreenMonitor } from './ScreenMonitorContext';

const BrowserControlsContext = createContext();

export const useBrowserControls = () => useContext(BrowserControlsContext);

export const BrowserControlsProvider = ({ children }) => {
  const { handleViolation, isTestActive } = useScreenMonitor();
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');

  // Show warning toast
  const showWarningToast = useCallback((message) => {
    setWarningMessage(message);
    setShowWarning(true);
    setTimeout(() => {
      setShowWarning(false);
    }, 3000);
  }, []);

  // Block copy/paste
  const preventCopyPaste = useCallback((e) => {
    e.preventDefault();
    const action = e.type === 'copy' ? 'Copy' : 'Paste';
    showWarningToast(`⚠️ ${action} action is disabled during the exam`);
    handleViolation('copy_paste_attempt');
  }, [handleViolation, showWarningToast]);

  // Block keyboard shortcuts
  const preventKeyboardShortcuts = useCallback((e) => {
    const key = e.key.toLowerCase();
    
    // Escape key - block immediately and prevent propagation
    if (key === 'escape') {
      e.preventDefault();
      e.stopPropagation();
      showWarningToast('⚠️ Escape key is disabled during the exam');
      handleViolation('escape_key_pressed');
      return false;
    }
    
    // Function keys (F1-F12)
    if (key.startsWith('f') && key.length <= 3) {
      e.preventDefault();
      showWarningToast(`⚠️ Function key ${key.toUpperCase()} is disabled during the exam`);
      handleViolation('function_key_pressed');
      return false;
    }

    // Ctrl/Cmd + key combinations
    if (e.ctrlKey || e.metaKey) {
      const blockedKeys = ['c', 'v', 't', 'n', 'w', 'r', 'p', 's'];
      if (blockedKeys.includes(key)) {
        e.preventDefault();
        const action = key === 'c' ? 'Copy' : 
                      key === 'v' ? 'Paste' :
                      key === 't' ? 'New Tab' :
                      key === 'n' ? 'New Window' :
                      key === 'w' ? 'Close Tab' :
                      key === 'r' ? 'Refresh' :
                      key === 'p' ? 'Print' :
                      'Save';
        showWarningToast(`⚠️ ${action} shortcut is disabled during the exam`);
        handleViolation('keyboard_shortcut_attempt');
        return false;
      }
    }

    // Alt + Tab
    if (e.altKey && key === 'tab') {
      e.preventDefault();
      showWarningToast('⚠️ Alt+Tab is disabled during the exam');
      handleViolation('alt_tab_attempt');
      return false;
    }

    // Windows key
    if (key === 'meta') {
      e.preventDefault();
      showWarningToast('⚠️ Windows key is disabled during the exam');
      handleViolation('windows_key_pressed');
      return false;
    }

    // DevTools shortcuts
    if ((e.ctrlKey && e.shiftKey && key === 'i') || 
        (e.ctrlKey && e.shiftKey && key === 'j') || 
        (e.ctrlKey && key === 'u') ||
        key === 'f12') {
      e.preventDefault();
      showWarningToast('⚠️ Developer tools access is disabled during the exam');
      handleViolation('devtools_attempt');
      return false;
    }
  }, [handleViolation, showWarningToast]);

  // Block right-click
  const preventContextMenu = useCallback((e) => {
    e.preventDefault();
    showWarningToast('⚠️ Right-click is disabled during the exam');
    handleViolation('right_click_attempt');
  }, [handleViolation, showWarningToast]);

  // Simulate unauthorized app detection
  const simulateAppDetection = useCallback(() => {
    const suspiciousApps = [
      'Screen Recorder',
      'Messaging App',
      'Remote Desktop',
      'Virtual Machine',
      'Screen Sharing Tool'
    ];

    const randomApp = suspiciousApps[Math.floor(Math.random() * suspiciousApps.length)];
    showWarningToast(`⚠️ Suspicious app detected: ${randomApp}`);
    handleViolation('suspicious_app_detected');
  }, [handleViolation, showWarningToast]);

  useEffect(() => {
    // Add event listeners with capture phase to ensure they run first
    document.addEventListener('copy', preventCopyPaste, true);
    document.addEventListener('paste', preventCopyPaste, true);
    document.addEventListener('keydown', preventKeyboardShortcuts, true);
    document.addEventListener('contextmenu', preventContextMenu, true);

    // Simulate app detection every 30-60 seconds
    const appDetectionInterval = setInterval(() => {
      if (Math.random() < 0.3) { // 30% chance to trigger
        simulateAppDetection();
      }
    }, 30000);

    // Cleanup
    return () => {
      document.removeEventListener('copy', preventCopyPaste, true);
      document.removeEventListener('paste', preventCopyPaste, true);
      document.removeEventListener('keydown', preventKeyboardShortcuts, true);
      document.removeEventListener('contextmenu', preventContextMenu, true);
      clearInterval(appDetectionInterval);
    };
  }, [preventCopyPaste, preventKeyboardShortcuts, preventContextMenu, simulateAppDetection]);

  return (
    <BrowserControlsContext.Provider value={{}}>
      {children}
      {showWarning && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
          {warningMessage}
        </div>
      )}
    </BrowserControlsContext.Provider>
  );
}; 