// frontend/src/components/admin/UserView.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../../lib/axios.js";

/**
 * Props:
 * - userId: number|string (required when open && !initialUser)
 * - open?: boolean = false            // controls drawer visibility
 * - onClose?: () => void              // called when clicking backdrop/close
 * - initialUser?: object              // if provided, skips fetch initially
 * - inline?: boolean = false          // render as inline card instead of drawer
 * - title?: string                    // custom header
 */
export default function UserView({
  userId,
  open = false,
  onClose,
  initialUser,
  inline = false,
  title = "User Details",
}) {
  const [loading, setLoading] = useState(!!(!initialUser && open && !inline));
  const [error, setError] = useState("");
  const [user, setUser] = useState(initialUser || null);

  // fetch when opened (and no initialUser yet)
  useEffect(() => {
    let cancelled = false;
    async function fetchUser() {
      if (!open && !inline) return;
      if (!userId) return;
      if (initialUser) return;

      try {
        setLoading(true);
        setError("");
        const { data } = await api.get(`/admin/users/${userId}`);
        if (!cancelled) setUser(data);
      } catch (e) {
        if (!cancelled) setError(extractErr(e) || "Failed to load user.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchUser();
    return () => {
      cancelled = true;
    };
  }, [open, inline, userId, initialUser]);

  const rows = useMemo(() => formatRows(user), [user]);

  const content = (
    <div style={wrap(inline)}>
      <header style={hdr}>
        <div style={{ fontWeight: 800 }}>{title}</div>
        {!inline && (
          <button type="button" onClick={onClose} aria-label="Close" style={btnClose}>
            ✕
          </button>
        )}
      </header>

      {loading ? (
        <div style={{ padding: 12 }}>Loading…</div>
      ) : error ? (
        <div style={errBox}>{error}</div>
      ) : !user ? (
        <div style={{ padding: 12 }}>No data.</div>
      ) : (
        <div style={{ padding: 12 }}>
          <div style={grid}>
            {rows.map((r) => (
              <Field key={r.key} label={r.label} value={r.value} />
            ))}
          </div>
        </div>
      )}
    </div>
  );

  if (inline) return content;

  // Drawer overlay
  if (!open) return null;
  return (
    <div style={backdrop} onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div style={drawer}>{content}</div>
    </div>
  );
}

/* ---------------- helpers & UI bits ---------------- */

function Field({ label, value }) {
  return (
    <div style={item}>
      <div style={k}>{label}</div>
      <div style={v}>{value ?? "—"}</div>
    </div>
  );
}

function extractErr(e) {
  return e?.response?.data?.error || e?.message || null;
}

function formatRows(u) {
  if (!u) return [];
  const fullName = [u.first_name, u.last_name].filter(Boolean).join(" ");
  return [
    { key: "id", label: "ID", value: u.id },
    { key: "username", label: "Username", value: u.username },
    { key: "name", label: "Full Name", value: fullName || "—" },
    { key: "email", label: "Email", value: u.email },
    { key: "role", label: "Role", value: roleLabel(u.role) },
    { key: "status", label: "Status", value: statusLabel(u.status) },
    { key: "office", label: "Office ID", value: u.office_id ?? "—" },
    { key: "mun", label: "Municipality ID", value: u.municipality_id ?? "—" },
    { key: "created", label: "Created", value: fmtDate(u.created_at) },
    { key: "updated", label: "Updated", value: fmtDate(u.updated_at) },
  ];
}

function roleLabel(r) {
  const v = String(r ?? "").toUpperCase();
  const map = {
    ADMIN: "Admin",
    ASSESSOR: "Assessor’s Office",
    ENGINEER: "Engineer’s Office",
    PLANNER: "Planning & Development Office",
    BPLO: "Business Permits & Licensing Office",
    SUPERADMIN: "Admin", // legacy
  };
  return map[v] || r || "—";
}

function statusLabel(s) {
  const v = String(s ?? "").toLowerCase();
  const map = { active: "Active", pending: "Pending", disabled: "Disabled" };
  return map[v] || s || "—";
}

function fmtDate(s) {
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString();
  } catch {
    return "—";
  }
}

/* ---------------- styles ---------------- */

const wrap = (inline) => ({
  width: "100%",
  height: inline ? "auto" : "100%",
  background: "#fff",
  borderRadius: inline ? 12 : 0,
  border: inline ? "1px solid #e5e7eb" : "none",
  display: "flex",
  flexDirection: "column",
});

const hdr = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: 12,
  borderBottom: "1px solid #e5e7eb",
  fontSize: 14,
};

const btnClose = {
  border: "1px solid #e5e7eb",
  borderRadius: 6,
  background: "#f6f8fa",
  padding: "4px 8px",
  cursor: "pointer",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
};

const item = {
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: 10,
  background: "#fff",
};

const k = { fontSize: 12, color: "#6b7280", marginBottom: 4, fontWeight: 600 };
const v = { fontSize: 14, color: "#111827", wordBreak: "break-word" };

const backdrop = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.35)",
  zIndex: 999,
  display: "flex",
  justifyContent: "flex-end",
};

const drawer = {
  width: "min(560px, 100vw)",
  height: "100%",
  background: "#fff",
  boxShadow:
    "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
  animation: "user-drawer-in 160ms ease-out",
};

const styleId = "user-view-drawer-style";
if (typeof document !== "undefined" && !document.getElementById(styleId)) {
  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    @keyframes user-drawer-in {
      from { transform: translateX(16px); opacity: .92; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}
