// src/components/Geoportal/Includes/DataSourcesUI.jsx
import React from "react";

/**
 * UI-only Data Sources panel (no overlap version)
 * - Flex column shell (minHeight:0)
 * - Sticky header; body scrolls (flex:1, minHeight:0, overflowY:auto)
 * - Same API: onPreview, onAdd, maxHeight? = "60vh"
 */
export default function DataSourcesUI({ onPreview, onAdd, maxHeight = "60vh" }) {
  const [tab, setTab] = React.useState("wms"); // 'wms' | 'wmts' | 'wfs'
  return (
    <section style={{ ...S.wrap, maxHeight }}>
      <header style={S.head}>
        <div style={S.titleRow}>
          <span style={S.glyph}>📡</span>
          <div>
            <div style={S.title}>Add Data Sources</div>
            <div style={S.sub}>WMS • WMTS/XYZ • WFS (UI only)</div>
          </div>
        </div>

        <nav style={S.tabs} role="tablist" aria-label="Data source type">
          {[
            { key: "wms", label: "WMS" },
            { key: "wmts", label: "WMTS / XYZ" },
            { key: "wfs", label: "WFS" },
          ].map(({ key, label }) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              aria-controls={`panel-${key}`}
              id={`tab-${key}`}
              onClick={() => setTab(key)}
              style={{ ...S.tab, ...(tab === key ? S.tabActive : null) }}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      {/* IMPORTANT: flex:1 + minHeight:0 + overflowY:auto to avoid overlap */}
      <div style={S.body}>
        <div id="panel-wms" role="tabpanel" aria-labelledby="tab-wms" hidden={tab !== "wms"}>
          {tab === "wms" && <WMSUI onPreview={onPreview} onAdd={onAdd} />}
        </div>
        <div id="panel-wmts" role="tabpanel" aria-labelledby="tab-wmts" hidden={tab !== "wmts"}>
          {tab === "wmts" && <WMTSUI onPreview={onPreview} onAdd={onAdd} />}
        </div>
        <div id="panel-wfs" role="tabpanel" aria-labelledby="tab-wfs" hidden={tab !== "wfs"}>
          {tab === "wfs" && <WFSUI onPreview={onPreview} onAdd={onAdd} />}
        </div>
      </div>
    </section>
  );
}

/* ---------------- WMS (UI only) ---------------- */
function WMSUI({ onPreview, onAdd }) {
  const [url, setUrl] = React.useState("");
  const [format, setFormat] = React.useState("image/png");
  const [transparent, setTransparent] = React.useState(true);
  const [opacity, setOpacity] = React.useState(0.8);

  const [checked, setChecked] = React.useState(new Set());
  const mockLayers = React.useMemo(
    () => [
      { name: "topp:states", title: "US States" },
      { name: "tiger:roads", title: "TIGER Roads" },
      { name: "nurc:Img_Sample", title: "Sample Image" },
    ],
    []
  );
  const toggle = (name) =>
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  const payload = React.useMemo(
    () => ({
      type: "wms",
      url,
      format,
      transparent,
      opacity,
      selected: Array.from(checked),
    }),
    [url, format, transparent, opacity, checked]
  );

  return (
    <div style={S.panel}>
      <div style={S.group}>
        <label style={S.row}>
          <span style={S.label}>Saved endpoints (mock)</span>
          <select style={S.select} onChange={(e) => setUrl(e.target.value)} value={url}>
            <option value="">Select…</option>
            <option value="https://demo.geo-solutions.it/geoserver/wms">GeoSolutions Demo WMS</option>
            <option value="https://ahocevar.com/geoserver/wms">ahocevar WMS</option>
          </select>
        </label>

        <label style={S.row}>
          <span style={S.label}>WMS URL</span>
          <input
            style={S.input}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://server/geoserver/wms"
          />
        </label>

        <div style={S.rowInline3}>
          <label style={S.rowSm}>
            <span style={S.label}>Format</span>
            <select style={S.select} value={format} onChange={(e) => setFormat(e.target.value)}>
              <option>image/png</option>
              <option>image/png8</option>
              <option>image/jpeg</option>
            </select>
          </label>

          <label style={S.rowSm}>
            <span style={S.label}>Opacity</span>
            <div style={S.rangeWithPct}>
              <input
                style={S.range}
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                aria-label="WMS opacity"
              />
              <span style={S.pct}>{Math.round(opacity * 100)}%</span>
            </div>
          </label>

          <label style={{ ...S.rowSm, ...S.check }}>
            <input
              style={S.checkbox}
              type="checkbox"
              checked={transparent}
              onChange={(e) => setTransparent(e.target.checked)}
            />
            <span>Transparent</span>
          </label>

          <button
            type="button"
            style={S.mini}
            onClick={() => {
              setOpacity(0.8);
              setTransparent(true);
            }}
            title="Reset opacity & transparency"
          >
            Reset
          </button>
        </div>
      </div>

  

      <div style={S.actions}>
        <button style={S.ghost} onClick={() => onPreview?.(payload)}>
          Preview
        </button>
        <div style={{ flex: 1 }} />
        <button style={S.primary} onClick={() => onAdd?.(payload)}>
          + Add
        </button>
        <button
          style={S.ghost}
          onClick={() => navigator.clipboard?.writeText(JSON.stringify(payload, null, 2))}
          title="Copy JSON payload"
        >
          Copy JSON
        </button>
      </div>
    </div>
  );
}

/* ---------------- WMTS / XYZ (UI only) ---------------- */
function WMTSUI({ onPreview, onAdd }) {
  const [templateUrl, setTemplateUrl] = React.useState("");
  const [title, setTitle] = React.useState("Custom tiles");
  const [attribution, setAttribution] = React.useState("Custom");
  const [opacity, setOpacity] = React.useState(1);

  const payload = React.useMemo(
    () => ({ type: "wmts", templateUrl, title, attribution, opacity }),
    [templateUrl, title, attribution, opacity]
  );

  return (
    <div style={S.panel}>
      <div style={S.group}>
        <label style={S.row}>
          <span style={S.label}>Saved endpoints (mock)</span>
          <select style={S.select} onChange={(e) => setTemplateUrl(e.target.value)} value={templateUrl}>
            <option value="">Select…</option>
            <option value="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png">OSM Standard (XYZ)</option>
            <option value="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png">OpenTopoMap (XYZ)</option>
            <option value="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}">
              Esri World Imagery (XYZ)
            </option>
          </select>
        </label>

        <label style={S.row}>
          <span style={S.label}>XYZ/WMTS Template</span>
          <input
            style={S.input}
            value={templateUrl}
            onChange={(e) => setTemplateUrl(e.target.value)}
            placeholder="https://tiles.server.com/tiles/{z}/{x}/{y}.png"
          />
        </label>

        <div style={S.rowInline2}>
          <label style={S.rowSm}>
            <span style={S.label}>Title</span>
            <input style={S.input} value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label style={S.rowSm}>
            <span style={S.label}>Attribution</span>
            <input style={S.input} value={attribution} onChange={(e) => setAttribution(e.target.value)} />
          </label>
          <label style={S.rowSm}>
            <span style={S.label}>Opacity</span>
            <div style={S.rangeWithPct}>
              <input
                style={S.range}
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                aria-label="WMTS opacity"
              />
              <span style={S.pct}>{Math.round(opacity * 100)}%</span>
            </div>
          </label>

          <button
            type="button"
            style={S.mini}
            onClick={() => setOpacity(1)}
            title="Reset opacity"
          >
            Reset
          </button>
        </div>
      </div>

      <div style={S.actions}>
        <button style={S.ghost} onClick={() => onPreview?.(payload)}>
          Preview
        </button>
        <div style={{ flex: 1 }} />
        <button style={S.primary} onClick={() => onAdd?.(payload)}>
          + Add
        </button>
        <button
          style={S.ghost}
          onClick={() => navigator.clipboard?.writeText(JSON.stringify(payload, null, 2))}
          title="Copy JSON payload"
        >
          Copy JSON
        </button>
      </div>
    </div>
  );
}

/* ---------------- WFS (UI only) ---------------- */
function WFSUI({ onPreview, onAdd }) {
  const [url, setUrl] = React.useState("");
  thead;
  const [color, setColor] = React.useState("#ff3b3b");
  const [weight, setWeight] = React.useState(2);

  const [checked, setChecked] = React.useState(new Set());
  const mockTypes = React.useMemo(
    () => ["topp:states", "tiger:tl_2010_us_county10", "osm:water_areas", "custom:hazard_zones"],
    []
  );
  const toggle = (name) =>
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  const payload = React.useMemo(
    () => ({ type: "wfs", url, selected: Array.from(checked), color, weight }),
    [url, checked, color, weight]
  );

  return (
    <div style={S.panel}>
      <div style={S.group}>
        <label style={S.row}>
          <span style={S.label}>Saved endpoints (mock)</span>
          <select style={S.select} onChange={(e) => setUrl(e.target.value)} value={url}>
            <option value="">Select…</option>
            <option value="https://demo.geo-solutions.it/geoserver/wfs">GeoSolutions Demo WFS</option>
            <option value="https://ahocevar.com/geoserver/wfs">ahocevar WFS</option>
          </select>
        </label>

        <label style={S.row}>
          <span style={S.label}>WFS URL</span>
          <input
            style={S.input}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://server/geoserver/wfs"
          />
        </label>

        <div style={S.rowInline3}>
          <label style={S.rowSm}>
            <span style={S.label}>Stroke color</span>
            <input
              style={{ ...S.input, padding: 0, height: 36 }}
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              aria-label="Stroke color"
            />
          </label>
          <label style={S.rowSm}>
            <span style={S.label}>Stroke weight</span>
            <div style={S.rangeWithPct}>
              <input
                style={S.range}
                type="range"
                min={1}
                max={8}
                step={1}
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                aria-label="Stroke weight"
              />
              <span style={S.pct}>{weight}px</span>
            </div>
          </label>

          <button
            type="button"
            style={S.mini}
            onClick={() => {
              setColor("#ff3b3b");
              setWeight(2);
            }}
            title="Reset style"
          >
            Reset
          </button>
        </div>
      </div>

      <div style={S.card}>
        <div style={S.cardHead}>
          <div>Feature Types (mock)</div>
          <div style={S.cardSub}>Choose feature types to request</div>
        </div>

        {/* Inner scroll prevents panel growth */}
        <div style={S.list}>
          {mockTypes.map((name) => (
            <label key={name} style={S.listRow}>
              <input
                style={S.checkbox}
                type="checkbox"
                checked={checked.has(name)}
                onChange={() => toggle(name)}
              />
              <div style={S.listCol}>
                <strong style={S.listTitle}>{name}</strong>
                <code style={S.code}>{name}</code>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div style={S.actions}>
        <button style={S.ghost} onClick={() => onPreview?.(payload)}>
          Preview
        </button>
        <div style={{ flex: 1 }} />
        <button style={S.primary} onClick={() => onAdd?.(payload)}>
          + Add
        </button>
        <button
          style={S.ghost}
          onClick={() => navigator.clipboard?.writeText(JSON.stringify(payload, null, 2))}
          title="Copy JSON payload"
        >
          Copy JSON
        </button>
      </div>
    </div>
  );
}

/* ---------------- Styles ---------------- */
const S = {
  /* Shell */
  wrap: {
    border: "1px solid rgba(255,255,255,.08)",
    borderRadius: 12,
    margin: "8px 8px 12px",
    background: "linear-gradient(180deg,#11172b,#0f1526)",
    color: "#e5ecff",
    boxShadow: "0 8px 30px rgba(0,0,0,.25)",
    display: "flex",
    flexDirection: "column",
    minHeight: 0,              // key: allow child to shrink
    overflow: "hidden",
  },
  head: {
    position: "sticky",
    top: 0,
    zIndex: 2,
    background: "linear-gradient(180deg,#101635,#0f152b)",
    borderBottom: "1px solid rgba(255,255,255,.08)",
    padding: "10px 12px",
    display: "grid",
    gap: 8,
  },
  body: {
    flex: 1,                   // key: fill remaining height
    minHeight: 0,              // key: allow scrolling instead of overflow
    overflowY: "auto",         // key: scrolls here
    padding: "10px 10px 12px",
    display: "grid",
    gap: 12,
  },

  /* Header bits */
  titleRow: { display: "flex", alignItems: "center", gap: 10 },
  glyph: {
    width: 26, height: 26, display: "grid", placeItems: "center",
    borderRadius: 8, background: "rgba(121,168,255,.16)",
    border: "1px solid rgba(121,168,255,.38)",
  },
  title: { fontWeight: 800, fontSize: 14, letterSpacing: 0.2 },
  sub: { fontSize: 12, color: "#a8b2c8" },
  tabs: { display: "flex", gap: 6, flexWrap: "wrap" },
  tab: {
    all: "unset",
    cursor: "pointer",
    padding: "6px 12px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,.18)",
    color: "#cfe0ff",
    background: "rgba(255,255,255,.06)",
    fontSize: 12,
    lineHeight: 1,
  },
  tabActive: {
    background: "linear-gradient(180deg,#4f8cff,#79a8ff)",
    color: "#06122e",
    fontWeight: 800,
    borderColor: "transparent",
  },

  /* Panels */
  panel: { display: "grid", gap: 12, minWidth: 0 },
  group: {
    display: "grid",
    gap: 10,
    padding: 10,
    border: "1px solid rgba(255,255,255,.08)",
    borderRadius: 10,
    background: "rgba(255,255,255,.03)",
    minWidth: 0,
  },

  /* Rows & Inputs */
  row: { display: "grid", gap: 6, fontSize: 13, minWidth: 0 },
  rowInline2: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 10 },
  rowInline3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 10 },
  rowSm: { display: "grid", gap: 6, fontSize: 12, minWidth: 0 },
  check: { alignItems: "end", gridAutoFlow: "column", gridTemplateColumns: "auto 1fr", gap: 8 },

  label: { fontSize: 12, color: "#a8b2c8" },
  input: {
    height: 36,
    padding: "8px 10px",
    borderRadius: 10,
    background: "rgba(255,255,255,.06)",
    border: "1px solid rgba(255,255,255,.18)",
    color: "#e5ecff",
    outline: "none",
    minWidth: 0,
  },
  select: {
    height: 36,
    padding: "6px 34px 6px 10px",
    borderRadius: 10,
    background: "rgba(255,255,255,.06)",
    border: "1px solid rgba(255,255,255,.18)",
    color: "#e5ecff",
    outline: "none",
    appearance: "none",
    backgroundImage:
      "linear-gradient(45deg, transparent 50%, #cfe0ff 50%), linear-gradient(135deg, #cfe0ff 50%, transparent 50%)",
    backgroundPosition: "right 12px top 16px, right 6px top 16px",
    backgroundSize: "6px 6px, 6px 6px",
    backgroundRepeat: "no-repeat",
    minWidth: 0,
  },
  rangeWithPct: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: 8,
    alignItems: "center",
    minWidth: 0,
  },
  range: { width: "100%", accentColor: "#79a8ff", cursor: "pointer" },
  pct: { fontVariantNumeric: "tabular-nums", opacity: 0.9, minWidth: 40, textAlign: "right" },
  checkbox: { width: 16, height: 16, accentColor: "#79a8ff", cursor: "pointer" },

  /* Actions */
  actions: { display: "flex", alignItems: "center", gap: 10, marginTop: 2, minWidth: 0 },
  ghost: {
    background: "transparent",
    border: "1px solid rgba(255,255,255,.2)",
    borderRadius: 10,
    padding: "8px 12px",
    color: "#e8ecf7",
    cursor: "pointer",
    fontWeight: 600,
  },
  primary: {
    background: "linear-gradient(180deg,#4f8cff,#79a8ff)",
    border: "none",
    color: "#06122e",
    fontWeight: 800,
    borderRadius: 10,
    padding: "8px 12px",
    cursor: "pointer",
  },
  mini: {
    justifySelf: "start",
    background: "rgba(255,255,255,.06)",
    border: "1px solid rgba(255,255,255,.2)",
    color: "#e8ecf7",
    borderRadius: 10,
    padding: "8px 12px",
    cursor: "pointer",
    fontSize: 12,
    lineHeight: 1,
    height: 36,
  },

  /* Cards & Lists */
  card: {
    border: "1px solid rgba(255,255,255,.08)",
    borderRadius: 10,
    background: "rgba(255,255,255,.03)",
    overflow: "hidden",
    minWidth: 0,
  },
  cardHead: {
    padding: "10px 12px",
    borderBottom: "1px solid rgba(255,255,255,.08)",
    fontWeight: 800,
    fontSize: 13,
    display: "grid",
    gap: 2,
  },
  cardSub: { fontSize: 12, color: "#a8b2c8" },

  // List has its own scroll so the panel doesn’t expand infinitely
  list: { maxHeight: 220, overflow: "auto", display: "grid", gap: 8, padding: 10, minWidth: 0 },
  listRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    border: "1px solid rgba(255,255,255,.1)",
    background: "rgba(255,255,255,.03)",
    borderRadius: 10,
    padding: "8px 10px",
    minWidth: 0,
  },
  listCol: { display: "grid", lineHeight: 1.2, minWidth: 0 },
  listTitle: { fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  code: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 11, color: "#9fb2da" },
};
