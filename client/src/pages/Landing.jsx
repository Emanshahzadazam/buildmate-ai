import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "../landing.css";

export default function Landing() {
  const cursorRef = useRef(null);
  const cursorDotRef = useRef(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    const cursorDot = cursorDotRef.current;

    const onMove = (e) => {
      cursor.style.left = e.clientX + "px";
      cursor.style.top = e.clientY + "px";
      cursorDot.style.left = e.clientX + "px";
      cursorDot.style.top = e.clientY + "px";
    };
    document.addEventListener("mousemove", onMove);

    const onMove2 = (e) => {
      const meshes = document.querySelectorAll(".gradient-mesh");
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      meshes.forEach((mesh, index) => {
        const speed = (index + 1) * 15;
        mesh.style.transform = `translate(${x * speed}px, ${y * speed}px)`;
      });
    };
    document.addEventListener("mousemove", onMove2);

    const links = document.querySelectorAll(".landing-root a, .landing-root button");
    const enterHandler = () => () => {
      cursor.style.transform = "translate(-50%, -50%) scale(1.5)";
      cursor.style.borderColor = "#FF9800";
    };
    const leaveHandler = () => {
      cursor.style.transform = "translate(-50%, -50%) scale(1)";
      cursor.style.borderColor = "#1E88E5";
    };
    links.forEach((el) => {
      el.addEventListener("mouseenter", enterHandler(el));
      el.addEventListener("mouseleave", leaveHandler);
    });

    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener("click", function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute("href"));
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mousemove", onMove2);
    };
  }, []);

  return (
    <div className="landing-root">
      {/* Custom Cursor */}
      <div className="l-cursor" ref={cursorRef}></div>
      <div className="l-cursor-dot" ref={cursorDotRef}></div>

      {/* Loading Overlay */}
      <div className="l-loading-overlay">
        <div className="l-loader"></div>
      </div>

      {/* ── NAVIGATION ── */}
      <nav className="l-nav">
        <div className="l-logo">BuildMate AI</div>
        <ul className="l-nav-links">
          <li><a href="#features">Features</a></li>
          <li><a href="#how-it-works">How It Works</a></li>
          <li><a href="#pricing">Pricing</a></li>
          <li><a href="#docs">Documentation</a></li>
        </ul>
        <Link to="/register" className="l-cta-nav">Get Started Free</Link>
      </nav>

      {/* ── HERO SECTION ── */}
      <section className="l-hero-section">
        {/* Blueprint Grid */}
        <div className="l-blueprint-grid">
          <svg className="l-grid-svg" viewBox="0 0 1920 1080">
            <defs>
              <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Gradient Meshes */}
        <div className="gradient-mesh mesh-1"></div>
        <div className="gradient-mesh mesh-2"></div>
        <div className="gradient-mesh mesh-3"></div>

        {/* Decorative Circles */}
        <div className="l-deco-circle l-circle-1"></div>
        <div className="l-deco-circle l-circle-2"></div>

        {/* Hero Container */}
        <div className="l-hero-container">
          {/* Left: Content */}
          <div className="l-hero-content">
            <h1 className="l-hero-headline">
              <span className="l-highlight">AI-Powered</span><br />
              Civil Engineering<br />
              Design
            </h1>
            <p className="l-hero-subheadline">
              Transform your requirements into construction-ready designs in seconds.
              Generate 2D floor plans, 3D models, and accurate cost estimates with intelligent automation.
            </p>
            <div className="l-cta-container">
              <Link to="/register" className="l-cta-primary">
                Start Designing Free
              </Link>
              <Link to="/login" className="l-cta-secondary">
                Log in ▶
              </Link>
            </div>
          </div>

          {/* Right: Video */}
          <div className="l-hero-visual">
            <div id="three-container">
              <video autoPlay muted loop playsInline>
                <source src="/videos/hero-video.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
            <div className="l-annotation l-anno-1">Real-time 3D Preview</div>
            <div className="l-annotation l-anno-2">Instant Cost Calculation</div>
            <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
              <line className="l-measure-line" x1="10%" y1="15%" x2="35%" y2="15%" />
              <line className="l-measure-line" x1="65%" y1="85%" x2="90%" y2="85%" />
            </svg>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="l-stats-bar">
          <div className="l-stat-item">
            <div className="l-stars">⭐ ⭐ ⭐ ⭐ ⭐</div>
            <p className="l-stat-description">Rated 5.0 on the App Store</p>
          </div>

          <div className="l-stat-item">
            <div className="l-users-wrapper">
              <div className="l-laurel">❨</div>
              <div className="l-users-content">
                <h2 className="l-stat-number">Free</h2>
                <p className="l-stat-description">during Early Access</p>
                <div className="l-avatar-group">
                  <img src="https://i.pravatar.cc/60?img=1" alt="" />
                  <img src="https://i.pravatar.cc/60?img=2" alt="" />
                  <img src="https://i.pravatar.cc/60?img=3" alt="" />
                  <img src="https://i.pravatar.cc/60?img=4" alt="" />
                </div>
              </div>
              <div className="l-laurel">❩</div>
            </div>
          </div>

          <div className="l-stat-item">
            <div className="l-country-tags">
              <span>Floor Plans</span>
              <span>2D Diagrams</span>
              <span>3D Models</span>
              <span>Cost Estimation</span>
            </div>
            <div className="l-country-badge">4 Tools in One</div>
          </div>
        </div>
      </section>

      {/* ── FEATURES SECTION ── */}
      <section className="l-features-section" id="features">
        <div className="l-features-header">
          <h2>Everything you need to<br /><span>design smarter</span></h2>
          <p>From floor plans to cost estimates — BuildMate AI turns your requirements into professional,
            construction-ready outputs in seconds.</p>
        </div>

        {/* 01: Floor Plan Generation */}
        <div className="l-feat-row">
          <div className="l-feat-text">
            <div className="l-feat-tag">
              <span className="l-feat-tag-num">01</span>
              <span className="l-feat-tag-line"></span>
              <span>Floor Plan Generation</span>
            </div>
            <h3>Smart layout generation from prompts or requirements</h3>
            <p className="l-feat-sub">Describe your space — let AI design it instantly.</p>
            <ul className="l-feat-bullets">
              <li>Optimize room flow, zoning, and functional areas automatically</li>
              <li>Improve natural lighting, ventilation, and circulation paths</li>
              <li>Preview multiple layout options side-by-side in seconds</li>
            </ul>
          </div>
          <div className="l-feat-visual">
            <div className="l-feat-card">
              <div className="l-ba-grid">
                <div className="l-ba-half">
                  <span className="l-ba-label">Before</span>
                  <img src="https://images.unsplash.com/photo-1580674684081-7617fbf3d745?w=600&h=450&fit=crop&q=80" alt="Hand-sketched floor plan" loading="lazy" />
                </div>
                <div className="l-ba-half">
                  <span className="l-ba-label">After</span>
                  <img src="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=260&fit=crop&q=80" alt="AI floor plan" loading="lazy" />
                </div>
              </div>
            </div>
            <div className="l-feat-anno l-feat-anno--tr">AI-optimised layout</div>
            <div className="l-feat-anno l-feat-anno--bl">Instant multi-option preview</div>
          </div>
        </div>

        {/* 02: 2D Technical Diagrams */}
        <div className="l-feat-row l-feat-row--flip">
          <div className="l-feat-text">
            <div className="l-feat-tag">
              <span className="l-feat-tag-num">02</span>
              <span className="l-feat-tag-line"></span>
              <span>2D Technical Diagrams</span>
            </div>
            <h3>Accurate construction drawings, auto-generated</h3>
            <p className="l-feat-sub">Professional-grade civil drawings without the manual drafting.</p>
            <ul className="l-feat-bullets">
              <li>Generate dimensioned elevation and section views in one click</li>
              <li>Produce construction-ready drawing sets that meet standards</li>
              <li>Explore multiple structural and design variants instantly</li>
            </ul>
          </div>
          <div className="l-feat-visual">
            <div className="l-feat-card">
              <div className="l-triple-strip">
                <div className="l-triple-panel">
                  <img src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=500&fit=crop&q=80" alt="Elevation drawing" loading="lazy" />
                  <span className="l-triple-panel-label">Elevation View</span>
                </div>
                <div className="l-triple-panel">
                  <img src="https://images.unsplash.com/photo-1572120360610-d971b9d7767c?w=400&h=500&fit=crop&q=80" alt="Section view" loading="lazy" />
                  <span className="l-triple-panel-label">Section View</span>
                </div>
                <div className="l-triple-panel">
                  <img src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=500&fit=crop&q=80" alt="Structural plan" loading="lazy" />
                  <span className="l-triple-panel-label">Structural Plan</span>
                </div>
              </div>
            </div>
            <div className="l-feat-anno l-feat-anno--tr">Standards-compliant output</div>
          </div>
        </div>

        {/* 03: Cost Estimation */}
        <div className="l-feat-row">
          <div className="l-feat-text">
            <div className="l-feat-tag">
              <span className="l-feat-tag-num">03</span>
              <span className="l-feat-tag-line"></span>
              <span>Cost Estimation</span>
            </div>
            <h3>Plan smarter with AI-driven cost insights</h3>
            <p className="l-feat-sub">Get accurate material and labor estimates before a single brick is laid.</p>
            <ul className="l-feat-bullets">
              <li>Receive local material-based cost breakdowns automatically</li>
              <li>Identify cost-heavy elements with smart saving suggestions</li>
              <li>Compare alternative materials to stay within budget</li>
            </ul>
          </div>
          <div className="l-feat-visual">
            <div className="l-feat-card" style={{ aspectRatio: "unset", minHeight: "340px" }}>
              <div className="l-cost-visual-wrap">
                <div className="l-cost-visual-query">
                  <span>What's the cost estimate for a 2,000 sq ft build?</span>
                  <img src="https://i.pravatar.cc/60?img=47" alt="User" />
                </div>
                <div className="l-cost-table-card">
                  <div className="l-cost-table-title">🏗️&nbsp; Residential Build Estimate — 2,000 sq ft</div>
                  <table className="l-cost-tbl">
                    <thead>
                      <tr><th>Item</th><th>Estimated Cost</th></tr>
                    </thead>
                    <tbody>
                      <tr><td>Foundation &amp; Structure</td><td>$42,000</td></tr>
                      <tr><td>Masonry &amp; Brickwork</td><td>$28,500</td></tr>
                      <tr><td>Roofing</td><td>$18,000</td></tr>
                      <tr><td>Electrical &amp; Plumbing</td><td>$22,000</td></tr>
                      <tr><td>Flooring &amp; Finishes</td><td>$19,500</td></tr>
                      <tr><td>Labor</td><td>$35,000</td></tr>
                    </tbody>
                    <tfoot>
                      <tr><td>Total</td><td>$165,000</td></tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
            <div className="l-feat-anno l-feat-anno--tr">Local material pricing</div>
          </div>
        </div>

        {/* 04: 3D Model Generation */}
        <div className="l-feat-row l-feat-row--flip">
          <div className="l-feat-text">
            <div className="l-feat-tag">
              <span className="l-feat-tag-num">04</span>
              <span className="l-feat-tag-line"></span>
              <span>3D Model Generation</span>
            </div>
            <h3>Visualise and present with confidence</h3>
            <p className="l-feat-sub">Transform 2D designs into photorealistic 3D models instantly.</p>
            <ul className="l-feat-bullets">
              <li>Generate full 3D walkthroughs from any floor plan automatically</li>
              <li>AI applies materials, textures, and lighting in real time</li>
              <li>Export model-ready files for presentations or construction</li>
            </ul>
          </div>
          <div className="l-feat-visual">
            <div className="l-feat-card">
              <div className="l-threed-visual">
                <div className="l-threed-grid"></div>
                <div className="l-threed-content">
                  <svg viewBox="0 0 280 260" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ width: "clamp(180px,22vw,260px)", height: "auto" }}>
                    <ellipse cx="140" cy="250" rx="90" ry="9" fill="rgba(0,0,0,0.28)" />
                    <polygon points="210,60 248,36 248,210 210,230" fill="rgba(0,188,212,0.12)" stroke="rgba(0,188,212,0.55)" strokeWidth="1.2" />
                    <polygon points="72,60 110,36 248,36 210,60" fill="rgba(30,136,229,0.1)" stroke="rgba(30,136,229,0.45)" strokeWidth="1.2" />
                    <rect x="72" y="60" width="138" height="170" fill="rgba(30,136,229,0.18)" stroke="rgba(30,136,229,0.85)" strokeWidth="1.5" />
                    <polygon points="141,10 210,60 72,60" fill="rgba(0,188,212,0.32)" stroke="rgba(0,188,212,0.9)" strokeWidth="1.5" />
                    <line x1="72" y1="60" x2="210" y2="60" stroke="rgba(0,188,212,0.5)" strokeWidth="0.8" />
                    <rect x="170" y="18" width="14" height="26" rx="1" fill="rgba(30,136,229,0.3)" stroke="rgba(30,136,229,0.7)" strokeWidth="1" />
                    <rect x="168" y="14" width="18" height="6" rx="1" fill="rgba(30,136,229,0.5)" stroke="rgba(30,136,229,0.85)" strokeWidth="1" />
                    <rect x="86" y="80" width="28" height="26" rx="2" fill="rgba(255,152,0,0.55)" stroke="rgba(255,152,0,0.95)" strokeWidth="1.2" />
                    <line x1="100" y1="80" x2="100" y2="106" stroke="rgba(255,152,0,0.6)" strokeWidth="0.8" />
                    <line x1="86" y1="93" x2="114" y2="93" stroke="rgba(255,152,0,0.6)" strokeWidth="0.8" />
                    <rect x="127" y="80" width="28" height="26" rx="2" fill="rgba(255,152,0,0.55)" stroke="rgba(255,152,0,0.95)" strokeWidth="1.2" />
                    <line x1="141" y1="80" x2="141" y2="106" stroke="rgba(255,152,0,0.6)" strokeWidth="0.8" />
                    <line x1="127" y1="93" x2="155" y2="93" stroke="rgba(255,152,0,0.6)" strokeWidth="0.8" />
                    <rect x="168" y="80" width="28" height="26" rx="2" fill="rgba(255,152,0,0.55)" stroke="rgba(255,152,0,0.95)" strokeWidth="1.2" />
                    <line x1="182" y1="80" x2="182" y2="106" stroke="rgba(255,152,0,0.6)" strokeWidth="0.8" />
                    <line x1="168" y1="93" x2="196" y2="93" stroke="rgba(255,152,0,0.6)" strokeWidth="0.8" />
                    <rect x="86" y="122" width="28" height="26" rx="2" fill="rgba(255,152,0,0.32)" stroke="rgba(255,152,0,0.65)" strokeWidth="1" />
                    <line x1="100" y1="122" x2="100" y2="148" stroke="rgba(255,152,0,0.35)" strokeWidth="0.7" />
                    <line x1="86" y1="135" x2="114" y2="135" stroke="rgba(255,152,0,0.35)" strokeWidth="0.7" />
                    <rect x="168" y="122" width="28" height="26" rx="2" fill="rgba(255,152,0,0.32)" stroke="rgba(255,152,0,0.65)" strokeWidth="1" />
                    <line x1="182" y1="122" x2="182" y2="148" stroke="rgba(255,152,0,0.35)" strokeWidth="0.7" />
                    <line x1="168" y1="135" x2="196" y2="135" stroke="rgba(255,152,0,0.35)" strokeWidth="0.7" />
                    <rect x="118" y="162" width="46" height="68" rx="3" fill="rgba(30,136,229,0.38)" stroke="rgba(30,136,229,0.9)" strokeWidth="1.5" />
                    <path d="M118,168 Q141,155 164,168" fill="none" stroke="rgba(30,136,229,0.7)" strokeWidth="1" />
                    <circle cx="158" cy="197" r="2.5" fill="rgba(255,152,0,0.9)" />
                    <line x1="127" y1="175" x2="127" y2="228" stroke="rgba(30,136,229,0.3)" strokeWidth="0.7" />
                    <line x1="155" y1="175" x2="155" y2="228" stroke="rgba(30,136,229,0.3)" strokeWidth="0.7" />
                    <rect x="112" y="228" width="58" height="7" rx="1" fill="rgba(30,136,229,0.22)" stroke="rgba(30,136,229,0.5)" strokeWidth="1" />
                    <rect x="118" y="235" width="46" height="6" rx="1" fill="rgba(30,136,229,0.15)" stroke="rgba(30,136,229,0.35)" strokeWidth="0.8" />
                    <line x1="58" y1="60" x2="58" y2="230" stroke="rgba(255,152,0,0.55)" strokeWidth="1" strokeDasharray="4 3" />
                    <line x1="54" y1="60" x2="62" y2="60" stroke="rgba(255,152,0,0.55)" strokeWidth="1" />
                    <line x1="54" y1="230" x2="62" y2="230" stroke="rgba(255,152,0,0.55)" strokeWidth="1" />
                    <line x1="72" y1="244" x2="210" y2="244" stroke="rgba(255,152,0,0.45)" strokeWidth="1" strokeDasharray="4 3" />
                    <line x1="72" y1="240" x2="72" y2="248" stroke="rgba(255,152,0,0.45)" strokeWidth="1" />
                    <line x1="210" y1="240" x2="210" y2="248" stroke="rgba(255,152,0,0.45)" strokeWidth="1" />
                    <circle cx="226" cy="80" r="1.5" fill="rgba(0,188,212,0.5)" />
                    <circle cx="226" cy="110" r="1.5" fill="rgba(0,188,212,0.5)" />
                    <circle cx="226" cy="140" r="1.5" fill="rgba(0,188,212,0.5)" />
                    <circle cx="226" cy="170" r="1.5" fill="rgba(0,188,212,0.5)" />
                  </svg>
                  <div className="l-threed-badge">Live 3D Preview</div>
                </div>
              </div>
            </div>
            <div className="l-feat-anno l-feat-anno--tr">Real-time rendering</div>
            <div className="l-feat-anno l-feat-anno--bl">Export-ready file formats</div>
          </div>
        </div>

        <div className="l-features-cta-wrap">
          <Link to="/register">Start Designing Free</Link>
        </div>
      </section>

      {/* ── COMMUNITY SECTION ── */}
      <section className="l-community-section" id="community">
        <div className="l-community-inner">
          {/* Left: fanned project cards */}
          <div className="l-comm-stack">
            <div className="l-comm-card l-comm-card-1">
              <img className="l-comm-card-img" src="https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&h=260&fit=crop&q=80" alt="Community house project" loading="lazy" />
              <div className="l-comm-card-body">
                <div className="l-comm-card-title">Modern villa with open terrace — 4 bed</div>
                <div className="l-comm-card-footer">
                  <div className="l-comm-card-author">
                    <img src="https://i.pravatar.cc/40?img=7" alt="Omar" /> Omar K.
                  </div>
                  <div className="l-comm-card-likes">♥ 1.9k</div>
                </div>
              </div>
            </div>

            <div className="l-comm-card l-comm-card-2">
              <img className="l-comm-card-img" src="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=260&fit=crop&q=80" alt="Community villa project" loading="lazy" />
              <div className="l-comm-card-body">
                <div className="l-comm-card-title">Mixed-use commercial block — G+5 floors</div>
                <div className="l-comm-card-footer">
                  <div className="l-comm-card-author">
                    <img src="https://i.pravatar.cc/40?img=12" alt="Sara" /> Sara M.
                  </div>
                  <div className="l-comm-card-likes">♥ 2.1k</div>
                </div>
              </div>
            </div>

            <div className="l-comm-card l-comm-card-3">
              <img className="l-comm-card-img" src="https://images.unsplash.com/photo-1576941089067-2de3c901e126?w=400&h=260&fit=crop&q=80" alt="Community building project" loading="lazy" />
              <div className="l-comm-card-body">
                <div className="l-comm-card-title">Minimalist family home — cost under $120k</div>
                <div className="l-comm-card-footer">
                  <div className="l-comm-card-author">
                    <img src="https://i.pravatar.cc/40?img=5" alt="Ahmed" /> Ahmed R.
                  </div>
                  <div className="l-comm-card-likes">♥ 1.5k</div>
                </div>
              </div>
            </div>

            <div className="l-comm-card l-comm-card-front">
              <img className="l-comm-card-img" src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=500&h=320&fit=crop&q=80" alt="Featured community project" loading="lazy" />
              <div className="l-comm-card-body">
                <div className="l-comm-card-title">Duplex with rooftop terrace &amp; open-plan layout</div>
                <div className="l-comm-card-footer">
                  <div className="l-comm-card-author">
                    <img src="https://i.pravatar.cc/40?img=32" alt="Zara" /> Zara T.
                  </div>
                  <div className="l-comm-card-likes">♥ 3.2k</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: text */}
          <div className="l-community-text">
            <h2>Community</h2>
            <p>
              Welcome to the BuildMate AI project community — where engineers, architects, and developers share
              stunning designs, swap ideas, and inspire one another. Browse real projects from real users, or
              showcase your own work and get feedback from thousands of professionals worldwide.
            </p>
            <div className="l-community-stats">
              <div>
                <span className="l-comm-stat-num">12K+</span>
                <span className="l-comm-stat-label">Projects Shared</span>
              </div>
              <div>
                <span className="l-comm-stat-num">8K+</span>
                <span className="l-comm-stat-label">Active Members</span>
              </div>
              <div>
                <span className="l-comm-stat-num">160+</span>
                <span className="l-comm-stat-label">Countries</span>
              </div>
            </div>
            <Link to="/register" className="l-community-cta">Get Started for Free</Link>
          </div>
        </div>
      </section>
    </div>
  );
}