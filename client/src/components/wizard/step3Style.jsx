const KITCHEN_TYPES = [
  { value:"open",   label:"Open Kitchen",   desc:"Connected to living/dining" },
  { value:"closed", label:"Closed Kitchen", desc:"Separate enclosed space"    },
];
const DRAWING_TYPES = [
  { value:"closed", label:"Closed", desc:"Separate room with door" },
  { value:"open",   label:"Open",   desc:"Open to main area"       },
  { value:"none",   label:"None",   desc:"No drawing room"         },
];
const CONNECTIVITY = [
  { key:"kitchenDining", label:"Kitchen & Dining", options:[{value:"connected",label:"Connected"},{value:"separate",label:"Separate"}] },
  { key:"bathroom",      label:"Bathrooms",        options:[{value:"attached",label:"All attached"},{value:"common",label:"All common"},{value:"mixed",label:"Mixed"}] },
  { key:"drawingRoom",   label:"Drawing Room",     options:[{value:"separate-entrance",label:"Separate entrance"},{value:"connected-to-lounge",label:"Connected to lounge"}] },
  { key:"bedroomNear",   label:"Bedrooms near",    options:[{value:"any",label:"Any"},{value:"living-room",label:"Living room"},{value:"kitchen",label:"Kitchen"}] },
];

const panel = {
  background:"rgba(255,255,255,0.75)",
  border:"1px solid rgba(200,215,225,0.5)",
  borderRadius:"16px",
  padding:"1.25rem 1.4rem",
  marginBottom:"1.25rem",
};

const optBtn = (active) => ({
  padding:"0.45rem 1rem",borderRadius:"999px",fontSize:"0.8rem",fontWeight:700,
  border:"1.5px solid",cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s",
  background: active ? "linear-gradient(135deg,#1E88E5,#00BCD4)" : "rgba(255,255,255,0.7)",
  borderColor: active ? "transparent" : "rgba(200,215,225,0.5)",
  color: active ? "white" : "#546E7A",
  boxShadow: active ? "0 3px 10px rgba(30,136,229,0.25)" : "none",
});

export default function Step3Style({ form, setForm }) {
  const set     = (key, value) => setForm({ ...form, [key]: value });
  const setConn = (key, value) => setForm({ ...form, connectivity:{ ...form.connectivity, [key]: value } });

  return (
    <div>
      <div style={{ marginBottom:"1.5rem" }}>
        <h2 style={{ fontFamily:"'Syne',sans-serif",fontSize:"1.2rem",fontWeight:800,color:"#1a252f",letterSpacing:"-0.03em" }}>Style & Connectivity</h2>
        <p style={{ fontSize:"0.85rem",color:"#546E7A",marginTop:"0.2rem" }}>How should rooms connect and flow into each other?</p>
      </div>

      {/* Kitchen style */}
      <div style={panel}>
        <h3 style={{ fontSize:"0.9rem",fontWeight:800,color:"#1a252f",marginBottom:"0.9rem" }}>Kitchen style</h3>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.65rem" }}>
          {KITCHEN_TYPES.map((k) => (
            <button key={k.value} type="button" onClick={() => set("kitchenType", k.value)}
              style={{ padding:"0.85rem 1rem",borderRadius:14,border:"1.5px solid",cursor:"pointer",textAlign:"left",transition:"all 0.2s",fontFamily:"inherit",
                background: form.kitchenType === k.value ? "linear-gradient(135deg,rgba(30,136,229,0.1),rgba(0,188,212,0.07))" : "rgba(255,255,255,0.6)",
                borderColor: form.kitchenType === k.value ? "rgba(30,136,229,0.4)" : "rgba(200,215,225,0.4)",
              }}>
              <p style={{ fontSize:"0.85rem",fontWeight:800,color:"#1a252f",marginBottom:"0.2rem" }}>{k.label}</p>
              <p style={{ fontSize:"0.72rem",color:"#546E7A" }}>{k.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Drawing room */}
      <div style={panel}>
        <h3 style={{ fontSize:"0.9rem",fontWeight:800,color:"#1a252f",marginBottom:"0.9rem" }}>Drawing room</h3>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0.65rem" }}>
          {DRAWING_TYPES.map((d) => (
            <button key={d.value} type="button" onClick={() => set("drawingRoomType", d.value)}
              style={{ padding:"0.85rem 0.75rem",borderRadius:14,border:"1.5px solid",cursor:"pointer",textAlign:"left",transition:"all 0.2s",fontFamily:"inherit",
                background: form.drawingRoomType === d.value ? "linear-gradient(135deg,rgba(30,136,229,0.1),rgba(0,188,212,0.07))" : "rgba(255,255,255,0.6)",
                borderColor: form.drawingRoomType === d.value ? "rgba(30,136,229,0.4)" : "rgba(200,215,225,0.4)",
              }}>
              <p style={{ fontSize:"0.82rem",fontWeight:800,color:"#1a252f",marginBottom:"0.2rem" }}>{d.label}</p>
              <p style={{ fontSize:"0.7rem",color:"#546E7A" }}>{d.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Staircase — only if multi-floor */}
      {form.floors > 1 && (
        <div style={panel}>
          <h3 style={{ fontSize:"0.9rem",fontWeight:800,color:"#1a252f",marginBottom:"0.9rem" }}>Staircase type</h3>
          <div style={{ display:"flex",gap:"0.5rem",flexWrap:"wrap" }}>
            {["straight","L-shape","U-shape"].map((s) => (
              <button key={s} type="button" onClick={() => setForm({ ...form, staircaseType:s })}
                style={optBtn(form.staircaseType === s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Connectivity */}
      <div style={panel}>
        <h3 style={{ fontSize:"0.9rem",fontWeight:800,color:"#1a252f",marginBottom:"1rem" }}>Adjacency rules</h3>
        <div style={{ display:"flex",flexDirection:"column",gap:"1rem" }}>
          {CONNECTIVITY.map((c) => (
            <div key={c.key}>
              <p style={{ fontSize:"0.8rem",fontWeight:700,color:"#546E7A",marginBottom:"0.5rem" }}>{c.label}</p>
              <div style={{ display:"flex",gap:"0.4rem",flexWrap:"wrap" }}>
                {c.options.map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setConn(c.key, opt.value)}
                    style={optBtn(form.connectivity?.[c.key] === opt.value)}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Extras toggles */}
      <div style={panel}>
        <h3 style={{ fontSize:"0.9rem",fontWeight:800,color:"#1a252f",marginBottom:"1rem" }}>Extras</h3>
        <div style={{ display:"flex",flexDirection:"column",gap:"0.75rem" }}>
          {[{key:"hasGarage",label:"Garage"},{key:"hasStoreRoom",label:"Store room"}].map((item) => (
            <div key={item.key} style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
              <span style={{ fontSize:"0.85rem",fontWeight:600,color:"#546E7A" }}>{item.label}</span>
              <button type="button" onClick={() => setForm({ ...form, [item.key]:!form[item.key] })}
                style={{ width:44,height:24,borderRadius:999,border:"none",cursor:"pointer",position:"relative",transition:"background 0.25s",
                  background: form[item.key] ? "linear-gradient(135deg,#1E88E5,#00BCD4)" : "rgba(144,164,174,0.25)",
                }}>
                <span style={{ position:"absolute",top:2,width:20,height:20,borderRadius:"50%",background:"white",boxShadow:"0 1px 4px rgba(0,0,0,0.15)",transition:"transform 0.25s",
                  transform: form[item.key] ? "translateX(22px)" : "translateX(2px)",
                }} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}