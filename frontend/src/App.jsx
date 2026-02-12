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
import Ibaan from "./components/Ibaan/Ibaan";
import Alameda from "./components/Alameda/Alameda";
import LandParcel from "./components/LandParcel/LandParcel";
import LandParcelList from "./components/LandParcelList/LandParcelList";
import Building from "./components/Building/Building";
import BuildingList from "./components/BuildingList/BuildingList";
import TaxForm from "./components/TaxForm/TaxForm";
import TaxList from "./components/TaxList/TaxList";
import Geoportal from "./components/Geoportal/Geoportal";
import GeoportalLogin from "./components/Geoportal/Login/Login.jsx";
import MapPage from "./components/Map/MapPage";
import ParcelFullDetails from "./components/Map/ParcelFullDetails";
// import Logs from "./components/Logs/logs.jsx";
import AuditLogs from "./components/Admin/AuditLogs.jsx";
import Settings from "./components/Settings/Settings.jsx";
import ComingSoon from "./components/ComingSoon/ComingSoon.jsx";
import MarkdownDocViewer from './components/Docs/MarkdownDocViewer';
import ValidationOverviewDashboard from './components/Admin/ValidationOverviewDashboard';
import SpatialValidationUpload from './components/SpatialValidation/SpatialValidationUpload';

import ForgotPassword from "./components/Password/ForgotPassword.jsx";
import ResetPassword from "./components/Password/ResetPassword.jsx";

// Session
import useSession from "./hooks/useSession";
import Swal from "sweetalert2";

function SessionLoading() {
  React.useEffect(() => {
    Swal.fire({
      title: "Checking session...",
      text: "Please wait while we verify your credentials.",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });
    return () => {
      Swal.close();
    };
  }, []);
  return null;
}

import InteractiveMapDemo from './components/Demo/InteractiveMapDemo';

function ProtectedRoute({ children }) {
  const { loading, user } = useSession();
  const location = useLocation();
  if (loading) return <SessionLoading />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (user.status && user.status !== "active") {
    return <Navigate to="/login" replace state={{ reason: "inactive", from: location }} />;
  }
  return children;
}

function AdminRoute({ children }) {
  const { loading, user } = useSession();
  const location = useLocation();
  if (loading) return <SessionLoading />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  const roleName = String(user.role || "").toUpperCase();
  return roleName === "ADMIN" ? children : <Navigate to="/dashboard" replace />;
}

function PublicOnlyRoute({ children }) {
  const { loading, user } = useSession();
  if (loading) return <SessionLoading />;
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
        {/* <Route path="admin/dashboard" element={<AdminRoute><Dashboard /></AdminRoute>} /> */}
        <Route path="ibaan" element={<Ibaan />} />
        <Route path="alameda" element={<Alameda />} />
        <Route path="landparcel" element={<LandParcel />} />
        <Route path="landparcellist" element={<LandParcelList />} />
        <Route path="building" element={<Building />} />
        <Route path="buildinglist" element={<BuildingList />} />
        <Route path="taxform" element={<TaxForm />} />
        <Route path="taxlist" element={<TaxList />} />
        {/* <Route path="logs" element={<Logs />} /> */}
        <Route path="admin/logs" element={<AdminRoute><AuditLogs /></AdminRoute>} />
        <Route path="admin/spatial-validation" element={<AdminRoute><ValidationOverviewDashboard /></AdminRoute>} />
        <Route path="admin/spatial-validation-upload" element={<AdminRoute><SpatialValidationUpload /></AdminRoute>} />
        <Route path="admin/demo-2-map" element={<AdminRoute><InteractiveMapDemo /></AdminRoute>} />
        <Route path="admin/docs/:docId" element={<AdminRoute><MarkdownDocViewer /></AdminRoute>} />

        <Route path="geoportal" element={<Geoportal />} />
        <Route path="map" element={<MapPage />} />
        <Route path="map/:parcelId" element={<MapPage />} />
        <Route path="parcel-details/:parcelId" element={<ParcelFullDetails />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
        <Route path="settings" element={<Settings />} />
        <Route path="land-cover" element={<ComingSoon title="Land Cover Map" />} />
        <Route path="water-bodies" element={<ComingSoon title="Water Bodies Map" />} />
        
      </Route>

      {/* Public catch-all → login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}