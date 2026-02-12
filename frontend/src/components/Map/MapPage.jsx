// frontend/src/components/Map/MapPage.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { MapContainer, TileLayer, GeoJSON, LayersControl, useMap } from "react-leaflet";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import L from "leaflet";
import api from "../../lib/axios.js";
import "leaflet/dist/leaflet.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

/* ------------------------------ Config / Helpers ------------------------------ */
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const toStr = (v) => (v == null ? "" : String(v).trim());
const normKey = (v) => toStr(v).toLowerCase();

/* ------------------------------ DATA_SPECS (local geojson files) ------------------------------ */
const DATA_SPECS = [
  { key: "road",         path: "/geoData/road/ibaan_road_wgs84.geojson", color: "#ff4444", weight: 3, fillOpacity: 0 },
  { key: "river",        path: "/geoData/river/Ibaan_river_WGS84.geojson", color: "#0077ff", weight: 3, fillOpacity: 0 },
  { key: "bf",           path: "/geoData/BF/Ibaan_BF_WGS84.geojson", color: "#00bb00", weight: 3, fillColor: "#00ff00", fillOpacity: 0.2 },
  { key: "municipality", path: "/geoData/muni/Ibaan_muni.geojson", color: "#555", weight: 2, fillColor: "#bbbbbb", fillOpacity: 0.0 },
];

function isReady(g) {
  if (!g || typeof g !== "object") return false;
  if (g.type === "FeatureCollection") return Array.isArray(g.features) && g.features.length > 0;
  return g.type === "Feature" && !!g.geometry;
}

/* -------------------- Hover + popup binder for static layers -------------------- */
function makeOnEach(layerLabel) {
  return (feature, layer) => {
    const props = feature.properties || {};
    const original = { ...layer.options };

    // Common styling interaction
    layer.on({
      mouseover: () => {
        try { layer.setStyle({ ...original, color: "#F2C200", weight: (original.weight || 2) + 1, fillOpacity: (original.fillOpacity || 0) + 0.1 }); } catch {}
      },
      mouseout: () => {
        try { layer.setStyle(original); } catch {}
      },
    });

    // Custom content generation based on layer type
    let title = layerLabel.toUpperCase();
    let content = "";

    if (layerLabel === "municipality") {
      title = `MUNICIPALITY OF ${props.NAME_2 || "IBAAN"}`;
      content = `
        <div style="display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:13px;">
          <div style="color:#666;">Province:</div><div style="font-weight:600;">${props.NAME_1 || "Batangas"}</div>
          <div style="color:#666;">Region:</div><div style="font-weight:600;">${props.Region || "IV-A"}</div>
          <div style="color:#666;">Classification:</div><div>${props.ENGTYPE_2 || "Municipality"}</div>
          <div style="color:#666;">Zip Code:</div><div>4230</div>
        </div>
      `;
    } else if (layerLabel === "road") {
      title = props.name || props.ref || "ROAD SEGMENT";
      content = `
        <div style="display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:13px;">
          <div style="color:#666;">Type:</div><div>${props.highway || "Unknown"}</div>
          ${props.surface ? `<div style="color:#666;">Surface:</div><div>${props.surface}</div>` : ""}
          ${props.lanes ? `<div style="color:#666;">Lanes:</div><div>${props.lanes}</div>` : ""}
          ${props.maxspeed ? `<div style="color:#666;">Speed Limit:</div><div>${props.maxspeed} km/h</div>` : ""}
        </div>
      `;
    } else if (layerLabel === "river") {
      title = props.RIVER_NAME || "WATER BODY";
      content = `<div style="font-size:13px;color:#666;">River/Stream segment</div>`;
    } else if (layerLabel === "bf") {
      title = props.name || props.amenity || "BUILDING";
      content = `
        <div style="display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:13px;">
          ${props.amenity ? `<div style="color:#666;">Amenity:</div><div>${props.amenity.replace('_', ' ')}</div>` : ""}
          ${props.building ? `<div style="color:#666;">Type:</div><div>${props.building}</div>` : ""}
        </div>
      `;
    } else {
      // Fallback for generic layers
      content = Object.entries(props)
        .slice(0, 8)
        .filter(([k, v]) => v != null && k !== "id")
        .map(([k,v]) => `<div><b style="color:#555;">${k}:</b> ${v}</div>`)
        .join("");
    }

    const html = `
      <div style="min-width:200px;font-family:'Inter',sans-serif;">
        <div style="border-bottom:2px solid #0b5faa;padding-bottom:8px;margin-bottom:8px;">
          <strong style="font-size:14px;color:#0b5faa;">${title}</strong>
        </div>
        ${content}
      </div>
    `;

    layer.bindPopup(html, { maxWidth: 320, className: "custom-popup" });
  };
}

/* -------------------- Fit bounds on combined datasets (once) -------------------- */
function FitBoundsOnData({ datasets }) {
  const map = useMap();
  const doneRef = useRef(false);

  useEffect(() => {
    if (doneRef.current) return;
    if (!map) return;
    // Only proceed when at least one dataset has data
    const any = datasets.some(d => isReady(d.data));
    if (!any) return;
    const group = L.featureGroup();
    datasets.forEach(d => {
      if (isReady(d.data)) {
        group.addLayer(L.geoJSON(d.data));
      }
    });
    const b = group.getBounds();
    if (b.isValid()) {
      map.fitBounds(b, { padding: [30, 30], maxZoom: 15 });
      doneRef.current = true;
    }
  }, [datasets, map]);
  return null;
}

/* -------------------- General "zoom after render" helper -------------------- */
function ZoomAfterRender({ zoom = 18, delayMs = 140 }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    let done = false;
    const finish = () => {
      if (done) return; done = true;
      try {
        const target = Math.min(zoom, map.getMaxZoom?.() ?? zoom);
        const cur = map.getZoom?.() ?? 0;
        if (Math.abs(cur - target) < 0.01) return;
        const center = map.getCenter();
        setTimeout(() => map.flyTo(center, target, { duration: 0.7, easeLinearity: 0.25 }), delayMs);
      } catch {}
    };
    map.once("moveend", finish);
    const t = setTimeout(finish, 2000);
    return () => clearTimeout(t);
  }, [map, zoom, delayMs]);
  return null;
}

/* ----------------------- Search Control (Unified) ---------------------- */
function SearchControl({
  showSearch, setShowSearch,
  searchValue, setSearchValue,
  submitSearch,
  userCollapsed, setUserCollapsed,
}) {
  const map = useMap();
  const controlRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!map) return;
    const container = L.DomUtil.create("div", "leaflet-control custom-search-ctl");
    containerRef.current = container;

    const Control = L.Control.extend({
      onAdd: () => {
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);
        container.style.background = "transparent";
        container.style.border = "0";
        container.style.boxShadow = "none";
        return container;
      },
      onRemove: () => {},
    });

    const control = new Control({ position: "topright" });
    controlRef.current = control;
    map.addControl(control);

    return () => {
      try { map.removeControl(controlRef.current); } catch {}
      controlRef.current = null;
      containerRef.current = null;
    };
  }, [map]);

  const hasText = (searchValue || "").trim().length > 0;
  useEffect(() => {
    if (hasText && !userCollapsed && !showSearch) setShowSearch(true);
  }, [hasText, userCollapsed, showSearch, setShowSearch]);

  const visible = !userCollapsed && (showSearch || hasText);

  const IconButton = (
    <button
      onClick={() => { setUserCollapsed(false); setShowSearch(true); }}
      title="Search parcels" 
      aria-label="Open search" 
      className="sp-iconbtn"
      style={{
        width: 48, height: 48, borderRadius: "50%",
        background: "#fff", border: "none",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        color: "#0b5faa", fontSize: 20,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", transition: "transform 0.2s"
      }}
      onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
      onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
    >
      <i className="bi bi-search"></i>
    </button>
  );

  const Panel = (
    <div style={{
      background: "rgba(255, 255, 255, 0.9)",
      backdropFilter: "blur(12px)",
      padding: "6px", 
      borderRadius: "50px",
      boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
      display: "flex", alignItems: "center", gap: 8,
      border: "1px solid rgba(255,255,255,0.4)",
      maxWidth: "460px",
      width: "90vw",
      transition: "all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)"
    }}>
      <form 
        onSubmit={submitSearch} 
        style={{ display: "flex", flex: 1, alignItems: "center", position: "relative" }}
      >
        <button 
            type="submit"
            aria-label="Search"
            style={{ 
                position: "absolute", left: 6, top: "50%", transform: "translateY(-50%)",
                background: "#0b5faa", color: "white", border: "none",
                width: 38, height: 38, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", zIndex: 2,
                boxShadow: "0 4px 10px rgba(11, 95, 170, 0.3)",
                transition: "transform 0.2s, box-shadow 0.2s"
            }}
            onMouseEnter={e => {
                e.currentTarget.style.transform = "translateY(-50%) scale(1.05)";
                e.currentTarget.style.boxShadow = "0 6px 14px rgba(11, 95, 170, 0.4)";
            }}
            onMouseLeave={e => {
                e.currentTarget.style.transform = "translateY(-50%) scale(1)";
                e.currentTarget.style.boxShadow = "0 4px 10px rgba(11, 95, 170, 0.3)";
            }}
        >
            <i className="bi bi-search" style={{ fontSize: 16 }}></i>
        </button>
        
        <input
          type="text"
          placeholder="Search Parcel ID, Lot No, or Owner..."
          value={searchValue} 
          onChange={(e) => setSearchValue(e.target.value)}
          aria-label="Search"
          style={{ 
            width: "100%", 
            padding: "14px 40px 14px 54px", 
            borderRadius: "30px", 
            border: "2px solid transparent", 
            outline: "none", 
            fontSize: 15,
            background: "#f1f3f5",
            color: "#212529",
            fontWeight: 500,
            transition: "all 0.2s"
          }}
          onFocus={e => {
            e.target.style.background = "#fff";
            e.target.style.borderColor = "#0b5faa";
            e.target.style.boxShadow = "0 0 0 4px rgba(11, 95, 170, 0.1)";
          }}
          onBlur={e => {
            e.target.style.background = "#f1f3f5";
            e.target.style.borderColor = "transparent";
            e.target.style.boxShadow = "none";
          }}
        />
        
        {hasText && (
          <button
            type="button" 
            aria-label="Clear" 
            onClick={() => setSearchValue("")}
            style={{
              position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
              width: 24, height: 24, borderRadius: "50%", border: "none",
              background: "#dee2e6", color: "#495057", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, transition: "background 0.2s"
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#ced4da"}
            onMouseLeave={e => e.currentTarget.style.background = "#dee2e6"}
          >
            <i className="bi bi-x"></i>
          </button>
        )}
      </form>

      <button
        onClick={() => { setShowSearch(false); setUserCollapsed(true); }}
        title="Hide search" 
        aria-label="Hide search"
        style={{ 
            padding: "0 16px", 
            height: "40px",
            borderRadius: "20px", 
            border: "none", 
            background: "transparent", 
            color: "#6c757d", 
            cursor: "pointer", 
            fontWeight: 600,
            fontSize: 14,
            transition: "all 0.2s"
        }}
        onMouseEnter={e => {
            e.currentTarget.style.color = "#343a40";
            e.currentTarget.style.background = "rgba(0,0,0,0.05)";
        }}
        onMouseLeave={e => {
            e.currentTarget.style.color = "#6c757d";
            e.currentTarget.style.background = "transparent";
        }}
      >
        Close
      </button>
    </div>
  );

  const ui = (
    <>
      <style>{`
        .custom-search-ctl { background: transparent!important; border: 0!important; box-shadow: none!important; margin-right: 12px; margin-top: 12px; }
      `}</style>
      <div className="sp-root">{visible ? Panel : IconButton}</div>
    </>
  );

  return containerRef.current ? createPortal(ui, containerRef.current) : null;
}

/* --------------------------------- Map Page --------------------------------- */
export default function MapPage() {
  const { parcelId: routeParcelId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [fc, setFC] = useState(null);
  const [mapObj, setMapObj] = useState(null);

  const [showSearch, setShowSearch] = useState(!routeParcelId);
  const [userCollapsed, setUserCollapsed] = useState(false);
  const [searchValue, setSearchValue] = useState(routeParcelId || "");
  const [searchField, setSearchField] = useState("parcel");

  const highlightRef = useRef(null);
  const [selectedPid, setSelectedPid] = useState("");
  const selectedPidRef = useRef("");
  useEffect(() => { selectedPidRef.current = selectedPid; }, [selectedPid]);

  const selectedLayerRef = useRef(null);

  const [pendingKey, setPendingKey] = useState(routeParcelId ? normKey(routeParcelId) : "");
  const pendingKeyRef = useRef(pendingKey);
  const pendingLayerRef = useRef(null);

  const byParcelRef = useRef(new Map());
  const byLotRef = useRef(new Map());
  const byOwnerRef = useRef(new Map());

  const MAX_ZOOM = 22;
  const fallbackCenter = useMemo(() => [13.8, 121.14], []);
  
  // Classification Colors
  const getClassColor = (cls) => {
    const c = (cls || "").toLowerCase().trim();
    if (c.includes("residential")) return "#FFFF00"; // Yellow
    if (c.includes("commercial")) return "#FF7800"; // Orange
    if (c.includes("agricultural")) return "#33a02c"; // Green
    if (c.includes("industrial")) return "#6a3d9a"; // Purple
    if (c.includes("institutional")) return "#1f78b4"; // Blue
    if (c.includes("special")) return "#a6cee3"; // Light Blue
    return "#cccccc"; // Gray default
  };

  const baseStyle = useCallback((feature) => {
    const props = feature?.properties || {};
    const isDelinquent = props.delinquent === true || props.delinquent === "true";
    return {
      color: isDelinquent ? "#ff0000" : "#1e73be",
      weight: isDelinquent ? 2.5 : 1.25,
      dashArray: isDelinquent ? "4,2" : null,
      fillColor: getClassColor(props.classification),
      fillOpacity: 0.6
    };
  }, []);

  const hoverStyle = useMemo(() => ({ color: "#F2C200", weight: 3, fillOpacity: 0.7 }), []);
  const selectedStyle = useMemo(() => ({ color: "#F2C200", weight: 3, fillOpacity: 0.35 }), []);
  const overlayStyle = useMemo(() => ({ color: "#ff7f0e", weight: 3.5, fillOpacity: 0.28, dashArray: "4,2" }), []);

  const [dataMap, setDataMap] = useState(() => Object.fromEntries(DATA_SPECS.map(s => [s.key, { loading: true, error: null, data: null }])));

  /* ----------------------------- Load static local GeoJSONs ----------------------------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.all(
        DATA_SPECS.map(async spec => {
          try {
            const res = await fetch(spec.path);
            if (!res.ok) throw new Error(`${spec.key} HTTP ${res.status}`);
            const json = await res.json();
            if (cancelled) return;
            setDataMap(prev => ({
              ...prev,
              [spec.key]: { loading: false, error: null, data: json },
            }));
          } catch (e) {
            if (cancelled) return;
            console.error("Failed:", spec.key, e);
            setDataMap(prev => ({
              ...prev,
              [spec.key]: { loading: false, error: e.message, data: null },
            }));
          }
        })
      );
    })();
    return () => { cancelled = true; };
  }, []);

  const datasets = DATA_SPECS.map(s => ({
    key: s.key,
    data: dataMap[s.key].data,
    style: () => ({
      color: s.color,
      weight: s.weight,
      fillColor: s.fillColor,
      fillOpacity: s.fillOpacity ?? 0,
    }),
    label: s.key,
  }));

  const setSelectedLayer = useCallback((layer, pid) => {
    const prev = selectedLayerRef.current;
    if (prev && prev !== layer) { try { prev.setStyle(baseStyle); } catch {} }
    selectedLayerRef.current = layer || null;
    if (layer) { try { layer.setStyle(selectedStyle); } catch {} }
    setSelectedPid(pid || "");
  }, [baseStyle, selectedStyle]);

  /* ----------------------------- Load parcels (Step 4 API) ----------------------------- */
  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await api.get("/map/parcels");
        const fcBuilt = res.data; // Expecting FeatureCollection from backend

        setFC(fcBuilt);

        setTimeout(() => {
          try {
            const lyr = L.geoJSON(fcBuilt);
            const b = lyr.getBounds();
            if (mapObj && b.isValid()) {
              mapObj.fitBounds(b, { padding: [36, 36], maxZoom: 14, animate: true });
            }
          } catch {}
        }, 0);
      } catch (e) {
        console.error(e);
        setErr("Failed to load parcels.");
      } finally {
        setLoading(false);
      }
    })();
  }, [mapObj]);

  /* --------------------- Init highlight layer --------------------- */
  useEffect(() => {
    if (!mapObj) return;
    if (!highlightRef.current) {
      highlightRef.current = L.geoJSON(null, {
        style: overlayStyle,
        interactive: false,
        pane: "overlayPane",
      }).addTo(mapObj);
    }
  }, [mapObj, overlayStyle]);

  useEffect(() => { pendingKeyRef.current = pendingKey; }, [pendingKey]);

  useEffect(() => {
    const pidKey = routeParcelId ? normKey(routeParcelId) : "";
    setSearchValue(routeParcelId || "");
    setShowSearch(!pidKey);
    setPendingKey(pidKey);
    if (pidKey) setSearchField("parcel");
  }, [routeParcelId]);

  /* ---------------- utility pid/lot getters (robust) ---------------- */
  function getPidFromProps(p = {}) {
    for (const k of [
      "ParcelId","parcelId","PARCELID","parcelID","parcelid",
      "parcel_id","PARCEL_ID","PID","pid", "id", "parcel_number"
    ]) {
      const v = p[k];
      if (v != null && String(v).trim() !== "") return String(v).trim();
    }
    return "";
  }
  function getLotFromProps(p = {}) {
    for (const k of ["LotNumber","lotnumber","LOTNUMBER","lot_no","LOT_NO","lot"]) {
      const v = p[k];
      if (v != null && String(v).trim() !== "") return String(v).trim();
    }
    return "";
  }

  /* ---------------- focus map, open popup, update highlight ---------------- */
  const focusOpenAndHighlight = useCallback(
    async (layer, feature) => {
      if (!layer || !mapObj) return;

      if (highlightRef.current) {
        highlightRef.current.clearLayers();
        if (feature?.geometry) {
          highlightRef.current.addData(feature);
          try { highlightRef.current.bringToFront(); } catch {}
        }
      }

      const pid = getPidFromProps(feature?.properties || {});
      setSelectedLayer(layer, pid);

      const bounds = layer.getBounds?.();
      const openPopup = () => {
        try {
          if (layer.getPopup && layer.getPopup()) layer.openPopup();
          else if (layer.bindPopup) layer.openPopup();
          else layer.fire("click");
        } catch {}
      };

      if (bounds && bounds.isValid()) {
        mapObj.fitBounds(bounds, { padding: [28, 28], maxZoom: 16, animate: true });
        setTimeout(() => { try { mapObj.flyTo(mapObj.getCenter(), 18, { duration: 0.65, easeLinearity: 0.25 }); } catch {} }, 120);
        setTimeout(openPopup, 160);
      } else {
        openPopup();
        try { mapObj.flyTo(mapObj.getCenter(), 18, { duration: 0.65, easeLinearity: 0.25 }); } catch {}
      }
    },
    [mapObj, setSelectedLayer]
  );

  /* ----------------------------- Submit search ----------------------------- */
  const submitSearch = async (e) => {
    e?.preventDefault?.();
    const term = toStr(searchValue);
    
    // Dynamic import for SweetAlert2
    const Swal = (await import("sweetalert2")).default;

    if (!term) {
      Swal.fire("Info", "Please enter a valid search term.", "info");
      return;
    }

    let targetLayer = null;
    let targetFeature = null;

    // 1. Client-side Search (Try all in order)
    
    // A. Parcel ID (Exact Match)
    targetLayer = byParcelRef.current.get(normKey(term)) || null;
    if (!targetLayer) {
        // Try loose check on keys
        for (const [key, lyr] of byParcelRef.current.entries()) {
            if (String(key).toLowerCase() === String(term).toLowerCase()) { targetLayer = lyr; break; }
        }
    }

    // B. Lot Number (Exact Match)
    if (!targetLayer) {
        const matches = byLotRef.current.get(normKey(term));
        if (matches?.length) {
            targetLayer = matches[0];
            if (matches.length > 1) {
                const list = matches.slice(0, 6).map((l, i) => {
                    const pid = getPidFromProps(l.feature?.properties || {});
                    return `${i + 1}. Parcel ${pid || "—"}`;
                }).join("\n");
                // Don't block, just show toast or let it pick first but notify
                // Swal.fire("Info", `Multiple parcels share Lot "${term}". Showing the first match.\n\nOther matches:\n${list}${matches.length > 6 ? "\n…" : ""}`, "info");
            }
        }
    }

    // C. Owner Name (Exact or Partial)
    if (!targetLayer) {
        const termLower = normKey(term);
        let matches = byOwnerRef.current.get(termLower) || [];
        
        // If no exact match, try partial scan
        if (!matches.length) {
            for (const [key, layers] of byOwnerRef.current.entries()) {
                if (key.includes(termLower)) {
                    matches = matches.concat(layers);
                }
            }
        }

        if (matches?.length) {
            targetLayer = matches[0];
            // If multiple, maybe show list? For now pick first.
        }
    }

    if (targetLayer) targetFeature = targetLayer.feature ?? null;

    // 2. Server-side Search Fallback (Unified generic search)
    if (!targetLayer) {
      try {
        const res = await api.get(`/map/search?q=${encodeURIComponent(term)}`);
        const features = res.data?.features || [];
        
        if (features.length > 0) {
           const newFeatures = features.filter(f => {
               const pid = getPidFromProps(f.properties);
               return pid && !byParcelRef.current.has(normKey(pid));
           });
           
           if (newFeatures.length > 0) {
               setFC(prev => ({
                   ...prev,
                   features: [...(prev?.features || []), ...newFeatures]
               }));
           }
           
           // Use the first match to set pendingKey
           const first = features[0];
           const pid = getPidFromProps(first.properties);
           if (pid) {
               setPendingKey(normKey(pid));
               setShowSearch(false);
               
               // Retry logic to wait for the layer to be mounted and registered
               let retries = 0;
               const maxRetries = 20; 
               const interval = setInterval(() => {
                   const k = normKey(pid);
                   const lyr = byParcelRef.current.get(k);
                   if (lyr) {
                       clearInterval(interval);
                       setSelectedLayer(lyr, pid);
                       focusOpenAndHighlight(lyr, first);
                   } else {
                       retries++;
                       if (retries >= maxRetries) clearInterval(interval);
                   }
               }, 50); 
               return; 
           }
        }
      } catch (err) {
        console.error("Server search failed", err);
      }

      const sample = Array.from(byParcelRef.current.keys()).slice(0, 8).join(", ");
      Swal.fire("Not Found", `No results found for "${term}".\n\nTry searching for a valid Parcel ID, Lot Number, or Owner Name.`, "warning");
      return;
    }

    const pid = getPidFromProps(targetLayer.feature?.properties || {});
    if (pid) {
      setSelectedLayer(targetLayer, pid);
      window.history.pushState(null, "", `/${encodeURIComponent(pid)}`);
    }

    setShowSearch(false);

    setTimeout(() => {
      focusOpenAndHighlight(targetLayer, targetFeature);
      setTimeout(() => {
        try {
          const c = targetLayer.getBounds().getCenter();
          targetLayer.fire("click", {
            latlng: c,
            layerPoint: mapObj.latLngToLayerPoint(c),
            containerPoint: mapObj.latLngToContainerPoint(c),
          });
        } catch {
          if (targetLayer.getPopup()) {
            try { targetLayer.openPopup(targetLayer.getBounds().getCenter()); } catch {}
          }
        }
      }, 400);
    }, 150);
  };

  /* -------------- Auto-open when route param points to a parcel -------------- */
  useEffect(() => {
    if (!pendingKey) return;
    let n = 0;
    const max = 25;

    const tick = () => {
      const key = pendingKeyRef.current;
      if (!key) return true;

      const lyr = byParcelRef.current.get(key) || pendingLayerRef.current;
      if (lyr && mapObj) {
        const pid = getPidFromProps(lyr.feature?.properties || {});
        setSelectedLayer(lyr, pid);
        focusOpenAndHighlight(lyr, lyr.feature);
        pendingLayerRef.current = null;
        setPendingKey("");
        return true;
      }
      n += 1;
      return n >= max;
    };

    if (tick()) return;
    const iv = setInterval(() => { if (tick()) clearInterval(iv); }, 100);
    return () => clearInterval(iv);
  }, [pendingKey, mapObj, focusOpenAndHighlight, setSelectedLayer]);

  /* --------------------- Lightweight tax lookup (same) --------------------- */
  const fetchTaxIdForFeature = useCallback(async (p) => {
    const lotNo = toStr(getLotFromProps(p));
    const barangay = toStr(p?.BarangayNa ?? p?.barangayna);
    const tryGet = async (url, params) => {
      try {
        const r = await api.get(url, { params });
        const data = r?.data;
        if (!data) return null;
        if (Array.isArray(data)) return data[0]?.id ?? data[0]?.taxId ?? null;
        if (typeof data === "object") return data?.id ?? data?.taxId ?? data?.result?.id ?? data?.result?.taxId ?? null;
        return null;
      } catch { return null; }
    };
    if (lotNo) {
      for (const t of [
        { url: "/tax/lookup", params: { lotNo, barangay } },
        { url: "/tax", params: { lotNo, barangay } },
        { url: `/tax/by-lot/${encodeURIComponent(lotNo)}`, params: { barangay } },
      ]) {
        const id = await tryGet(t.url, t.params);
        if (id) return id;
      }
    }
    return null;
  }, []);

  /* --------------------------- Per-feature wiring (parcels) --------------------------- */
  const onEachFeature = (feature, layer) => {
    const p = feature.properties || {};
    const pid = getPidFromProps(p);
    const lot = getLotFromProps(p);
    const kPid = normKey(pid);
    const kLot = normKey(lot);

    const CONTROL_ORDER = {
      "Municipality Boundary": 10,
      "Parcels": 20,
      "Water Bodies": 30,
      "Road Network": 40,
      "Building Footprint": 50,
    };
    const stripName = (n) => String(n || "").replace(/<[^>]+>/g, "").trim();
    const getRank = (n) => CONTROL_ORDER[stripName(n)] ?? 999;
    const sortFn = (layerA, layerB, nameA, nameB) => getRank(nameA) - getRank(nameB);

    if (kPid) byParcelRef.current.set(kPid, layer);
    if (kLot) {
      const arr = byLotRef.current.get(kLot) || [];
      arr.push(layer);
      byLotRef.current.set(kLot, arr);
    }

    layer.on({
      mouseover: () => {
        if (pid && selectedPidRef.current === pid) return;
        try { layer.setStyle(hoverStyle); } catch {}
      },
      mouseout: () => {
        if (pid && selectedPidRef.current === pid) {
          try { layer.setStyle(selectedStyle); } catch {}
        } else {
          try { layer.setStyle(baseStyle); } catch {}
        }
      },
      click: () => {
        if (pid) {
          if (!location.pathname.endsWith(`/${pid}`)) navigate(`/${encodeURIComponent(pid)}`);
          setSelectedLayer(layer, pid);
        }
        setShowSearch(false);
        focusOpenAndHighlight(layer, feature);
      },
    });

    const uidTax = `open-tax-${layer._leaflet_id}`;
    const uidParcel = `open-parcel-${layer._leaflet_id}`;
    const html = `
      <div class="sp-popup-content">
        <div class="sp-popup-header">
          <div class="sp-popup-icon"><i class="bi bi-geo-alt-fill"></i></div>
          <div class="sp-popup-title">
            <span>${p.BarangayNa ?? p.barangayna ?? "Parcel Information"}</span>
            <small>Selected Property</small>
          </div>
        </div>
        
        <div class="sp-popup-grid">
          ${pid ? `<div class="sp-row"><span class="sp-label">Parcel ID</span><span class="sp-value mono">${pid}</span></div>` : ""}
          ${lot ? `<div class="sp-row"><span class="sp-label">Lot No.</span><span class="sp-value mono">${lot}</span></div>` : ""}
          ${p.BlockNumber ?? p.blocknumber ? `<div class="sp-row"><span class="sp-label">Block</span><span class="sp-value">${p.BlockNumber ?? p.blocknumber}</span></div>` : ""}
          ${p.Area ?? p.area ? `<div class="sp-row"><span class="sp-label">Area</span><span class="sp-value">${p.Area ?? p.area} sqm</span></div>` : ""}
          ${p.Claimant ?? p.claimant ? `<div class="sp-row"><span class="sp-label">Claimant</span><span class="sp-value highlight">${p.Claimant ?? p.claimant}</span></div>` : ""}
          ${p.SurveyPlan ?? p.surveyplan ? `<div class="sp-row"><span class="sp-label">Survey Plan</span><span class="sp-value">${p.SurveyPlan ?? p.surveyplan}</span></div>` : ""}
        </div>

        <div class="sp-popup-actions">
          <button id="${uidTax}" class="sp-btn sp-btn-primary">
            <i class="bi bi-file-earmark-text"></i> Tax Form
          </button>
          <button id="${uidParcel}" class="sp-btn sp-btn-outline">
            <i class="bi bi-arrow-right-circle"></i> Details
          </button>
        </div>
      </div>`;
    layer.bindPopup(html, { maxWidth: 320, className: "custom-popup-modern" });

    layer.on("popupopen", () => {
      const btnTax = document.getElementById(uidTax);
      const btnParcel = document.getElementById(uidParcel);

      if (btnTax) {
        btnTax.onclick = async () => {
          btnTax.disabled = true; btnTax.textContent = "Opening…";
          try {
            const taxId = await fetchTaxIdForFeature(p);
            if (taxId) {
              localStorage.setItem("taxId", String(taxId));
              navigate("/taxform"); return;
            }
            btnTax.disabled = false; btnTax.textContent = "View Tax Form";
            const wantCreate = window.confirm("No tax record found for this lot. Add a new tax form?");
            if (!wantCreate) return;
            const prefill = {
              parcelId: pid,
              lotNo: lot,
              barangay: p?.BarangayNa ?? p?.barangayna ?? "",
            };
            localStorage.removeItem("taxId");
            localStorage.setItem("prefillTaxData", JSON.stringify(prefill));
            navigate("/taxform");
          } catch (e) {
            console.error(e);
            btnTax.disabled = false; btnTax.textContent = "View Tax Form";
            alert("Failed to fetch tax record.");
          }
        };
      }

      if (btnParcel) {
        btnParcel.onclick = () => {
          if (pid) {
            navigate(`/parcel-details/${encodeURIComponent(pid)}`);
          } else {
            alert("No Parcel ID found for this record.");
          }
        };
      }
    });

    if (pendingKeyRef.current && kPid === pendingKeyRef.current) {
      pendingLayerRef.current = layer;
    }
  };

  const showVectors = !!fc?.features?.length;
  const EMPTY_FC = { type: "FeatureCollection", features: [] };

  return (
    <div style={{ height: "90vh", width: "100%", position: "relative" }}>
      <style>{`
        .custom-popup-modern .leaflet-popup-content-wrapper {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(12px);
          border-radius: 16px;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
          padding: 0;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.6);
        }
        .custom-popup-modern .leaflet-popup-content {
          margin: 0 !important;
          width: auto !important;
        }
        .custom-popup-modern .leaflet-popup-tip {
          background: rgba(255, 255, 255, 0.95);
        }
        .custom-popup-modern a.leaflet-popup-close-button {
          top: 12px;
          right: 12px;
          color: #adb5bd;
          font-size: 18px;
          background: transparent;
          padding: 0;
          width: 24px;
          height: 24px;
        }

        /* Internal Popup Styles */
        .sp-popup-content {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: #343a40;
        }
        .sp-popup-header {
          padding: 16px 20px;
          background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
          border-bottom: 1px solid #f1f3f5;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .sp-popup-icon {
          width: 32px;
          height: 32px;
          background: #e7f5ff;
          color: #0b5faa;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
        }
        .sp-popup-title {
          display: flex;
          flex-direction: column;
        }
        .sp-popup-title span {
          font-weight: 700;
          font-size: 14px;
          color: #212529;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .sp-popup-title small {
          font-size: 11px;
          color: #868e96;
          font-weight: 500;
        }
        .sp-popup-grid {
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .sp-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          font-size: 13px;
          line-height: 1.4;
        }
        .sp-label {
          color: #868e96;
          font-weight: 500;
        }
        .sp-value {
          font-weight: 600;
          color: #495057;
          text-align: right;
          max-width: 60%;
        }
        .sp-value.mono {
          font-family: 'SF Mono', 'Roboto Mono', monospace;
          letter-spacing: -0.3px;
          color: #0b5faa;
          background: #e7f5ff;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .sp-value.highlight {
          color: #212529;
        }
        .sp-popup-actions {
          padding: 12px 20px 20px;
          display: flex;
          gap: 10px;
        }
        .sp-btn {
          flex: 1;
          padding: 10px;
          border: none;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.2s;
        }
        .sp-btn-primary {
          background: #0b5faa;
          color: white;
          box-shadow: 0 4px 12px rgba(11, 95, 170, 0.2);
        }
        .sp-btn-primary:hover {
          background: #094d8a;
          transform: translateY(-1px);
        }
        .sp-btn-outline {
          background: #f8f9fa;
          color: #495057;
          border: 1px solid #dee2e6;
        }
        .sp-btn-outline:hover {
          background: #e9ecef;
          color: #212529;
        }

        /* Layers control grouping styles */
        .leaflet-control-layers {
          border: 0;
          border-radius: 16px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          padding: 12px;
          color: #343a40;
          font-family: 'Inter', sans-serif;
          min-width: 240px;
        }
        .leaflet-control-layers-toggle {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background-size: 24px;
          background-color: white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.12);
          transition: transform 0.2s;
        }
        .leaflet-control-layers-toggle:hover {
          background-color: #f8f9fa;
          transform: scale(1.05);
        }
        .leaflet-control-layers-expanded {
          padding: 16px;
          background: white;
        }
        .leaflet-control-layers-separator {
          margin: 12px 0;
          border-top: 1px solid #e9ecef;
        }
        
        /* Section Headers */
        .vl-group-main-title, .vl-group-title {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: #868e96;
          font-weight: 700;
          margin: 16px 0 8px 0;
          display: block;
        }
        .vl-group-main-title:first-child {
          margin-top: 0;
        }

        /* Checkbox/Radio Styling */
        .leaflet-control-layers label {
          display: flex;
          align-items: center;
          padding: 6px 8px;
          border-radius: 8px;
          margin: 2px 0;
          transition: background 0.15s;
          cursor: pointer;
        }
        .leaflet-control-layers label:hover {
          background: #f1f3f5;
        }
        .leaflet-control-layers-base label {
           margin-bottom: 4px;
        }
        
        /* Custom Inputs */
        .leaflet-control-layers input {
          appearance: none;
          width: 18px;
          height: 18px;
          border: 2px solid #adb5bd;
          border-radius: 4px;
          margin-right: 10px;
          position: relative;
          cursor: pointer;
          transition: all 0.2s;
        }
        .leaflet-control-layers input[type="radio"] {
          border-radius: 50%;
        }
        .leaflet-control-layers input:checked {
          background-color: #0b5faa;
          border-color: #0b5faa;
        }
        .leaflet-control-layers input[type="checkbox"]:checked::after {
          content: '✓';
          position: absolute;
          color: white;
          font-size: 12px;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-weight: bold;
        }
        .leaflet-control-layers input[type="radio"]:checked::after {
          content: '';
          position: absolute;
          width: 8px;
          height: 8px;
          background: white;
          border-radius: 50%;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }
        .leaflet-control-layers span {
          font-size: 13px;
          font-weight: 500;
          color: #495057;
        }

        /* Hide empty placeholder labels for headers */
        .leaflet-control-layers-list label:has(.vl-group-main-title),
        .leaflet-control-layers-list label:has(.vl-group-title) {
            pointer-events: none;
            padding: 0;
        }
        .leaflet-control-layers-list label:has(.vl-group-main-title) input,
        .leaflet-control-layers-list label:has(.vl-group-title) input {
            display: none;
        }
      `}</style>

      {err && (
        <div
          style={{
            position: "absolute",
            zIndex: 9999,
            right: 12,
            top: 12,
            background: "#fff",
            padding: "8px 12px",
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,.12)",
            color: "#b00020",
            fontSize: 13,
          }}
        >
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
          <LayersControl.BaseLayer name="OpenStreetMap">
            <TileLayer
              attribution="© OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={MAX_ZOOM}
            />
          </LayersControl.BaseLayer>

          <LayersControl.Overlay checked name="Land Parcels">
            {fc && (
              <GeoJSON
                key={`parcels-${fc?.features?.length || 0}`}
                data={fc}
                style={baseStyle}
                onEachFeature={onEachFeature}
                bubblingMouseEvents={false}
                smoothFactor={1.2}
              />
            )}
          </LayersControl.Overlay>

          <LayersControl.Overlay name="Delinquent Parcels (Highlight)">
            <GeoJSON
              data={{
                type: "FeatureCollection",
                features: (fc?.features || []).filter(f => {
                   const d = f.properties?.delinquent;
                   return d === true || d === "true";
                })
              }}
              style={{
                color: "#ff0000",
                weight: 3,
                opacity: 1,
                fillColor: "#ff0000",
                fillOpacity: 0.3,
                dashArray: "5, 5"
              }}
              onEachFeature={onEachFeature}
              bubblingMouseEvents={false}
              smoothFactor={1.2}
            />
          </LayersControl.Overlay>

          <LayersControl.BaseLayer name="Mapbox Streets">
            <TileLayer
              url={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`}
              attribution="© Mapbox © OpenStreetMap"
              maxZoom={MAX_ZOOM}
              tileSize={512}
              zoomOffset={-1}
            />
          </LayersControl.BaseLayer>

          <LayersControl.BaseLayer name="Mapbox Satellite">
            <TileLayer
              url={`https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/512/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`}
              attribution="Imagery © Mapbox, © Maxar"
              maxZoom={MAX_ZOOM}
              tileSize={512}
              zoomOffset={-1}
            />
          </LayersControl.BaseLayer>

          <LayersControl.BaseLayer checked name="Google Hybrid">
            <TileLayer
              url="https://mt0.google.com/vt/lyrs=y&hl=en&x={x}&y={y}&z={z}"
              attribution="Imagery © Google"
              maxZoom={MAX_ZOOM}
              maxNativeZoom={20}
            />
          </LayersControl.BaseLayer>

          <LayersControl.BaseLayer name="Esri World Imagery">
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="Tiles © Esri"
              maxZoom={MAX_ZOOM}
              maxNativeZoom={15} // Reduced to 15 to ensure rural areas don't show "Data not available"
            />
          </LayersControl.BaseLayer>

          {/* Header group (visual) */}
          <LayersControl.Overlay name={'<span class="vl-group-main-title">Layers</span>'}>
            <GeoJSON data={EMPTY_FC} />
          </LayersControl.Overlay>

          {/* Water Bodies (from static geojson) */}
          {isReady(dataMap.river.data) && (
            <LayersControl.Overlay checked name="Water Bodies">
              <GeoJSON
                data={dataMap.river.data}
                style={() => ({
                  color: "#0077ff",
                  weight: 3,
                  fillOpacity: 0,
                })}
                onEachFeature={makeOnEach("river")}
              />
            </LayersControl.Overlay>
          )}

          {/* Road Network (from static geojson) */}
          {isReady(dataMap.road.data) && (
            <LayersControl.Overlay checked name="Road Network">
              <GeoJSON
                data={dataMap.road.data}
                style={() => ({
                  color: "#ff4444",
                  weight: 3,
                  fillOpacity: 0,
                })}
                onEachFeature={makeOnEach("road")}
              />
            </LayersControl.Overlay>
          )}

          {/* Municipality boundary */}
          {isReady(dataMap.municipality.data) && (
            <GeoJSON
              data={dataMap.municipality.data}
              style={() => ({
                color: "#555",
                weight: 2,
                fillColor: "#bbbbbb",
                fillOpacity: 0.35,
              })}
              onEachFeature={makeOnEach("municipality")}
            />
          )}

          {/* Building footprints */}
          {isReady(dataMap.bf.data) && (
            <>
              <LayersControl.Overlay name={'<span class="vl-group-title">Buildings</span>'}>
                <GeoJSON data={EMPTY_FC} />
              </LayersControl.Overlay>
              <LayersControl.Overlay checked name="Building Footprint">
                <GeoJSON
                  data={dataMap.bf.data}
                  style={() => ({
                    color: "#00bb00",
                    weight: 3,
                    fillColor: "#00ff00",
                    fillOpacity: 0.2,
                  })}
                  onEachFeature={makeOnEach("bf")}
                />
              </LayersControl.Overlay>
            </>
          )}

        </LayersControl>

        <SearchControl
          showSearch={showSearch} setShowSearch={setShowSearch}
          searchValue={searchValue} setSearchValue={setSearchValue}
          searchField={searchField} setSearchField={setSearchField}
          submitSearch={submitSearch}
          userCollapsed={userCollapsed} setUserCollapsed={setUserCollapsed}
        />

        {/* Parcel vectors moved to LayersControl */}

        {/* Fit bounds when static layers have data */}
        <FitBoundsOnData datasets={datasets} />
      </MapContainer>

      {loading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            pointerEvents: "none",
            fontSize: 14,
            color: "#333",
          }}
        >
          Loading map…
        </div>
      )}
    </div>
  );
}