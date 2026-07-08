import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { projectsApi } from "../lib/projectsApi";
import ThreeDViewer from "../components/3d/ThreeDViewer";

const glass = {
  background: "rgba(255,255,255,0.84)",
  backdropFilter: "blur(20px) saturate(180%)",
  WebkitBackdropFilter: "blur(20px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.45)",
  borderRadius: "24px",
  boxShadow: "0 18px 60px rgba(15,23,42,0.12), inset 0 1px 0 rgba(255,255,255,0.75)",
};

export default function ThreeDView() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");

    projectsApi
      .get(id)
      .then((p) => {
        if (!alive) return;
        setProject(p);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err.response?.data?.message || "Failed to load project 3D view");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [id]);

  const layout = useMemo(() => {
    if (!project) return null;

    const variants = Array.isArray(project.layoutVariants) ? project.layoutVariants : [];
    const idx = Number.isInteger(project.selectedVariantIndex) ? project.selectedVariantIndex : 0;

    if (variants[idx]?.generated) return variants[idx];
    if (project.layout?.generated) return project.layout;
    return null;
  }, [project]);

  const brief = project?.brief || {};
  const plot = brief.plot || {};
  const plotW = plot.frontWidth || brief.plotWidth || layout?.plot?.width || layout?.dimensions?.plotWidth || 0;
  const plotL = plot.leftLength || brief.plotLength || layout?.plot?.length || layout?.dimensions?.plotLength || 0;
  const unit = plot.unit || "feet";

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          paddingTop: 120,
          background: "linear-gradient(135deg,#E8F5E9 0%,#FFF8E1 50%,#FFE0B2 100%)",
        }}
      >
        <div style={{ ...glass, maxWidth: 460, margin: "0 auto", padding: "2rem", textAlign: "center" }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 16,
              margin: "0 auto 1rem",
              display: "grid",
              placeItems: "center",
              background: "linear-gradient(135deg,#7C3AED,#06B6D4)",
              color: "white",
              fontSize: "1.6rem",
            }}
          >
            🏗️
          </div>
          <p style={{ color: "#546E7A", fontWeight: 700 }}>Loading 3D model...</p>
        </div>
      </div>
    );
  }

  if (error && !project) {
    return (
      <div
        style={{
          minHeight: "100vh",
          padding: "8rem 3%",
          background: "linear-gradient(135deg,#E8F5E9 0%,#FFF8E1 50%,#FFE0B2 100%)",
        }}
      >
        <div style={{ ...glass, padding: "2rem", maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
          <p style={{ color: "#dc2626", fontWeight: 700, marginBottom: "1rem" }}>{error}</p>
          <Link to="/dashboard" style={{ color: "#1E88E5", fontWeight: 800, textDecoration: "none" }}>
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        paddingTop: "104px",
        paddingBottom: "2rem",
        paddingLeft: "2%",
        paddingRight: "2%",
        background:
          "radial-gradient(circle at 15% 16%,rgba(124,58,237,0.20) 0%,transparent 34%)," +
          "radial-gradient(circle at 86% 72%,rgba(6,182,212,0.22) 0%,transparent 38%)," +
          "linear-gradient(135deg,#E8F5E9 0%,#FFF8E1 50%,#FFE0B2 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          opacity: 0.055,
          backgroundImage:
            "linear-gradient(rgba(30,136,229,1) 1px,transparent 1px),linear-gradient(90deg,rgba(30,136,229,1) 1px,transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1700, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "1rem",
            flexWrap: "wrap",
            marginBottom: "1rem",
          }}
        >
          <div>
            <Link
              to={`/projects/${id}`}
              style={{
                fontSize: "0.84rem",
                color: "#546E7A",
                fontWeight: 700,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                marginBottom: "0.45rem",
              }}
            >
              ← Back to Editor
            </Link>

            <h1
              style={{
                fontFamily: "'Syne',sans-serif",
                fontSize: "clamp(1.4rem,3vw,2.1rem)",
                lineHeight: 1.05,
                letterSpacing: "-0.05em",
                color: "#111827",
                fontWeight: 900,
                margin: 0,
              }}
            >
              {project?.name || "Project"} — 3D House View
            </h1>

            <p
              style={{
                marginTop: "0.35rem",
                fontSize: "0.88rem",
                color: "#546E7A",
                fontWeight: 600,
                textTransform: "capitalize",
              }}
            >
              {brief.buildingType || "House"} · {plotW}×{plotL} {unit} · {brief.floors || 1} floor
              {brief.floors > 1 ? "s" : ""}
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.65rem", alignItems: "center", flexWrap: "wrap" }}>
            <Link
              to={`/projects/${id}`}
              style={{
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.45rem",
                padding: "0.65rem 1.15rem",
                borderRadius: 999,
                fontSize: "0.84rem",
                fontWeight: 850,
                background: "rgba(255,255,255,0.78)",
                border: "1px solid rgba(148,163,184,0.36)",
                color: "#334155",
              }}
            >
              📐 2D Drawings
            </Link>
          </div>
        </div>

        {layout?.generated ? (
          <ThreeDViewer project={project} layout={layout} />
        ) : (
          <div style={{ ...glass, minHeight: "62vh", display: "grid", placeItems: "center", padding: "2rem" }}>
            <div style={{ textAlign: "center", maxWidth: 520 }}>
              <div
                style={{
                  width: 82,
                  height: 82,
                  borderRadius: 24,
                  margin: "0 auto 1rem",
                  display: "grid",
                  placeItems: "center",
                  background: "rgba(30,136,229,0.08)",
                  border: "2px dashed rgba(30,136,229,0.28)",
                  fontSize: "2.2rem",
                }}
              >
                🏗️
              </div>

              <h2
                style={{
                  fontFamily: "'Syne',sans-serif",
                  fontSize: "1.35rem",
                  fontWeight: 900,
                  color: "#111827",
                  marginBottom: "0.5rem",
                }}
              >
                No generated layout yet
              </h2>

              <p style={{ color: "#546E7A", lineHeight: 1.7, fontWeight: 600, marginBottom: "1.2rem" }}>
                Generate the floor plan first. The 3D view is created from the selected generated layout: rooms, walls,
                openings, plot, buildable area, floors, and floor height.
              </p>

              <Link
                to={`/projects/${id}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  padding: "0.75rem 1.4rem",
                  borderRadius: 999,
                  textDecoration: "none",
                  fontWeight: 850,
                  color: "white",
                  background: "linear-gradient(135deg,#1E88E5,#00BCD4)",
                  boxShadow: "0 10px 24px rgba(30,136,229,0.28)",
                }}
              >
                ⚡ Go Generate Layout
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}