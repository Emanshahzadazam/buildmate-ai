// client/src/App.jsx
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import Landing from "./pages/Landing";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./routes/ProtectedRoute";
import NewProject from "./pages/NewProject";
import Editor from "./pages/Editor";

export default function App() {
  return (
    <Routes>

      {/* Landing has its own navbar/footer baked in */}
      <Route path="/" element={<Landing />} />

      {/* All other pages share the app Navbar + Footer */}
      <Route
        path="*"
        element={
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute><Dashboard /></ProtectedRoute>
                  }
                />
                <Route
                  path="/projects/new"
                  element={
                    <ProtectedRoute><NewProject /></ProtectedRoute>
                  }
                />
                <Route
                  path="/projects/:id"
                  element={
                    <ProtectedRoute><Editor /></ProtectedRoute>
                  }
                />
                <Route
                  path="*"
                  element={
                    <div className="max-w-xl mx-auto px-6 py-20 text-center">
                      <h1 className="text-3xl font-bold text-slate-900">404</h1>
                      <p className="mt-2 text-slate-600">Page not found.</p>
                    </div>
                  }
                />
              </Routes>
            </main>
            <Footer />
          </div>
        }
      />
    </Routes>
  );
}