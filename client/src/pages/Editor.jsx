import CostPanel from "../components/editor/CostPanel";
import FloorPlanCanvas from "../components/canvas/FloorPlanCanvas";
import ElevationCanvas from "../components/elevation/ElevationCanvas";
import { useEffect, useRef, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { projectsApi } from "../lib/projectsApi";
import Button from "../components/ui/Button";

const VIEW_TABS = [
  { key:"floor", label:"Floor Plan", icon:"🏠", desc:"Room layout & dimensions" },
  { key:"front", label:"Front",      icon:"⬆",  desc:"Main entrance elevation" },
  { key:"rear",  label:"Rear",       icon:"⬇",  desc:"Back facade & garden" },
  { key:"left",  label:"Left",       icon:"⬅",  desc:"Left side elevation" },
  { key:"right", label:"Right",      icon:"➡",  desc:"Right side elevation" },
  { key:"roof",  label:"Roof Plan",  icon:"🔺", desc:"Top view & roof structure" },
];

const glass = {
  background: "rgba(255,255,255,0.82)",
  backdropFilter: "blur(20px) saturate(180%)",
  WebkitBackdropFilter: "blur(20px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.45)",
  borderRadius: "20px",
  boxShadow: "0 16px 48px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.7)",
};

// ── Draw a view onto a canvas element ────────────────────────────────────────
async function drawViewToCanvas(canvas, layout, viewKey, projectName) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const { generateElevation, drawElevationOnCanvas, generateRoofView, drawRoofOnCanvas } =
    await import("../lib/elevationGenerator");

  if (viewKey === "roof") {
    const roof = generateRoofView(layout);
    drawRoofOnCanvas(ctx, roof, canvas.width, canvas.height);
  } else {
    const elev = generateElevation(layout, viewKey);
    drawElevationOnCanvas(ctx, elev, canvas.width, canvas.height);
  }
}

// ── Single elevation thumbnail ────────────────────────────────────────────────
function ElevThumb({ layout, viewKey, label, onDownload }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !layout?.generated) return;
    const canvas = canvasRef.current;
    canvas.width  = 700;
    canvas.height = 420;
    drawViewToCanvas(canvas, layout, viewKey, label);
  }, [layout, viewKey]);

  return (
    <div style={{ borderRadius:16, overflow:"hidden", border:"1px solid rgba(200,215,225,0.5)", background:"#F8F9FA", position:"relative" }}>
      <canvas
        ref={canvasRef}
        style={{ width:"100%", height:"auto", display:"block" }}
      />
      <div style={{ padding:"0.6rem 0.85rem", background:"rgba(255,255,255,0.95)", borderTop:"1px solid rgba(200,215,225,0.3)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <p style={{ fontSize:"0.78rem", fontWeight:700, color:"#1a252f", margin:0 }}>{label}</p>
        <button onClick={() => onDownload(canvasRef.current, label)}
          style={{ padding:"0.25rem 0.7rem", borderRadius:999, fontSize:"0.7rem", fontWeight:700, border:"1px solid rgba(30,136,229,0.3)", background:"rgba(30,136,229,0.07)", color:"#1E88E5", cursor:"pointer", fontFamily:"inherit" }}>
          ⬇ PNG
        </button>
      </div>
    </div>
  );
}

// ── Floor plan thumbnail (uses hidden canvas rendered via FloorPlanCanvas logic) ──
function FloorThumb({ layout, projectName, onDownload }) {
  const canvasRef = useRef(null);

  // We render the floor plan into a hidden canvas for download
  const handleDownload = () => {
    const canvas = document.createElement("canvas");
    canvas.width  = 1400;
    canvas.height = 900;
    const ctx = canvas.getContext("2d");
    import("../components/canvas/FloorPlanCanvas").then(({ default: _ }) => {
      // Use the existing FloorPlanCanvas drawing logic via its own draw function
      // We find the rendered canvas from the DOM and copy it
      const existing = document.querySelector(".floor-plan-main-canvas");
      if (existing) {
        ctx.drawImage(existing, 0, 0, 1400, 900);
        const link = document.createElement("a");
        link.download = `${projectName}-floor-plan.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      }
    });
  };

  return (
    <div style={{ borderRadius:16, overflow:"hidden", border:"1px solid rgba(200,215,225,0.5)", background:"#F8F9FA", position:"relative" }}>
      <div style={{ height:300 }}>
        <FloorPlanCanvas layout={layout} projectName={projectName} />
      </div>
      <div style={{ padding:"0.6rem 0.85rem", background:"rgba(255,255,255,0.95)", borderTop:"1px solid rgba(200,215,225,0.3)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <p style={{ fontSize:"0.78rem", fontWeight:700, color:"#1a252f", margin:0 }}>Floor Plan</p>
        <button onClick={handleDownload}
          style={{ padding:"0.25rem 0.7rem", borderRadius:999, fontSize:"0.7rem", fontWeight:700, border:"1px solid rgba(30,136,229,0.3)", background:"rgba(30,136,229,0.07)", color:"#1E88E5", cursor:"pointer", fontFamily:"inherit" }}>
          ⬇ PNG
        </button>
      </div>
    </div>
  );
}

// ── Summary Modal ─────────────────────────────────────────────────────────────
function SummaryModal({ project, layout, onClose }) {
  const brief      = project?.brief || {};
  const plot       = brief.plot || {};
  const plotW      = plot.frontWidth  || brief.plotWidth  || 0;
  const plotL      = plot.leftLength  || brief.plotLength || 0;
  const unit       = plot.unit || "feet";
  const totalRooms = (brief.rooms || []).reduce((s, r) => s + (r.count || 0), 0);

  // Refs for each elevation canvas (for PDF)
  const elevRefs = {
    front: useRef(null),
    rear:  useRef(null),
    left:  useRef(null),
    right: useRef(null),
    roof:  useRef(null),
  };

  const handleDownloadPNG = (canvas, label) => {
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${project.name}-${label}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleDownloadPDF = async () => {
    // Build a single tall canvas with all views stacked, then convert to PDF via data URL
    const W = 1200, sectionH = 700, gap = 40, padding = 60;
    const sections = ["front","rear","left","right","roof"];
    const totalH = padding + sectionH * (sections.length + 1) + gap * (sections.length + 1) + padding;

    const masterCanvas = document.createElement("canvas");
    masterCanvas.width  = W;
    masterCanvas.height = totalH;
    const mCtx = masterCanvas.getContext("2d");

    // White background
    mCtx.fillStyle = "#FFFFFF";
    mCtx.fillRect(0, 0, W, totalH);

    // Header
    mCtx.fillStyle = "#1a252f";
    mCtx.font = "bold 28px Arial";
    mCtx.textAlign = "center";
    mCtx.fillText(`${project.name} — Project Drawing Package`, W/2, 48);
    mCtx.fillStyle = "#546E7A";
    mCtx.font = "16px Arial";
    mCtx.fillText(`Plot: ${plotW}×${plotL} ${unit} · Floors: ${brief.floors||1} · Rooms: ${totalRooms}`, W/2, 76);

    // Separator
    mCtx.strokeStyle = "#E2E8F0"; mCtx.lineWidth = 1;
    mCtx.beginPath(); mCtx.moveTo(padding, 90); mCtx.lineTo(W-padding, 90); mCtx.stroke();

    const { generateElevation, drawElevationOnCanvas, generateRoofView, drawRoofOnCanvas } =
      await import("../lib/elevationGenerator");

    let y = padding + 60;

    // Floor plan section label
    mCtx.fillStyle = "#1a252f"; mCtx.font = "bold 16px Arial"; mCtx.textAlign = "left";
    mCtx.fillText("SECTION A — Floor Plan", padding, y);
    y += 20;

    // Floor plan — draw from DOM canvas if available
    const floorDom = document.querySelector(".floor-plan-main-canvas");
    if (floorDom) {
      mCtx.drawImage(floorDom, padding, y, W - padding*2, sectionH);
    } else {
      mCtx.fillStyle = "#F0F4FF"; mCtx.fillRect(padding, y, W-padding*2, sectionH);
      mCtx.fillStyle = "#90A4AE"; mCtx.font = "16px Arial"; mCtx.textAlign="center";
      mCtx.fillText("Floor Plan — open the Floor Plan tab first", W/2, y + sectionH/2);
    }
    y += sectionH + gap;

    // Elevation sections
    const sectionLabels = { front:"Front Elevation", rear:"Rear Elevation", left:"Left Side Elevation", right:"Right Side Elevation", roof:"Roof Plan" };
    for (const [i, dir] of sections.entries()) {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width  = W - padding*2;
      tempCanvas.height = sectionH;
      const tCtx = tempCanvas.getContext("2d");
      tCtx.fillStyle = "#FAFAFA"; tCtx.fillRect(0, 0, tempCanvas.width, sectionH);

      if (dir === "roof") {
        const roof = generateRoofView(layout);
        drawRoofOnCanvas(tCtx, roof, tempCanvas.width, sectionH);
      } else {
        const elev = generateElevation(layout, dir);
        drawElevationOnCanvas(tCtx, elev, tempCanvas.width, sectionH);
      }

      // Section label
      mCtx.fillStyle = "#1a252f"; mCtx.font = "bold 16px Arial"; mCtx.textAlign="left";
      mCtx.fillText(`SECTION ${String.fromCharCode(66+i)} — ${sectionLabels[dir]}`, padding, y);
      y += 20;
      mCtx.drawImage(tempCanvas, padding, y);
      y += sectionH + gap;
    }

    // Footer
    mCtx.fillStyle = "#90A4AE"; mCtx.font = "12px Arial"; mCtx.textAlign="center";
    mCtx.fillText(`Generated by BuildMate AI · ${new Date().toLocaleDateString()}`, W/2, totalH - 20);

    // Convert to PDF via jsPDF-style approach using data URL
    // Since we can't import jsPDF, we open in new window for save-as-PDF
    const dataUrl = masterCanvas.toDataURL("image/png", 1.0);
    const win = window.open("", "_blank");
    win.document.write(`
      <html>
        <head>
          <title>${project.name} — Building Plans</title>
          <style>
            body { margin:0; padding:0; background:#fff; }
            img { max-width:100%; display:block; }
            .header { padding:20px; font-family:Arial; color:#1a252f; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center; }
            @media print { .no-print { display:none!important; } body { margin:0; } }
          </style>
        </head>
        <body>
          <div class="header no-print">
            <b>${project.name} — Building Plans</b>
            <button onclick="window.print()" style="padding:8px 20px;background:#1a252f;color:white;border:none;border-radius:8px;cursor:pointer;font-size:14px;">
              🖨 Save as PDF
            </button>
          </div>
          <img src="${dataUrl}" />
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div
      style={{ position:"fixed",inset:0,zIndex:9999,background:"rgba(10,20,30,0.75)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem" }}
      onClick={e => { if (e.target===e.currentTarget) onClose(); }}
    >
      <style>{`@keyframes slideUp { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} } .sum-modal{animation:slideUp 0.3s ease-out;}`}</style>

      <div className="sum-modal" style={{
        width:"min(96vw,1060px)",
        maxHeight:"92vh",
        overflowY:"auto",
        background:"rgba(255,255,255,0.97)",
        border:"1px solid rgba(255,255,255,0.6)",
        borderRadius:28,
        boxShadow:"0 40px 120px rgba(0,0,0,0.3)",
      }}>

        {/* Header */}
        <div style={{ padding:"1.4rem 1.75rem", borderBottom:"1px solid rgba(0,0,0,0.07)", display:"flex", justifyContent:"space-between", alignItems:"center", background:"linear-gradient(135deg,rgba(30,136,229,0.06),rgba(0,188,212,0.04))", borderRadius:"28px 28px 0 0", position:"sticky", top:0, zIndex:10, backdropFilter:"blur(12px)" }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:"0.6rem", marginBottom:"0.2rem" }}>
              <div style={{ width:30,height:30,borderRadius:9,background:"linear-gradient(135deg,#1E88E5,#00BCD4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.9rem" }}>📋</div>
              <h2 style={{ fontFamily:"'Syne',sans-serif",fontSize:"1.2rem",fontWeight:800,color:"#1a252f",letterSpacing:"-0.03em",margin:0 }}>
                Project Summary
              </h2>
            </div>
            <p style={{ fontSize:"0.78rem",color:"#546E7A",margin:0 }}>
              {project.name} · {plotW}×{plotL} {unit} · {brief.floors||1} Floor{brief.floors>1?"s":""} · {totalRooms} Rooms
            </p>
          </div>
          <div style={{ display:"flex",gap:"0.6rem",alignItems:"center" }}>
            <button onClick={handleDownloadPDF}
              style={{ display:"inline-flex",alignItems:"center",gap:"0.4rem",padding:"0.55rem 1.25rem",borderRadius:999,fontSize:"0.8rem",fontWeight:800,border:"none",background:"linear-gradient(135deg,#1a252f,#0f1419)",color:"white",cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 14px rgba(26,37,47,0.28)" }}>
              ⬇ Download PDF
            </button>
            <button onClick={onClose}
              style={{ width:32,height:32,borderRadius:"50%",border:"1.5px solid rgba(0,0,0,0.12)",background:"rgba(255,255,255,0.9)",cursor:"pointer",fontSize:"0.9rem",display:"flex",alignItems:"center",justifyContent:"center" }}>
              ✕
            </button>
          </div>
        </div>

        <div style={{ padding:"1.5rem 1.75rem" }}>

          {/* Info strip */}
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:"0.55rem",marginBottom:"1.5rem" }}>
            {[
              { icon:"📐", label:"Plot",    value:`${plotW}×${plotL} ${unit}` },
              { icon:"🏢", label:"Floors",  value: brief.floors||1 },
              { icon:"🛏️", label:"Rooms",  value: totalRooms },
              { icon:"🍳", label:"Kitchen", value: brief.kitchenType||"closed" },
              { icon:"🚗", label:"Garage",  value: brief.hasGarage?"Yes":"No" },
              { icon:"📏", label:"Walls",   value: brief.technical?`${brief.technical.wallThicknessExt}"ext`:"Std" },
            ].map(item => (
              <div key={item.label} style={{ padding:"0.65rem 0.85rem",borderRadius:12,background:"rgba(30,136,229,0.05)",border:"1px solid rgba(30,136,229,0.12)" }}>
                <p style={{ fontSize:"0.62rem",textTransform:"uppercase",letterSpacing:"0.07em",color:"#90A4AE",fontWeight:700,marginBottom:"0.15rem" }}>{item.icon} {item.label}</p>
                <p style={{ fontSize:"0.88rem",fontWeight:800,color:"#1a252f",textTransform:"capitalize",margin:0 }}>{item.value}</p>
              </div>
            ))}
          </div>

          {/* SECTION A — Floor Plan */}
          <div style={{ marginBottom:"1.5rem" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.7rem" }}>
              <h3 style={{ fontFamily:"'Syne',sans-serif",fontSize:"0.9rem",fontWeight:800,color:"#1a252f",margin:0,display:"flex",alignItems:"center",gap:"0.4rem" }}>
                <span style={{ padding:"0.2rem 0.65rem",borderRadius:6,background:"rgba(30,136,229,0.1)",color:"#1E88E5",fontSize:"0.68rem",fontWeight:800,letterSpacing:"0.05em" }}>A</span>
                Floor Plan
              </h3>
              <span style={{ fontSize:"0.72rem",color:"#90A4AE" }}>Room layout · areas · dimensions</span>
            </div>
            <FloorThumb layout={layout} projectName={project.name} onDownload={handleDownloadPNG} />
            {(brief.rooms||[]).length > 0 && (
              <div style={{ marginTop:"0.65rem",display:"flex",flexWrap:"wrap",gap:"0.35rem" }}>
                {brief.rooms.map((r,i) => (
                  <span key={i} style={{ padding:"0.2rem 0.65rem",borderRadius:999,fontSize:"0.7rem",fontWeight:700,background:"rgba(30,136,229,0.07)",border:"1px solid rgba(30,136,229,0.15)",color:"#1E88E5",textTransform:"capitalize" }}>
                    {r.type}{r.size&&r.size!=="default"?` (${r.size})`:""} ×{r.count}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* SECTION B — Exterior Elevations (2×2 grid, proper height) */}
          <div style={{ marginBottom:"1.5rem" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.7rem" }}>
              <h3 style={{ fontFamily:"'Syne',sans-serif",fontSize:"0.9rem",fontWeight:800,color:"#1a252f",margin:0,display:"flex",alignItems:"center",gap:"0.4rem" }}>
                <span style={{ padding:"0.2rem 0.65rem",borderRadius:6,background:"rgba(255,152,0,0.1)",color:"#FF9800",fontSize:"0.68rem",fontWeight:800,letterSpacing:"0.05em" }}>B</span>
                Exterior Elevations
              </h3>
              <span style={{ fontSize:"0.72rem",color:"#90A4AE" }}>Front · Rear · Left · Right</span>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.85rem" }}>
              {["front","rear","left","right"].map(dir => (
                <ElevThumb
                  key={dir}
                  layout={layout}
                  viewKey={dir}
                  label={`${dir.charAt(0).toUpperCase()+dir.slice(1)} Elevation`}
                  onDownload={handleDownloadPNG}
                />
              ))}
            </div>
          </div>

          {/* SECTION C — Roof Plan (full width) */}
          <div style={{ marginBottom:"1.5rem" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.7rem" }}>
              <h3 style={{ fontFamily:"'Syne',sans-serif",fontSize:"0.9rem",fontWeight:800,color:"#1a252f",margin:0,display:"flex",alignItems:"center",gap:"0.4rem" }}>
                <span style={{ padding:"0.2rem 0.65rem",borderRadius:6,background:"rgba(123,31,162,0.1)",color:"#7B1FA2",fontSize:"0.68rem",fontWeight:800,letterSpacing:"0.05em" }}>C</span>
                Roof Plan
              </h3>
            </div>
            <ElevThumb
              layout={layout}
              viewKey="roof"
              label="Roof Plan"
              onDownload={handleDownloadPNG}
            />
          </div>

          {/* Bottom CTA */}
          <div style={{ borderTop:"1px solid rgba(0,0,0,0.07)",paddingTop:"1.1rem",display:"flex",justifyContent:"flex-end",gap:"0.65rem" }}>
            <button onClick={onClose}
              style={{ padding:"0.6rem 1.5rem",borderRadius:999,fontSize:"0.82rem",fontWeight:700,border:"1.5px solid rgba(200,215,225,0.6)",background:"rgba(255,255,255,0.7)",color:"#546E7A",cursor:"pointer",fontFamily:"inherit" }}>
              Close
            </button>
            <button onClick={handleDownloadPDF}
              style={{ display:"inline-flex",alignItems:"center",gap:"0.5rem",padding:"0.6rem 1.75rem",borderRadius:999,fontSize:"0.85rem",fontWeight:800,border:"none",background:"linear-gradient(135deg,#1a252f,#0f1419)",color:"white",cursor:"pointer",fontFamily:"inherit",boxShadow:"0 6px 18px rgba(26,37,47,0.28)" }}>
              ⬇ Download Full PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Editor ────────────────────────────────────────────────────────────────────
export default function Editor() {
  const { id } = useParams();
  const [project,      setProject]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [generating,   setGenerating]   = useState(false);
  const [error,        setError]        = useState("");
  const [variants,     setVariants]     = useState([]);
  const [activeIdx,    setActiveIdx]    = useState(0);
  const [activeLayout, setActiveLayout] = useState(null);
  const [view,         setView]         = useState("floor");
  const [showSummary,  setShowSummary]  = useState(false);

  useEffect(() => {
    projectsApi.get(id)
      .then((p) => {
        setProject(p);
        setVariants(Array.isArray(p.layoutVariants) ? p.layoutVariants : []);
        const idx = Number.isInteger(p.selectedVariantIndex) ? p.selectedVariantIndex : 0;
        setActiveIdx(idx);
        if (Array.isArray(p.layoutVariants) && p.layoutVariants[idx]) {
          setActiveLayout(p.layoutVariants[idx]);
        } else if (p.layout?.generated) {
          setActiveLayout(p.layout);
        }
      })
      .catch((err) => setError(err.response?.data?.message || "Failed to load project"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleGenerate = async () => {
    setGenerating(true); setError("");
    try {
      const updated = await projectsApi.generate(id);
      setProject(updated);
      const nextVariants = Array.isArray(updated.layoutVariants) ? updated.layoutVariants : [];
      setVariants(nextVariants);
      const idx = Number.isInteger(updated.selectedVariantIndex) ? updated.selectedVariantIndex : 0;
      setActiveIdx(idx);
      if (nextVariants[idx]) { setActiveLayout(nextVariants[idx]); }
      else if (updated.layout) { setActiveLayout(updated.layout); }
    } catch (err) {
      setError(err.response?.data?.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const selectVariant = async (idx) => {
    if (!variants[idx]) return;
    try {
      const updated = await projectsApi.selectLayout(id, idx);
      setProject(updated);
      setVariants(Array.isArray(updated.layoutVariants) ? updated.layoutVariants : []);
      setActiveIdx(idx);
      setActiveLayout(variants[idx]);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to select layout");
    }
  };

  const brief      = project?.brief || {};
  const plot       = brief.plot    || {};
  const plotW      = plot.frontWidth || brief.plotWidth  || 0;
  const plotL      = plot.leftLength || brief.plotLength || 0;
  const plotUnit   = plot.unit      || "feet";
  const totalRooms = (brief.rooms || []).reduce((s, r) => s + (r.count || 0), 0);

  const displayLayout = useMemo(() => {
    if (activeLayout) return activeLayout;
    if (project?.layout?.generated) return project.layout;
    return null;
  }, [activeLayout, project]);

  const activeTab = VIEW_TABS.find(t => t.key === view);

  if (loading) return (
    <div style={{ minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg,#E8F5E9 0%,#FFF8E1 50%,#FFE0B2 100%)" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:48,height:48,borderRadius:12,background:"linear-gradient(135deg,#1E88E5,#00BCD4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.4rem",margin:"0 auto 1rem" }}>📐</div>
        <p style={{ color:"#546E7A",fontWeight:600,fontSize:"0.9rem" }}>Loading project...</p>
      </div>
    </div>
  );

  if (error && !project) return (
    <div style={{ minHeight:"100vh",padding:"8rem 3%",background:"linear-gradient(135deg,#E8F5E9 0%,#FFF8E1 50%,#FFE0B2 100%)" }}>
      <div style={{ ...glass,padding:"2rem",maxWidth:480,margin:"0 auto",textAlign:"center" }}>
        <p style={{ color:"#dc2626",fontWeight:600,marginBottom:"1rem" }}>{error}</p>
        <Link to="/dashboard" style={{ color:"#1E88E5",fontWeight:700,textDecoration:"none",fontSize:"0.9rem" }}>← Back to Dashboard</Link>
      </div>
    </div>
  );

  if (!project) return null;

  return (
    <div style={{
      minHeight:"100vh", paddingTop:"110px", paddingBottom:"4rem",
      paddingLeft:"2%", paddingRight:"2%",
      background:
        "radial-gradient(circle at 12% 18%,rgba(232,245,233,0.9) 0%,transparent 45%)," +
        "radial-gradient(circle at 88% 78%,rgba(255,224,178,0.85) 0%,transparent 45%)," +
        "linear-gradient(135deg,#E8F5E9 0%,#FFF8E1 50%,#FFE0B2 100%)",
      position:"relative",
    }}>
      <div style={{ position:"fixed",inset:0,pointerEvents:"none",zIndex:0,opacity:0.03,backgroundImage:"linear-gradient(rgba(30,136,229,1) 1px,transparent 1px),linear-gradient(90deg,rgba(30,136,229,1) 1px,transparent 1px)",backgroundSize:"50px 50px" }} />

      <div style={{ position:"relative",zIndex:1,maxWidth:"1500px",margin:"0 auto" }}>

        {/* Top bar */}
        <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:"1.25rem",flexWrap:"wrap",gap:"0.75rem" }}>
          <div>
            <Link to="/dashboard" style={{ fontSize:"0.82rem",color:"#546E7A",fontWeight:600,textDecoration:"none",display:"inline-flex",alignItems:"center",gap:"0.3rem",marginBottom:"0.4rem" }}>← Dashboard</Link>
            <h1 style={{ fontFamily:"'Syne',sans-serif",fontSize:"clamp(1.3rem,2.5vw,1.8rem)",fontWeight:800,letterSpacing:"-0.04em",color:"#1a252f",lineHeight:1.1 }}>{project.name}</h1>
            <p style={{ fontSize:"0.82rem",color:"#546E7A",fontWeight:500,marginTop:"0.2rem",textTransform:"capitalize" }}>
              {brief.buildingType||"House"} · {plotW}×{plotL} {plotUnit} · {brief.floors||1} floor{brief.floors>1?"s":""}
            </p>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:"0.75rem" }}>
            {displayLayout?.generated && (
              <button onClick={() => setShowSummary(true)}
                style={{ display:"inline-flex",alignItems:"center",gap:"0.5rem",padding:"0.6rem 1.25rem",borderRadius:999,fontSize:"0.82rem",fontWeight:800,border:"1.5px solid rgba(30,136,229,0.3)",background:"rgba(30,136,229,0.08)",color:"#1E88E5",cursor:"pointer",fontFamily:"inherit",transition:"all 0.25s" }}
                onMouseEnter={e=>{e.currentTarget.style.background="rgba(30,136,229,0.15)";e.currentTarget.style.transform="translateY(-1px)";}}
                onMouseLeave={e=>{e.currentTarget.style.background="rgba(30,136,229,0.08)";e.currentTarget.style.transform="translateY(0)";}}>
                📋 Full Report & Download
              </button>
            )}
            <span style={{
              fontSize:"0.68rem",fontWeight:800,letterSpacing:"0.06em",textTransform:"uppercase",
              padding:"0.3rem 0.85rem",borderRadius:"999px",
              background: project.status==="draft"?"rgba(255,152,0,0.12)":"rgba(76,175,80,0.1)",
              border: project.status==="draft"?"1px solid rgba(255,152,0,0.3)":"1px solid rgba(76,175,80,0.3)",
              color: project.status==="draft"?"#FF9800":"#388E3C",
            }}>{project.status}</span>
          </div>
        </div>

        {/* Variant selector */}
        {variants.length > 1 && (
          <div style={{ ...glass,padding:"1rem 1.25rem",marginBottom:"1rem",display:"flex",alignItems:"center",gap:"1rem",flexWrap:"wrap" }}>
            <span style={{ fontSize:"0.82rem",fontWeight:700,color:"#1a252f" }}>Choose layout:</span>
            <div style={{ display:"flex",gap:"0.5rem",flexWrap:"wrap" }}>
              {variants.map((v, i) => (
                <button key={i} onClick={() => selectVariant(i)}
                  style={{ padding:"0.4rem 1rem",borderRadius:999,fontSize:"0.82rem",fontWeight:700,border:"1.5px solid",cursor:"pointer",fontFamily:"inherit",transition:"all 0.25s",
                    background: activeIdx===i?"linear-gradient(135deg,#1E88E5,#00BCD4)":"rgba(255,255,255,0.6)",
                    borderColor: activeIdx===i?"transparent":"rgba(200,215,225,0.6)",
                    color: activeIdx===i?"white":"#546E7A",
                    boxShadow: activeIdx===i?"0 4px 12px rgba(30,136,229,0.3)":"none" }}>
                  {v.variantName||v.name||`Layout ${String.fromCharCode(65+i)}`}
                </button>
              ))}
            </div>
            <span style={{ fontSize:"0.72rem",color:"#90A4AE" }}>Each layout uses a different architectural zoning strategy</span>
          </div>
        )}

        {/* View tabs */}
        <div style={{ marginBottom:"1rem" }}>
          <div style={{ display:"flex",alignItems:"center",gap:"0.5rem",flexWrap:"wrap" }}>
            {VIEW_TABS.map((tab) => (
              <button key={tab.key} onClick={() => setView(tab.key)} title={tab.desc}
                style={{ display:"flex",alignItems:"center",gap:"0.35rem",padding:"0.45rem 1rem",borderRadius:999,fontSize:"0.8rem",fontWeight:700,border:"1.5px solid",cursor:"pointer",fontFamily:"inherit",transition:"all 0.25s",
                  background: view===tab.key?"linear-gradient(135deg,#1a252f,#0f1419)":"rgba(255,255,255,0.7)",
                  borderColor: view===tab.key?"transparent":"rgba(200,215,225,0.5)",
                  color: view===tab.key?"white":"#546E7A",
                  boxShadow: view===tab.key?"0 4px 12px rgba(26,37,47,0.25)":"none" }}>
                <span style={{ fontSize:"0.85rem" }}>{tab.icon}</span>{tab.label}
              </button>
            ))}
          </div>
          {activeTab && (
            <div style={{ marginTop:"0.45rem",display:"flex",alignItems:"center",gap:"0.5rem" }}>
              <span style={{ fontSize:"0.74rem",color:"#90A4AE" }}>
                {activeTab.icon} <strong style={{ color:"#546E7A" }}>{activeTab.label}</strong> — {activeTab.desc}
              </span>
              {displayLayout?.generated && (
                <span style={{ fontSize:"0.7rem",color:"#90A4AE" }}>
                  · <span style={{ color:"#1E88E5",cursor:"pointer",fontWeight:600 }} onClick={() => setShowSummary(true)}>See all views & download →</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* 3-col grid */}
        <div className="grid grid-cols-12 gap-4">
          <aside className="col-span-3" style={{ ...glass,padding:"1.5rem",height:"fit-content" }}>
            <div style={{ display:"flex",alignItems:"center",gap:"0.5rem",marginBottom:"1rem" }}>
              <div style={{ width:26,height:26,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,background:"linear-gradient(135deg,#1E88E5,#00BCD4)",boxShadow:"0 3px 8px rgba(30,136,229,0.28)" }}>📋</div>
              <div>
                <div style={{ fontFamily:"'Syne',sans-serif",fontSize:"0.92rem",fontWeight:800,color:"#1a252f" }}>Brief</div>
                <div style={{ fontSize:"0.7rem",color:"#546E7A" }}>Project requirements</div>
              </div>
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:"0.5rem",marginBottom:"1.25rem" }}>
              {[
                { label:"Plot",   value:`${plotW}×${plotL} ${plotUnit}` },
                { label:"Floors", value: brief.floors||1 },
                { label:"Rooms",  value: totalRooms },
                ...(brief.technical?[{ label:"Walls", value:`${brief.technical.wallThicknessExt}" / ${brief.technical.wallThicknessInt}"` }]:[]),
              ].map(row => (
                <div key={row.label} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.45rem 0.75rem",borderRadius:10,background:"rgba(255,255,255,0.55)",border:"1px solid rgba(200,215,225,0.3)" }}>
                  <span style={{ fontSize:"0.78rem",color:"#546E7A",fontWeight:600 }}>{row.label}</span>
                  <span style={{ fontSize:"0.78rem",fontWeight:800,color:"#1a252f" }}>{row.value}</span>
                </div>
              ))}
            </div>
            {(brief.rooms||[]).length > 0 && (
              <div style={{ marginBottom:"1.25rem" }}>
                <p style={{ fontSize:"0.68rem",textTransform:"uppercase",letterSpacing:"0.07em",color:"#90A4AE",fontWeight:700,marginBottom:"0.6rem" }}>Rooms</p>
                <div style={{ display:"flex",flexDirection:"column",gap:"0.35rem" }}>
                  {brief.rooms.map((r,idx) => (
                    <div key={idx} style={{ display:"flex",justifyContent:"space-between",fontSize:"0.78rem" }}>
                      <span style={{ color:"#546E7A",textTransform:"capitalize" }}>{r.type}{r.size&&r.size!=="default"?` (${r.size})`:""}</span>
                      <span style={{ fontWeight:800,color:"#1a252f" }}>×{r.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {brief.setbacks && (
              <div style={{ marginBottom:"1.25rem" }}>
                <p style={{ fontSize:"0.68rem",textTransform:"uppercase",letterSpacing:"0.07em",color:"#90A4AE",fontWeight:700,marginBottom:"0.6rem" }}>Setbacks</p>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.35rem" }}>
                  {["front","back","left","right"].map(d => (
                    <div key={d} style={{ fontSize:"0.72rem",color:"#546E7A",padding:"0.3rem 0.6rem",borderRadius:8,background:"rgba(255,255,255,0.5)",border:"1px solid rgba(200,215,225,0.3)",textTransform:"capitalize" }}>
                      {d}: <strong>{brief.setbacks[d]}ft</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {displayLayout?.warnings?.length > 0 && (
              <div style={{ padding:"0.75rem",borderRadius:12,background:"rgba(255,152,0,0.08)",border:"1px solid rgba(255,152,0,0.25)",marginBottom:"1rem" }}>
                <p style={{ fontSize:"0.72rem",fontWeight:700,color:"#FF9800",marginBottom:"0.35rem" }}>⚠ Warnings</p>
                {displayLayout.warnings.map((w,i) => <p key={i} style={{ fontSize:"0.72rem",color:"#b45309" }}>{w}</p>)}
              </div>
            )}
            <div style={{ borderTop:"1px solid rgba(0,0,0,0.06)",paddingTop:"1rem",display:"flex",flexDirection:"column",gap:"0.5rem" }}>
              <Button variant="primary" className="w-full" onClick={handleGenerate} disabled={generating}>
                {generating?"Generating 3 layouts...":displayLayout?.generated?"↻ Regenerate":"⚡ Generate Layout"}
              </Button>
              {displayLayout?.generated && (
                <button onClick={() => setShowSummary(true)}
                  style={{ width:"100%",padding:"0.55rem",borderRadius:999,fontSize:"0.8rem",fontWeight:700,border:"1.5px solid rgba(30,136,229,0.3)",background:"rgba(30,136,229,0.06)",color:"#1E88E5",cursor:"pointer",fontFamily:"inherit" }}>
                  📋 Full Report & Download
                </button>
              )}
              {error && <p style={{ fontSize:"0.75rem",color:"#dc2626",fontWeight:500 }}>{error}</p>}
            </div>
          </aside>

          <section className="col-span-6" style={{ ...glass,minHeight:"600px",overflow:"hidden",position:"relative" }}>
            {displayLayout?.generated ? (
              view==="floor"
                ? <FloorPlanCanvas layout={displayLayout} projectName={project.name} />
                : <ElevationCanvas layout={displayLayout} direction={view} />
            ) : (
              <div style={{ position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"1rem" }}>
                <div style={{ width:72,height:72,borderRadius:20,background:"rgba(30,136,229,0.08)",border:"2px dashed rgba(30,136,229,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"2rem" }}>▢</div>
                <p style={{ fontWeight:700,color:"#1a252f",fontSize:"0.95rem" }}>No layout yet</p>
                <p style={{ fontSize:"0.82rem",color:"#546E7A",textAlign:"center",maxWidth:260,lineHeight:1.6 }}>Click <strong>Generate Layout</strong> — you will get 3 different arrangements.</p>
              </div>
            )}
          </section>

          <CostPanel cost={project.cost} layoutGenerated={displayLayout?.generated} />
        </div>
      </div>

      {showSummary && displayLayout?.generated && (
        <SummaryModal project={project} layout={displayLayout} onClose={() => setShowSummary(false)} />
      )}
    </div>
  );
}