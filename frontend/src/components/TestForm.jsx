import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const TestForm = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        testId: '',
        agreeToTerms: false
    });
    const [error, setError] = useState('');
    const [testDetails, setTestDetails] = useState(null);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleTestIdChange = async (e) => {
        const { value } = e.target;
        setFormData(prev => ({
            ...prev,
            testId: value
        }));

        // Check if test exists when test ID is entered
        if (value) {
            try {
                const adminTests = JSON.parse(localStorage.getItem('adminTests') || '[]');
                const test = adminTests.find(t => t.testId === value);
                if (test) {
                    setTestDetails(test);
                } else {
                    setTestDetails(null);
                    setError('Test ID not found');
                }
            } catch (err) {
                setError('Error checking test ID');
            }
        } else {
            setTestDetails(null);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Basic validation
        if (!formData.name || !formData.email || !formData.testId) {
            setError('Please fill in all required fields');
            return;
        }

        if (!formData.agreeToTerms) {
            setError('You must agree to the terms and conditions');
            return;
        }

        // Verify test exists
        const adminTests = JSON.parse(localStorage.getItem('adminTests') || '[]');
        const test = adminTests.find(t => t.testId === formData.testId);
        
        if (!test) {
            setError('Test not found');
            return;
        }

        // Store form data and test details in localStorage
        localStorage.setItem('testFormData', JSON.stringify(formData));
        localStorage.setItem('testDetails', JSON.stringify(test));
        
        // Navigate to prerequisites check
        navigate('/prerequisites');
    };

    return (
        <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
            <div className="relative py-3 sm:max-w-xl sm:mx-auto">
                <div className="relative px-4 py-10 bg-white mx-8 md:mx-0 shadow rounded-3xl sm:p-10">
                    <div className="max-w-md mx-auto">
                        <div className="divide-y divide-gray-200">
                            <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                                <h2 className="text-2xl font-bold mb-8 text-center text-gray-900">Test Registration Form</h2>
                                
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Full Name *</label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Email *</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Test ID *</label>
                                        <input
                                            type="text"
                                            name="testId"
                                            value={formData.testId}
                                            onChange={handleTestIdChange}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                            required
                                        />
                                    </div>

                                    {testDetails && (
                                        <div className="bg-blue-50 p-4 rounded-lg">
                                            <h3 className="text-sm font-medium text-blue-800">Test Details</h3>
                                            <p className="mt-1 text-sm text-blue-700">
                                                Skill: {testDetails.skill}<br />
                                                Duration: {testDetails.duration} minutes<br />
                                                Questions: {testDetails.numQuestions}
                                            </p>
                                        </div>
                                    )}

                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            name="agreeToTerms"
                                            checked={formData.agreeToTerms}
                                            onChange={handleChange}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <label className="ml-2 block text-sm text-gray-900">
                                            I agree to the terms and conditions of the test
                                        </label>
                                    </div>

                                    {error && (
                                        <div className="text-red-500 text-sm mt-2">
                                            {error}
                                        </div>
                                    )}

                                    <div className="pt-4">
                                        <button
                                            type="submit"
                                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                        >
                                            Proceed to System Check
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TestForm;
