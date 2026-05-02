import FloorPlanCanvas from "../components/canvas/FloorPlanCanvas";
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { projectsApi } from "../lib/projectsApi";
import Button from "../components/ui/Button";

export default function Editor() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    projectsApi
      .get(id)
      .then(setProject)
      .catch((err) =>
        setError(err.response?.data?.message || "Failed to load project")
      )
      .finally(() => setLoading(false));
  }, [id]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");
    try {
      const updated = await projectsApi.generate(id);
      setProject(updated);
    } catch (err) {
      setError(err.response?.data?.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-12 text-slate-500">
        Loading project...
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-12">
        <p className="text-red-600">{error}</p>
        <Link to="/dashboard" className="text-brand-600 mt-3 inline-block">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  if (!project) return null;

  const totalRooms = project.brief.rooms.reduce((sum, r) => sum + r.count, 0);
  const plotArea = (project.brief.plotWidth * project.brief.plotLength).toFixed(1);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link
            to="/dashboard"
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            {project.name}
          </h1>
          <p className="text-sm text-slate-600 capitalize">
            {project.brief.buildingType} · {project.brief.plotWidth}×
            {project.brief.plotLength} m · {project.brief.floors} floor
            {project.brief.floors > 1 ? "s" : ""}
          </p>
        </div>
        <span
          className={`text-xs px-2 py-1 rounded-full ${project.status === "draft"
            ? "bg-slate-100 text-slate-600"
            : "bg-brand-100 text-brand-700"
            }`}
        >
          {project.status}
        </span>
      </div>

      {/* Three-column layout */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left: Brief panel */}
        <aside className="col-span-3 bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div>
            <h2 className="font-semibold text-slate-900">Brief</h2>
            <p className="text-xs text-slate-500">What you asked for</p>
          </div>

          <dl className="text-sm space-y-2">
            <div className="flex justify-between">
              <dt className="text-slate-600">Plot area</dt>
              <dd className="font-medium text-slate-900">{plotArea} m²</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">Total rooms</dt>
              <dd className="font-medium text-slate-900">{totalRooms}</dd>
            </div>
          </dl>

          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">
              Rooms
            </p>
            <ul className="text-sm space-y-1">
              {project.brief.rooms.map((r) => (
                <li
                  key={r.type}
                  className="flex justify-between text-slate-700"
                >
                  <span className="capitalize">{r.type}</span>
                  <span className="text-slate-500">×{r.count}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-2 border-t border-slate-200">
            <Button
              variant="primary"
              className="w-full"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating
                ? "Generating..."
                : project.layout?.generated
                  ? "Regenerate layout"
                  : "Generate layout"}
            </Button>
            {error && (
              <p className="mt-2 text-xs text-red-600">{error}</p>
            )}
          </div>
        </aside>

        {/* Center: Canvas placeholder */}
        <section className="col-span-6 bg-white rounded-2xl border border-slate-200 min-h-[600px] overflow-hidden relative">
          {project.layout?.generated ? (
            <FloorPlanCanvas layout={project.layout} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400 px-6">
              <div className="text-center">
                <div className="h-14 w-14 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl">
                  ▢
                </div>
                <p className="font-medium text-slate-600">No layout yet</p>
                <p className="text-sm mt-1">
                  Click Generate layout to create a 2D plan.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Right: Cost panel placeholder */}
        <aside className="col-span-3 bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900">Cost</h2>
          <p className="text-xs text-slate-500">Estimate based on layout</p>

          <div className="mt-5 text-center text-slate-400 py-12">
            <p className="text-sm">
              Cost panel<br />coming next session
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

