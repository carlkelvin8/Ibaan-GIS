// frontend/src/App.jsx
import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

// Auth
import LoginPage from "./components/Login/Login";
import SignupPage from "./components/Signup/Signup";
import Logout from "./components/Auth/Logout.jsx";

// Shell
import Layout from "./components/Layout/Layout";

// Pages...
import Dashboard from "./components/Admin/Dashboard.jsx";
import IbaanDashboard from "./components/Ibaan/Dashboard.jsx";
import AdminDashboard from "./components/Admin/Dashboard.jsx";
import Parcel from "./components/Parcel/Parcel";
import Ibaan from "./components/Ibaan/Ibaan";
import Alameda from "./components/Alameda/Alameda";
import LandParcel from "./components/LandParcel/LandParcel";
import LandParcelList from "./components/LandParcelList/LandParcelList";
import Building from "./components/Building/Building";
import BuildingList from "./components/BuildingList/BuildingList";
import TaxForm from "./components/TaxForm/TaxForm";
import TaxList from "./components/TaxList/TaxList";
import SurveyReturns from "./SurveyReturns/SurveyReturns.jsx";
import Geoportal from "./components/Geoportal/Geoportal";
import GeoportalLogin from "./components/Geoportal/Login/Login.jsx";

import Logs from "./components/Logs/logs.jsx";
import TaxpayerDashboard from "./components/Taxpayer/TaxpayerDashboard.jsx";
import Settings from "./components/Settings/Settings.jsx";

import ForgotPassword from "./components/Password/ForgotPassword.jsx";
import ResetPassword from "./components/Password/ResetPassword.jsx";

// Session
import useSession from "./hooks/useSession";

function ProtectedRoute({ children }) {
  const { loading, user } = useSession();
  const location = useLocation();
  if (loading) return <div style={{ padding: 24 }}>Checking session…</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (user.status && user.status !== "active") {
    return <Navigate to="/login" replace state={{ reason: "inactive", from: location }} />;
  }
  return children;
}

function AdminRoute({ children }) {
  const { loading, user } = useSession();
  const location = useLocation();
  if (loading) return <div style={{ padding: 24 }}>Checking session…</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  const roleName = String(user.role || "").toUpperCase();
  return roleName === "ADMIN" ? children : <Navigate to="/dashboard" replace />;
}

function PublicOnlyRoute({ children }) {
  const { loading, user } = useSession();
  if (loading) return <div style={{ padding: 24 }}>Checking session…</div>;
  return user ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
      <Route path="/signup" element={<PublicOnlyRoute><SignupPage /></PublicOnlyRoute>} />
      <Route path="/logout" element={<Logout />} />
      <Route path="/geoportal/login" element={<GeoportalLogin />} />

<Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPassword /></PublicOnlyRoute>} />
<Route path="/reset-password" element={<PublicOnlyRoute><ResetPassword /></PublicOnlyRoute>} />

      {/* Protected shell */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
            
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="ibaan_dashboard" element={<IbaanDashboard />} />
        <Route path="admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="taxpayer" element={<TaxpayerDashboard />} />
        <Route path="parcel" element={<Parcel />} />
        <Route path="ibaan" element={<Ibaan />} />
        <Route path="alameda" element={<Alameda />} />
        <Route path="landparcel" element={<LandParcel />} />
        <Route path="landparcellist" element={<LandParcelList />} />
        <Route path="building" element={<Building />} />
        <Route path="buildinglist" element={<BuildingList />} />
        <Route path="taxform" element={<TaxForm />} />
        <Route path="taxlist" element={<TaxList />} />
        <Route path="logs" element={<Logs />} />
        <Route path="surveyreturns" element={<SurveyReturns />} />
        <Route path="geoportal" element={<Geoportal />} />
        <Route path="map" element={<MapPage />} />
        <Route path="map/:parcelId" element={<MapPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
        <Route path="settings" element={<Settings />} />

      </Route>

      {/* Public catch-all → login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}