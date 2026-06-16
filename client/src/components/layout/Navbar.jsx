import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header
      style={{
        position: "fixed",
        top: "16px",
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(96%, 1400px)",
        zIndex: 100,
        padding: "0.75rem 1.5rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "rgba(255,255,255,0.82)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        border: "1px solid rgba(255,255,255,0.45)",
        borderRadius: "20px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.07)",
        gap: "1rem",
      }}
    >
      {/* Logo */}
      <Link
        to={user ? "/dashboard" : "/"}
        style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: "1.25rem",
          fontWeight: 800,
          background: "linear-gradient(135deg, #1E88E5, #FF9800)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          textDecoration: "none",
        }}
      >
        BuildMate AI
      </Link>

      {/* Nav links */}
      <nav style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        {user ? (
          <>
            <NavLink
              to="/dashboard"
              style={({ isActive }) => ({
                padding: "0.4rem 1rem",
                borderRadius: "999px",
                fontSize: "0.82rem",
                fontWeight: 700,
                textDecoration: "none",
                color: isActive ? "#1E88E5" : "#546E7A",
                background: isActive ? "rgba(30,136,229,0.1)" : "transparent",
                transition: "all 0.2s",
              })}
            >
              Dashboard
            </NavLink>

            <span
              style={{
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "#90A4AE",
                padding: "0 0.5rem",
              }}
            >
              {user.name}
            </span>

            <button
              onClick={handleLogout}
              style={{
                padding: "0.45rem 1.2rem",
                borderRadius: "999px",
                fontSize: "0.82rem",
                fontWeight: 700,
                border: "1px solid rgba(255,255,255,0.45)",
                background: "rgba(255,255,255,0.6)",
                color: "#546E7A",
                cursor: "pointer",
                transition: "all 0.2s",
                fontFamily: "inherit",
              }}
            >
              Log out
            </button>
          </>
        ) : (
          <>
            <NavLink
              to="/login"
              style={({ isActive }) => ({
                padding: "0.4rem 1rem",
                borderRadius: "999px",
                fontSize: "0.82rem",
                fontWeight: 700,
                textDecoration: "none",
                color: isActive ? "#1E88E5" : "#546E7A",
                background: isActive ? "rgba(30,136,229,0.1)" : "transparent",
                transition: "all 0.2s",
              })}
            >
              Log in
            </NavLink>

            <Link
              to="/register"
              style={{
                padding: "0.45rem 1.3rem",
                borderRadius: "999px",
                fontSize: "0.82rem",
                fontWeight: 800,
                textDecoration: "none",
                background: "linear-gradient(135deg, #1a252f, #0f1419)",
                color: "white",
                boxShadow: "0 4px 14px rgba(26,37,47,0.25)",
                transition: "all 0.3s",
              }}
            >
              Get Started
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}