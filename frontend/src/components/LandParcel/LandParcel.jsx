import React, { useState,useEffect } from "react";
import {  useNavigate } from "react-router-dom";
import api from '../../lib/axios.js';
import "bootstrap/dist/css/bootstrap.min.css";

const LandParcel = () => {
    const navigate = useNavigate();
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
    actualLandUse: ""
  });

  useEffect(() => {
    const fetchLandParcel = async () => {
      try {             
        const parcelID = localStorage.getItem("parcelID");
        if(parcelID !== null) {
            const res = await api.get("/landparcel/" + parcelID);
            setParcel(res.data);
        }
             } catch (error) {
        console.log(error)
        console.log("error fetching data")
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    let parcelID = localStorage.getItem("parcelID");
    if (parcelID) {
        await api.put(`/landparcel/${parcelID}`, parcel);
        alert("Parcel updated successfully!");
        localStorage.removeItem("parcelID");
    } else {
        await api.post("/landparcel", parcel);
        alert("Parcel saved successfully!");
    }
    navigate("/landparcellist");
  };

  return (
    <div className="container mt-4">
      <h3>Land Parcel Form</h3>
      <form onSubmit={handleSubmit} className="row g-3">
        
        {/* Parcel ID */}
        <div className="col-md-6">
          <label className="form-label">Parcel ID</label>
          <input
            type="number"
            className="form-control"
            name="parcelID"
            value={parcel.parcelID}
            onChange={handleChange}
            disabled
          />
        </div>

        {/* Improvement */}
        <div className="col-md-6 d-flex align-items-center">
          <div className="form-check mt-4">
            <input
              className="form-check-input"
              type="checkbox"
              name="improvement"
              checked={parcel.improvement}
              onChange={handleChange}
            />
            <label className="form-check-label">Improvement</label>
          </div>
        </div>

        {/* Total Value */}
        <div className="col-md-6">
          <label className="form-label">Total Value</label>
          <input
            type="number"
            step="0.01"
            className="form-control"
            name="totalValue"
            value={parcel.totalValue}
            onChange={handleChange}
          />
        </div>

        {/* Street Address */}
        <div className="col-md-6">
          <label className="form-label">Street Address</label>
          <input
            type="text"
            className="form-control"
            name="StreetAddress"
            value={parcel.StreetAddress}
            onChange={handleChange}
          />
        </div>

        {/* Barangay */}
        <div className="col-md-6">
          <label className="form-label">Barangay</label>
          <input
            type="text"
            className="form-control"
            name="Barangay"
            value={parcel.Barangay}
            onChange={handleChange}
          />
        </div>

        {/* Municipality */}
        <div className="col-md-6">
          <label className="form-label">Municipality</label>
          <input
            type="text"
            className="form-control"
            name="Municipality"
            value={parcel.Municipality}
            onChange={handleChange}
          />
        </div>

        {/* Zip Code */}
        <div className="col-md-6">
          <label className="form-label">Zip Code</label>
          <input
            type="number"
            className="form-control"
            name="ZipCode"
            value={parcel.ZipCode}
            onChange={handleChange}
          />
        </div>

        {/* Area Size */}
        <div className="col-md-6">
          <label className="form-label">Area Size</label>
          <input
            type="number"
            step="0.01"
            className="form-control"
            name="areaSize"
            value={parcel.areaSize}
            onChange={handleChange}
          />
        </div>

        {/* Property Type */}
        <div className="col-md-6">
          <label className="form-label">Property Type</label>
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

        {/* Actual Land Use */}
        <div className="col-md-6">
          <label className="form-label">Actual Land Use</label>
          <input
            type="text"
            className="form-control"
            name="actualLandUse"
            value={parcel.actualLandUse}
            onChange={handleChange}
          />
        </div>

        {/* Submit */}
        <div className="col-12">
          <button type="submit" className="btn btn-primary">
            Save Parcel
          </button>
        </div>
      </form>
    </div>
  );
}

export default LandParcel;