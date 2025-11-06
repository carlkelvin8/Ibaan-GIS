// frontend/src/App.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Auth
import LoginPage from "./components/Login/Login";
import SignupPage from "./components/Signup/Signup";

// Shell
import Layout from "./components/Layout/Layout";

// Dashboards
import Dashboard from "./components/Admin/Dashboard.jsx"; // generic/home (optional)
import IbaanDashboard from "./components/Ibaan/Dashboard.jsx";
import AdminDashboard from "./components/Admin/Dashboard.jsx";

// Feature pages
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
import MapPage from "./components/Map/MapPage";
import TaxpayerDashboard from "./components/Taxpayer/TaxpayerDashboard.jsx";

/* ------------------------------
   Auth helpers
--------------------------------*/
function getToken() {
  const raw =
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    "";
  // allow both "Bearer <jwt>" and "<jwt>"
  return raw.startsWith("Bearer ") ? raw.slice(7) : raw;
}

function getRoleFromToken() {
  try {
    const token = getToken();
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    );
    return json?.role ?? null;
  } catch {
    return null;
  }
}

/* ------------------------------
   Route guards
--------------------------------*/
function ProtectedRoute({ children }) {
  const token = getToken();
  return token && token.trim() !== "" && token !== "undefined"
    ? children
    : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const role = getRoleFromToken();
  return role === "admin" || role === "superadmin"
    ? children
    : <Navigate to="/dashboard" replace />;
}

/* ------------------------------
   App routes
--------------------------------*/
export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/geoportal/login" element={<GeoportalLogin />} />

      {/* Protected shell */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* Generic/Home dashboard */}
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />

        {/* Dedicated dashboards */}
        <Route path="ibaan_dashboard" element={<IbaanDashboard />} />
        <Route path="taytay_dashboard" element={<TaytayDashboard />} />
        <Route
          path="admin/dashboard"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route path="taxpayer" element={<TaxpayerDashboard />} />

        {/* Static/feature pages */}
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

        {/* Web Map Services */}
        <Route path="geoportal" element={<Geoportal />} />

        {/* Deep-link map routes */}
        <Route path="map" element={<MapPage />} />
        <Route path="map/:parcelId" element={<MapPage />} />

        {/* LAST: fallback detail route under shell */}
        <Route path=":parcelId" element={<MapPage />} />
      </Route>

      {/* Catch-all (unauthenticated) */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
