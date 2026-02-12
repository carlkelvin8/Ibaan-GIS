// frontend/src/components/Dashboard/Dashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "../../lib/axios";
import Swal from "sweetalert2";
import UserForm from "../Admin/UserForm.jsx"; // create/edit form
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import './Dashboard.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

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

  // Dashboard Analytics State
  const [analytics, setAnalytics] = useState(null);

  // refetch trigger after create/edit/delete
  const [reloadTick, setReloadTick] = useState(0);

  // Fetch Analytics Data
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/analytics/dashboard");
        setAnalytics(data);
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
      }
    })();
  }, [reloadTick]);

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
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Delete user "${row.username}"? This cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'No, cancel'
    });

    if (!result.isConfirmed) return;

    try {
      await api.delete(`/admin/users/${row.id}`);
      Swal.fire('Deleted!', 'User has been deleted.', 'success');
      setReloadTick((t) => t + 1);
    } catch (e) {
      console.error(e);
      Swal.fire('Error', e?.response?.data?.error || "Failed to delete user.", 'error');
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
    <div className="dashboard-container">
      {/* Header + New User */}
      <div className="dashboard-header">
        <h2 className="dashboard-title">Admin • Dashboard</h2>
      </div>

      {/* Analytics Section */}
      {analytics && (
        <div style={{ marginBottom: 32 }}>
          <h3 className="section-title">
            <i className="bi bi-graph-up"></i>
            System Overview
          </h3>
          
          {/* Analytics KPI Cards */}
          <div className="kpi-grid">
            <KpiCard 
              title="Total Parcels" 
              value={analytics.summary.totalParcels} 
              icon="bi-map"
              color="blue"
            />
            <KpiCard 
              title="Tax Collected" 
              value={`₱${analytics.summary.totalCollected?.toLocaleString() ?? 0}`} 
              icon="bi-cash-coin"
              color="green"
            />
            <KpiCard 
              title="Total Tax Due" 
              value={`₱${analytics.summary.totalDue?.toLocaleString() ?? 0}`} 
              icon="bi-exclamation-circle"
              color="red"
            />
            <KpiCard 
              title="Pending Assessments" 
              value={analytics.summary.totalAssessments} 
              icon="bi-hourglass-split"
              color="orange"
            />
          </div>

          {/* Charts Row */}
          <div className="charts-grid">
            
            {/* Land Use Chart (Doughnut) */}
            <div className="chart-card">
              <div className="chart-header">
                <h4 className="chart-title">Land Use Distribution</h4>
              </div>
              <div className="chart-container">
                <Doughnut 
                  data={{
                    labels: analytics.charts.landUse.map(d => d.label || "Unknown"),
                    datasets: [{
                      data: analytics.charts.landUse.map(d => d.value),
                      backgroundColor: [
                        '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6'
                      ],
                      borderWidth: 2,
                      borderColor: '#ffffff',
                      hoverOffset: 10
                    }]
                  }}
                  options={{ 
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '75%',
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: {
                          usePointStyle: true,
                          padding: 20,
                          font: { family: "'Inter', sans-serif", size: 12 },
                          color: '#6b7280'
                        }
                      }
                    }
                  }} 
                />
              </div>
            </div>

            {/* Collection vs Due Chart (Vertical Bar) */}
            <div className="chart-card">
               <div className="chart-header">
                 <h4 className="chart-title">Tax Collection Status</h4>
               </div>
               <div className="chart-container">
                 <Bar 
                    data={{
                      labels: ['Current Fiscal Year'],
                      datasets: [
                        { 
                          label: 'Collected', 
                          data: [analytics.summary.totalCollected], 
                          backgroundColor: '#10b981', // Emerald 500
                          borderRadius: { topLeft: 8, topRight: 8 },
                          barPercentage: 0.5,
                        },
                        { 
                          label: 'Total Due', 
                          data: [analytics.summary.totalDue], 
                          backgroundColor: '#ef4444', // Red 500
                          borderRadius: { topLeft: 8, topRight: 8 },
                          barPercentage: 0.5,
                        }
                      ]
                    }}
                    options={{ 
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'top',
                          align: 'end',
                          labels: { usePointStyle: true, font: { family: "'Inter', sans-serif" } }
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          grid: { borderDash: [4, 4], color: '#f3f4f6', drawBorder: false },
                          ticks: { font: { family: "'Inter', sans-serif" }, color: '#9ca3af' }
                        },
                        x: {
                          grid: { display: false },
                          ticks: { font: { family: "'Inter', sans-serif" }, color: '#9ca3af' }
                        }
                      }
                    }}
                 />
               </div>
            </div>

            {/* Monthly Revenue Trend (Actual or Projection) */}
            <div className="chart-card full-width">
               <div className="chart-header">
                 <h4 className="chart-title">
                    Revenue Trends 
                    {analytics.charts.monthlyRevenue?.length > 0 ? ' (Actual)' : ' (Projection)'}
                 </h4>
               </div>
               <div className="chart-container">
                 <Line 
                    data={{
                      labels: analytics.charts.monthlyRevenue?.length > 0 
                        ? analytics.charts.monthlyRevenue.map(d => d.label)
                        : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                      datasets: [
                        {
                          label: 'Revenue',
                          data: analytics.charts.monthlyRevenue?.length > 0
                            ? analytics.charts.monthlyRevenue.map(d => d.value)
                            : [
                                analytics.summary.totalCollected * 0.1,
                                analytics.summary.totalCollected * 0.15,
                                analytics.summary.totalCollected * 0.12,
                                analytics.summary.totalCollected * 0.25,
                                analytics.summary.totalCollected * 0.2,
                                analytics.summary.totalCollected * 0.3
                              ],
                          borderColor: '#3b82f6',
                          backgroundColor: (context) => {
                            const ctx = context.chart.ctx;
                            const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                            gradient.addColorStop(0, 'rgba(59, 130, 246, 0.5)');
                            gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');
                            return gradient;
                          },
                          tension: 0.4,
                          fill: true,
                          pointBackgroundColor: '#ffffff',
                          pointBorderColor: '#3b82f6',
                          pointBorderWidth: 2,
                          pointRadius: 4,
                          pointHoverRadius: 6
                        }
                      ]
                    }}
                    options={{ 
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        tooltip: { 
                          mode: 'index', 
                          intersect: false,
                          backgroundColor: '#1f2937',
                          titleFont: { family: "'Inter', sans-serif", size: 13 },
                          bodyFont: { family: "'Inter', sans-serif", size: 13 },
                          padding: 10,
                          cornerRadius: 8,
                          displayColors: false
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          grid: { borderDash: [4, 4], color: '#f3f4f6', drawBorder: false },
                          ticks: { callback: (v) => '₱' + (v/1000).toFixed(0) + 'k', font: { family: "'Inter', sans-serif" } }
                        },
                        x: {
                          grid: { display: false },
                          ticks: { font: { family: "'Inter', sans-serif" } }
                        }
                      },
                      interaction: {
                        mode: 'nearest',
                        axis: 'x',
                        intersect: false
                      }
                    }}
                 />
               </div>
            </div>

          </div>
        </div>
      )}

      <div className="dashboard-header" style={{ marginTop: 40 }}>
        <h3 className="section-title">
          <i className="bi bi-people"></i>
          User Management
        </h3>
        <button onClick={() => setCreateOpen(true)} className="btn-primary" title="Create a new user">
          <i className="bi bi-plus-lg"></i>
          New User
        </button>
      </div>

      {/* KPI cards (Users) */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <KpiCard title="Total Users" value={summary.total} icon="bi-people" color="indigo" />
        <KpiCard title="Active" value={summary.active} icon="bi-person-check" color="teal" />
        <KpiCard title="Pending" value={summary.pending} icon="bi-person-dash" color="amber" />
        <KpiCard title="Disabled" value={summary.disabled} icon="bi-person-x" color="slate" />
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div style={{ position: 'relative' }}>
          <i className="bi bi-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}></i>
          <input
            type="text"
            className="search-input"
            style={{ paddingLeft: 36 }}
            placeholder="Search users..."
            value={qp.q}
            onChange={(e) => setParam("q", e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setParam("q", e.currentTarget.value)}
          />
        </div>

        <select
          className="filter-select"
          value={qp.role}
          onChange={(e) => setParam("role", e.target.value)}
        >
          <option value="">All roles</option>
          <option value="ADMIN">Admin</option>
          <option value="ASSESSOR">Assessor</option>
          <option value="ENGINEER">Engineer</option>
          <option value="PLANNER">Planner</option>
          <option value="BPLO">BPLO</option>
        </select>

        <select
          className="filter-select"
          value={qp.status}
          onChange={(e) => setParam("status", e.target.value)}
        >
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="disabled">Disabled</option>
        </select>

        <button
          className="btn-secondary"
          onClick={() => {
            const keep = new URLSearchParams();
            keep.set("page", "1");
            keep.set("limit", String(qp.limit || 20));
            keep.set("sort", qp.sort || "-createdAt");
            setSearchParams(keep, { replace: true });
          }}
        >
          Clear
        </button>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <span className="page-info">Rows per page</span>
          <select
            className="filter-select"
            style={{ padding: "6px 24px 6px 10px", width: "auto" }}
            value={qp.limit}
            onChange={limitChange}
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
      <div className="table-container">
        <table className="modern-table">
          <thead>
            <tr>
              <Th onClick={() => toggleSort("createdAt")}>
                Created <SortIndicator col="createdAt" />
              </Th>
              <Th onClick={() => toggleSort("username")}>
                Username <SortIndicator col="username" />
              </Th>
              <Th onClick={() => toggleSort("firstName")}>
                Name <SortIndicator col="firstName" />
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
              <th style={{ padding: 16, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: 32, textAlign: "center", color: "#6b7280" }}>
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </td>
              </tr>
            ) : err ? (
              <tr>
                <td colSpan={7} style={{ padding: 32, color: "#ef4444", textAlign: "center" }}>
                  {err}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 32, textAlign: "center", color: "#6b7280" }}>
                  No users found matching your filters.
                </td>
              </tr>
            ) : (
              rows.map((u) => (
                <tr key={u.id}>
                  <Td>{fmtDate(u.created_at)}</Td>
                  <Td>
                    <div className="user-cell">
                      <div className="user-avatar">{u.username[0].toUpperCase()}</div>
                      <span style={{ fontWeight: 500 }}>{u.username}</span>
                    </div>
                  </Td>
                  <Td>{u.first_name} {u.last_name}</Td>
                  <Td>
                    <a href={`mailto:${u.email}`} style={{ color: "var(--dash-primary)", textDecoration: "none" }}>{u.email}</a>
                  </Td>
                  <Td>
                    <Badge tone={toneByRole(u.role)}>{String(u.role)}</Badge>
                  </Td>
                  <Td>
                    <Badge tone={toneByStatus(u.status)}>{String(u.status)}</Badge>
                  </Td>
                  <Td>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button type="button" onClick={() => onEditRow(u)} className="btn-icon" title="Edit user">
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button type="button" onClick={() => onDeleteRow(u)} className="btn-icon" style={{ color: "#ef4444" }} title="Delete user">
                        <i className="bi bi-trash"></i>
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
      <div className="pagination-bar">
        <div className="page-info">
          Showing <strong>{(qp.page - 1) * qp.limit + 1}</strong> to <strong>{Math.min(qp.page * qp.limit, total)}</strong> of <strong>{total}</strong> users
        </div>
        <div className="pagination-controls">
          <button onClick={() => gotoPage(1)} disabled={qp.page <= 1} className="btn-icon" title="First Page">
            <i className="bi bi-chevron-double-left"></i>
          </button>
          <button onClick={() => gotoPage(qp.page - 1)} disabled={qp.page <= 1} className="btn-icon" title="Previous Page">
            <i className="bi bi-chevron-left"></i>
          </button>
          <span style={{ display: "flex", alignItems: "center", padding: "0 12px", fontSize: 14, fontWeight: 500 }}>
            Page {qp.page}
          </span>
          <button onClick={() => gotoPage(qp.page + 1)} disabled={qp.page >= pages} className="btn-icon" title="Next Page">
            <i className="bi bi-chevron-right"></i>
          </button>
          <button onClick={() => gotoPage(pages)} disabled={qp.page >= pages} className="btn-icon" title="Last Page">
            <i className="bi bi-chevron-double-right"></i>
          </button>
        </div>
      </div>

      {/* Optional: link to Map */}
      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <Link to="/map" style={{ fontSize: 14, color: "var(--dash-primary)", textDecoration: 'none', fontWeight: 500 }}>
          View Parcels Map <i className="bi bi-arrow-right"></i>
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
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {children}
      </div>
    </th>
  );
}
function Td({ children }) {
  return <td>{children}</td>;
}

function KpiCard({ title, value, icon, color = "blue" }) {
  return (
    <div className={`kpi-card color-${color}`}>
      <div className="kpi-content">
        <div className="kpi-header">
          <div className="kpi-title">{title}</div>
          <div className="kpi-icon-bubble">
            <i className={`bi ${icon}`}></i>
          </div>
        </div>
        <div className="kpi-value">{value ?? 0}</div>
        <div className="kpi-trend">
          <span style={{ opacity: 0.6, fontSize: '12px', fontWeight: 500 }}>Live Data</span>
        </div>
      </div>
    </div>
  );
}

function Badge({ children, tone = "default" }) {
  let className = "badge";
  if (tone === "success") className += " badge-success";
  else if (tone === "warn") className += " badge-warning";
  else if (tone === "danger") className += " badge-danger";
  else if (tone === "info") className += " badge-info";
  else className += " badge-info"; // default fallback

  return (
    <span className={className}>
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
  // Just use default/info for others to keep it simple with new CSS
  return "default";
}

function fmtDate(s) {
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return "-";
  }
}

/* ---------------- Modal shell (lightweight) ---------------- */

function Modal({ title, onClose, children }) {
  return (
    <div style={backdrop} onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div style={modal}>
        <div style={modalHeader}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} style={closeBtn}><i className="bi bi-x-lg"></i></button>
        </div>
        <div style={{ padding: 20 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

const backdrop = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  backdropFilter: "blur(2px)",
  display: "grid",
  placeItems: "center",
  zIndex: 9999,
  animation: "fadeIn 0.2s ease-out",
};

const modal = {
  background: "#fff",
  width: "100%",
  maxWidth: "500px",
  borderRadius: "12px",
  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
  overflow: "hidden",
  animation: "slideUp 0.3s ease-out",
};

const modalHeader = {
  padding: "16px 20px",
  borderBottom: "1px solid #e5e7eb",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  background: "#f9fafb",
};

const closeBtn = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  fontSize: "16px",
  color: "#6b7280",
  padding: 4,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "4px",
  transition: "background 0.2s",
};

// Add keyframes for modal animations
const styleSheet = document.createElement("style");
styleSheet.innerText = `
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
`;
document.head.appendChild(styleSheet);
