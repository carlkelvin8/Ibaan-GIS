import React, { useEffect, useState } from "react";
import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
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

  const toStr = (v) => (v == null ? "" : String(v).trim());

  useEffect(() => {
    const fetchLandParcel = async () => {
      try {
        const res = await api.get("/landparcel");
        setParcels(Array.isArray(res.data) ? res.data : []);
        localStorage.removeItem("parcelID");
      } catch (error) {
        console.error("error fetching data", error);
        setParcels([]);
      }
    };
    fetchLandParcel();
  }, []);

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
      <h2>Land Parcel List</h2>
      <Button className="mb-3" onClick={handleAdd}>
        Add New
      </Button>

      {parcels.length > 0 ? (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Parcel ID</th>
              <th>Street Address</th>
              <th>Barangay</th>
              <th>Municipality</th>
              <th>Zip Code</th>
              <th style={{ minWidth: 300 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {parcels.map((parcel) => {
              const rowPid = parcel.parcelID ?? parcel.ParcelId ?? parcel.parcelId ?? parcel.PARCELID;
              const busyNav = navBusyId === rowPid;
              const busyDel = deletingId === rowPid;

              return (
                <tr key={rowPid ?? `row-${Math.random()}`}>
                  <td>{rowPid}</td>
                  <td>{parcel.StreetAddress}</td>
                  <td>{parcel.Barangay}</td>
                  <td>{parcel.Municipality}</td>
                  <td>{parcel.ZipCode}</td>
                  <td>
                    <div className="d-flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleViewOnMap(parcel)}
                        disabled={busyNav || busyDel}
                      >
                        {busyNav ? "Opening…" : "View on Map"}
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleEdit(parcel)}
                        disabled={busyDel}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(parcel)}
                        disabled={busyDel}
                      >
                        {busyDel ? "Deleting…" : "Delete"}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      ) : (
        <p className="text-muted">No results found.</p>
      )}
    </div>
  );
};

export default LandParcelList;