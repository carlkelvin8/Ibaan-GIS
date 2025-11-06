import React, { useMemo, useState } from "react";

export default function LoginPageUltra() {
  const [showPassword, setShowPassword] = useState(false);
  const [theme, setTheme] = useState("auto"); // 'auto' | 'light' | 'dark'
  const [pwd, setPwd] = useState("");

  // cosmetic password strength
  const strength = useMemo(() => {
    let s = 0;
    if (pwd.length >= 8) s++;
    if (/[A-Z]/.test(pwd)) s++;
    if (/[a-z]/.test(pwd)) s++;
    if (/\d/.test(pwd)) s++;
    if (/[^A-Za-z0-9]/.test(pwd)) s++;
    return Math.min(s, 4);
  }, [pwd]);

  return (
    <main
      className={`auth ${theme === "dark" ? "is-dark" : ""} ${
        theme === "light" ? "is-light" : ""
      }`}
    >
      {/* animated background */}
      <div className="bg-scene" aria-hidden>
        <div className="orb orb--1" />
        <div className="orb orb--2" />
        <div className="orb orb--3" />
        <div className="grain" />
      </div>

      {/* top bar */}
      <header className="topbar">
        <div className="brand">
          {/* brand icon (SVG) */}
          <svg
            className="brand__logo"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M12 2L15 8H9l3-6Zm0 20l-3-6h6l-3 6Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M2 12l6-3v6l-6-3Zm20 0l-6 3V9l6 3Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="brand__name">GeoPortal</span>
        </div>
        <div className="topbar__actions">
          <div className="theme">
            <button
              type="button"
              className={`chip ${theme === "auto" ? "chip--active" : ""}`}
              onClick={() => setTheme("auto")}
            >
              Auto
            </button>
            <button
              type="button"
              className={`chip ${theme === "light" ? "chip--active" : ""}`}
              onClick={() => setTheme("light")}
            >
              Light
            </button>
            <button
              type="button"
              className={`chip ${theme === "dark" ? "chip--active" : ""}`}
              onClick={() => setTheme("dark")}
            >
              Dark
            </button>
          </div>
        </div>
      </header>

      {/* login card */}
      <section className="card">


        <div className="card__head">
          <h1 className="card__title">Welcome back</h1>
          <p className="card__subtitle">Sign in to continue to your workspace</p>
        </div>

    
        {/* Form */}
        <form className="form" noValidate>
          <label className="field">
            <span className="field__label">Email</span>
            <span className="field__control">
              <span className="field__icon">
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2Zm0 4-8 5L4 8V6l8 5 8-5v2Z"
                  />
                </svg>
              </span>
              <input type="email" className="input" placeholder="you@example.com" required />
            </span>
          </label>

          <label className="field">
            <div className="field__row">
              <span className="field__label">Password</span>
              <button
                type="button"
                className="link link--sm"
                onClick={() => setShowPassword((s) => !s)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <span className="field__control">
              <span className="field__icon">
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M12 1a5 5 0 00-5 5v3H5a2 2 0 00-2 2v8a2 2 0 002 2h14a2 2 0 002-2v-8a2 2 0 00-2-2h-2V6a5 5 0 00-5-5Zm3 8H9V6a3 3 0 016 0v3Z"
                  />
                </svg>
              </span>
              <input
                type={showPassword ? "text" : "password"}
                className="input input--icon"
                placeholder="••••••••"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                required
              />
            </span>

            {/* Password strength bars */}
            <div className="meter" aria-hidden>
              <span className={`meter__bar ${strength >= 1 ? "is-on" : ""}`} />
              <span className={`meter__bar ${strength >= 2 ? "is-on" : ""}`} />
              <span className={`meter__bar ${strength >= 3 ? "is-on" : ""}`} />
              <span className={`meter__bar ${strength >= 4 ? "is-on" : ""}`} />
            </div>
          </label>

          <div className="row">
            <label className="check">
              <input type="checkbox" /> <span>Remember me</span>
            </label>
            <a href="/forgot-password" className="link">Forgot password?</a>
          </div>

          <button type="submit" className="btn btn--primary">Sign in</button>
        </form>

        <p className="foot">
          Don’t have an account? <a className="link" href="/register">Create one</a>
        </p>
      </section>
    {/* CSS in-file */}
    <style>{`
        /* ---------------------------
           THEME TOKENS
        --------------------------- */
        :root {
          --bg: #0c1022;
          --bg-rad1: rgba(124,58,237,.25);
          --bg-rad2: rgba(59,130,246,.22);
          --card: rgba(255,255,255,.10);
          --blur: blur(16px);
          --border: rgba(255,255,255,.16);
          --text: #e5e7eb;
          --muted: #a1a1aa;
          --brand: #8b5cf6;
          --brand-600: #7c3aed;
          --ring: rgba(139,92,246,.35);
          --success: #10b981;
          --shadow: 0 20px 60px rgba(2,6,23,.45);
          --radius-xl: 22px;
          --radius-lg: 16px;
          --radius-md: 12px;
        }
        /* Light override */
        .is-light :root, .auth.is-light {
          --bg: #f7f8ff;
          --bg-rad1: rgba(139,92,246,.18);
          --bg-rad2: rgba(59,130,246,.16);
          --card: rgba(255,255,255,.92);
          --blur: blur(10px);
          --border: rgba(17,24,39,.08);
          --text: #111827;
          --muted: #6b7280;
          --brand: #6d28d9;
          --brand-600: #5b21b6;
          --ring: rgba(109,40,217,.22);
          --success: #10b981;
          --shadow: 0 20px 60px rgba(17,24,39,.08);
        }
        /* Auto follow system (default) */
        @media (prefers-color-scheme: light) {
          .auth:not(.is-dark):not(.is-light) {
            --bg: #f7f8ff;
            --bg-rad1: rgba(139,92,246,.18);
            --bg-rad2: rgba(59,130,246,.16);
            --card: rgba(255,255,255,.92);
            --blur: blur(10px);
            --border: rgba(17,24,39,.08);
            --text: #111827; --muted: #6b7280;
            --ring: rgba(109,40,217,.22);
            --shadow: 0 20px 60px rgba(17,24,39,.08);
          }
        }

        *{box-sizing:border-box}
        html, body, #root { height: 100%; }
        body { margin:0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Apple Color Emoji", "Segoe UI Emoji"; color:var(--text); background: var(--bg); }

        /* ---------------------------
           BACKGROUND SCENE
        --------------------------- */
        .bg-scene { position: fixed; inset: 0; overflow: hidden; z-index: -1; }
        .orb {
          position: absolute; border-radius: 999px; filter: blur(30px);
          opacity: .7; mix-blend-mode: screen;
          animation: float 18s ease-in-out infinite;
          will-change: transform;
        }
        .orb--1 { width: 520px; height: 520px; left: -120px; top: -120px; background: radial-gradient(closest-side, var(--bg-rad1), transparent 70%); animation-delay: -2s; }
        .orb--2 { width: 460px; height: 460px; right: -140px; top: 20%; background: radial-gradient(closest-side, var(--bg-rad2), transparent 70%); animation-delay: -6s; }
        .orb--3 { width: 380px; height: 380px; left: 20%; bottom: -140px; background: radial-gradient(closest-side, rgba(16,185,129,.22), transparent 70%); animation-delay: -10s; }
        @keyframes float { 0%,100%{ transform: translateY(0) } 50%{ transform: translateY(-30px) } }

        .grain { position:absolute; inset:-200px; pointer-events:none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140' viewBox='0 0 140 140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3CfeComponentTransfer%3E%3CfeFuncA type='linear' slope='0.06'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); opacity:.35; mix-blend-mode: soft-light; }

        /* ---------------------------
           TOP BAR
        --------------------------- */
        .topbar{
          position: fixed; top: 0; left: 0; right: 0;
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 22px; pointer-events: none;
        }
        .brand { display: inline-flex; align-items: center; gap: 10px; pointer-events: auto; }
        .brand__logo { font-size: 20px; }
        .brand__name { font-weight: 800; letter-spacing: .2px; }
        .topbar__actions { pointer-events: auto; }
        .theme { display:inline-flex; gap:8px; }
        .chip {
          border: 1px solid var(--border); background: color-mix(in oklab, var(--card) 88%, transparent);
          border-radius: 999px; padding: 8px 12px; font-weight: 600; color: var(--text);
          backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur);
          transition: border-color .15s ease, transform .05s ease;
          cursor: pointer;
        }
        .chip:hover { border-color: color-mix(in oklab, var(--brand) 50%, var(--border)); }
        .chip:active { transform: translateY(1px); }
        .chip--active { border-color: var(--brand); color: var(--brand); }

        /* ---------------------------
           CARD (glassmorphism)
        --------------------------- */
        .card {
          width: 100%; max-width: 440px; margin: clamp(72px, 14vh, 120px) auto;
          background: color-mix(in oklab, var(--card) 88%, transparent);
          backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur);
          border: 1px solid var(--border); border-radius: var(--radius-xl);
          box-shadow: var(--shadow); padding: 28px 26px 22px; position: relative;
          animation: rise .45s ease-out both;
        }
        @keyframes rise { from { opacity: 0; transform: translateY(10px) scale(.985) } to { opacity: 1; transform: translateY(0) scale(1) } }

        .card__badge {
          position: absolute; inset: -28px 0 auto 0; margin: 0 auto;
          width: 68px; height: 68px; display: grid; place-items: center;
          border-radius: 18px; border: 1px solid var(--border);
          background: color-mix(in oklab, var(--card) 95%, transparent);
          backdrop-filter: var(--blur);
          box-shadow: var(--shadow); font-size: 26px;
        }
        .card__head { text-align: center; margin-top: 16px; }
        .card__title { margin: 0; font-size: 26px; letter-spacing: -0.01em; font-weight: 800; }
        .card__subtitle { margin: 6px 0 0; color: var(--muted); font-size: 14px; }

        /* ---------------------------
           SOCIAL
        --------------------------- */
        .social { display: grid; grid-template-columns: 1fr; gap: 10px; margin-top: 14px; }
        .btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 10px;
          width: 100%; padding: 12px 14px; border-radius: var(--radius-md);
          border: 1px solid var(--border); background: color-mix(in oklab, var(--card) 96%, transparent);
          color: var(--text); font-weight: 700; cursor: pointer;
          transition: transform .05s ease, border-color .15s ease, background .15s ease;
          backdrop-filter: var(--blur);
        }
        .btn:hover { border-color: color-mix(in oklab, var(--brand) 45%, var(--border)); }
        .btn:active { transform: translateY(1px); }
        .btn--ghost { color: var(--text); }

        .divider { position: relative; text-align: center; margin: 14px 0 10px; }
        .divider::before, .divider::after {
          content: ""; position: absolute; top: 50%; width: 40%; height: 1px;
          background: var(--border);
        }
        .divider::before { left: 0; }
        .divider::after { right: 0; }
        .divider > span {
          display: inline-block; padding: 0 10px; color: var(--muted); font-size: 12px; font-weight: 700;
        }

        /* ---------------------------
           FORM
        --------------------------- */
        .form { display: grid; gap: 14px; margin-top: 6px; }
        .field { display: grid; gap: 8px; }
        .field__row { display: flex; align-items: baseline; justify-content: space-between; }
        .field__label { font-size: 13px; font-weight: 800; letter-spacing: .02em; }
        .field__hint { color: var(--muted); font-size: 12px; }

        .field__control { position: relative; }
        .field__icon {
          position: absolute; left: 10px; top: 0; bottom: 0; display: grid; place-items: center;
          color: color-mix(in oklab, var(--text) 70%, transparent);
        }
        .input {
          width: 100%; border: 1px solid var(--border); background: color-mix(in oklab, var(--card) 98%, transparent);
          color: var(--text); border-radius: var(--radius-md);
          padding: 11px 12px 11px 36px; font-size: 15px; outline: none;
          transition: border-color .15s ease, box-shadow .15s ease, background .15s ease;
          backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur);
        }
        .input::placeholder { color: color-mix(in oklab, var(--text) 55%, transparent); }
        .input:focus { border-color: var(--brand); box-shadow: 0 0 0 6px var(--ring); }

        .input.input--icon { padding-left: 36px; }

        .meter { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-top: 6px; }
        .meter__bar {
          height: 6px; border-radius: 999px; background: color-mix(in oklab, var(--muted) 38%, transparent);
          border: 1px solid var(--border);
        }
        .meter__bar.is-on:nth-child(1) { background: #f59e0b; }
        .meter__bar.is-on:nth-child(2) { background: #f97316; }
        .meter__bar.is-on:nth-child(3) { background: #fb7185; }
        .meter__bar.is-on:nth-child(4) { background: var(--success); }

        .row { display:flex; align-items: center; justify-content: space-between; }
        .check { display: inline-flex; gap: 8px; align-items: center; font-size: 14px; }
        .check input { accent-color: var(--brand); }

        .btn--primary {
          background: linear-gradient(180deg, var(--brand), var(--brand-600));
          color: #fff; border-color: transparent; box-shadow: 0 10px 22px color-mix(in oklab, var(--brand) 30%, transparent);
          font-weight: 800; letter-spacing: .02em; margin-top: 4px;
        }
        .btn--primary:hover { filter: brightness(1.03); }
        .link { color: var(--brand); font-weight: 800; text-decoration: none; }
        .link:hover { text-decoration: underline; }
        .link--sm { font-size: 12px; }

        .foot { text-align: center; color: var(--muted); font-size: 14px; margin-top: 14px; }

        /* Motion respect */
        @media (prefers-reduced-motion: reduce) {
          .orb, .card { animation: none !important; }
        }

        /* Responsive tweaks */
        @media (max-width: 420px) {
          .card { padding: 24px 18px 18px; }
          .card__title { font-size: 22px; }
        }
      `}</style>
    </main>
  );
}

   

  