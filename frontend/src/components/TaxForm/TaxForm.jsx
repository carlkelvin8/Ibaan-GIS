import React, { useState, useEffect } from "react";
import api from '../../lib/axios.js';
import { normalizeDate } from '../../lib/utils.js';
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

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
    dateRegistered: ""
  });

  const [errors, setErrors] = useState({
    formData: {},
    landAppraisal: [],
    landAssessment: {},
    otherDetails: {},
  });
  const [saving, setSaving] = useState(false);
  const [submitTouched, setSubmitTouched] = useState(false);

  useEffect(() => {
    const fetchTax = async () => {
      try {
        const taxId = localStorage.getItem("taxId");

        if (taxId) {
          // ---- EDIT MODE ----
          const res = await api.get("/tax/" + taxId);
          const taxData = { ...res.data };
          taxData.dated = normalizeDate(taxData.dated);
          setFormData({ ...defaultFormData, ...taxData });

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
              }));
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
      'arpNo','accountNo','ownerName','ownerAddress','administrator','adminAddress',
      'north','east','south','west','propertyIndexNo','subdivision','phase','lotNo',
      'tdPrintedNo','houseNo','street','landmark','barangay','octNo','dated','surveyNo',
      'cadLotNo','lotNo2','blockNo'
    ];
    reqForm.forEach((k) => { if (isEmpty(formData[k])) newErrs.formData[k] = 'Required'; });

    // conditional: barangayText required if barangayOnPrint is true
    if (formData.barangayOnPrint && isEmpty(formData.barangayText)) {
      newErrs.formData.barangayText = 'Required when checked';
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
    if (isEmpty(la.propertyKind)) newErrs.landAssessment.propertyKind = 'Required';
    if (isEmpty(la.propertyActualUse)) newErrs.landAssessment.propertyActualUse = 'Required';
    if (!isNonNegNum(la.adjustedMarketValue)) newErrs.landAssessment.adjustedMarketValue = 'Must be ≥ 0';
    if (!isNonNegNum(la.level)) newErrs.landAssessment.level = 'Must be ≥ 0';
    if (!isNonNegNum(la.assessedValue)) newErrs.landAssessment.assessedValue = 'Must be ≥ 0';

    // otherDetails
    if (isEmpty(otherDetails.taxability)) newErrs.otherDetails.taxability = 'Required';
    const y = Number(otherDetails.effectivityYear);
    if (!(y >= 1900 && y <= 2100)) newErrs.otherDetails.effectivityYear = '4-digit year (1900–2100)';
    if (isEmpty(otherDetails.quarter)) newErrs.otherDetails.quarter = 'Required';
    if (isEmpty(otherDetails.updateCode)) newErrs.otherDetails.updateCode = 'Required';
    if (isEmpty(otherDetails.dateRegistered)) newErrs.otherDetails.dateRegistered = 'Required';

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
        alert("Row deleted successfully!");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting row");
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

    setSaving(true);
    try {
      let taxId = localStorage.getItem("taxId");
      if (taxId) {
        await api.put(`/tax/${taxId}`, formData);
        await api.post(`/landappraisal/${taxId}`, landAppraisal);
        await api.post(`/landassessment/${taxId}`, landAssessment);
        await api.post(`/taxotherdetails/${taxId}`, otherDetails);
        alert("Tax updated successfully!");
        localStorage.removeItem("parcelID");
      } else {
        const result = await api.post("/tax", formData);
        taxId = result?.data?.insertId;
        await api.post(`/landappraisal/${taxId}`, landAppraisal);
        await api.post(`/landassessment/${taxId}`, landAssessment);
        await api.post(`/taxotherdetails/${taxId}`, otherDetails);
        alert("Tax saved successfully!");
      }
      navigate("/taxlist");
    } catch (error) {
      console.error(error);
      alert("Error saving data");
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
      <h4 className="mb-3">Tax Form</h4>

      {submitTouched && (
        <div className="alert alert-info d-flex align-items-center" role="alert">
          <div className="me-2 bi bi-info-circle" aria-hidden></div>
          Please fill out all required fields. Fields with issues are highlighted below.
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="row">
          {/* Left Column */}
          <div className="col-md-6">
            {/* Declared Owner */}
            <div className="card p-3 mb-3">
              <h5>Declared Owner</h5>
              <div className="row mb-2">
                <div className="col-md-6">
                  <label className="form-label">ARP/TD No.</label>
                  <input type="text" className={`form-control ${fe('arpNo') ? 'is-invalid' : ''}`} name="arpNo" value={formData.arpNo} onChange={handleChange} placeholder="XXXX-XXXX-XXXX"/>
                  {fe('arpNo') && <div className="invalid-feedback">{fe('arpNo')}</div>}
                </div>
                <div className="col-md-3 d-flex align-items-center mt-4 mt-md-0">
                  <div className="form-check">
                    <input className="form-check-input" type="checkbox" id="tdPrinted" name="tdPrinted" checked={formData.tdPrinted} onChange={handleChange}/>
                    <label className="form-check-label" htmlFor="tdPrinted"> TD Printed</label>
                  </div>
                </div>
                <div className="col-md-3 d-flex align-items-center mt-2 mt-md-0">
                  <div className="form-check">
                    <input className="form-check-input" type="checkbox" id="municipalCode" name="municipalCode" checked={formData.municipalCode} onChange={handleChange}/>
                    <label className="form-check-label" htmlFor="municipalCode"> Municipal Code</label>
                  </div>
                </div>
              </div>
              <div className="mb-2">
                <label className="form-label">Account No.</label>
                <input type="text" className={`form-control ${fe('accountNo') ? 'is-invalid' : ''}`} name="accountNo" value={formData.accountNo} onChange={handleChange} placeholder="XXXXXXXX"/>
                {fe('accountNo') && <div className="invalid-feedback">{fe('accountNo')}</div>}
              </div>
              <div className="mb-2">
                <label className="form-label">Owner’s Name</label>
                <input type="text" className={`form-control ${fe('ownerName') ? 'is-invalid' : ''}`} name="ownerName" value={formData.ownerName} onChange={handleChange} placeholder="Owner's Name (Lastname, Firstname MI.)"/>
                {fe('ownerName') && <div className="invalid-feedback">{fe('ownerName')}</div>}
              </div>
              <div className="mb-2">
                <label className="form-label">Address</label>
                <input type="text" className={`form-control ${fe('ownerAddress') ? 'is-invalid' : ''}`} name="ownerAddress" value={formData.ownerAddress} onChange={handleChange} placeholder="Owner's Address (Bldg. No. / Street / Barangay / City)"/>
                {fe('ownerAddress') && <div className="invalid-feedback">{fe('ownerAddress')}</div>}
              </div>
              <div className="mb-2">
                <label className="form-label">Administrator</label>
                <input type="text" className={`form-control ${fe('administrator') ? 'is-invalid' : ''}`} name="administrator" value={formData.administrator} onChange={handleChange} placeholder="Administrator's Name (Lastname, Firstname MI.)"/>
                {fe('administrator') && <div className="invalid-feedback">{fe('administrator')}</div>}
              </div>
              <div className="mb-2">
                <label className="form-label">Address</label>
                <input type="text" className={`form-control ${fe('adminAddress') ? 'is-invalid' : ''}`} name="adminAddress" value={formData.adminAddress} onChange={handleChange} placeholder="Administrator's Address (Bldg. No. / Street / Barangay / City)"/>
                {fe('adminAddress') && <div className="invalid-feedback">{fe('adminAddress')}</div>}
              </div>
            </div>

            {/* Description */}
            <div className="card p-3 mb-3">
              <h5>Description and Other Particulars</h5>
              <div className="row mb-2">
                <div className="col-md-4">
                  <label className="form-label">OCT/TCT No.</label>
                  <input type="text" className={`form-control ${fe('octNo') ? 'is-invalid' : ''}`} name="octNo" value={formData.octNo} onChange={handleChange} placeholder="OCT / TCT #"/>
                  {fe('octNo') && <div className="invalid-feedback">{fe('octNo')}</div>}
                </div>
                <div className="col-md-4">
                  <label className="form-label">Dated</label>
                  <input type="date" className={`form-control ${fe('dated') ? 'is-invalid' : ''}`} name="dated" value={formData.dated || ""} onChange={handleChange}/>
                  {fe('dated') && <div className="invalid-feedback">{fe('dated')}</div>}
                </div>
                <div className="col-md-4">
                  <label className="form-label">Survey No.</label>
                  <input type="text" className={`form-control ${fe('surveyNo') ? 'is-invalid' : ''}`} name="surveyNo" value={formData.surveyNo} onChange={handleChange} placeholder="Survey #"/>
                  {fe('surveyNo') && <div className="invalid-feedback">{fe('surveyNo')}</div>}
                </div>
              </div>
              <div className="row mb-2">
                <div className="col-md-4">
                  <label className="form-label">Cad Lot No.</label>
                  <input type="text" className={`form-control ${fe('cadLotNo') ? 'is-invalid' : ''}`} name="cadLotNo" value={formData.cadLotNo} onChange={handleChange} placeholder="Cad Lot #"/>
                  {fe('cadLotNo') && <div className="invalid-feedback">{fe('cadLotNo')}</div>}
                </div>
                <div className="col-md-4">
                  <label className="form-label">Lot No.</label>
                  <input type="text" className={`form-control ${fe('lotNo2') ? 'is-invalid' : ''}`} name="lotNo2" value={formData.lotNo2} onChange={handleChange} placeholder="Lot #"/>
                  {fe('lotNo2') && <div className="invalid-feedback">{fe('lotNo2')}</div>}
                </div>
                <div className="col-md-4">
                  <label className="form-label">Block No.</label>
                  <input type="text" className={`form-control ${fe('blockNo') ? 'is-invalid' : ''}`} name="blockNo" value={formData.blockNo} onChange={handleChange} placeholder="Block #"/>
                  {fe('blockNo') && <div className="invalid-feedback">{fe('blockNo')}</div>}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="col-md-6">
            {/* Location of Property */}
            <div className="card p-3 mb-3">
              <h5>Location of Property</h5>
              <label className="form-label">Property Index No.</label>
              <input type="text" className={`form-control mb-2 ${fe('propertyIndexNo') ? 'is-invalid' : ''}`} name="propertyIndexNo" value={formData.propertyIndexNo} onChange={handleChange} placeholder="XXX-XXXXXXX-XXX"/>
              {fe('propertyIndexNo') && <div className="invalid-feedback">{fe('propertyIndexNo')}</div>}

              <label className="form-label">Subdivision</label>
              <input type="text" className={`form-control mb-2 ${fe('subdivision') ? 'is-invalid' : ''}`} name="subdivision" value={formData.subdivision} onChange={handleChange} placeholder="Subdivision"/>
              {fe('subdivision') && <div className="invalid-feedback">{fe('subdivision')}</div>}

              <div className="row mb-2">
                <div className="col-md-3">
                  <label className="form-label">Phase</label>
                  <input type="text" className={`form-control ${fe('phase') ? 'is-invalid' : ''}`} name="phase" value={formData.phase} onChange={handleChange} placeholder="Phase #"/>
                  {fe('phase') && <div className="invalid-feedback">{fe('phase')}</div>}
                </div>
                <div className="col-md-3">
                  <label className="form-label">Lot #</label>
                  <input type="text" className={`form-control ${fe('lotNo') ? 'is-invalid' : ''}`} name="lotNo" value={formData.lotNo} onChange={handleChange} placeholder="Lot #"/>
                  {fe('lotNo') && <div className="invalid-feedback">{fe('lotNo')}</div>}
                </div>
                <div className="col-md-3">
                  <label className="form-label">TD Printed #</label>
                  <input type="text" className={`form-control ${fe('tdPrintedNo') ? 'is-invalid' : ''}`} name="tdPrintedNo" value={formData.tdPrintedNo} onChange={handleChange} placeholder="TD Printed #"/>
                  {fe('tdPrintedNo') && <div className="invalid-feedback">{fe('tdPrintedNo')}</div>}
                </div>
              </div>
              <div className="row mb-2">
                <div className="col-md-6">
                  <label className="form-label">House No.</label>
                  <input type="text" className={`form-control ${fe('houseNo') ? 'is-invalid' : ''}`} name="houseNo" value={formData.houseNo} onChange={handleChange} placeholder="House #"/>
                  {fe('houseNo') && <div className="invalid-feedback">{fe('houseNo')}</div>}
                </div>
                <div className="col-md-6">
                  <label className="form-label">Street</label>
                  <input type="text" className={`form-control ${fe('street') ? 'is-invalid' : ''}`} name="street" value={formData.street} onChange={handleChange} placeholder="Street"/>
                  {fe('street') && <div className="invalid-feedback">{fe('street')}</div>}
                </div>
              </div>
              <label className="form-label">Cor./Landmark</label>
              <input type="text" className={`form-control mb-2 ${fe('landmark') ? 'is-invalid' : ''}`} name="landmark" value={formData.landmark} onChange={handleChange} placeholder="Landmark"/>
              {fe('landmark') && <div className="invalid-feedback">{fe('landmark')}</div>}

              <label className="form-label">Barangay</label>
              <input type="text" className={`form-control mb-2 ${fe('barangay') ? 'is-invalid' : ''}`} name="barangay" value={formData.barangay} onChange={handleChange} placeholder="Barangay"/>
              {fe('barangay') && <div className="invalid-feedback">{fe('barangay')}</div>}

              <div className="d-flex align-items-center mb-2 gap-2">
                <div className="form-check">
                  <input className="form-check-input" type="checkbox" id="barangayOnPrint" name="barangayOnPrint" checked={formData.barangayOnPrint} onChange={handleChange}/>
                  <label className="form-check-label" htmlFor="barangayOnPrint">Barangay appeared on TD Print-out</label>
                </div>
                <input type="text" className={`form-control ${fe('barangayText') ? 'is-invalid' : ''}`} name="barangayText" value={formData.barangayText} onChange={handleChange} placeholder="Barangay Name on TD"/>
                {fe('barangayText') && <div className="invalid-feedback">{fe('barangayText')}</div>}
              </div>
            </div>

            {/* Boundaries */}
            <div className="card p-3 mb-3">
              <h5>Boundaries</h5>
              <div className="row mb-2">
                <div className="col-md-6">
                  <label className="form-label">North</label>
                  <input type="text" className={`form-control ${fe('north') ? 'is-invalid' : ''}`} name="north" value={formData.north} onChange={handleChange} placeholder="North"/>
                  {fe('north') && <div className="invalid-feedback">{fe('north')}</div>}
                </div>
                <div className="col-md-6">
                  <label className="form-label">East</label>
                  <input type="text" className={`form-control ${fe('east') ? 'is-invalid' : ''}`} name="east" value={formData.east} onChange={handleChange} placeholder="East"/>
                  {fe('east') && <div className="invalid-feedback">{fe('east')}</div>}
                </div>
              </div>
              <div className="row mb-2">
                <div className="col-md-6">
                  <label className="form-label">South</label>
                  <input type="text" className={`form-control ${fe('south') ? 'is-invalid' : ''}`} name="south" value={formData.south} onChange={handleChange} placeholder="South"/>
                  {fe('south') && <div className="invalid-feedback">{fe('south')}</div>}
                </div>
                <div className="col-md-6">
                  <label className="form-label">West</label>
                  <input type="text" className={`form-control ${fe('west') ? 'is-invalid' : ''}`} name="west" value={formData.west} onChange={handleChange} placeholder="West"/>
                  {fe('west') && <div className="invalid-feedback">{fe('west')}</div>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Land Appraisal */}
        <div className="col-12">
          <h4 className="mb-3">Land Appraisal Detail</h4>
          <div className="table-responsive">
            <table className="table table-bordered table-sm text-center align-middle">
              <thead className="table-light">
                <tr>
                  <th>Class</th>
                  <th>Sub-Class</th>
                  <th>Actual Use</th>
                  <th>Unit Value</th>
                  <th>Area</th>
                  <th>Base Market Value</th>
                  <th>Stripping</th>
                  <th>Adjustment</th>
                  <th>Market Value</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {landAppraisal.map((row, index) => (
                  <tr key={index}>
                    <td>
                      <input type="hidden" name="id" value={row.id || ""} />
                      <input type="text" name="class" className={`form-control ${lae(index,'class') ? 'is-invalid' : ''}`} placeholder="Class"
                        value={row.class || ""} onChange={(e) => handleChangeLand(index, e)} />
                      {lae(index,'class') && <div className="invalid-feedback">{lae(index,'class')}</div>}
                    </td>
                    <td>
                      <input type="text" name="subClass" className={`form-control ${lae(index,'subClass') ? 'is-invalid' : ''}`} placeholder="Sub-Class"
                        value={row.subClass || ""} onChange={(e) => handleChangeLand(index, e)} />
                      {lae(index,'subClass') && <div className="invalid-feedback">{lae(index,'subClass')}</div>}
                    </td>
                    <td>
                      <input type="text" name="actualUse" className={`form-control ${lae(index,'actualUse') ? 'is-invalid' : ''}`} placeholder="Actual Use"
                        value={row.actualUse || ""} onChange={(e) => handleChangeLand(index, e)} />
                      {lae(index,'actualUse') && <div className="invalid-feedback">{lae(index,'actualUse')}</div>}
                    </td>
                    <td>
                      <input type="number" name="unitValue" className={`form-control ${lae(index,'unitValue') ? 'is-invalid' : ''}`} placeholder="0"
                        value={row.unitValue || ""} onChange={(e) => handleChangeLand(index, e)} />
                      {lae(index,'unitValue') && <div className="invalid-feedback">{lae(index,'unitValue')}</div>}
                    </td>
                    <td>
                      <input type="number" name="area" className={`form-control ${lae(index,'area') ? 'is-invalid' : ''}`} placeholder="0"
                        value={row.area || ""} onChange={(e) => handleChangeLand(index, e)} />
                      {lae(index,'area') && <div className="invalid-feedback">{lae(index,'area')}</div>}
                    </td>
                    <td>
                      <input type="number" name="baseMarketValue" className={`form-control ${lae(index,'baseMarketValue') ? 'is-invalid' : ''}`} placeholder="0"
                        value={row.baseMarketValue || ""} onChange={(e) => handleChangeLand(index, e)} />
                      {lae(index,'baseMarketValue') && <div className="invalid-feedback">{lae(index,'baseMarketValue')}</div>}
                    </td>
                    <td>
                      <input type="number" name="stripping" className={`form-control ${lae(index,'stripping') ? 'is-invalid' : ''}`} placeholder="0"
                        value={row.stripping || ""} onChange={(e) => handleChangeLand(index, e)} />
                      {lae(index,'stripping') && <div className="invalid-feedback">{lae(index,'stripping')}</div>}
                    </td>
                    <td>
                      <input type="number" name="adjustment" className={`form-control ${lae(index,'adjustment') ? 'is-invalid' : ''}`} placeholder="0"
                        value={row.adjustment || ""} onChange={(e) => handleChangeLand(index, e)} />
                      {lae(index,'adjustment') && <div className="invalid-feedback">{lae(index,'adjustment')}</div>}
                    </td>
                    <td>
                      <input type="number" name="marketValue" className={`form-control ${lae(index,'marketValue') ? 'is-invalid' : ''}`} placeholder="0"
                        value={row.marketValue || ""} onChange={(e) => handleChangeLand(index, e)} />
                      {lae(index,'marketValue') && <div className="invalid-feedback">{lae(index,'marketValue')}</div>}
                    </td>
                    <td>
                      <button type="button" className="btn btn-danger btn-sm"
                        onClick={() => deleteRow(index, row)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className="btn btn-primary" onClick={addRow} disabled={saving}>
            Add Row
          </button>
        </div>

        {/* Land Assessment */}
        <div className="col-12 mt-4">
          <h4 className="mb-3">Land Assessment Summary</h4>
          <div className="table-responsive">
            <table className="table table-bordered table-sm text-center align-middle">
              <thead className="table-light">
                <tr>
                  <th>Property Kind</th>
                  <th>Actual Use</th>
                  <th>Adjusted Market Value</th>
                  <th>Level</th>
                  <th>Assessed Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <input type="hidden" name="id" value={landAssessment.id || ""} />
                    <input type="text" name="propertyKind" className={`form-control ${lse('propertyKind') ? 'is-invalid' : ''}`} placeholder="Property Kind"
                      value={landAssessment.propertyKind} onChange={handleChangeLandAssessment} />
                    {lse('propertyKind') && <div className="invalid-feedback">{lse('propertyKind')}</div>}
                  </td>
                  <td>
                    <input type="text" name="propertyActualUse" className={`form-control ${lse('propertyActualUse') ? 'is-invalid' : ''}`} placeholder="Actual Use"
                      value={landAssessment.propertyActualUse} onChange={handleChangeLandAssessment} />
                    {lse('propertyActualUse') && <div className="invalid-feedback">{lse('propertyActualUse')}</div>}
                  </td>
                  <td>
                    <input type="number" name="adjustedMarketValue" className={`form-control ${lse('adjustedMarketValue') ? 'is-invalid' : ''}`} placeholder="0"
                      value={landAssessment.adjustedMarketValue} onChange={handleChangeLandAssessment} />
                    {lse('adjustedMarketValue') && <div className="invalid-feedback">{lse('adjustedMarketValue')}</div>}
                  </td>
                  <td>
                    <input type="number" name="level" className={`form-control ${lse('level') ? 'is-invalid' : ''}`} placeholder="0"
                      value={landAssessment.level} onChange={handleChangeLandAssessment} />
                    {lse('level') && <div className="invalid-feedback">{lse('level')}</div>}
                  </td>
                  <td>
                    <input type="number" name="assessedValue" className={`form-control ${lse('assessedValue') ? 'is-invalid' : ''}`} placeholder="0"
                      value={landAssessment.assessedValue} onChange={handleChangeLandAssessment} />
                    {lse('assessedValue') && <div className="invalid-feedback">{lse('assessedValue')}</div>}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Other Details */}
        <div className="col-12 mt-4">
          <h4 className="mb-3">Other Details</h4>
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Taxability</label>
              <input type="hidden" name="id" value={otherDetails.id || ""} />
              <select name="taxability" className={`form-select ${ode('taxability') ? 'is-invalid' : ''}`}
                value={otherDetails.taxability} onChange={handleChangeOtherDetails}>
                <option value="">-- Select --</option>
                <option value="Exempted">Exempted</option>
                <option value="Taxable">Taxable</option>
              </select>
              {ode('taxability') && <div className="invalid-feedback">{ode('taxability')}</div>}
            </div>
            <div className="col-md-4">
              <label className="form-label">Effectivity Year</label>
              <input type="number" name="effectivityYear" className={`form-control ${ode('effectivityYear') ? 'is-invalid' : ''}`} placeholder="XXXX"
                value={otherDetails.effectivityYear} onChange={handleChangeOtherDetails} />
              {ode('effectivityYear') && <div className="invalid-feedback">{ode('effectivityYear')}</div>}
            </div>
            <div className="col-md-4">
              <label className="form-label">Quarter</label>
              <select name="quarter" className={`form-select ${ode('quarter') ? 'is-invalid' : ''}`}
                value={otherDetails.quarter} onChange={handleChangeOtherDetails}>
                <option value="">-- Select --</option>
                <option value="1st">1st</option>
                <option value="2nd">2nd</option>
                <option value="3rd">3rd</option>
                <option value="4th">4th</option>
              </select>
              {ode('quarter') && <div className="invalid-feedback">{ode('quarter')}</div>}
            </div>

            <div className="col-md-6">
              <label className="form-label">Update Code</label>
              <select name="updateCode" className={`form-select ${ode('updateCode') ? 'is-invalid' : ''}`}
                value={otherDetails.updateCode} onChange={handleChangeOtherDetails}>
                <option value="">-- Select --</option>
                <option value="GENERAL REVISION">GENERAL REVISION</option>
              </select>
              {ode('updateCode') && <div className="invalid-feedback">{ode('updateCode')}</div>}
            </div>
            <div className="col-md-6">
              <label className="form-label">Date Registered</label>
              <input type="date" name="dateRegistered" className={`form-control ${ode('dateRegistered') ? 'is-invalid' : ''}`}
                value={otherDetails.dateRegistered || ""} onChange={handleChangeOtherDetails} />
              {ode('dateRegistered') && <div className="invalid-feedback">{ode('dateRegistered')}</div>}
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="col-12 mt-4 d-flex gap-2">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving && <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>}
            {saving ? 'Saving…' : 'Save Tax'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={cancel} disabled={saving}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
