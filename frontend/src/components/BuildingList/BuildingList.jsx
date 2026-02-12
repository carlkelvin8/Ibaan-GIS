import React, { useEffect, useState } from "react";
import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import api from "../../lib/axios.js";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import Pagination from "react-bootstrap/Pagination";

const BuildingList = () => {
  const navigate = useNavigate();
  const [buildings, setBuildings] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 25;

  const fetchBuildings = async (page = 1) => {
    try {
      const res = await api.get(`/building?page=${page}&limit=${itemsPerPage}`);
      console.log("Fetch result:", res.data); // Debug log
      
      if (res.data && Array.isArray(res.data.data)) {
          setBuildings(res.data.data);
          setTotalPages(res.data.totalPages || 1);
          setCurrentPage(page);
      } else if (Array.isArray(res.data)) {
          // Fallback for non-paginated response
          setBuildings(res.data);
          setTotalPages(1); 
          setCurrentPage(1);
      }
      localStorage.removeItem("buildingNum");
    } catch (error) {
      console.log("error fetching data:", error);
      Swal.fire({ icon: "error", title: "Fetch failed", text: "Cannot load buildings." });
    }
  };

  useEffect(() => {
    fetchBuildings(1);
  }, []);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchBuildings(newPage);
    }
  };

  const handleEdit = (building) => {
    localStorage.setItem("buildingNum", building.building_num);
    navigate("/building");
  };

  const handleAdd = () => navigate("/building");

  const handleDelete = async (building) => {
    const { isConfirmed } = await Swal.fire({
      icon: "warning",
      title: "Delete this building?",
      text: `#${building.building_num} — ${building.buildingName}`,
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#d33",
      reverseButtons: true,
    });
    if (!isConfirmed) return;

    try {
      Swal.fire({ title: "Deleting...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      await api.delete(`/building/${building.building_num}`);
      setBuildings((prev) => prev.filter((b) => b.building_num !== building.building_num));
      await Swal.fire({ icon: "success", title: "Deleted", timer: 1200, showConfirmButton: false });
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error || err.message || "Delete failed.";
      Swal.fire({ icon: "error", title: "Delete failed", text: msg });
    }
  };

  return (
    <div className="container mt-4">
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1" style={{ fontWeight: 700, color: "#1f2937" }}>
            <i className="bi bi-building me-2"></i>
            Building List
          </h2>
          <p className="text-muted mb-0" style={{ fontSize: "14px" }}>
            Manage and view all registered building structures.
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

      {buildings.length > 0 ? (
        <div className="card shadow-sm border-0 rounded-4 overflow-hidden">
          <div className="card-body p-0">
            <Table striped hover responsive className="mb-0 align-middle">
              <thead className="bg-light">
                <tr>
                  <th className="py-3 px-4 text-uppercase text-secondary text-xs font-weight-bolder opacity-7 border-0">
                    Building No.
                  </th>
                  <th className="py-3 px-4 text-uppercase text-secondary text-xs font-weight-bolder opacity-7 border-0">
                    Name
                  </th>
                  <th className="py-3 px-4 text-uppercase text-secondary text-xs font-weight-bolder opacity-7 border-0">
                    Use Type
                  </th>
                  <th className="py-3 px-4 text-uppercase text-secondary text-xs font-weight-bolder opacity-7 border-0">
                    Structure Type
                  </th>
                  <th className="py-3 px-4 text-uppercase text-secondary text-xs font-weight-bolder opacity-7 border-0" style={{ minWidth: 180 }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {buildings.map((building) => (
                  <tr key={building.building_num} style={{ transition: "background 0.2s" }}>
                    <td className="px-4 py-3">
                      <span className="badge bg-light text-dark border">
                        #{building.building_num}
                      </span>
                    </td>
                    <td className="px-4 py-3 fw-bold text-dark">
                      {building.buildingName}
                    </td>
                    <td className="px-4 py-3 text-secondary">
                      {building.buildingUseType}
                    </td>
                    <td className="px-4 py-3 text-secondary">
                      {building.buildingType}
                    </td>
                    <td className="px-4 py-3">
                      <div className="d-flex gap-2">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="rounded-pill px-3"
                          onClick={() => handleEdit(building)}
                        >
                          <i className="bi bi-pencil-fill me-1"></i> Edit
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          className="rounded-pill px-3"
                          onClick={() => handleDelete(building)}
                        >
                          <i className="bi bi-trash-fill me-1"></i> Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </div>
      ) : (
        <div className="text-center py-5 bg-light rounded-3 border border-dashed">
          <i className="bi bi-building text-muted display-4 mb-3 d-block"></i>
          <p className="text-muted h5">No buildings found.</p>
          <Button variant="link" onClick={handleAdd}>Create your first building</Button>
        </div>
      )}
      
      {totalPages > 1 && (
          <div className="d-flex justify-content-center mt-4 pb-4">
            <Pagination className="shadow-sm rounded-pill overflow-hidden">
              <Pagination.First onClick={() => handlePageChange(1)} disabled={currentPage === 1} />
              <Pagination.Prev onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} />
              
              {[...Array(totalPages)].map((_, idx) => {
                const pageNum = idx + 1;
                // Simplified logic to show cleaner pagination range
                // Always show first, last, and pages around current
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

export default BuildingList;