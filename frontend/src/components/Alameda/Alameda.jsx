import React, { useState, useEffect } from "react";
import api from '../../lib/axios.js';
import {  useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

const Alameda = () => {
  const navigate = useNavigate();
  const [parcel, setParcel] = useState({
    ID: "",
    ParcelId: "",
    LotNumber: "",
    BlockNumber: "",
    SurveyPlan: "",
    Claimant: "",
    BarangayNa: "",
    Area: "",
    IsValidate: "",
    Application: "",
    PlaCount: "",
    ApplicantN: "",
    IsApproved: "",
    IsReconstr: "",
    Verified: "",
    IsDocument: "",
    ProjectId: "",
    ParcelSour: "",
    BarangayCo: "",
    TiePointId: "",
    TiePointNa: "",
    Municipality: "",
    Municipal1: "",
    LotStatus: "",
    TypeI: "",
    BranchesI: "",
    Coordinate: "",
    XI: "",
    YI: "",
    LongitudeI: "",
    LatitudeI: "",
    LengthI: "",
    AreaI: "",
    BearingI: "",
    SelectionM: "",
    SelectionI: "",
    VersionI: "",
    geometry: ""
  });

  useEffect(() => {
    const fetchAlameda = async () => {
      try {             
        const ParcelId = localStorage.getItem("ParcelId");
        localStorage.setItem("isParcel", true);
        if(ParcelId !== null) {
            const res = await api.get("/alameda/" + ParcelId);
            setParcel(res.data);
        }
             } catch (error) {
        console.log(error)
        console.log("error fetching data")
      } 
    }
    fetchAlameda();
  },[])

  const handleChange = (e) => {
    const { name, value } = e.target;
    setParcel({ ...parcel, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (parcel.ParcelId) {
        await api.put(`alameda/${parcel.ParcelId}`, parcel);
        alert("Parcel updated successfully!");
        localStorage.removeItem("ParcelId");
        navigate("/parcel");
      } else {
        const res = await api.post("iban", parcel);
        alert("Parcel saved successfully!");
        setParcel({ ...parcel, id: res.data.id });
      }
    } catch (err) {
      console.error(err);
      alert("Error saving parcel");
    }
  };

  const handleGeometryChange = (e) => {
    try {
      const parsed = JSON.parse(e.target.value);
      setParcel({ ...parcel, geometry: parsed });
    } catch {
      setParcel({ ...parcel, geometry: e.target.value });
    }
  };

  return (
    <div className="container mt-3">
      <h2 className="mb-4">{parcel.ID ? "Edit Alameda Parcel" : "Add Alameda Parcel"}</h2>
      <form onSubmit={handleSubmit}>
        <div className="row g-3">

          {/* ParcelId */}
          <div className="col-md-3">
            <label className="form-label">ParcelId</label>
            <input type="number" className="form-control" name="ParcelId" value={parcel.ParcelId} onChange={handleChange} disabled={localStorage.getItem("ParcelId")} />
          </div>

          {/* LotNumber */}
          <div className="col-md-3">
            <label className="form-label">LotNumber</label>
            <input type="text" className="form-control" name="LotNumber" value={parcel.LotNumber} onChange={handleChange} />
          </div>

          {/* BlockNumber */}
          <div className="col-md-3">
            <label className="form-label">BlockNumber</label>
            <input type="text" className="form-control" name="BlockNumber" value={parcel.BlockNumber} onChange={handleChange} />
          </div>

          {/* SurveyPlan */}
          <div className="col-md-3">
            <label className="form-label">SurveyPlan</label>
            <input type="text" className="form-control" name="SurveyPlan" value={parcel.SurveyPlan} onChange={handleChange} />
          </div>

          {/* Claimant */}
          <div className="col-md-3">
            <label className="form-label">Claimant</label>
            <input type="text" className="form-control" name="Claimant" value={parcel.Claimant} onChange={handleChange} />
          </div>

          {/* BarangayNa */}
          <div className="col-md-3">
            <label className="form-label">BarangayNa</label>
            <input type="text" className="form-control" name="BarangayNa" value={parcel.BarangayNa} onChange={handleChange} />
          </div>

          {/* Area */}
          <div className="col-md-3">
            <label className="form-label">Area</label>
            <input type="number" step="0.01" className="form-control" name="Area" value={parcel.Area} onChange={handleChange} />
          </div>

          {/* IsValidate */}
          <div className="col-md-3">
            <label className="form-label">IsValidate</label>
            <input type="number" className="form-control" name="IsValidate" value={parcel.IsValidate} onChange={handleChange} />
          </div>

          {/* Application */}
          <div className="col-md-3">
            <label className="form-label">Application</label>
            <input type="text" className="form-control" name="Application" value={parcel.Application} onChange={handleChange} />
          </div>

          {/* PlaCount */}
          <div className="col-md-3">
            <label className="form-label">PlaCount</label>
            <input type="number" className="form-control" name="PlaCount" value={parcel.PlaCount} onChange={handleChange} />
          </div>

          {/* ApplicantN */}
          <div className="col-md-3">
            <label className="form-label">ApplicantN</label>
            <input type="text" className="form-control" name="ApplicantN" value={parcel.ApplicantN} onChange={handleChange} />
          </div>

          {/* IsApproved */}
          <div className="col-md-3">
            <label className="form-label">IsApproved</label>
            <input type="number" className="form-control" name="IsApproved" value={parcel.IsApproved} onChange={handleChange} />
          </div>

          {/* IsReconstr */}
          <div className="col-md-3">
            <label className="form-label">IsReconstr</label>
            <input type="number" className="form-control" name="IsReconstr" value={parcel.IsReconstr} onChange={handleChange} />
          </div>

          {/* Verified */}
          <div className="col-md-3">
            <label className="form-label">Verified</label>
            <input type="number" className="form-control" name="Verified" value={parcel.Verified} onChange={handleChange} />
          </div>

          {/* IsDocument */}
          <div className="col-md-3">
            <label className="form-label">IsDocument</label>
            <input type="number" className="form-control" name="IsDocument" value={parcel.IsDocument} onChange={handleChange} />
          </div>

          {/* ProjectId */}
          <div className="col-md-3">
            <label className="form-label">ProjectId</label>
            <input type="number" className="form-control" name="ProjectId" value={parcel.ProjectId} onChange={handleChange} />
          </div>

          {/* ParcelSour */}
          <div className="col-md-3">
            <label className="form-label">ParcelSour</label>
            <input type="number" className="form-control" name="ParcelSour" value={parcel.ParcelSour} onChange={handleChange} />
          </div>

          {/* BarangayCo */}
          <div className="col-md-3">
            <label className="form-label">BarangayCo</label>
            <input type="text" className="form-control" name="BarangayCo" value={parcel.BarangayCo} onChange={handleChange} />
          </div>

          {/* TiePointId */}
          <div className="col-md-3">
            <label className="form-label">TiePointId</label>
            <input type="number" className="form-control" name="TiePointId" value={parcel.TiePointId} onChange={handleChange} />
          </div>

          {/* TiePointNa */}
          <div className="col-md-3">
            <label className="form-label">TiePointNa</label>
            <input type="text" className="form-control" name="TiePointNa" value={parcel.TiePointNa} onChange={handleChange} />
          </div>

          {/* Municipality */}
          <div className="col-md-3">
            <label className="form-label">Municipality</label>
            <input type="text" className="form-control" name="Municipality" value={parcel.Municipality} onChange={handleChange} />
          </div>

          {/* Municipal1 */}
          <div className="col-md-3">
            <label className="form-label">Municipal1</label>
            <input type="text" className="form-control" name="Municipal1" value={parcel.Municipal1} onChange={handleChange} />
          </div>

          {/* LotStatus */}
          <div className="col-md-3">
            <label className="form-label">LotStatus</label>
            <input type="text" className="form-control" name="LotStatus" value={parcel.LotStatus} onChange={handleChange} />
          </div>

          {/* TypeI */}
          <div className="col-md-3">
            <label className="form-label">TypeI</label>
            <input type="number" className="form-control" name="TypeI" value={parcel.TypeI} onChange={handleChange} />
          </div>

          {/* BranchesI */}
          <div className="col-md-3">
            <label className="form-label">BranchesI</label>
            <input type="number" className="form-control" name="BranchesI" value={parcel.BranchesI} onChange={handleChange} />
          </div>

          {/* Coordinate */}
          <div className="col-md-3">
            <label className="form-label">Coordinate</label>
            <input type="number" className="form-control" name="Coordinate" value={parcel.Coordinate} onChange={handleChange} />
          </div>

          {/* XI */}
          <div className="col-md-3">
            <label className="form-label">XI</label>
            <input type="number" step="0.000001" className="form-control" name="XI" value={parcel.XI} onChange={handleChange} />
          </div>

          {/* YI */}
          <div className="col-md-3">
            <label className="form-label">YI</label>
            <input type="number" step="0.000001" className="form-control" name="YI" value={parcel.YI} onChange={handleChange} />
          </div>

          {/* LongitudeI */}
          <div className="col-md-3">
            <label className="form-label">LongitudeI</label>
            <input type="number" step="0.000001" className="form-control" name="LongitudeI" value={parcel.LongitudeI} onChange={handleChange} />
          </div>

          {/* LatitudeI */}
          <div className="col-md-3">
            <label className="form-label">LatitudeI</label>
            <input type="number" step="0.000001" className="form-control" name="LatitudeI" value={parcel.LatitudeI} onChange={handleChange} />
          </div>

          {/* LengthI */}
          <div className="col-md-3">
            <label className="form-label">LengthI</label>
            <input type="number" step="0.01" className="form-control" name="LengthI" value={parcel.LengthI} onChange={handleChange} />
          </div>

          {/* AreaI */}
          <div className="col-md-3">
            <label className="form-label">AreaI</label>
            <input type="number" step="0.01" className="form-control" name="AreaI" value={parcel.AreaI} onChange={handleChange} />
          </div>

          {/* BearingI */}
          <div className="col-md-3">
            <label className="form-label">BearingI</label>
            <input type="number" step="0.01" className="form-control" name="BearingI" value={parcel.BearingI} onChange={handleChange} />
          </div>

          {/* SelectionM */}
          <div className="col-md-3">
            <label className="form-label">SelectionM</label>
            <input type="number" className="form-control" name="SelectionM" value={parcel.SelectionM} onChange={handleChange} />
          </div>

          {/* SelectionI */}
          <div className="col-md-3">
            <label className="form-label">SelectionI</label>
            <input type="number" className="form-control" name="SelectionI" value={parcel.SelectionI} onChange={handleChange} />
          </div>

          {/* VersionI */}
          <div className="col-md-3">
            <label className="form-label">VersionI</label>
            <input type="number" className="form-control" name="VersionI" value={parcel.VersionI} onChange={handleChange} />
          </div>

          {/* geometry */}
          <div className="col-md-12">
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
        </div><br />

        <div className="col-12">
          <button type="submit" className="btn btn-primary">
            {parcel.ID ? "Update" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Alameda;
