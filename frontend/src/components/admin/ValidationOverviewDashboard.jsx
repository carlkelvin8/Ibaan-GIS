import React from 'react';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

const ValidationOverviewDashboard = () => {
  const navigate = useNavigate();

  // Hardcoded configuration based on the system specs
  // In a real scenario, this could come from an API endpoint /api/system/config
  const systemConfig = {
    srid: "EPSG:3123 (PRS92 / Philippines Zone 3)",
    geometryType: "MULTIPOLYGON",
    overlapRule: "Enabled",
    vertexLimit: "5,000 points",
    overlapTolerance: "1.0 sqm",
    containmentRule: "Enabled (Barangay Boundary)",
    lastUpdate: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString(),
    status: "Active"
  };

  const cards = [
    {
      title: "Storage SRID",
      value: systemConfig.srid,
      icon: "bi-globe",
      color: "primary",
      desc: "Standard Projection for Philippines"
    },
    {
      title: "Geometry Enforcement",
      value: systemConfig.geometryType,
      icon: "bi-hexagon",
      color: "success",
      desc: "Strict MultiPolygon Type"
    },
    {
      title: "Vertex Limit",
      value: systemConfig.vertexLimit,
      icon: "bi-bounding-box",
      color: "warning",
      desc: "DoS Protection Limit"
    },
    {
      title: "Overlap Tolerance",
      value: systemConfig.overlapTolerance,
      icon: "bi-exclude",
      color: "info",
      desc: "Minimum significant overlap area"
    }
  ];

  return (
    <div className="container-fluid p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold text-dark mb-1">System Validation Overview</h2>
          <p className="text-muted mb-0">Spatial Data Infrastructure Status & Configuration</p>
        </div>
        <div className="d-flex gap-2">
            <button 
            className="btn btn-outline-primary"
            onClick={() => navigate('/admin/docs/spatial-validation-audit')}
            >
            <i className="bi bi-clipboard-check me-2"></i>
            View Audit Report
            </button>
            <button 
            className="btn btn-dark"
            onClick={() => navigate('/admin/docs/spatial-validation-enforcement')}
            >
            <i className="bi bi-file-earmark-code me-2"></i>
            View Technical Specs
            </button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="row g-4 mb-5">
        {cards.map((card, idx) => (
          <div className="col-md-6 col-xl-3" key={idx}>
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex align-items-center mb-3">
                  <div className={`bg-${card.color}-subtle text-${card.color} rounded-3 p-3 me-3`}>
                    <i className={`bi ${card.icon} fs-4`}></i>
                  </div>
                  <h6 className="card-subtitle text-muted text-uppercase fw-bold small">{card.title}</h6>
                </div>
                <h3 className="card-title fw-bold mb-1">{card.value}</h3>
                <small className="text-muted">{card.desc}</small>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Rules Section */}
      <div className="row">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom py-3">
              <h5 className="mb-0 fw-bold">Active Validation Rules</h5>
            </div>
            <div className="card-body p-0">
              <div className="list-group list-group-flush">
                <div className="list-group-item p-3 d-flex justify-content-between align-items-center">
                    <div>
                        <div className="fw-bold"><i className="bi bi-check-circle-fill text-success me-2"></i>No Self-Intersections</div>
                        <small className="text-muted ps-4">Polygons must not intersect themselves (Simple Features)</small>
                    </div>
                    <span className="badge bg-success-subtle text-success">Active</span>
                </div>
                <div className="list-group-item p-3 d-flex justify-content-between align-items-center">
                    <div>
                        <div className="fw-bold"><i className="bi bi-check-circle-fill text-success me-2"></i>Closed Rings</div>
                        <small className="text-muted ps-4">First and last points of rings must be identical</small>
                    </div>
                    <span className="badge bg-success-subtle text-success">Active</span>
                </div>
                <div className="list-group-item p-3 d-flex justify-content-between align-items-center">
                    <div>
                        <div className="fw-bold"><i className="bi bi-check-circle-fill text-success me-2"></i>Overlap Prevention</div>
                        <small className="text-muted ps-4">New parcels cannot overlap existing ones &gt; 1.0 sqm</small>
                    </div>
                    <span className="badge bg-success-subtle text-success">Active</span>
                </div>
                <div className="list-group-item p-3 d-flex justify-content-between align-items-center">
                    <div>
                        <div className="fw-bold"><i className="bi bi-check-circle-fill text-success me-2"></i>Boundary Containment</div>
                        <small className="text-muted ps-4">Parcels must be fully contained within parent Barangay</small>
                    </div>
                    <span className="badge bg-success-subtle text-success">Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body">
                    <h6 className="fw-bold mb-3">Quick Actions</h6>
                    <div className="d-grid gap-2">
                         <button className="btn btn-light text-start" onClick={() => navigate('/admin/docs/spatial-data-pipeline')}>
                            <i className="bi bi-diagram-3 me-2"></i> View Data Pipeline
                        </button>
                        <button className="btn btn-light text-start" disabled>
                            <i className="bi bi-arrow-repeat me-2"></i> Trigger Full Re-Validation (Coming Soon)
                        </button>
                    </div>
                </div>
            </div>

            <div className="card border-0 shadow-sm bg-primary text-white">
                <div className="card-body">
                    <h5 className="fw-bold"><i className="bi bi-shield-check me-2"></i>System Healthy</h5>
                    <p className="mb-0 small opacity-75">All spatial validation services are operational. Database triggers are active.</p>
                    <hr className="border-white opacity-25 my-3" />
                    <small className="opacity-75">Last Check: {systemConfig.lastUpdate}</small>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ValidationOverviewDashboard;
