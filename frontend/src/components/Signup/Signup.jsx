import React, { useState } from "react";
import {  useNavigate } from "react-router-dom";
import api from '../../lib/axios.js';
import Swal from 'sweetalert2';

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    password: ""
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Show loading Swal
    Swal.fire({
      title: 'Signing up...',
      text: 'Please wait',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const res = await api.post("/user/signup", form);
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: res.data.message || 'Signup successful',
      });
      navigate("/login");
    } catch (err) {
      console.log(err)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.response?.data?.error || "Something went wrong",
      });
    }
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-4">
          <div className="card shadow-sm">
            <div className="card-body">

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 'auto', marginBottom: '1rem' }}>
                <img src="/ibaan.svg" alt="Logo" style={{ height: '12rem', width: 'auto' }} />
              </div>

              <h3 className="text-center mb-4">Sign Up</h3>
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Username</label>
                  <input
                    className="form-control"
                    name="username"
                    required
                    onChange={handleChange}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">First Name</label>
                  <input
                    className="form-control"
                    name="first_name"
                    required
                    onChange={handleChange}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Last Name</label>
                  <input
                    className="form-control"
                    name="last_name"
                    required
                    onChange={handleChange}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    name="email"
                    required
                    onChange={handleChange}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-control"
                    name="password"
                    required
                    onChange={handleChange}
                  />
                </div>
                <button type="submit" className="btn btn-primary w-100">
                  Sign Up
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
