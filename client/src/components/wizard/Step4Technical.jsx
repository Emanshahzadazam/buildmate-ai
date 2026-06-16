import Input from "../ui/Input";

const COLUMN_GRIDS = ["10ft","12ft","15ft","auto"];

const panel = {
  background:"rgba(255,255,255,0.75)",
  border:"1px solid rgba(200,215,225,0.5)",
  borderRadius:"16px",
  padding:"1.25rem 1.4rem",
  marginBottom:"1.25rem",
};

export default function Step4Technical({ form, setForm }) {
  const setTech = (key, value) => setForm({ ...form, technical:{ ...form.technical, [key]:value } });

  const totalRooms  = Object.values(form.roomCounts || {}).reduce((s,n)=>s+n, 0);
  const avgW        = ((Number(form.plot.frontWidth)||0)+(Number(form.plot.backWidth)||0))/2;
  const avgL        = ((Number(form.plot.leftLength)||0)+(Number(form.plot.rightLength)||0))/2;
  const buildableW  = Math.max(0, avgW - (Number(form.setbacks.left)||0)  - (Number(form.setbacks.right)||0));
  const buildableL  = Math.max(0, avgL - (Number(form.setbacks.front)||0) - (Number(form.setbacks.back)||0));
  const buildableArea = buildableW * buildableL;

  const summaryItems = [
    { label:"Plot",          value:`${form.plot.frontWidth} × ${form.plot.leftLength} ${form.plot.unit === "feet" ? "ft" : "m"}` },
    { label:"Buildable area", value: buildableArea > 0 ? `${buildableArea.toFixed(1)} ${form.plot.unit === "feet" ? "sq ft" : "m²"}` : "—" },
    { label:"Rooms",          value:`${totalRooms} total` },
    { label:"Floors",         value: form.floors },
    { label:"Kitchen",        value: form.kitchenType },
    { label:"Walls (ext/int)", value:`${form.technical?.wallThicknessExt||9}" / ${form.technical?.wallThicknessInt||4.5}"` },
  ];

  return (
    <div>
      <div style={{ marginBottom:"1.5rem" }}>
        <h2 style={{ fontFamily:"'Syne',sans-serif",fontSize:"1.2rem",fontWeight:800,color:"#1a252f",letterSpacing:"-0.03em" }}>Technical specs & Review</h2>
        <p style={{ fontSize:"0.85rem",color:"#546E7A",marginTop:"0.2rem" }}>Set construction parameters and review your project.</p>
      </div>

      {/* Construction specs */}
      <div style={panel}>
        <h3 style={{ fontSize:"0.9rem",fontWeight:800,color:"#1a252f",marginBottom:"1rem" }}>Construction specs</h3>
        <div style={{ display:"flex",flexDirection:"column",gap:"1rem" }}>
          <Input
            label={`Floor height (${form.plot.unit === "feet" ? "ft" : "m"})`}
            type="number" min="8" max="15" step="0.5"
            value={form.technical?.floorHeight || 10}
            onChange={(e) => setTech("floorHeight", Number(e.target.value))}
          />
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem" }}>
            <Input label="Exterior wall (inches)" type="number" min="4.5" max="18" step="0.5" value={form.technical?.wallThicknessExt||9}   onChange={(e)=>setTech("wallThicknessExt",Number(e.target.value))} />
            <Input label="Interior wall (inches)"  type="number" min="3"   max="9"  step="0.5" value={form.technical?.wallThicknessInt||4.5} onChange={(e)=>setTech("wallThicknessInt",Number(e.target.value))} />
          </div>
          <div>
            <label style={{ display:"block",fontSize:"0.78rem",fontWeight:700,color:"#546E7A",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:"0.6rem" }}>Column grid</label>
            <div style={{ display:"flex",gap:"0.5rem",flexWrap:"wrap" }}>
              {COLUMN_GRIDS.map((g) => (
                <button key={g} type="button" onClick={() => setTech("columnGrid", g)}
                  style={{
                    padding:"0.45rem 1rem",borderRadius:"999px",fontSize:"0.8rem",fontWeight:700,
                    border:"1.5px solid",cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s",
                    background: (form.technical?.columnGrid||"auto") === g ? "linear-gradient(135deg,#1E88E5,#00BCD4)" : "rgba(255,255,255,0.7)",
                    borderColor: (form.technical?.columnGrid||"auto") === g ? "transparent" : "rgba(200,215,225,0.5)",
                    color: (form.technical?.columnGrid||"auto") === g ? "white" : "#546E7A",
                    boxShadow: (form.technical?.columnGrid||"auto") === g ? "0 3px 10px rgba(30,136,229,0.25)" : "none",
                  }}>
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Review summary */}
      <div style={panel}>
        <h3 style={{ fontSize:"0.9rem",fontWeight:800,color:"#1a252f",marginBottom:"1rem" }}>Review summary</h3>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.6rem",marginBottom:"1rem" }}>
          {summaryItems.map((item) => (
            <div key={item.label} style={{ padding:"0.7rem 0.85rem",borderRadius:12,background:"rgba(255,255,255,0.6)",border:"1px solid rgba(200,215,225,0.4)" }}>
              <p style={{ fontSize:"0.65rem",textTransform:"uppercase",letterSpacing:"0.07em",color:"#90A4AE",fontWeight:700,marginBottom:"0.25rem" }}>{item.label}</p>
              <p style={{ fontSize:"0.85rem",fontWeight:800,color:"#1a252f",textTransform:"capitalize" }}>{item.value}</p>
            </div>
          ))}
        </div>

        {/* Ready badge */}
        <div style={{ borderRadius:12,background:"linear-gradient(135deg,rgba(76,175,80,0.1),rgba(0,188,212,0.07))",border:"1px solid rgba(76,175,80,0.25)",padding:"0.85rem 1rem",display:"flex",alignItems:"center",gap:"0.6rem" }}>
          <span style={{ fontSize:"1rem" }}>✅</span>
          <p style={{ fontSize:"0.82rem",fontWeight:700,color:"#388E3C" }}>
            Everything looks good. Click <strong>Create Project</strong> to generate your layout.
          </p>
        </div>
      </div>
    </div>
  );
}