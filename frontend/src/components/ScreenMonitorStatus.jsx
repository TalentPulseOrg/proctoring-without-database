import React from 'react';
import { useScreenMonitor } from '../contexts/ScreenMonitorContext';

const ScreenMonitorStatus = () => {
    const { warningCount, isFullscreen, isTestActive } = useScreenMonitor();

    if (!isTestActive) return null;

    return (
        <div className="fixed top-4 right-4 bg-white p-4 rounded-lg shadow-lg z-50">
            <div className="flex items-center space-x-4">
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-600">Warnings Remaining</span>
                    <span className="text-2xl font-bold text-red-600">{warningCount}</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-600">Fullscreen Status</span>
                    <span className={`text-sm font-medium ${isFullscreen ? 'text-green-600' : 'text-red-600'}`}>
                        {isFullscreen ? 'Active' : 'Inactive'}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ScreenMonitorStatus; 