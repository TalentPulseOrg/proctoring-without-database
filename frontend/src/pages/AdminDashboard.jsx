import { useState, useEffect } from 'react';
import axios from 'axios';
import AdminTestCreation from '../components/AdminTestCreation';
import AdminTestList from '../components/AdminTestList';
import ProctoringReport from '../components/ProctoringReport';
import { TestProvider } from '../contexts/TestContext';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AssessmentIcon from '@mui/icons-material/Assessment';
import DownloadIcon from '@mui/icons-material/Download';
import CompletedTests from '../components/admin/CompletedTests';
import TestMonitoringViewer from '../components/TestMonitoringViewer';

export default function AdminDashboard() {
  const [testResults, setTestResults] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showLogs, setShowLogs] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showMonitoring, setShowMonitoring] = useState(false);

  useEffect(() => {
    fetchTestResults();
  }, []);

  const fetchTestResults = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:8000/api/exam/results');
      setTestResults(response.data);
    } catch (error) {
      console.error('Error fetching test results:', error);
      setError('Failed to load test results');
    } finally {
      setLoading(false);
    }
  };

  const handleViewLogs = async (testId) => {
    try {
      const response = await axios.get(`http://localhost:8000/api/exam/logs/${testId}`);
      setSelectedTest({
        testId,
        logs: response.data
      });
      setShowLogs(true);
    } catch (error) {
      console.error('Error fetching test logs:', error);
      setError('Failed to load test logs');
    }
  };

  const handleViewReport = (testId, candidateName) => {
    setSelectedReport({
      testId,
      candidateName
    });
    setShowReport(true);
  };

  const handleDeleteTest = async (testId) => {
    if (!window.confirm('Are you sure you want to delete this test result?')) {
      return;
    }

    try {
      await axios.delete(`http://localhost:8000/api/exam/results/${testId}`);
      await fetchTestResults(); // Refresh the list
    } catch (error) {
      console.error('Error deleting test result:', error);
      setError('Failed to delete test result');
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Are you sure you want to delete ALL test results? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete('http://localhost:8000/api/exam/results');
      await fetchTestResults(); // Refresh the list
    } catch (error) {
      console.error('Error deleting all test results:', error);
      setError('Failed to delete all test results');
    }
  };

  const handleDownloadReport = (test) => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(20);
    doc.text(`Test Report - ${test.candidate_name}`, 20, 20);
    
    // Test Information
    doc.setFontSize(12);
    doc.text(`Test ID: ${test.test_id}`, 20, 40);
    doc.text(`Date: ${test.date}`, 20, 50);
    doc.text(`Time: ${test.time}`, 20, 60);
    doc.text(`Score: ${test.score}/${test.total} (${test.percentage}%)`, 20, 70);
    
    // Violations Table
    const violations = test.violations || [];
    const tableData = violations.map(v => [
      format(new Date(v.timestamp), 'HH:mm:ss'),
      v.type,
      JSON.stringify(v.details)
    ]);
    
    doc.autoTable({
      startY: 80,
      head: [['Time', 'Type', 'Details']],
      body: tableData,
    });
    
    // Save the PDF
    doc.save(`test_report_${test.test_id}.pdf`);
  };

  const closeLogs = () => {
    setShowLogs(false);
    setSelectedTest(null);
  };

  const closeReport = () => {
    setShowReport(false);
    setSelectedReport(null);
  };

  const handleViewMonitoring = (test) => {
    setSelectedTest(test);
    setShowMonitoring(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <TestProvider>
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Admin Dashboard
            </h1>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0 space-y-6">
            {/* Test Creation Section */}
            <AdminTestCreation />

            {/* Test List Section */}
            <AdminTestList />

            {/* Completed Tests Section */}
            <CompletedTests />

            {showMonitoring && selectedTest ? (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-semibold">
                    Monitoring Data for Test: {selectedTest.testId}
                  </h2>
                  <button
                    onClick={() => setShowMonitoring(false)}
                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    Back to Tests
                  </button>
                </div>
                <TestMonitoringViewer testId={selectedTest.testId} />
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Test ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Skill
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Duration
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Questions
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {testResults.map((test) => (
                      <tr key={test.test_id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {test.test_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {test.skill}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {test.duration} minutes
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {test.numQuestions}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            test.status === 'completed' ? 'bg-green-100 text-green-800' :
                            test.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {test.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleViewMonitoring(test)}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            View Monitoring
                          </button>
                          <button
                            onClick={() => handleDeleteTest(test.test_id)}
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
            )}
          </div>
        </main>

        {/* Logs Dialog */}
        <Dialog open={showLogs} onClose={closeLogs} maxWidth="md" fullWidth>
          <DialogTitle>Test Logs</DialogTitle>
          <DialogContent>
            {selectedTest && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Violations</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedTest.logs.map((log, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {format(new Date(log.timestamp), 'HH:mm:ss')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.type}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">{JSON.stringify(log.details)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={closeLogs}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Report Dialog */}
        <Dialog open={showReport} onClose={closeReport} maxWidth="lg" fullWidth>
          <DialogTitle>Proctoring Report</DialogTitle>
          <DialogContent>
            {selectedReport && (
              <ProctoringReport sessionId={selectedReport.testId} candidateName={selectedReport.candidateName} />
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={closeReport}>Close</Button>
          </DialogActions>
        </Dialog>
      </div>
    </TestProvider>
  );
}
