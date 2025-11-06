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
          { to: "/taxpayer", icon: "bi-person-badge", label: "Taxpayer Lot" },
          { to: "/taxlist", icon: "bi-receipt", label: "Tax Forms" },
        ],
      },
      ...(isAdmin
        ? [
            {
              id: "admin",
              label: "Admin",
              icon: "bi-shield-lock",
              items: [
                {
                  to: "/admin/dashboard",
                  icon: "bi-speedometer2",
                  label: "Dashboard",
                },
                { to: "/admin/users", icon: "bi-people", label: "Users" },
              ],
            },
          ]
        : []),
      {
        id: "treasury",
        label: "Treasury Office",
        icon: "bi-folder",
        items: [
          { to: "/taxpayer", icon: "bi-person-badge", label: "Taxpayer Lot" },
          { to: "/taxlist", icon: "bi-receipt", label: "Tax Forms" },
        ],
      },
      {
        id: "engineering",
        label: "Engineering Office",
        icon: "bi-folder",
        items: [
          { to: "/map", icon: "bi-geo-alt", label: "Ibaan Map" },
          { to: "/parcel", icon: "bi-search", label: "Search Parcel" },
          { to: "/landparcellist", icon: "bi-geo", label: "Land Parcels" },
          { to: "/taxlist", icon: "bi-receipt", label: "Tax Forms" },
          { to: "/buildinglist", icon: "bi-building", label: "Buildings" },
        ],
      },
      {
        id: "planning",
        label: "Planning & Development",
        icon: "bi-clipboard-data",
        single: { to: "" },
      },
      {
        id: "swdo",
        label: "Social Welfare & Development",
        icon: "bi-folder",
        items: [{ to: "/taxpayer", icon: "bi-person-badge", label: "CBMS" }],
      },
      {
        id: "layers",
        label: "Layer",
        icon: "bi-layers",
        items: [
          { to: "/taxpayer", icon: "bi-map", label: "Land Cover" },
          { to: "/taxpayer", icon: "bi-droplet", label: "Water Bodies" },
        ],
      },
      {
        id: "settings",
        label: "Settings",
        icon: "bi-gear",
        single: { to: "/settings" },
      },
      {
        id: "logs",
        label: "Audit Logs",
        icon: "bi-clipboard-check",
        single: { to: "/logs" },
      },
    ];
    return base;
  }, [isAdmin]);

  // Open-state per section (persisted)
  const [openSections, setOpenSections] = useLocalStorage(
    "sb:openSections",
    () => {
      const map = {};
      sections.forEach((sec) => (map[sec.id] = false));
      return map;
    }
  );

  // Auto-open section when its route is active
  useEffect(() => {
    const path = location.pathname;
    setOpenSections((prev) => {
      const map = { ...prev };
      sections.forEach((sec) => {
        if (sec.items && sec.items.some((it) => path.startsWith(it.to))) {
          map[sec.id] = true;
        }
      });
      return map;
    });
  }, [location.pathname, sections, setOpenSections]);

  // Search filter
  const [q, setQ] = useState("");
  const filterText = q.trim().toLowerCase();
  const filteredSections = useMemo(() => {
    if (!filterText) return sections;
    return sections
      .map((sec) => {
        if (sec.single) {
          const match = sec.label.toLowerCase().includes(filterText);
          return match ? sec : null;
        }
        const items = (sec.items || []).filter((it) =>
          (it.label || "").toLowerCase().includes(filterText)
        );
        if (items.length) return { ...sec, items };
        if (sec.label.toLowerCase().includes(filterText)) return sec;
        return null;
      })
      .filter(Boolean);
  }, [sections, filterText]);

  // Helpers
  const navClass = ({ isActive }) => "nav-link" + (isActive ? " active" : "");
  const collapsedClass = !isMobile && !isOpen ? "is-collapsed" : "";
  const toggleSection = (id) =>
    setOpenSections((s) => ({ ...s, [id]: !s[id] }));

  const WithTip = ({ label, children }) => {
    if (isMobile || isOpen) return children;
    return (
      <OverlayTrigger placement="right" overlay={<Tooltip>{label}</Tooltip>}>
        <div>{children}</div>
      </OverlayTrigger>
    );
  };

  const SidebarButton = ({ icon, label, onClick, ariaExpanded }) => (
    <WithTip label={label}>
      <button
        className="nav-link sb-toggle"
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick(e);
          }
        }}
        aria-expanded={ariaExpanded}
        aria-label={label}
        type="button"
      >
        <i className={`bi ${icon}`} />
        {isOpen && <span>{label}</span>}
        {isOpen && (
          <i className={`bi ${ariaExpanded ? "bi-chevron-up" : "bi-chevron-down"}`} />
        )}
      </button>
    </WithTip>
  );

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
      {/* Mobile burger */}
      {isMobile && (
        <button
          className="sb-burger"
          onClick={() => setIsOpen((s) => !s)}
          aria-label="Toggle navigation"
          type="button"
        >
          <i className="bi bi-list" />
        </button>
      )}

      <aside
        className={`Sidebar ${isMobile ? (isOpen ? "show" : "hide") : ""} ${collapsedClass}`}
        role="navigation"
        aria-label="Sidebar"
      >
        <div
          className="sb-frame"
          style={{
            width: isOpen ? `${OPEN_W}px` : isMobile ? `${OPEN_W}px` : `${COLLAPSED_W}px`,
          }}
        >
          {/* Brand + Collapse toggle */}
          <div className="sb-brand">
            <div className="sb-logo">
              <img src="/ibaan.svg" alt="Ibaan" />
            </div>
            {isOpen && <div className="sb-title">Ibaan GIS</div>}
            {!isMobile && (
              <button
                className="sb-icon-btn ms-auto"
                title={isOpen ? "Collapse" : "Expand"}
                onClick={() => setIsOpen((s) => !s)}
                aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
                type="button"
              >
                <i className={`bi ${isOpen ? "bi-chevron-left" : "bi-chevron-right"}`} />
              </button>
            )}
          </div>

          {/* User card */}
          <div className="sb-user">
            <div className="sb-avatar" aria-hidden="true">
              {initials}
            </div>
            {isOpen && (
              <div className="sb-user-text">
                <div className="sb-user-name" title={username || "User"}>
                  {username || "User"}
                </div>
                <div className="sb-user-role">{role || "GUEST"}</div>
              </div>
            )}
            {!isMobile && !isOpen && (
              <div className="sb-user-dot" title={role || "GUEST"} />
            )}
          </div>

          {/* Search (desktop only) */}
          {!isMobile && (
            <div className="sb-search" style={{ padding: ".5rem .75rem" }}>
              <WithTip label="Search">
                <div className="input-group input-group-sm">
                  <span className="input-group-text" id="sb-search-addon">
                    <i className="bi bi-search" />
                  </span>
                  {isOpen ? (
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search…"
                      aria-label="Search"
                      aria-describedby="sb-search-addon"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                    />
                  ) : (
                    <button
                      className="btn btn-light"
                      onClick={() => setIsOpen(true)}
                      aria-label="Open search"
                      type="button"
                    >
                      <i className="bi bi-search" />
                    </button>
                  )}
                </div>
              </WithTip>
            </div>
          )}

          {/* Scroll area */}
          <div className="sb-scroll">
            <nav className="nav flex-column">
              {/* Home */}
              <WithTip label="Admin Dashboard">
                <NavLink to="/" className={navClass}>
                  <i className="bi bi-house" />
                  {isOpen && <span>Admin Dashboard</span>}
                </NavLink>
              </WithTip>

              {/* Dynamic sections */}
              {filteredSections.map((sec) => {
                // Single-link
                if (sec.single) {
                  return (
                    <WithTip key={sec.id} label={sec.label}>
                      <NavLink to={sec.single.to} className={navClass}>
                        <i className={`bi ${sec.icon}`} />
                        {isOpen && <span>{sec.label}</span>}
                      </NavLink>
                    </WithTip>
                  );
                }

                // Collapsible section
                const expanded = !!openSections[sec.id];
                const items = sec.items || [];
                return (
                  <div key={sec.id}>
                    <SidebarButton
                      icon={sec.icon}
                      label={sec.label}
                      onClick={() => toggleSection(sec.id)}
                      ariaExpanded={expanded}
                    />
                    <Collapse in={expanded}>
                      <div className="sb-sub" id={`sec-${sec.id}`}>
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
                    </Collapse>
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Footer actions */}
          <div className="sb-footer">
            <WithTip label="Logout">
              <button
                type="button"
                className="nav-link sb-toggle"
                onClick={handleLogout}
                aria-label="Logout"
              >
                <i className="bi bi-box-arrow-right" />
                {isOpen && <span>Logout</span>}
              </button>
            </WithTip>
          </div>
        </div>
      </aside>
    </>
  );
}