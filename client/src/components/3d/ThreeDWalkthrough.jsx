import { useEffect, useMemo, useState } from "react";

const TOUR_KEY = "buildmate-3d-walkthrough-complete-v4";

const steps = [
  {
    icon: "🏠",
    title: "Your 3D house model",
    body: "This is the generated 3D house built from your selected layout, including rooms, walls, floors, roof, doors, windows, and exterior space.",
    target: "[data-tour='scene']",
    accent: "#06B6D4",
  },
  {
    icon: "🛰️",
    title: "Orbit mode",
    body: "Use Orbit to inspect the house from outside. Drag to rotate around it and use the mouse wheel or trackpad to zoom in and out.",
    target: "[data-tour='mode-controls']",
    accent: "#7C3AED",
  },
  {
    icon: "🚶",
    title: "Walk mode",
    body: "Walk mode places you near the house entry so you can move more naturally. Use W, A, S, D or arrow keys to move, and drag to look around.",
    target: "[data-tour='mode-controls']",
    accent: "#F97316",
  },
  {
    icon: "🚪",
    title: "Corrected front entry",
    body: "The 3D viewer now prefers the front side from garage or entrance-related rooms first, so the tour starts from the more realistic front of the house.",
    target: "[data-tour='scene']",
    accent: "#22C55E",
  },
  {
    icon: "▶️",
    title: "Auto Tour mode",
    body: "Auto Tour starts outside, approaches the main entry, enters the house, and then visits important rooms one by one.",
    target: "[data-tour='tour-controls']",
    accent: "#14B8A6",
  },
  {
    icon: "🧱",
    title: "Visual and inspection controls",
    body: "Use these toggles for cutaway view, exploded floors, room labels, doors, windows, internal walls, furniture, and smoother collision behavior.",
    target: "[data-tour='visual-toggles']",
    accent: "#0EA5E9",
  },
  {
    icon: "📱",
    title: "Better page layout",
    body: "On smaller screens, some controls move below the viewer so the page feels more balanced and the 3D area gets more space.",
    target: "[data-tour='scene']",
    accent: "#A855F7",
  },
  {
    icon: "⌨️",
    title: "Quick control hints",
    body: "The chips at the bottom update depending on the mode, so users always see the right movement or tour hints.",
    target: "[data-tour='helper-chips']",
    accent: "#F59E0B",
  },
];

function getTargetRect(selector) {
  if (!selector || typeof document === "undefined") return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return rect;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export default function ThreeDWalkthrough() {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [rect, setRect] = useState(null);
  const [ready, setReady] = useState(false);

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  useEffect(() => {
    const completed = window.localStorage.getItem(TOUR_KEY) === "true";

    const timer = window.setTimeout(() => {
      setReady(true);
      if (!completed) setOpen(true);
    }, 500);

    const openHandler = () => {
      setStepIndex(0);
      setOpen(true);
    };

    window.addEventListener("buildmate:open-3d-guide", openHandler);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("buildmate:open-3d-guide", openHandler);
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    const update = () => {
      const next = getTargetRect(step.target);
      setRect(next);
    };

    update();
    const raf = window.requestAnimationFrame(update);

    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, stepIndex, step.target]);

  useEffect(() => {
    if (!open) return undefined;

    const onKey = (event) => {
      if (event.key === "Escape") finish(false);
      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") back();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const cardPosition = useMemo(() => {
    const width = typeof window !== "undefined" ? window.innerWidth : 1200;
    const height = typeof window !== "undefined" ? window.innerHeight : 800;
    const cardW = width < 560 ? width - 28 : 410;
    const cardH = 334;

    if (!rect || width < 760) {
      return {
        left: width < 560 ? 14 : 24,
        top: height - cardH - 20,
        width: cardW,
      };
    }

    const preferRight = rect.left + rect.width / 2 < width / 2;
    const left = preferRight ? rect.right + 18 : rect.left - cardW - 18;
    const top = clamp(rect.top + rect.height / 2 - cardH / 2, 18, height - cardH - 18);

    return {
      left: clamp(left, 18, width - cardW - 18),
      top,
      width: cardW,
    };
  }, [rect, stepIndex]);

  const highlightStyle = useMemo(() => {
    if (!rect) return { opacity: 0 };
    const pad = 10;
    return {
      opacity: 1,
      left: rect.left - pad,
      top: rect.top - pad,
      width: rect.width + pad * 2,
      height: rect.height + pad * 2,
      borderColor: step.accent,
      boxShadow: `0 0 0 9999px rgba(15,23,42,0.18), 0 0 0 4px ${step.accent}22, 0 0 32px ${step.accent}66`,
    };
  }, [rect, step.accent]);

  function markComplete() {
    window.localStorage.setItem(TOUR_KEY, "true");
  }

  function finish(forceComplete = true) {
    if (forceComplete || dontShowAgain) markComplete();
    setOpen(false);
  }

  function skip() {
    if (dontShowAgain) markComplete();
    setOpen(false);
  }

  function next() {
    if (isLast) {
      finish(true);
      return;
    }
    setStepIndex((i) => Math.min(steps.length - 1, i + 1));
  }

  function back() {
    setStepIndex((i) => Math.max(0, i - 1));
  }

  function startAgain() {
    setStepIndex(0);
    setDontShowAgain(false);
    setOpen(true);
  }

  if (!ready) return null;

  return (
    <>
      <style>{`
        .bm3d-tour-launcher {
          position: fixed;
          right: 22px;
          bottom: 22px;
          z-index: 80;
          border: 1px solid rgba(255,255,255,.62);
          background: linear-gradient(135deg, rgba(124,58,237,.94), rgba(6,182,212,.94));
          color: white;
          border-radius: 999px;
          padding: .66rem .95rem;
          font-family: inherit;
          font-size: .78rem;
          font-weight: 950;
          cursor: pointer;
          box-shadow: 0 18px 40px rgba(15,23,42,.22);
          backdrop-filter: blur(14px);
        }

        .bm3d-tour-highlight {
          position: fixed;
          z-index: 70;
          pointer-events: none;
          border: 2px solid #06B6D4;
          border-radius: 26px;
          transition: left .34s ease, top .34s ease, width .34s ease, height .34s ease, opacity .24s ease, box-shadow .34s ease;
        }

        .bm3d-tour-card {
          position: fixed;
          z-index: 75;
          border-radius: 28px;
          background: rgba(255,255,255,.93);
          border: 1px solid rgba(255,255,255,.72);
          box-shadow: 0 28px 90px rgba(15,23,42,.24), inset 0 1px 0 rgba(255,255,255,.9);
          backdrop-filter: blur(24px) saturate(180%);
          padding: 1rem;
          transition: left .34s ease, top .34s ease, transform .24s ease, opacity .24s ease;
          animation: bm3dTourIn .26s ease both;
        }

        @keyframes bm3dTourIn {
          from { opacity:0; transform: translateY(10px) scale(.98); }
          to { opacity:1; transform: translateY(0) scale(1); }
        }

        .bm3d-tour-icon {
          width: 42px;
          height: 42px;
          border-radius: 15px;
          display: grid;
          place-items: center;
          color: white;
          font-size: 1.15rem;
          box-shadow: 0 12px 26px rgba(15,23,42,.18);
          flex: 0 0 auto;
        }

        .bm3d-tour-progress {
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          gap: 5px;
          margin: .9rem 0 .8rem;
        }

        .bm3d-tour-dot {
          height: 5px;
          border-radius: 999px;
          background: rgba(148,163,184,.28);
          overflow: hidden;
        }

        .bm3d-tour-dot span {
          display: block;
          height: 100%;
          width: 0;
          background: linear-gradient(90deg,#7C3AED,#06B6D4);
          transition: width .28s ease;
        }

        .bm3d-tour-btn {
          border: none;
          border-radius: 999px;
          padding: .62rem .9rem;
          font-family: inherit;
          font-size: .78rem;
          font-weight: 950;
          cursor: pointer;
          transition: transform .18s ease, box-shadow .18s ease, opacity .18s ease;
        }

        .bm3d-tour-btn:hover { transform: translateY(-1px); }
        .bm3d-tour-btn:disabled { opacity: .45; cursor: not-allowed; transform: none; }
        .bm3d-tour-primary { color:white; background:linear-gradient(135deg,#7C3AED,#06B6D4); box-shadow:0 10px 24px rgba(124,58,237,.25); }
        .bm3d-tour-ghost { color:#475569; background:rgba(241,245,249,.86); border:1px solid rgba(148,163,184,.2); }
        .bm3d-tour-link { color:#64748B; background:transparent; padding:.62rem .2rem; }
        .bm3d-tour-check { display:flex; align-items:center; gap:.45rem; color:#64748B; font-size:.74rem; font-weight:800; cursor:pointer; user-select:none; }
        .bm3d-tour-check input { accent-color:#7C3AED; }

        @media (max-width: 760px) {
          .bm3d-tour-launcher { right: 14px; bottom: 14px; padding:.62rem .82rem; }
          .bm3d-tour-highlight { border-radius: 20px; }
          .bm3d-tour-card { border-radius: 24px; padding:.9rem; }
        }
      `}</style>

      {!open && (
        <button type="button" className="bm3d-tour-launcher" onClick={startAgain}>
          ✨ 3D Guide
        </button>
      )}

      {open && (
        <>
          <div className="bm3d-tour-highlight" style={highlightStyle} />
          <div className="bm3d-tour-card" style={cardPosition} role="dialog" aria-label="3D guided walkthrough">
            <div style={{ display: "flex", gap: ".8rem", alignItems: "flex-start" }}>
              <div className="bm3d-tour-icon" style={{ background: `linear-gradient(135deg,${step.accent},#7C3AED)` }}>
                {step.icon}
              </div>
              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    margin: "0 0 .15rem",
                    fontSize: ".68rem",
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                    color: step.accent,
                    fontWeight: 950,
                  }}
                >
                  Step {stepIndex + 1} of {steps.length}
                </p>
                <h3
                  style={{
                    margin: 0,
                    color: "#0f172a",
                    fontFamily: "'Syne',sans-serif",
                    fontSize: "1.08rem",
                    lineHeight: 1.15,
                    fontWeight: 950,
                    letterSpacing: "-.035em",
                  }}
                >
                  {step.title}
                </h3>
              </div>
            </div>

            <p style={{ margin: ".75rem 0 0", color: "#475569", fontSize: ".86rem", lineHeight: 1.65, fontWeight: 700 }}>
              {step.body}
            </p>

            <div className="bm3d-tour-progress" aria-hidden="true">
              {steps.map((_, i) => (
                <div className="bm3d-tour-dot" key={i}>
                  <span style={{ width: i <= stepIndex ? "100%" : "0%" }} />
                </div>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: ".7rem", flexWrap: "wrap" }}>
              <label className="bm3d-tour-check">
                <input type="checkbox" checked={dontShowAgain} onChange={(e) => setDontShowAgain(e.target.checked)} />
                Do not show again
              </label>

              <div style={{ display: "flex", gap: ".45rem", alignItems: "center", marginLeft: "auto" }}>
                <button type="button" className="bm3d-tour-btn bm3d-tour-link" onClick={skip}>
                  Skip
                </button>
                <button type="button" className="bm3d-tour-btn bm3d-tour-ghost" onClick={back} disabled={stepIndex === 0}>
                  Back
                </button>
                <button type="button" className="bm3d-tour-btn bm3d-tour-primary" onClick={next}>
                  {isLast ? "Got it" : "Next"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}