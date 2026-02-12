// src/pages/Settings.jsx
import React, { useEffect, useState, useMemo } from "react";
import api, { setAuthToken } from "../../lib/axios.js";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import "../admin/Dashboard.css"; // Reuse dashboard styles for consistent aesthetic
import Cropper from 'react-easy-crop';
import getCroppedImg from '../../utils/cropImage';
import { Modal, Button } from 'react-bootstrap';

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const USERNAME_RE = /^[A-Za-z0-9_.-]{3,32}$/;

export default function Settings() {
  const fileInputRef = React.useRef(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);
  
  // Cropper state
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [showCropper, setShowCropper] = useState(false);

  const [profile, setProfile] = useState({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    office_id: "",
    municipality_id: "",
    profile_picture: null,
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
          profile_picture: u.profile_picture ?? null,
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
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      Swal.fire("Error", "Please upload an image file", "error");
      return;
    }

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setImageSrc(reader.result);
      setShowCropper(true);
      setZoom(1);
      setCrop({ x: 0, y: 0 });
    });
    reader.readAsDataURL(file);
    // Reset input so same file can be selected again if needed
    e.target.value = null;
  };

  const onCropComplete = (croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const uploadCroppedImage = async () => {
    try {
      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      
      const formData = new FormData();
      formData.append("avatar", croppedImageBlob, "avatar.jpg");

      setShowCropper(false);
      
      Swal.fire({ title: "Uploading…", didOpen: () => Swal.showLoading(), allowOutsideClick: false, showConfirmButton: false });
      const res = await api.post("/user/me/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      const newPath = res.data?.data?.profile_picture;
      setProfile(p => ({ ...p, profile_picture: newPath }));
      
      // Notify other components (like Header) to refetch user data
      window.dispatchEvent(new Event("user-updated"));

      Swal.close();
      Swal.fire({ icon: "success", title: "Avatar updated", timer: 1200, showConfirmButton: false });
    } catch (err) {
      console.error(err);
      Swal.close();
      Swal.fire("Upload failed", err?.response?.data?.error || "Failed to upload avatar", "error");
    }
  };

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
      <div className="dashboard-container">
        <p className="text-muted">Loading settings…</p>
      </div>
    );
  }

  // Avatar initials
  const initials = (profile.first_name?.[0] || "").toUpperCase() + (profile.last_name?.[0] || "").toUpperCase();

  return (
    <div className="dashboard-container" style={{ maxWidth: 1000, margin: "0 auto", backgroundColor: "transparent" }}>
      <div className="dashboard-header" style={{ justifyContent: "center" }}>
        <h1 className="dashboard-title">Settings</h1>
      </div>

      {/* Account Card */}
      <div className="chart-card" style={{ marginBottom: 32, overflow: "hidden" }}>
        
        {/* Avatar Section */}
        <div style={{ 
          padding: "32px", 
          display: "flex", 
          flexDirection: "column", 
          alignItems: "center",
          borderBottom: "1px solid #f3f4f6",
          background: "linear-gradient(to bottom, #f9fafb, #fff)"
        }}>
          <div style={{ position: "relative" }}>
            <div style={{
              width: 120, height: 120, borderRadius: "50%",
              background: "var(--col-blue-bg)", color: "var(--col-blue-text)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 48, fontWeight: 700,
              border: "4px solid #fff",
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
              overflow: "hidden"
            }}>
              {profile.profile_picture ? (
                <img 
                  src={`${api.defaults.baseURL}${profile.profile_picture}`} 
                  alt="Profile" 
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => { e.target.style.display = 'none'; }} 
                />
              ) : (
                initials || "👤"
              )}
            </div>
            <button
              type="button"
              style={{
                position: "absolute", bottom: 0, right: 0,
                width: 36, height: 36, borderRadius: "50%",
                background: "#fff", border: "1px solid #e5e7eb",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                transition: "all 0.2s"
              }}
              onClick={() => fileInputRef.current?.click()}
              title="Change photo"
            >
              <i className="bi bi-camera" style={{ fontSize: 16, color: "#4b5563" }}></i>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: "none" }} 
              accept="image/*" 
              onChange={handleFileChange}
            />
          </div>
          <div style={{ marginTop: 16, textAlign: "center" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "#111827" }}>
              {profile.first_name} {profile.last_name}
            </h2>
            <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 14 }}>@{profile.username}</p>
          </div>
        </div>

        <form onSubmit={saveProfile} noValidate style={{ padding: "24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px", marginBottom: "24px" }}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                name="username"
                value={profile.username}
                onChange={onProfileChange}
                className={`form-control ${profileErrors.username ? "is-invalid" : ""}`}
                placeholder="e.g. juan.delacruz"
              />
              {profileErrors.username && <div style={{ color: "var(--col-red-text)", fontSize: "0.875rem", marginTop: 4 }}>{profileErrors.username}</div>}
            </div>
            
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                name="email"
                value={profile.email}
                onChange={onProfileChange}
                className={`form-control ${profileErrors.email ? "is-invalid" : ""}`}
                placeholder="e.g. juan@city.gov.ph"
              />
              {profileErrors.email && <div style={{ color: "var(--col-red-text)", fontSize: "0.875rem", marginTop: 4 }}>{profileErrors.email}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">First name</label>
              <input
                name="first_name"
                value={profile.first_name}
                onChange={onProfileChange}
                className={`form-control ${profileErrors.first_name ? "is-invalid" : ""}`}
              />
              {profileErrors.first_name && <div style={{ color: "var(--col-red-text)", fontSize: "0.875rem", marginTop: 4 }}>{profileErrors.first_name}</div>}
            </div>
            
            <div className="form-group">
              <label className="form-label">Last name</label>
              <input
                name="last_name"
                value={profile.last_name}
                onChange={onProfileChange}
                className={`form-control ${profileErrors.last_name ? "is-invalid" : ""}`}
              />
              {profileErrors.last_name && <div style={{ color: "var(--col-red-text)", fontSize: "0.875rem", marginTop: 4 }}>{profileErrors.last_name}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Office ID <span style={{ color: "var(--dash-text-muted)", fontWeight: 400 }}>(optional)</span></label>
              <input
                name="office_id"
                value={profile.office_id ?? ""}
                onChange={onProfileChange}
                className="form-control"
                placeholder="e.g. 5555"
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Municipality ID <span style={{ color: "var(--dash-text-muted)", fontWeight: 400 }}>(optional)</span></label>
              <input
                name="municipality_id"
                value={profile.municipality_id ?? ""}
                onChange={onProfileChange}
                className="form-control"
                placeholder="e.g. 56"
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" className="btn btn-primary" disabled={!canSaveProfile}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>

      {/* Password Card */}
      <div className="chart-card">
        <div className="chart-header">
          <div className="section-title" style={{ marginBottom: 0 }}>
            <div
              style={{
                width: 32, height: 32, borderRadius: 8,
                display: "grid", placeItems: "center",
                background: "var(--col-amber-bg)", color: "var(--col-amber-text)",
                fontSize: 14, fontWeight: 600
              }}
              aria-hidden
            >
              <i className="bi bi-key"></i>
            </div>
            <span>Change Password</span>
          </div>
        </div>

        <form onSubmit={changePassword} noValidate>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "24px", marginBottom: "24px" }}>
            <div className="form-group">
              <label className="form-label">Current password</label>
              <input
                type="password"
                name="current_password"
                value={pwdForm.current_password}
                onChange={onPwdChange}
                className={`form-control ${pwdErrors.current_password ? "is-invalid" : ""}`}
              />
              {pwdErrors.current_password && <div style={{ color: "var(--col-red-text)", fontSize: "0.875rem", marginTop: 4 }}>{pwdErrors.current_password}</div>}
            </div>
            
            <div className="form-group">
              <label className="form-label">New password</label>
              <input
                type="password"
                name="new_password"
                value={pwdForm.new_password}
                onChange={onPwdChange}
                className={`form-control ${pwdErrors.new_password ? "is-invalid" : ""}`}
              />
              {pwdErrors.new_password && <div style={{ color: "var(--col-red-text)", fontSize: "0.875rem", marginTop: 4 }}>{pwdErrors.new_password}</div>}
            </div>
            
            <div className="form-group">
              <label className="form-label">Confirm new password</label>
              <input
                type="password"
                name="confirm_password"
                value={pwdForm.confirm_password}
                onChange={onPwdChange}
                className={`form-control ${pwdErrors.confirm_password ? "is-invalid" : ""}`}
              />
              {pwdErrors.confirm_password && <div style={{ color: "var(--col-red-text)", fontSize: "0.875rem", marginTop: 4 }}>{pwdErrors.confirm_password}</div>}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" className="btn btn-secondary" disabled={!canChangePwd}>
              {changingPwd ? "Updating…" : "Update Password"}
            </button>
          </div>
        </form>
      </div>

      <Modal show={showCropper} onHide={() => setShowCropper(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Crop Profile Picture</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div style={{ position: 'relative', width: '100%', height: 400 }}>
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          </div>
          <div style={{ padding: '16px 0 0' }}>
            <label>Zoom</label>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(e.target.value)}
              className="form-range"
            />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCropper(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={uploadCroppedImage}>
            Save & Upload
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}