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
          params: { t: Date.now() }, // cache-buster only (no custom headers)
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
          text: status
            ? `HTTP ${status} — ${
                typeof e.response.data === "string"
                  ? e.response.data
                  : JSON.stringify(e.response.data)
              }`
            : e.message || "Cannot load building.",
        });
      }
    })();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    const { isConfirmed } = await Swal.fire({
      icon: "question",
      title: isEdit ? "Update building?" : "Save new building?",
      showCancelButton: true,
      confirmButtonText: isEdit ? "Update" : "Save",
    });
    if (!isConfirmed) return;

    try {
      setSaving(true);
      Swal.fire({ title: "Saving...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });

      if (isEdit) {
        const id = idRef.current || localStorage.getItem("buildingNum");
        if (!id) throw new Error("Missing building number for update.");
        const { building_num, ...payload } = form; // don't send PK
        await api.put(`/building/${id}`, payload);
        localStorage.removeItem("buildingNum");
      } else {
        await api.post("/building", form);
      }

      await Swal.fire({ icon: "success", title: "Success", timer: 1200, showConfirmButton: false });
      navigate("/buildinglist");
    } catch (err) {
      console.error("Save error ▶", { status: err?.response?.status, data: err?.response?.data, msg: err.message });
      const msg = err.response
        ? `HTTP ${err.response.status} — ${
            typeof err.response.data === "string" ? err.response.data : JSON.stringify(err.response.data)
          }`
        : err.message;
      Swal.fire({ icon: "error", title: "Save failed", text: msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mt-4">
      <h3>Building Form</h3>
      <form className="row g-3" onSubmit={handleSubmit}>
        {/* Building Number (PK) */}
        <div className="col-md-6">
          <label className="form-label">Building Number</label>
          <input
            type="text"
            className="form-control"
            name="building_num"
            value={form.building_num}
            onChange={handleChange}
            disabled
          />
        </div>

        {/* Building Name */}
        <div className="col-md-6">
          <label className="form-label">Building Name</label>
          <input
            type="text"
            className="form-control"
            name="buildingName"
            value={form.buildingName}
            onChange={handleChange}
            required
          />
        </div>

        {/* Building Use Type */}
        <div className="col-md-6">
          <label className="form-label">Building Use Type</label>
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
          <label className="form-label">Building Type</label>
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
        <div className="col-md-6">
          <label className="form-label">Area</label>
          <input
            type="text"
            className="form-control"
            name="area"
            value={form.area}
            onChange={handleChange}
            placeholder="e.g., 250 sqm"
          />
        </div>

        {/* Submit */}
        <div className="col-12">
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Update Building" : "Save Building"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Building;