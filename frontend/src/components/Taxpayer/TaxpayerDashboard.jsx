import React, { useEffect, useState } from "react";
import api from "../../lib/axios";
import "bootstrap/dist/css/bootstrap.min.css";

const TaxpayerDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [taxpayers, setTaxpayers] = useState([]);

const fetchTaxpayer = async () => {
      try {
        setLoading(true);
        const res = await api.get("/ibaan/");
        // filter out yung mga walang tax details
        const filtered = res.data.filter(
          (obj) => obj.AmountPaid !== null || obj.Tax_Amount !== null
        );
        setTaxpayers(filtered);
      } catch (error) {
        console.log(error);
      }
      setLoading(false);
    };

  useEffect(() => {
    fetchTaxpayer();
  }, []);

  const now = new Date();
  // overdue pag walang data sa AmountPaid and past due date
  const overdue = taxpayers.filter(
    (t) =>
      t.Due_Date &&
      new Date(t.Due_Date) < now &&
      (!t.AmountPaid || t.AmountPaid === 0)
  );
  const paid = taxpayers.filter(
    (t) => t.AmountPaid && t.AmountPaid > 0
  );

  const totalOverdueTax = overdue.reduce(
    (sum, t) => sum + (Number(t.Tax_Amount) || 0),
    0
  );
  const totalPaidTax = paid.reduce(
    (sum, t) => sum + (Number(t.AmountPaid) || 0),
    0
  );

  return (
    <div className="container py-4">
      <h1 className="mb-4 fw-bold">Taxpayer Dashboard</h1>
      {/* Dashboard */}
      <div className="row mb-4">
        <div className="col-md-3 col-6 mb-2">
          <div className="card text-bg-danger">
            <div className="card-body">
              <h6 className="card-title">No. of Overdue Tax</h6>
              <p className="card-text fs-4">{overdue.length}</p>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-6 mb-2">
          <div className="card text-bg-danger">
            <div className="card-body">
              <h6 className="card-title">Total Overdue Tax</h6>
              <p className="card-text fs-4">₱ {totalOverdueTax.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-6 mb-2">
          <div className="card text-bg-success">
            <div className="card-body">
              <h6 className="card-title">No. of Paid Tax</h6>
              <p className="card-text fs-4">{paid.length}</p>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-6 mb-2">
          <div className="card text-bg-success">
            <div className="card-body">
              <h6 className="card-title">Total Paid Tax</h6>
              <p className="card-text fs-4">₱ {totalPaidTax.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
      {/* Table */}
      {loading && <p className="mb-4 text-secondary">Loading data...</p>}
      <table className="table table-bordered table-hover align-middle">
        <thead className="table-light">
          <tr>
            <th>Parcel ID</th>
            <th>Claimant</th>
            <th>Barangay</th>
            <th>Tax Amount</th>
            <th>Due Date</th>
            <th>Paid Amount</th>
            <th>Paid Date</th>
          </tr>
        </thead>
        <tbody>
          {taxpayers.map((taxpayer) => {
            const dueDate = taxpayer.Due_Date
              ? new Date(taxpayer.Due_Date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
              : "";
            const datePaid = taxpayer.Date_paid
              ? new Date(taxpayer.Date_paid).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
              : "";

            return (
              <tr key={taxpayer.ParcelId}>
                <td>{taxpayer.ParcelId}</td>
                <td>{taxpayer.Claimant}</td>
                <td>{taxpayer.BarangayNa}</td>
                <td>{taxpayer.Tax_Amount}</td>
                <td>{dueDate}</td>
                <td>{taxpayer.AmountPaid}</td>
                <td>{datePaid}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default TaxpayerDashboard;
