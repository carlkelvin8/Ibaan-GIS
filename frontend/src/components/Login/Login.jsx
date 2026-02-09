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

    setLoading(true);
    try {
      const res = await api.post("/user/login", payload);

      // Bearer fallback so /user/me works even if cookie is cross-origin-finicky
      if (res.data?.token) {
        localStorage.setItem("token", res.data.token);
      }

      // Prime the session and bust caches
      await api.get("/user/me", { params: { t: Date.now() } });

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
      <div className="LoginCard">
        {/* Brand */}
        <div className="brand">
          <img src="/ibaan.svg" alt="Logo" />
          <div>
            <h5 className="m-0">Ibaan GIS</h5>
          </div>
        </div>

        <div className="title">
          <h3 className="mb-1">Welcome back</h3>
          <p className="subtitle mb-0">Sign in to continue to your dashboard</p>
        </div>

        {err && (
          <div className="alert alert-danger" role="alert" aria-live="assertive">
            {err}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Username / Email */}
          <div className="mb-3">
            <label htmlFor="login-username" className="form-label">
              Username or Email
            </label>
            <div className="input-group">
              <span className="input-group-text">
                <i className="bi bi-person" aria-hidden="true" />
              </span>
              <input
                id="login-username"
                type="text"
                className={`form-control ${userInvalid ? "is-invalid" : ""}`}
                required
                placeholder="e.g., juan.delacruz or juan@city.gov.ph"
                value={form.username}
                onChange={onChangeUsername}
                onBlur={() => markTouched("username")}
                autoComplete="username"
                disabled={loading}
                aria-invalid={userInvalid || undefined}
                aria-describedby={
                  userInvalid ? "login-username-error" : undefined
                }
              />
              {userInvalid && (
                <div id="login-username-error" className="invalid-feedback">
                  {errors.username}
                </div>
              )}
            </div>
          </div>

          {/* Password */}
          <div className="mb-2">
            <label htmlFor="login-password" className="form-label">
              Password
            </label>
            <div className="input-group">
              <span className="input-group-text">
                <i className="bi bi-lock" aria-hidden="true" />
              </span>
              <input
                id="login-password"
                type={showPwd ? "text" : "password"}
                className={`form-control ${passInvalid ? "is-invalid" : ""}`}
                required
                placeholder="Minimum 6 characters"
                value={form.password}
                onChange={onChangePassword}
                onBlur={() => markTouched("password")}
                onKeyUp={handleCaps}
                onKeyDown={handleCaps}
                autoComplete="current-password"
                disabled={loading}
                aria-invalid={passInvalid || undefined}
                aria-describedby={
                  passInvalid
                    ? "login-password-error"
                    : caps
                    ? "login-password-caps"
                    : undefined
                }
              />
              <button
                type="button"
                className="btn btn-outline-secondary toggle-btn"
                onClick={() => setShowPwd((s) => !s)}
                tabIndex={-1}
                disabled={loading}
                aria-label={showPwd ? "Hide password" : "Show password"}
                title={showPwd ? "Hide password" : "Show password"}
              >
                <i className={`bi ${showPwd ? "bi-eye-slash" : "bi-eye"}`} />
              </button>
              {passInvalid && (
                <div
                  id="login-password-error"
                  className="invalid-feedback d-block"
                >
                  {errors.password}
                </div>
              )}
            </div>
            {caps && !passInvalid && (
              <div id="login-password-caps" className="form-text text-warning">
                Caps Lock is ON
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary w-100 mt-2"
            disabled={loading || !isValid}
          >
            {loading ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                />
                Signing in…
              </>
            ) : (
              "Login"
            )}
          </button>

          {/* Footer Links */}
          <div className="LoginFooter">
            <small>
              New here?{" "}
              <Link to="/signup" aria-label="Go to signup">
                Create an account
              </Link>
            </small>
            <small>
              <Link to="/forgot-password">Forgot password?</Link>
            </small>
          </div>
        </form>
      </div>
    </div>
  );
}