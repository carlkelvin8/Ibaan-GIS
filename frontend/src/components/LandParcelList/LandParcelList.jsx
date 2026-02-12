import React, { useEffect, useState } from "react";
import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import Pagination from "react-bootstrap/Pagination";
import api from "../../lib/axios.js";
import { useNavigate } from "react-router-dom";

// Lazy modal helpers reused across pages (SweetAlert2 preferred)
async function showRedirectModal(parcelId) {
  try {
    const { default: Swal } = await import("sweetalert2");
    const res = await Swal.fire({
      title: "Redirecting",
      html: `Redirecting to: <strong>${parcelId}</strong>`,
      icon: "info",
      showCancelButton: true,
      confirmButtonText: "Continue",
      cancelButtonText: "Cancel",
      allowOutsideClick: false,
      allowEscapeKey: true,
    });
    return !!res.isConfirmed;
  } catch (e) {
    return window.confirm(`Redirecting to: ${parcelId}. Continue?`);
  }
}

async function showInfo(message) {
  try {
    const { default: Swal } = await import("sweetalert2");
    await Swal.fire({ title: "Notice", text: message, icon: "info" });
  } catch (e) {
    alert(message);
  }
}

async function confirmDelete(pid) {
  try {
    const { default: Swal } = await import("sweetalert2");
    const res = await Swal.fire({
      title: "Delete parcel?",
      html: `This will permanently delete <strong>Parcel ID ${pid}</strong>.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#d33",
      reverseButtons: true,
    });
    return !!res.isConfirmed;
  } catch {
    return window.confirm(`Delete Parcel ID ${pid}? This cannot be undone.`);
  }
}

const LandParcelList = () => {
  const navigate = useNavigate();
  const [parcels, setParcels] = useState([]);
  const [navBusyId, setNavBusyId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 25;

  const toStr = (v) => (v == null ? "" : String(v).trim());

  const fetchLandParcel = async (page = 1, search = searchTerm) => {
    try {
      const res = await api.get(`/landparcel`, {
        params: {
          page,
          limit: itemsPerPage,
          search: search || undefined
        }
      });
      if (res.data && Array.isArray(res.data.data)) {
        setParcels(res.data.data);
        setTotalPages(res.data.totalPages || 1);
        setCurrentPage(page);
      } else if (Array.isArray(res.data)) {
        // Fallback for non-paginated API
        setParcels(res.data);
        setTotalPages(1);
      } else {
        setParcels([]);
      }
      localStorage.removeItem("parcelID");
    } catch (error) {
      console.error("error fetching data", error);
      setParcels([]);
    }
  };

  useEffect(() => {
    fetchLandParcel(1, "");
  }, []);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchLandParcel(newPage, searchTerm);
    }
  };

  const handleSearch = async (e) => {
    e?.preventDefault();
    setSearching(true);
    // Reset to page 1 on new search
    await fetchLandParcel(1, searchTerm);
    setSearching(false);
  };

  const handleEdit = (parcel) => {
    const pid = parcel.parcelID ?? parcel.ParcelId ?? parcel.parcelId ?? parcel.PARCELID;
    if (pid) localStorage.setItem("parcelID", pid);
    navigate("/landparcel");
  };

  const handleAdd = () => navigate("/landparcel");

  // ✅ FIXED: navigate to /map/:parcelId
  const handleViewOnMap = async (parcel) => {
    const pid = toStr(
      parcel.parcelID ?? parcel.ParcelId ?? parcel.parcelId ?? parcel.PARCELID ?? ""
    );
    if (!pid) {
      await showInfo("This row has no Parcel ID.");
      return;
    }

    const rowPid = parcel.parcelID ?? parcel.ParcelId ?? parcel.parcelId ?? pid;
    setNavBusyId(rowPid);

    const ok = await showRedirectModal(pid);
    if (ok) {
      navigate(`/map/${encodeURIComponent(pid)}`);
      // If you ever switch to querystring, use:
      // navigate(`/map?parcelId=${encodeURIComponent(pid)}`);
    }
    setNavBusyId(null);
  };

  const handleDelete = async (parcel) => {
    const pid =
      parcel.parcelID ?? parcel.ParcelId ?? parcel.parcelId ?? parcel.PARCELID;
    if (!pid) {
      await showInfo("This row has no Parcel ID to delete.");
      return;
    }

    const ok = await confirmDelete(pid);
    if (!ok) return;

    setDeletingId(pid);
    try {
      await api.delete(`/landparcel/${encodeURIComponent(pid)}`);
      setParcels((prev) =>
        prev.filter((p) => {
          const curId = p.parcelID ?? p.ParcelId ?? p.parcelId ?? p.PARCELID;
          return String(curId) !== String(pid);
        })
      );
      await showInfo(`Parcel ${pid} deleted successfully.`);
    } catch (err) {
      console.error("delete error", err);
      const msg = err?.response?.data?.error || err?.message || "Delete failed";
      await showInfo(`Failed to delete Parcel ${pid}: ${msg}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="container mt-4">
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1" style={{ fontWeight: 700, color: "#1f2937" }}>
            <i className="bi bi-map me-2"></i>
            Land Parcel List
          </h2>
          <p className="text-muted mb-0" style={{ fontSize: "14px" }}>
            View and manage land parcel records and assessments.
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
                placeholder="Search by Parcel ID, Address, or Barangay..."
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
                    fetchLandParcel();
                  }}
                >
                  Clear
                </Button>
              )}
            </InputGroup>
          </Form>
        </div>
      </div>

      {parcels.length > 0 ? (
        <div className="card shadow-sm border-0 rounded-4 overflow-hidden">
          <div className="card-body p-0">
            <Table striped hover responsive className="mb-0 align-middle">
              <thead className="bg-light">
                <tr>
                  <th className="py-3 px-4 text-uppercase text-secondary text-xs font-weight-bolder opacity-7 border-0">
                    Parcel ID
                  </th>
                  <th className="py-3 px-4 text-uppercase text-secondary text-xs font-weight-bolder opacity-7 border-0">
                    Street Address
                  </th>
                  <th className="py-3 px-4 text-uppercase text-secondary text-xs font-weight-bolder opacity-7 border-0">
                    Barangay
                  </th>
                  <th className="py-3 px-4 text-uppercase text-secondary text-xs font-weight-bolder opacity-7 border-0">
                    Municipality
                  </th>
                  <th className="py-3 px-4 text-uppercase text-secondary text-xs font-weight-bolder opacity-7 border-0">
                    Zip Code
                  </th>
                  <th className="py-3 px-4 text-uppercase text-secondary text-xs font-weight-bolder opacity-7 border-0" style={{ minWidth: 320 }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {parcels.map((parcel) => {
                  const rowPid = parcel.parcelID ?? parcel.ParcelId ?? parcel.parcelId ?? parcel.PARCELID;
                  const busyNav = navBusyId === rowPid;
                  const busyDel = deletingId === rowPid;

                  return (
                    <tr key={rowPid ?? `row-${Math.random()}`} style={{ transition: "background 0.2s" }}>
                      <td className="px-4 py-3">
                        <span className="badge bg-light text-dark border">
                          {rowPid}
                        </span>
                      </td>
                      <td className="px-4 py-3 fw-bold text-dark text-truncate" style={{ maxWidth: 200 }}>
                        {parcel.StreetAddress}
                      </td>
                      <td className="px-4 py-3 text-secondary">
                        {parcel.Barangay}
                      </td>
                      <td className="px-4 py-3 text-secondary">
                        {parcel.Municipality}
                      </td>
                      <td className="px-4 py-3 text-secondary">
                        {parcel.ZipCode}
                      </td>
                      <td className="px-4 py-3">
                        <div className="d-flex gap-2">
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            className="rounded-pill px-3"
                            onClick={() => handleViewOnMap(parcel)}
                            disabled={busyNav || busyDel}
                            title="View on Map"
                          >
                            <i className="bi bi-geo-alt-fill"></i>
                          </Button>
                          <Button
                            variant="outline-info"
                            size="sm"
                            className="rounded-pill px-3"
                            onClick={() => navigate(`/parcel-details/${encodeURIComponent(rowPid)}`)}
                            disabled={busyDel}
                            title="Details"
                          >
                            <i className="bi bi-info-circle-fill"></i>
                          </Button>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="rounded-pill px-3"
                            onClick={() => handleEdit(parcel)}
                            disabled={busyDel}
                            title="Edit"
                          >
                            <i className="bi bi-pencil-fill"></i>
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            className="rounded-pill px-3"
                            onClick={() => handleDelete(parcel)}
                            disabled={busyDel}
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
          <i className="bi bi-map text-muted display-4 mb-3 d-block"></i>
          <p className="text-muted h5">No land parcels found.</p>
          <Button variant="link" onClick={handleAdd}>Add a new parcel</Button>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-center mt-4">
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
};

export default LandParcelList;