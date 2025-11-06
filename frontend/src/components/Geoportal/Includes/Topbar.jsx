// src/components/Geoportal/Includes/Topbar.jsx
import React from "react";

export default function Topbar({
  onClear,
  sidebarOpen,
  onToggleSidebar,
  onManageLayers,
  onPrint,
  onOpenFAQ,           // ✅ NEW
}) {
  return (
    <header style={S.topbar}>
      <button
        style={S.side}
        onClick={onToggleSidebar}
        title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
      >
        {sidebarOpen ? "⟨" : "⟩"}
      </button>
      <div style={S.brand}>🌍 GeoPortal</div>
      <div style={{ flex: 1 }} />

      <button style={S.btnGhost} onClick={onManageLayers}>Manage Selected Layers</button>
      <button style={S.btnGhost} onClick={onPrint}>Print Map</button>

    </header>
  );
}

const S = {
  topbar: {
    height: 48, display: "flex", alignItems: "center",
    padding: "0 12px",
    background: "linear-gradient(180deg, #0e1326, #0b1020)",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
    color: "#fff", gap: 8,
  },
  side: {
    background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.2)",
    color: "#e8ecf7", borderRadius: 8, padding: "6px 10px", cursor: "pointer",
  },
  brand: { fontWeight: 600, fontSize: 15 },
  btn: {
    background: "#4f8cff", border: "none", borderRadius: 8,
    padding: "6px 12px", color: "#06122e", cursor: "pointer", fontWeight: 800,
  },
  btnGhost: {
    background: "transparent",
    border: "1px solid rgba(255,255,255,.22)",
    color: "#e8ecf7",
    borderRadius: 8,
    padding: "6px 12px",
    cursor: "pointer",
  },
};
