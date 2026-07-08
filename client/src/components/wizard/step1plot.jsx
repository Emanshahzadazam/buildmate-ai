import Input from "../ui/Input";

const panel = {
  background: "rgba(255,255,255,0.75)",
  border: "1px solid rgba(200,215,225,0.5)",
  borderRadius: "16px",
  padding: "1.25rem 1.4rem",
  marginBottom: "1.25rem",
};

export default function Step1Plot({ form, setForm, errors }) {
  const setPlot    = (key, value) => setForm({ ...form, plot:     { ...form.plot,     [key]: value } });
  const setSetback = (key, value) => setForm({ ...form, setbacks: { ...form.setbacks, [key]: value } });

  const avgWidth    = ((Number(form.plot.frontWidth) || 0) + (Number(form.plot.backWidth)   || 0)) / 2;
  const avgLength   = ((Number(form.plot.leftLength) || 0) + (Number(form.plot.rightLength) || 0)) / 2;
  const totalArea   = avgWidth * avgLength;
  const buildableW  = avgWidth  - (Number(form.setbacks.left)  || 0) - (Number(form.setbacks.right) || 0);
  const buildableL  = avgLength - (Number(form.setbacks.front) || 0) - (Number(form.setbacks.back)  || 0);
  const buildableArea = Math.max(0, buildableW * buildableL);
  const unit = form.plot.unit === "feet" ? "ft" : "m";

  return (
    <div>
      {/* Title */}
      <div style={{ marginBottom:"1.5rem" }}>
        <h2 style={{ fontFamily:"'Syne',sans-serif",fontSize:"1.2rem",fontWeight:800,color:"#1a252f",letterSpacing:"-0.03em" }}>
          Plot dimensions
        </h2>
        <p style={{ fontSize:"0.85rem",color:"#546E7A",marginTop:"0.2rem" }}>
          Enter the four sides of your plot. Use feet or meters consistently.
        </p>
      </div>

      {/* Unit selector */}
      <div style={{ marginBottom:"1.25rem" }}>
        <label style={{ display:"block",fontSize:"0.78rem",fontWeight:700,color:"#546E7A",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:"0.6rem" }}>Unit</label>
        <div style={{ display:"flex",gap:"0.5rem" }}>
          {["feet","meters"].map((u) => (
            <button key={u} type="button" onClick={() => setPlot("unit", u)}
              style={{
                padding:"0.5rem 1.25rem",borderRadius:"999px",fontSize:"0.82rem",fontWeight:700,
                border:"1.5px solid",cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s",
                background: form.plot.unit === u ? "linear-gradient(135deg,#1E88E5,#00BCD4)" : "rgba(255,255,255,0.6)",
                borderColor: form.plot.unit === u ? "transparent" : "rgba(200,215,225,0.6)",
                color: form.plot.unit === u ? "white" : "#546E7A",
                boxShadow: form.plot.unit === u ? "0 4px 12px rgba(30,136,229,0.25)" : "none",
              }}>
              {u === "feet" ? "Feet (ft)" : "Meters (m)"}
            </button>
          ))}
        </div>
      </div>

      {/* Plot sides */}
      <div style={panel}>
        <h3 style={{ fontSize:"0.9rem",fontWeight:800,color:"#1a252f",marginBottom:"0.25rem" }}>Plot sides</h3>
        <p style={{ fontSize:"0.75rem",color:"#546E7A",marginBottom:"1rem" }}>Front and back are the widths. Left and right are the lengths.</p>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem" }}>
          <Input label={`Front width (${unit})`} type="number" min="3" step="0.1" value={form.plot.frontWidth} onChange={(e) => setPlot("frontWidth", e.target.value)} error={errors.frontWidth} />
          <Input label={`Back width (${unit})`}  type="number" min="3" step="0.1" value={form.plot.backWidth}  onChange={(e) => setPlot("backWidth",  e.target.value)} error={errors.backWidth}  />
          <Input label={`Left length (${unit})`}  type="number" min="3" step="0.1" value={form.plot.leftLength}  onChange={(e) => setPlot("leftLength",  e.target.value)} error={errors.leftLength}  />
          <Input label={`Right length (${unit})`} type="number" min="3" step="0.1" value={form.plot.rightLength} onChange={(e) => setPlot("rightLength", e.target.value)} error={errors.rightLength} />
        </div>
      </div>

      {/* Setbacks */}
      <div style={panel}>
        <h3 style={{ fontSize:"0.9rem",fontWeight:800,color:"#1a252f",marginBottom:"0.25rem" }}>Setbacks</h3>
        <p style={{ fontSize:"0.75rem",color:"#546E7A",marginBottom:"1rem" }}>Open space left between the building and the plot edge.</p>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem" }}>
          <Input label={`Front (${unit})`} type="number" min="0" step="0.5" value={form.setbacks.front} onChange={(e) => setSetback("front", e.target.value)} />
          <Input label={`Back (${unit})`}  type="number" min="0" step="0.5" value={form.setbacks.back}  onChange={(e) => setSetback("back",  e.target.value)} />
          <Input label={`Left (${unit})`}  type="number" min="0" step="0.5" value={form.setbacks.left}  onChange={(e) => setSetback("left",  e.target.value)} />
          <Input label={`Right (${unit})`} type="number" min="0" step="0.5" value={form.setbacks.right} onChange={(e) => setSetback("right", e.target.value)} />
        </div>
      </div>

      {/* Summary card */}
      {totalArea > 0 && (
        <div style={{ borderRadius:14,background:"linear-gradient(135deg,rgba(30,136,229,0.08),rgba(0,188,212,0.06))",border:"1px solid rgba(30,136,229,0.18)",padding:"1rem 1.25rem",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem" }}>
          <div>
            <p style={{ fontSize:"0.65rem",textTransform:"uppercase",letterSpacing:"0.07em",color:"#1E88E5",fontWeight:800,marginBottom:"0.3rem" }}>Total plot</p>
            <p style={{ fontFamily:"'Syne',sans-serif",fontSize:"1.1rem",fontWeight:800,color:"#1a252f" }}>
              {totalArea.toFixed(1)} {form.plot.unit === "feet" ? "sq ft" : "m²"}
            </p>
          </div>
          <div>
            <p style={{ fontSize:"0.65rem",textTransform:"uppercase",letterSpacing:"0.07em",color:"#1E88E5",fontWeight:800,marginBottom:"0.3rem" }}>Buildable area</p>
            <p style={{ fontFamily:"'Syne',sans-serif",fontSize:"1.1rem",fontWeight:800,color:"#1a252f" }}>
              {buildableArea > 0 ? `${buildableArea.toFixed(1)} ${form.plot.unit === "feet" ? "sq ft" : "m²"}` : "Setbacks too large"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}