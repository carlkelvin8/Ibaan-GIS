import React, { useState, useEffect } from "react";
import api from "../../lib/axios.js";
import { useNavigate } from "react-router-dom";

// helpers similar to TaxList
const toStr = (v) => (v == null ? "" : String(v).trim());
const up = (v) => toStr(v).toUpperCase();

// Lazy modal to avoid hard dependency at build; prefers SweetAlert2
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
    // Fallback to native confirm if sweetalert2 isn't installed yet
    return window.confirm(`Redirecting to: ${parcelId}. Continue?`);
  }
}

const Parcel = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [location, setLocation] = useState("");
  const [results, setResults] = useState([]);

  const handleSearch = async () => {
    try {
      let res = "";
      if (location === "ibaan") {
        res = await api.get("/ibaan/search/" + encodeURIComponent(searchTerm));
      } else {
        res = await api.get("/alameda/search/" + encodeURIComponent(searchTerm));
      }

      if (res.data.ID === 0) {
        alert(res.data.message);
        setResults([]);
      } else {
        const dataArray = Array.isArray(res.data) ? res.data : [res.data];
        setResults(dataArray);
        localStorage.setItem("results", JSON.stringify(dataArray));
      }
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    const isParcel = localStorage.getItem("isParcel") === "true";
    if (isParcel) {
      localStorage.removeItem("ParcelId");
      const storedSearchTerm = localStorage.getItem("searchTerm");
      const storedLocation = localStorage.getItem("location");
      const storedResults = localStorage.getItem("results");
      setSearchTerm(storedSearchTerm || "");
      setLocation(storedLocation || "");
      if (storedResults && storedResults !== "undefined" && storedResults !== "") {
        try {
          setResults(JSON.parse(storedResults));
        } catch (err) {
          console.error("Failed to parse results:", storedResults, err);
        }
      }
    }
    localStorage.setItem("isParcel", false);
  }, []);

  const handleEdit = (parcel) => {
    const ParcelId = parcel.ParcelId;
    localStorage.setItem("ParcelId", ParcelId);
    localStorage.setItem("searchTerm", searchTerm);
    localStorage.setItem("location", location);
    if (location === "ibaan") {
      navigate("/ibaan");
    } else {
      navigate("/alameda");
    }
  };

  // NEW: View on Map with confirmation modal
  const handleViewOnMap = async (row) => {
    // Prefer ParcelId from the row itself
    let parcelId = toStr(row.ParcelId ?? row.parcelId ?? row.parcelID ?? row.PARCELID ?? "");

    // Fallback context for focusing by lot/brgy when ParcelId is not present
    const lot = up(row.LotNumber ?? row.lotNo ?? row.lotNo2 ?? "");
    const brgy = up(row.BarangayNa ?? row.barangay ?? "");

    if (parcelId) {
      const ok = await showRedirectModal(parcelId);
      if (ok) navigate(`/${encodeURIComponent(parcelId)}`);
      return;
    }

    // No ParcelId — instruct MapPage to try focusing by lot/brgy
    try {
      localStorage.removeItem("taxId");
      localStorage.setItem(
        "mapFocus",
        JSON.stringify({
          parcelId: "",
          lotNo: lot,
          barangay: brgy,
          label: toStr(row.Claimant || row.ownerName || row.ParcelId || "Selected Parcel"),
        })
      );
    } catch (e) {
      console.warn("Failed to write mapFocus:", e);
    }
    alert("ParcelId not found. Focusing by Lot/Barangay…");
    navigate("/");
  };

  const handleAdd = () => {
    if (location === "ibaan") {
      navigate("/ibaan");
    } else {
      navigate("/alameda");
    }
  };

  return (
    <div className="container mt-4">
      <h4>Search Parcels</h4>

      {/* Location Dropdown */}
      <div className="row mb-3">
        <div className="col-md-4">
          <select
            className="form-select"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          >
            <option value="">Select Location</option>
            <option value="ibaan">Ibaan</option>
          </select>
        </div>
      </div>

      {/* Search Input */}
      <div className="row mb-3">
        <div className="col-md-6">
          <select
              className="form-control"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
          >
            <option value="">Select Barangay</option>
            <option value="Bago">Bago</option>
            <option value="Balanga">Balanga</option>
            <option value="Bungahan">Bungahan</option>
            <option value="Calamias">Calamias</option>
            <option value="Catandala">Catandala</option>
            <option value="Coliat">Coliat</option>
            <option value="Dayapan">Dayapan</option>
            <option value="Lapu-Lapu">Lapu-Lapu</option>
            <option value="Lucsuhin">Lucsuhin</option>
            <option value="Mabalor">Mabalor</option>
            <option value="Malainin">Malainin</option>
            <option value="Matala">Matala</option>
            <option value="Munting-Tubig">Munting-Tubig</option>
            <option value="Palindan">Palindan</option>
            <option value="Pangao">Pangao</option>
            <option value="Panghayaan">Panghayaan</option>
            <option value="Poblacion">Poblacion</option>
            <option value="Quilo">Quilo</option>
            <option value="Sabang">Sabang</option>
            <option value="Salaban I">Salaban I</option>
            <option value="Salaban II">Salaban II</option>
            <option value="San Agustin">San Agustin</option>
            <option value="Sandalan">Sandalan</option>
            <option value="Santo Niño">Santo Niño</option>
            <option value="Talaibon">Talaibon</option>
            <option value="Tulay Na Patpat">Tulay Na Patpat</option>
          </select>
        </div>
        <div className="col-md-auto mt-2 mt-md-0">
          <button className="btn btn-primary me-2" onClick={handleSearch}>
            Search
          </button>
          <button className="btn btn-primary" onClick={handleAdd}>
            Add
          </button>
        </div>
      </div>

      {/* Results Table */}
      {results.length > 0 ? (
        <table className="table table-striped table-bordered table-hover table-responsive">
          <thead>
            <tr>
              <th>Parcel ID</th>
              <th>Owner</th>
              <th>Barangay</th>
              <th style={{ width: 300 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {results.map((parcel, index) => (
              <tr key={index}>
                <td>{parcel.ParcelId}</td>
                <td>{parcel.Claimant}</td>
                <td>{parcel.BarangayNa}</td>
                <td>
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleViewOnMap(parcel)}
                    >
                      View on Map
                    </button>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleEdit(parcel)}
                    >
                      Edit
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-muted">No results found.</p>
      )}
    </div>
  );
};

export default Parcel;
