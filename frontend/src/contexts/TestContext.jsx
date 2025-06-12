import React, { createContext, useContext, useState, useEffect } from 'react';

const TestContext = createContext();

export const useTestContext = () => {
    const context = useContext(TestContext);
    if (!context) {
        throw new Error('useTestContext must be used within a TestProvider');
    }
    return context;
};

export const TestProvider = ({ children }) => {
    const [tests, setTests] = useState([]);

    const loadTests = () => {
        try {
            const storedTests = JSON.parse(localStorage.getItem('adminTests') || '[]');
            setTests(storedTests);
        } catch (err) {
            console.error('Failed to load tests:', err);
        }
    };

    const addTest = (newTest) => {
        try {
            const updatedTests = [...tests, newTest];
            localStorage.setItem('adminTests', JSON.stringify(updatedTests));
            setTests(updatedTests);
        } catch (err) {
            console.error('Failed to add test:', err);
        }
    };

    const deleteTest = (testId) => {
        try {
            const updatedTests = tests.filter(test => test.testId !== testId);
            localStorage.setItem('adminTests', JSON.stringify(updatedTests));
            setTests(updatedTests);
        } catch (err) {
            console.error('Failed to delete test:', err);
        }
    };

    const deleteAllTests = () => {
        try {
            localStorage.setItem('adminTests', JSON.stringify([]));
            setTests([]);
        } catch (err) {
            console.error('Failed to delete all tests:', err);
        }
    };

    useEffect(() => {
        loadTests();
    }, []);

    return (
        <TestContext.Provider value={{ tests, loadTests, addTest, deleteTest, deleteAllTests }}>
            {children}
        </TestContext.Provider>
    );
}; 