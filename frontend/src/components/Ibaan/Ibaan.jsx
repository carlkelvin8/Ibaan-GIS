import React, { useState, useEffect } from "react";
import {  useNavigate } from "react-router-dom";
import { normalizeDate } from '../../lib/utils.js';
import api from '../../lib/axios.js';
import "bootstrap/dist/css/bootstrap.min.css";

const Ibaan = ({ initialData }) => {
  const navigate = useNavigate();
  const [parcel, setParcel] = useState(initialData || {
    ParcelId: "",
    SurveyId: "",
    BlockNumber: "",
    LotNumber: "",
    Area: "",
    Claimant: "",
    TiePointId: "",
    TiePointNa: "",
    SurveyPlan: "",
    BarangayNa: "",
    Coordinate: "",
    XI: "",
    YI: "",
    LongitudeI: "",
    LatitudeI: "",
    LengthI: "",
    AreaI: "",
    VersionI: "",
    tax_ID: "",
    Tax_Amount: "",
    Due_Date: "",
    AmountPaid: "",
    Date_paid: "",
    geometry: { type: "MultiPolygon", coordinates: [] }
  });

  useEffect(() => {
    const fetchIbaan = async () => {
      try {             
        const ParcelId = localStorage.getItem("ParcelId");
        localStorage.setItem("isParcel", true);

        if(ParcelId !== null) {
            const res = await api.get("/ibaan/" + ParcelId);
            const parcelData = { ...res.data };
            parcelData.Due_Date = normalizeDate(parcelData.Due_Date);
            parcelData.Date_paid = normalizeDate(parcelData.Date_paid);
            setParcel(parcelData);
        }
             } catch (error) {
        console.log(error)
        console.log("error fetching data")
      } 
    }
    fetchIbaan();
  },[]);

    if (parcel === null ) {
      return <p>Loading data...</p>;
    }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setParcel({ ...parcel, [name]: value });
  };

  const handleGeometryChange = (e) => {
    try {
      const parsed = JSON.parse(e.target.value);
      setParcel({ ...parcel, geometry: parsed });
    } catch {
      setParcel({ ...parcel, geometry: e.target.value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (parcel.id) {
        await api.put(`ibaan/${parcel.ParcelId}`, parcel);
        alert("Parcel updated successfully!");
        localStorage.removeItem("ParcelId");
        navigate("/parcel");
      } else {
        const res = await api.post("ibaan", parcel);
        alert("Parcel saved successfully!");
        setParcel({ ...parcel, id: res.data.id });
      }
    } catch (err) {
      console.error(err);
      alert("Error saving parcel");
    }
  };

  return (
    <div className="container mt-4">
      <h2>{parcel.id ? "Edit Ibaan Parcel" : "Add Ibaan Parcel"}</h2>
      <form onSubmit={handleSubmit} className="row g-3">
        
        {/* First Row */}
        <div className="col-md-3">
          <label className="form-label">Parcel ID</label>
          <input type="number" name="ParcelId" className="form-control"
            value={parcel.ParcelId} onChange={handleChange} disabled={localStorage.getItem("ParcelId")}/>
        </div>
        <div className="col-md-3">
          <label className="form-label">Survey ID</label>
          <input type="number" name="SurveyId" className="form-control"
            value={parcel.SurveyId} onChange={handleChange} />
        </div>
        <div className="col-md-3">
          <label className="form-label">Block Number</label>
          <input type="text" name="BlockNumber" className="form-control"
            value={parcel.BlockNumber || ""} onChange={handleChange} />
        </div>
        <div className="col-md-3">
          <label className="form-label">Lot Number</label>
          <input type="text" name="LotNumber" className="form-control"
            value={parcel.LotNumber} onChange={handleChange} />
        </div>

        {/* Second Row */}
        <div className="col-md-3">
          <label className="form-label">Area</label>
          <input type="number" step="0.01" name="Area" className="form-control"
            value={parcel.Area} onChange={handleChange} />
        </div>
        <div className="col-md-9">
          <label className="form-label">Claimant</label>
          <input type="text" name="Claimant" className="form-control"
            value={parcel.Claimant} onChange={handleChange} />
        </div>

        {/* Third Row */}
        <div className="col-md-3">
          <label className="form-label">Tie Point ID</label>
          <input type="number" name="TiePointId" className="form-control"
            value={parcel.TiePointId} onChange={handleChange} />
        </div>
        <div className="col-md-9">
          <label className="form-label">Tie Point Name</label>
          <input type="text" name="TiePointNa" className="form-control"
            value={parcel.TiePointNa} onChange={handleChange} />
        </div>

        {/* Fourth Row */}
        <div className="col-md-3">
          <label className="form-label">Survey Plan</label>
          <input type="text" name="SurveyPlan" className="form-control"
            value={parcel.SurveyPlan} onChange={handleChange} />
        </div>
        <div className="col-md-3">
          <label className="form-label">Barangay</label>
          <input type="text" name="BarangayNa" className="form-control"
            value={parcel.BarangayNa} onChange={handleChange} />
        </div>
        <div className="col-md-3">
          <label className="form-label">Coordinate</label>
          <input type="number" name="Coordinate" className="form-control"
            value={parcel.Coordinate} onChange={handleChange} />
        </div>

        {/* Fifth Row - Coordinates */}
        <div className="col-md-3">
          <label className="form-label">XI</label>
          <input type="number" step="0.000001" name="XI" className="form-control"
            value={parcel.XI} onChange={handleChange} />
        </div>
        <div className="col-md-3">
          <label className="form-label">YI</label>
          <input type="number" step="0.000001" name="YI" className="form-control"
            value={parcel.YI} onChange={handleChange} />
        </div>
        <div className="col-md-3">
          <label className="form-label">Longitude</label>
          <input type="number" step="0.000001" name="LongitudeI" className="form-control"
            value={parcel.LongitudeI} onChange={handleChange} />
        </div>
        <div className="col-md-3">
          <label className="form-label">Latitude</label>
          <input type="number" step="0.000001" name="LatitudeI" className="form-control"
            value={parcel.LatitudeI} onChange={handleChange} />
        </div>

        {/* Sixth Row */}
        <div className="col-md-3">
          <label className="form-label">Length</label>
          <input type="number" step="0.000001" name="LengthI" className="form-control"
            value={parcel.LengthI} onChange={handleChange} />
        </div>
        <div className="col-md-3">
          <label className="form-label">Area I</label>
          <input type="number" step="0.000001" name="AreaI" className="form-control"
            value={parcel.AreaI} onChange={handleChange} />
        </div>
        <div className="col-md-3">
          <label className="form-label">Version</label>
          <input type="number" name="VersionI" className="form-control"
            value={parcel.VersionI} onChange={handleChange} />
        </div>

        {/* Seventh Row - Tax */}
        <div className="col-md-3">
          <label className="form-label">Tax ID</label>
          <input type="text" name="tax_ID" className="form-control"
            value={parcel.tax_ID || ""} onChange={handleChange} />
        </div>
        <div className="col-md-3">
          <label className="form-label">Tax Amount</label>
          <input type="number" step="0.01" name="Tax_Amount" className="form-control"
            value={parcel.Tax_Amount || ""} onChange={handleChange} />
        </div>
        <div className="col-md-3">
          <label className="form-label">Due Date</label>
          <input type="date" name="Due_Date" className="form-control"
            value={parcel.Due_Date || ""} onChange={handleChange} />
        </div>
        <div className="col-md-3">
          <label className="form-label">Amount Paid</label>
          <input type="number" step="0.01" name="AmountPaid" className="form-control"
            value={parcel.AmountPaid || ""} onChange={handleChange} />
        </div>
        <div className="col-md-3">
          <label className="form-label">Date Paid</label>
          <input type="date" name="Date_paid" className="form-control"
            value={parcel.Date_paid || ""} onChange={handleChange} />
        </div>

        {/* Geometry */}
        <div className="col-12">
          <label className="form-label">Geometry (JSON)</label>
          <textarea
            className="form-control"
            rows="5"
            value={typeof parcel.geometry === "string"
              ? parcel.geometry
              : JSON.stringify(parcel.geometry, null, 2)}
            onChange={handleGeometryChange}
          />
        </div>

        <div className="col-12">
          <button type="submit" className="btn btn-primary">
            {parcel.id ? "Update" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default Ibaan;