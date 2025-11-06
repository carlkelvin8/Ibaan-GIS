// Expect these in frontend/.env (no inline comments):
// VITE_GS_BASE=http://geoserver-custom-production.up.railway.app/geoserver   (or /gs if using proxy)
// VITE_GS_WS=gis
// VITE_GS_LAYER=ibaan

// GeoServer base (proxy) — define GS before it's used
const GS = (import.meta.env.VITE_GS_BASE || "/gs").replace(/\/+$/, "");
const WS = (import.meta.env.VITE_GS_WS || "gis").replace(/^\/+/, "");
const LAYER = (import.meta.env.VITE_GS_LAYER || "ibaan").replace(/^\/+/, "");

export const DEFAULT_LAYER = `${WS}:${LAYER}`;
export const WFS_BASE = `${GS}/wfs`;   // global endpoint
export const WMS_BASE = `${GS}/wms`;

// src/lib/geoserver.js (or wherever you build URLs)
export const makeWfsUrl = (extra = {}) => {
  const params = new URLSearchParams({
    service: "WFS",
    version: "2.0.0",
    request: "GetFeature",
    typeNames: DEFAULT_LAYER,               // "gis:ibaan"
    srsName: "EPSG:4326",
    outputFormat: "application/json; subtype=geojson",
    count: "100000",                          // try small first; increase later
    ...extra,
  });
  return `${WFS_BASE}?${params.toString()}`;
};
