import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import { Collapse, OverlayTrigger, Tooltip } from "react-bootstrap";
import { NavLink, useLocation } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./Sidebar.css";
import Swal from "sweetalert2";
import api from "../../lib/axios.js";

const OPEN_W = 256;
const COLLAPSED_W = 72;

/* ============ Small hooks ============ */
function useLocalStorage(key, initialValue) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw != null ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  }, [key, state]);
  return [state, setState];
}

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    try {
      mql.addEventListener("change", onChange);
    } catch {
      mql.addListener(onChange);
    }
    return () => {
      try {
        mql.removeEventListener("change", onChange);
      } catch {
        mql.removeListener(onChange);
      }
    };
  }, [query]);
  return matches;
}

/* ============ Auth helpers ============ */
function getToken() {
  const raw =
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    "";
  return raw.startsWith("Bearer ") ? raw.slice(7) : raw;
}

function decodeToken() {
  try {
    const token = getToken();
    const payload = token.split(".")[1];
    if (!payload) return null;
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

function useAuthInfo() {
  const payload = useMemo(() => decodeToken(), []);
  const username = payload?.username ?? "";
  const role = (payload?.role ?? "").toString().toUpperCase();
  const isAdmin = role === "ADMIN" || role === "SUPERADMIN";
  const initials = (username?.[0] || "?").toUpperCase();
  return { username, role, isAdmin, initials };
}

/* ============ Sidebar ============ */
export default function Sidebar() {
  const location = useLocation();
  const { username, role, isAdmin, initials } = useAuthInfo();

  // Responsiveness
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [isOpen, setIsOpen] = useLocalStorage("sb:isOpen", !isMobile);
  const [profilePic, setProfilePic] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/user/me");
        const pic = res.data?.data?.profile_picture;
        if (pic) {
          // Construct full URL. 
          // If pic starts with http, use it. 
          // If it starts with /, append to API base URL (which serves static files at /api/uploads if configured)
          if (pic.startsWith("http")) {
            setProfilePic(pic);
          } else {
             // remove trailing slash from base if present, remove leading slash from pic if present
             const baseUrl = api.defaults.baseURL?.replace(/\/+$/, "") || "";
             const path = pic.startsWith("/") ? pic : `/${pic}`;
             setProfilePic(`${baseUrl}${path}`);
          }
        }
      } catch (err) {
        console.error("Failed to fetch profile picture", err);
      }
    };
    if (username) fetchProfile();
  }, [username]);

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      // allow stored preference to win on first mount
      return;
    }
    // When switching between desktop/mobile, use sensible defaults
    setIsOpen(!isMobile); // open on desktop, closed on mobile
  }, [isMobile, setIsOpen]);

  // Menu configuration
  const sections = useMemo(() => {
    const base = [
      {
        id: "accounting",
        label: "Accounting Office",
        icon: "bi-folder",
        items: [
          { to: "/taxlist", icon: "bi-receipt", label: "Tax Payer Lot" },
        ],
      },
      ...(isAdmin
        ? [
            {
              id: "admin",
              label: "Administration",
              icon: "bi-shield-lock",
              items: [
                { to: "/admin/dashboard", icon: "bi-speedometer2", label: "Dashboard" },
                { to: "/admin/logs", icon: "bi-clipboard-check", label: "Audit Logs" },
                { to: "/admin/spatial-validation", icon: "bi-shield-check", label: "System Validation" },
              ],
            },
          ]
        : []),
      {
        id: "engineering",
        label: "Engineering Office",
        icon: "bi-folder",
        items: [
          { to: "/map", icon: "bi-geo-alt", label: "Ibaan Map" },
          { to: "/landparcellist", icon: "bi-geo", label: "Land Parcels" },
          { to: "/buildinglist", icon: "bi-building", label: "Buildings" },
        ],
      },
      {
        id: "layers",
        label: "Layers",
        icon: "bi-layers",
        items: [
          { to: "/land-cover", icon: "bi-map", label: "Land Cover" },
          { to: "/water-bodies", icon: "bi-droplet", label: "Water Bodies" },
        ],
      },
      {
        id: "settings",
        label: "Settings",
        icon: "bi-gear",
        single: { to: "/settings" },
      },
    ];
    return base;
  }, [isAdmin]);

  // Helpers
  const navClass = ({ isActive }) => "nav-link" + (isActive ? " active" : "");
  const collapsedClass = !isMobile && !isOpen ? "is-collapsed" : "";

  const WithTip = ({ label, children }) => {
    if (isMobile || isOpen) return children;
    return (
      <OverlayTrigger placement="right" overlay={<Tooltip>{label}</Tooltip>}>
        <div>{children}</div>
      </OverlayTrigger>
    );
  };

  // SweetAlert2 logout with server call fallback
  const handleLogout = useCallback(async () => {
    const { isConfirmed } = await Swal.fire({
      icon: "warning",
      title: "Log out?",
      text: "You will need to log in again to access the app.",
      confirmButtonText: "Yes, log out",
      cancelButtonText: "Cancel",
      showCancelButton: true,
      reverseButtons: true,
      focusCancel: true,
    });
    if (!isConfirmed) return;

    try {
      Swal.fire({
        title: "Signing out…",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });
      // server logout (ignore errors)
      await api.post("/user/logout");
    } catch (_) {
      // ignore
    } finally {
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");
      Swal.close();
      await Swal.fire({
        icon: "success",
        title: "Signed out",
        timer: 900,
        showConfirmButton: false,
      });
      window.location.href = "/login";
    }
  }, []);

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobile && isOpen && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50"
          style={{ zIndex: 899 }}
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile burger */}
      {isMobile && !isOpen && (
        <button
          className="sb-burger"
          onClick={() => setIsOpen(true)}
          aria-label="Toggle navigation"
          type="button"
          style={{ position: 'fixed', top: 12, left: 12, zIndex: 1100 }}
        >
          <i className="bi bi-list" style={{ fontSize: '1.5rem', color: '#1e293b' }} />
        </button>
      )}

      <aside
        className={`Sidebar ${isMobile ? (isOpen ? "show" : "is-collapsed") : collapsedClass}`}
        role="navigation"
        aria-label="Sidebar"
      >
        {/* Toggle Button (Desktop: Floating / Mobile: Hidden) */}
        {!isMobile && (
          <button
            className="sb-icon-btn"
            onClick={() => setIsOpen(!isOpen)}
            title={isOpen ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            <i className={`bi bi-chevron-${isOpen ? "left" : "right"}`} style={{ fontSize: '14px', strokeWidth: '2px' }}></i>
          </button>
        )}

        <div className="sb-frame">
          {/* Scrollable Navigation */}
          <div className="flex-grow-1 overflow-auto" style={{ scrollbarWidth: 'none' }}>
             <nav className="nav flex-column">
              {/* Dynamic sections */}
              {sections.map((sec) => {
                // Single-link
                if (sec.single) {
                  return (
                    <WithTip key={sec.id} label={sec.label}>
                      <NavLink 
                        to={sec.single.to} 
                        className={(props) => navClass(props) + (sec.className ? ` ${sec.className}` : "")}
                      >
                        <i className={`bi ${sec.icon}`} />
                        {isOpen && <span>{sec.label}</span>}
                      </NavLink>
                    </WithTip>
                  );
                }

                // Group section (Flat)
                const items = sec.items || [];
                return (
                  <div key={sec.id} className="nav-group">
                    {/* Section Header */}
                    {isOpen && <div className="section-header">{sec.label}</div>}
                    
                    {items.map((it) => (
                      <WithTip key={it.to} label={it.label}>
                        <NavLink
                          to={it.to}
                          className={navClass}
                          onClick={() => {
                            if (isMobile) setIsOpen(false);
                          }}
                        >
                          <i className={`bi ${it.icon}`} />
                          {isOpen && <span>{it.label}</span>}
                        </NavLink>
                      </WithTip>
                    ))}
                  </div>
                );
              })}
            </nav>
          </div>
          
          {/* User Profile / Footer */}
          <div className="user-profile">
            <div className="user-avatar" style={{ overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: "#e9ecef" }}>
              {profilePic ? (
                <img 
                  src={profilePic} 
                  alt="Profile" 
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
                />
              ) : (
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#495057' }}>{initials}</span>
              )}
              {/* Fallback for error handling */}
              <span style={{ display: 'none', fontSize: '14px', fontWeight: 'bold', color: '#495057' }}>{initials}</span>
            </div>
            <div className="user-info">
              <span className="user-name" title={username}>{username}</span>
            </div>
            <WithTip label="Logout">
              <button
                type="button"
                className="logout-btn"
                onClick={handleLogout}
                aria-label="Logout"
              >
                <i className="bi bi-box-arrow-right" style={{ fontSize: '1.2rem' }} />
              </button>
            </WithTip>
          </div>
        </div>
      </aside>
    </>
  );
}