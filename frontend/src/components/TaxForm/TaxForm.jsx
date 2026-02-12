import React, { useState, useEffect } from "react";
import api from '../../lib/axios.js';
import { normalizeDate } from '../../lib/utils.js';
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import MapPreviewModal from "../Map/MapPreviewModal";
import ParcelSearchModal from "../Parcel/ParcelSearchModal";

// Helper utils
const isEmpty = (v) => (v ?? "").toString().trim().length === 0;
const isPosNum = (v) => !isNaN(Number(v)) && Number(v) > 0;
const isNonNegNum = (v) => !isNaN(Number(v)) && Number(v) >= 0;

export default function TaxForm() {
  const navigate = useNavigate();

  const defaultFormData = {
    arpNo: "",
    tdPrinted: false,
    municipalCode: false,
    accountNo: "",
    ownerName: "",
    ownerAddress: "",
    administrator: "",
    adminAddress: "",
    north: "",
    east: "",
    south: "",
    west: "",
    propertyIndexNo: "",
    subdivision: "",
    phase: "",
    lotNo: "",
    tdPrintedNo: "",
    houseNo: "",
    street: "",
    landmark: "",
    barangay: "",
    barangayOnPrint: false,
    barangayText: "",
    octNo: "",
    dated: "",
    surveyNo: "",
    cadLotNo: "",
    lotNo2: "",
    blockNo: "",
    // optional foreign keys from map (kept optional)
    parcelId: "",
  };

  const [formData, setFormData] = useState(defaultFormData);

  const [landAppraisal, setLandAppraisal] = useState([
    {
      id: "",
      class: "",
      subClass: "",
      actualUse: "",
      unitValue: "",
      area: "",
      baseMarketValue: "",
      stripping: "",
      adjustment: "",
      marketValue: "",
    },
  ]);

  const [landAssessment, setLandAssessment] = useState({
    id: "",
    propertyKind: "",
    propertyActualUse: "",
    adjustedMarketValue: "",
    level: "",
    assessedValue: "",
    taxability: "",
    year: "",
    quarter: "",
    updateCode: "",
    dateRegistered: ""
  });

  const [otherDetails, setOtherDetails] = useState({
    id: "",
    taxability: "",
    effectivityYear: "",
    quarter: "",
    updateCode: "",
    dateRegistered: "",
    paymentStatus: "Unpaid"
  });

  const [errors, setErrors] = useState({
    formData: {},
    landAppraisal: [],
    landAssessment: {},
    otherDetails: {},
  });
  const [saving, setSaving] = useState(false);
  const [submitTouched, setSubmitTouched] = useState(false);
  const [barangayList, setBarangayList] = useState([]);
  const [existingOwners, setExistingOwners] = useState([]);
  const [existingOwnerAddresses, setExistingOwnerAddresses] = useState([]);
  const [existingAdmins, setExistingAdmins] = useState([]);
  const [existingAdminAddresses, setExistingAdminAddresses] = useState([]);
  const [existingSubdivisions, setExistingSubdivisions] = useState([]);
  
  // Map Modal State
  const [showMap, setShowMap] = useState(false);
  const [mapData, setMapData] = useState(null);
  const [loadingMap, setLoadingMap] = useState(false);
  
  // Parcel Search Modal State
  const [showSearchModal, setShowSearchModal] = useState(false);

  const handleParcelSelect = (parcel) => {
    // Determine source fields based on parcel object keys
    const pid = parcel.ParcelId || parcel.parcelID || "";
    const owner = parcel.Claimant || parcel.ownerName || "";
    const brgy = parcel.BarangayNa || parcel.Barangay || "";
    const lot = parcel.LotNumber || "";
    const blk = parcel.BlockNumber || "";
    const survey = parcel.SurveyPlan || "";
    const area = parcel.Area || parcel.areaSize || "";

    setFormData((prev) => ({
      ...prev,
      parcelId: pid,
      ownerName: owner || prev.ownerName,
      barangay: brgy || prev.barangay,
      lotNo: lot || prev.lotNo,
      blockNo: blk || prev.blockNo,
      surveyNo: survey || prev.surveyNo,
      street: parcel.StreetAddress || prev.street,
    }));

    // Update land appraisal area if valid
    if (area && !isNaN(Number(area)) && Number(area) > 0) {
      setLandAppraisal((prev) => {
        const newArr = [...prev];
        if (newArr.length > 0) {
          newArr[0] = { ...newArr[0], area: area };
        }
        return newArr;
      });
    }

    setShowSearchModal(false);
    Swal.fire("Linked", `Parcel ${pid} linked successfully.`, "success");
  };

  const handleViewMap = async () => {
    if (!formData.parcelId) {
      Swal.fire("Info", "No Parcel ID linked to this Tax Declaration.", "info");
      return;
    }
    setLoadingMap(true);
    try {
      const res = await api.get(`/ibaan/${formData.parcelId}`);
      if (res.data) {
        setMapData(res.data);
        setShowMap(true);
      } else {
        Swal.fire("Error", "Parcel data not found.", "error");
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to load map data.", "error");
    } finally {
      setLoadingMap(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Barangays
        const brgyRes = await api.get("/map/barangays");
        if (brgyRes.data && brgyRes.data.features) {
          const bList = brgyRes.data.features.map(f => f.properties.name).sort();
          setBarangayList(bList);
        }

        // Fetch Existing Data for Autocomplete
        const taxRes = await api.get("/tax");
        if (Array.isArray(taxRes.data)) {
          const data = taxRes.data;
          const getUnique = (field) => [...new Set(data.map(t => t[field]).filter(Boolean))].sort();

          setExistingOwners(getUnique('ownerName'));
          setExistingOwnerAddresses(getUnique('ownerAddress'));
          setExistingAdmins(getUnique('administrator'));
          setExistingAdminAddresses(getUnique('adminAddress'));
          setExistingSubdivisions(getUnique('subdivision'));
        }
      } catch (err) {
        console.error("Error fetching reference data:", err);
      }
    };
    fetchData();

    const fetchTax = async () => {
      try {
        const taxId = localStorage.getItem("taxId");

        if (taxId) {
          // ---- EDIT MODE ----
          const res = await api.get("/tax/" + taxId);
          const taxData = { ...res.data };
          taxData.dated = normalizeDate(taxData.dated);
          
          setFormData({ ...defaultFormData, ...taxData }); // Apply data first

          // Check for linked Parcel
          try {
            const linkRes = await api.get(`/ibaan/tax/${taxId}`);
            if (linkRes.data) {
               if (linkRes.data.parcelId) {
                 // Update formData only if parcelId was missing or update it
                 setFormData(prev => ({ ...prev, parcelId: linkRes.data.parcelId }));
               }
            }
          } catch (err) {
             console.error("Error fetching linked parcel:", err);
          }

          const resLand = await api.get("/landappraisal/" + taxId);
          setLandAppraisal(Array.isArray(resLand.data) && resLand.data.length ? resLand.data : landAppraisal);

          const resLandAssess = await api.get("/landassessment/" + taxId);
          setLandAssessment(resLandAssess.data || landAssessment);

          const resOtherDetails = await api.get("/taxotherdetails/" + taxId);
          const otherDetailsData = { ...resOtherDetails.data };
          otherDetailsData.dateRegistered = normalizeDate(otherDetailsData.dateRegistered);
          setOtherDetails(otherDetailsData || otherDetails);
        } else {
          // ---- CREATE MODE with optional PREFILL ----
          const prefillStr = localStorage.getItem("prefillTaxData");
          if (prefillStr) {
            try {
              const prefill = JSON.parse(prefillStr);
              setFormData((prev) => ({
                ...prev,
                propertyIndexNo: prefill.propertyIndexNo ?? prev.propertyIndexNo,
                subdivision: prefill.subdivision ?? prev.subdivision,
                phase: prefill.phase ?? prev.phase,
                lotNo: prefill.lotNo ?? prev.lotNo,
                cadLotNo: prefill.cadLotNo ?? prev.cadLotNo,
                barangay: prefill.barangay ?? prev.barangay,
                parcelId: prefill.parcelId ?? prev.parcelId,
                ownerName: prefill.ownerName ?? prev.ownerName,
                blockNo: prefill.blockNo ?? prev.blockNo,
                surveyNo: prefill.surveyNo ?? prev.surveyNo,
              }));

              // If area is provided, prefill the first land appraisal row
              if (prefill.area && !isNaN(Number(prefill.area))) {
                setLandAppraisal((prev) => {
                  const newArr = [...prev];
                  if (newArr.length > 0) {
                    newArr[0] = { ...newArr[0], area: prefill.area };
                  }
                  return newArr;
                });
              }
            } catch {}
            localStorage.removeItem("prefillTaxData");
          }
        }
      } catch (error) {
        console.log(error);
        console.log("error fetching data");
      }
    };
    fetchTax();
  }, []);

  // ---------- validation ----------
  const validateAll = () => {
    const newErrs = { formData: {}, landAppraisal: [], landAssessment: {}, otherDetails: {} };

    // formData: make ALL visible text/date fields required; parcelId remains optional
    const reqForm = [
      'arpNo','accountNo','ownerName','ownerAddress',
      'propertyIndexNo','barangay'
    ];
    reqForm.forEach((k) => { if (isEmpty(formData[k])) newErrs.formData[k] = 'Required'; });

    // conditional: barangayText required if barangayOnPrint is true
    if (formData.barangayOnPrint && isEmpty(formData.barangayText)) {
      newErrs.formData.barangayText = 'Required when checked';
    }

    // Check parcel link (Optional but recommended)
    if (!formData.parcelId) {
      // Not an error, but maybe we should warn? 
      // User can save without link, so we won't block.
    }

    // landAppraisal: require all fields + number checks
    if (!landAppraisal.length) {
      newErrs.landAppraisal[0] = { _row: 'At least one appraisal row is required' };
    }
    landAppraisal.forEach((r, i) => {
      const re = {};
      if (isEmpty(r.class)) re.class = 'Required';
      if (isEmpty(r.subClass)) re.subClass = 'Required';
      if (isEmpty(r.actualUse)) re.actualUse = 'Required';
      if (!isPosNum(r.unitValue)) re.unitValue = 'Must be > 0';
      if (!isPosNum(r.area)) re.area = 'Must be > 0';
      if (!isNonNegNum(r.baseMarketValue)) re.baseMarketValue = 'Must be ≥ 0';
      if (!isNonNegNum(r.stripping)) re.stripping = 'Must be ≥ 0';
      if (!isNonNegNum(r.adjustment)) re.adjustment = 'Must be ≥ 0';
      if (!isNonNegNum(r.marketValue)) re.marketValue = 'Must be ≥ 0';
      newErrs.landAppraisal[i] = re;
    });

    // landAssessment summary
    const la = landAssessment;
    // Make assessment fields optional too, unless strictly required by logic
    // if (isEmpty(la.propertyKind)) newErrs.landAssessment.propertyKind = 'Required';
    // if (isEmpty(la.propertyActualUse)) newErrs.landAssessment.propertyActualUse = 'Required';
    
    // otherDetails
    if (isEmpty(otherDetails.taxability)) newErrs.otherDetails.taxability = 'Required';
    // Remove strict validation for effectivityYear, quarter, updateCode, dateRegistered
    // Keep them optional as per user feedback/behavior
    
    // return
    const hasAnyError =
      Object.keys(newErrs.formData).length > 0 ||
      Object.keys(newErrs.landAssessment).length > 0 ||
      Object.keys(newErrs.otherDetails).length > 0 ||
      newErrs.landAppraisal.some((x) => x && Object.keys(x).length > 0);

    return { valid: !hasAnyError, newErrs };
  };

  // ---------- change handlers ----------
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((s) => ({ ...s, [name]: type === "checkbox" ? checked : value }));
    // clear error of this field if any
    setErrors((prev) => ({ ...prev, formData: { ...prev.formData, [name]: undefined } }));
  };

  const handleChangeLand = (index, e) => {
    const { name, value } = e.target;
    const updated = [...landAppraisal];
    updated[index][name] = value;
    setLandAppraisal(updated);
    setErrors((prev) => {
      const le = [...(prev.landAppraisal || [])];
      le[index] = { ...(le[index] || {}), [name]: undefined };
      return { ...prev, landAppraisal: le };
    });
  };

  const handleChangeLandAssessment = (e) => {
    const { name, value } = e.target;
    setLandAssessment((s) => ({ ...s, [name]: value }));
    setErrors((prev) => ({ ...prev, landAssessment: { ...prev.landAssessment, [name]: undefined } }));
  };

  const handleChangeOtherDetails = (e) => {
    const { name, value } = e.target;
    setOtherDetails((s) => ({ ...s, [name]: value }));
    setErrors((prev) => ({ ...prev, otherDetails: { ...prev.otherDetails, [name]: undefined } }));
  };

  const addRow = () => {
    setLandAppraisal((rows) => [
      ...rows,
      {
        id: "",
        class: "",
        subClass: "",
        actualUse: "",
        unitValue: "",
        area: "",
        baseMarketValue: "",
        stripping: "",
        adjustment: "",
        marketValue: "",
      },
    ]);
  };

  const deleteRow = async (index, row) => {
    try {
      if (row.id && row.taxid) {
        await api.delete(`/landappraisal/${row.taxid}/${row.id}`);
        Swal.fire("Deleted!", "Row deleted successfully!", "success");
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Error deleting row", "error");
    } finally {
      setLandAppraisal((rows) => rows.filter((_, i) => i !== index));
      setErrors((prev) => ({ ...prev, landAppraisal: (prev.landAppraisal || []).filter((_, i) => i !== index) }));
    }
  };

  const cancel = () => navigate("/taxlist");

  const scrollToFirstError = () => {
    // attempt to scroll to first .is-invalid input
    const el = document.querySelector('.is-invalid');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitTouched(true);

    const { valid, newErrs } = validateAll();
    setErrors(newErrs);

    if (!valid) {
      scrollToFirstError();
      return;
    }

    // WARN if no parcelId linked
    if (!formData.parcelId) {
      const { isConfirmed } = await Swal.fire({
        title: "No Parcel Linked",
        text: "This Tax Form is not linked to any Land Parcel. It will NOT appear in the Map or Taxpayer Dashboard. Are you sure you want to save?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Save Anyway",
        cancelButtonText: "Go Back & Link",
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
      });
      if (!isConfirmed) {
        setSaving(false);
        return;
      }
    }

    setSaving(true);
    try {
      let taxId = localStorage.getItem("taxId");
      if (taxId) {
        // --- UPDATE EXISTING TAX FORM ---
        await api.put(`/tax/${taxId}`, formData);
        await api.post(`/landappraisal/${taxId}`, landAppraisal);
        await api.post(`/landassessment/${taxId}`, landAssessment);
        await api.post(`/taxotherdetails/${taxId}`, otherDetails);
        
        // Link Parcel if parcelId exists
        if (formData.parcelId) {
          try {
             console.log(`Attempting to link Parcel ${formData.parcelId} to TaxID ${taxId}`);
             await api.put(`/ibaan/${formData.parcelId}`, { tax_ID: taxId });
             console.log("Link successful");
          } catch (linkErr) {
             console.error("Failed to link parcel:", linkErr);
             Swal.fire("Warning", "Tax form saved, but failed to link to Parcel. Please try linking manually.", "warning");
          }
        }

        Swal.fire("Success", "Tax updated successfully!", "success");
        localStorage.removeItem("parcelID"); // clean up legacy key if any
      } else {
        // --- CREATE NEW TAX FORM ---
        const result = await api.post("/tax", formData);
        taxId = result?.data?.insertId;

        if (!taxId) {
          throw new Error("Failed to retrieve new Tax ID");
        }

        await api.post(`/landappraisal/${taxId}`, landAppraisal);
        await api.post(`/landassessment/${taxId}`, landAssessment);
        await api.post(`/taxotherdetails/${taxId}`, otherDetails);

        // Link Parcel if parcelId exists
        if (formData.parcelId) {
          try {
             console.log(`Attempting to link Parcel ${formData.parcelId} to TaxID ${taxId}`);
             await api.put(`/ibaan/${formData.parcelId}`, { tax_ID: taxId });
             console.log("Link successful");
          } catch (linkErr) {
             console.error("Failed to link parcel:", linkErr);
             Swal.fire("Warning", "Tax form saved, but failed to link to Parcel. Please try linking manually.", "warning");
          }
        } else {
          console.warn("No Parcel ID provided - skipping link.");
        }

        Swal.fire("Success", "Tax saved successfully! Parcel Link updated.", "success");
      }
      navigate("/taxlist");
    } catch (error) {
      console.error("Tax form submission error:", error);
      const msg = error.response?.data?.error || error.message || "Unknown error";
      Swal.fire("Error", `Error saving data: ${msg}`, "error");
    } finally {
      setSaving(false);
    }
  };

  // Helpers to read per-field error
  const fe = (k) => errors.formData?.[k];
  const lae = (i, k) => (errors.landAppraisal?.[i] ? errors.landAppraisal[i][k] : undefined);
  const lse = (k) => errors.landAssessment?.[k];
  const ode = (k) => errors.otherDetails?.[k];

  return (
    <div className="container mt-4">
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1" style={{ fontWeight: 700, color: "#1f2937" }}>
            <i className="bi bi-receipt me-2"></i>
            {localStorage.getItem("taxId") ? "Edit Tax Declaration" : "New Tax Declaration"}
          </h2>
          <p className="text-muted mb-0" style={{ fontSize: "14px" }}>
            Fill in the details for real property tax assessment.
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

      {submitTouched && (
        <div className="alert alert-warning border-0 shadow-sm d-flex align-items-center rounded-3 mb-4" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-3 fs-4 text-warning"></i>
          <div>
            <strong>Attention needed:</strong> Please review the highlighted fields below.
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* ROW 1: Declared Owner & Location (Proportionate) */}
        <div className="row g-4 mb-4">
          {/* Declared Owner */}
          <div className="col-lg-6">
            <div className="card border-0 shadow-sm rounded-4 h-100">
              <div className="card-header bg-white border-0 pt-4 px-4 pb-0">
                <h5 className="fw-bold text-primary mb-0">
                  <i className="bi bi-person-badge me-2"></i>
                  Declared Owner
                </h5>
              </div>
              <div className="card-body p-4">
                <div className="row g-3 mb-3">
                  <div className="col-md-12">
                    <label className="form-label fw-semibold text-secondary small text-uppercase">ARP/TD No. <span className="text-danger">*</span></label>
                    <input type="text" className={`form-control form-control-lg ${fe('arpNo') ? 'is-invalid' : ''}`} name="arpNo" value={formData.arpNo} onChange={handleChange} placeholder="e.g. 00-000-00000"/>
                    {fe('arpNo') && <div className="invalid-feedback">{fe('arpNo')}</div>}
                  </div>
                  <div className="col-md-6">
                    <div className="form-check form-switch mt-2">
                      <input className="form-check-input" type="checkbox" id="tdPrinted" name="tdPrinted" checked={formData.tdPrinted} onChange={handleChange}/>
                      <label className="form-check-label" htmlFor="tdPrinted">TD Printed</label>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="form-check form-switch mt-2">
                      <input className="form-check-input" type="checkbox" id="municipalCode" name="municipalCode" checked={formData.municipalCode} onChange={handleChange}/>
                      <label className="form-check-label" htmlFor="municipalCode">Municipal Code</label>
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold text-secondary small text-uppercase">Account No. <span className="text-danger">*</span></label>
                  <input type="text" className={`form-control ${fe('accountNo') ? 'is-invalid' : ''}`} name="accountNo" value={formData.accountNo} onChange={handleChange} placeholder="Enter account number"/>
                  {fe('accountNo') && <div className="invalid-feedback">{fe('accountNo')}</div>}
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold text-secondary small text-uppercase">Owner’s Name <span className="text-danger">*</span></label>
                  <input type="text" list="ownerList" className={`form-control ${fe('ownerName') ? 'is-invalid' : ''}`} name="ownerName" value={formData.ownerName} onChange={handleChange} placeholder="Lastname, Firstname MI."/>
                  <datalist id="ownerList">
                    {existingOwners.map((owner, i) => <option key={i} value={owner} />)}
                  </datalist>
                  {fe('ownerName') && <div className="invalid-feedback">{fe('ownerName')}</div>}
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold text-secondary small text-uppercase">Address <span className="text-danger">*</span></label>
                  <input type="text" list="ownerAddressList" className={`form-control ${fe('ownerAddress') ? 'is-invalid' : ''}`} name="ownerAddress" value={formData.ownerAddress} onChange={handleChange} placeholder="House No., Street, Barangay, City"/>
                  <datalist id="ownerAddressList">
                    {existingOwnerAddresses.map((addr, i) => <option key={i} value={addr} />)}
                  </datalist>
                  {fe('ownerAddress') && <div className="invalid-feedback">{fe('ownerAddress')}</div>}
                </div>

                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-secondary small text-uppercase">Administrator</label>
                    <input type="text" list="adminList" className={`form-control ${fe('administrator') ? 'is-invalid' : ''}`} name="administrator" value={formData.administrator} onChange={handleChange} placeholder="Optional"/>
                    <datalist id="adminList">
                      {existingAdmins.map((admin, i) => <option key={i} value={admin} />)}
                    </datalist>
                    {fe('administrator') && <div className="invalid-feedback">{fe('administrator')}</div>}
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-secondary small text-uppercase">Admin Address</label>
                    <input type="text" list="adminAddressList" className={`form-control ${fe('adminAddress') ? 'is-invalid' : ''}`} name="adminAddress" value={formData.adminAddress} onChange={handleChange} placeholder="Optional"/>
                    <datalist id="adminAddressList">
                      {existingAdminAddresses.map((addr, i) => <option key={i} value={addr} />)}
                    </datalist>
                    {fe('adminAddress') && <div className="invalid-feedback">{fe('adminAddress')}</div>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Location of Property */}
          <div className="col-lg-6">
            <div className="card border-0 shadow-sm rounded-4 h-100">
              <div className="card-header bg-white border-0 pt-4 px-4 pb-0 d-flex justify-content-between align-items-center">
                <h5 className="fw-bold text-primary mb-0">
                  <i className="bi bi-geo-alt me-2"></i>
                  Location & Parcel Link
                </h5>
              </div>
              
              <div className="card-body p-4">
                <div className="bg-light p-3 rounded-3 mb-4 border border-dashed">
                  <label className="form-label fw-bold text-dark mb-2">Linked Parcel ID</label>
                  <div className="input-group">
                    <span className="input-group-text bg-white border-end-0 text-primary">
                      <i className="bi bi-link-45deg"></i>
                    </span>
                    <input 
                      type="text" 
                      className="form-control border-start-0 bg-white fw-bold" 
                      value={formData.parcelId || ""} 
                      readOnly 
                      placeholder="No parcel linked"
                    />
                    <button 
                      type="button" 
                      className="btn btn-primary"
                      onClick={() => setShowSearchModal(true)}
                    >
                      Link Parcel
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-outline-secondary"
                      onClick={handleViewMap}
                      disabled={loadingMap || !formData.parcelId}
                      title="View on Map"
                    >
                      <i className="bi bi-map-fill"></i>
                    </button>
                  </div>
                  <small className="text-muted mt-2 d-block">
                    <i className="bi bi-info-circle me-1"></i>
                    Linking a parcel automatically fills location data.
                  </small>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold text-secondary small text-uppercase">Property Index No. <span className="text-danger">*</span></label>
                  <input type="text" className={`form-control ${fe('propertyIndexNo') ? 'is-invalid' : ''}`} name="propertyIndexNo" value={formData.propertyIndexNo} onChange={handleChange} placeholder="XXX-XXXXXXX-XXX"/>
                  {fe('propertyIndexNo') && <div className="invalid-feedback">{fe('propertyIndexNo')}</div>}
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-secondary small text-uppercase">Subdivision</label>
                    <input type="text" list="subdivisionList" className={`form-control ${fe('subdivision') ? 'is-invalid' : ''}`} name="subdivision" value={formData.subdivision} onChange={handleChange}/>
                    <datalist id="subdivisionList">
                      {existingSubdivisions.map((sub, i) => <option key={i} value={sub} />)}
                    </datalist>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-secondary small text-uppercase">Phase</label>
                    <input type="text" className={`form-control ${fe('phase') ? 'is-invalid' : ''}`} name="phase" value={formData.phase} onChange={handleChange}/>
                  </div>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-secondary small text-uppercase">Lot No.</label>
                    <input type="text" className={`form-control ${fe('lotNo') ? 'is-invalid' : ''}`} name="lotNo" value={formData.lotNo} onChange={handleChange}/>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-secondary small text-uppercase">TD Printed No.</label>
                    <input type="text" className={`form-control ${fe('tdPrintedNo') ? 'is-invalid' : ''}`} name="tdPrintedNo" value={formData.tdPrintedNo} onChange={handleChange}/>
                  </div>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-4">
                    <label className="form-label fw-semibold text-secondary small text-uppercase">House No.</label>
                    <input type="text" className={`form-control ${fe('houseNo') ? 'is-invalid' : ''}`} name="houseNo" value={formData.houseNo} onChange={handleChange}/>
                  </div>
                  <div className="col-md-8">
                    <label className="form-label fw-semibold text-secondary small text-uppercase">Street</label>
                    <input type="text" className={`form-control ${fe('street') ? 'is-invalid' : ''}`} name="street" value={formData.street} onChange={handleChange}/>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold text-secondary small text-uppercase">Barangay <span className="text-danger">*</span></label>
                  {barangayList.length > 0 ? (
                    <select className={`form-select ${fe('barangay') ? 'is-invalid' : ''}`} name="barangay" value={formData.barangay} onChange={handleChange}>
                      <option value="">Select Barangay...</option>
                      {barangayList.map((b, i) => (
                        <option key={i} value={b}>{b}</option>
                      ))}
                    </select>
                  ) : (
                    <input type="text" className={`form-control ${fe('barangay') ? 'is-invalid' : ''}`} name="barangay" value={formData.barangay} onChange={handleChange}/>
                  )}
                  {fe('barangay') && <div className="invalid-feedback">{fe('barangay')}</div>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 2: Description & Boundaries (Proportionate) */}
        <div className="row g-4 mb-4">
          {/* Description */}
          <div className="col-lg-6">
            <div className="card border-0 shadow-sm rounded-4 h-100">
              <div className="card-header bg-white border-0 pt-4 px-4 pb-0">
                <h5 className="fw-bold text-primary mb-0">
                  <i className="bi bi-card-text me-2"></i>
                  Property Description
                </h5>
              </div>
              <div className="card-body p-4">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-secondary small text-uppercase">OCT/TCT No.</label>
                    <input type="text" className={`form-control ${fe('octNo') ? 'is-invalid' : ''}`} name="octNo" value={formData.octNo} onChange={handleChange}/>
                    {fe('octNo') && <div className="invalid-feedback">{fe('octNo')}</div>}
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-secondary small text-uppercase">Dated</label>
                    <input type="date" className={`form-control ${fe('dated') ? 'is-invalid' : ''}`} name="dated" value={formData.dated || ""} onChange={handleChange}/>
                    {fe('dated') && <div className="invalid-feedback">{fe('dated')}</div>}
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-secondary small text-uppercase">Survey No.</label>
                    <input type="text" className={`form-control ${fe('surveyNo') ? 'is-invalid' : ''}`} name="surveyNo" value={formData.surveyNo} onChange={handleChange}/>
                    {fe('surveyNo') && <div className="invalid-feedback">{fe('surveyNo')}</div>}
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-secondary small text-uppercase">Cad Lot No.</label>
                    <input type="text" className={`form-control ${fe('cadLotNo') ? 'is-invalid' : ''}`} name="cadLotNo" value={formData.cadLotNo} onChange={handleChange}/>
                    {fe('cadLotNo') && <div className="invalid-feedback">{fe('cadLotNo')}</div>}
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-secondary small text-uppercase">Lot No.</label>
                    <input type="text" className={`form-control ${fe('lotNo2') ? 'is-invalid' : ''}`} name="lotNo2" value={formData.lotNo2} onChange={handleChange}/>
                    {fe('lotNo2') && <div className="invalid-feedback">{fe('lotNo2')}</div>}
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-secondary small text-uppercase">Block No.</label>
                    <input type="text" className={`form-control ${fe('blockNo') ? 'is-invalid' : ''}`} name="blockNo" value={formData.blockNo} onChange={handleChange}/>
                    {fe('blockNo') && <div className="invalid-feedback">{fe('blockNo')}</div>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Boundaries */}
          <div className="col-lg-6">
            <div className="card border-0 shadow-sm rounded-4 h-100">
              <div className="card-header bg-white border-0 pt-4 px-4 pb-0">
                <h5 className="fw-bold text-primary mb-0">
                  <i className="bi bi-compass me-2"></i>
                  Boundaries
                </h5>
              </div>
              <div className="card-body p-4">
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label fw-semibold text-secondary small text-uppercase">North</label>
                    <input type="text" className={`form-control ${fe('north') ? 'is-invalid' : ''}`} name="north" value={formData.north} onChange={handleChange} placeholder="North Boundary"/>
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-semibold text-secondary small text-uppercase">East</label>
                    <input type="text" className={`form-control ${fe('east') ? 'is-invalid' : ''}`} name="east" value={formData.east} onChange={handleChange} placeholder="East Boundary"/>
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-semibold text-secondary small text-uppercase">South</label>
                    <input type="text" className={`form-control ${fe('south') ? 'is-invalid' : ''}`} name="south" value={formData.south} onChange={handleChange} placeholder="South Boundary"/>
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-semibold text-secondary small text-uppercase">West</label>
                    <input type="text" className={`form-control ${fe('west') ? 'is-invalid' : ''}`} name="west" value={formData.west} onChange={handleChange} placeholder="West Boundary"/>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Land Appraisal (Full Width) */}
        <div className="card border-0 shadow-sm rounded-4 mb-4">
          <div className="card-header bg-white border-0 pt-4 px-4 pb-0 d-flex justify-content-between align-items-center">
            <h5 className="fw-bold text-primary mb-0">
              <i className="bi bi-rulers me-2"></i>
              Land Appraisal
            </h5>
            <button type="button" className="btn btn-sm btn-outline-primary rounded-pill" onClick={addRow} disabled={saving}>
              <i className="bi bi-plus-lg me-1"></i> Add Row
            </button>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" style={{ minWidth: '1000px' }}>
                <thead className="bg-light">
                  <tr>
                    <th className="px-4 py-3 fw-semibold text-secondary small text-uppercase">Class</th>
                    <th className="px-4 py-3 fw-semibold text-secondary small text-uppercase">Sub-Class</th>
                    <th className="px-4 py-3 fw-semibold text-secondary small text-uppercase">Actual Use</th>
                    <th className="px-4 py-3 fw-semibold text-secondary small text-uppercase" style={{ width: '100px' }}>Unit Val</th>
                    <th className="px-4 py-3 fw-semibold text-secondary small text-uppercase" style={{ width: '100px' }}>Area</th>
                    <th className="px-4 py-3 fw-semibold text-secondary small text-uppercase" style={{ width: '120px' }}>Market Val</th>
                    <th className="px-4 py-3 fw-semibold text-secondary small text-uppercase" style={{ width: '60px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {landAppraisal.map((row, index) => (
                    <tr key={index}>
                      <td className="px-4">
                        <input type="hidden" name="id" value={row.id || ""} />
                        <input type="text" name="class" className={`form-control form-control-sm ${lae(index,'class') ? 'is-invalid' : ''}`} 
                          value={row.class || ""} onChange={(e) => handleChangeLand(index, e)} />
                      </td>
                      <td className="px-4">
                        <input type="text" name="subClass" className={`form-control form-control-sm ${lae(index,'subClass') ? 'is-invalid' : ''}`} 
                          value={row.subClass || ""} onChange={(e) => handleChangeLand(index, e)} />
                      </td>
                      <td className="px-4">
                        <input type="text" name="actualUse" className={`form-control form-control-sm ${lae(index,'actualUse') ? 'is-invalid' : ''}`} 
                          value={row.actualUse || ""} onChange={(e) => handleChangeLand(index, e)} />
                      </td>
                      <td className="px-4">
                        <input type="number" name="unitValue" className={`form-control form-control-sm ${lae(index,'unitValue') ? 'is-invalid' : ''}`} 
                          value={row.unitValue || ""} onChange={(e) => handleChangeLand(index, e)} />
                      </td>
                      <td className="px-4">
                        <input type="number" name="area" className={`form-control form-control-sm ${lae(index,'area') ? 'is-invalid' : ''}`} 
                          value={row.area || ""} onChange={(e) => handleChangeLand(index, e)} />
                      </td>
                      <td className="px-4">
                        <input type="number" name="marketValue" className={`form-control form-control-sm ${lae(index,'marketValue') ? 'is-invalid' : ''}`} 
                          value={row.marketValue || ""} onChange={(e) => handleChangeLand(index, e)} />
                      </td>
                      <td className="px-4 text-end">
                        <button type="button" className="btn btn-link text-danger p-0"
                          onClick={() => deleteRow(index, row)}>
                          <i className="bi bi-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ROW 3: Assessment & Other Details (Proportionate) */}
        <div className="row g-4 mb-5">
          {/* Land Assessment */}
          <div className="col-lg-6">
            <div className="card border-0 shadow-sm rounded-4 h-100">
              <div className="card-header bg-white border-0 pt-4 px-4 pb-0">
                <h5 className="fw-bold text-primary mb-0">
                  <i className="bi bi-calculator me-2"></i>
                  Assessment Summary
                </h5>
              </div>
              <div className="card-body p-4">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-secondary small text-uppercase">Property Kind</label>
                    <input type="text" name="propertyKind" className={`form-control ${lse('propertyKind') ? 'is-invalid' : ''}`}
                      value={landAssessment.propertyKind} onChange={handleChangeLandAssessment} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-secondary small text-uppercase">Actual Use</label>
                    <input type="text" name="propertyActualUse" className={`form-control ${lse('propertyActualUse') ? 'is-invalid' : ''}`}
                      value={landAssessment.propertyActualUse} onChange={handleChangeLandAssessment} />
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-semibold text-secondary small text-uppercase">Assessed Value</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light">₱</span>
                      <input type="number" name="assessedValue" className={`form-control fw-bold ${lse('assessedValue') ? 'is-invalid' : ''}`}
                        value={landAssessment.assessedValue} onChange={handleChangeLandAssessment} />
                    </div>
                  </div>
                  {/* Status Display (Editable) */}
                  <div className="col-12">
                    <label className="form-label fw-semibold text-secondary small text-uppercase">Payment Status</label>
                    <select 
                      className="form-select fw-bold"
                      name="paymentStatus"
                      value={otherDetails.paymentStatus || "Unpaid"}
                      onChange={handleChangeOtherDetails}
                      style={{ 
                          color: (otherDetails.paymentStatus === 'Paid' || otherDetails.paymentStatus === 'paid') ? 'green' : 'red',
                      }}
                    >
                       <option value="Unpaid" style={{ color: 'red' }}>UNPAID</option>
                       <option value="Paid" style={{ color: 'green' }}>PAID</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Other Details */}
          <div className="col-lg-6">
            <div className="card border-0 shadow-sm rounded-4 h-100">
              <div className="card-header bg-white border-0 pt-4 px-4 pb-0">
                <h5 className="fw-bold text-primary mb-0">
                  <i className="bi bi-info-square me-2"></i>
                  Other Details
                </h5>
              </div>
              <div className="card-body p-4">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-secondary small text-uppercase">Taxability</label>
                    <select name="taxability" className={`form-select ${ode('taxability') ? 'is-invalid' : ''}`}
                      value={otherDetails.taxability} onChange={handleChangeOtherDetails}>
                      <option value="">-- Select --</option>
                      <option value="Exempted">Exempted</option>
                      <option value="Taxable">Taxable</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-secondary small text-uppercase">Effectivity Year</label>
                    <input type="number" name="effectivityYear" className={`form-control ${ode('effectivityYear') ? 'is-invalid' : ''}`}
                      value={otherDetails.effectivityYear} onChange={handleChangeOtherDetails} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-secondary small text-uppercase">Quarter</label>
                    <select name="quarter" className={`form-select ${ode('quarter') ? 'is-invalid' : ''}`}
                      value={otherDetails.quarter} onChange={handleChangeOtherDetails}>
                      <option value="">-- Select --</option>
                      <option value="1st">1st</option>
                      <option value="2nd">2nd</option>
                      <option value="3rd">3rd</option>
                      <option value="4th">4th</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-secondary small text-uppercase">Date Registered</label>
                    <input type="date" name="dateRegistered" className={`form-control ${ode('dateRegistered') ? 'is-invalid' : ''}`}
                      value={otherDetails.dateRegistered || ""} onChange={handleChangeOtherDetails} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
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
                Save Tax Declaration
              </>
            )}
          </button>
        </div>
      </form>

      {/* Map Preview Modal */}
      <MapPreviewModal 
        show={showMap} 
        onClose={() => setShowMap(false)} 
        data={mapData} 
      />

      {/* Parcel Search Modal */}
      <ParcelSearchModal
        show={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onSelect={handleParcelSelect}
      />
      
      {/* Spacer for fixed footer */}
      <div style={{ height: '80px' }}></div>
    </div>
  );
}
