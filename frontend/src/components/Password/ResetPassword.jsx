import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from '../../lib/axios.js';

import Swal from "sweetalert2";

export default function ResetPassword() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const token = sp.get("token") || "";
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [valid, setValid] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await api.get(`/user/reset-password/${token}`);
        setValid(true);
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "Invalid or expired link",
          text: "Please request a new password reset.",
        }).then(() => navigate("/forgot-password"));
      }
    })();
  }, [token, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    if (pw.length < 8) {
      return Swal.fire({ icon: "warning", title: "Password too short", text: "Use at least 8 characters." });
    }
    if (pw !== pw2) {
      return Swal.fire({ icon: "warning", title: "Passwords do not match" });
    }
    try {
      await api.post("/user/reset-password", { token, password: pw });
      Swal.fire({ icon: "success", title: "Password reset successful" }).then(() => navigate("/login"));
    } catch (err) {
      const msg = err?.response?.data?.error || err.message;
      Swal.fire({ icon: "error", title: "Reset failed", text: msg });
    }
  };

  if (!valid) return null;

  return (
    <div className="container mt-5" style={{ maxWidth: 480 }}>
      <h3>Set a new password</h3>
      <form className="mt-3" onSubmit={submit}>
        <div className="mb-3">
          <label className="form-label">New password</label>
          <input
            type="password"
            className="form-control"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="At least 8 characters"
            required
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Confirm password</label>
          <input
            type="password"
            className="form-control"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            required
          />
        </div>
        <button className="btn btn-primary" type="submit">Reset password</button>
      </form>
    </div>
  );
}