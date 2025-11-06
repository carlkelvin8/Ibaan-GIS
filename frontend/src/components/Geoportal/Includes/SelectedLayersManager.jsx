// src/components/Geoportal/Includes/SelectedLayersManager.jsx
import React from "react";

export default function SelectedLayersManager({
  items = [],
  onMoveUp,
  onMoveDown,
  onOpacity,
  onRemove,
  basemapOpacity = 1,
  onBasemapOpacity,
  activeBaseTitle = "Basemap",
  /** Optional: cap the panel height to avoid overlapping nearby UI */
  maxHeight = "48vh",
}) {
  return (
    <section style={{ ...S.wrap, maxHeight }}>
      <header style={S.head}>
        <div style={S.titleRow}>
          <span style={S.badge}>🗂️</span>
          <div>
            <div style={S.title}>Selected Layers</div>
            <div style={S.sub}>Manage order, visibility & opacity</div>
          </div>
        </div>
      </header>

      <div style={{ ...S.body, maxHeight: `calc(${maxHeight} - 58px)` }}>
        {/* Basemap block */}
        <div style={S.baseRow}>
          <div style={S.baseTop}>
            <div style={S.baseTitle}>{activeBaseTitle}</div>
            <span style={S.pctBadge}>{Math.round(basemapOpacity * 100)}%</span>
          </div>
          <div style={S.sliderRow}>
            <input
              style={S.slider}
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={basemapOpacity}
              onChange={(e) => onBasemapOpacity?.(parseFloat(e.target.value))}
              aria-label="Basemap opacity"
            />
          </div>
        </div>

        {/* Overlays */}
        {items.length === 0 ? (
          <div style={S.empty}>No active overlays.</div>
        ) : (
          <div style={S.list}>
            {items.map((it, idx) => {
              const pct = Math.round((it.opacity ?? 0.8) * 100);
              const isTop = idx === items.length - 1;
              const isBottom = idx === 0;
              return (
                <div key={it.id} style={S.item} title={it.title}>
                  <div style={S.itemHead}>
                    <div style={S.titleWrap}>
                      <strong style={S.titleText}>{it.title}</strong>
                      <div style={S.code}>{it.id}</div>
                    </div>
                    <div style={S.actions}>
                      <button
                        style={{ ...S.iconBtn, ...(isBottom ? S.disabled : {}) }}
                        disabled={isBottom}
                        onClick={() => onMoveDown?.(it.id)}
                        title="Move down (behind)"
                        aria-label="Move down"
                      >
                        ▼
                      </button>
                      <button
                        style={{ ...S.iconBtn, ...(isTop ? S.disabled : {}) }}
                        disabled={isTop}
                        onClick={() => onMoveUp?.(it.id)}
                        title="Move up (in front)"
                        aria-label="Move up"
                      >
                        ▲
                      </button>
                      <button
                        style={S.removeBtn}
                        onClick={() => onRemove?.(it.id)}
                        title="Remove layer"
                        aria-label="Remove layer"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <div style={S.itemControls}>
                    <input
                      style={S.slider}
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={it.opacity ?? 0.8}
                      onChange={(e) =>
                        onOpacity?.(it.id, parseFloat(e.target.value))
                      }
                      aria-label={`${it.title} opacity`}
                    />
                    <span style={S.pct}>{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

const S = {
  /* Panel */
  wrap: {
    margin: "8px 8px 14px",
    border: "1px solid rgba(255,255,255,.08)",
    borderRadius: 12,
    background: "linear-gradient(180deg,#11172b,#0f1526)",
    color: "#e5ecff",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 8px 30px rgba(0,0,0,.25)",
  },
  head: {
    position: "sticky",
    top: 0,
    zIndex: 1,
    padding: "10px 12px",
    borderBottom: "1px solid rgba(255,255,255,.08)",
    background: "linear-gradient(180deg,#101635,#0f152b)",
  },
  titleRow: { display: "flex", alignItems: "center", gap: 10 },
  badge: {
    width: 26,
    height: 26,
    display: "grid",
    placeItems: "center",
    borderRadius: 8,
    background: "rgba(148,187,255,.18)",
    border: "1px solid rgba(148,187,255,.34)",
  },
  title: { fontWeight: 800, fontSize: 14, letterSpacing: 0.2 },
  sub: { fontSize: 12, color: "#a8b2c8" },

  /* Body (scrolls) */
  body: {
    padding: "10px 10px 12px",
    display: "grid",
    gap: 10,
    overflowY: "auto",
  },

  /* Basemap block */
  baseRow: {
    padding: "10px",
    border: "1px solid rgba(255,255,255,.1)",
    background: "rgba(255,255,255,.03)",
    borderRadius: 10,
    display: "grid",
    gap: 8,
  },
  baseTop: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  baseTitle: { fontWeight: 800, fontSize: 13 },
  pctBadge: {
    marginLeft: "auto",
    fontSize: 12,
    padding: "2px 8px",
    borderRadius: 999,
    background: "rgba(255,255,255,.06)",
    border: "1px solid rgba(255,255,255,.12)",
  },

  /* Shared controls */
  sliderRow: { display: "flex", alignItems: "center", gap: 10 },
  slider: {
    width: "100%",
    accentColor: "#79a8ff",
    cursor: "pointer",
  },
  pct: { fontVariantNumeric: "tabular-nums", opacity: 0.9, minWidth: 42, textAlign: "right" },

  /* Empty */
  empty: { padding: "8px 10px", color: "#a8b2c8", fontSize: 13 },

  /* List */
  list: { display: "grid", gap: 8 },

  /* Item */
  item: {
    border: "1px solid rgba(255,255,255,.1)",
    background: "rgba(255,255,255,.03)",
    borderRadius: 10,
    padding: "10px",
    display: "grid",
    gap: 8,
  },
  itemHead: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
  },
  titleWrap: {
    minWidth: 0,
    display: "grid",
    gap: 2,
  },
  titleText: {
    fontWeight: 700,
    fontSize: 13,
    lineHeight: 1.25,
    wordBreak: "break-word",
    overflowWrap: "anywhere",
  },
  code: {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 11,
    color: "#9fb2da",
    opacity: 0.9,
    maxWidth: "48ch",
    wordBreak: "break-all",
  },

  /* Actions */
  actions: {
    marginLeft: "auto",
    display: "flex",
    gap: 6,
    flexWrap: "nowrap",
  },
  iconBtn: {
    background: "rgba(255,255,255,.06)",
    color: "#e5ecff",
    border: "1px solid rgba(255,255,255,.2)",
    borderRadius: 6,
    padding: "4px 8px",
    cursor: "pointer",
    lineHeight: 1,
    transition: "transform .08s ease, background .12s ease, border-color .12s ease",
  },
  removeBtn: {
    background: "rgba(255,120,120,.12)",
    color: "#ffc7c7",
    border: "1px solid rgba(255,120,120,.35)",
    borderRadius: 6,
    padding: "4px 8px",
    cursor: "pointer",
    lineHeight: 1,
    transition: "transform .08s ease, background .12s ease, border-color .12s ease",
  },
  disabled: {
    opacity: 0.5,
    cursor: "not-allowed",
    filter: "saturate(.7)",
  },

  /* Item controls row */
  itemControls: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    alignItems: "center",
    gap: 10,
  },
};
