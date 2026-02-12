import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from '../../lib/axios.js';
import Swal from 'sweetalert2';
import "bootstrap/dist/css/bootstrap.min.css";

const LandParcel = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [parcel, setParcel] = useState({
    parcelID: "",
    improvement: false,
    totalValue: 0,
    StreetAddress: "",
    Barangay: "",
    Municipality: "",
    ZipCode: 0,
    areaSize: 0,
    propertyType: "",
    actualLandUse: "",
    // New fields
    classification: "",
    assessed_value: 0,
    market_value: 0,
    delinquent: false,
    delinquent_amount: 0,
    last_payment_date: ""
  });

  const isEditMode = !!localStorage.getItem("parcelID");

  useEffect(() => {
    const fetchLandParcel = async () => {
      try {             
        const storedPID = localStorage.getItem("parcelID");
        if(storedPID) {
            const res = await api.get("/landparcel/" + storedPID);
            const data = res.data;
            setParcel({
                parcelID: data.parcelID ?? data.ParcelId ?? data.parcelId ?? data.PARCELID ?? storedPID,
                improvement: data.improvement ?? false,
                totalValue: data.totalValue ?? 0,
                StreetAddress: data.StreetAddress ?? "",
                Barangay: data.Barangay ?? "",
                Municipality: data.Municipality ?? "",
                ZipCode: data.ZipCode ?? 0,
                areaSize: data.areaSize ?? data.area_sqm ?? 0, // Coalesce area
                propertyType: data.propertyType ?? "",
                actualLandUse: data.actualLandUse ?? "",
                // Map new fields
                classification: data.classification ?? "",
                assessed_value: data.assessed_value ?? 0,
                market_value: data.market_value ?? 0,
                delinquent: data.delinquent ?? false,
                delinquent_amount: data.delinquent_amount ?? 0,
                last_payment_date: data.last_payment_date ? data.last_payment_date.split('T')[0] : ""
            });
        }
      } catch (error) {
        console.error(error);
        Swal.fire("Error", "Failed to fetch parcel data", "error");
      } 
    }
    fetchLandParcel();
  },[]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setParcel({
      ...parcel,
      [name]: type === "checkbox" ? checked : value
    });
  };

  const cancel = () => navigate("/landparcellist");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    try {
      setSaving(true);
      const storedPID = localStorage.getItem("parcelID");
      const targetID = storedPID || parcel.parcelID;

      if (!targetID && !storedPID) {
          Swal.fire("Error", "Parcel ID is required.", "error");
          setSaving(false);
          return;
      }

      const parcelData = { ...parcel };
      parcelData.totalValue = Number(parcelData.totalValue) || 0;
      parcelData.ZipCode = Number(parcelData.ZipCode) || 0;
      parcelData.areaSize = Number(parcelData.areaSize) || 0;
      parcelData.market_value = Number(parcelData.market_value) || 0;
      parcelData.assessed_value = Number(parcelData.assessed_value) || 0;
      parcelData.delinquent_amount = Number(parcelData.delinquent_amount) || 0;
      
      if (storedPID) {
          await api.put(`/landparcel/${storedPID}`, parcelData);
          await Swal.fire("Success", "Parcel updated successfully!", "success");
          localStorage.removeItem("parcelID");
      } else {
          await api.post("/landparcel", parcelData);
          await Swal.fire("Success", "Parcel saved successfully!", "success");
      }
      navigate("/landparcellist");
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to save parcel.", "error");
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
            <i className="bi bi-map me-2"></i>
            {isEditMode ? "Edit Land Parcel" : "New Land Parcel"}
          </h2>
          <p className="text-muted mb-0" style={{ fontSize: "14px" }}>
            Manage land parcel information and geolocation data.
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
          {/* Left Column: Basic Info */}
          <div className="col-lg-6">
            <div className="card border-0 shadow-sm rounded-4 mb-4 h-100">
              <div className="card-header bg-white border-0 pt-4 px-4 pb-0">
                <h5 className="fw-bold text-primary mb-0">
                  <i className="bi bi-card-heading me-2"></i>
                  Basic Information
                </h5>
              </div>
              <div className="card-body p-4">
                <div className="mb-3">
                  <label className="form-label fw-semibold text-secondary small text-uppercase">Parcel ID <span className="text-danger">*</span></label>
                  <input
                    type="number"
                    className="form-control"
                    name="parcelID"
                    value={parcel.parcelID}
                    onChange={handleChange}
                    disabled={isEditMode} 
                    required
                    placeholder="Enter unique parcel ID"
                  />
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                     <label className="form-label fw-semibold text-secondary small text-uppercase">Property Type</label>
                     <select
                        className="form-select"
                        name="propertyType"
                        value={parcel.propertyType}
                        onChange={handleChange}
                      >
                        <option value="">-- Select --</option>
                        <option value="Residential">Residential</option>
                        <option value="Commercial">Commercial</option>
                        <option value="Industrial">Industrial</option>
                        <option value="Agricultural">Agricultural</option>
                        <option value="Institutional">Institutional</option>
                        <option value="Mixed Use">Mixed Use</option>
                        <option value="Other">Other</option>
                      </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-secondary small text-uppercase">Actual Land Use</label>
                    <input
                      type="text"
                      className="form-control"
                      name="actualLandUse"
                      value={parcel.actualLandUse}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="mb-3">
                   <div className="form-check form-switch p-3 bg-light rounded-3 border border-dashed">
                    <input
                      className="form-check-input ms-0 me-3"
                      type="checkbox"
                      name="improvement"
                      checked={parcel.improvement}
                      onChange={handleChange}
                      style={{ transform: 'scale(1.2)' }}
                    />
                    <label className="form-check-label fw-bold">Has Improvement?</label>
                    <div className="text-muted small mt-1">Toggle if there are buildings or structures on the land.</div>
                  </div>
                </div>

                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-secondary small text-uppercase">Area Size</label>
                    <div className="input-group">
                      <input
                        type="number"
                        step="0.01"
                        className="form-control"
                        name="areaSize"
                        value={parcel.areaSize}
                        onChange={handleChange}
                      />
                      <span className="input-group-text bg-light text-secondary">sqm</span>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-secondary small text-uppercase">Total Value</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light text-secondary">₱</span>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control"
                        name="totalValue"
                        value={parcel.totalValue}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Location */}
          <div className="col-lg-6">
            <div className="card border-0 shadow-sm rounded-4 mb-4 h-100">
              <div className="card-header bg-white border-0 pt-4 px-4 pb-0">
                <h5 className="fw-bold text-primary mb-0">
                  <i className="bi bi-geo-alt me-2"></i>
                  Location Details
                </h5>
              </div>
              <div className="card-body p-4">
                <div className="mb-3">
                  <label className="form-label fw-semibold text-secondary small text-uppercase">Street Address</label>
                  <input
                    type="text"
                    className="form-control"
                    name="StreetAddress"
                    value={parcel.StreetAddress}
                    onChange={handleChange}
                    placeholder="House No., Street Name"
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold text-secondary small text-uppercase">Barangay</label>
                  <input
                    type="text"
                    className="form-control"
                    name="Barangay"
                    value={parcel.Barangay}
                    onChange={handleChange}
                    placeholder="Barangay Name"
                  />
                </div>

                <div className="row g-3">
                  <div className="col-md-8">
                    <label className="form-label fw-semibold text-secondary small text-uppercase">Municipality</label>
                    <input
                      type="text"
                      className="form-control"
                      name="Municipality"
                      value={parcel.Municipality}
                      onChange={handleChange}
                      placeholder="City/Municipality"
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold text-secondary small text-uppercase">Zip Code</label>
                    <input
                      type="number"
                      className="form-control"
                      name="ZipCode"
                      value={parcel.ZipCode}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Assessment Details */}
            <div className="card border-0 shadow-sm rounded-4 mt-4 h-100">
              <div className="card-header bg-white border-0 pt-4 px-4 pb-0">
                <h5 className="fw-bold text-primary mb-0">
                  <i className="bi bi-cash-coin me-2"></i>
                  Assessment & Tax
                </h5>
              </div>
              <div className="card-body p-4">
                <div className="row g-3 mb-3">
                    <div className="col-md-6">
                        <label className="form-label fw-semibold text-secondary small text-uppercase">Classification</label>
                        <input
                            type="text"
                            className="form-control"
                            name="classification"
                            value={parcel.classification}
                            onChange={handleChange}
                            placeholder="e.g. Residential"
                        />
                    </div>
                    <div className="col-md-6">
                        <label className="form-label fw-semibold text-secondary small text-uppercase">Last Payment</label>
                        <input
                            type="date"
                            className="form-control"
                            name="last_payment_date"
                            value={parcel.last_payment_date}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                <div className="row g-3 mb-3">
                    <div className="col-md-6">
                        <label className="form-label fw-semibold text-secondary small text-uppercase">Market Value</label>
                        <div className="input-group">
                            <span className="input-group-text bg-light text-secondary">₱</span>
                            <input
                                type="number"
                                step="0.01"
                                className="form-control"
                                name="market_value"
                                value={parcel.market_value}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                    <div className="col-md-6">
                        <label className="form-label fw-semibold text-secondary small text-uppercase">Assessed Value</label>
                        <div className="input-group">
                            <span className="input-group-text bg-light text-secondary">₱</span>
                            <input
                                type="number"
                                step="0.01"
                                className="form-control"
                                name="assessed_value"
                                value={parcel.assessed_value}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                </div>

                <div className="mb-3">
                   <div className={`form-check form-switch p-3 rounded-3 border border-dashed ${parcel.delinquent ? 'bg-danger-subtle border-danger' : 'bg-light'}`}>
                    <input
                      className="form-check-input ms-0 me-3"
                      type="checkbox"
                      name="delinquent"
                      checked={parcel.delinquent}
                      onChange={handleChange}
                      style={{ transform: 'scale(1.2)' }}
                    />
                    <label className={`form-check-label fw-bold ${parcel.delinquent ? 'text-danger' : ''}`}>
                        Is Delinquent?
                    </label>
                    {parcel.delinquent && (
                        <div className="mt-3">
                            <label className="form-label small text-uppercase text-danger fw-bold">Delinquent Amount</label>
                            <div className="input-group">
                                <span className="input-group-text bg-danger text-white">₱</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="form-control border-danger"
                                    name="delinquent_amount"
                                    value={parcel.delinquent_amount}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    )}
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
                {isEditMode ? "Update Parcel" : "Save Parcel"}
              </>
            )}
          </button>
        </div>
      </form>
      
      {/* Spacer for fixed footer */}
      <div style={{ height: '80px' }}></div>
    </div>
  );
}

export default LandParcel;
