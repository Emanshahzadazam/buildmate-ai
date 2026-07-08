import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { archieApi } from "../lib/archieApi";
import "../components/archie/archie.css";

const SYSTEM = {
  budget: `You are Archie, an expert AI architectural consultant inside BuildMate AI — a construction planning app for Pakistan.
You specialise in Smart Budget & Material Optimisation.
When users share their cost estimate (e.g. "50 Lakhs budget, need to reduce to 40 Lakhs"), you:
- Suggest specific design changes: reduce wall thickness, shrink lounge/circulation areas, change material grades
- Give % or Lakh-based savings estimates for each suggestion
- Prioritise suggestions by impact: HIGH / MEDIUM / LOW
- Respect structural integrity — never suggest removing load-bearing elements
- Reference Pakistani construction context (PKR, Marla/Kanal plots, local materials: brick, RCC, ACC blocks, PCC flooring)
Format: clear headings, bullet points, cost impact labels. Be concise and actionable.`,

  bylaw: `You are Archie, an expert AI architectural consultant inside BuildMate AI.
You specialise in Architectural Bylaws & Building Code Compliance for Pakistan.
You help users cross-reference their 2D layouts with CDA (Capital Development Authority), LDA (Lahore Development Authority), and NESPAK guidelines.
Detect and explain violations like:
- Missing kitchen/bathroom ventilation
- Illegal building heights or FAR (Floor Area Ratio) violations
- Setback violations (front, side, rear margins)
- Unapproved parking ratios
- Missing fire exits or accessibility ramps
If user uploads a PDF bylaw document, reference it directly in answers.
Be precise: cite rule numbers when possible. Flag CRITICAL vs MINOR violations clearly.`,

  cad: `You are Archie, an expert AI architectural consultant inside BuildMate AI.
You specialise in Floor Plan Structuring & CAD Export Guidance.
Help users prepare layouts for export to AutoCAD (.dwg), ensuring the file opens correctly in external software.
Cover:
- Standard layer naming (A-WALL, A-DOOR, A-ANNO, A-FURN, etc.)
- Correct scales (1:50, 1:100, 1:200) and paper sizes (A0, A1)
- Block definitions, xrefs, linetype standards
- Drawing units (mm vs m) before export
- Common export errors and fixes
Give practical step-by-step instructions. Include AutoCAD command names where helpful.`,
};

// Each module maps to a real drafting pen — the page's visual signature.
const MODULES = {
  budget: { label: "Budget & Materials", sub: "Cost optimisation, Lakh-based savings", color: "#FF9800", pen: "Highlighter", icon: "💰" },
  bylaw: { label: "Bylaws & Compliance", sub: "CDA / LDA / NESPAK code checks", color: "#EF4444", pen: "Redline", icon: "📋" },
  cad: { label: "CAD & Export", sub: "Layers, scales, .dwg handoff", color: "#1E88E5", pen: "Blueprint ink", icon: "📐" },
};

const HINTS = {
  budget: ["Reduce by 10 Lakhs", "Suggest cheaper materials", "Shrink floor area 10%", "Brick vs AAC block cost"],
  bylaw: ["Check setback rules", "Ventilation requirements", "Max height CDA zone", "FAR calculation"],
  cad: ["Layer naming A-WALL", "Export scale 1:100", "Fix missing hatches", "Set drawing units mm"],
};

const QUICK_PROMPTS = [
  { icon: "💰", text: "My budget came out to 50 Lakhs but I only have 40 Lakhs. How do I reduce costs?" },
  { icon: "⚖️", text: "Check my floor plan for CDA bylaw violations — ventilation, setbacks, heights." },
  { icon: "📐", text: "What AutoCAD layers and scales should I use exporting at 1:100?" },
  { icon: "🧱", text: "What materials can I substitute to reduce construction cost?" },
];

function formatReply(text) {
  return text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/^### (.+)$/gm, '<div style="font-size:11px;font-weight:700;color:#1E88E5;margin-top:8px;text-transform:uppercase;">$1</div>')
    .replace(/^## (.+)$/gm, '<div style="font-size:13px;font-weight:800;margin-top:10px;">$1</div>')
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]*?<\/li>)+/g, (m) => `<ul>${m}</ul>`)
    .replace(/\n\n/g, "<br><br>")
    .replace(/\n/g, "<br>");
}

const readFileAsBase64 = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result.split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

export default function Archie() {
  const [mode, setMode] = useState("budget");
  const [history, setHistory] = useState([]);
  const [renderedMsgs, setRenderedMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const textareaRef = useRef(null);
  const canvasRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current) canvasRef.current.scrollTop = canvasRef.current.scrollHeight;
  }, [renderedMsgs, sending]);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 110) + "px";
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFiles = (e) => {
    const list = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...list]);
    e.target.value = "";
  };

  const removeFile = (name) => setFiles((prev) => prev.filter((f) => f.name !== name));

  const usePrompt = (text) => {
    setInput(text);
    setTimeout(() => sendMessage(text), 0);
  };

  const toggleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert("Voice input is only supported in Chrome or Edge.");
      return;
    }
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }
    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (e) => {
      setInput(e.results[0][0].transcript);
      setTimeout(autoResize, 0);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
  };

  const sendMessage = async (overrideText) => {
    const text = (overrideText ?? input).trim();
    const allFiles = files;
    if (!text && allFiles.length === 0) return;

    setInput("");
    setFiles([]);
    if (textareaRef.current) textareaRef.current.style.height = "46px";

    const fileNames = allFiles.map((f) => f.name).join(", ");
    const userDisplay = text || `(Attached: ${fileNames})`;
    setRenderedMsgs((prev) => [...prev, { role: "user", html: userDisplay.replace(/</g, "&lt;") }]);

    let userContent = [];
    for (const f of allFiles) {
      try {
        const b64 = await readFileAsBase64(f);
        if (f.type.startsWith("image/")) {
          userContent.push({ type: "image", source: { type: "base64", media_type: f.type, data: b64 } });
        } else if (f.type === "application/pdf") {
          userContent.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } });
        }
      } catch {
        // skip unreadable file
      }
    }
    if (text) userContent.push({ type: "text", text });
    if (userContent.length === 0) userContent = [{ type: "text", text: text || "Analyse attached files." }];

    const newHistory = [
      ...history,
      { role: "user", content: userContent.length === 1 && userContent[0].type === "text" ? text : userContent },
    ];
    setHistory(newHistory);
    setSending(true);

    try {
      const msgs = newHistory.slice(-12);
      const data = await archieApi.chat(SYSTEM[mode], msgs);

      if (data.error) {
        setRenderedMsgs((prev) => [...prev, { role: "bot", html: `⚠️ ${data.error.message}` }]);
      } else {
        const reply = data.content?.[0]?.text || "Sorry, no response received.";
        setHistory((h) => [...h, { role: "assistant", content: reply }]);
        setRenderedMsgs((prev) => [...prev, { role: "bot", html: formatReply(reply), mode }]);
      }
    } catch (err) {
      const message = err.response?.data?.error?.message || err.message || "Network error.";
      setRenderedMsgs((prev) => [...prev, { role: "bot", html: `⚠️ ${message}` }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="arc-page">
      <div className="arc-grid-overlay" />
      <div className="arc-blob-blue" />
      <div className="arc-blob-amber" />

      <div className="arc-header">
        <div>
          <div className="arc-header-eyebrow">BuildMate AI — Site Consultant</div>
          <h1>Ask <span>Archie</span></h1>
        </div>
        <Link to="/dashboard" className="arc-header-back">← Dashboard</Link>
      </div>

      <div className="arc-shell">
        {/* Sidebar */}
        <div className="arc-glass-panel arc-sidebar">
          <div className="arc-sidebar-label">Modules</div>
          {Object.entries(MODULES).map(([key, m]) => (
            <button
              key={key}
              className={`arc-module ${mode === key ? "active" : ""}`}
              onClick={() => setMode(key)}
            >
              <span className="arc-module-pen" style={{ background: m.color }} />
              <div>
                <div className="arc-module-title">{m.icon} {m.label}</div>
                <div className="arc-module-sub">{m.sub}</div>
                <span className="arc-module-badge" style={{ background: `${m.color}1A`, color: m.color }}>
                  {m.pen}
                </span>
              </div>
            </button>
          ))}

          <div className="arc-sidebar-hints">
            <div className="arc-sidebar-label">Try asking</div>
            {HINTS[mode].map((h) => (
              <button key={h} className="arc-hint" onClick={() => usePrompt(h)}>{h}</button>
            ))}
          </div>
        </div>

        {/* Chat column */}
        <div className="arc-glass-panel arc-main">
          <div className="arc-canvas" ref={canvasRef}>
            {renderedMsgs.length === 0 && (
              <div className="arc-welcome">
                <div className="arc-welcome-mark">🏗️</div>
                <h2>Hi, I'm <span>Archie</span></h2>
                <p>Your AI site consultant. Switch modules on the left, or start with one of these:</p>
                <div className="arc-quick-grid">
                  {QUICK_PROMPTS.map((q) => (
                    <div key={q.text} className="arc-quick-card" onClick={() => usePrompt(q.text)}>
                      <div className="arc-quick-icon">{q.icon}</div>
                      {q.text}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {renderedMsgs.map((m, i) => (
              <div key={i} className={`arc-msg ${m.role}`}>
                <div className={`arc-avatar ${m.role}`}>{m.role === "bot" ? "A" : "U"}</div>
                <div
                  className="arc-bubble"
                  style={m.role === "bot" ? { "--pen-color": MODULES[m.mode]?.color } : undefined}
                >
                  {m.role === "bot" && m.mode && (
                    <span
                      className="arc-pen-tag"
                      style={{ background: `${MODULES[m.mode].color}1A`, color: MODULES[m.mode].color }}
                    >
                      <span className="arc-pen-dot" style={{ background: MODULES[m.mode].color }} />
                      {MODULES[m.mode].label}
                    </span>
                  )}
                  {m.role === "bot" ? <div dangerouslySetInnerHTML={{ __html: m.html }} /> : m.html}
                </div>
              </div>
            ))}

            {sending && (
              <div className="arc-msg bot">
                <div className="arc-avatar bot">A</div>
                <div className="arc-bubble" style={{ "--pen-color": MODULES[mode].color }}>
                  <div className="arc-typing"><span /><span /><span /></div>
                </div>
              </div>
            )}
          </div>

          <div className="arc-ruler" />

          <div className="arc-input-bar">
            {files.length > 0 && (
              <div className="arc-attach-preview">
                {files.map((f) => (
                  <div key={f.name} className="arc-ap-item">
                    {f.type.includes("pdf") ? "📄" : f.type.includes("image") ? "🖼️" : "📎"} {f.name}
                    <button onClick={() => removeFile(f.name)}>✕</button>
                  </div>
                ))}
              </div>
            )}

            <div className="arc-input-row">
              <div className="arc-input-wrap">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  placeholder={`Ask Archie about ${MODULES[mode].label.toLowerCase()}…`}
                  value={input}
                  onChange={(e) => { setInput(e.target.value); autoResize(); }}
                  onKeyDown={handleKeyDown}
                />
                <div className="arc-input-tools">
                  <button
                    className={`arc-itool ${isRecording ? "recording" : ""}`}
                    onClick={toggleVoice}
                    title="Voice input"
                    type="button"
                  >
                    {isRecording ? "⏹️" : "🎤"}
                  </button>
                  <label className="arc-itool" title="Attach file" style={{ cursor: "pointer" }}>
                    📎
                    <input
                      type="file"
                      accept="image/*,.pdf,.txt"
                      multiple
                      style={{ display: "none" }}
                      onChange={handleFiles}
                    />
                  </label>
                </div>
              </div>
              <button className="arc-send-btn" onClick={() => sendMessage()} disabled={sending}>➤</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
