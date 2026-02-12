import React, { useState } from 'react';
import { Modal, Button, Form, Table, Alert } from 'react-bootstrap';
import api from '../../lib/axios';

export default function ParcelSearchModal({ show, onClose, onSelect }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [location, setLocation] = useState("landparcel");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      let endpoint;
      if (location === 'ibaan') endpoint = '/ibaan/search/';
      else if (location === 'alameda') endpoint = '/alameda/search/';
      else endpoint = '/landparcel/search/';

      const res = await api.get(endpoint + encodeURIComponent(searchTerm));
      
      // Handle "not found" response structure { ID: 0, message: "..." }
      if (res.data && res.data.ID === 0) {
        setResults([]);
      } else if (Array.isArray(res.data)) {
        setResults(res.data);
      } else if (res.data) {
        setResults([res.data]);
      } else {
        setResults([]);
      }
    } catch (err) {
      setError("Search failed. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onClose} size="lg" centered>
      <Modal.Header closeButton className="bg-light">
        <Modal.Title>Link Parcel</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSearch} className="mb-3">
          <div className="row g-2">
            <div className="col-md-3">
              <Form.Select value={location} onChange={e => setLocation(e.target.value)}>
                <option value="landparcel">Land Parcel</option>
                <option value="ibaan">Ibaan</option>
                <option value="alameda">Alameda</option>
              </Form.Select>
            </div>
            <div className="col-md-7">
               <Form.Control 
                 type="text" 
                 placeholder="Search Parcel ID, Owner, or Barangay..." 
                 value={searchTerm}
                 onChange={e => setSearchTerm(e.target.value)}
                 autoFocus
               />
            </div>
            <div className="col-md-2">
              <Button type="submit" variant="primary" className="w-100" disabled={loading}>
                {loading ? '...' : 'Search'}
              </Button>
            </div>
          </div>
        </Form>

        {error && <Alert variant="danger">{error}</Alert>}
        
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          <Table striped hover bordered size="sm" responsive>
            <thead className="sticky-top bg-white shadow-sm">
              <tr>
                <th>Parcel ID</th>
                <th>Owner</th>
                <th>Barangay</th>
                <th style={{ width: '80px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {results.length > 0 ? (
                results.map((row, i) => {
                  const pid = row.parcelID || row.ParcelId || row.PARCELID;
                   const owner = row.Claimant || row.ownerName || row.OwnerName || "";
                   const brgy = row.Barangay || row.BarangayNa || "";
                   
                   return (
                     <tr key={i}>
                       <td className="align-middle">{pid}</td>
                       <td className="align-middle">{owner || "-"}</td>
                       <td className="align-middle">{brgy || "-"}</td>
                      <td className="align-middle">
                        <Button size="sm" variant="success" onClick={() => onSelect(row)}>
                          Select
                        </Button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="4" className="text-center text-muted py-4">
                    {loading ? "Searching..." : "No results found"}
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
      </Modal.Footer>
    </Modal>
  );
}
