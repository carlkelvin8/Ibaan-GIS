
import React, { useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Spinner, Alert, Button, Badge, ListGroup, Card, Form, ProgressBar } from 'react-bootstrap';
import Swal from 'sweetalert2';
import api from '../../lib/axios';
import './SpatialValidation.css';
import * as toGeoJSON from '@tmcw/togeojson';
import shp from 'shpjs';

// Helper to fit bounds
const MapUpdater = ({ data }) => {
  const map = useMap();
  React.useEffect(() => {
    if (data && map) {
      try {
        const layer = L.geoJSON(data);
        if (layer.getBounds().isValid()) {
          map.fitBounds(layer.getBounds(), { padding: [50, 50] });
        }
      } catch (e) {
        console.warn("Bounds error", e);
      }
    }
  }, [data, map]);
  return null;
};

const SpatialValidationUpload = () => {
  const [file, setFile] = useState(null);
  const [geoJSON, setGeoJSON] = useState(null);
  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [settings, setSettings] = useState({
    barangayId: "",
    checkOverlaps: true,
    autoFix: false
  });
  const [clientErrors, setClientErrors] = useState([]);
  
  const fileInputRef = useRef(null);

  // --- 1. File Handling ---

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setValidationResult(null);
    setClientErrors([]);
    setGeoJSON(null);
    setRawText("");

    const fileName = selectedFile.name.toLowerCase();
    
    if (fileName.endsWith('.geojson') || fileName.endsWith('.json')) {
      handleGeoJSON(selectedFile);
    } else if (fileName.endsWith('.kml')) {
      handleKML(selectedFile);
    } else if (fileName.endsWith('.zip')) {
      handleShapefile(selectedFile);
    } else {
      setClientErrors([{ code: 'INVALID_FORMAT', message: 'Unsupported file format. Use GeoJSON, KML, or Shapefile (.zip).' }]);
    }
  };

  const handleGeoJSON = (file) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        setRawText(text);
        const json = JSON.parse(text);
        
        // Basic Structure Check
        if (!json.type || (json.type !== 'FeatureCollection' && json.type !== 'Feature' && json.type !== 'Polygon' && json.type !== 'MultiPolygon')) {
            throw new Error("Invalid GeoJSON structure.");
        }
        
        // Normalize to FeatureCollection for map
        let normalized = json;
        if (json.type === 'Polygon' || json.type === 'MultiPolygon') {
            normalized = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: json }] };
        } else if (json.type === 'Feature') {
            normalized = { type: 'FeatureCollection', features: [json] };
        }

        setGeoJSON(normalized);
        
        // SRID Check
        if (!json.crs) {
             setClientErrors(prev => [...prev, { code: 'SRID_MISSING', message: 'GeoJSON is missing "crs" property. Assuming WGS84 (EPSG:4326).', type: 'warning' }]);
        }

        runFastChecks(normalized);
      } catch (err) {
        setClientErrors([{ code: 'PARSE_ERROR', message: 'Invalid GeoJSON: ' + err.message }]);
      }
    };
    reader.readAsText(file);
  };

  const handleKML = (file) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const text = event.target.result;
            if (text.includes('<altitude>')) {
                 setClientErrors(prev => [...prev, { code: 'WARN_ALTITUDE', message: 'KML contains altitude data. This will be stripped.', type: 'warning' }]);
            }
            
            const parser = new DOMParser();
            const kmlDoc = parser.parseFromString(text, 'text/xml');
            const converted = toGeoJSON.kml(kmlDoc);

            if (!converted || !converted.features || converted.features.length === 0) {
                 throw new Error("No valid features found in KML.");
            }

            setGeoJSON(converted);
            setRawText(JSON.stringify(converted));
            runFastChecks(converted);

        } catch (err) {
             setClientErrors(prev => [...prev, { code: 'KML_PARSE_ERROR', message: 'Failed to parse KML: ' + err.message }]);
        }
    };
    reader.readAsText(file);
  };

  const handleShapefile = async (file) => {
    try {
        const buffer = await file.arrayBuffer();
        const geojson = await shp(buffer);
        
        // shpjs can return an array if zip has multiple shapefiles, or a single FeatureCollection
        let normalized = geojson;
        if (Array.isArray(geojson)) {
            // Merge multiple shapefiles or just pick the first one? Let's flatten.
             const allFeatures = geojson.flatMap(g => g.features);
             normalized = { type: 'FeatureCollection', features: allFeatures };
        }

        if (!normalized || !normalized.features || normalized.features.length === 0) {
             throw new Error("No valid features found in Shapefile.");
        }

        setGeoJSON(normalized);
        setRawText(JSON.stringify(normalized));
        runFastChecks(normalized);

    } catch (err) {
        setClientErrors(prev => [...prev, { code: 'SHP_PARSE_ERROR', message: 'Failed to parse Shapefile: ' + err.message }]);
    }
  };

  // --- 2. Client-Side Checks ---

  const runFastChecks = (data) => {
    const errors = [];
    
    data.features.forEach((feature, index) => {
        const geom = feature.geometry;
        if (!geom) {
            errors.push({ code: 'EMPTY_GEOM', message: `Feature ${index} has no geometry.` });
            return;
        }

        // Vertex Count Estimate (Exact Count)
        const countVertices = (coords) => {
            if (!Array.isArray(coords)) return 0;
            if (Array.isArray(coords[0]) && typeof coords[0] === 'number') return 1;
            return coords.reduce((acc, val) => acc + countVertices(val), 0);
        };
        
        const vertices = countVertices(geom.coordinates);
        if (vertices > 5000) {
            errors.push({ code: 'VERTEX_LIMIT', message: `Feature ${index} exceeds 5000 vertices (${vertices}). Performance may degrade.` });
        }

        // Closed Ring Check (Polygon & MultiPolygon)
        const checkRing = (ring, path) => {
             if (!Array.isArray(ring) || ring.length === 0) return;
             // Ring is array of points [[x,y], [x,y]]
             // Wait, GeoJSON ring is array of positions.
             const first = ring[0];
             const last = ring[ring.length - 1];
             if (first[0] !== last[0] || first[1] !== last[1]) {
                 errors.push({ code: 'OPEN_RING', message: `Feature ${index} has an open ring at ${path}.` });
             }
        };

        const checkPolygon = (coords, featIdx) => {
             // Coords is array of rings [outer, inner1, inner2...]
             coords.forEach((ring, rIdx) => checkRing(ring, `Polygon Ring ${rIdx}`));
        };

        if (geom.type === 'Polygon') {
             checkPolygon(geom.coordinates, index);
        } else if (geom.type === 'MultiPolygon') {
             geom.coordinates.forEach((poly, pIdx) => {
                  poly.forEach((ring, rIdx) => checkRing(ring, `MultiPolygon Part ${pIdx} Ring ${rIdx}`));
             });
        }
    });

    setClientErrors(errors);
  };

  // --- 3. API Integration ---

  const validateGeometry = async () => {
    if (!file && !geoJSON) return;
    
    setValidating(true);
    setValidationResult(null);

    try {
        // Always send GeoJSON payload since we convert client-side now
        const geometry = geoJSON?.features[0]?.geometry || JSON.parse(rawText);
        
        const payload = {
            geometry,
            barangayId: settings.barangayId,
            checkOverlaps: settings.checkOverlaps
        };

        const res = await api.post('/parcels/validate', payload);

        setValidationResult(res.data);
        
        // If auto-fixed geometry returned, update preview
        if (res.data.sanitized_geometry) {
            setGeoJSON({
                type: 'FeatureCollection',
                features: [{
                    type: 'Feature',
                    properties: { status: 'Auto-Fixed' },
                    geometry: res.data.sanitized_geometry
                }]
            });
        }

    } catch (err) {
        console.error(err);
        setValidationResult({
            valid: false,
            errors: [{ code: 'API_ERROR', message: err.response?.data?.message || err.message }]
        });
    } finally {
        setValidating(false);
    }
  };

  const saveParcel = async () => {
      if (!validationResult?.valid) return;
      
      try {
          setLoading(true);
          const geometry = validationResult.sanitized_geometry || (geoJSON?.features[0]?.geometry);
          
          await api.post('/landparcel', {
              ...settings, // barangay, etc.
              geom: geometry,
              // Add other parcel fields here or redirect to a form with this data pre-filled
              parcelID: "NEW-" + Date.now() // Temp ID
          });

          Swal.fire('Saved!', 'Parcel has been successfully saved.', 'success');
          // Reset or Navigate
      } catch (err) {
          Swal.fire('Error', 'Failed to save parcel.', 'error');
      } finally {
          setLoading(false);
      }
  };

  // --- 4. UI Components ---

  const getStatusBadge = () => {
      if (!validationResult) return <Badge bg="secondary">Not Validated</Badge>;
      if (validationResult.valid) return <Badge bg="success">Valid Geometry</Badge>;
      return <Badge bg="danger">Invalid Geometry</Badge>;
  };

  return (
    <div className="spatial-validation-container">
      <div className="spatial-validation-main">
        
        {/* Left Sidebar: Upload & Settings */}
        <div className="spatial-sidebar">
            <h4 className="mb-3">Parcel Validation</h4>
            
            <Form.Group className="mb-3">
                <Form.Label>Upload Geometry</Form.Label>
                <div 
                    className="dropzone"
                    onClick={() => fileInputRef.current.click()}
                >
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        style={{ display: 'none' }} 
                        accept=".json,.geojson,.kml,.zip"
                        onChange={handleFileChange}
                    />
                    <p className="mb-0 text-muted">
                        {file ? file.name : "Drag GeoJSON, KML, or Shapefile (zip)"}
                    </p>
                </div>
            </Form.Group>

            <Form.Group className="mb-3">
                <Form.Label>Barangay</Form.Label>
                <Form.Select 
                    value={settings.barangayId}
                    onChange={(e) => setSettings({...settings, barangayId: e.target.value})}
                >
                    <option value="">Select Barangay...</option>
                    <option value="1">Poblacion</option>
                    <option value="2">San Juan</option>
                    {/* Populate dynamically */}
                </Form.Select>
            </Form.Group>

            <Form.Check 
                type="switch"
                label="Check Overlaps"
                checked={settings.checkOverlaps}
                onChange={(e) => setSettings({...settings, checkOverlaps: e.target.checked})}
                className="mb-4"
            />

            {/* Client Alerts */}
            {clientErrors.length > 0 && (
                <div className="mb-3">
                    <h6>Pre-check Alerts:</h6>
                    {clientErrors.map((err, i) => (
                        <Alert key={i} variant={err.type === 'info' ? 'info' : err.type === 'warning' ? 'warning' : 'danger'} className="p-2 mb-1 small">
                            <strong>{err.code}:</strong> {err.message}
                        </Alert>
                    ))}
                </div>
            )}

            <Button 
                variant="primary" 
                onClick={validateGeometry} 
                disabled={!file || validating || clientErrors.some(e => !e.type)} // Disable on error (not warning)
                className="w-100"
            >
                {validating ? <Spinner size="sm" animation="border" /> : "Run Validation"}
            </Button>
            
            <hr />
            
            <Button 
                variant="success" 
                onClick={saveParcel}
                disabled={!validationResult?.valid || loading}
                className="w-100"
            >
                {loading ? "Saving..." : "Save Parcel"}
            </Button>

        </div>

        {/* Right: Map Preview */}
        <div className="spatial-map-container">
            <MapContainer center={[13.75, 121.05]} zoom={13} scrollWheelZoom={true}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {geoJSON && <GeoJSON data={geoJSON} style={{ color: validationResult?.valid ? 'green' : 'red' }} />}
                <MapUpdater data={geoJSON} />
            </MapContainer>
        </div>
      </div>

      {/* Bottom: Validation Results */}
      <div className="validation-results-panel">
          <div className="d-flex justify-content-between align-items-center mb-2">
              <h5 className="mb-0">Validation Results {getStatusBadge()}</h5>
              {validationResult && (
                <Button variant="outline-secondary" size="sm" onClick={() => {
                    const blob = new Blob([JSON.stringify(validationResult, null, 2)], {type: 'application/json'});
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'validation-report.json';
                    a.click();
                }}>
                    Download Report
                </Button>
              )}
          </div>

          {validationResult && (
              <div className="row">
                  <div className="col-md-12">
                      <ListGroup variant="flush" className="error-list-group">
                          {validationResult.errors?.length === 0 && validationResult.warnings?.length === 0 && (
                              <ListGroup.Item className="text-success border-0">
                                  <i className="bi bi-check-circle-fill me-2"></i>
                                  Geometry is valid and ready to save.
                              </ListGroup.Item>
                          )}
                          
                          {validationResult.errors?.map((err, idx) => (
                              <ListGroup.Item key={idx} className="error-item-danger">
                                  <div className="fw-bold text-danger">{err.code}</div>
                                  <div>{err.message}</div>
                                  {err.suggestions && <div className="text-muted small mt-1">Suggestion: {err.suggestions.join(', ')}</div>}
                              </ListGroup.Item>
                          ))}

                          {validationResult.warnings?.map((warn, idx) => (
                              <ListGroup.Item key={'w'+idx} className="error-item-warning">
                                  <div className="fw-bold text-warning">{warn.code}</div>
                                  <div>{warn.message}</div>
                              </ListGroup.Item>
                          ))}
                      </ListGroup>
                  </div>
              </div>
          )}
          
          {!validationResult && !validating && (
              <p className="text-muted text-center mt-4">Upload a file and run validation to see results.</p>
          )}
      </div>
    </div>
  );
};

export default SpatialValidationUpload;
