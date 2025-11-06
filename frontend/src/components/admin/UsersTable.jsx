// frontend/src/components/admin/UsersTable.jsx
import React from "react";

/**
 * Props:
 * - rows: Array<{ id, username, first_name, last_name, email, role, status, created_at }>
 * - loading: boolean
 * - error: string | null
 * - total: number
 * - page: number
 * - pages: number
 * - sort: string                  // e.g. "-createdAt", "username"
 * - onSortChange: (nextSort: string) => void
 * - onPageChange: (nextPage: number) => void
 * - onEmailClick?: (row) => void
 * - onEdit?: (row) => void        // NEW
 * - onDelete?: (row) => void      // NEW
 */
export default function UsersTable({
  rows = [],
  loading = false,
  error = null,
  total = 0,
  page = 1,
  pages = 1,
  sort = "-createdAt",
  onSortChange,
  onPageChange,
  onEmailClick,
  onEdit,
  onDelete,
}) {
  const columns = [
    { key: "createdAt", label: "Created", render: (u) => fmtDate(u.created_at) },
    { key: "username", label: "Username", render: (u) => u.username },
    { key: "firstName", label: "First", render: (u) => u.first_name },
    { key: "lastName", label: "Last", render: (u) => u.last_name },
    {
      key: "email",
      label: "Email",
      render: (u) => (
        <a
          href={`mailto:${u.email}`}
          onClick={(e) => {
            if (onEmailClick) {
              e.preventDefault();
              onEmailClick(u);
            }
          }}
        >
          {u.email}
        </a>
      ),
    },
    {
      key: "role",
      label: "Role",
      render: (u) => (
        <Badge tone={toneByRole(u.role)}>{roleLabel(u.role)}</Badge>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (u) => (
        <Badge tone={toneByStatus(u.status)}>{String(u.status)}</Badge>
      ),
    },
    // NEW: Actions column (no sort)
    {
      key: "__actions",
      label: "Actions",
      render: (u) => (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn"
            onClick={() => onEdit && onEdit(u)}
            style={btnSmPrimary}
            aria-label={`Edit ${u.username}`}
            title="Edit user"
          >
            Edit
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              if (!onDelete) return;
              const ok = window.confirm(
                `Delete user "${u.username}"? This action cannot be undone.`
              );
              if (ok) onDelete(u);
            }}
            style={btnSmDanger}
            aria-label={`Delete ${u.username}`}
            title="Delete user"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  const curKey = sort?.startsWith("-") ? sort.slice(1) : sort;
  const curDir = sort?.startsWith("-") ? "DESC" : "ASC";

  const toggleSort = (key) => {
    if (key === "__actions") return; // not sortable
    if (typeof onSortChange !== "function") return;
    if (curKey === key) {
      const next = curDir === "ASC" ? `-${key}` : key;
      onSortChange(next);
    } else {
      const first = key === "createdAt" ? `-${key}` : key; // default DESC for createdAt
      onSortChange(first);
    }
  };

  const goto = (p) => {
    if (typeof onPageChange !== "function") return;
    const next = Math.max(1, Math.min(pages || 1, p));
    onPageChange(next);
  };

  return (
    <div
      style={{
        border: "1px solid #d0d7de",
        borderRadius: 10,
        overflow: "hidden",
        background: "#fff",
      }}
    >
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: 920,
          }}
        >
          <thead style={{ background: "#f6f8fa" }}>
            <tr>
              {columns.map((c) => (
                <Th
                  key={c.key}
                  active={curKey === c.key}
                  dir={curDir}
                  onClick={() => toggleSort(c.key)}
                  sortable={c.key !== "__actions"}
                >
                  {c.label}
                </Th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <SkeletonRows colSpan={columns.length} />
            ) : error ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: 16, color: "#b00020" }}>
                  {error}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: 16 }}>
                  No users found.
                </td>
              </tr>
            ) : (
              rows.map((u) => (
                <tr key={u.id} style={{ borderTop: "1px solid #eee" }}>
                  {columns.map((c) => (
                    <Td key={c.key}>{c.render(u)}</Td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer / Pagination */}
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          justifyContent: "space-between",
          padding: 10,
          background: "#fff",
          borderTop: "1px solid #eaeef2",
        }}
      >
        <div style={{ fontSize: 12, color: "#57606a" }}>
          Page <strong>{page}</strong> of <strong>{pages || 1}</strong> — {total} users
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => goto(1)} disabled={page <= 1}>
            « First
          </button>
          <button className="btn" onClick={() => goto(page - 1)} disabled={page <= 1}>
            ‹ Prev
          </button>
          <button className="btn" onClick={() => goto(page + 1)} disabled={page >= (pages || 1)}>
            Next ›
          </button>
          <button className="btn" onClick={() => goto(pages || 1)} disabled={page >= (pages || 1)}>
            Last »
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================= helpers & mini components ================= */

function Th({ children, onClick, active, dir, sortable = true }) {
  return (
    <th
      onClick={sortable ? onClick : undefined}
      style={{
        padding: 10,
        textAlign: "left",
        cursor: sortable ? "pointer" : "default",
        userSelect: "none",
        fontWeight: 700,
        fontSize: 13,
        borderBottom: "1px solid #eaeef2",
        position: "sticky",
        top: 0,
        background: "#f6f8fa",
        zIndex: 1,
        whiteSpace: "nowrap",
      }}
      title={sortable ? "Click to sort" : undefined}
    >
      <span>{children}</span>
      {sortable && active && (
        <span style={{ opacity: 0.7 }}>{dir === "ASC" ? " ↑" : " ↓"}</span>
      )}
    </th>
  );
}

function Td({ children }) {
  return <td style={{ padding: "10px 10px", verticalAlign: "top", whiteSpace: "nowrap" }}>{children}</td>;
}

function Badge({ children, tone = "default" }) {
  const palette = {
    default: { bg: "#eef2ff", color: "#1f2937", border: "#e5e7eb" },
    success: { bg: "#ecfdf5", color: "#065f46", border: "#a7f3d0" },
    warn: { bg: "#fffbeb", color: "#92400e", border: "#fde68a" },
    danger: { bg: "#fef2f2", color: "#991b1b", border: "#fecaca" },
    info: { bg: "#eff6ff", color: "#1e40af", border: "#bfdbfe" },
    admin: { bg: "#ede9fe", color: "#5b21b6", border: "#ddd6fe" },      // ADMIN
    assessor: { bg: "#f0fdf4", color: "#166534", border: "#bbf7d0" },   // ASSESSOR
    engineer: { bg: "#ecfeff", color: "#155e75", border: "#a5f3fc" },   // ENGINEER
    planner: { bg: "#fff7ed", color: "#9a3412", border: "#fed7aa" },    // PLANNER
    bplo: { bg: "#f5f3ff", color: "#4c1d95", border: "#ddd6fe" },       // BPLO
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
  // legacy fallbacks
  if (v === "SUPERADMIN" || v === "1") return "admin";
  return "default";
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

function fmtDate(s) {
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString();
  } catch {
    return "-";
  }
}

function SkeletonRows({ colSpan }) {
  const Row = () => (
    <tr>
      <td colSpan={colSpan} style={{ padding: 12 }}>
        <div
          style={{
            height: 12,
            width: "100%",
            borderRadius: 6,
            background:
              "linear-gradient(90deg, #eee 25%, #f5f5f5 37%, #eee 63%)",
            backgroundSize: "400% 100%",
            animation: "kpi-skeleton 1.2s ease-in-out infinite",
          }}
        />
      </td>
    </tr>
  );
  return (
    <>
      <Row />
      <Row />
      <Row />
      <Row />
    </>
  );
}

/* Inject once: skeleton keyframes */
const styleId = "users-table-skeleton-style";
if (typeof document !== "undefined" && !document.getElementById(styleId)) {
  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    @keyframes kpi-skeleton {
      0% { background-position: 100% 50%; }
      100% { background-position: 0 50%; }
    }
  `;
  document.head.appendChild(style);
}

/* small button styles */
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
