// components/Ibaan/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/axios.js";
import { normalizeDate } from "../../lib/utils.js";
import "bootstrap/dist/css/bootstrap.min.css";

const ENDPOINTS = {
  metrics: "/ibaan/metrics", // { parcels, buildings, unpaid_total, due_soon, taxpayers }
  recentParcels: "/ibaan/parcels?limit=5&sort=-updated_at",
  upcomingDues: "/ibaan/taxes/upcoming?limit=5",
  activity: "/logs?scope=ibaan&limit=8",
};

function fmtCurrency(v) {
  if (v === null || v === undefined || isNaN(Number(v))) return "—";
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(v);
}
function fmtInt(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString() : "—";
}

export default function IbaanDashboard() {
  const navigate = useNavigate();

  const [metrics, setMetrics] = useState({
    parcels: 0,
    buildings: 0,
    unpaid_total: 0,
    due_soon: 0,
    taxpayers: 0,
  });
  const [recentParcels, setRecentParcels] = useState([]);
  const [upcomingDues, setUpcomingDues] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [mRes, rRes, dRes, aRes] = await Promise.allSettled([
          api.get(ENDPOINTS.metrics),
          api.get(ENDPOINTS.recentParcels),
          api.get(ENDPOINTS.upcomingDues),
          api.get(ENDPOINTS.activity),
        ]);

        if (!mounted) return;

        if (mRes.status === "fulfilled" && mRes.value?.data) {
          setMetrics((prev) => ({ ...prev, ...mRes.value.data }));
        }
        if (rRes.status === "fulfilled" && Array.isArray(rRes.value?.data)) {
          setRecentParcels(
            rRes.value.data.map((p) => ({
              ParcelId: p.ParcelId ?? p.parcel_id ?? p.id,
              Claimant: p.Claimant ?? p.claimant ?? "",
              BarangayNa: p.BarangayNa ?? p.barangay ?? "",
              UpdatedAt: normalizeDate(p.updated_at || p.UpdatedAt || p.updatedAt),
            }))
          );
        }
        if (dRes.status === "fulfilled" && Array.isArray(dRes.value?.data)) {
          setUpcomingDues(
            dRes.value.data.map((t) => ({
              TaxId: t.tax_ID ?? t.taxId ?? "",
              ParcelId: t.ParcelId ?? t.parcel_id ?? "",
              DueDate: normalizeDate(t.Due_Date || t.due_date),
              Amount: t.Tax_Amount ?? t.amount ?? 0,
              Status: t.status ?? (t.is_overdue ? "Overdue" : "Due"),
            }))
          );
        }
        if (aRes.status === "fulfilled" && Array.isArray(aRes.value?.data)) {
          setActivity(
            aRes.value.data.map((x) => ({
              id: x.id ?? `${x.type}-${x.timestamp}`,
              text: x.message ?? x.text ?? x.event ?? "Activity",
              when: normalizeDate(x.created_at || x.timestamp),
            }))
          );
        }

        setErr(null);
      } catch (e) {
        setErr("Failed to load dashboard data.");
        // optional: console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const go = (path) => () => navigate(path);

  return (
    <div className="container mt-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h2 className="mb-0">Ibaan Dashboard</h2>
        <div className="btn-group">
          <button className="btn btn-outline-primary" onClick={go("/map")}>
            Open Map
          </button>
          <button className="btn btn-outline-success" onClick={go("/taxlist")}>
            Tax List
          </button>
          <button className="btn btn-outline-dark" onClick={go("/landparcellist")}>
            Parcels List
          </button>
        </div>
      </div>

      {err && (
        <div className="alert alert-danger" role="alert">
          {err}
        </div>
      )}

      {/* KPIs */}
      <div className="row g-3">
        <div className="col-12 col-md-6 col-xl-3">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="text-muted mb-2">Parcels</h6>
                <i className="bi bi-geo-alt text-secondary" />
              </div>
              <div className="display-6">{fmtInt(metrics.parcels)}</div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6 col-xl-3">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="text-muted mb-2">Buildings</h6>
                <i className="bi bi-building text-secondary" />
              </div>
              <div className="display-6">{fmtInt(metrics.buildings)}</div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6 col-xl-3">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="text-muted mb-2">Unpaid Taxes</h6>
                <i className="bi bi-cash-coin text-secondary" />
              </div>
              <div className="display-6">{fmtCurrency(metrics.unpaid_total)}</div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6 col-xl-3">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="text-muted mb-2">Due Soon</h6>
                <i className="bi bi-clock-history text-secondary" />
              </div>
              <div className="display-6">{fmtInt(metrics.due_soon)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tables */}
      <div className="row g-3 mt-1">
        <div className="col-12 col-xl-6">
          <div className="card h-100">
            <div className="card-header d-flex justify-content-between align-items-center">
              <strong>Upcoming Dues</strong>
              <button className="btn btn-sm btn-outline-secondary" onClick={go("/taxlist")}>
                View all
              </button>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-sm table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Tax ID</th>
                      <th>Parcel</th>
                      <th className="text-end">Amount</th>
                      <th>Due Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="text-center py-4">
                          <div className="spinner-border spinner-border-sm me-2" role="status" />
                          Loading…
                        </td>
                      </tr>
                    ) : upcomingDues.length ? (
                      upcomingDues.map((d) => (
                        <tr key={`${d.TaxId}-${d.ParcelId}`}>
                          <td>{d.TaxId || "—"}</td>
                          <td>
                            <button
                              className="btn btn-link p-0"
                              onClick={() => navigate(`/map/${d.ParcelId}`)}
                            >
                              {d.ParcelId}
                            </button>
                          </td>
                          <td className="text-end">{fmtCurrency(d.Amount)}</td>
                          <td>{d.DueDate || "—"}</td>
                          <td>
                            <span
                              className={
                                "badge " +
                                (d.Status?.toLowerCase().includes("overdue")
                                  ? "text-bg-danger"
                                  : "text-bg-warning")
                              }
                            >
                              {d.Status || "Due"}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="text-center py-4">
                          No upcoming dues.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-6">
          <div className="card h-100">
            <div className="card-header d-flex justify-content-between align-items-center">
              <strong>Recent Parcels</strong>
              <button className="btn btn-sm btn-outline-secondary" onClick={go("/landparcellist")}>
                View all
              </button>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-sm table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Parcel</th>
                      <th>Claimant</th>
                      <th>Barangay</th>
                      <th>Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="text-center py-4">
                          <div className="spinner-border spinner-border-sm me-2" role="status" />
                          Loading…
                        </td>
                      </tr>
                    ) : recentParcels.length ? (
                      recentParcels.map((p) => (
                        <tr key={p.ParcelId}>
                          <td>
                            <button
                              className="btn btn-link p-0"
                              onClick={() => navigate(`/map/${p.ParcelId}`)}
                            >
                              {p.ParcelId}
                            </button>
                          </td>
                          <td>{p.Claimant || "—"}</td>
                          <td>{p.BarangayNa || "—"}</td>
                          <td>{p.UpdatedAt || "—"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="text-center py-4">
                          No recent parcels.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Activity */}
      <div className="card mt-3">
        <div className="card-header d-flex justify-content-between align-items-center">
          <strong>Recent Activity</strong>
          <button className="btn btn-sm btn-outline-secondary" onClick={go("/logs")}>
            Open Logs
          </button>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="text-center py-2">
              <div className="spinner-border spinner-border-sm me-2" role="status" />
              Loading…
            </div>
          ) : activity.length ? (
            <ul className="list-group list-group-flush">
              {activity.map((a) => (
                <li key={a.id} className="list-group-item d-flex justify-content-between">
                  <span>{a.text}</span>
                  <small className="text-muted">{a.when || "—"}</small>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-muted">No recent activity.</div>
          )}
        </div>
      </div>
    </div>
  );
}
