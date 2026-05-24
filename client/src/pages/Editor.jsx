import CostPanel from "../components/editor/CostPanel";
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
  const [variants, setVariants] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [activeLayout, setActiveLayout] = useState(null);

  useEffect(() => {
    projectsApi
      .get(id)
      .then((p) => {
        setProject(p);
        if (p.layout?.generated) setActiveLayout(p.layout);
      })
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
      if (updated.layoutVariants?.length) {
        setVariants(updated.layoutVariants);
        setActiveIdx(0);
        setActiveLayout(updated.layoutVariants[0]);
      } else if (updated.layout) {
        setActiveLayout(updated.layout);
        setVariants([]);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const selectVariant = (idx) => {
    if (!variants[idx]) return;
    setActiveIdx(idx);
    setActiveLayout(variants[idx]);
  };

  if (loading) return (
    <div className="max-w-6xl mx-auto px-6 py-12 text-slate-500">Loading project...</div>
  );

  if (error && !project) return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <p className="text-red-600">{error}</p>
      <Link to="/dashboard" className="text-brand-600 mt-3 inline-block">← Dashboard</Link>
    </div>
  );

  if (!project) return null;

  const brief = project.brief || {};
  const plot = brief.plot || {};
  const plotW = plot.frontWidth || brief.plotWidth || 0;
  const plotL = plot.leftLength || brief.plotLength || 0;
  const plotUnit = plot.unit || "feet";
  const totalRooms = (brief.rooms || []).reduce((s, r) => s + (r.count || 0), 0);
  const displayLayout = activeLayout || project.layout;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <Link to="/dashboard" className="text-sm text-slate-500 hover:text-slate-700">
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">{project.name}</h1>
          <p className="text-sm text-slate-600">
            {brief.buildingType || "House"} · {plotW}×{plotL} {plotUnit} · {brief.floors || 1} floor
          </p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${
          project.status === "draft"
            ? "bg-slate-100 text-slate-600"
            : "bg-brand-100 text-brand-700"
        }`}>
          {project.status}
        </span>
      </div>

      {/* Layout variant selector */}
      {variants.length > 1 && (
        <div className="mb-4 flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3">
          <span className="text-sm font-semibold text-slate-700">Choose layout:</span>
          <div className="flex gap-2">
            {variants.map((v, i) => (
              <button
                key={i}
                onClick={() => selectVariant(i)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                  activeIdx === i
                    ? "bg-brand-500 text-white border-brand-500 shadow-sm"
                    : "bg-white text-slate-600 border-slate-300 hover:border-brand-400 hover:text-brand-600"
                }`}
              >
                {v.name || `Layout ${String.fromCharCode(65 + i)}`}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-400 ml-1">
            Each layout has a different room arrangement
          </span>
        </div>
      )}

      {/* 3-column editor */}
      <div className="grid grid-cols-12 gap-4">

        {/* Left: Brief */}
        <aside className="col-span-3 bg-white rounded-2xl border border-slate-200 p-5 space-y-4 h-fit">
          <div>
            <h2 className="font-semibold text-slate-900">Brief</h2>
            <p className="text-xs text-slate-500">Project requirements</p>
          </div>
          <dl className="text-sm space-y-2">
            <div className="flex justify-between">
              <dt className="text-slate-600">Plot</dt>
              <dd className="font-medium">{plotW}×{plotL} {plotUnit}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">Floors</dt>
              <dd className="font-medium">{brief.floors || 1}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">Rooms</dt>
              <dd className="font-medium">{totalRooms}</dd>
            </div>
            {brief.technical && (
              <div className="flex justify-between">
                <dt className="text-slate-600">Walls</dt>
                <dd className="font-medium">
                  {brief.technical.wallThicknessExt}" / {brief.technical.wallThicknessInt}"
                </dd>
              </div>
            )}
          </dl>

          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Rooms</p>
            <ul className="text-sm space-y-1">
              {(brief.rooms || []).map((r, idx) => (
                <li key={idx} className="flex justify-between text-slate-700">
                  <span className="capitalize">
                    {r.type}{r.size && r.size !== "default" ? ` (${r.size})` : ""}
                  </span>
                  <span className="text-slate-500">×{r.count}</span>
                </li>
              ))}
            </ul>
          </div>

          {brief.setbacks && (
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Setbacks</p>
              <div className="grid grid-cols-2 gap-1 text-xs text-slate-600">
                <span>Front: {brief.setbacks.front}ft</span>
                <span>Back: {brief.setbacks.back}ft</span>
                <span>Left: {brief.setbacks.left}ft</span>
                <span>Right: {brief.setbacks.right}ft</span>
              </div>
            </div>
          )}

          {displayLayout?.warnings?.length > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <p className="text-xs font-medium text-amber-800 mb-1">⚠ Warnings</p>
              {displayLayout.warnings.map((w, i) => (
                <p key={i} className="text-xs text-amber-700">{w}</p>
              ))}
            </div>
          )}

          <div className="pt-2 border-t border-slate-200">
            <Button
              variant="primary"
              className="w-full"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating
                ? "Generating 3 layouts..."
                : displayLayout?.generated
                ? "Regenerate"
                : "Generate Layout"}
            </Button>
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          </div>
        </aside>

        {/* Center: Canvas */}
        <section className="col-span-6 bg-white rounded-2xl border border-slate-200 min-h-[600px] overflow-hidden relative">
          {displayLayout?.generated ? (
            <FloorPlanCanvas layout={displayLayout} projectName={project.name} />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-3">
              <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center text-3xl">▢</div>
              <p className="font-medium text-slate-600">No layout yet</p>
              <p className="text-sm text-center max-w-xs">
                Click Generate Layout — you'll get 3 different arrangements to choose from.
              </p>
            </div>
          )}
        </section>

        {/* Right: Cost */}
        <CostPanel
          cost={project.cost}
          layoutGenerated={displayLayout?.generated}
        />
      </div>
    </div>
  );
}