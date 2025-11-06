// src/components/Geoportal/Includes/Footer.jsx
import React from "react";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer style={S.wrap} className="gp-footer">
      {/* Main */}
      <div style={S.container}>
        <div style={S.grid}>
          {/* Left: Disclaimer */}
          <section style={S.card}>
            <header style={S.cardHead}>
              <span style={S.dot} aria-hidden />
              <h2 style={S.heading}>Disclaimer Note for Map Use</h2>
            </header>
            <p style={S.text}>
              This map is intended solely for data visualization and reference purposes.
              It does not constitute legal documentation, engineering validation, or official endorsement by any government agency. Boundaries, alignments, and features shown are subject to verification and may not reflect the most current or authoritative datasets. Users are advised to consult relevant agencies for official records and project approvals.
            </p>
          </section>

          {/* Right: About / Tagline */}
          <section style={{ ...S.card, ...S.about }}>
            <header style={S.cardHead}>
              <span style={{ ...S.dot, background: "#7EE787" }} aria-hidden />
              <h2 style={S.heading}>About this Geoportal</h2>
            </header>

            <blockquote style={S.quote}>
              “A centralized hub for managing cadastral data, tax forms, survey returns,
              and other geospatial data layers to provide accurate land and property information.”
            </blockquote>

            <div style={S.pills}>
              <span style={S.pill}>Cadastral</span>
              <span style={S.pill}>Tax Forms</span>
              <span style={S.pill}>Survey Returns</span>
              <span style={S.pill}>Geospatial Layers</span>
            </div>
          </section>
        </div>
      </div>

      {/* Divider */}
      <div style={S.divider} />

      {/* Powered by */}
      <div style={S.bottomBar}>
        <div style={S.bottomInner}>
          <div style={S.poweredBy}>
            <span style={S.badge} aria-hidden>⚡</span>
            <strong style={S.poweredText}>Powered by:</strong>
            <span style={S.org}>SOMAJO Enterprise</span>
            <span style={S.sep}>•</span>
            <span style={S.org}>JR Fernandez Surveying &amp; Engineering Services</span>
          </div>

          <div style={S.meta}>
            <span>&copy; {year} GeoPortal</span>
            <span style={S.dotSep} />
            <a style={S.link} href="#" onClick={(e) => e.preventDefault()}>Terms</a>
            <span style={S.dotSep} />
            <a style={S.link} href="#" onClick={(e) => e.preventDefault()}>Privacy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* Styles */
const S = {
  wrap: {
    color: "#E8ECF5",
    background:
      "linear-gradient(180deg, rgba(6,10,24,0.94), rgba(5,9,22,0.98))",
    borderTop: "1px solid rgba(255,255,255,0.12)",
    boxShadow: "0 -6px 30px rgba(0,0,0,0.35)",
    backdropFilter: "blur(6px) saturate(130%)",
  },

  container: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "18px 20px 8px",
  },

  grid: {
    display: "grid",
    gap: 16,
    gridTemplateColumns: "1fr",
  },

  card: {
    border: "1px solid rgba(255,255,255,0.10)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.02))",
    borderRadius: 14,
    padding: 14,
  },

  about: {
    // slightly different look
    background:
      "linear-gradient(180deg, rgba(80,120,255,0.06), rgba(255,255,255,0.02))",
  },

  cardHead: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    background: "#79A8FF",
    boxShadow: "0 0 0 2px rgba(121,168,255,0.25)",
    flex: "0 0 auto",
  },

  heading: {
    margin: 0,
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: ".2px",
    color: "#CFE1FF",
  },

  text: {
    margin: 0,
    fontSize: 13,
    lineHeight: 1.65,
    color: "#D6E2FF",
  },

  quote: {
    margin: "4px 0 10px",
    padding: "8px 10px",
    fontSize: 13,
    color: "#E0EAFF",
    lineHeight: 1.6,
    borderLeft: "3px solid rgba(121,168,255,0.45)",
    background: "rgba(255,255,255,0.03)",
    borderRadius: 10,
  },

  pills: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },

  pill: {
    fontSize: 12,
    color: "#B9C8E8",
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.05)",
    padding: "4px 8px",
    borderRadius: 999,
  },

  divider: {
    height: 1,
    background:
      "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.18), rgba(255,255,255,0))",
    marginTop: 10,
  },

  bottomBar: {
    padding: "10px 20px 16px",
  },

  bottomInner: {
    maxWidth: 1200,
    margin: "0 auto",
    display: "flex",
    gap: 12,
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },

  poweredBy: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },

  badge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    display: "grid",
    placeItems: "center",
    background: "rgba(121,168,255,0.16)",
    border: "1px solid rgba(121,168,255,0.35)",
  },

  poweredText: {
    color: "#CFE1FF",
    fontWeight: 700,
    letterSpacing: ".2px",
  },

  org: {
    color: "#E8ECF5",
    fontWeight: 600,
  },

  sep: {
    opacity: 0.55,
    margin: "0 4px",
  },

  meta: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    color: "#A8B7D6",
    fontSize: 12,
  },

  dotSep: {
    width: 4,
    height: 4,
    borderRadius: 999,
    background: "rgba(255,255,255,0.35)",
  },

  link: {
    color: "#CFE1FF",
    textDecoration: "none",
    borderBottom: "1px dashed rgba(207,225,255,.5)",
    paddingBottom: 1,
    cursor: "pointer",
  },
};

/* Responsive tweak: side-by-side on wide screens */
if (typeof window !== "undefined") {
  const mq = window.matchMedia("(min-width: 900px)");
  const apply = () => {
    S.grid.gridTemplateColumns = mq.matches ? "1fr 1fr" : "1fr";
  };
  apply();
  mq.addEventListener?.("change", apply);
}

/* Print: keep map clean (hide footer) */
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.innerHTML = `
    @media print {
      .gp-footer { display: none !important; }
    }
  `;
  document.head.appendChild(style);
}
