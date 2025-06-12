import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TestForm from "../components/TestForm";
import TestInterface from "../components/TestInterface";
import FaceVerification from "../components/FaceVerification";
import WebcamMonitor from "../components/WebcamMonitor";

export default function CandidateDashboard() {
  const [testData, setTestData] = useState(null);
  const [showTest, setShowTest] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [userId, setUserId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Get user ID from localStorage or your auth system
    const storedUserId = localStorage.getItem('userId');
    setUserId(storedUserId);
  }, []);

  const handleGenerateTest = async (formData) => {
    if (!isVerified) {
      // If not verified, redirect to face verification
      navigate('/face-verification');
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch("http://localhost:8000/api/tests/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          skill: formData.skill,
          num_questions: formData.numQuestions,
          duration: formData.duration,
        }),
      });

      // First check if response is OK
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to generate test");
      }

      // Then parse successful response
      const data = await response.json();

      // Validate response structure
      if (!data?.questions?.length) {
        throw new Error("Invalid test format received from server");
      }

      setTestData({
        ...formData,
        questions: data.questions,
        testId: data.testId, // Make sure backend returns a testId
      });
      setShowTest(true);
    } catch (err) {
      console.error("Test generation error:", err);
      setError(err.message || "Failed to generate test. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        setLoading(false);
        setError("Request timed out. Please try again.");
      }, 30000); // 30 seconds timeout
      return () => clearTimeout(timeout);
    }
  }, [loading]);

  // Handle verification success
  const handleVerificationSuccess = () => {
    setIsVerified(true);
    navigate('/candidate');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Candidate Dashboard
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">Generating your test...</p>
            </div>
          ) : showTest ? (
            <>
              <TestInterface testData={testData} duration={testData.duration} />
              {userId && testData?.testId && (
                <WebcamMonitor testId={testData.testId} userId={userId} />
              )}
            </>
          ) : (
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Create New Test</h2>
              {!isVerified && (
                <div className="mb-4 p-4 bg-yellow-100 text-yellow-700 rounded-lg">
                  Please complete face verification before starting the test.
                </div>
              )}
              <TestForm onSubmit={handleGenerateTest} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
