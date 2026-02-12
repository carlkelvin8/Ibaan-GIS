import React, { useEffect, useState } from 'react';
import api from '../../lib/axios';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [filters, setFilters] = useState({
    q: '',
    action: '',
    dateFrom: '',
    dateTo: '',
  });

  const fetchLogs = async (p = 1) => {
    try {
      setLoading(true);
      const params = {
        page: p,
        limit: 20,
        ...filters,
      };
      const res = await api.get('/audit', { params });
      if (res.data) {
        setLogs(res.data.data || []);
        setPage(res.data.page || 1);
        setTotalPages(res.data.pages || 1);
        setTotalLogs(res.data.total || 0);
      }
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, []); // Initial load

  const handleSearch = (e) => {
    e.preventDefault();
    fetchLogs(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchLogs(newPage);
    }
  };

  const exportCsv = () => {
    const url = `${api.defaults.baseURL || '/api'}/audit/export.csv`;
    window.open(url, '_blank');
  };

  return (
    <div className="container-fluid p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold">Audit Logs</h2>
        <button className="btn btn-outline-primary" onClick={exportCsv}>
          <i className="bi bi-download me-2"></i>Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-4 shadow-sm">
        <div className="card-body">
          <form onSubmit={handleSearch} className="row g-3">
            <div className="col-md-3">
              <input
                type="text"
                className="form-control"
                placeholder="Search user, entity..."
                value={filters.q}
                onChange={(e) => setFilters({ ...filters, q: e.target.value })}
              />
            </div>
            <div className="col-md-2">
              <select
                className="form-select"
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              >
                <option value="">All Actions</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div className="col-md-2">
              <input
                type="date"
                className="form-control"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              />
            </div>
            <div className="col-md-2">
              <input
                type="date"
                className="form-control"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              />
            </div>
            <div className="col-md-2 d-flex gap-2">
              <button type="submit" className="btn btn-primary w-100">Filter</button>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => {
                    setFilters({ q: '', action: '', dateFrom: '', dateTo: '' });
                    // fetchLogs(1) will be called if we trigger it or use effect dependency, 
                    // but for now just clear state. Better to trigger fetch.
                    setTimeout(() => fetchLogs(1), 0); 
                }}
              >
                Reset
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Table */}
      <div className="card shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th>Time</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Entity Type</th>
                  <th>Details</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-5">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-5 text-muted">
                      No logs found.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id}>
                      <td className="text-nowrap">
                        {log.ts ? new Date(log.ts).toLocaleString() : '-'}
                      </td>
                      <td>
                        <span className="fw-medium">{log.username}</span>
                      </td>
                      <td>
                        <span className={`badge bg-${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td>{log.entity}</td>
                      <td>
                        <small className="text-muted text-break" style={{ maxWidth: '300px', display: 'block' }}>
                          {renderDetails(log.meta)}
                        </small>
                      </td>
                      <td>{log.ip}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card-footer d-flex justify-content-between align-items-center">
          <small className="text-muted">
            Showing {logs.length} of {totalLogs} logs
          </small>
          <nav>
            <ul className="pagination mb-0">
              <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => handlePageChange(page - 1)}>
                  Previous
                </button>
              </li>
              <li className="page-item disabled">
                <span className="page-link">
                  Page {page} of {totalPages}
                </span>
              </li>
              <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => handlePageChange(page + 1)}>
                  Next
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
};

const getActionColor = (action) => {
  switch (action) {
    case 'CREATE': return 'success';
    case 'UPDATE': return 'warning text-dark';
    case 'DELETE': return 'danger';
    default: return 'secondary';
  }
};

const renderDetails = (meta) => {
  if (!meta) return '-';
  // If meta has originalAction (like LOGIN), show it
  let display = '';
  if (meta.originalAction && meta.originalAction !== 'UPDATE') {
     display += `[${meta.originalAction}] `;
  }
  
  // If there are changed fields
  if (meta.details) {
    display += JSON.stringify(meta.details);
  } else if (Object.keys(meta).length > 0) {
      // exclude standard keys
      const { originalAction, method, path, body, query, ...rest } = meta;
      if (Object.keys(rest).length > 0) display += JSON.stringify(rest);
      else if (path) display += path; 
  }
  
  return display || '-';
};

export default AuditLogs;
