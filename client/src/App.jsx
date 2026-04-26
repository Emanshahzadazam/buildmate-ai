import { useState } from "react";
import axios from "axios";

const API_BASE = "http://localhost:5000/api";

function App() {
  const [status, setStatus] = useState("Not checked yet");
  const [loading, setLoading] = useState(false);

  const checkServer = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/health`);
      setStatus(`✅ ${res.data.message}`);
    } catch (err) {
      setStatus(`❌ Server unreachable: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold text-slate-900">BuildMate AI</h1>
        <p className="mt-2 text-slate-600">
          Frontend ↔ Backend connectivity test
        </p>

        <button
          onClick={checkServer}
          disabled={loading}
          className="mt-6 px-5 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {loading ? "Checking..." : "Check server"}
        </button>

        <p className="mt-4 text-sm text-slate-700">{status}</p>
      </div>
    </div>
  );
}

export default App;