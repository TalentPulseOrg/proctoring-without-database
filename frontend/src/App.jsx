import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import { ScreenMonitorProvider } from './contexts/ScreenMonitorContext';
import { AudioMonitoringProvider } from './contexts/AudioMonitoringContext';
import { BehavioralAnalysisProvider } from './contexts/BehavioralAnalysisContext';
import ErrorBoundary from './components/ErrorBoundary';
import './styles/ErrorBoundary.css';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ScreenMonitorProvider>
          <AudioMonitoringProvider>
            <BehavioralAnalysisProvider>
              <AppRoutes />
            </BehavioralAnalysisProvider>
          </AudioMonitoringProvider>
        </ScreenMonitorProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;