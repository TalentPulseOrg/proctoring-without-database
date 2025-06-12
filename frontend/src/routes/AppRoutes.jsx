import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "../pages/Landing";
import AdminDashboard from "../pages/AdminDashboard";
import CandidateDashboard from "../pages/CandidateDashboard";
import TestForm from "../components/TestForm";
import PrerequisitesCheck from "../components/PrerequisitesCheck";
import FaceVerification from "../components/FaceVerification";
import ExamForm from "../components/ExamForm";
import TestInterface from "../components/TestInterface";
import TestResults from "../components/TestResults";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/:sessionId" element={<AdminDashboard />} />
      <Route path="/candidate" element={<CandidateDashboard />} />
      <Route path="/test-form" element={<TestForm />} />
      <Route path="/prerequisites" element={<PrerequisitesCheck />} />
      <Route path="/face-verification" element={<FaceVerification />} />
      <Route path="/test-interface" element={<TestInterface />} />
      <Route path="/test-results" element={<TestResults />} />
    </Routes>
  );
}
