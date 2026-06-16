// import Input from "../ui/Input";

const BEDROOM_SIZES = [
  { value:"master", label:"Master" },
  { value:"medium", label:"Medium" },
  { value:"small",  label:"Small"  },
];

const ROOM_TYPES = [
  { key:"bedroom",  label:"Bedrooms",     hasSize:true  },
  { key:"bathroom", label:"Bathrooms",    hasSize:false },
  { key:"kitchen",  label:"Kitchen",      hasSize:false, max:2 },
  { key:"living",   label:"Living Room",  hasSize:false, max:1 },
  { key:"dining",   label:"Dining",       hasSize:false, max:1 },
  { key:"drawing",  label:"Drawing Room", hasSize:false, max:1 },
  { key:"study",    label:"Study",        hasSize:false, max:2 },
  { key:"store",    label:"Store Room",   hasSize:false, max:2 },
];

const panel = {
  background:"rgba(255,255,255,0.75)",
  border:"1px solid rgba(200,215,225,0.5)",
  borderRadius:"16px",
  padding:"1.25rem 1.4rem",
  marginBottom:"1.25rem",
};

const counterBtn = (disabled) => ({
  width:30,height:30,borderRadius:8,
  border:"1.5px solid rgba(200,215,225,0.7)",
  background: disabled ? "rgba(200,215,225,0.15)" : "rgba(255,255,255,0.8)",
  color: disabled ? "#90A4AE" : "#1a252f",
  cursor: disabled ? "not-allowed" : "pointer",
  fontSize:"1rem",fontWeight:700,
  display:"flex",alignItems:"center",justifyContent:"center",
  transition:"all 0.2s",fontFamily:"inherit",
});

export default function Step2Rooms({ form, setForm, errors }) {
  const setCount = (key, value) => {
    const newCount = Math.max(0, value);
    const next = { ...form, roomCounts: { ...form.roomCounts, [key]: newCount } };
    if (key === "bedroom") {
      const sizes = [...(form.bedroomSizes || [])];
      while (sizes.length < newCount) sizes.push("medium");
      while (sizes.length > newCount) sizes.pop();
      next.bedroomSizes = sizes;
    }
    setForm(next);
  };

  const setBedroomSize = (idx, size) => {
    const sizes = [...(form.bedroomSizes || [])];
    sizes[idx] = size;
    setForm({ ...form, bedroomSizes: sizes });
  };

  return (
    <div>
      <div style={{ marginBottom:"1.5rem" }}>
        <h2 style={{ fontFamily:"'Syne',sans-serif",fontSize:"1.2rem",fontWeight:800,color:"#1a252f",letterSpacing:"-0.03em" }}>Rooms</h2>
        <p style={{ fontSize:"0.85rem",color:"#546E7A",marginTop:"0.2rem" }}>How many of each room do you need? Set to 0 to skip.</p>
      </div>

      {errors.rooms && (
        <div style={{ padding:"0.75rem 1rem",borderRadius:12,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",color:"#dc2626",fontSize:"0.82rem",fontWeight:500,marginBottom:"1rem" }}>
          {errors.rooms}
        </div>
      )}

      {/* Room counters */}
      <div style={panel}>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.65rem" }}>
          {ROOM_TYPES.map((r) => {
            const count = form.roomCounts?.[r.key] || 0;
            return (
              <div key={r.key} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0.7rem 0.9rem",borderRadius:12,background:"rgba(255,255,255,0.6)",border:"1.5px solid rgba(200,215,225,0.4)",transition:"border-color 0.2s",borderColor: count > 0 ? "rgba(30,136,229,0.3)" : "rgba(200,215,225,0.4)" }}>
                <span style={{ fontSize:"0.82rem",fontWeight:600,color: count > 0 ? "#1a252f" : "#546E7A" }}>{r.label}</span>
                <div style={{ display:"flex",alignItems:"center",gap:"0.5rem" }}>
                  <button type="button" onClick={() => setCount(r.key, count - 1)} style={counterBtn(count === 0)}>−</button>
                  <span style={{ width:22,textAlign:"center",fontSize:"0.9rem",fontWeight:800,color:"#1a252f" }}>{count}</span>
                  <button type="button" onClick={() => setCount(r.key, count + 1)} disabled={r.max && count >= r.max} style={counterBtn(r.max && count >= r.max)}>+</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bedroom sizes */}
      {form.roomCounts?.bedroom > 0 && (
        <div style={panel}>
          <h3 style={{ fontSize:"0.9rem",fontWeight:800,color:"#1a252f",marginBottom:"0.25rem" }}>Bedroom sizes</h3>
          <p style={{ fontSize:"0.75rem",color:"#546E7A",marginBottom:"1rem" }}>Pick a size for each bedroom. Master rooms get more floor space.</p>
          <div style={{ display:"flex",flexDirection:"column",gap:"0.65rem" }}>
            {Array.from({ length: form.roomCounts.bedroom }).map((_, idx) => (
              <div key={idx} style={{ display:"flex",alignItems:"center",gap:"0.75rem" }}>
                <span style={{ fontSize:"0.8rem",color:"#546E7A",fontWeight:600,width:80,flexShrink:0 }}>Bedroom {idx + 1}</span>
                <div style={{ display:"flex",gap:"0.4rem",flex:1 }}>
                  {BEDROOM_SIZES.map((s) => (
                    <button key={s.value} type="button" onClick={() => setBedroomSize(idx, s.value)}
                      style={{
                        flex:1,padding:"0.45rem 0.5rem",borderRadius:10,fontSize:"0.78rem",fontWeight:700,
                        border:"1.5px solid",cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s",
                        background: form.bedroomSizes?.[idx] === s.value ? "linear-gradient(135deg,#1E88E5,#00BCD4)" : "rgba(255,255,255,0.7)",
                        borderColor: form.bedroomSizes?.[idx] === s.value ? "transparent" : "rgba(200,215,225,0.5)",
                        color: form.bedroomSizes?.[idx] === s.value ? "white" : "#546E7A",
                        boxShadow: form.bedroomSizes?.[idx] === s.value ? "0 3px 10px rgba(30,136,229,0.25)" : "none",
                      }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floors */}
      <div style={panel}>
        <h3 style={{ fontSize:"0.9rem",fontWeight:800,color:"#1a252f",marginBottom:"1rem" }}>Number of floors</h3>
        <div style={{ display:"flex",alignItems:"center",gap:"0.75rem" }}>
          <span style={{ fontSize:"0.85rem",color:"#546E7A",fontWeight:600 }}>Floors</span>
          <div style={{ display:"flex",alignItems:"center",gap:"0.5rem" }}>
            <button type="button" onClick={() => setForm({ ...form, floors: Math.max(1,(form.floors||1)-1) })} style={counterBtn((form.floors||1) <= 1)}>−</button>
            <span style={{ width:28,textAlign:"center",fontSize:"1rem",fontWeight:800,color:"#1a252f" }}>{form.floors||1}</span>
            <button type="button" onClick={() => setForm({ ...form, floors: Math.min(5,(form.floors||1)+1) })} style={counterBtn((form.floors||1) >= 5)}>+</button>
          </div>
        </div>
      </div>
    </div>
  );
}