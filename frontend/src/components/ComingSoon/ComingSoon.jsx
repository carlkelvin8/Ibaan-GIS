
import React from 'react';
import { useNavigate } from 'react-router-dom';

const ComingSoon = ({ title }) => {
  const navigate = useNavigate();

  return (
    <div className="container mt-5">
      <div className="text-center py-5 bg-light rounded-4 shadow-sm border">
        <div className="mb-4">
          <i className="bi bi-cone-striped display-1 text-warning"></i>
        </div>
        <h1 className="fw-bold text-dark mb-3">{title}</h1>
        <p className="lead text-muted mb-4">
          We're working hard to bring you this feature. Stay tuned!
        </p>
        <div className="d-flex justify-content-center gap-3">
          <button 
            className="btn btn-primary rounded-pill px-4"
            onClick={() => navigate('/dashboard')}
          >
            <i className="bi bi-house-door-fill me-2"></i>
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComingSoon;
