import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/axios.js";
import "bootstrap/dist/css/bootstrap.min.css";
import Swal from "sweetalert2";

const Building = () => {
  const navigate = useNavigate();

  const idRef = useRef(null);          // stable id for PUT
  const fetchedRef = useRef(false);    // StrictMode guard
  const [isEdit, setIsEdit] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    building_num: "",
    buildingName: "",
    buildingUseType: "",
    buildingType: "",
    area: "",
  });

  useEffect(() => {
    if (fetchedRef.current) return; // prevent double-run in StrictMode
    fetchedRef.current = true;

    (async () => {
      try {
        const raw = localStorage.getItem("buildingNum");
        const id = Number(raw);
        const hasValidId = Number.isFinite(id) && id > 0;

        if (!hasValidId) {
          localStorage.removeItem("buildingNum");
          setIsEdit(false);
          return; // create mode
        }

        const res = await api.get(`/building/${id}`, {
          params: { t: Date.now() }, // cache-buster
        });

        const r = res.data;
        idRef.current = String(r.building_num);
        setForm({
          building_num: String(r.building_num ?? ""),
          buildingName: r.buildingName ?? "",
          buildingUseType: r.buildingUseType ?? "",
          buildingType: r.buildingType ?? "",
          area: r.area ?? "",
        });
        setIsEdit(true);
      } catch (e) {
        const status = e?.response?.status;
        if (status === 404) {
          localStorage.removeItem("buildingNum");
          setIsEdit(false);
          return;
        }
        console.error("Fetch error ▶", { status, data: e?.response?.data, msg: e.message });
        Swal.fire({
          icon: "error",
          title: "Fetch failed",
          text: e.message || "Cannot load building.",
        });
      }
    })();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const cancel = () => navigate("/buildinglist");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    // Show confirmation dialog
    const { isConfirmed } = await Swal.fire({
      icon: "question",
      title: isEdit ? "Update building?" : "Save new building?",
      showCancelButton: true,
      confirmButtonText: isEdit ? "Update" : "Save",
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
    });
    
    if (!isConfirmed) return;

    try {
      setSaving(true);
      
      if (isEdit) {
        // UPDATE MODE
        const id = idRef.current || localStorage.getItem("buildingNum");
        if (!id) throw new Error("Missing building number for update.");
        
        const { building_num, ...payload } = form; 
        await api.put(`/building/${id}`, payload);
        localStorage.removeItem("buildingNum");
      } else {
        // CREATE MODE
        const { building_num, ...payload } = form;
        await api.post("/building", payload);
      }

      await Swal.fire({ 
        icon: "success", 
        title: "Success", 
        text: "Building record saved successfully!",
        timer: 1500, 
        showConfirmButton: false 
      });
      
      navigate("/buildinglist");
      
    } catch (err) {
      console.error("Save error ▶", err);
      const msg = err.response?.data?.error || err.message || "Unknown error occurred";
      Swal.fire({ 
        icon: "error", 
        title: "Save failed", 
        text: msg 
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mt-4">
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1" style={{ fontWeight: 700, color: "#1f2937" }}>
            <i className="bi bi-building me-2"></i>
            {isEdit ? "Edit Building" : "New Building"}
          </h2>
          <p className="text-muted mb-0" style={{ fontSize: "14px" }}>
            Manage building information and specifications.
          </p>
        </div>
        <button 
          className="btn btn-outline-secondary rounded-pill px-4"
          onClick={cancel}
        >
          <i className="bi bi-arrow-left me-2"></i>
          Back to List
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="row g-4">
          <div className="col-lg-8 mx-auto">
            <div className="card border-0 shadow-sm rounded-4 mb-5">
              <div className="card-header bg-white border-0 pt-4 px-4 pb-0">
                <h5 className="fw-bold text-primary mb-0">
                  <i className="bi bi-info-circle me-2"></i>
                  Building Details
                </h5>
              </div>
              <div className="card-body p-4">
                <div className="row g-3">
                  
                  {/* Building Number (Read-only if exists) */}
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-secondary small text-uppercase">Building Number</label>
                    <input
                      type="text"
                      className="form-control"
                      name="building_num"
                      value={form.building_num}
                      onChange={handleChange}
                      disabled
                      placeholder="Auto-generated"
                    />
                  </div>

                  {/* Building Name */}
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-secondary small text-uppercase">Building Name <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      name="buildingName"
                      value={form.buildingName}
                      onChange={handleChange}
                      required
                      placeholder="Enter building name"
                    />
                  </div>

                  {/* Building Use Type */}
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-secondary small text-uppercase">Use Type <span className="text-danger">*</span></label>
                    <select
                      className="form-select"
                      name="buildingUseType"
                      value={form.buildingUseType}
                      onChange={handleChange}
                      required
                    >
                      <option value="">-- Select Use Type --</option>
                      <option value="Residential">Residential</option>
                      <option value="Commercial">Commercial</option>
                      <option value="Common Property">Common Property</option>
                      <option value="Parking Space">Parking Space</option>
                    </select>
                  </div>

                  {/* Building Type */}
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-secondary small text-uppercase">Building Type <span className="text-danger">*</span></label>
                    <select
                      className="form-select"
                      name="buildingType"
                      value={form.buildingType}
                      onChange={handleChange}
                      required
                    >
                      <option value="">-- Select Type --</option>
                      <option value="Condominium">Condominium</option>
                      <option value="Apartment">Apartment</option>
                      <option value="Single-detached">Single-detached</option>
                      <option value="Town House">Town House</option>
                      <option value="Bungalow">Bungalow</option>
                      <option value="Warehouse">Warehouse</option>
                      <option value="Parking Space">Parking Space</option>
                    </select>
                  </div>

                  {/* Area */}
                  <div className="col-md-12">
                    <label className="form-label fw-semibold text-secondary small text-uppercase">Area</label>
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control"
                        name="area"
                        value={form.area}
                        onChange={handleChange}
                        placeholder="e.g., 250"
                      />
                      <span className="input-group-text bg-light text-secondary">sqm</span>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Bottom Action Bar */}
        <div className="fixed-bottom bg-white border-top py-3 px-4 shadow-lg d-flex justify-content-end gap-2" style={{ zIndex: 1020, left: '256px' }}>
          <button type="button" className="btn btn-light border" onClick={cancel} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary px-5 rounded-pill fw-bold" disabled={saving}>
            {saving ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Saving...
              </>
            ) : (
              <>
                <i className="bi bi-save me-2"></i>
                {isEdit ? "Update Building" : "Save Building"}
              </>
            )}
          </button>
        </div>
      </form>
      
      {/* Spacer for fixed footer */}
      <div style={{ height: '80px' }}></div>
    </div>
  );
};

export default Building;
