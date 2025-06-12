import React from 'react';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTestContext } from '../contexts/TestContext';

const AdminTestList = () => {
    const { tests, deleteTest, deleteAllTests } = useTestContext();

    const handleDeleteTest = (testId) => {
        if (!window.confirm('Are you sure you want to delete this test?')) {
            return;
        }
        deleteTest(testId);
    };

    const handleDeleteAll = () => {
        if (!window.confirm('Are you sure you want to delete ALL created tests? This action cannot be undone.')) {
            return;
        }
        deleteAllTests();
    };

    if (tests.length === 0) {
        return (
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">Created Tests</h2>
                <p className="text-gray-500">No tests have been created yet.</p>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Created Tests</h2>
                <button
                    onClick={handleDeleteAll}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                >
                    <DeleteIcon />
                    <span>Delete All Tests</span>
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Skill</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Questions</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {tests.map((test) => (
                            <tr key={test.testId}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{test.testId}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{test.skill}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{test.numQuestions}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{test.duration} minutes</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(test.createdAt).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <button
                                        onClick={() => handleDeleteTest(test.testId)}
                                        className="text-red-600 hover:text-red-900"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminTestList; 