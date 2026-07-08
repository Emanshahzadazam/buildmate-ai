import { useState } from "react";

const CATEGORY_LABELS = {
  structure: "Structure",
  finishes:  "Finishes",
  openings:  "Doors & Windows",
  fixtures:  "Fixtures",
};

const CATEGORY_COLORS = {
  structure: "#1E88E5",
  finishes:  "#00BCD4",
  openings:  "#FF9800",
  fixtures:  "#9C27B0",
};

const formatPKR = (n) =>
  new Intl.NumberFormat("en-PK", { style:"currency", currency:"PKR", maximumFractionDigits:0 }).format(n);

const formatNumber = (n) =>
  new Intl.NumberFormat("en-PK", { maximumFractionDigits:0 }).format(n);

const glass = {
  background: "rgba(255,255,255,0.82)",
  backdropFilter: "blur(20px) saturate(180%)",
  WebkitBackdropFilter: "blur(20px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.45)",
  borderRadius: "20px",
  boxShadow: "0 16px 48px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.7)",
};

export default function CostPanel({ cost, layoutGenerated }) {

  // ── Not generated yet ──
  if (!layoutGenerated) {
    return (
      <aside className="col-span-3" style={{ ...glass, padding:"1.5rem" }}>
        <div style={{ display:"flex",alignItems:"center",gap:"0.5rem",marginBottom:"0.4rem" }}>
          <div style={{ width:26,height:26,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,background:"linear-gradient(135deg,#1E88E5,#00BCD4)",boxShadow:"0 3px 8px rgba(30,136,229,0.28)" }}>💰</div>
          <span style={{ fontFamily:"'Syne',sans-serif",fontSize:"0.95rem",fontWeight:800,color:"#1a252f" }}>Cost Estimate</span>
        </div>
        <p style={{ fontSize:"0.75rem",color:"#546E7A",marginBottom:"1rem" }}>PKR · approximate</p>
        <div style={{ padding:"3rem 1rem",textAlign:"center",borderRadius:16,background:"rgba(30,136,229,0.04)",border:"1.5px dashed rgba(30,136,229,0.2)" }}>
          <div style={{ fontSize:"2rem",marginBottom:"0.75rem",opacity:0.4 }}>📐</div>
          <p style={{ fontSize:"0.85rem",fontWeight:600,color:"#546E7A",lineHeight:1.6 }}>
            Generate a layout to see<br />the estimated cost.
          </p>
        </div>
      </aside>
    );
  }

  // ── No cost data ──
  if (!cost) {
    return (
      <aside className="col-span-3" style={{ ...glass, padding:"1.5rem" }}>
        <div style={{ display:"flex",alignItems:"center",gap:"0.5rem" }}>
          <div style={{ width:26,height:26,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,background:"linear-gradient(135deg,#1E88E5,#00BCD4)" }}>💰</div>
          <span style={{ fontFamily:"'Syne',sans-serif",fontSize:"0.95rem",fontWeight:800,color:"#1a252f" }}>Cost Estimate</span>
        </div>
        <p style={{ fontSize:"0.8rem",color:"#dc2626",marginTop:"0.75rem",fontWeight:500 }}>Cost data unavailable.</p>
      </aside>
    );
  }

  return (
    <aside className="col-span-3" style={{ ...glass, padding:"1.5rem" }}>

      {/* Header */}
      <div style={{ display:"flex",alignItems:"center",gap:"0.5rem",marginBottom:"0.4rem" }}>
        <div style={{ width:26,height:26,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,background:"linear-gradient(135deg,#1E88E5,#00BCD4)",boxShadow:"0 3px 8px rgba(30,136,229,0.28)" }}>💰</div>
        <span style={{ fontFamily:"'Syne',sans-serif",fontSize:"0.95rem",fontWeight:800,color:"#1a252f" }}>Cost Estimate</span>
      </div>
      <p style={{ fontSize:"0.75rem",color:"#546E7A",marginBottom:"1.25rem" }}>PKR · approximate</p>

      {/* Total */}
      <div style={{ borderRadius:16,background:"linear-gradient(135deg,rgba(30,136,229,0.12),rgba(0,188,212,0.08))",border:"1px solid rgba(30,136,229,0.2)",padding:"1rem 1.1rem",marginBottom:"1.25rem" }}>
        <p style={{ fontSize:"0.7rem",textTransform:"uppercase",letterSpacing:"0.07em",color:"#1E88E5",fontWeight:800,marginBottom:"0.3rem" }}>Total</p>
        <p style={{ fontFamily:"'Syne',sans-serif",fontSize:"1.6rem",fontWeight:800,color:"#1a252f",letterSpacing:"-0.03em" }}>
          {formatPKR(cost.total)}
        </p>
      </div>

      {/* Category breakdown */}
      <div style={{ display:"flex",flexDirection:"column",gap:"0.85rem",marginBottom:"1.25rem" }}>
        {Object.entries(cost.byCategory).map(([cat, amount]) => {
          const pct = (amount / cost.total) * 100;
          const color = CATEGORY_COLORS[cat] || "#1E88E5";
          return (
            <div key={cat}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.3rem" }}>
                <span style={{ fontSize:"0.8rem",color:"#546E7A",fontWeight:600 }}>
                  {CATEGORY_LABELS[cat] || cat}
                </span>
                <span style={{ fontSize:"0.82rem",fontWeight:800,color:"#1a252f" }}>
                  {formatPKR(amount)}
                </span>
              </div>
              <div style={{ height:"5px",borderRadius:"999px",background:"rgba(144,164,174,0.15)",overflow:"hidden" }}>
                <div style={{ height:"100%",borderRadius:"999px",width:`${pct}%`,background:`linear-gradient(90deg,${color},${color}aa)`,transition:"width 0.6s ease" }} />
              </div>
            </div>
          );
        })}
      </div>


      {/* Disclaimer */}
      <p style={{ marginTop:"1rem",fontSize:"0.68rem",color:"#90A4AE",lineHeight:1.6,borderTop:"1px solid rgba(0,0,0,0.06)",paddingTop:"0.75rem" }}>
        {cost.notes?.[0] || "Estimates may vary from actual market prices."}
      </p>
    </aside>
  );
}