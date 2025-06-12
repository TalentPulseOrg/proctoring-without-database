import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const TestResults = () => {
    const [results, setResults] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        // Get the latest test result from localStorage
        const storedResults = localStorage.getItem('testResults');
        if (!storedResults) {
            navigate('/');
            return;
        }

        try {
            const parsedResults = JSON.parse(storedResults);
            // Get the most recent result
            const latestResult = parsedResults[parsedResults.length - 1];
            setResults(latestResult);
        } catch (error) {
            console.error('Error parsing test results:', error);
            navigate('/');
        }
    }, [navigate]);

    if (!results) {
        return <div>Loading...</div>;
    }

    const getViolationTypeLabel = (type) => {
        switch (type) {
            case 'fullscreen_exit':
                return 'Fullscreen Exit';
            case 'tab_switch':
                return 'Tab Switch';
            case 'window_blur':
                return 'Window Minimized';
            default:
                return type;
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
            <div className="relative py-3 sm:max-w-xl sm:mx-auto">
                <div className="relative px-4 py-10 bg-white mx-8 md:mx-0 shadow rounded-3xl sm:p-10">
                    <div className="max-w-md mx-auto">
                        <div className="divide-y divide-gray-200">
                            <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                                <h2 className="text-2xl font-bold mb-8 text-center text-gray-900">Test Results</h2>
                                
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium">Skill Tested:</span>
                                        <span>{results.skill}</span>
                                    </div>
                                    
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium">Score:</span>
                                        <span>{results.score} out of {results.total}</span>
                                    </div>
                                    
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium">Percentage:</span>
                                        <span>{results.percentage.toFixed(2)}%</span>
                                    </div>
                                    
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium">Date:</span>
                                        <span>{results.date}</span>
                                    </div>
                                    
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium">Time:</span>
                                        <span>{results.time}</span>
                                    </div>

                                    <div className="mt-6 pt-6 border-t border-gray-200">
                                        <h3 className="text-lg font-semibold mb-4">Monitoring Data</h3>
                                        
                                        {results.violations && results.violations.length > 0 ? (
                                            <div className="space-y-3">
                                                <div className="font-medium text-red-600">
                                                    Violations Detected: {results.violations.length}
                                                </div>
                                                <div className="space-y-2">
                                                    {results.violations.map((violation, index) => (
                                                        <div key={index} className="text-sm text-gray-600">
                                                            {getViolationTypeLabel(violation.type)} - {new Date(violation.timestamp).toLocaleString()}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-green-600">No violations detected</div>
                                        )}

                                        {results.screen_captures && (
                                            <div className="mt-4 text-sm text-gray-600">
                                                Screen captures taken: {results.screen_captures.length}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-6">
                                    <button
                                        onClick={() => navigate('/')}
                                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        Return to Home
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TestResults;
