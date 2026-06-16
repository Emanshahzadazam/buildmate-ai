export default function Footer() {
  return (
    <footer style={{
      background: "rgba(255,255,255,0.72)",
      backdropFilter: "blur(20px) saturate(180%)",
      WebkitBackdropFilter: "blur(20px) saturate(180%)",
      borderTop: "1px solid rgba(255,255,255,0.45)",
      boxShadow: "0 -4px 24px rgba(0,0,0,0.04)",
      marginTop: "auto",
    }}>
      <div style={{
        maxWidth: "1400px",
        margin: "0 auto",
        padding: "1.5rem 3%",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1rem",
        flexWrap: "wrap",
      }}>
        {/* Logo + copyright */}
        <div style={{ display:"flex",alignItems:"center",gap:"0.75rem" }}>
          <span style={{
            fontFamily:"'Syne',sans-serif",fontSize:"1rem",fontWeight:800,
            background:"linear-gradient(135deg,#1E88E5,#FF9800)",
            WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",
          }}>
            BuildMate AI
          </span>
          <span style={{ width:1,height:16,background:"rgba(144,164,174,0.35)" }} />
          <span style={{ fontSize:"0.78rem",color:"#90A4AE",fontWeight:500 }}>
            © {new Date().getFullYear()} Final Year Project, IIUI
          </span>
        </div>

        {/* Team */}
        <p style={{ fontSize:"0.78rem",color:"#90A4AE",fontWeight:500 }}>
          Built by{" "}
          <span style={{ color:"#546E7A",fontWeight:700 }}>Eman Shahzad</span>,{" "}
          <span style={{ color:"#546E7A",fontWeight:700 }}>Zaina Azam</span>,{" "}
          <span style={{ color:"#546E7A",fontWeight:700 }}>Eman Niaz</span>
        </p>
      </div>
    </footer>
  );
}