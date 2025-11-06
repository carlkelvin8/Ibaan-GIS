// frontend/src/components/Dashboard/Dashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "../../lib/axios";
import UserForm from "../Admin/UserForm.jsx"; // create/edit form

// helper: read from search params with defaults
const getQP = (sp) => ({
  q: sp.get("q") ?? "",
  role: sp.get("role") ?? "",
  status: sp.get("status") ?? "",
  page: Number(sp.get("page") ?? 1),
  limit: Number(sp.get("limit") ?? 20),
  sort: sp.get("sort") ?? "-createdAt",
});

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const qp = useMemo(() => getQP(searchParams), [searchParams]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [summary, setSummary] = useState({
    total: 0,
    active: 0,
    pending: 0,
    disabled: 0,
  });

  // New / Edit modals
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);

  // refetch trigger after create/edit/delete
  const [reloadTick, setReloadTick] = useState(0);

  // fetch users whenever query params change OR we bump reloadTick
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const { q, role, status, page, limit, sort } = qp;
        const { data } = await api.get("/admin/users", {
          params: { q, role, status, page, limit, sort },
        });
        if (!alive) return;
        setRows(Array.isArray(data.data) ? data.data : []);
        setTotal(data.total ?? 0);
        setPages(data.pages ?? 1);
        setSummary(
          data.summary ?? { total: data.total ?? 0, active: 0, pending: 0, disabled: 0 }
        );
      } catch (e) {
        if (!alive) return;
        console.error(e);
        setErr(e?.response?.data?.error || "Failed to load users.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [qp, reloadTick]);

  // helpers to update URL params
  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value === "" || value == null) next.delete(key);
    else next.set(key, String(value));
    if (["q", "role", "status", "limit"].includes(key)) next.set("page", "1");
    setSearchParams(next, { replace: true });
  };

  const toggleSort = (key) => {
    const cur = qp.sort;
    const curKey = cur.startsWith("-") ? cur.slice(1) : cur;
    const curDir = cur.startsWith("-") ? "DESC" : "ASC";
    let next = key;
    if (curKey === key) next = curDir === "ASC" ? `-${key}` : key;
    else next = key === "createdAt" ? `-${key}` : key;
    setParam("sort", next);
  };

  const gotoPage = (p) => {
    const page = Math.max(1, Math.min(pages, p));
    setParam("page", page);
  };

  const limitChange = (e) => setParam("limit", Number(e.target.value) || 20);

  // after successful create / edit, close modal + refetch
  const handleCreated = () => {
    setCreateOpen(false);
    setReloadTick((t) => t + 1);
  };
  const handleEdited = () => {
    setEditOpen(false);
    setEditUser(null);
    setReloadTick((t) => t + 1);
  };

  // edit / delete actions (always enabled; server enforces perms/data visibility)
  const onEditRow = (row) => {
    setEditUser(row);
    setEditOpen(true);
  };

  const onDeleteRow = async (row) => {
    const ok = window.confirm(`Delete user "${row.username}"? This cannot be undone.`);
    if (!ok) return;
    try {
      await api.delete(`/admin/users/${row.id}`);
      setReloadTick((t) => t + 1);
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.error || "Failed to delete user.");
    }
  };

  // small helper
  const SortIndicator = ({ col }) => {
    const cur = qp.sort;
    const k = cur.startsWith("-") ? cur.slice(1) : cur;
    const dir = cur.startsWith("-") ? "DESC" : "ASC";
    if (k !== col) return null;
    return <span style={{ opacity: 0.7 }}>{dir === "ASC" ? " ↑" : " ↓"}</span>;
  };

  return (
    <div style={{ padding: 16 }}>
      {/* Header + New User */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontWeight: 800 }}>Admin • Dashboard</h2>
        <button onClick={() => setCreateOpen(true)} style={btnPrimary} title="Create a new user">
          + New User
        </button>
      </div>

      {/* KPI cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <KpiCard title="Total Users" value={summary.total} />
        <KpiCard title="Active" value={summary.active} />
        <KpiCard title="Pending" value={summary.pending} />
        <KpiCard title="Disabled" value={summary.disabled} />
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <input
          type="text"
          placeholder="Search username / name / email…"
          value={qp.q}
          onChange={(e) => setParam("q", e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && setParam("q", e.currentTarget.value)}
          style={{
            padding: "8px 10px",
            minWidth: 260,
            border: "1px solid #d0d7de",
            borderRadius: 8,
          }}
        />

        <select
          value={qp.role}
          onChange={(e) => setParam("role", e.target.value)}
          style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #d0d7de" }}
        >
          <option value="">All roles</option>
          <option value="ADMIN">ADMIN</option>
          <option value="ASSESSOR">ASSESSOR</option>
          <option value="ENGINEER">ENGINEER</option>
          <option value="PLANNER">PLANNER</option>
          <option value="BPLO">BPLO</option>
          {/* legacy values if still used */}
          <option value="admin">admin</option>
          <option value="superadmin">superadmin</option>
          <option value="user">user</option>
          <option value="1">1</option>
          <option value="2">2</option>
        </select>

        <select
          value={qp.status}
          onChange={(e) => setParam("status", e.target.value)}
          style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #d0d7de" }}
        >
          <option value="">All status</option>
          <option value="active">active</option>
          <option value="pending">pending</option>
          <option value="disabled">disabled</option>
        </select>

        <button
          onClick={() => {
            const keep = new URLSearchParams();
            keep.set("page", "1");
            keep.set("limit", String(qp.limit || 20));
            keep.set("sort", qp.sort || "-createdAt");
            setSearchParams(keep, { replace: true });
          }}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #d0d7de",
            background: "#f6f8fa",
          }}
        >
          Clear
        </button>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#57606a" }}>Rows</span>
          <select
            value={qp.limit}
            onChange={limitChange}
            style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid #d0d7de" }}
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Table with Actions */}
      <div style={{ border: "1px solid #d0d7de", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#f6f8fa" }}>
            <tr>
              <Th onClick={() => toggleSort("createdAt")}>
                Created <SortIndicator col="createdAt" />
              </Th>
              <Th onClick={() => toggleSort("username")}>
                Username <SortIndicator col="username" />
              </Th>
              <Th onClick={() => toggleSort("firstName")}>
                First <SortIndicator col="firstName" />
              </Th>
              <Th onClick={() => toggleSort("lastName")}>
                Last <SortIndicator col="lastName" />
              </Th>
              <Th onClick={() => toggleSort("email")}>
                Email <SortIndicator col="email" />
              </Th>
              <Th onClick={() => toggleSort("role")}>
                Role <SortIndicator col="role" />
              </Th>
              <Th onClick={() => toggleSort("status")}>
                Status <SortIndicator col="status" />
              </Th>
              <th style={{ padding: 10, textAlign: "left", whiteSpace: "nowrap" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ padding: 16, textAlign: "center" }}>
                  Loading…
                </td>
              </tr>
            ) : err ? (
              <tr>
                <td colSpan={8} style={{ padding: 16, color: "#b00020" }}>
                  {err}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: 16 }}>No users found.</td>
              </tr>
            ) : (
              rows.map((u) => (
                <tr key={u.id} style={{ borderTop: "1px solid #eee" }}>
                  <Td>{fmtDate(u.created_at)}</Td>
                  <Td>{u.username}</Td>
                  <Td>{u.first_name}</Td>
                  <Td>{u.last_name}</Td>
                  <Td>
                    <a href={`mailto:${u.email}`}>{u.email}</a>
                  </Td>
                  <Td>
                    <Badge tone={toneByRole(u.role)}>{String(u.role)}</Badge>
                  </Td>
                  <Td>
                    <Badge tone={toneByStatus(u.status)}>{String(u.status)}</Badge>
                  </Td>
                  <Td>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button type="button" onClick={() => onEditRow(u)} style={btnSmPrimary} title="Edit user">
                        Edit
                      </button>
                      <button type="button" onClick={() => onDeleteRow(u)} style={btnSmDanger} title="Delete user">
                        Delete
                      </button>
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 10,
        }}
      >
        <div style={{ fontSize: 12, color: "#57606a" }}>
          Page <strong>{qp.page}</strong> of <strong>{pages}</strong> — {total} users
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => gotoPage(1)} disabled={qp.page <= 1} className="btn">
            « First
          </button>
          <button onClick={() => gotoPage(qp.page - 1)} disabled={qp.page <= 1} className="btn">
            ‹ Prev
          </button>
          <button onClick={() => gotoPage(qp.page + 1)} disabled={qp.page >= pages} className="btn">
            Next ›
          </button>
          <button onClick={() => gotoPage(pages)} disabled={qp.page >= pages} className="btn">
            Last »
          </button>
        </div>
      </div>

      {/* Optional: link to Map */}
      <div style={{ marginTop: 16 }}>
        <Link to="/map" style={{ fontSize: 13, color: "#0b5faa" }}>
          → Open Parcels Map
        </Link>
      </div>

      {/* Create Modal */}
      {createOpen && (
        <Modal onClose={() => setCreateOpen(false)} title="Create User">
          <UserForm mode="create" onSuccess={handleCreated} onCancel={() => setCreateOpen(false)} />
        </Modal>
      )}

      {/* Edit Modal */}
      {editOpen && editUser && (
        <Modal onClose={() => setEditOpen(false)} title={`Edit • ${editUser.username}`}>
          <UserForm
            mode="edit"
            initialValues={{
              id: editUser.id,
              username: editUser.username,
              first_name: editUser.first_name,
              last_name: editUser.last_name,
              email: editUser.email,
              role: editUser.role,
              status: editUser.status,
              office_id: editUser.office_id,
              municipality_id: editUser.municipality_id,
            }}
            onSuccess={handleEdited}
            onCancel={() => setEditOpen(false)}
          />
        </Modal>
      )}
    </div>
  );
}

/* ======= Small presentational helpers ======= */

function Th({ children, onClick }) {
  return (
    <th
      onClick={onClick}
      style={{
        padding: 10,
        textAlign: "left",
        cursor: onClick ? "pointer" : "default",
        userSelect: "none",
        fontWeight: 700,
        fontSize: 13,
        borderBottom: "1px solid #eaeef2",
      }}
    >
      {children}
    </th>
  );
}
function Td({ children }) {
  return <td style={{ padding: "10px 10px" }}>{children}</td>;
}

function KpiCard({ title, value }) {
  return (
    <div
      style={{
        border: "1px solid #d0d7de",
        borderRadius: 12,
        padding: 12,
        background: "#fff",
      }}
    >
      <div style={{ fontSize: 12, color: "#57606a" }}>{title}</div>
      <div style={{ fontSize: 24, fontWeight: 800 }}>{value ?? 0}</div>
    </div>
  );
}

function Badge({ children, tone = "default" }) {
  const palette = {
    default: { bg: "#eef2ff", color: "#1f2937", border: "#e5e7eb" },
    success: { bg: "#ecfdf5", color: "#065f46", border: "#a7f3d0" },
    warn: { bg: "#fffbeb", color: "#92400e", border: "#fde68a" },
    danger: { bg: "#fef2f2", color: "#991b1b", border: "#fecaca" },
    info: { bg: "#eff6ff", color: "#1e40af", border: "#bfdbfe" },
    admin: { bg: "#ede9fe", color: "#5b21b6", border: "#ddd6fe" },
    assessor: { bg: "#f0fdf4", color: "#166534", border: "#bbf7d0" },
    engineer: { bg: "#ecfeff", color: "#155e75", border: "#a5f3fc" },
    planner: { bg: "#fff7ed", color: "#9a3412", border: "#fed7aa" },
    bplo: { bg: "#f5f3ff", color: "#4c1d95", border: "#ddd6fe" },
  };
  const c = palette[tone] || palette.default;
  return (
    <span
      style={{
        background: c.bg,
        color: c.color,
        border: `1px solid ${c.border}`,
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function toneByStatus(s) {
  const v = String(s ?? "").toLowerCase();
  if (v === "active" || v === "1") return "success";
  if (v === "pending" || v === "0" || v === "awaiting") return "warn";
  if (v === "disabled" || v === "-1") return "danger";
  return "info";
}

function toneByRole(r) {
  const v = String(r ?? "").toUpperCase();
  if (v === "ADMIN") return "admin";
  if (v === "ASSESSOR") return "assessor";
  if (v === "ENGINEER") return "engineer";
  if (v === "PLANNER") return "planner";
  if (v === "BPLO") return "bplo";
  if (v === "SUPERADMIN" || v === "1") return "admin";
  return "default";
}

function fmtDate(s) {
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString();
  } catch {
    return "-";
  }
}

/* ---------------- Modal shell (lightweight) ---------------- */

function Modal({ title, onClose, children }) {
  return (
    <div style={backdrop} onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div style={modal}>
        <header style={modalHdr}>
          <strong>{title}</strong>
          <button onClick={onClose} style={btnClose} aria-label="Close">✕</button>
        </header>
        <div style={{ padding: 12 }}>{children}</div>
      </div>
    </div>
  );
}

const btnPrimary = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #2563eb",
  background: "#2563eb",
  color: "#fff",
  fontWeight: 700,
  minHeight: 38,
};
const btnClose = {
  border: "1px solid #e5e7eb",
  borderRadius: 6,
  background: "#f6f8fa",
  padding: "4px 8px",
  cursor: "pointer",
};
const backdrop = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.35)",
  zIndex: 1000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
const modal = {
  width: "min(720px, 92vw)",
  background: "#fff",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  overflow: "hidden",
  boxShadow:
    "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
};
const modalHdr = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: 12,
  borderBottom: "1px solid #e5e7eb",
};

/* small action buttons */
const btnSmPrimary = {
  border: "1px solid #2563eb",
  background: "#2563eb",
  color: "#fff",
  borderRadius: 6,
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 700,
};
const btnSmDanger = {
  border: "1px solid #dc2626",
  background: "#dc2626",
  color: "#fff",
  borderRadius: 6,
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 700,
};
