// frontend/src/lib/geoserver.js
// GeoServer base (proxy) — define GS before it's used
// src/lib/geoserver.js
const GS_BASE  = (import.meta.env.VITE_GS_BASE || "/gs").replace(/\/+$/, "");
const WS       = (import.meta.env.VITE_GS_WS || "gis").replace(/^\/+/, "");
const LAYER    = (import.meta.env.VITE_GS_LAYER || "ibaan").replace(/^\/+/, "");

export const DEFAULT_LAYER = `${WS}:${LAYER}`;
export const WFS_BASE = `${GS_BASE}/wfs`;   // ✅ global endpoint
export const WMS_BASE = `${GS_BASE}/wms`;   // ✅ global endpoint

export const makeWfsUrl = (extra = {}) =>
  `${WFS_BASE}?${new URLSearchParams({
    service: "WFS",
    version: "2.0.0",
    request: "GetFeature",
    typeNames: DEFAULT_LAYER,
    outputFormat: "application/json",
    ...extra,
  })}`;
