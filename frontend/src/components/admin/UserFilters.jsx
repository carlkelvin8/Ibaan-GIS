// frontend/src/components/admin/UserFilters.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Props (optional):
 * - onChange?: (params: URLSearchParams) => void
 * - roles?: string[]        // default: ['ADMIN','ASSESSOR','ENGINEER','PLANNER','BPLO']
 * - statuses?: string[]     // default: ['active','pending','disabled']
 */
export default function UserFilters({ onChange, roles, statuses }) {
  const [searchParams, setSearchParams] = useSearchParams();

  // New role scheme + default statuses
  const roleOpts =
    roles ?? ["ADMIN", "ASSESSOR", "ENGINEER", "PLANNER", "BPLO"];
  const statusOpts = statuses ?? ["active", "pending", "disabled"];

  // Read from URL
  const initial = useMemo(() => {
    const get = (k, d = "") => searchParams.get(k) ?? d;
    return {
      q: get("q"),
      role: get("role"), // single-select; if you later allow multi, feed comma-joined string
      status: get("status"),
      officeId: get("officeId"),
      municipalityId: get("municipalityId"),
      dateFrom: get("dateFrom"),
      dateTo: get("dateTo"),
      limit: get("limit") || "20",
      sort: get("sort") || "-createdAt",
    };
  }, [searchParams]);

  // Controlled state
  const [form, setForm] = useState(initial);
  useEffect(() => setForm(initial), [initial]);

  const update = (k) => (e) =>
    setForm((s) => ({ ...s, [k]: e.target.value }));

  const apply = () => {
    const next = new URLSearchParams(searchParams);
    setOrDel(next, "q", form.q);
    setOrDel(next, "role", form.role);
    setOrDel(next, "status", form.status);
    setOrDel(next, "officeId", form.officeId);
    setOrDel(next, "municipalityId", form.municipalityId);
    setOrDel(next, "dateFrom", form.dateFrom);
    setOrDel(next, "dateTo", form.dateTo);
    setOrDel(next, "limit", form.limit || "20");
    setOrDel(next, "sort", form.sort || "-createdAt");
    // reset page on filter change
    next.set("page", "1");

    setSearchParams(next, { replace: true });
    if (typeof onChange === "function") onChange(next);
  };

  const clear = () => {
    const keep = new URLSearchParams();
    keep.set("page", "1");
    keep.set("limit", form.limit || "20");
    keep.set("sort", form.sort || "-createdAt");
    setSearchParams(keep, { replace: true });
    if (typeof onChange === "function") onChange(keep);
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "minmax(240px, 1.8fr) repeat(6, minmax(140px, 1fr))",
        gap: 8,
        alignItems: "center",
        marginBottom: 12,
      }}
    >
      {/* Search */}
      <input
        type="text"
        placeholder="Search username / name / email…"
        value={form.q}
        onChange={update("q")}
        onKeyDown={(e) => e.key === "Enter" && apply()}
        style={inputStyle}
      />

      {/* Role */}
      <select value={form.role} onChange={update("role")} style={inputStyle}>
        <option value="">All roles</option>
        {roleOpts.map((r) => (
          <option key={r} value={r}>
            {roleLabel(r)}
          </option>
        ))}
      </select>

      {/* Status */}
      <select
        value={form.status}
        onChange={update("status")}
        style={inputStyle}
      >
        <option value="">All status</option>
        {statusOpts.map((s) => (
          <option key={s} value={s}>
            {statusLabel(s)}
          </option>
        ))}
      </select>

      {/* Office ID */}
      <input
        type="number"
        placeholder="Office ID"
        value={form.officeId}
        onChange={update("officeId")}
        style={inputStyle}
        min={0}
      />

      {/* Municipality ID */}
      <input
        type="number"
        placeholder="Municipality ID"
        value={form.municipalityId}
        onChange={update("municipalityId")}
        style={inputStyle}
        min={0}
      />

      {/* Date From */}
      <input
        type="date"
        value={form.dateFrom}
        onChange={update("dateFrom")}
        style={inputStyle}
      />

      {/* Date To */}
      <input
        type="date"
        value={form.dateTo}
        onChange={update("dateTo")}
        style={inputStyle}
      />

      {/* Limit (Rows) */}
      <select value={form.limit} onChange={update("limit")} style={inputStyle}>
        {[10, 20, 50, 100].map((n) => (
          <option key={n} value={n}>
            {n} / page
          </option>
        ))}
      </select>

      {/* Sort */}
      <select value={form.sort} onChange={update("sort")} style={inputStyle}>
        <option value="-createdAt">Newest</option>
        <option value="createdAt">Oldest</option>
        <option value="username">Username A→Z</option>
        <option value="-username">Username Z→A</option>
        <option value="firstName">First name A→Z</option>
        <option value="-firstName">First name Z→A</option>
        <option value="lastName">Last name A→Z</option>
        <option value="-lastName">Last name Z→A</option>
        <option value="email">Email A→Z</option>
        <option value="-email">Email Z→A</option>
        <option value="role">Role ↑</option>
        <option value="-role">Role ↓</option>
        <option value="status">Status ↑</option>
        <option value="-status">Status ↓</option>
      </select>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={apply} style={btnPrimary}>
          Apply
        </button>
        <button onClick={clear} style={btnGhost}>
          Clear
        </button>
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */
function setOrDel(sp, key, val) {
  if (val === "" || val == null) sp.delete(key);
  else sp.set(key, String(val));
}

function roleLabel(r) {
  const v = String(r ?? "").toUpperCase();
  const map = {
    ADMIN: "Admin",
    ASSESSOR: "Assessor’s Office",
    ENGINEER: "Engineer’s Office",
    PLANNER: "Planning & Development Office",
    BPLO: "Business Permits & Licensing Office",
  };
  return map[v] || r || "—";
}

function statusLabel(s) {
  const v = String(s ?? "").toLowerCase();
  const map = { active: "Active", pending: "Pending", disabled: "Disabled" };
  return map[v] || s || "—";
}

const inputStyle = {
  padding: "8px 10px",
  border: "1px solid #d0d7de",
  borderRadius: 8,
  minHeight: 38,
  background: "#fff",
};

const btnPrimary = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #2563eb",
  background: "#2563eb",
  color: "#fff",
  fontWeight: 600,
  minHeight: 38,
};

const btnGhost = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #d0d7de",
  background: "#f6f8fa",
  color: "#111827",
  fontWeight: 600,
  minHeight: 38,
};
