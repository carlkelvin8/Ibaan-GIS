// src/pages/Settings.jsx
import React, { useEffect, useState, useMemo } from "react";
import api, { setAuthToken } from "../../lib/axios.js";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const USERNAME_RE = /^[A-Za-z0-9_.-]{3,32}$/;

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);

  const [profile, setProfile] = useState({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    office_id: "",
    municipality_id: "",
  });

  const [pwdForm, setPwdForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  // ----- Fetch current user (/api/user/me) -----
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get("/user/me");
        if (!mounted) return;
        const u = res.data?.data || {};
        setProfile({
          username: u.username ?? "",
          first_name: u.first_name ?? "",
          last_name: u.last_name ?? "",
          email: u.email ?? "",
          office_id: u.office_id ?? "",
          municipality_id: u.municipality_id ?? "",
        });
      } catch (err) {
        console.error("Failed to load profile:", err);
        Swal.fire("Error", err?.response?.data?.error || "Failed to load profile", "error");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // ----- Simple validators -----
  const profileErrors = useMemo(() => {
    const e = {};
    if (!USERNAME_RE.test(profile.username || "")) e.username = "3–32 chars, letters, numbers, _ . - only.";
    if (!EMAIL_RE.test(profile.email || "")) e.email = "Enter a valid email.";
    if (!profile.first_name) e.first_name = "Required";
    if (!profile.last_name) e.last_name = "Required";
    return e;
  }, [profile]);

  const canSaveProfile = Object.keys(profileErrors).length === 0 && !saving;

  const pwdErrors = useMemo(() => {
    const e = {};
    if (!pwdForm.current_password) e.current_password = "Required";
    if (!pwdForm.new_password || pwdForm.new_password.length < 6) e.new_password = "Min 6 characters";
    if (pwdForm.new_password !== pwdForm.confirm_password) e.confirm_password = "Passwords do not match";
    return e;
  }, [pwdForm]);

  const canChangePwd = Object.keys(pwdErrors).length === 0 && !changingPwd;

  // ----- Handlers -----
  const onProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile((s) => ({ ...s, [name]: value }));
  };

  const onPwdChange = (e) => {
    const { name, value } = e.target;
    setPwdForm((s) => ({ ...s, [name]: value }));
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    if (!canSaveProfile) return;

    setSaving(true);
    Swal.fire({ title: "Saving…", didOpen: () => Swal.showLoading(), allowOutsideClick: false, showConfirmButton: false });

    try {
      const payload = {
        username: profile.username,
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        office_id: profile.office_id || null,
        municipality_id: profile.municipality_id || null,
      };
      const res = await api.patch("/user/me", payload);

      // Optional: rotate bearer copy if API returned one
      const newToken = res?.data?.token;
      if (newToken) setAuthToken(newToken);

      Swal.close();
      Swal.fire({ icon: "success", title: "Saved", timer: 1200, showConfirmButton: false });
    } catch (err) {
      Swal.close();
      Swal.fire("Save failed", err?.response?.data?.error || err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (!canChangePwd) return;

    setChangingPwd(true);
    Swal.fire({ title: "Updating password…", didOpen: () => Swal.showLoading(), allowOutsideClick: false, showConfirmButton: false });

    try {
      await api.post("/user/me/password", {
        current_password: pwdForm.current_password,
        new_password: pwdForm.new_password,
      });
      Swal.close();
      Swal.fire({ icon: "success", title: "Password updated", timer: 1200, showConfirmButton: false });
      setPwdForm({ current_password: "", new_password: "", confirm_password: "" });
    } catch (err) {
      Swal.close();
      Swal.fire("Failed", err?.response?.data?.error || err.message, "error");
    } finally {
      setChangingPwd(false);
    }
  };

  if (loading) {
    return (
      <div className="container-lg py-4">
        <p className="text-muted">Loading settings…</p>
      </div>
    );
  }

  // Avatar initials
  const initials = (profile.first_name?.[0] || "").toUpperCase() + (profile.last_name?.[0] || "").toUpperCase();

  return (
    <div className="container-lg py-4" style={{ maxWidth: 900 }}>
      <h3 className="mb-3">Settings</h3>

      {/* Account Card */}
      <div className="card mb-4">
        <div className="card-header d-flex align-items-center gap-3">
          <div
            style={{
              width: 40, height: 40, borderRadius: 12,
              display: "grid", placeItems: "center",
              background: "#f1f3f5", fontWeight: 600
            }}
            aria-hidden
          >
            {initials || "👤"}
          </div>
          <span className="fw-semibold">Account</span>
        </div>

        <form className="card-body" onSubmit={saveProfile} noValidate>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Username</label>
              <input
                name="username"
                value={profile.username}
                onChange={onProfileChange}
                className={`form-control ${profileErrors.username ? "is-invalid" : ""}`}
                placeholder="e.g. juan.delacruz"
              />
              {profileErrors.username && <div className="invalid-feedback d-block">{profileErrors.username}</div>}
            </div>
            <div className="col-md-6">
              <label className="form-label">Email</label>
              <input
                type="email"
                name="email"
                value={profile.email}
                onChange={onProfileChange}
                className={`form-control ${profileErrors.email ? "is-invalid" : ""}`}
                placeholder="e.g. juan@city.gov.ph"
              />
              {profileErrors.email && <div className="invalid-feedback d-block">{profileErrors.email}</div>}
            </div>

            <div className="col-md-6">
              <label className="form-label">First name</label>
              <input
                name="first_name"
                value={profile.first_name}
                onChange={onProfileChange}
                className={`form-control ${profileErrors.first_name ? "is-invalid" : ""}`}
              />
              {profileErrors.first_name && <div className="invalid-feedback d-block">{profileErrors.first_name}</div>}
            </div>
            <div className="col-md-6">
              <label className="form-label">Last name</label>
              <input
                name="last_name"
                value={profile.last_name}
                onChange={onProfileChange}
                className={`form-control ${profileErrors.last_name ? "is-invalid" : ""}`}
              />
              {profileErrors.last_name && <div className="invalid-feedback d-block">{profileErrors.last_name}</div>}
            </div>

            <div className="col-md-6">
              <label className="form-label">Office ID (optional)</label>
              <input
                name="office_id"
                value={profile.office_id ?? ""}
                onChange={onProfileChange}
                className="form-control"
                placeholder="e.g. 5555"
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Municipality ID (optional)</label>
              <input
                name="municipality_id"
                value={profile.municipality_id ?? ""}
                onChange={onProfileChange}
                className="form-control"
                placeholder="e.g. 56"
              />
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2 mt-4">
            <button type="submit" className="btn btn-primary" disabled={!canSaveProfile}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>

      {/* Password Card */}
      <div className="card">
        <div className="card-header d-flex align-items-center gap-3">
          <div
            style={{
              width: 40, height: 40, borderRadius: 12,
              display: "grid", placeItems: "center",
              background: "#f1f3f5", fontWeight: 600
            }}
            aria-hidden
          >
            🔑
          </div>
          <span className="fw-semibold">Change password</span>
        </div>

        <form className="card-body" onSubmit={changePassword} noValidate>
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Current password</label>
              <input
                type="password"
                name="current_password"
                value={pwdForm.current_password}
                onChange={onPwdChange}
                className={`form-control ${pwdErrors.current_password ? "is-invalid" : ""}`}
              />
              {pwdErrors.current_password && <div className="invalid-feedback d-block">{pwdErrors.current_password}</div>}
            </div>
            <div className="col-md-4">
              <label className="form-label">New password</label>
              <input
                type="password"
                name="new_password"
                value={pwdForm.new_password}
                onChange={onPwdChange}
                className={`form-control ${pwdErrors.new_password ? "is-invalid" : ""}`}
              />
              {pwdErrors.new_password && <div className="invalid-feedback d-block">{pwdErrors.new_password}</div>}
            </div>
            <div className="col-md-4">
              <label className="form-label">Confirm new password</label>
              <input
                type="password"
                name="confirm_password"
                value={pwdForm.confirm_password}
                onChange={onPwdChange}
                className={`form-control ${pwdErrors.confirm_password ? "is-invalid" : ""}`}
              />
              {pwdErrors.confirm_password && <div className="invalid-feedback d-block">{pwdErrors.confirm_password}</div>}
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2 mt-4">
            <button type="submit" className="btn btn-outline-primary" disabled={!canChangePwd}>
              {changingPwd ? "Updating…" : "Update password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}