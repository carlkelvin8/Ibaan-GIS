import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMapEvents, LayersControl, LayerGroup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Offcanvas, ListGroup, Badge, Spinner, Alert, Button, Form } from 'react-bootstrap';
import api from '../../lib/axios';
import './InteractiveMapDemo.css';

// --- Styles ---

const getColorByClassification = (cls) => {
    if (!cls) return '#999';
    switch (cls.toLowerCase()) {
        case 'residential': return '#3388ff';
        case 'commercial': return '#ff3333';
        case 'agricultural': return '#33ff33';
        case 'industrial': return '#aa33ff';
        case 'institutional': return '#ffff33';
        default: return '#999';
    }
};

const parcelStyle = (feature) => {
    const isDelinquent = feature.properties.delinquent;
    return {
        fillColor: getColorByClassification(feature.properties.classification),
        weight: isDelinquent ? 2 : 1,
        opacity: 1,
        color: isDelinquent ? 'red' : 'white',
        dashArray: isDelinquent ? '5, 5' : '3',
        fillOpacity: 0.6
    };
};

const barangayStyle = {
    color: '#333',
    weight: 3,
    opacity: 0.8,
    fillOpacity: 0.05, // Almost transparent fill
    dashArray: '10, 5'
};

const delinquentOverlayStyle = (feature) => {
    // Only render if delinquent
    if (!feature.properties.delinquent) return { stroke: false, fill: false };
    return {
        fillColor: 'transparent',
        weight: 2,
        color: 'red',
        opacity: 1,
        fillOpacity: 0
        // Ideally use a pattern here, but simple red outline for now
    };
};

// --- Components ---

const MapEvents = ({ onMoveEnd }) => {
    const map = useMapEvents({
        moveend: () => {
            onMoveEnd(map.getBounds());
        },
        zoomend: () => {
             onMoveEnd(map.getBounds());
        }
    });
    return null;
};

const InteractiveMapDemo = () => {
    const [parcels, setParcels] = useState(null);
    const [barangays, setBarangays] = useState(null);
    const [selectedParcel, setSelectedParcel] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showDelinquent, setShowDelinquent] = useState(false);
    const [showOffcanvas, setShowOffcanvas] = useState(false);
    
    // Initial fetch of barangays (static for now)
    useEffect(() => {
        api.get('/map/barangays')
           .then(res => setBarangays(res.data))
           .catch(err => console.error("Failed to load barangays", err));
    }, []);

    const fetchParcels = async (bounds) => {
        setLoading(true);
        try {
            const bbox = bounds.toBBoxString(); // minx,miny,maxx,maxy
            const res = await api.get(`/map/parcels?bbox=${bbox}`);
            setParcels(res.data);
        } catch (err) {
            console.error("Failed to load parcels", err);
        } finally {
            setLoading(false);
        }
    };

    const handleParcelClick = (e, feature) => {
        L.DomEvent.stopPropagation(e);
        setSelectedParcel(feature.properties);
        setShowOffcanvas(true);
    };

    const onEachParcel = (feature, layer) => {
        layer.on({
            click: (e) => handleParcelClick(e, feature),
            mouseover: (e) => {
                const l = e.target;
                l.setStyle({ weight: 3, color: '#666', fillOpacity: 0.8 });
                l.bringToFront();
            },
            mouseout: (e) => {
                const l = e.target;
                // Reset style
                const isDelinquent = feature.properties.delinquent;
                l.setStyle({
                    weight: isDelinquent ? 2 : 1,
                    color: isDelinquent ? 'red' : 'white',
                    fillOpacity: 0.6
                });
            }
        });
    };

    return (
        <div className="map-demo-container">
            <div className="map-sidebar-controls">
                <h5>Map Layers</h5>
                <Form.Check 
                    type="switch"
                    id="delinquent-switch"
                    label="Show Delinquent Overlay"
                    checked={showDelinquent}
                    onChange={(e) => setShowDelinquent(e.target.checked)}
                />
                <hr/>
                <div className="legend">
                    <h6>Legend</h6>
                    <div><span className="legend-box" style={{background: '#3388ff'}}></span> Residential</div>
                    <div><span className="legend-box" style={{background: '#ff3333'}}></span> Commercial</div>
                    <div><span className="legend-box" style={{background: '#33ff33'}}></span> Agricultural</div>
                    <div><span className="legend-box" style={{background: '#aa33ff'}}></span> Industrial</div>
                </div>
            </div>

            <MapContainer center={[13.75, 121.05]} zoom={14} style={{ height: "100%", width: "100%" }}>
                <LayersControl position="topright">
                    <LayersControl.BaseLayer checked name="OpenStreetMap">
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                    </LayersControl.BaseLayer>
                    
                    <LayersControl.Overlay checked name="Barangays">
                        {barangays && <GeoJSON data={barangays} style={barangayStyle} />}
                    </LayersControl.Overlay>

                    <LayersControl.Overlay checked name="Parcels">
                        <LayerGroup>
                            {parcels && <GeoJSON 
                                key={JSON.stringify(parcels)} // Force re-render on data update
                                data={parcels} 
                                style={parcelStyle} 
                                onEachFeature={onEachParcel} 
                            />}
                            {/* Delinquent Overlay */}
                            {showDelinquent && parcels && (
                                <GeoJSON 
                                    data={parcels} 
                                    filter={f => f.properties.delinquent}
                                    style={{
                                        fill: false,
                                        color: 'red',
                                        weight: 3,
                                        dashArray: '10, 10'
                                    }}
                                    interactive={false}
                                />
                            )}
                        </LayerGroup>
                    </LayersControl.Overlay>
                </LayersControl>
                
                <MapEvents onMoveEnd={fetchParcels} />
            </MapContainer>

            {loading && (
                <div className="map-loading-indicator">
                    <Spinner animation="border" variant="primary" />
                </div>
            )}

            <Offcanvas show={showOffcanvas} onHide={() => setShowOffcanvas(false)} placement="end" backdrop={false} scroll={true}>
                <Offcanvas.Header closeButton>
                    <Offcanvas.Title>Parcel Details</Offcanvas.Title>
                </Offcanvas.Header>
                <Offcanvas.Body>
                    {selectedParcel ? (
                        <div>
                            <h5>
                                Parcel #{selectedParcel.parcel_number} 
                                {selectedParcel.delinquent && <Badge bg="danger" className="ms-2">Delinquent</Badge>}
                            </h5>
                            <ListGroup variant="flush">
                                <ListGroup.Item>
                                    <strong>Barangay:</strong> {selectedParcel.barangay || 'N/A'}
                                </ListGroup.Item>
                                <ListGroup.Item>
                                    <strong>Classification:</strong> {selectedParcel.classification || 'N/A'}
                                </ListGroup.Item>
                                <ListGroup.Item>
                                    <strong>Area:</strong> {selectedParcel.area_sqm ? `${selectedParcel.area_sqm} sqm` : 'N/A'}
                                </ListGroup.Item>
                                <ListGroup.Item>
                                    <strong>Assessed Value:</strong> {selectedParcel.assessed_value ? `₱${selectedParcel.assessed_value.toLocaleString()}` : 'N/A'}
                                </ListGroup.Item>
                                <ListGroup.Item>
                                    <strong>Owner:</strong> {selectedParcel.owner_name || 'Restricted'}
                                </ListGroup.Item>
                            </ListGroup>

                            <div className="d-grid gap-2 mt-4">
                                <Button variant="outline-primary" size="sm" onClick={() => navigator.clipboard.writeText(selectedParcel.parcel_id)}>
                                    Copy Parcel ID
                                </Button>
                                <Button variant="outline-secondary" size="sm" onClick={() => alert("Coordinates copied (mock)")}>
                                    Copy Coordinates
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-muted">Select a parcel to view details.</p>
                    )}
                </Offcanvas.Body>
            </Offcanvas>
        </div>
    );
};

export default InteractiveMapDemo;
