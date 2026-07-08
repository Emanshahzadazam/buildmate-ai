import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "../landing.css";

gsap.registerPlugin(ScrollTrigger);

/* ── Icons ── */
const IconFloorPlan = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="1.5" />
    <path d="M3 9.5h18M9.5 9.5V21M15 3v6.5" />
  </svg>
);
const IconBlueprint = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 19.5 19.5 4.5M4.5 19.5h5.2M4.5 19.5v-5.2M14.3 4.5h5.2v5.2" />
    <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
  </svg>
);
const IconCube = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3 20 7.5v9L12 21 4 16.5v-9Z" />
    <path d="M12 12v9M12 12 4 7.5M12 12l8-4.5" />
  </svg>
);
const IconCost = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8.5" cy="8.5" r="5" />
    <path d="M8.5 6v5M6.8 7.2c0-.9.8-1.5 1.7-1.5s1.7.5 1.7 1.3c0 1.6-3.4 1-3.4 2.6 0 .8.8 1.4 1.7 1.4s1.7-.6 1.7-1.5" />
    <path d="M14.5 11c2.6.6 4.5 2 4.5 3.7 0 2.3-3.4 4.3-7.5 4.3s-7.5-2-7.5-4.3c0-.9.5-1.7 1.4-2.4" />
  </svg>
);
const IconPrompt = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 5.5h16v10H10l-4 3.5v-3.5H4Z" />
    <path d="M8 9.5h8M8 12.5h5" />
  </svg>
);

/* ── Magnetic button micro-interaction ── */
function useMagnetic(ref, strength = 0.35) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      const relX = e.clientX - (rect.left + rect.width / 2);
      const relY = e.clientY - (rect.top + rect.height / 2);
      gsap.to(el, { x: relX * strength, y: relY * strength, duration: 0.4, ease: "power3.out" });
    };
    const onLeave = () => gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1,0.4)" });
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [ref, strength]);
}

/* ── Helper: animate stroked line-art "drawing itself" in ── */
function drawIn(container, opts = {}) {
  if (!container) return;
  const els = container.querySelectorAll(".l-draw");
  els.forEach((el) => {
    let len = 300;
    try { len = el.getTotalLength(); } catch (e) { /* not a path-like element */ }
    gsap.set(el, { strokeDasharray: len, strokeDashoffset: len });
  });
  gsap.to(els, { strokeDashoffset: 0, duration: opts.duration || 1.2, ease: "power2.out", stagger: opts.stagger || 0.03, delay: opts.delay || 0.1 });
}

/* ── FLOOR PLAN — color-zoned rooms with labels + area, like the real generator ── */
function FloorPlanVisual() {
  const ref = useRef(null);
  useEffect(() => {
    drawIn(ref.current, { duration: 1.1, stagger: 0.035 });
    gsap.fromTo(ref.current.querySelectorAll(".l-fp-room"), { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.5, stagger: 0.06, delay: 0.45, ease: "power2.out" });
    gsap.fromTo(ref.current.querySelectorAll(".l-fp-label, .l-fp-sqft"), { opacity: 0, y: 4 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.04, delay: 0.85 });
  }, []);
  return (
    <div className="l-fp-wrap" ref={ref}>
      <div className="l-fp-chip">Layout — Open Courtyard</div>
      <svg viewBox="0 0 480 360" className="l-fp-svg">
        <defs>
          <pattern id="fpGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M20 0H0V20" fill="none" stroke="rgba(30,136,229,0.12)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="480" height="360" fill="url(#fpGrid)" />

        {/* plot boundary */}
        <rect x="26" y="18" width="428" height="314" fill="none" stroke="#e05252" strokeWidth="1" strokeDasharray="5 4" opacity="0.55" />
        <text x="240" y="13" textAnchor="middle" className="l-fp-dim">139'-11"</text>

        {/* room fills */}
        <g className="l-fp-room"><rect x="42" y="42" width="396" height="96" fill="#DCEEFB" /></g>
        <g className="l-fp-room"><rect x="42" y="138" width="116" height="90" fill="#EEF1F3" /></g>
        <g className="l-fp-room"><rect x="158" y="138" width="164" height="90" fill="#DCF3E3" /></g>
        <g className="l-fp-room"><rect x="222" y="150" width="40" height="60" fill="#C6E8D4" /></g>
        <g className="l-fp-room"><rect x="322" y="138" width="116" height="90" fill="#FCE7D2" /></g>
        <g className="l-fp-room"><rect x="42" y="228" width="216" height="44" fill="#DCEEFB" /></g>
        <g className="l-fp-room"><rect x="258" y="228" width="180" height="44" fill="#E4F1FB" /></g>
        <g className="l-fp-room"><rect x="42" y="272" width="216" height="44" fill="#DCEEFB" /></g>
        <g className="l-fp-room"><rect x="258" y="272" width="180" height="44" fill="#E4F1FB" /></g>

        {/* outer + partition walls */}
        <rect className="l-draw" x="42" y="42" width="396" height="274" fill="none" stroke="var(--primary-blue)" strokeWidth="4" strokeLinejoin="round" />
        <line className="l-draw" x1="42" y1="138" x2="438" y2="138" stroke="var(--primary-blue)" strokeWidth="2.4" />
        <line className="l-draw" x1="42" y1="228" x2="438" y2="228" stroke="var(--primary-blue)" strokeWidth="2.4" />
        <line className="l-draw" x1="42" y1="272" x2="438" y2="272" stroke="var(--primary-blue)" strokeWidth="1.6" />
        <line className="l-draw" x1="158" y1="138" x2="158" y2="228" stroke="var(--primary-blue)" strokeWidth="2.4" />
        <line className="l-draw" x1="322" y1="138" x2="322" y2="228" stroke="var(--primary-blue)" strokeWidth="2.4" />
        <line className="l-draw" x1="258" y1="228" x2="258" y2="316" stroke="var(--primary-blue)" strokeWidth="2.4" />

        {/* door swings */}
        <path className="l-draw" d="M200 138 A34 34 0 0 1 166 172" fill="none" stroke="var(--accent-orange)" strokeWidth="1.5" />
        <path className="l-draw" d="M258 250 A22 22 0 0 1 236 272" fill="none" stroke="var(--accent-orange)" strokeWidth="1.5" />
        <path className="l-draw" d="M120 316 A26 26 0 0 1 146 290" fill="none" stroke="var(--accent-orange)" strokeWidth="1.5" />

        {/* labels + areas */}
        <text x="240" y="86" textAnchor="middle" className="l-fp-label">DRAWING ROOM</text>
        <text x="240" y="100" textAnchor="middle" className="l-fp-sqft">820 sqft</text>

        <text x="100" y="180" textAnchor="middle" className="l-fp-label">KITCHEN</text>
        <text x="100" y="194" textAnchor="middle" className="l-fp-sqft">210 sqft</text>

        <text x="242" y="146" textAnchor="middle" className="l-fp-label" style={{ fontSize: 8 }}>FAMILY LOUNGE</text>
        <text x="242" y="222" textAnchor="middle" className="l-fp-sqft">260 sqft</text>
        <text x="242" y="183" textAnchor="middle" className="l-fp-label" style={{ fontSize: 7 }}>STAIRS</text>

        <text x="380" y="180" textAnchor="middle" className="l-fp-label">DINING ROOM</text>
        <text x="380" y="194" textAnchor="middle" className="l-fp-sqft">230 sqft</text>

        <text x="150" y="248" textAnchor="middle" className="l-fp-label">MASTER BEDROOM</text>
        <text x="150" y="262" textAnchor="middle" className="l-fp-sqft">310 sqft</text>
        <text x="348" y="253" textAnchor="middle" className="l-fp-label" style={{ fontSize: 8 }}>BATHROOM 1</text>

        <text x="150" y="292" textAnchor="middle" className="l-fp-label">BEDROOM 2</text>
        <text x="150" y="306" textAnchor="middle" className="l-fp-sqft">280 sqft</text>
        <text x="348" y="297" textAnchor="middle" className="l-fp-label" style={{ fontSize: 8 }}>BATHROOM 2</text>

        <g transform="translate(408,58)">
          <circle r="16" fill="rgba(255,255,255,0.75)" stroke="var(--primary-blue)" strokeWidth="1" />
          <path d="M0 -10 L4.5 3.5 L0 0 L-4.5 3.5 Z" fill="var(--accent-orange)" />
          <text y="-21" textAnchor="middle" className="l-fp-north">N</text>
        </g>
      </svg>
      <div className="l-fp-legend"><span>▪ Door</span><span>— Window</span></div>
    </div>
  );
}

/* ── 2D DIAGRAMS — front elevation, roof plan, side elevation ── */
function DiagramsVisual() {
  const ref = useRef(null);
  useEffect(() => {
    drawIn(ref.current, { duration: 1, stagger: 0.02 });
  }, []);
  return (
    <div className="l-diag-strip" ref={ref}>
      <div className="l-diag-panel">
        <svg viewBox="0 0 160 200" className="l-diag-svg">
          <rect className="l-draw" x="20" y="70" width="120" height="110" fill="none" stroke="var(--primary-blue)" strokeWidth="2.2" />
          <polygon className="l-draw" points="20,70 80,25 140,70" fill="none" stroke="var(--primary-blue)" strokeWidth="2.2" />
          <rect className="l-draw" x="35" y="95" width="24" height="30" fill="none" stroke="var(--accent-teal)" strokeWidth="1.4" />
          <rect className="l-draw" x="101" y="95" width="24" height="30" fill="none" stroke="var(--accent-teal)" strokeWidth="1.4" />
          <rect className="l-draw" x="68" y="140" width="24" height="40" fill="none" stroke="var(--accent-orange)" strokeWidth="1.4" />
          <line className="l-draw" x1="10" y1="180" x2="150" y2="180" stroke="var(--medium-text)" strokeWidth="1.4" />
        </svg>
        <span className="l-diag-label">Front Elevation</span>
      </div>
      <div className="l-diag-panel">
        <svg viewBox="0 0 160 200" className="l-diag-svg">
          <rect className="l-draw" x="20" y="30" width="120" height="140" fill="none" stroke="var(--primary-blue)" strokeWidth="2.2" />
          <line className="l-draw" x1="20" y1="30" x2="50" y2="60" stroke="var(--accent-orange)" strokeWidth="1.4" />
          <line className="l-draw" x1="140" y1="30" x2="110" y2="60" stroke="var(--accent-orange)" strokeWidth="1.4" />
          <line className="l-draw" x1="20" y1="170" x2="50" y2="140" stroke="var(--accent-orange)" strokeWidth="1.4" />
          <line className="l-draw" x1="140" y1="170" x2="110" y2="140" stroke="var(--accent-orange)" strokeWidth="1.4" />
          <rect className="l-draw" x="50" y="60" width="60" height="80" fill="none" stroke="var(--primary-blue)" strokeWidth="1.6" />
          <line className="l-draw" x1="80" y1="60" x2="80" y2="140" stroke="var(--primary-blue)" strokeWidth="1" strokeDasharray="3 2" />
        </svg>
        <span className="l-diag-label">Roof Plan</span>
      </div>
      <div className="l-diag-panel">
        <svg viewBox="0 0 160 200" className="l-diag-svg">
          <rect className="l-draw" x="30" y="80" width="100" height="100" fill="none" stroke="var(--primary-blue)" strokeWidth="2.2" />
          <path className="l-draw" d="M30 80 L80 40 L130 80" fill="none" stroke="var(--primary-blue)" strokeWidth="2.2" />
          <rect className="l-draw" x="55" y="105" width="20" height="26" fill="none" stroke="var(--accent-teal)" strokeWidth="1.4" />
          <rect className="l-draw" x="90" y="140" width="20" height="40" fill="none" stroke="var(--accent-orange)" strokeWidth="1.4" />
          <line className="l-draw" x1="20" y1="180" x2="140" y2="180" stroke="var(--medium-text)" strokeWidth="1.4" />
        </svg>
        <span className="l-diag-label">Side Elevation</span>
      </div>
    </div>
  );
}

/* ── COST ESTIMATE — category breakdown + itemized line items, matching the real cost engine ── */
const COST_CATEGORIES = [
  { label: "Structure", value: 11245295 },
  { label: "Finishes", value: 7185983 },
  { label: "Doors & Windows", value: 215000 },
  { label: "Fixtures", value: 528000 },
];
const COST_TOTAL = COST_CATEGORIES.reduce((s, i) => s + i.value, 0);
const LINE_ITEMS = [
  { label: "Brick wall (9-inch, exterior)", value: 8190797, formula: "468 m² × Rs 17,500" },
  { label: "Brick wall (4.5-inch, interior)", value: 3054498, formula: "278 m² × Rs 11,000" },
];

function CostVisual() {
  const wrapRef = useRef(null);
  const totalRef = useRef(null);
  useEffect(() => {
    const bars = wrapRef.current.querySelectorAll(".l-cost-bar-fill");
    const nums = wrapRef.current.querySelectorAll(".l-cost-cat-num");
    bars.forEach((bar, i) => {
      const pct = parseFloat(bar.dataset.pct);
      gsap.fromTo(bar, { width: "0%" }, { width: pct + "%", duration: 1, ease: "power2.out", delay: 0.2 + i * 0.1 });
    });
    nums.forEach((num, i) => {
      const target = parseInt(num.dataset.value, 10);
      const obj = { v: 0 };
      gsap.to(obj, {
        v: target, duration: 1, ease: "power2.out", delay: 0.2 + i * 0.1,
        onUpdate: () => { num.textContent = "Rs " + Math.round(obj.v).toLocaleString(); },
      });
    });
    if (totalRef.current) {
      const obj = { v: 0 };
      gsap.to(obj, {
        v: COST_TOTAL, duration: 1.4, ease: "power2.out", delay: 0.65,
        onUpdate: () => { totalRef.current.textContent = "Rs " + Math.round(obj.v).toLocaleString(); },
      });
    }
    gsap.fromTo(wrapRef.current.querySelectorAll(".l-cost-line-item"), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.12, delay: 1.15, ease: "power2.out" });
  }, []);

  return (
    <div className="l-cost-visual-wrap" ref={wrapRef}>
      <div className="l-cost-header">
        <span className="l-cost-header-icon"><IconCost /></span>
        <div>
          <div className="l-cost-header-title">Cost Estimate</div>
          <div className="l-cost-header-sub">PKR · approximate</div>
        </div>
      </div>

      <div className="l-cost-total-block">
        <span className="l-cost-total-label">Total</span>
        <span className="l-cost-total-num" ref={totalRef}>Rs 0</span>
      </div>

      <div className="l-cost-cats">
        {COST_CATEGORIES.map((c) => {
          const pct = (c.value / COST_TOTAL) * 100;
          return (
            <div className="l-cost-cat-row" key={c.label}>
              <div className="l-cost-cat-top">
                <span>{c.label}</span>
                <span className="l-cost-cat-num" data-value={c.value}>Rs 0</span>
              </div>
              <div className="l-cost-bar-track"><div className="l-cost-bar-fill" data-pct={pct.toFixed(1)}></div></div>
            </div>
          );
        })}
      </div>

      <div className="l-cost-lineitems-label">Line items (11) ▾</div>
      <div className="l-cost-lineitems">
        {LINE_ITEMS.map((li) => (
          <div className="l-cost-line-item" key={li.label}>
            <div className="l-cost-line-top">
              <span>{li.label}</span>
              <span className="l-cost-line-value">Rs {li.value.toLocaleString()}</span>
            </div>
            <div className="l-cost-line-formula">{li.formula}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 3D MODEL — orbit/walk/tour viewer with live stats, matching the real WebGL viewer ── */
function ThreeDVisual() {
  const wrapRef = useRef(null);
  const groupRef = useRef(null);

  useEffect(() => {
    gsap.fromTo(groupRef.current, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.8, ease: "power2.out" });
  }, []);

  const handleMove = (e) => {
    const rect = wrapRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    gsap.to(groupRef.current, { rotateY: px * 22, rotateX: -py * 16, duration: 0.6, ease: "power3.out" });
  };
  const handleLeave = () => gsap.to(groupRef.current, { rotateY: 0, rotateX: 0, duration: 0.8, ease: "elastic.out(1,0.5)" });

  return (
    <div className="l-threed-visual" ref={wrapRef} onMouseMove={handleMove} onMouseLeave={handleLeave}>
      <div className="l-threed-grid"></div>
      <div className="l-threed-content" ref={groupRef}>
        <svg viewBox="0 0 280 260" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ width: "clamp(170px,20vw,240px)", height: "auto" }}>
          <ellipse cx="140" cy="250" rx="90" ry="9" fill="rgba(0,0,0,0.28)" />
          <polygon points="210,60 248,36 248,210 210,230" fill="rgba(0,188,212,0.12)" stroke="rgba(0,188,212,0.55)" strokeWidth="1.2" />
          <polygon points="72,60 110,36 248,36 210,60" fill="rgba(30,136,229,0.1)" stroke="rgba(30,136,229,0.45)" strokeWidth="1.2" />
          <rect x="72" y="60" width="138" height="170" fill="rgba(30,136,229,0.18)" stroke="rgba(30,136,229,0.85)" strokeWidth="1.5" />
          <polygon points="141,10 210,60 72,60" fill="rgba(0,188,212,0.32)" stroke="rgba(0,188,212,0.9)" strokeWidth="1.5" />
          <line x1="72" y1="60" x2="210" y2="60" stroke="rgba(0,188,212,0.5)" strokeWidth="0.8" />
          <rect x="170" y="18" width="14" height="26" rx="1" fill="rgba(30,136,229,0.3)" stroke="rgba(30,136,229,0.7)" strokeWidth="1" />
          <rect x="168" y="14" width="18" height="6" rx="1" fill="rgba(30,136,229,0.5)" stroke="rgba(30,136,229,0.85)" strokeWidth="1" />
          <rect x="86" y="80" width="28" height="26" rx="2" fill="rgba(255,152,0,0.55)" stroke="rgba(255,152,0,0.95)" strokeWidth="1.2" />
          <line x1="100" y1="80" x2="100" y2="106" stroke="rgba(255,152,0,0.6)" strokeWidth="0.8" />
          <line x1="86" y1="93" x2="114" y2="93" stroke="rgba(255,152,0,0.6)" strokeWidth="0.8" />
          <rect x="127" y="80" width="28" height="26" rx="2" fill="rgba(255,152,0,0.55)" stroke="rgba(255,152,0,0.95)" strokeWidth="1.2" />
          <line x1="141" y1="80" x2="141" y2="106" stroke="rgba(255,152,0,0.6)" strokeWidth="0.8" />
          <line x1="127" y1="93" x2="155" y2="93" stroke="rgba(255,152,0,0.6)" strokeWidth="0.8" />
          <rect x="168" y="80" width="28" height="26" rx="2" fill="rgba(255,152,0,0.55)" stroke="rgba(255,152,0,0.95)" strokeWidth="1.2" />
          <line x1="182" y1="80" x2="182" y2="106" stroke="rgba(255,152,0,0.6)" strokeWidth="0.8" />
          <line x1="168" y1="93" x2="196" y2="93" stroke="rgba(255,152,0,0.6)" strokeWidth="0.8" />
          <rect x="86" y="122" width="28" height="26" rx="2" fill="rgba(255,152,0,0.32)" stroke="rgba(255,152,0,0.65)" strokeWidth="1" />
          <line x1="100" y1="122" x2="100" y2="148" stroke="rgba(255,152,0,0.35)" strokeWidth="0.7" />
          <line x1="86" y1="135" x2="114" y2="135" stroke="rgba(255,152,0,0.35)" strokeWidth="0.7" />
          <rect x="168" y="122" width="28" height="26" rx="2" fill="rgba(255,152,0,0.32)" stroke="rgba(255,152,0,0.65)" strokeWidth="1" />
          <line x1="182" y1="122" x2="182" y2="148" stroke="rgba(255,152,0,0.35)" strokeWidth="0.7" />
          <line x1="168" y1="135" x2="196" y2="135" stroke="rgba(255,152,0,0.35)" strokeWidth="0.7" />
          <rect x="118" y="162" width="46" height="68" rx="3" fill="rgba(30,136,229,0.38)" stroke="rgba(30,136,229,0.9)" strokeWidth="1.5" />
          <path d="M118,168 Q141,155 164,168" fill="none" stroke="rgba(30,136,229,0.7)" strokeWidth="1" />
          <circle cx="158" cy="197" r="2.5" fill="rgba(255,152,0,0.9)" />
          <line x1="127" y1="175" x2="127" y2="228" stroke="rgba(30,136,229,0.3)" strokeWidth="0.7" />
          <line x1="155" y1="175" x2="155" y2="228" stroke="rgba(30,136,229,0.3)" strokeWidth="0.7" />
          <rect x="112" y="228" width="58" height="7" rx="1" fill="rgba(30,136,229,0.22)" stroke="rgba(30,136,229,0.5)" strokeWidth="1" />
          <rect x="118" y="235" width="46" height="6" rx="1" fill="rgba(30,136,229,0.15)" stroke="rgba(30,136,229,0.35)" strokeWidth="0.8" />
          <line x1="58" y1="60" x2="58" y2="230" stroke="rgba(255,152,0,0.55)" strokeWidth="1" strokeDasharray="4 3" />
          <line x1="54" y1="60" x2="62" y2="60" stroke="rgba(255,152,0,0.55)" strokeWidth="1" />
          <line x1="54" y1="230" x2="62" y2="230" stroke="rgba(255,152,0,0.55)" strokeWidth="1" />
          <line x1="72" y1="244" x2="210" y2="244" stroke="rgba(255,152,0,0.45)" strokeWidth="1" strokeDasharray="4 3" />
          <line x1="72" y1="240" x2="72" y2="248" stroke="rgba(255,152,0,0.45)" strokeWidth="1" />
          <line x1="210" y1="240" x2="210" y2="248" stroke="rgba(255,152,0,0.45)" strokeWidth="1" />
          <circle cx="226" cy="80" r="1.5" fill="rgba(0,188,212,0.5)" />
          <circle cx="226" cy="110" r="1.5" fill="rgba(0,188,212,0.5)" />
          <circle cx="226" cy="140" r="1.5" fill="rgba(0,188,212,0.5)" />
          <circle cx="226" cy="170" r="1.5" fill="rgba(0,188,212,0.5)" />
        </svg>
      </div>
      <div className="l-threed-chips">
        <span className="l-threed-chip is-active">Orbit</span>
        <span className="l-threed-chip">Walk</span>
        <span className="l-threed-chip">Tour</span>
      </div>
      <div className="l-threed-stats">9 Rooms · 2 Floors · 14,280 ft²</div>
    </div>
  );
}

/* ── Feature tab metadata ── */
const FEATURES = [
  {
    tag: "01", label: "Floor Plan Generation", icon: <IconFloorPlan />,
    title: "Smart layout generation from prompts or requirements",
    sub: "Describe your space — let AI zone and dimension it instantly.",
    bullets: [
      "Choose from multiple layout strategies — traditional, split, or open courtyard",
      "Auto-zoned rooms with dimensions, area, and door/window placement",
      "Not happy with it? Regenerate instantly until the layout feels right",
    ],
    Visual: FloorPlanVisual,
    annos: (
      <>
        <div className="l-feat-anno l-feat-anno--tr">Auto-dimensioned layout</div>
        <div className="l-feat-anno l-feat-anno--bl">Color-zoned by room type</div>
      </>
    ),
  },
  {
    tag: "02", label: "2D Technical Diagrams", icon: <IconBlueprint />,
    title: "Every elevation and the roof plan, auto-generated",
    sub: "Front, rear, left, right, and roof — generated straight from your layout.",
    bullets: [
      "Generate Front, Rear, Left, and Right elevations from one layout",
      "Get a dedicated, dimensioned roof plan alongside every floor plan",
      "Switch between views instantly — no manual redrawing",
    ],
    Visual: DiagramsVisual,
    annos: <div className="l-feat-anno l-feat-anno--tr">CAD-accurate line work</div>,
  },
  {
    tag: "03", label: "Cost Estimation", icon: <IconCost />,
    title: "Plan smarter with AI-driven cost insights",
    sub: "Every wall, door, and fixture priced — before a single brick is laid.",
    bullets: [
      "Total cost broken into Structure, Finishes, Doors & Windows, and Fixtures",
      "Drill into itemized line items — right down to wall thickness and rate",
      "Estimates recalculate automatically whenever you change the layout",
    ],
    cardStyle: { aspectRatio: "unset", minHeight: "460px" },
    Visual: CostVisual,
    annos: <div className="l-feat-anno l-feat-anno--tr">11 itemized line items</div>,
  },
  {
    tag: "04", label: "3D Model Generation", icon: <IconCube />,
    title: "A real 3D model you can walk through",
    sub: "Not a static render — a live WebGL model of your actual layout.",
    bullets: [
      "Orbit, walk, or take a guided tour through your model",
      "Toggle dollhouse cutaways, exploded floors, and room color zoning",
      "Export a high-resolution PNG render in one click",
    ],
    Visual: ThreeDVisual,
    annos: (
      <>
        <div className="l-feat-anno l-feat-anno--tr">Drag to orbit the model</div>
        <div className="l-feat-anno l-feat-anno--bl">Real WebGL, not a render</div>
      </>
    ),
  },
];

/* ── Pipeline (replaces the old photo-marquee community section) ── */
const STEPS = [
  { label: "Describe It", icon: <IconPrompt />, desc: "Set your plot size, floors, rooms, wall thickness, and setbacks." },
  { label: "Floor Plan", icon: <IconFloorPlan />, desc: "Pick a layout strategy and get a zoned, dimensioned plan instantly." },
  { label: "Elevations & Roof", icon: <IconBlueprint />, desc: "Front, rear, left, right, and roof plan — generated automatically." },
  { label: "3D Model", icon: <IconCube />, desc: "Orbit, walk, or tour a real WebGL model of your design." },
  { label: "Cost Estimate", icon: <IconCost />, desc: "See a full, itemized material and labor breakdown before you build." },
];

function FeaturePanel({ feature }) {
  const panelRef = useRef(null);
  useEffect(() => {
    const bullets = panelRef.current.querySelectorAll(".l-feat-bullets li");
    gsap.fromTo(panelRef.current.querySelectorAll(".l-feat-text > *"), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: "power2.out" });
    gsap.fromTo(bullets, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.4, stagger: 0.07, delay: 0.15, ease: "power2.out" });
  }, []);
  const Visual = feature.Visual;
  return (
    <div className="l-feat-row l-showcase-panel" ref={panelRef}>
      <div className="l-feat-visual">
        <div className="l-feat-card" style={feature.cardStyle}>
          <Visual />
        </div>
        {feature.annos}
      </div>
      <div className="l-feat-text">
        <h3>{feature.title}</h3>
        <p className="l-feat-sub">{feature.sub}</p>
        <ul className="l-feat-bullets">
          {feature.bullets.map((b) => <li key={b}>{b}</li>)}
        </ul>
      </div>
    </div>
  );
}

export default function Landing() {
  const cursorRef = useRef(null);
  const cursorDotRef = useRef(null);
  const [activeFeature, setActiveFeature] = useState(0);

  const heroCtaRef = useRef(null);
  const featCtaRef = useRef(null);
  const pipelineCtaRef = useRef(null);
  useMagnetic(heroCtaRef);
  useMagnetic(featCtaRef);
  useMagnetic(pipelineCtaRef);

  const pipelineRef = useRef(null);
  const lineRef = useRef(null);
  const stepRefs = useRef([]);

  useEffect(() => {
    const cursor = cursorRef.current;
    const cursorDot = cursorDotRef.current;

    const onMove = (e) => {
      cursor.style.left = e.clientX + "px";
      cursor.style.top = e.clientY + "px";
      cursorDot.style.left = e.clientX + "px";
      cursorDot.style.top = e.clientY + "px";
    };
    document.addEventListener("mousemove", onMove);

    const onMove2 = (e) => {
      const meshes = document.querySelectorAll(".gradient-mesh");
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      meshes.forEach((mesh, index) => {
        const speed = (index + 1) * 15;
        mesh.style.transform = `translate(${x * speed}px, ${y * speed}px)`;
      });
    };
    document.addEventListener("mousemove", onMove2);

    const links = document.querySelectorAll(".landing-root a, .landing-root button");
    const enterHandler = () => () => {
      cursor.style.transform = "translate(-50%, -50%) scale(1.5)";
      cursor.style.borderColor = "#FF9800";
    };
    const leaveHandler = () => {
      cursor.style.transform = "translate(-50%, -50%) scale(1)";
      cursor.style.borderColor = "#1E88E5";
    };
    links.forEach((el) => {
      el.addEventListener("mouseenter", enterHandler(el));
      el.addEventListener("mouseleave", leaveHandler);
    });

    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener("click", function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute("href"));
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mousemove", onMove2);
    };
  }, []);

  /* Scroll-scrubbed pipeline: connecting line draws in while steps pop in, tied to scroll position */
  useEffect(() => {
    const line = lineRef.current;
    const steps = stepRefs.current.filter(Boolean);
    if (!line || !steps.length) return;

    const length = line.getTotalLength();
    gsap.set(line, { strokeDasharray: length, strokeDashoffset: length });
    gsap.set(steps, { opacity: 0, y: 34, scale: 0.92 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: pipelineRef.current,
        start: "top 75%",
        end: "bottom 60%",
        scrub: 1,
      },
    });
    tl.to(line, { strokeDashoffset: 0, ease: "none" }, 0)
      .to(steps, { opacity: 1, y: 0, scale: 1, stagger: 0.18, ease: "power2.out" }, 0);

    return () => {
      if (tl.scrollTrigger) tl.scrollTrigger.kill();
      tl.kill();
    };
  }, []);

  const feature = FEATURES[activeFeature];

  const onTabClick = (i, e) => {
    setActiveFeature(i);
    const icon = e.currentTarget.querySelector(".l-showcase-tab-icon");
    if (icon) gsap.fromTo(icon, { scale: 0.75, rotate: -8 }, { scale: 1, rotate: 0, duration: 0.5, ease: "back.out(3)" });
  };

  return (
    <div className="landing-root">
      {/* Custom Cursor */}
      <div className="l-cursor" ref={cursorRef}></div>
      <div className="l-cursor-dot" ref={cursorDotRef}></div>

      {/* Loading Overlay */}
      <div className="l-loading-overlay">
        <div className="l-loader"></div>
      </div>

      {/* ── NAVIGATION ── */}
      <nav className="l-nav">
        <div className="l-logo">BuildMate AI</div>
        <ul className="l-nav-links">
          <li><a href="#features">Features</a></li>
          <li><a href="#how-it-works">How It Works</a></li>
          <li><a href="#pricing">Pricing</a></li>
          <li><a href="#docs">Documentation</a></li>
        </ul>
        <Link to="/register" className="l-cta-nav">Get Started Free</Link>
      </nav>

      {/* ── HERO SECTION ── */}
      <section className="l-hero-section">
        <div className="l-blueprint-grid">
          <svg className="l-grid-svg" viewBox="0 0 1920 1080">
            <defs>
              <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="gradient-mesh mesh-1"></div>
        <div className="gradient-mesh mesh-2"></div>
        <div className="gradient-mesh mesh-3"></div>

        <div className="l-deco-circle l-circle-1"></div>
        <div className="l-deco-circle l-circle-2"></div>

        <div className="l-hero-container">
          <div className="l-hero-content">
            <h1 className="l-hero-headline">
              <span className="l-highlight">AI-Powered</span><br />
              Civil Engineering<br />
              Design
            </h1>
            <p className="l-hero-subheadline">
              Transform your requirements into construction-ready designs in seconds.
              Generate 2D floor plans, 3D models, and accurate cost estimates with intelligent automation.
            </p>
            <div className="l-cta-container">
              <Link to="/register" className="l-cta-primary" ref={heroCtaRef}>
                Start Designing Free
              </Link>
              <Link to="/login" className="l-cta-secondary">
                Log in ▶
              </Link>
            </div>
          </div>

          <div className="l-hero-visual">
            <div id="three-container">
              <video autoPlay muted loop playsInline>
                <source src="/videos/hero-video.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
            <div className="l-annotation l-anno-1">Real-time 3D Preview</div>
            <div className="l-annotation l-anno-2">Instant Cost Calculation</div>
            <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
              <line className="l-measure-line" x1="10%" y1="15%" x2="35%" y2="15%" />
              <line className="l-measure-line" x1="65%" y1="85%" x2="90%" y2="85%" />
            </svg>
          </div>
        </div>

        <div className="l-stats-bar">
          <div className="l-stat-item">
            <div className="l-stars">⭐ ⭐ ⭐ ⭐ ⭐</div>
            <p className="l-stat-description">Rated 5.0 by early users</p>
          </div>

          <div className="l-stat-item">
            <div className="l-users-wrapper">
              <div className="l-laurel">❨</div>
              <div className="l-users-content">
                <h2 className="l-stat-number">Free</h2>
                <p className="l-stat-description">during Early Access</p>
                <div className="l-avatar-group">
                  <img src="https://i.pravatar.cc/60?img=1" alt="" />
                  <img src="https://i.pravatar.cc/60?img=2" alt="" />
                  <img src="https://i.pravatar.cc/60?img=3" alt="" />
                  <img src="https://i.pravatar.cc/60?img=4" alt="" />
                </div>
              </div>
              <div className="l-laurel">❩</div>
            </div>
          </div>

          <div className="l-stat-item">
            <div className="l-country-tags">
              <span>Floor Plans</span>
              <span>2D Diagrams</span>
              <span>3D Models</span>
              <span>Cost Estimation</span>
            </div>
            <div className="l-country-badge">4 Tools in One</div>
          </div>
        </div>
      </section>

      {/* ── FEATURES SECTION (interactive showcase, matches the real product) ── */}
      <section className="l-features-section" id="features">
        <div className="l-features-header">
          <h2>Everything you need to<br /><span>design smarter</span></h2>
          <p>From floor plans to cost estimates — BuildMate AI turns your requirements into professional,
            construction-ready outputs in seconds.</p>
        </div>

        <div className="l-showcase">
          <div className="l-showcase-tabs">
            {FEATURES.map((f, i) => (
              <button
                key={f.tag}
                type="button"
                className={`l-showcase-tab${activeFeature === i ? " is-active" : ""}`}
                onClick={(e) => onTabClick(i, e)}
              >
                <span className="l-showcase-tab-icon">{f.icon}</span>
                <span className="l-showcase-tab-text">
                  <span className="l-showcase-tab-label">{f.tag}</span>
                  <span className="l-showcase-tab-title">{f.label}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="l-showcase-stage">
            <FeaturePanel feature={feature} key={activeFeature} />
          </div>
        </div>

        <div className="l-features-cta-wrap">
          <Link to="/register" ref={featCtaRef}>Start Designing Free</Link>
        </div>
      </section>

      {/* ── PIPELINE SECTION (replaces the old photo marquee) ── */}
      <section className="l-pipeline-section" id="how-it-works" ref={pipelineRef}>
        <div className="l-pipeline-header">
          <h2>From prompt to <span className="l-highlight">blueprint</span></h2>
          <p>One request kicks off the full pipeline — layout, drawings, 3D model, and costs, generated end-to-end.</p>
        </div>

        <div className="l-pipeline-track">
          <svg className="l-pipeline-line" viewBox="0 0 1200 20" preserveAspectRatio="none">
            <path ref={lineRef} d="M40 10 H1160" fill="none" stroke="var(--primary-blue)" strokeWidth="2" strokeDasharray="7 7" strokeLinecap="round" />
          </svg>
          <div className="l-pipeline-steps">
            {STEPS.map((s, i) => (
              <div className="l-pipeline-step" ref={(el) => (stepRefs.current[i] = el)} key={s.label}>
                <div className="l-pipeline-node"><span className="l-pipeline-icon">{s.icon}</span></div>
                <div className="l-pipeline-num">0{i + 1}</div>
                <h4>{s.label}</h4>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="l-pipeline-cta-wrap">
          <Link to="/register" className="l-pipeline-cta" ref={pipelineCtaRef}>Start Designing Free</Link>
        </div>
      </section>
    </div>
  );
}