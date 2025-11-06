// frontend/src/components/TaxList/TaxList.jsx
import React, { useEffect, useState } from "react";
import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import api from "../../lib/axios.js";
import { useNavigate } from "react-router-dom";

const toStr = (v) => (v == null ? "" : String(v).trim());
const up = (v) => toStr(v).toUpperCase();

export default function TaxList() {
  const navigate = useNavigate();
  const [taxes, setTaxes] = useState([]);
  const [navBusyId, setNavBusyId] = useState(null);

  const fetchTaxes = async () => {
    try {
      const res = await api.get("/tax");
      setTaxes(Array.isArray(res.data) ? res.data : []);
      localStorage.removeItem("taxId");
    } catch (error) {
      console.log("error fetching data:", error);
      setTaxes([]);
    }
  };

  useEffect(() => { fetchTaxes(); }, []);

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
    try {
      await api.delete(`/tax/${tax.id}`);
      await fetchTaxes();
    } catch (error) {
      console.error("delete failed", error);
      alert("Failed to delete tax form.");
    }
  };

  return (
    <div className="container mt-4">
      <h2>Taxes List</h2>
      <Button variant="primary" onClick={handleAdd} className="mb-3">Add New</Button>

      {taxes.length > 0 ? (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>ARP/TD No.</th>
              <th>Account No.</th>
              <th>Owner’s Name</th>
              <th style={{ width: 300 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {taxes.map((tax) => (
              <tr key={tax.id}>
                <td>{tax.arpNo}</td>
                <td>{tax.accountNo}</td>
                <td>{tax.ownerName}</td>
                <td>
                  <div className="d-flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleViewOnMap(tax)}
                      disabled={navBusyId === tax.id}
                    >
                      {navBusyId === tax.id ? "Opening…" : "View on Map"}
                    </Button>
                    <Button variant="primary" size="sm" onClick={() => handleEdit(tax)}>Edit</Button>
                    <Button variant="danger" size="sm" onClick={() => handleDelete(tax)}>Delete</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <p className="text-muted">No results found.</p>
      )}
    </div>
  );
}