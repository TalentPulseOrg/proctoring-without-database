import React, { createContext, useContext, useState, useEffect } from 'react';

const BehavioralAnalysisContext = createContext();

export const useBehavioralAnalysis = () => {
  const context = useContext(BehavioralAnalysisContext);
  if (!context) {
    throw new Error('useBehavioralAnalysis must be used within a BehavioralAnalysisProvider');
  }
  return context;
};

export const BehavioralAnalysisProvider = ({ children }) => {
  const [anomalies, setAnomalies] = useState([]);
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    // Load anomalies from localStorage on mount
    const storedAnomalies = JSON.parse(localStorage.getItem('behavioralAnomalies') || '[]');
    setAnomalies(storedAnomalies);
  }, []);

  const addAnomaly = (anomaly) => {
    setAnomalies(prev => {
      const newAnomalies = [...prev, anomaly];
      localStorage.setItem('behavioralAnomalies', JSON.stringify(newAnomalies));
      return newAnomalies;
    });
  };

  const clearAnomalies = () => {
    setAnomalies([]);
    localStorage.removeItem('behavioralAnomalies');
  };

  const startTracking = () => {
    setIsTracking(true);
  };

  const stopTracking = () => {
    setIsTracking(false);
  };

  const value = {
    anomalies,
    isTracking,
    addAnomaly,
    clearAnomalies,
    startTracking,
    stopTracking
  };

  return (
    <BehavioralAnalysisContext.Provider value={value}>
      {children}
    </BehavioralAnalysisContext.Provider>
  );
};

export default BehavioralAnalysisContext; 