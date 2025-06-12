import { useNavigate } from "react-router-dom";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md space-y-4">
        <h1 className="text-2xl font-bold text-center">Proctoring App</h1>
        <button
          onClick={() => navigate("/admin")}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
        >
          Enter as Admin
        </button>
        <button
          onClick={() => navigate("/candidate")}
          className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
        >
          Enter as Candidate
        </button>
      </div>
    </div>
  );
}
