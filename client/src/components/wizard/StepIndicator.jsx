export default function StepIndicator({ steps, currentStep }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
      {steps.map((step, idx) => {
        const stepNum = idx + 1;
        const isActive   = stepNum === currentStep;
        const isComplete = stepNum < currentStep;
        return (
          <div key={step} style={{ display:"flex", alignItems:"center", flex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:"0.6rem" }}>
              {/* Circle */}
              <div style={{
                width: 36, height: 36, borderRadius:"50%",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:"0.82rem", fontWeight:800, flexShrink:0,
                transition:"all 0.3s",
                background: isComplete
                  ? "linear-gradient(135deg,#1E88E5,#00BCD4)"
                  : isActive
                  ? "rgba(30,136,229,0.12)"
                  : "rgba(144,164,174,0.12)",
                color: isComplete ? "white" : isActive ? "#1E88E5" : "#90A4AE",
                boxShadow: isActive ? "0 0 0 3px rgba(30,136,229,0.2)" : "none",
              }}>
                {isComplete ? "✓" : stepNum}
              </div>
              {/* Label */}
              <span style={{
                fontSize:"0.8rem", fontWeight: isActive ? 700 : 500,
                color: isActive ? "#1a252f" : "#90A4AE",
                whiteSpace:"nowrap",
              }}>
                {step}
              </span>
            </div>
            {/* Connector line */}
            {idx < steps.length - 1 && (
              <div style={{
                flex:1, height:"1.5px", margin:"0 0.75rem",
                background: isComplete
                  ? "linear-gradient(90deg,#1E88E5,#00BCD4)"
                  : "rgba(144,164,174,0.25)",
                transition:"background 0.3s",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}