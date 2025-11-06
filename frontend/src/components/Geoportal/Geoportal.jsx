// src/components/Geoportal.jsx
import React, { useMemo, useState } from "react";
import L from "leaflet";
import { TAYTAY_PARCELS } from "./taytayParcels"; // ← adjust path if needed
import { IBAAN_PARCELS } from "../ibaan/ibaanParcels.js";
import { ROADS } from "../../utils/roads.js";
import { RIVERS } from "../../utils/rivers.js";
import { IBAAN_BUILDING_FOOTPRINT } from "../../utils/buildingFootprint.js";
import {
  MapContainer,
  TileLayer,
  WMSTileLayer,
  ScaleControl,
  ZoomControl,
  useMap,
  useMapEvents,
  Polyline,
  Circle,
  Marker,
  Tooltip,
  GeoJSON,
  Pane,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

import Sidebar from "./Includes/Sidebar";
import Topbar from "./Includes/Topbar";
import Footer from "./Includes/Footer";
import Legend from "./Includes/Legend";
import DataSourcesUI from "./Includes/DataSourcesUI";
import SelectedLayersManager from "./Includes/SelectedLayersManager";

/* ===============================
   ✅ Small, crisp in-app marker (used by search & ruler)
================================= */
const parcelDivIcon = L.divIcon({
  className: "parcel-marker",
  html: `
    <div style="
      width:28px;height:28px;border-radius:50%;
      background:#a855f7; box-shadow:0 0 0 2px white, 0 2px 8px rgba(0,0,0,.4);
      display:grid;place-items:center; color:white; font-weight:700; font-size:14px;
    ">
      •
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14],
});

/* ===============================
   ✅ Tooltip HTML builder (exact fields requested)
================================= */
function parcelTooltipHTML(p = {}) {
  const fields = [
    "ID","ParcelId","LotNumber","BlockNumbe","SurveyPlan","Claimant",
    "BarangayNa","Area"
  ];

  const pretty = (v) =>
    v === null || v === undefined || v === "" ? `<span style="opacity:.55">—</span>` : String(v);

  const rows = fields
    .map((k, i) => {
      const val = p[k];
      const bg = i % 2 ? "#f9fafb" : "#ffffff"; // zebra rows
      return `
        <tr style="background:${bg}">
          <td style="
            padding:8px 12px;
            font-weight:600;
            background:${bg};
            border-bottom:1px solid #e5e7eb;
            border-right:1px solid #e5e7eb;
            width:40%;
            color:#1e293b;
          ">
            ${k}
          </td>
          <td style="
            padding:8px 12px;
            border-bottom:1px solid #e5e7eb;
            color:#111827;
            font-weight:400;
          ">
            ${pretty(val)}
          </td>
        </tr>
      `;
    })
    .join("");

  return `
    <div style="max-width:520px;font:14px/1.5 system-ui;color:green">
      <div style="
        font-weight:700;
        margin-bottom:10px;
        font-size:18px;
        color:#6b21a8;
      ">
        📍 Ibaan Parcel ${p?.LotNumber ? `• ${p.LotNumber}` : ""}
      </div>
      <div style="
        border:1px solid #e5e7eb;
        border-radius:12px;
        overflow:hidden;
        background:green;
        box-shadow:0 8px 20px rgba(0,0,0,.15);
      ">
        <table style="border-collapse:collapse;width:100%">${rows}</table>
      </div>
    </div>
  `;
}


export default function Geoportal() {
  // ✅ Preselect Taytay Parcels so it renders
  // TODO: Place layer name here to activate accordingly
  const [selected, setSelected] = useState(new Set(["ibaan_parcel_main", "ibaan_roads", "ibaan_rivers", "ibaan_building_footprints"]));
  const [layerOrder, setLayerOrder] = useState(["ibaan_parcel_main", "ibaan_roads", "ibaan_rivers", "ibaan_building_footprints"]);
  const [layerOpacity, setLayerOpacity] = useState({ ibaan_parcel_main: 0.8 });
  const [basemapOpacity, setBasemapOpacity] = useState(1);
  const [activeBase, setActiveBase] = useState("osm-standard");

  const [activeTool, setActiveTool] = useState("none"); // "none" | "query" | "ruler" | "buffer"
  const [bufferRadius, setBufferRadius] = useState(200);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  function toggleLayerById(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const phBounds = useMemo(
    () => [
      [8.0, 116.7], // SW
      [19.5, 130.6], // NE
    ],
    []
  );

  const layerRegistry = useMemo(() => createLayerRegistry(), []);
  const basemapRegistry = useMemo(() => createBasemapRegistry(), []);

  // ✅ Compute Taytay bounds once (for auto-zoom on toggle)
  const ibaanBounds = useMemo(() => geojsonToBounds(IBAAN_PARCELS), []);

  const legendItems = useMemo(
    () => [
      { id: "ecan", title: "ECAN", color: "#0ea5e9", kind: "fill" },
      { id: "hospitals", title: "Hospitals & Health Facilities", color: "#ef4444", kind: "point" },
      { id: "lc2020_palawan", title: "2020 Land Cover Map of Palawan", color: "#22c55e", kind: "fill" },
      { id: "flood_10k_susc", title: "Flood 1:10,000 Susceptibility", color: "#f59e0b", kind: "fill" },
      { id: "roads", title: "Roads", color: "#94a3b8", kind: "line" },
      { id: "ibaan_parcel_main", title: "Ibaan Parcel", color: "#a855f7", kind: "line" },
      { id: "building_info_main", title: "Bldg. Information/Footprints", color: "#7dd3fc", kind: "point" },
    ],
    []
  );

  function toggleLayer(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setLayerOrder((o) => o.filter((x) => x !== id));
      } else {
        next.add(id);
        setLayerOrder((o) => (o.includes(id) ? o : [...o, id]));
        setLayerOpacity((op) => (id in op ? op : { ...op, [id]: 0.8 }));
      }
      return next;
    });
  }

  const selectedIds = useMemo(() => layerOrder.filter((id) => selected.has(id)), [layerOrder, selected]);

  function moveLayer(id, dir) {
    setLayerOrder((prev) => {
      const idx = prev.indexOf(id);
      if (idx < 0) return prev;
      const arr = [...prev];
      const swapWith = dir === "up" ? idx - 1 : idx + 1;
      if (swapWith < 0 || swapWith >= arr.length) return prev;
      [arr[idx], arr[swapWith]] = [arr[swapWith], arr[idx]];
      return arr;
    });
  }

  function removeLayer(id) {
    if (!selected.has(id)) return;
    toggleLayer(id);
  }

  function setOpacity(id, value) {
    setLayerOpacity((prev) => ({ ...prev, [id]: value }));
  }

  const basemapOptions = [
    { id: "osm-standard", title: "OSM Standard" },
    { id: "carto-light", title: "Carto Light" },
    { id: "carto-dark", title: "Carto Dark" },
    { id: "esri-imagery", title: "Esri World Imagery" },
    { id: "opentopo", title: "OpenTopoMap" },
  ];

  return (
    <div style={{ ...styles.root, gridTemplateColumns: sidebarOpen ? "360px 1fr" : "0px 1fr" }}>
      {/* Sidebar */}
      <div style={{ ...styles.sidebarWrap, display: sidebarOpen ? "block" : "none" }} aria-hidden={!sidebarOpen}>
        <DataSourcesUI />
        <Sidebar
            selected={selected}
            onToggleLayer={toggleLayer}
            onToggleLayerById={toggleLayerById} // ← Add this line
            basemapOptions={basemapOptions}
            activeBase={activeBase}
            onChangeBase={setActiveBase}
            activeTool={activeTool}
            onChangeTool={setActiveTool}
            bufferRadius={bufferRadius}
            onChangeBufferRadius={setBufferRadius}
            onPrint={() => window.print()}
        />
        <SelectedLayersManager
          items={selectedIds.map((id) => ({
            id,
            title: legendItems.find((x) => x.id === id)?.title || id,
            opacity: layerOpacity[id] ?? 0.8,
          }))}
          onMoveUp={(id) => moveLayer(id, "up")}
          onMoveDown={(id) => moveLayer(id, "down")}
          onOpacity={(id, v) => setOpacity(id, v)}
          onRemove={(id) => removeLayer(id)}
          basemapOpacity={basemapOpacity}
          onBasemapOpacity={setBasemapOpacity}
          activeBaseTitle={basemapOptions.find((b) => b.id === activeBase)?.title || activeBase}
        />
      </div>

      {/* Right column */}
      <div style={styles.mainWrap}>
        <Topbar
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((s) => !s)}
          onClear={() => {
            setSelected(new Set());
            setLayerOrder([]);
          }}
        />

        <div style={styles.mapFlex}>
          <MapContainer
            center={[121.1288,13.8353]}
            maxBounds={phBounds}
            maxBoundsViscosity={1.0}
            minZoom={6}
            style={{ height: "100%", width: "100%" }}
            zoomControl={true}
          >
            <FitPHOnMount bounds={phBounds} padding={[24, 24]} />
            <RefitOnSidebar trigger={sidebarOpen} bounds={phBounds} padding={[24, 24]} />

            {/* ✅ Search box */}
            <SearchLocationControl />



            {/* ✅ Vector pane above tiles */}
            <Pane name="pane-parcels" style={{ zIndex: 650 }} />
            {/* Markers (search/ruler) pane (above parcels) */}
            <Pane name="pane-parcel-markers" style={{ zIndex: 700 }} />

            {/* Basemap with adjustable opacity */}
            {React.cloneElement(basemapRegistry[activeBase], { opacity: basemapOpacity })}

            {/* Overlays respecting order + opacity */}
            {selectedIds.map((id, index) => {
              const node = layerRegistry[id];
              if (!node) return null;
              const opacity = layerOpacity[id] ?? 0.8;
              const zIndex = 400 + index;
              return React.cloneElement(node, { key: id, opacity, zIndex });
            })}

            {/* Tools */}
            <ToolQuery enabled={activeTool === "query"} />
            <ToolRuler enabled={activeTool === "ruler"} icon={parcelDivIcon} />
            <ToolBuffer enabled={activeTool === "buffer"} radius={bufferRadius} />

            <ScaleControl position="bottomleft" />
            <ZoomControl position="bottomright" />
          </MapContainer>

          {/* Legend */}
          <Legend items={legendItems} activeIds={selectedIds} />
        </div>

        <Footer />
      </div>
    </div>
  );
}

/** Fit Philippines once on mount */
function FitPHOnMount({ bounds, padding = [20, 20] }) {
  const map = useMap();
  React.useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
      map.fitBounds(bounds, { padding });
    }, 0);
  }, [map, bounds, padding]);
  return null;
}

/** Refit after sidebar toggle */
function RefitOnSidebar({ trigger, bounds, padding = [20, 20] }) {
  const map = useMap();
  const prevTriggerRef = React.useRef(trigger);

  React.useEffect(() => {
    // Only refit if the sidebar state actually changed
    if (prevTriggerRef.current === trigger) return;
    prevTriggerRef.current = trigger;

    const t = setTimeout(() => {
      map.invalidateSize();
      map.fitBounds(bounds, { padding });
    }, 250);
    return () => clearTimeout(t);
  }, [map, trigger, bounds, padding]);

  return null;
}

/** Auto-fit helper when a layer becomes enabled */
function FitToBoundsOnToggle({ watchId, enabled, bounds, padding = [24, 24] }) {
  const map = useMap();
  const hasZoomedRef = React.useRef(false);

  React.useEffect(() => {
    // Only run once on initial mount if enabled and bounds exist
    if (!bounds || hasZoomedRef.current) return;

    // Only zoom if the layer is actually enabled on first load
    if (!enabled) return;

    hasZoomedRef.current = true;

    const t = setTimeout(() => {
      try {
        map.fitBounds(bounds, { padding });
      } catch {}
    }, 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once on mount

  return null;
}

/** Compute bounds of a (Multi)Polygon GeoJSON (lon/lat to Leaflet lat/lng) */
function geojsonToBounds(geojson) {
  const b = L.latLngBounds();
  const push = (lng, lat) => b.extend([lat, lng]); // Leaflet expects [lat, lng]
  (geojson.features || []).forEach((f) => {
    const g = f.geometry;
    if (!g) return;
    if (g.type === "Polygon") {
      g.coordinates.forEach((ring) => ring.forEach(([lng, lat]) => push(lng, lat)));
    } else if (g.type === "MultiPolygon") {
      g.coordinates.forEach((poly) => poly.forEach((ring) => ring.forEach(([lng, lat]) => push(lng, lat))));
    }
  });
  return b.isValid() ? b : null;
}

/** Search box using OpenStreetMap Nominatim (no extra packages) */
function SearchLocationControl() {
  const map = useMap();
  const [q, setQ] = React.useState("");
  const [hits, setHits] = React.useState([]);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [chosen, setChosen] = React.useState(null); // {lat, lon, name}

  const boxRef = React.useRef(null);
  const abortRef = React.useRef(null);

  React.useEffect(() => {
    const onDoc = (e) => {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  async function runSearch(text) {
    if (!text || text.trim().length < 2) {
      setHits([]);
      return;
    }
    try {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("q", text);
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("addressdetails", "1");
      url.searchParams.set("limit", "8");
      url.searchParams.set("countrycodes", "ph"); // remove for global
      const res = await fetch(url.toString(), {
        signal: controller.signal,
        headers: { "Accept-Language": "en" },
      });
      if (!res.ok) throw new Error("search failed");
      const data = await res.json();
      setHits(Array.isArray(data) ? data : []);
    } catch (e) {
      if (e.name !== "AbortError") {
        console.error(e);
        setHits([]);
      }
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    const t = setTimeout(() => runSearch(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  function choose(hit) {
    const lat = parseFloat(hit.lat);
    const lon = parseFloat(hit.lon);
    const name = hit.display_name;
    setChosen({ lat, lon, name });
    setOpen(false);
    setQ(name);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      map.flyTo([lat, lon], 16, { duration: 0.8 });
    }
  }

  return (
    <>
      {/* UI overlay */}
      <div
        ref={boxRef}
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 1000,
          width: 340,
          maxWidth: "calc(100vw - 24px)",
          boxShadow: "0 8px 24px rgba(0,0,0,.35)",
          borderRadius: 12,
          overflow: "hidden",
          background: "rgba(20,24,40,.9)",
          backdropFilter: "blur(6px)",
          border: "1px solid rgba(255,255,255,.08)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", padding: "8px 10px", gap: 8 }}>
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search place, barangay, city…"
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,.12)",
              background: "rgba(12,16,28,.9)",
              color: "white",
              font: "14px/1.2 system-ui",
              outline: "none",
            }}
          />
          <button
            onClick={() => runSearch(q)}
            title="Search"
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,.12)",
              background: "rgba(12,16,28,.9)",
              color: "white",
              font: "14px/1.2 system-ui",
              cursor: "pointer",
            }}
          >
            Search
          </button>
        </div>

        {open && (loading || hits.length > 0) && (
          <div
            style={{
              maxHeight: 320,
              overflow: "auto",
              borderTop: "1px solid rgba(255,255,255,.06)",
              background: "rgba(14,18,32,.95)",
            }}
          >
            {loading && (
              <div style={{ padding: 12, color: "#9ca3af", font: "13px/1.3 system-ui" }}>Searching…</div>
            )}
            {!loading &&
              hits.map((h) => (
                <div
                  key={h.place_id}
                  onClick={() => choose(h)}
                  style={{
                    padding: "10px 12px",
                    cursor: "pointer",
                    color: "white",
                    font: "13px/1.35 system-ui",
                    borderBottom: "1px solid rgba(255,255,255,.05)",
                    display: "flex",
                    gap: 8,
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <div style={{ opacity: 0.95, whiteSpace: "nowrap" }}>Result</div>
                  <div style={{ opacity: 0.95, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {h.display_name}
                  </div>
                </div>
              ))}
            {!loading && hits.length === 0 && q.trim().length >= 2 && (
              <div style={{ padding: 12, color: "#9ca3af", font: "13px/1.3 system-ui" }}>No results</div>
            )}
          </div>
        )}
      </div>

      {/* Marker on chosen search result */}
      {chosen && (
        <Marker position={[chosen.lat, chosen.lon]} icon={parcelDivIcon} pane="pane-parcel-markers">
          <Tooltip permanent offset={[0, -12]}>{chosen.name}</Tooltip>
        </Marker>
      )}
    </>
  );
}

/** Query tool */
function ToolQuery({ enabled }) {
  const map = useMap();
  React.useEffect(() => {
    if (!enabled) return;
    const onClick = (e) => {
      const { lat, lng } = e.latlng;
      L.popup()
        .setLatLng(e.latlng)
        .setContent(
          `<div style="font:12px/1.3 system-ui">Lat: ${lat.toFixed(5)}<br/>Lng: ${lng.toFixed(5)}</div>`
        )
        .openOn(map);
    };
    map.on("click", onClick);
    return () => {
      map.off("click", onClick);
      map.closePopup();
    };
  }, [map, enabled]);
  return null;
}

/** Ruler tool */
function ToolRuler({ enabled, icon }) {
  const [pts, setPts] = React.useState([]);
  const map = useMap();

  useMapEvents({
    click: (e) => {
      if (!enabled) return;
      setPts((prev) => [...prev, e.latlng]);
    },
  });

  React.useEffect(() => {
    if (!enabled) {
      setPts([]);
      return;
    }
    const onKey = (ev) => {
      if (ev.key === "Escape") setPts([]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);

  const totalMeters = React.useMemo(() => {
    if (pts.length < 2) return 0;
    let m = 0;
    for (let i = 1; i < pts.length; i++) m += map.distance(pts[i - 1], pts[i]);
    return m;
  }, [pts, map]);

  if (!enabled) return null;

  return (
    <>
      {pts.length > 0 && <Polyline positions={pts} pathOptions={{ weight: 4 }} />}
      {pts.map((p, i) => (
        <Marker key={i} position={p} icon={icon} pane="pane-parcel-markers">
          <Tooltip permanent offset={[0, -12]}>
            {i === pts.length - 1
              ? totalMeters > 1000
                ? `${(totalMeters / 1000).toFixed(2)} km`
                : `${Math.round(totalMeters)} m`
              : `${i + 1}`}
          </Tooltip>
        </Marker>
      ))}
    </>
  );
}

/** Buffer tool */
function ToolBuffer({ enabled, radius }) {
  const [center, setCenter] = React.useState(null);
  useMapEvents({
    click: (e) => {
      if (!enabled) return;
      setCenter(e.latlng);
    },
  });
  if (!enabled || !center) return null;
  return <Circle center={center} radius={Math.max(1, Number(radius) || 0)} pathOptions={{ weight: 2 }} />;
}

/** Styles */
const styles = {
  root: {
    display: "grid",
    gridTemplateColumns: "360px 1fr",
    height: "100vh",
    width: "100%",
    overflow: "hidden",
    background: "#0b1020",
    transition: "grid-template-columns .2s ease",
  },
  sidebarWrap: {
    minWidth: 0,
    borderRight: "1px solid rgba(255,255,255,.06)",
    overflow: "auto",
  },
  mainWrap: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    height: "100%",
  },
  mapFlex: {
    flex: 1,
    minHeight: 0,
    position: "relative",
  },
};

/** Overlay registry:
 *  - Click a parcel polygon → show tooltip (with only the requested fields)
 */
function createLayerRegistry() {
  const format = "image/png";
  const transparent = true;

  // ✅ Readable parcel style
  const taytayStyle = {
    color: "#a855f7",
    weight: 3,
    opacity: 1,
    fillColor: "#111",
  };

  const ibaanData = IBAAN_PARCELS;

  const onEachTaytayFeature = (feature, layer) => {
    const props = feature?.properties || {};

    const attach = (lyr) => {
      try {
        lyr.setStyle?.({ weight: 3, fillOpacity: 0.20, color: "#a855f7", fillColor: "#a855f7" });
      } catch {}
      lyr.on?.({
        mouseover: (e) => {
          e.target.setStyle({ weight: 5, fillOpacity: 0.32 });
          try { e.target.bringToFront(); } catch {}
        },
        mouseout: (e) => e.target.setStyle({ weight: 3, fillOpacity: 0.20 }),
        click: (e) => {
          // Where to show the tooltip: polygon center (fallback to click)
          let at = null;
          try { at = e.target.getBounds?.().getCenter?.(); } catch {}
          if (!at) at = e.latlng;

          const html = parcelTooltipHTML(props);

          // Re-bind fresh tooltip and open it
          try { e.target.unbindTooltip(); } catch {}
          e.target.bindTooltip(html, {
            direction: "top",
            sticky: true,
            opacity: 1,
            className: "parcel-tooltip",
          });
          try { e.target.openTooltip(at); } catch {}
        },
      });
    };

    if (typeof layer.eachLayer === "function") {
      layer.eachLayer((child) => attach(child));
    } else {
      attach(layer);
    }

    // pointer cursor
    try {
      const paneEl = layer.getPane?.() || layer._path?.parentElement;
      if (paneEl && paneEl.style) paneEl.style.cursor = "pointer";
    } catch {}
  };

    return {
    ibaan_roads: (
      <GeoJSON
          data={ROADS}
          style={() => ({
            color: "#ff4444",
            weight: 2,
            fillOpacity: 0,
          })}
          pane="pane-parcels"
      />
    ),

    ibaan_rivers: (
          <GeoJSON
              data={RIVERS}
              style={() => ({
                color: "#0077ff",
                weight: 2,
                fillOpacity: 0,
              })}
              pane="pane-parcels"
          />
      ),

      ibaan_building_footprints: (
          <GeoJSON
              data={IBAAN_BUILDING_FOOTPRINT}
              style={() => ({
                color: "#00bb00",
                weight: 2,
                fillColor: "#00ff00",
                fillOpacity: 0.2,
              })}
              pane="pane-parcels"
          />
      ),

      ibaan_parcel_main: (
          <GeoJSON
              data={ibaanData}
              style={() => taytayStyle}
              onEachFeature={onEachTaytayFeature}
              pane="pane-parcels"
              interactive={true}
              bubblingMouseEvents={true}
          />
      ),

    // (Optional) WMS placeholders
    building_info_main: (
      <WMSTileLayer
        url="https://demo.geo-solutions.it/geoserver/wms"
        params={{ layers: "topp:states", format, transparent }}
        opacity={0.9}
      />
    ),
    building_footprints: (
      <WMSTileLayer
        url="https://demo.geo-solutions.it/geoserver/wms"
        params={{ layers: "nurc:Img_Sample", format, transparent }}
        opacity={0.7}
      />
    ),
  };
}

/** Basemap registry */
function createBasemapRegistry() {
  return {
    "osm-standard": (
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="© OpenStreetMap contributors"
        noWrap={true}
      />
    ),
    "carto-light": (
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution="© OpenStreetMap contributors © CARTO"
        noWrap={true}
      />
    ),
    "carto-dark": (
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution="© OpenStreetMap contributors © CARTO"
        noWrap={true}
      />
    ),
    "esri-imagery": (
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        attribution="Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
        noWrap={true}
      />
    ),
    opentopo: (
      <TileLayer
        url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
        attribution="Map data © OpenStreetMap contributors, SRTM — Map style © OpenTopoMap (CC-BY-SA)"
        noWrap={true}
      />
    ),
  };
}
