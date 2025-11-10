import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { MapContainer, TileLayer, GeoJSON, LayersControl, WMSTileLayer, useMap } from "react-leaflet";
import { useParams, useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Vite asset fix
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

/* ---------------- GeoServer (use backend proxy `/gs` or set VITE_GS_BASE) ---------------- */
const GS_BASE  = (import.meta.env.VITE_GS_BASE || "/gs").replace(/\/+$/, "");
const GS_WS    = import.meta.env.VITE_GS_WS || "gis";
const GS_LAYER = import.meta.env.VITE_GS_LAYER || "ibaan";
const DEFAULT_LAYER = `${GS_WS}:${GS_LAYER}`;
const WMS_BASE = `${GS_BASE}/${GS_WS}/wms`;
const WFS_BASE = `${GS_BASE}/${GS_WS}/wfs`;

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

/* --------------------------------- helpers --------------------------------- */
const toStr   = (v) => (v == null ? "" : String(v).trim());
const up      = (v) => toStr(v).toUpperCase();
// normalize for matching: lower, remove spaces, _, -, .
const normKey = (v) => toStr(v).toLowerCase().replace(/[\s._-]+/g, "");

function getPidFromProps(p = {}) {
  for (const k of ["ParcelId","parcelId","PARCELID","parcelID","parcelid","parcel_id","PARCEL_ID","PID","pid"]) {
    const v = p[k]; if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}
function getLotFromProps(p = {}) {
  for (const k of ["LotNumber","lotNo","lotnumber","LOTNUMBER","lot","lot_no","LOT_NO"]) {
    const v = p[k]; if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}
function getBrgyFromProps(p = {}) {
  for (const k of ["BarangayNa","barangayna","Barangay","barangay"]) {
    const v = p[k]; if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

const EMPTY_FC = { type: "FeatureCollection", features: [] };

/* zoom nudge after map create */
function ZoomAfterRender({ zoom = 18, delayMs = 120 }) {
  const map = useMap();
  useEffect(() => {
    let done = false;
    const finish = () => {
      if (done) return; done = true;
      try {
        const target = Math.min(zoom, map.getMaxZoom?.() ?? zoom);
        const cur = map.getZoom?.() ?? 0;
        if (Math.abs(cur - target) < 0.1) return;
        const center = map.getCenter();
        setTimeout(() => map.flyTo(center, target, { duration: 0.6, easeLinearity: 0.25 }), delayMs);
      } catch {}
    };
    map.once("moveend", finish);
    const t = setTimeout(finish, 1500);
    return () => clearTimeout(t);
  }, [map, zoom, delayMs]);
  return null;
}

export default function MapPage() {
  const { parcelId: routeParcelId } = useParams(); // /map/:parcelId
  const navigate = useNavigate();

  const [fc, setFC] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [mapObj, setMapObj] = useState(null);

  // indexes
  const byParcelRef = useRef(new Map());   // normalized parcelId -> layer
  const byLotRef = useRef(new Map());      // normalized lot -> [layers]
  const byAnyRef = useRef(new Map());      // any string property value -> [layers]

  // selection/highlight
  const selectedLayerRef = useRef(null);
  const highlightRef = useRef(null);

  // styles
  const baseStyle     = useMemo(() => ({ color: "#1e73be", weight: 1.25, fillOpacity: 0.22 }), []);
  const hoverStyle    = useMemo(() => ({ color: "#F2C200", weight: 2,   fillOpacity: 0.28 }), []);
  const selectedStyle = useMemo(() => ({ color: "#F2C200", weight: 3,   fillOpacity: 0.35 }), []);
  const overlayStyle  = useMemo(() => ({ color: "#ff7f0e", weight: 3.5, fillOpacity: 0.28, dashArray: "4,2" }), []);

  const MAX_ZOOM = 19;
  const fallbackCenter = useMemo(() => [13.8, 121.14], []);

  /* ------------------------------ Load WFS data ------------------------------ */
  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();
    (async () => {
      setLoading(true); setErr(null);
      try {
        const params = new URLSearchParams({
          service: "WFS",
          version: "2.0.0",
          request: "GetFeature",
          typeNames: DEFAULT_LAYER,
          srsName: "EPSG:4326",
          outputFormat: "application/json",
          count: "999999",
        });
        const url = `${WFS_BASE}?${params.toString()}`;
        const r = await fetch(url, { headers: { Accept: "application/json" }, signal: ctrl.signal });
        if (!r.ok) throw new Error(`WFS error ${r.status}`);
        const json = await r.json();
        if (!cancelled) setFC(json);
      } catch (e) {
        if (!cancelled) { setErr("Failed to load GeoServer (WFS)"); setFC(EMPTY_FC); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; ctrl.abort(); };
  }, []);

  /* -------------------- panes & persistent highlight layer -------------------- */
  useEffect(() => {
    if (!mapObj) return;
    if (!mapObj.getPane("highlightPane")) {
      const p = mapObj.createPane("highlightPane");
      p.style.zIndex = 650; // above tiles/paths, below popups
    }
    if (!highlightRef.current) {
      highlightRef.current = L.geoJSON(null, {
        style: overlayStyle,
        interactive: false,
        pane: "highlightPane",
      }).addTo(mapObj);
    }
  }, [mapObj, overlayStyle]);

  /* ------------------------ focus + popup + highlight ------------------------ */
  const openPopupAtCenter = useCallback((layer) => {
    if (!layer || !mapObj) return;
    let center = null;
    try {
      const b = layer.getBounds?.();
      center = (b && b.isValid()) ? b.getCenter() : mapObj.getCenter();
    } catch { center = mapObj.getCenter(); }

    const popup = layer.getPopup?.();
    if (popup) {
      try { popup.setLatLng(center); } catch {}
    }
    try { layer.openPopup(center); } catch {
      // last resort: synthesize a click with latlng
      try { layer.fire("click", { latlng: center }); } catch {}
    }
  }, [mapObj]);

  const focusOpenAndHighlight = useCallback((layer, feature) => {
    if (!layer || !mapObj) return;

    // draw highlight
    if (highlightRef.current) {
      highlightRef.current.clearLayers();
      if (feature?.geometry) {
        highlightRef.current.addData(feature);
        try { highlightRef.current.bringToFront(); } catch {}
      }
    }

    // sticky selection style
    const prev = selectedLayerRef.current;
    if (prev && prev !== layer) { try { prev.setStyle(baseStyle); } catch {} }
    selectedLayerRef.current = layer;
    try { layer.setStyle(selectedStyle); } catch {}

    // zoom + open (with retries to beat animation timing)
    const b = layer.getBounds?.();
    if (b && b.isValid()) {
      mapObj.fitBounds(b, { padding: [28, 28], maxZoom: 16, animate: true });
      setTimeout(() => { try { mapObj.flyTo(mapObj.getCenter(), 18, { duration: 0.6, easeLinearity: 0.25 }); } catch {} }, 100);
    }
    setTimeout(() => openPopupAtCenter(layer), 140);
    setTimeout(() => openPopupAtCenter(layer), 450);
  }, [mapObj, baseStyle, selectedStyle, openPopupAtCenter]);

  /* ----------------------------- index each feature ----------------------------- */
  const onEachFeature = (feature, layer) => {
    const p = feature.properties || {};
    const pid  = getPidFromProps(p);
    const lot  = getLotFromProps(p);
    const brgy = getBrgyFromProps(p);

    const kPid = normKey(pid);
    const kLot = normKey(lot);

    if (kPid) byParcelRef.current.set(kPid, layer);
    if (kLot) {
      const arr = byLotRef.current.get(kLot) || [];
      arr.push(layer);
      byLotRef.current.set(kLot, arr);
    }

    // index any string property for ultra-fallback search
    for (const [, v] of Object.entries(p)) {
      const s = toStr(v); if (!s) continue;
      const nk = normKey(s); if (!nk) continue;
      const arr = byAnyRef.current.get(nk) || [];
      if (arr.length === 0 || arr[arr.length - 1] !== layer) arr.push(layer);
      byAnyRef.current.set(nk, arr);
    }

    // hover & click
    layer.on({
      mouseover: () => { if (selectedLayerRef.current !== layer) try { layer.setStyle(hoverStyle); } catch {} },
      mouseout:  () => { try { layer.setStyle(selectedLayerRef.current === layer ? selectedStyle : baseStyle); } catch {} },
      click:     () => {
        if (pid) navigate(`/map/${encodeURIComponent(pid)}`);
        focusOpenAndHighlight(layer, feature);
      },
    });

    // popup content
    layer.bindPopup(
      `<div style="font-size:13px;line-height:1.4;max-width:280px;">
         <div style="border-bottom:1px solid #e0e6ed;padding-bottom:8px;margin-bottom:8px;">
           <strong style="font-size:14px;color:#0b5faa;">Parcel</strong>
         </div>
         ${pid  ? `<div><b>Parcel ID:</b> ${pid}</div>` : ""}
         ${lot  ? `<div><b>Lot No.:</b> ${lot}</div>` : ""}
         ${brgy ? `<div><b>Barangay:</b> ${brgy}</div>` : ""}
         ${p?.Area || p?.area ? `<div><b>Area:</b> ${p.Area ?? p.area}</div>` : ""}
       </div>`,
      { maxWidth: 300 }
    );
  };

  /* ---------------------- open by /map/:parcelId automatically ---------------------- */
  useEffect(() => {
    const raw = toStr(routeParcelId);
    if (!raw) return;
    const key = normKey(raw);

    let tries = 0;
    const max = 120; // up to ~12s
    const iv = setInterval(() => {
      let lyr = byParcelRef.current.get(key);
      if (!lyr) {
        const arr = byAnyRef.current.get(key);
        if (arr && arr.length) lyr = arr[0];
      }
      if (lyr && lyr.feature) {
        focusOpenAndHighlight(lyr, lyr.feature);
        clearInterval(iv);
      } else if (++tries >= max) {
        clearInterval(iv);
      }
    }, 100);

    return () => clearInterval(iv);
  }, [routeParcelId, focusOpenAndHighlight]);

  /* -------- when navigated without parcelId, use localStorage {lotNo, barangay} -------- */
  useEffect(() => {
    if (routeParcelId) return;
    let hint = null;
    try { hint = JSON.parse(localStorage.getItem("mapFocus") || "null"); } catch {}
    if (!hint || !(hint.lotNo || hint.barangay)) return;

    const lotKey = normKey(hint.lotNo || "");
    const brgyKey = up(hint.barangay || "");
    const wantPopup = !!hint.showPopup;

    const tryFocus = () => {
      let layers = lotKey ? byLotRef.current.get(lotKey) : null;
      if (!layers || !layers.length) return false;
      if (brgyKey) {
        const match = layers.find((l) => up(getBrgyFromProps(l.feature?.properties || {})) === brgyKey);
        if (match) layers = [match];
      }
      const lyr = layers[0];
      if (!lyr) return false;
      if (wantPopup) focusOpenAndHighlight(lyr, lyr.feature);
      try { localStorage.removeItem("mapFocus"); } catch {}
      return true;
    };

    let tries = 0;
    const max = 120;
    const iv = setInterval(() => { if (tryFocus() || ++tries >= max) clearInterval(iv); }, 100);
    return () => clearInterval(iv);
  }, [routeParcelId, focusOpenAndHighlight]);

  const showVectors = !!fc?.features?.length;

  return (
    <div style={{ height: "90vh", width: "100%", position: "relative" }}>
      {err && (
        <div style={{position:"absolute",zIndex:9999,right:12,top:12,background:"#fff",padding:"8px 12px",borderRadius:8,boxShadow:"0 4px 12px rgba(0,0,0,.12)",color:"#b00020",fontSize:13}}>
          {err}
        </div>
      )}

      <MapContainer
        center={fallbackCenter}
        zoom={12}
        maxZoom={MAX_ZOOM}
        style={{ height: "100%", width: "100%" }}
        preferCanvas
        updateWhenIdle
        zoomAnimation
        wheelPxPerZoomLevel={160}
        whenCreated={setMapObj}
      >
        <ZoomAfterRender zoom={18} delayMs={140} />

        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="OpenStreetMap">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" maxZoom={MAX_ZOOM}/>
          </LayersControl.BaseLayer>

          {MAPBOX_TOKEN && (
            <>
              <LayersControl.BaseLayer name="Mapbox Streets">
                <TileLayer
                  url={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`}
                  attribution="© Mapbox © OpenStreetMap" maxZoom={MAX_ZOOM} tileSize={512} zoomOffset={-1}
                />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Mapbox Satellite">
                <TileLayer
                  url={`https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/512/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`}
                  attribution="Imagery © Mapbox, © Maxar" maxZoom={MAX_ZOOM} tileSize={512} zoomOffset={-1}
                />
              </LayersControl.BaseLayer>
            </>
          )}

          <LayersControl.Overlay checked name="Tax Lots (WMS)">
            <WMSTileLayer url={WMS_BASE} layers={DEFAULT_LAYER} format="image/png" transparent version="1.1.1" tiled />
          </LayersControl.Overlay>
        </LayersControl>

        {showVectors && (
          <GeoJSON
            data={fc}
            style={baseStyle}
            onEachFeature={onEachFeature}
            bubblingMouseEvents={false}
            smoothFactor={1.2}
          />
        )}
      </MapContainer>

      {loading && (
        <div style={{ position:"absolute", inset:0, display:"grid", placeItems:"center", pointerEvents:"none", fontSize:14 }}>
          Loading GeoServer layers…
        </div>
      )}
    </div>
  );
}