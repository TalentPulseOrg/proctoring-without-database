import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AssessmentIcon from '@mui/icons-material/Assessment';
import DownloadIcon from '@mui/icons-material/Download';
import MonitorIcon from '@mui/icons-material/Monitor';
import ProctoringReport from '../ProctoringReport';
import TestMonitoringViewer from '../TestMonitoringViewer';

const CompletedTests = () => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTest, setSelectedTest] = useState(null);
  const [showLogs, setShowLogs] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMonitoring, setShowMonitoring] = useState(false);

  useEffect(() => {
    fetchCompletedTests();
  }, []);

  const fetchCompletedTests = () => {
    try {
      const completedTests = JSON.parse(localStorage.getItem('testResults') || '[]');
      setTests(completedTests);
    } catch (err) {
      console.error('Error fetching completed tests:', err);
      setError('Failed to fetch completed tests');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllTests = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDeleteAll = () => {
    try {
      localStorage.setItem('testResults', JSON.stringify([]));
      setTests([]);
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error('Error deleting all tests:', err);
      setError('Failed to delete all tests');
    }
  };

  const handleDeleteTest = (testId) => {
    try {
      const updatedTests = tests.filter(test => test.test_id !== testId);
      localStorage.setItem('testResults', JSON.stringify(updatedTests));
      setTests(updatedTests);
    } catch (err) {
      console.error('Error deleting test:', err);
      setError('Failed to delete test');
    }
  };

  const handleViewLogs = (test) => {
    setSelectedTest(test);
    setShowLogs(true);
  };

  const handleViewReport = (test) => {
    setSelectedTest(test);
    setShowReport(true);
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

  const handleViewMonitoring = (test) => {
    setSelectedTest(test);
    setShowMonitoring(true);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {showMonitoring && selectedTest ? (
        <div>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h4">
              Monitoring Data for Test: {selectedTest.test_id}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => setShowMonitoring(false)}
            >
              Back to Tests
            </Button>
          </Box>
          <TestMonitoringViewer testId={selectedTest.test_id} />
        </div>
      ) : (
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h4">
                Completed Tests
              </Typography>
              {tests.length > 0 && (
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleDeleteAllTests}
                >
                  Delete All Tests
                </Button>
              )}
            </Box>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tests.map((test) => (
                    <tr key={test.test_id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{test.test_id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{test.candidate_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{test.date}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{test.time}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{test.percentage}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <IconButton onClick={() => handleViewMonitoring(test)} color="info" size="small" title="View Monitoring">
                          <MonitorIcon />
                        </IconButton>
                        <IconButton onClick={() => handleViewLogs(test)} color="primary" size="small" title="View Logs">
                          <VisibilityIcon />
                        </IconButton>
                        <IconButton onClick={() => handleViewReport(test)} color="secondary" size="small" title="View Report">
                          <AssessmentIcon />
                        </IconButton>
                        <IconButton onClick={() => handleDownloadReport(test)} color="success" size="small" title="Download Report">
                          <DownloadIcon />
                        </IconButton>
                        <IconButton onClick={() => handleDeleteTest(test.test_id)} color="error" size="small" title="Delete Test">
                          <DeleteIcon />
                        </IconButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
      >
        <DialogTitle>Confirm Delete All Tests</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete all completed tests? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
          <Button onClick={confirmDeleteAll} color="error" variant="contained">
            Delete All
          </Button>
        </DialogActions>
      </Dialog>

      {/* Logs Dialog */}
      <Dialog open={showLogs} onClose={() => setShowLogs(false)} maxWidth="md" fullWidth>
        <DialogTitle>Test Logs</DialogTitle>
        <DialogContent>
          {selectedTest && (
            <div className="space-y-4">
              <Typography variant="h6">Violations</Typography>
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
                    {selectedTest.violations.map((violation, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {format(new Date(violation.timestamp), 'HH:mm:ss')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{violation.type}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{JSON.stringify(violation.details)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowLogs(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={showReport} onClose={() => setShowReport(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Proctoring Report</DialogTitle>
        <DialogContent>
          {selectedTest && (
            <ProctoringReport sessionId={selectedTest.test_id} candidateName={selectedTest.candidate_name} />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowReport(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CompletedTests;