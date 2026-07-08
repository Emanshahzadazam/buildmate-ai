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
      alignItems: "center",
      justifyContent: "space-between",
      background: "rgba(255,255,255,0.82)",
      backdropFilter: "blur(20px) saturate(180%)",
      WebkitBackdropFilter: "blur(20px) saturate(180%)",
      border: "1px solid rgba(255,255,255,0.45)",
      borderRadius: "20px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.07)",
    }}
  >
    {/* Left - Logo */}
    <Link
      to={user ? "/dashboard" : "/"}
      style={{
        fontFamily: "'Syne', sans-serif",
        fontSize: "1.3rem",
        fontWeight: 800,
        background: "linear-gradient(135deg, #1E88E5, #FF9800)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        textDecoration: "none",
      }}
    >
      BuildMate AI
    </Link>

    {/* Center Navigation */}
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        gap: "2rem",
      }}
    >
      <NavLink
        to="/"
        style={({ isActive }) => ({
          textDecoration: "none",
          fontWeight: 700,
          fontSize: "0.9rem",
          color: isActive ? "#1E88E5" : "#546E7A",
        })}
      >
        Home
      </NavLink>

      <a
        href="#how-it-works"
        style={{
          textDecoration: "none",
          fontWeight: 700,
          fontSize: "0.9rem",
          color: "#546E7A",
        }}
      >
        How It Works
      </a>

      <a
        href="#features"
        style={{
          textDecoration: "none",
          fontWeight: 700,
          fontSize: "0.9rem",
          color: "#546E7A",
        }}
      >
        Features
      </a>
    </nav>

    {/* Right Side */}
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.8rem",
      }}
    >
      {user ? (
        <>
          <NavLink
            to="/dashboard"
            style={{
              textDecoration: "none",
              color: "#546E7A",
              fontWeight: 700,
            }}
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/archie"
            style={{
              textDecoration: "none",
              color: "#546E7A",
              fontWeight: 700,
            }}
          >
            🏗️ Archie
          </NavLink>

          <button
            onClick={handleLogout}
            style={{
              padding: "0.55rem 1.3rem",
              borderRadius: "999px",
              border: "none",
              background: "#1a252f",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Log out
          </button>
        </>
      ) : (
        <>
          <NavLink
            to="/login"
            style={{
              textDecoration: "none",
              color: "#546E7A",
              fontWeight: 700,
            }}
          >
            Log in
          </NavLink>

          <Link
            to="/register"
            style={{
              padding: "0.6rem 1.4rem",
              borderRadius: "999px",
              background: "linear-gradient(135deg, #1a252f, #0f1419)",
              color: "#fff",
              textDecoration: "none",
              fontWeight: 700,
              boxShadow: "0 5px 15px rgba(0,0,0,.18)",
            }}
          >
            Get Started
          </Link>
        </>
      )}
    </div>
  </header>
);
}