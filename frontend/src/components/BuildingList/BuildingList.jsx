import React, { useEffect, useState } from "react";
import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import api from "../../lib/axios.js";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

const BuildingList = () => {
  const navigate = useNavigate();
  const [buildings, setBuildings] = useState([]);

  useEffect(() => {
    const fetchBuildings = async () => {
      try {
        const res = await api.get("/building");
        setBuildings(res.data);
        localStorage.removeItem("buildingNum");
      } catch (error) {
        console.log("error fetching data:", error);
        Swal.fire({ icon: "error", title: "Fetch failed", text: "Cannot load buildings." });
      }
    };
    fetchBuildings();
  }, []);

  const handleEdit = (building) => {
    localStorage.setItem("buildingNum", building.building_num);
    navigate("/building");
  };

  const handleAdd = () => navigate("/building");

  const handleDelete = async (building) => {
    const { isConfirmed } = await Swal.fire({
      icon: "warning",
      title: "Delete this building?",
      text: `#${building.building_num} — ${building.buildingName}`,
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
    });
    if (!isConfirmed) return;

    try {
      Swal.fire({ title: "Deleting...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      await api.delete(`/building/${building.building_num}`);
      setBuildings((prev) => prev.filter((b) => b.building_num !== building.building_num));
      await Swal.fire({ icon: "success", title: "Deleted", timer: 1200, showConfirmButton: false });
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error || err.message || "Delete failed.";
      Swal.fire({ icon: "error", title: "Delete failed", text: msg });
    }
  };

  return (
    <div className="container mt-4">
      <h2>Building List</h2>
      <Button variant="primary" onClick={handleAdd} className="mb-3">
        Add New
      </Button>

      {buildings.length > 0 ? (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Building Number</th>
              <th>Building Name</th>
              <th>Building Use Type</th>
              <th>Building Type</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {buildings.map((building) => (
              <tr key={building.building_num}>
                <td>{building.building_num}</td>
                <td>{building.buildingName}</td>
                <td>{building.buildingUseType}</td>
                <td>{building.buildingType}</td>
                <td>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleEdit(building)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    className="ms-2"
                    onClick={() => handleDelete(building)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <p className="text-muted">No results found.</p>
      )}
    </div>
  );
};

export default BuildingList;