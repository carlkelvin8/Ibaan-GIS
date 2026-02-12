import React, { useEffect, useState, useMemo } from "react";
import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import Pagination from "react-bootstrap/Pagination";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import api from "../../lib/axios.js";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import "../admin/Dashboard.css"; // Reuse dashboard styles

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const toStr = (v) => (v == null ? "" : String(v).trim());

// Simple KPI Card
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
        <div className="kpi-value">{value}</div>
        <div className="kpi-trend trend-neutral">
           <span>Live Data</span>
        </div>
      </div>
    </div>
  );
}

export default function TaxList() {
  const navigate = useNavigate();
  const [taxes, setTaxes] = useState([]);
  const [navBusyId, setNavBusyId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);
  
  // Analytics state
  const [stats, setStats] = useState({
    total: 0,
    linked: 0,
    unlinked: 0,
    recent: 0
  });
  
  const itemsPerPage = 25;

  const fetchTaxes = async (page = 1) => {
    try {
      setSearching(true);
      const res = await api.get(`/tax?page=${page}&limit=${itemsPerPage}&search=${searchTerm}`);
      
      if (res.data && Array.isArray(res.data.data)) {
        setTaxes(res.data.data);
        setTotalPages(res.data.totalPages || 1);
        setCurrentPage(page);
        
        // Update stats if we're on the first page search or just general load
        // Note: For true global stats we'd need a separate endpoint, 
        // but we can approximate or just count current page for now.
        // BETTER: Fetch a summary endpoint if available. For now, let's just count from current page to show UI.
        // Actually, let's calculate simplistic stats from the current view or request a dedicated "all" fetch for stats?
        // Let's stick to simple counts from the API metadata if available, otherwise just current batch.
        // The API returns { data, total, page, totalPages }. 'total' is the total count.
        
        const totalCount = res.data.total || 0;
        
        setStats(prev => ({
           ...prev,
           total: totalCount
           // We can't know linked/unlinked globally without a new endpoint.
           // So we'll just show "Total Records" and maybe "Items on Page" breakdowns.
        }));

      } else if (Array.isArray(res.data)) {
        // Fallback for non-paginated API
        setTaxes(res.data);
        setTotalPages(1);
        setStats({
          total: res.data.length,
          linked: res.data.filter(t => t.parcelId).length,
          unlinked: res.data.filter(t => !t.parcelId).length,
          recent: 0
        });
      } else {
        setTaxes([]);
      }
      localStorage.removeItem("taxId");
    } catch (error) {
      console.log("error fetching data:", error);
      setTaxes([]);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => { fetchTaxes(1); }, []);

  // Compute charts data from *visible* taxes
  const chartData = useMemo(() => {
    // 1. Payment Stats (Visible Records)
    let paidCount = 0;
    let overdueCount = 0;
    
    taxes.forEach(t => {
       // Use manual paymentStatus if available, otherwise default to Unpaid
       const status = (t.paymentStatus || "").toLowerCase();
       if (status === 'paid') {
          paidCount++;
       } else {
          overdueCount++;
       }
    });

    return {
      paymentStatus: {
        labels: ['Paid', 'Unpaid'],
        datasets: [{
          data: [paidCount, overdueCount],
          backgroundColor: ['#22c55e', '#ef4444'],
          borderWidth: 0,
          hoverOffset: 15
        }]
      },
      barangayDist: {
        labels: Object.entries(taxes.reduce((acc, t) => {
            const b = t.barangay || "Unknown";
            acc[b] = (acc[b] || 0) + 1;
            return acc;
        }, {})).sort((a,b) => b[1] - a[1]).slice(0,5).map(e => e[0]),
        datasets: [{
          label: 'Forms Count',
          data: Object.entries(taxes.reduce((acc, t) => {
            const b = t.barangay || "Unknown";
            acc[b] = (acc[b] || 0) + 1;
            return acc;
        }, {})).sort((a,b) => b[1] - a[1]).slice(0,5).map(e => e[1]),
          backgroundColor: '#3b82f6',
          borderRadius: 6,
          barPercentage: 0.6
        }]
      }
    };
  }, [taxes]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchTaxes(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchTaxes(newPage);
    }
  };

  const handleEdit = (tax) => {
    localStorage.setItem("taxId", tax.id);
    navigate("/taxform");
  };

  const handleAdd = () => navigate("/taxform");

  // 👉 View on Map (auto-popup)
  const handleViewOnMap = async (tax) => {
    setNavBusyId(tax.id);

    // 1) Prefer ParcelId when present
    const parcelId = toStr(tax.parcelId ?? tax.ParcelId ?? tax.parcelID ?? "");
    if (parcelId) {
      navigate(`/map/${encodeURIComponent(parcelId)}`);
      setNavBusyId(null);
      return;
    }

    // 2) Fallback: pass lot + barangay as hints to MapPage
    const hint = {
      lotNo: toStr(tax.lotNo ?? tax.LotNumber ?? ""),
      barangay: toStr(tax.barangay ?? tax.BarangayNa ?? ""),
      showPopup: true,
    };
    try { localStorage.setItem("mapFocus", JSON.stringify(hint)); } catch {}
    navigate("/map");
    setNavBusyId(null);
  };

  const handleDelete = async (tax) => {
    const result = await Swal.fire({
      title: 'Delete this Tax Form?',
      text: `#${tax.arpNo} — ${tax.ownerName}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#d33',
      reverseButtons: true
    });

    if (!result.isConfirmed) return;

    try {
      Swal.fire({ title: "Deleting...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      await api.delete(`/tax/${tax.id}`);
      setTaxes((prev) => prev.filter((t) => t.id !== tax.id));
      await Swal.fire({ icon: "success", title: "Deleted", timer: 1200, showConfirmButton: false });
    } catch (error) {
      console.error("delete failed", error);
      Swal.fire('Error', 'Failed to delete tax form.', 'error');
    }
  };

  return (
    <div className="container mt-4">
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1" style={{ fontWeight: 700, color: "#1f2937" }}>
            <i className="bi bi-receipt me-2"></i>
            Tax Forms
          </h2>
          <p className="text-muted mb-0" style={{ fontSize: "14px" }}>
            Manage real property tax declarations and assessments.
          </p>
        </div>
        <Button 
          variant="primary" 
          onClick={handleAdd}
          className="d-flex align-items-center gap-2 px-4 py-2 rounded-pill shadow-sm"
          style={{ fontWeight: 600 }}
        >
          <i className="bi bi-plus-lg"></i>
          Add New
        </Button>
      </div>

      {/* Analytics Dashboard Section */}
      <div style={{ marginBottom: 32 }}>
        <h3 className="section-title">
          <i className="bi bi-graph-up"></i>
          Overview
        </h3>
        
        <div className="kpi-grid">
          <KpiCard 
            title="Total Records" 
            value={stats.total} 
            icon="bi-file-earmark-text" 
            color="blue" 
          />
          <KpiCard 
            title="Visible Records" 
            value={taxes.length} 
            icon="bi-eye" 
            color="green" 
          />
          <KpiCard 
            title="Paid (Visible)" 
            value={chartData.paymentStatus.datasets[0].data[0]} 
            icon="bi-check-circle" 
            color="purple" 
          />
          <KpiCard 
            title="Overdue (Visible)" 
            value={chartData.paymentStatus.datasets[0].data[1]} 
            icon="bi-exclamation-circle" 
            color="orange" 
          />
        </div>

        <div className="charts-grid">
           <div className="chart-card">
             <div className="chart-header">
               <h4 className="chart-title">Payment Status (Visible)</h4>
             </div>
             <div className="chart-container">
                <Doughnut 
                  data={chartData.paymentStatus} 
                  options={{ 
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '65%',
                    plugins: { 
                      legend: { 
                        position: 'bottom',
                        labels: { usePointStyle: true, padding: 20, font: { family: "'Inter', sans-serif" } }
                      } 
                    } 
                  }} 
                />
             </div>
           </div>
           
           <div className="chart-card">
             <div className="chart-header">
               <h4 className="chart-title">Top Barangays (Current Page)</h4>
             </div>
             <div className="chart-container">
                <Bar 
                  data={chartData.barangayDist} 
                  options={{ 
                    responsive: true,
                    maintainAspectRatio: false, 
                    plugins: { legend: { display: false } },
                    scales: { 
                      y: { 
                        beginAtZero: true, 
                        grid: { borderDash: [4, 4], color: '#f3f4f6', drawBorder: false },
                        ticks: { precision: 0, font: { family: "'Inter', sans-serif" } } 
                      },
                      x: {
                        grid: { display: false },
                        ticks: { font: { family: "'Inter', sans-serif" } }
                      }
                    }
                  }} 
                />
             </div>
           </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card shadow-sm border-0 rounded-4 mb-4">
        <div className="card-body p-3">
          <Form onSubmit={handleSearch}>

            <InputGroup>
              <InputGroup.Text className="bg-white border-end-0 rounded-start-pill ps-3">
                <i className="bi bi-search text-muted"></i>
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Search by ARP No, Owner, or Account No..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-start-0 rounded-end-pill shadow-none"
                style={{ paddingLeft: 0 }}
              />
              <Button 
                variant="primary" 
                type="submit" 
                disabled={searching}
                className="ms-2 rounded-pill px-4"
              >
                {searching ? "Searching..." : "Search"}
              </Button>
              {searchTerm && (
                <Button 
                  variant="light" 
                  className="ms-2 rounded-pill px-3 text-muted"
                  onClick={() => {
                    setSearchTerm("");
                    fetchTaxes(1);
                  }}
                >
                  Clear
                </Button>
              )}
            </InputGroup>
          </Form>
        </div>
      </div>

      {taxes.length > 0 ? (
        <div className="card shadow-sm border-0 rounded-4 overflow-hidden">
          <div className="card-body p-0">
            <Table striped hover responsive className="mb-0 align-middle">
              <thead className="bg-light">
                <tr>
                  <th className="py-3 px-4 text-uppercase text-secondary text-xs font-weight-bolder opacity-7 border-0">
                    ARP/TD No.
                  </th>
                  <th className="py-3 px-4 text-uppercase text-secondary text-xs font-weight-bolder opacity-7 border-0">
                    Owner
                  </th>
                  <th className="py-3 px-4 text-uppercase text-secondary text-xs font-weight-bolder opacity-7 border-0">
                    Location
                  </th>
                  <th className="py-3 px-4 text-uppercase text-secondary text-xs font-weight-bolder opacity-7 border-0">
                    Tax Status
                  </th>
                  <th className="py-3 px-4 text-uppercase text-secondary text-xs font-weight-bolder opacity-7 border-0" style={{ minWidth: 280 }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {taxes.map((tax) => {
                  const status = (tax.paymentStatus || "Unpaid");
                  const isPaid = status.toLowerCase() === 'paid';

                  return (
                  <tr key={tax.id} style={{ transition: "background 0.2s" }}>
                    <td className="px-4 py-3">
                      <div className="d-flex flex-column">
                        <span className="fw-bold text-dark">{tax.arpNo}</span>
                        <span className="text-muted small">{tax.tdPrintedNo || "No TD"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="d-flex flex-column">
                        <span className="fw-bold text-dark">{tax.ownerName}</span>
                        <span className="text-secondary small">{tax.accountNo}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="d-flex flex-column">
                        <span className="text-dark small">{tax.street || ""}</span>
                        <span className="text-secondary small fw-bold">{tax.barangay}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {isPaid ? (
                        <span className="badge bg-success bg-opacity-10 text-success px-3 py-2 rounded-pill">
                          <i className="bi bi-check-circle-fill me-1"></i> Paid
                        </span>
                      ) : (
                        <span className="badge bg-danger bg-opacity-10 text-danger px-3 py-2 rounded-pill">
                          <i className="bi bi-exclamation-circle-fill me-1"></i> Unpaid
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="d-flex gap-2">
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          className="rounded-pill px-3"
                          onClick={() => handleViewOnMap(tax)}
                          disabled={navBusyId === tax.id}
                          title="View on Map"
                        >
                          <i className="bi bi-geo-alt-fill"></i>
                        </Button>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="rounded-pill px-3"
                          onClick={() => handleEdit(tax)}
                          title="Edit"
                        >
                          <i className="bi bi-pencil-fill"></i>
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          className="rounded-pill px-3"
                          onClick={() => handleDelete(tax)}
                          title="Delete"
                        >
                          <i className="bi bi-trash-fill"></i>
                        </Button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        </div>
      ) : (
        <div className="text-center py-5 bg-light rounded-3 border border-dashed">
          <i className="bi bi-receipt text-muted display-4 mb-3 d-block"></i>
          <p className="text-muted h5">No tax forms found.</p>
          <Button variant="link" onClick={handleAdd}>Create a new tax declaration</Button>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-center mt-4 pb-4">
          <Pagination className="shadow-sm rounded-pill overflow-hidden">
            <Pagination.First onClick={() => handlePageChange(1)} disabled={currentPage === 1} />
            <Pagination.Prev onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} />
            
            {[...Array(totalPages)].map((_, idx) => {
              const pageNum = idx + 1;
              if (
                pageNum === 1 ||
                pageNum === totalPages ||
                (pageNum >= currentPage - 2 && pageNum <= currentPage + 2)
              ) {
                return (
                  <Pagination.Item
                    key={pageNum}
                    active={pageNum === currentPage}
                    onClick={() => handlePageChange(pageNum)}
                  >
                    {pageNum}
                  </Pagination.Item>
                );
              } else if (
                pageNum === currentPage - 3 ||
                pageNum === currentPage + 3
              ) {
                return <Pagination.Ellipsis key={`ellipsis-${pageNum}`} />;
              }
              return null;
            })}

            <Pagination.Next onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} />
            <Pagination.Last onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages} />
          </Pagination>
        </div>
      )}
    </div>
  );
}