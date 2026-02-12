import React, { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../../lib/axios.js";
import Swal from "sweetalert2";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./Login.css";

const USERNAME_RE = /^[A-Za-z0-9_.-]{3,32}$/;
const EMAIL_RE = /^\S+@\S+\.\S+$/;

function validate(values) {
  const v = { ...values };
  v.username = String(v.username || "").trim();
  v.password = String(v.password || "");
  const errors = {};
  if (!v.username) errors.username = "Username or email is required.";
  else if (!USERNAME_RE.test(v.username) && !EMAIL_RE.test(v.username)) {
    errors.username = "Enter a valid username (3–32 chars) or a valid email.";
  }
  if (!v.password) errors.password = "Password is required.";
  else if (v.password.length < 6)
    errors.password = "Password must be at least 6 characters.";
  return errors;
}

export default function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || "/dashboard";

  const [form, setForm] = useState({ username: "", password: "" });
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [caps, setCaps] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const errors = useMemo(() => validate(form), [form]);
  const isValid = useMemo(() => Object.keys(errors).length === 0, [errors]);

  const onChangeUsername = (e) =>
    setForm((s) => ({ ...s, username: e.target.value.replace(/\s+/g, "") }));
  const onChangePassword = (e) =>
    setForm((s) => ({ ...s, password: e.target.value }));

  const markTouched = (name) => setTouched((t) => ({ ...t, [name]: true }));
  const handleCaps = (e) => {
    try {
      setCaps(Boolean(e.getModifierState && e.getModifierState("CapsLock")));
    } catch {}
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    setTouched({ username: true, password: true });

    const payload = { username: form.username.trim(), password: form.password };
    const finalErrors = validate(payload);
    if (Object.keys(finalErrors).length > 0) return;
    
    // Show loading Swal
    Swal.fire({
      title: 'Logging in...',
      text: 'Please wait',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    setLoading(true);
    try {
      const res = await api.post("/user/login", payload);

      // Bearer fallback so /user/me works even if cookie is cross-origin-finicky
      if (res.data?.token) {
        localStorage.setItem("token", res.data.token);
      }

      // Prime the session and bust caches
      await api.get("/user/me", { params: { t: Date.now() } });

      // Show success Swal
      await Swal.fire({
        icon: 'success',
        title: 'Login Successful',
        text: 'Welcome back!',
        timer: 1500,
        showConfirmButton: false
      });

      navigate(redirectTo, { replace: true });
    } catch (e) {
      const msg = e?.response?.data?.error || "Login failed";
      Swal.fire({
        icon: 'error',
        title: 'Login Failed',
        text: msg,
      });
    } finally {
      setLoading(false);
    }
  }

  const userInvalid = touched.username && !!errors.username;
  const passInvalid = touched.password && !!errors.password;

  return (
    <div className="LoginPage">
      {/* Landing / Marketing Side (SaaS Style) */}
      <div className="LoginLanding">
        <div className="landing-content">
          <div className="brand-pill">
            <img src="/ibaan.svg" alt="Logo" />
            <span>Ibaan GIS</span>
          </div>
          <h1>
            Smart Real Property <br />
            <span className="text-highlight">Tax Assessment</span>
          </h1>
          <p>
            Streamline your property tax management with our comprehensive GIS-powered assessment system. Track payments, manage parcels, and generate reports in real-time.
          </p>
          
          <div className="feature-grid">
            <div className="feature-item">
              <div className="icon-box">
                <i className="bi bi-map"></i>
              </div>
              <div>
                <h5>Geo-Mapping</h5>
                <small>Visualize land parcels</small>
              </div>
            </div>
            <div className="feature-item">
              <div className="icon-box">
                <i className="bi bi-calculator"></i>
              </div>
              <div>
                <h5>Auto-Assessment</h5>
                <small>Instant tax calculation</small>
              </div>
            </div>
            <div className="feature-item">
              <div className="icon-box">
                <i className="bi bi-pie-chart"></i>
              </div>
              <div>
                <h5>Analytics</h5>
                <small>Real-time revenue insights</small>
              </div>
            </div>
          </div>
        </div>
        
        {/* Abstract shapes/bg */}
        <div className="abstract-shape shape-1"></div>
        <div className="abstract-shape shape-2"></div>
      </div>

      {/* Login Form Side */}
      <div className="LoginFormSide">
        <div className="LoginCard">
          <div className="mobile-brand d-md-none">
            <img src="/ibaan.svg" alt="Logo" />
            <h5>Ibaan GIS</h5>
          </div>

          <div className="title-section">
            <h3>Welcome back</h3>
            <p className="text-muted">Enter your credentials to access your account</p>
          </div>

          {err && (
            <div className="alert alert-danger d-flex align-items-center gap-2" role="alert">
              <i className="bi bi-exclamation-circle-fill"></i>
              <div>{err}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-4">
              <label htmlFor="login-username" className="form-label fw-semibold text-secondary small text-uppercase">
                Username or Email
              </label>
              <div className="input-group input-group-lg">
                <span className="input-group-text bg-white border-end-0 text-muted ps-3">
                  <i className="bi bi-envelope"></i>
                </span>
                <input
                  id="login-username"
                  type="text"
                  className={`form-control border-start-0 ps-0 ${userInvalid ? "is-invalid" : ""}`}
                  required
                  placeholder="name@example.com"
                  value={form.username}
                  onChange={onChangeUsername}
                  onBlur={() => markTouched("username")}
                  autoComplete="username"
                  disabled={loading}
                />
                {userInvalid && (
                  <div className="invalid-feedback ms-2">
                    {errors.username}
                  </div>
                )}
              </div>
            </div>

            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label htmlFor="login-password" className="form-label fw-semibold text-secondary small text-uppercase mb-0">
                  Password
                </label>
                <Link to="/forgot-password" className="small text-decoration-none fw-semibold" style={{color: 'var(--primary-color)'}}>
                  Forgot password?
                </Link>
              </div>
              <div className="input-group input-group-lg">
                <span className="input-group-text bg-white border-end-0 text-muted ps-3">
                  <i className="bi bi-lock"></i>
                </span>
                <input
                  id="login-password"
                  type={showPwd ? "text" : "password"}
                  className={`form-control border-start-0 ps-0 ${passInvalid ? "is-invalid" : ""}`}
                  required
                  placeholder="••••••••"
                  value={form.password}
                  onChange={onChangePassword}
                  onBlur={() => markTouched("password")}
                  onKeyUp={handleCaps}
                  onKeyDown={handleCaps}
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="btn bg-white border border-start-0 text-muted pe-3"
                  onClick={() => setShowPwd((s) => !s)}
                  tabIndex={-1}
                  disabled={loading}
                  style={{borderTopRightRadius: '0.5rem', borderBottomRightRadius: '0.5rem', borderColor: '#dee2e6'}}
                >
                  <i className={`bi ${showPwd ? "bi-eye-slash" : "bi-eye"}`} />
                </button>
                {passInvalid && (
                  <div className="invalid-feedback d-block ms-2">
                    {errors.password}
                  </div>
                )}
              </div>
              {caps && !passInvalid && (
                <div className="form-text text-warning mt-1">
                  <i className="bi bi-capslock-fill me-1"></i> Caps Lock is ON
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100 btn-lg rounded-3 fw-bold mb-4 shadow-sm"
              disabled={loading || !isValid}
              style={{background: '#ea580c', border: 'none'}}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                  Verifying...
                </>
              ) : (
                "Sign in"
              )}
            </button>

          </form>
          
          <div className="mt-5 pt-4 text-center border-top">
            <small className="text-muted text-opacity-50">
              &copy; {new Date().getFullYear()} Ibaan GIS. All rights reserved.
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}