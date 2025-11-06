import "./Header.css";
import React, { useMemo, useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import useSession from "../../hooks/useSession";

function initialsOf(user) {
  if (!user) return "";
  const a = (user.first_name || "").trim();
  const b = (user.last_name || "").trim();
  if (a || b) return `${a[0] || ""}${b[0] || ""}`.toUpperCase();
  return (user.username || "?").slice(0, 2).toUpperCase();
}

function colorFromString(s = "") {
  // deterministic pastel-ish color from string
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 70% 45%)`;
}

export default function Header() {
  const navigate = useNavigate();
  const { loading, user } = useSession();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const displayName = useMemo(() => {
    if (!user) return "";
    const name = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
    return name || user.username || "";
  }, [user]);

  const avatarBg = useMemo(() => colorFromString(displayName || user?.username || "u"), [displayName, user]);
  const initials = useMemo(() => initialsOf(user), [user]);

  // close dropdown on outside click / esc
  useEffect(() => {
    function onClick(e) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <header className="Header" role="banner">
      {/* Brand */}
      <div className="header-brand">
        <img src="/ibaan.svg" alt="Ibaan logo" className="brand-logo" />
        <span className="brand-name">Ibaan</span>
      </div>

      {/* Right side: user */}
      <div className="header-actions" ref={menuRef}>
        {loading ? (
          <div className="user-skeleton" aria-label="Loading user…" />
        ) : user ? (
          <button
            className="user-chip"
            onClick={() => setOpen((s) => !s)}
            aria-haspopup="menu"
            aria-expanded={open}
            title={displayName}
          >
            <span className="avatar" style={{ background: avatarBg }}>
              {initials}
            </span>
            <span className="user-meta">
              <span className="user-name" title={displayName}>{displayName}</span>
              {user.role && (
                <span className="user-role" title={`Role: ${user.role}`}>
                  {String(user.role).toUpperCase()}
                </span>
              )}
            </span>
            <svg
              className={`chev ${open ? "rot" : ""}`}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
        ) : (
          <Link to="/login" className="login-link">Login</Link>
        )}

        {/* Dropdown */}
        {open && user && (
          <div className="user-menu" role="menu">
            <div className="user-menu-header">
              <span className="avatar sm" style={{ background: avatarBg }}>
                {initials}
              </span>
              <div>
                <div className="user-menu-name">{displayName}</div>
                {user.email && <div className="user-menu-email">{user.email}</div>}
              </div>
            </div>
            <div className="user-menu-items">
              <button className="user-menu-item" onClick={() => { setOpen(false); navigate("/dashboard"); }}>
                Dashboard
              </button>
              <button className="user-menu-item" onClick={() => { setOpen(false); navigate("/profile"); }}>
                Profile
              </button>
              <Link className="user-menu-item danger" to="/logout" onClick={() => setOpen(false)}>
                Logout
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}