import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { projectsApi } from "../lib/projectsApi";
import Button from "../components/ui/Button";

export default function Dashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    projectsApi
      .list()
      .then(setProjects)
      .catch((err) =>
        setError(err.response?.data?.message || "Failed to load projects")
      )
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Delete this project? This cannot be undone.")) return;
    try {
      await projectsApi.remove(id);
      setProjects(projects.filter((p) => p.id !== id));
    } catch (err) {
      alert(err.response?.data?.message || "Delete failed");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Welcome, {user?.name?.split(" ")[0] || "there"}
          </h1>
          <p className="mt-1 text-slate-600">
            {projects.length === 0
              ? "Start your first project."
              : `${projects.length} project${projects.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <Link to="/projects/new">
          <Button variant="primary">+ New project</Button>
        </Link>
      </div>

      {loading && (
        <p className="mt-10 text-slate-500">Loading your projects...</p>
      )}

      {error && <p className="mt-10 text-red-600">{error}</p>}

      {!loading && !error && projects.length === 0 && (
        <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <div className="h-12 w-12 rounded-xl bg-brand-100 text-brand-600 mx-auto mb-4 flex items-center justify-center text-xl font-bold">
            +
          </div>
          <h2 className="text-lg font-semibold text-slate-900">
            No projects yet
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Create your first project to get started.
          </p>
          <Link to="/projects/new" className="inline-block mt-5">
            <Button variant="primary">Create project</Button>
          </Link>
        </div>
      )}

      {!loading && projects.length > 0 && (
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">{p.name}</h3>
                  <p className="text-xs text-slate-500 capitalize">
                    {p.brief?.buildingType} · {p.brief?.plotWidth}×
                    {p.brief?.plotLength} m
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    p.status === "draft"
                      ? "bg-slate-100 text-slate-600"
                      : "bg-brand-100 text-brand-700"
                  }`}
                >
                  {p.status}
                </span>
              </div>

              {p.description && (
                <p className="mt-2 text-sm text-slate-600 line-clamp-2">
                  {p.description}
                </p>
              )}

              <div className="mt-4 flex items-center justify-between">
                <Link
                  to={`/projects/${p.id}`}
                  className="text-sm font-medium text-brand-600 hover:underline"
                >
                  Open →
                </Link>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="text-sm text-slate-500 hover:text-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}