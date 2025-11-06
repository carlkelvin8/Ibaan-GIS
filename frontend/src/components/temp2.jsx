// frontend/src/components/Map/MapPage.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
    MapContainer,
    TileLayer,
    GeoJSON,
    LayersControl,
    useMap,
    WMSTileLayer,
} from "react-leaflet";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import L from "leaflet";
import api from "../../lib/axios.js";
import "leaflet/dist/leaflet.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

/* ------------------------- GeoServer wiring (WMS/WFS) ------------------------- */
// If you proxy via backend (e.g. /gs), set VITE_GS_BASE=/gs. Otherwise use the full URL.
const GS_BASE  = (import.meta.env.VITE_GS_BASE || "http://geoserver-custom-production.up.railway.app/geoserver").replace(/\/+$/, "");
const GS_WS    = import.meta.env.VITE_GS_WS || "gis";
const GS_LAYER = import.meta.env.VITE_GS_LAYER || "ibaan"; // e.g., v_ibaan_simple

const WMS_BASE = `${GS_BASE}/${GS_WS}/wms`;
const WFS_BASE = `${GS_BASE}/${GS_WS}/wfs`;
const DEFAULT_LAYER = `${GS_WS}:${GS_LAYER}`;

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

/* ------------------------------ tiny helpers ------------------------------ */
const toStr   = (v) => (v == null ? "" : String(v).trim());
const normKey = (v) => toStr(v).toLowerCase();

function getPidFromProps(p = {}) {
    for (const k of [
        "ParcelId","parcelId","PARCELID","parcelID","parcelid",
        "parcel_id","PARCEL_ID","PID","pid"
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

const DATA_SPECS = [
    { key: "municipality", path: "/geoData/muni/Ibaan_muni.geojson", color: "#555", weight: 2, fillColor: "#bbbbbb", fillOpacity: 0.35 },
    { key: "river",        path: "/geoData/river/Ibaan_river_WGS84.geojson", color: "#0077ff", weight: 3, fillOpacity: 0 },
    { key: "road",         path: "/geoData/road/ibaan_road_wgs84.geojson", color: "#ff4444", weight: 3, fillOpacity: 0 },
    { key: "bf",           path: "/geoData/BF/Ibaan_BF_WGS84.geojson", color: "#00bb00", weight: 3, fillColor: "#00ff00", fillOpacity: 0.2 },
];

function isReady(g) {
    if (!g || typeof g !== "object") return false;
    if (g.type === "FeatureCollection") return Array.isArray(g.features) && g.features.length > 0;
    return g.type === "Feature" && !!g.geometry;
}

// ---- Hover + popup binder ----
function makeOnEach(layerLabel) {
    return (feature, layer) => {
        const props = feature.properties || {};
        const original = { ...layer.options };
        layer.on({
            mouseover: () => {
                try { layer.setStyle({ ...original, color: "#F2C200", weight: (original.weight || 2) + 1 }); } catch {}
            },
            mouseout: () => {
                try { layer.setStyle(original); } catch {}
            },
        });
        layer.bindPopup(
            `<div style="font-size:13px;line-height:1.4;">
         <strong>${layerLabel.toUpperCase()}</strong><br/>
         ${Object.entries(props).slice(0, 12).map(([k,v]) => `<div><b>${k}:</b> ${v}</div>`).join("")}
       </div>`,
            { maxWidth: 320 }
        );
    };
}

// ---- Component that fits bounds once after all layers loaded ----
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

/* ----------------------- Search Control (Parcel / Lot) ---------------------- */
function SearchControl({
                           showSearch, setShowSearch,
                           searchValue, setSearchValue,
                           searchField, setSearchField,
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
            title="Search parcels" aria-label="Open search" className="sp-iconbtn"
        >🔍</button>
    );

    const Panel = (
        <div style={{
            padding: 8, background: "#fff", border: 0, borderRadius: 12,
            boxShadow: "0 6px 18px rgba(0,0,0,.16)", display: "flex",
            flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap", maxWidth: "100%",
        }}>
            <form onSubmit={submitSearch} style={{ display: "flex", flex: 1, gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <select
                    value={searchField} onChange={(e) => setSearchField(e.target.value)} aria-label="Search field"
                    style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #c7ccd1", fontSize: 14 }}
                >
                    <option value="parcel">Parcel ID</option>
                    <option value="lot">Lot Number</option>
                </select>

                <div style={{ position: "relative", flex: 1, minWidth: 160 }}>
                    <input
                        type="text"
                        placeholder={searchField === "parcel" ? "Enter Parcel ID…" : "Enter Lot Number…"}
                        value={searchValue} onChange={(e) => setSearchValue(e.target.value)}
                        aria-label={searchField === "parcel" ? "Parcel ID" : "Lot Number"}
                        style={{ width: "100%", padding: "8px 36px 8px 12px", borderRadius: 10, border: "1px solid #c7ccd1", outline: "none", fontSize: 14 }}
                    />
                    {hasText && (
                        <button
                            type="button" aria-label="Clear" onClick={() => setSearchValue("")}
                            style={{
                                position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                                width: 24, height: 24, borderRadius: 12, border: 0, background: "#fff", cursor: "pointer", lineHeight: "20px",
                            }}
                        >×</button>
                    )}
                </div>

                <button
                    type="submit" disabled={!hasText}
                    style={{
                        padding: "8px 14px", borderRadius: 10, border: 0,
                        background: hasText ? "#0b5faa" : "#9bb8d4", color: "#fff", fontWeight: 700,
                        cursor: hasText ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: 8, fontSize: 14,
                    }}
                >
                    <span style={{ fontSize: 16 }}>🔎</span> Search
                </button>
            </form>

            <button
                onClick={() => { setShowSearch(false); setUserCollapsed(true); }}
                title="Hide search" aria-label="Hide search"
                style={{ padding: "8px 10px", borderRadius: 10, border: 0, background: "#fff", cursor: "pointer", whiteSpace: "nowrap" }}
            >
                Hide
            </button>
        </div>
    );

    const ui = (
        <>
            <style>{`
        .custom-search-ctl { background: transparent!important; border: 0!important; box-shadow: none!important; }
        .custom-search-ctl .sp-root { margin-top: 8px; }
        .sp-iconbtn{
          width: 22px; height: 22px; border-radius: 50%;
          border: 0; outline: none; background: #fff; cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,.18);
          display: flex; align-items: center; justify-content: center;
          font-size: 16px; line-height: 1;
        }
        @media (max-width: 520px){ .sp-card{ width: min(92vw, 380px); } }
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

    const MAX_ZOOM = 19;
    const fallbackCenter = useMemo(() => [13.8, 121.14], []);
    const baseStyle     = useMemo(() => ({ color: "#1e73be", weight: 1.25, fillOpacity: 0.22 }), []);
    const hoverStyle    = useMemo(() => ({ color: "#F2C200", weight: 2,   fillOpacity: 0.28 }), []);
    const selectedStyle = useMemo(() => ({ color: "#F2C200", weight: 3,   fillOpacity: 0.35 }), []);
    const overlayStyle  = useMemo(() => ({ color: "#ff7f0e", weight: 3.5, fillOpacity: 0.28, dashArray: "4,2" }), []);

    const [dataMap, setDataMap] = useState(() => Object.fromEntries(DATA_SPECS.map(s => [s.key, { loading: true, error: null, data: null }])));
    const allDone = useMemo(
        () => DATA_SPECS.every(s => !dataMap[s.key].loading),
        [dataMap]
    );

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

    /* --------------------------- Load from GeoServer WFS --------------------------- */
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
                const fcBuilt = await r.json();

                if (!cancelled) setFC(fcBuilt);

                setTimeout(() => {
                    if (cancelled) return;
                    try {
                        const lyr = L.geoJSON(fcBuilt);
                        const b = lyr.getBounds();
                        if (mapObj && b.isValid()) {
                            mapObj.fitBounds(b, { padding: [36, 36], maxZoom: 14, animate: true });
                        }
                    } catch {}
                }, 0);
            } catch (e) {
                if (!cancelled) {
                    console.error(e);
                    setErr("Failed to load WFS layer from GeoServer.");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => { cancelled = true; ctrl.abort(); };
    }, [mapObj]);

    /* --------------------- Init persistent highlight layer --------------------- */
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
    const submitSearch = (e) => {
        e?.preventDefault?.();
        const term = toStr(searchValue);
        if (!term) {
            alert(`Please enter a valid ${searchField === "parcel" ? "Parcel ID" : "Lot Number"}.`);
            return;
        }

        let targetLayer = null;
        let targetFeature = null;

        if (searchField === "parcel") {
            targetLayer = byParcelRef.current.get(normKey(term)) || null;
            if (!targetLayer) {
                for (const [key, lyr] of byParcelRef.current.entries()) {
                    if (String(key).toLowerCase() === String(term).toLowerCase()) { targetLayer = lyr; break; }
                }
            }
            if (targetLayer) targetFeature = targetLayer.feature ?? null;
        } else {
            const matches = byLotRef.current.get(normKey(term));
            if (matches?.length) {
                targetLayer = matches[0];
                targetFeature = targetLayer.feature ?? null;
                if (matches.length > 1) {
                    const list = matches.slice(0, 6).map((l, i) => {
                        const pid = getPidFromProps(l.feature?.properties || {});
                        return `${i + 1}. Parcel ${pid || "—"}`;
                    }).join("\n");
                    alert(`Multiple parcels share Lot "${term}". Showing the first match.\n\nOther matches:\n${list}${matches.length > 6 ? "\n…" : ""}`);
                }
            }
        }

        if (!targetLayer) {
            const sample = Array.from(byParcelRef.current.keys()).slice(0, 8).join(", ");
            alert(`${searchField === "parcel" ? "Parcel" : "Lot"} "${term}" not found.\n\nSample Parcel IDs: ${sample || "—"}`);
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
        let n = 0; const max = 25;

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

    /* --------------------------- Per-feature wiring --------------------------- */
    const onEachFeature = (feature, layer) => {
        const p = feature.properties || {};
        const pid = getPidFromProps(p);
        const lot = getLotFromProps(p);
        const kPid = normKey(pid);
        const kLot = normKey(lot);

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
      <div style="font-size:13px;line-height:1.4;max-width:280px;">
        <div style="border-bottom:1px solid #e0e6ed;padding-bottom:8px;margin-bottom:8px;">
          <strong style="font-size:14px;color:#0b5faa;">${p.BarangayNa ?? p.barangayna ?? "Parcel Information"}</strong>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:8px;">
          ${pid ? `<div><strong>Parcel ID:</strong></div><div>${pid}</div>` : ""}
          ${lot ? `<div><strong>Lot:</strong></div><div>${lot}</div>` : ""}
          ${p.BlockNumber ?? p.blocknumber ? `<div><strong>Block:</strong></div><div>${p.BlockNumber ?? p.blocknumber}</div>` : ""}
          ${p.Area ?? p.area ? `<div><strong>Area:</strong></div><div>${p.Area ?? p.area}</div>` : ""}
          ${p.Claimant ?? p.claimant ? `<div><strong>Claimant:</strong></div><div style="word-break:break-word;">${p.Claimant ?? p.claimant}</div>` : ""}
          ${p.TiePointNa ?? p.tiepointna ? `<div><strong>Tie Point:</strong></div><div>${p.TiePointNa ?? p.tiepointna}</div>` : ""}
          ${p.SurveyPlan ?? p.surveyplan ? `<div><strong>Survey Plan:</strong></div><div>${p.SurveyPlan ?? p.surveyplan}</div>` : ""}
          ${p.SurveyId ?? p.surveyid ? `<div><strong>Survey ID:</strong></div><div>${p.SurveyId ?? p.surveyid}</div>` : ""}
        </div>
        <div style="margin-top:12px; display:flex; flex-direction:column; gap:6px;">
          <button id="${uidTax}" type="button"
            style="padding:8px 12px;border:0;border-radius:6px;background:#0b5faa;color:#fff;cursor:pointer;font-weight:600;">
            View Tax Form
          </button>
          <button id="${uidParcel}" type="button"
            style="padding:8px 12px;border:1px solid #d0d7de;border-radius:6px;background:#fff;color:#0b5faa;cursor:pointer;font-weight:600;">
            View Full Parcel Details
          </button>
        </div>
      </div>`;
        layer.bindPopup(html, { maxWidth: 300, className: "custom-popup" });

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
                    const lines = [
                        `Parcel ID: ${pid || "—"}`,
                        `Survey ID: ${p?.SurveyId ?? p?.surveyid ?? "—"}`,
                        `Block Number: ${p?.BlockNumber ?? p?.blocknumber ?? "—"}`,
                        `Lot Number: ${lot || "—"}`,
                        `Area: ${p?.Area ?? p?.area ?? "—"}`,
                        `Barangay: ${p?.BarangayNa ?? p?.barangayna ?? "—"}`,
                        `Claimant: ${p?.Claimant ?? p?.claimant ?? "—"}`,
                        `Tie Point: ${p?.TiePointNa ?? p?.tiepointna ?? "—"}`,
                        `Survey Plan: ${p?.SurveyPlan ?? p?.surveyplan ?? "—"}`,
                    ].join("\n");
                    alert(`Complete Parcel Information\n\n${lines}`);
                };
            }
        });

        if (pendingKeyRef.current && kPid === pendingKeyRef.current) {
            pendingLayerRef.current = layer;
        }
    };

    const showVectors = !!fc?.features?.length;

    return (
        <div style={{ height: "90vh", width: "100%", position: "relative" }}>
            <style>{`
        .custom-popup .leaflet-popup-content-wrapper {
          border-radius: 10px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .custom-popup .leaflet-popup-tip { background: white; }
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

                    <LayersControl.BaseLayer checked name="Esri World Imagery">
                        <TileLayer
                            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                            attribution="Tiles © Esri"
                            maxZoom={MAX_ZOOM}
                        />
                    </LayersControl.BaseLayer>

                    {/* ✅ GeoServer WMS overlay (raster tiles) */}
                    <LayersControl.Overlay checked name="Parcels (GeoServer WMS)">
                        <WMSTileLayer
                            url={WMS_BASE}
                            layers={DEFAULT_LAYER}
                            format="image/png"
                            transparent
                            version="1.1.1"
                            tiled
                        />
                    </LayersControl.Overlay>
                </LayersControl>

                <SearchControl
                    showSearch={showSearch} setShowSearch={setShowSearch}
                    searchValue={searchValue} setSearchValue={setSearchValue}
                    searchField={searchField} setSearchField={setSearchField}
                    submitSearch={submitSearch}
                    userCollapsed={userCollapsed} setUserCollapsed={setUserCollapsed}
                />

                {/* ✅ GeoServer WFS (vector for interactivity/search) */}
                {showVectors && (
                    <GeoJSON
                        data={fc}
                        style={baseStyle}
                        onEachFeature={onEachFeature}
                        bubblingMouseEvents={false}
                        smoothFactor={1.2}
                    />
                )}

                {datasets.map(d => (
                    isReady(d.data) && (
                        <GeoJSON
                            key={d.key}
                            data={d.data}
                            style={d.style}
                            onEachFeature={makeOnEach(d.label)}
                        />
                    )
                ))}

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
                    Loading GeoServer layers…
                </div>
            )}
        </div>
    );
}

/* ----------------------- .env expectations (frontend) -----------------------
VITE_GS_BASE=http://geoserver-custom-production.up.railway.app/geoserver     # or "/gs" if using your proxy router
VITE_GS_WS=gis
VITE_GS_LAYER=ibaan
# VITE_MAPBOX_TOKEN=pk.•••
--------------------------------------------------------------------------- */
