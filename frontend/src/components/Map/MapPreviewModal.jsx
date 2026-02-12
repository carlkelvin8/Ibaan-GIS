import React, { useEffect } from 'react';
import { Modal, Button, Badge } from 'react-bootstrap';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Component to handle map resizing and fitting bounds
function MapController({ geojson }) {
  const map = useMap();

  useEffect(() => {
    // Fix hidden container bug
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (geojson && map) {
      try {
        // Create a temporary layer to get bounds
        const layer = L.geoJSON(geojson);
        const bounds = layer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      } catch (e) {
        console.error("Error fitting bounds:", e);
      }
    }
  }, [map, geojson]);

  return null;
}

export default function MapPreviewModal({ show, onClose, data }) {
  const geojson = data?.geojson;

  return (
    <Modal show={show} onHide={onClose} centered size="xl" className="map-preview-modal">
      <Modal.Header closeButton className="bg-light bg-gradient" style={{ borderBottom: '3px solid #0d6efd' }}>
        <Modal.Title className="fw-bold text-primary">
          <i className="bi bi-geo-alt-fill me-2"></i>
          Parcel Preview: {data?.ParcelId || "Unknown"}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-0 position-relative" style={{ height: '70vh' }}>
        {!geojson ? (
          <div className="d-flex align-items-center justify-content-center h-100 text-muted bg-light">
            <div className="text-center">
              <i className="bi bi-exclamation-triangle display-4 text-warning"></i>
              <p className="mt-2 fw-semibold">No geometry data available for this parcel.</p>
            </div>
          </div>
        ) : (
          <MapContainer
            center={[13.8, 121.1]} // Default fallback
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            {/* Esri Satellite */}
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="Tiles &copy; Esri"
            />
             {/* Hybrid Labels (Optional but good for context) */}
            <TileLayer 
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" 
            />
            <GeoJSON 
                data={geojson} 
                style={{ color: '#ffff00', weight: 3, fillOpacity: 0.2, fillColor: '#ffff00' }} 
            />
            <MapController geojson={geojson} />
          </MapContainer>
        )}

        {/* Floating Info Badge */}
        <div className="position-absolute top-0 end-0 m-3 p-3 bg-white shadow rounded border border-secondary" style={{ zIndex: 1000, maxWidth: '300px', opacity: 0.95 }}>
          <h6 className="fw-bold mb-1 text-dark">{data?.BarangayNa || data?.Barangay || "Barangay"}</h6>
          <div className="mb-2">
            <Badge bg="info" className="me-1">{data?.propertyType || data?.classification || "Class"}</Badge>
            {(data?.delinquent || data?.isDelinquent) && <Badge bg="danger">Delinquent</Badge>}
          </div>
          <small className="d-block text-secondary">Lot: {data?.LotNumber || data?.lotNo || "-"}</small>
          <small className="d-block text-secondary">Area: {data?.areaSize || data?.Area || "-"} sqm</small>
        </div>
      </Modal.Body>
      <Modal.Footer className="bg-light">
        <Button variant="secondary" onClick={onClose}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
}