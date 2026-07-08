import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";

const BG = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "6rem 1.5rem 3rem",
  background:
    "radial-gradient(circle at 15% 50%, rgba(232,245,233,0.8) 0%, transparent 50%)," +
    "radial-gradient(circle at 85% 30%, rgba(255,248,225,0.8) 0%, transparent 50%)," +
    "linear-gradient(135deg,#E8F5E9 0%,#FFF8E1 50%,#FFE0B2 100%)",
  position: "relative",
  overflow: "hidden",
};

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email.includes("@")) e.email = "Valid email required";
    if (form.password.length < 6) e.password = "Min 6 characters";
    return e;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const e = validate();
    if (Object.keys(e).length) return setErrors(e);
    setSubmitting(true);
    try {
      const { data } = await api.post("/auth/register", form);
      login(data.token, data.user);
      navigate("/dashboard");
    } catch (err) {
      const msg = err.response?.data?.message || "Registration failed";
      setErrors({ form: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={BG}>
      <div style={{ position:"absolute",width:"400px",height:"400px",borderRadius:"50%",background:"radial-gradient(circle,rgba(30,136,229,0.2),transparent)",top:"-100px",right:"-80px",filter:"blur(60px)",pointerEvents:"none" }} />
      <div style={{ position:"absolute",width:"300px",height:"300px",borderRadius:"50%",background:"radial-gradient(circle,rgba(255,152,0,0.18),transparent)",bottom:"-60px",left:"-60px",filter:"blur(60px)",pointerEvents:"none" }} />

      <div style={{
        width: "100%",
        maxWidth: "440px",
        background: "rgba(255,255,255,0.82)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        border: "1px solid rgba(255,255,255,0.5)",
        borderRadius: "28px",
        padding: "2.5rem",
        boxShadow: "0 24px 64px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.7)",
        position: "relative",
        zIndex: 1,
      }}>
        <div style={{ marginBottom: "1.75rem" }}>
          <div style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: "1.1rem",
            fontWeight: 800,
            background: "linear-gradient(135deg,#1E88E5,#FF9800)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            marginBottom: "1rem",
          }}>
            BuildMate AI
          </div>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:"1.8rem", fontWeight:800, letterSpacing:"-0.04em", color:"#1a252f", lineHeight:1.1 }}>
            Create your account
          </h1>
          <p style={{ marginTop:"0.3rem", fontSize:"0.9rem", color:"#546E7A", fontWeight:500 }}>
            Start designing in under a minute.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
          <Input
            label="Full name"
            name="name"
            value={form.name}
            onChange={handleChange}
            error={errors.name}
            placeholder="Eman Shahzad"
          />
          <Input
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            error={errors.email}
            placeholder="you@example.com"
          />
          <Input
            label="Password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            error={errors.password}
            placeholder="At least 6 characters"
          />
          {errors.form && (
            <div style={{ padding:"0.75rem 1rem", borderRadius:"12px", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", color:"#dc2626", fontSize:"0.85rem", fontWeight:500 }}>
              {errors.form}
            </div>
          )}
          <Button type="submit" variant="primary" disabled={submitting} className="w-full mt-1">
            {submitting ? "Creating..." : "Create account →"}
          </Button>
        </form>

        <p style={{ marginTop:"1.5rem", fontSize:"0.85rem", color:"#546E7A", textAlign:"center" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color:"#1E88E5", fontWeight:700, textDecoration:"none" }}>
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}