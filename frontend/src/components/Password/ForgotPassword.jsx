import React, { useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/axios.js";
import Swal from "sweetalert2";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./ForgotPassword.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/user/forgot-password", { email });
      await Swal.fire({
        icon: "success",
        title: "If that email exists, we sent a reset link.",
        text: "Please check your inbox.",
      });
      setEmail("");
    } catch (err) {
      const msg = err?.response?.data?.error || err.message;
      Swal.fire({ icon: "error", title: "Request failed", text: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ForgotPage">
      <div className="ForgotCard">
        {/* Brand */}
        <div className="brand">
          <img src="/ibaan.svg" alt="Ibaan logo" />
          <div>
            <h5 className="m-0">Ibaan GIS</h5>
          </div>
        </div>

        <div className="title">
          <h3 className="mb-1">Forgot password</h3>
          <p className="subtitle mb-0">
            Enter your account email and we’ll send you a reset link.
          </p>
        </div>

        <form className="mt-2" onSubmit={submit} noValidate>
          <div className="mb-3">
            <label htmlFor="fp-email" className="form-label">Email address</label>
            <div className="input-group">
              <span className="input-group-text">
                <i className="bi bi-envelope" aria-hidden="true" />
              </span>
              <input
                id="fp-email"
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={loading}
                autoComplete="email"
              />
            </div>
          </div>

          <button className="btn btn-primary w-100" type="submit" disabled={loading || !email}>
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                Sending…
              </>
            ) : (
              "Send reset link"
            )}
          </button>

          <div className="ForgotFooter">
            <small>
              <Link to="/login" aria-label="Back to login">
                ← Back to login
              </Link>
            </small>
          </div>
        </form>
      </div>
    </div>
  );
}