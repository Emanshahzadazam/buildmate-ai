import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { projectsApi } from "../lib/projectsApi";

const glass = {
  background: "rgba(255,255,255,0.82)",
  backdropFilter: "blur(20px) saturate(180%)",
  WebkitBackdropFilter: "blur(20px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.45)",
  borderRadius: "24px",
  boxShadow: "0 16px 48px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.7)",
};

const statusStyle = {
  draft:     { background:"rgba(255,152,0,0.12)",   border:"1px solid rgba(255,152,0,0.25)",   color:"#FF9800"  },
  generated: { background:"rgba(76,175,80,0.1)",    border:"1px solid rgba(76,175,80,0.25)",    color:"#388E3C"  },
  review:    { background:"rgba(30,136,229,0.1)",   border:"1px solid rgba(30,136,229,0.25)",  color:"#1E88E5"  },
};

const PlotThumb = ({ idx }) => {
  const patterns = [
    <><rect x="4" y="4" width="18" height="18" fill="rgba(30,136,229,0.1)" stroke="rgba(30,136,229,0.4)" strokeWidth="1"/><rect x="22" y="4" width="22" height="12" fill="rgba(0,188,212,0.1)" stroke="rgba(0,188,212,0.4)" strokeWidth="1"/><rect x="4" y="22" width="26" height="22" fill="rgba(30,136,229,0.07)" stroke="rgba(30,136,229,0.35)" strokeWidth="1"/><rect x="30" y="16" width="14" height="28" fill="rgba(255,152,0,0.08)" stroke="rgba(255,152,0,0.35)" strokeWidth="1"/></>,
    <><rect x="4" y="4" width="22" height="22" fill="rgba(0,188,212,0.1)" stroke="rgba(0,188,212,0.35)" strokeWidth="1"/><rect x="26" y="4" width="18" height="22" fill="rgba(30,136,229,0.08)" stroke="rgba(30,136,229,0.35)" strokeWidth="1"/><rect x="4" y="26" width="40" height="18" fill="rgba(255,152,0,0.07)" stroke="rgba(255,152,0,0.3)" strokeWidth="1"/></>,
    <><rect x="4" y="4" width="14" height="40" fill="rgba(255,152,0,0.09)" stroke="rgba(255,152,0,0.3)" strokeWidth="1"/><rect x="18" y="4" width="26" height="18" fill="rgba(30,136,229,0.08)" stroke="rgba(30,136,229,0.35)" strokeWidth="1"/><rect x="18" y="22" width="26" height="22" fill="rgba(0,188,212,0.07)" stroke="rgba(0,188,212,0.3)" strokeWidth="1"/></>,
    <><rect x="4" y="4" width="40" height="10" fill="rgba(30,136,229,0.1)" stroke="rgba(30,136,229,0.35)" strokeWidth="1"/><rect x="4" y="14" width="19" height="30" fill="rgba(0,188,212,0.08)" stroke="rgba(0,188,212,0.3)" strokeWidth="1"/><rect x="23" y="14" width="21" height="30" fill="rgba(255,152,0,0.07)" stroke="rgba(255,152,0,0.3)" strokeWidth="1"/></>,
  ];
  return (
    <div style={{ width:52,height:52,borderRadius:12,overflow:"hidden",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center" }}>
      <svg viewBox="0 0 48 48" fill="none" width={48} height={48}>
        <rect x="4" y="4" width="40" height="40" rx="2" fill="rgba(30,136,229,0.06)" stroke="rgba(30,136,229,0.4)" strokeWidth="1.2"/>
        {patterns[idx % patterns.length]}
      </svg>
    </div>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    projectsApi
      .list()
      .then(setProjects)
      .catch((err) => setError(err.response?.data?.message || "Failed to load projects"))
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

  const firstName = user?.name?.split(" ")[0] || "there";
  const today = new Date().toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric" });

  const completed = projects.filter(p => p.status === "generated").length;
  const drafts    = projects.filter(p => p.status === "draft").length;

  return (
    <div style={{
      minHeight: "100vh",
      paddingTop: "110px",
      paddingBottom: "4rem",
      paddingLeft: "3%",
      paddingRight: "3%",
      background:
        "radial-gradient(circle at 12% 18%,rgba(232,245,233,0.9) 0%,transparent 45%)," +
        "radial-gradient(circle at 88% 78%,rgba(255,224,178,0.85) 0%,transparent 45%)," +
        "radial-gradient(circle at 52% 48%,rgba(255,248,225,0.55) 0%,transparent 60%)," +
        "linear-gradient(135deg,#E8F5E9 0%,#FFF8E1 50%,#FFE0B2 100%)",
      position: "relative",
    }}>
      {/* Blueprint grid overlay */}
      <div style={{ position:"fixed",inset:0,pointerEvents:"none",zIndex:0,opacity:0.03,backgroundImage:"linear-gradient(rgba(30,136,229,1) 1px,transparent 1px),linear-gradient(90deg,rgba(30,136,229,1) 1px,transparent 1px)",backgroundSize:"50px 50px" }} />

      {/* Floating shapes */}
      <div style={{ position:"fixed",width:"520px",height:"520px",borderRadius:"50%",background:"radial-gradient(circle,rgba(30,136,229,0.3),transparent 70%)",top:"-160px",right:"-80px",filter:"blur(80px)",opacity:0.38,pointerEvents:"none",zIndex:0 }} />
      <div style={{ position:"fixed",width:"380px",height:"380px",borderRadius:"50%",background:"radial-gradient(circle,rgba(255,152,0,0.28),transparent 70%)",bottom:"-80px",left:"-60px",filter:"blur(80px)",opacity:0.38,pointerEvents:"none",zIndex:0 }} />

      <div style={{ position:"relative", zIndex:1, maxWidth:"1400px", margin:"0 auto" }}>

        {/* Welcome row */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:"2rem" }}>
          <div>
            <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:"clamp(1.6rem,3vw,2.3rem)", fontWeight:800, letterSpacing:"-0.04em", color:"#1a252f" }}>
              Welcome back,{" "}
              <span style={{ background:"linear-gradient(135deg,#1E88E5,#00BCD4)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
                {firstName}
              </span>{" "}👋
            </h1>
            <p style={{ fontSize:"0.9rem", color:"#546E7A", marginTop:"0.3rem", fontWeight:500 }}>
              {projects.length === 0 ? "Start your first project." : `${projects.length} project${projects.length === 1 ? "" : "s"} in your workspace.`}
            </p>
          </div>
          <div style={{ padding:"0.4rem 1.1rem", borderRadius:"999px", fontSize:"0.75rem", fontWeight:700, background:"rgba(255,255,255,0.82)", border:"1px solid rgba(255,255,255,0.45)", color:"#546E7A", backdropFilter:"blur(12px)", whiteSpace:"nowrap" }}>
            {today}
          </div>
        </div>

        {/* Stat cards */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"1rem", marginBottom:"1.75rem" }}>
          {[
            { icon:"🏗️", num: projects.length, label:"Total Projects", trend:"↑ Active", color:"rgba(30,136,229,0.15)" },
            { icon:"✅", num: completed,        label:"Completed",      trend:"↑ Generated", color:"rgba(76,175,80,0.15)" },
            { icon:"⚡", num: drafts,           label:"Drafts",         trend:"In progress", color:"rgba(255,152,0,0.15)" },
            { icon:"📐", num: projects.reduce((s,p)=>s+(p.layoutVariants?.length||0),0), label:"Floor plan Layouts Generated", trend:"↑ This session", color:"rgba(0,188,212,0.15)" },
          ].map((s,i) => (
            <div key={i} style={{ ...glass, padding:"1.25rem 1.4rem", display:"flex", flexDirection:"column", gap:"0.5rem", transition:"all 0.3s", cursor:"default" }}
              onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-4px)"; e.currentTarget.style.boxShadow="0 20px 48px rgba(0,0,0,0.1),inset 0 1px 0 rgba(255,255,255,0.7)"; }}
              onMouseLeave={e=>{ e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow=glass.boxShadow; }}
            >
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ width:38,height:38,borderRadius:11,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.1rem",background:s.color }}>{s.icon}</div>
                <span style={{ fontSize:"0.7rem",fontWeight:700,padding:"0.2rem 0.55rem",borderRadius:"999px",background:"rgba(76,175,80,0.1)",color:"#388E3C" }}>{s.trend}</span>
              </div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:"1.8rem", fontWeight:800, letterSpacing:"-0.04em", color:"#1a252f" }}>{s.num}</div>
              <div style={{ fontSize:"0.75rem", fontWeight:600, color:"#546E7A" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Main grid */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:"1.25rem", alignItems:"start" }}>

          {/* Projects panel */}
          <div style={glass}>
            <div style={{ padding:"1.3rem 1.5rem", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid rgba(255,255,255,0.6)", background:"rgba(255,255,255,0.3)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"0.55rem", fontFamily:"'Syne',sans-serif", fontSize:"0.95rem", fontWeight:800, color:"#1a252f" }}>
                <div style={{ width:28,height:28,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,background:"linear-gradient(135deg,#1E88E5,#00BCD4)",boxShadow:"0 3px 9px rgba(30,136,229,0.28)" }}>📁</div>
                My Projects
              </div>
              <Link to="/projects/new" style={{ fontSize:"0.75rem", fontWeight:700, color:"#1E88E5", textDecoration:"none" }}>+ New project</Link>
            </div>

            <div style={{ padding:"1rem 1.25rem", display:"flex", flexDirection:"column", gap:"0.75rem" }}>
              {loading && (
                <div style={{ padding:"3rem", textAlign:"center", color:"#90A4AE", fontSize:"0.9rem" }}>Loading your projects...</div>
              )}
              {error && (
                <div style={{ padding:"1rem", borderRadius:12, background:"rgba(239,68,68,0.08)", color:"#dc2626", fontSize:"0.85rem" }}>{error}</div>
              )}

              {!loading && !error && projects.length === 0 && (
                <div style={{ padding:"3rem", textAlign:"center" }}>
                  <div style={{ width:56,height:56,borderRadius:16,background:"linear-gradient(135deg,rgba(30,136,229,0.1),rgba(0,188,212,0.1))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.5rem",margin:"0 auto 1rem" }}>+</div>
                  <p style={{ fontWeight:700, color:"#1a252f", marginBottom:"0.3rem" }}>No projects yet</p>
                  <p style={{ fontSize:"0.85rem", color:"#546E7A" }}>Create your first project to get started.</p>
                  <Link to="/projects/new" style={{ display:"inline-block",marginTop:"1rem",padding:"0.6rem 1.5rem",borderRadius:"999px",background:"linear-gradient(135deg,#1a252f,#0f1419)",color:"white",fontWeight:700,fontSize:"0.85rem",textDecoration:"none" }}>Create project</Link>
                </div>
              )}

              {!loading && projects.map((p, idx) => {
                const st = statusStyle[p.status] || statusStyle.draft;
                return (
                  <div key={p.id}
                  onClick={() => navigate(`/projects/${p.id}`)}
                    style={{ display:"grid", gridTemplateColumns:"52px 1fr auto", gap:"1rem", alignItems:"center", padding:"1rem 1.1rem", borderRadius:16, background:"rgba(255,255,255,0.55)", border:"1.5px solid rgba(200,215,225,0.45)", cursor:"pointer", transition:"all 0.3s", position:"relative", overflow:"hidden" }}
                    onMouseEnter={e=>{ e.currentTarget.style.background="rgba(255,255,255,0.82)"; e.currentTarget.style.borderColor="rgba(30,136,229,0.25)"; e.currentTarget.style.transform="translateX(4px)"; }}
                    onMouseLeave={e=>{ e.currentTarget.style.background="rgba(255,255,255,0.55)"; e.currentTarget.style.borderColor="rgba(200,215,225,0.45)"; e.currentTarget.style.transform="translateX(0)"; }}
                  >
                    <PlotThumb idx={idx} />

                    <div>
                      <div style={{ fontSize:"0.88rem", fontWeight:800, color:"#1a252f", marginBottom:"0.18rem" }}>{p.name}</div>
                      <div style={{ fontSize:"0.73rem", color:"#546E7A", fontWeight:500, textTransform:"capitalize" }}>
                        {p.brief?.buildingType || "House"} · {p.brief?.plot?.frontWidth || p.brief?.plotWidth || "—"}×{p.brief?.plot?.leftLength || p.brief?.plotLength || "—"} {p.brief?.plot?.unit || "ft"}
                      </div>
                    </div>

                    <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:"0.5rem" }}>
                      <span style={{ fontSize:"0.65rem", fontWeight:800, letterSpacing:"0.06em", textTransform:"uppercase", padding:"0.2rem 0.65rem", borderRadius:"999px", ...st }}>
                        {p.status}
                      </span>
                      <div style={{ display:"flex", gap:"0.75rem" }}>
                        <Link to={`/projects/${p.id}`} style={{ fontSize:"0.72rem", fontWeight:700, color:"#1E88E5", textDecoration:"none" }}>Open →</Link>
                        <button onClick={(e)=>{ e.stopPropagation(); handleDelete(p.id); }} style={{ fontSize:"0.72rem", color:"#90A4AE", background:"none", border:"none", cursor:"pointer", fontFamily:"inherit" }}>Delete</button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* New project CTA card */}
              <div
                onClick={() => navigate("/projects/new")}
                style={{ display:"flex", alignItems:"center", gap:"1rem", padding:"1rem 1.1rem", borderRadius:16, background:"rgba(30,136,229,0.05)", border:"1.5px dashed rgba(30,136,229,0.25)", cursor:"pointer", transition:"all 0.3s" }}
                onMouseEnter={e=>{ e.currentTarget.style.background="rgba(30,136,229,0.09)"; e.currentTarget.style.borderColor="rgba(30,136,229,0.45)"; }}
                onMouseLeave={e=>{ e.currentTarget.style.background="rgba(30,136,229,0.05)"; e.currentTarget.style.borderColor="rgba(30,136,229,0.25)"; }}
              >
                <div style={{ width:52,height:52,borderRadius:12,background:"linear-gradient(135deg,#1E88E5,#00BCD4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.4rem",color:"white",flexShrink:0,boxShadow:"0 4px 14px rgba(30,136,229,0.3)" }}>+</div>
                <div>
                  <div style={{ fontSize:"0.88rem", fontWeight:800, color:"#1E88E5" }}>Start a new project</div>
                  <div style={{ fontSize:"0.73rem", color:"#546E7A", marginTop:"0.1rem" }}>Generate a floor plan, 2D diagram or cost estimate</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>

            {/* AI tip card */}
            <div style={{ background:"linear-gradient(135deg,#1a252f 0%,#0f1d2a 100%)", borderRadius:24, padding:"1.5rem", boxShadow:"0 16px 40px rgba(26,37,47,0.25)", position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute",top:"-60px",right:"-60px",width:"200px",height:"200px",borderRadius:"50%",background:"radial-gradient(circle,rgba(30,136,229,0.25),transparent 70%)",pointerEvents:"none" }} />
              <div style={{ position:"absolute",bottom:"-40px",left:"-40px",width:"150px",height:"150px",borderRadius:"50%",background:"radial-gradient(circle,rgba(255,152,0,0.2),transparent 70%)",pointerEvents:"none" }} />
              <div style={{ position:"relative", zIndex:1 }}>
                <div style={{ display:"inline-flex",alignItems:"center",gap:"0.4rem",padding:"0.25rem 0.75rem",borderRadius:"999px",background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.15)",fontSize:"0.68rem",fontWeight:800,letterSpacing:"0.06em",textTransform:"uppercase",color:"rgba(255,255,255,0.7)",marginBottom:"1rem" }}>
                  <span style={{ width:6,height:6,borderRadius:"50%",background:"#00BCD4",display:"inline-block" }}/>
                  AI Insight
                </div>
                <div style={{ fontFamily:"'Syne',sans-serif",fontSize:"1rem",fontWeight:800,color:"white",lineHeight:1.3,marginBottom:"0.65rem" }}>
                  {projects.length > 0 ? `${firstName}, your latest project is ready to generate` : "Create your first project to get AI insights"}
                </div>
                <div style={{ fontSize:"0.8rem",color:"rgba(255,255,255,0.6)",lineHeight:1.65,marginBottom:"1.1rem" }}>
                  BuildMate AI can generate 3 layout variants for any project. Click Generate Layout inside the editor to get started.
                </div>
                <button
                  onClick={() => navigate("/projects/new")}
                  style={{ display:"inline-flex",alignItems:"center",gap:"0.5rem",padding:"0.6rem 1.4rem",borderRadius:"999px",fontSize:"0.8rem",fontWeight:800,border:"none",background:"linear-gradient(135deg,#1E88E5,#00BCD4)",color:"white",boxShadow:"0 4px 14px rgba(30,136,229,0.35)",cursor:"pointer",fontFamily:"inherit",transition:"all 0.3s" }}
                >
                  Start new project →
                </button>
              </div>
            </div>

            {/* Quick actions */}
            <div style={glass}>
              <div style={{ padding:"1.3rem 1.5rem", display:"flex", alignItems:"center", gap:"0.55rem", borderBottom:"1px solid rgba(255,255,255,0.6)", background:"rgba(255,255,255,0.3)", fontFamily:"'Syne',sans-serif", fontSize:"0.95rem", fontWeight:800, color:"#1a252f" }}>
                <div style={{ width:28,height:28,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,background:"linear-gradient(135deg,#7B1FA2,#E91E63)",boxShadow:"0 3px 9px rgba(123,31,162,0.28)" }}>🚀</div>
                Quick Actions
              </div>
              <div style={{ padding:"1rem 1.25rem", display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.65rem" }}>
                {[
                  { icon:"🏠", label:"New House",      path:"/projects/new" },
                  { icon:"🏢", label:"Review",  path:"/projects/new" },
                  { icon:"📐", label:"View Projects",  path:"/dashboard"    },
                  { icon:"⚡", label:"Recent",         path:"/dashboard"    },
                ].map((a) => (
                  <button key={a.label} onClick={() => navigate(a.path)}
                    style={{ padding:"0.8rem 0.9rem",borderRadius:14,border:"1.5px solid rgba(200,215,225,0.55)",background:"rgba(255,255,255,0.55)",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:"0.4rem",fontFamily:"inherit",transition:"all 0.25s" }}
                    onMouseEnter={e=>{ e.currentTarget.style.background="rgba(255,255,255,0.85)"; e.currentTarget.style.borderColor="rgba(30,136,229,0.3)"; e.currentTarget.style.transform="translateY(-2px)"; }}
                    onMouseLeave={e=>{ e.currentTarget.style.background="rgba(255,255,255,0.55)"; e.currentTarget.style.borderColor="rgba(200,215,225,0.55)"; e.currentTarget.style.transform="translateY(0)"; }}
                  >
                    <span style={{ fontSize:"1.2rem" }}>{a.icon}</span>
                    <span style={{ fontSize:"0.7rem", fontWeight:700, color:"#546E7A", textAlign:"center" }}>{a.label}</span>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}