// src/components/Geoportal/Includes/Legend.jsx
import React from "react";


export default function Legend({
  items = [],
  activeIds = [],
  defaultCompact = false,
  position = "topright",
  offset = [12, 12],
}) {
  const activeSet = React.useMemo(
    () => (activeIds instanceof Set ? activeIds : new Set(activeIds)),
    [activeIds]
  );

  const [activeOnly, setActiveOnly] = React.useState(false);
  const [compact, setCompact] = React.useState(defaultCompact);

  const total = items.length;
  const activeCount = React.useMemo(
    () => items.reduce((n, it) => n + (activeSet.has(it.id) ? 1 : 0), 0),
    [items, activeSet]
  );

  const visibleItems = React.useMemo(() => {
    if (!activeOnly) return items;
    return items.filter((it) => activeSet.has(it.id));
  }, [items, activeOnly, activeSet]);

  const wrapStyle = getWrapStyle(position, offset);

  return (
    <aside style={wrapStyle} aria-label="Map legend">
      <div style={styles.card} role="region" aria-live="polite">
        {/* Header */}
        <div style={styles.head}>
          <div style={styles.headL}>
            <span style={styles.logo} aria-hidden>⬢</span>
            <div style={styles.titles}>
              <div style={styles.titleRow}>
                <span style={styles.title}>Layers Legend</span>
              
              </div>
              <span style={styles.subtitle}>Color keys & visibility status</span>
            </div>
          </div>

          <div style={styles.headR}>
            <label style={styles.toggle} title="Show only active layers">
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={(e) => setActiveOnly(e.target.checked)}
              />
              <span aria-hidden />
              <span style={styles.toggleLbl}>Active</span>
            </label>

            <button
              style={styles.iconBtn}
              onClick={() => setCompact((c) => !c)}
              aria-pressed={compact}
              title={compact ? "Expand legend" : "Compact legend"}
            >
              {compact ? <ExpandIcon /> : <CompactIcon />}
            </button>
          </div>
        </div>

        {!compact && (
          <>
            <div style={styles.body}>
              {visibleItems.length === 0 ? (
                <div style={styles.empty}>
                  {activeOnly ? "No active layers yet." : "No layers defined."}
                </div>
              ) : (
                <div style={styles.grid}>
                  {visibleItems.map((it) => {
                    const isActive = activeSet.has(it.id);
                    return (
                      <div
                        key={it.id}
                        style={{
                          ...styles.row,
                          opacity: isActive ? 1 : 0.5,
                          outline: isActive
                            ? "1px solid rgba(124, 165, 255, .35)"
                            : "1px solid rgba(255,255,255,.08)",
                          boxShadow: isActive
                            ? "inset 0 0 0 1px rgba(124,165,255,.15), 0 6px 16px rgba(0,0,0,.35)"
                            : "inset 0 0 0 1px rgba(255,255,255,.04)",
                        }}
                        title={isActive ? "Visible on map" : "Not visible"}
                      >
                        <LegendSymbol color={it.color} kind={it.kind} />
                        <div style={styles.rowText}>
                          <span style={styles.rowTitle}>{it.title}</span>
                          <span style={styles.rowMeta}>{it.color}</span>
                        </div>
                        <span
                          aria-hidden
                          style={{
                            ...styles.dot,
                            background: isActive ? "#7ea8ff" : "#97a4c2",
                            boxShadow: isActive
                              ? "0 0 0 4px rgba(126,168,255,.15)"
                              : "none",
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={styles.foot}>
              <div style={styles.scaleWrap} aria-hidden>
                <div style={{ ...styles.scale, background: gradient() }} />
              </div>
              <span style={styles.footText}>
                Legend colors are symbolic and may not reflect exact symbology.
              </span>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

/** Corner placement helper */
function getWrapStyle(position, [ox, oy]) {
  const base = {
    position: "absolute",
    zIndex: 1000,
    pointerEvents: "none",
  };
  if (position === "topright") return { ...base, top: oy, right: ox };
  if (position === "topleft") return { ...base, top: oy, left: ox };
  if (position === "bottomright") return { ...base, bottom: oy, right: ox };
  // bottomleft
  return { ...base, bottom: oy, left: ox };
}

/** Symbol renderer for fill | line | point */
function LegendSymbol({ color = "#94a3b8", kind = "fill" }) {
  if (kind === "line") {
    return (
      <span style={symbolStyles.lineWrap} aria-hidden>
        <span style={{ ...symbolStyles.line, background: color }} />
      </span>
    );
  }
  if (kind === "point") {
    return (
      <span style={symbolStyles.point} aria-hidden>
        <span style={{ ...symbolStyles.pointDot, background: color }} />
      </span>
    );
  }
  return <span style={{ ...symbolStyles.fill, background: color }} aria-hidden />;
}

/* Icons */
function CompactIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path fill="currentColor" d="M4 6h16v2H4V6zm4 5h8v2H8v-2zm-4 5h16v2H4v-2z" />
    </svg>
  );
}
function ExpandIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path fill="currentColor" d="M4 6h16v2H4V6zm2 5h12v2H6v-2zm-2 5h16v2H4v-2z" />
    </svg>
  );
}

/* Pretty gradient for footer scale */
function gradient() {
  return `linear-gradient(90deg,
    #0ea5e9 0%,
    #22c55e 20%,
    #f59e0b 40%,
    #ef4444 60%,
    #a855f7 80%,
    #94a3b8 100%
  )`;
}

/* ===== Styles ===== */
const styles = {
  card: {
    pointerEvents: "auto",
    width: 300,
    maxWidth: "82vw",
    maxHeight: "68vh",
    display: "flex",
    flexDirection: "column",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,.18)",
    background: "linear-gradient(180deg, rgba(13,20,40,.92), rgba(10,16,34,.92))",
    backdropFilter: "blur(8px) saturate(150%)",
    color: "#e8eeff",
    boxShadow: "0 12px 30px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.03)",
    overflow: "hidden",
  },
  head: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: "10px 12px",
    borderBottom: "1px solid rgba(255,255,255,.12)",
  },
  headL: { display: "flex", alignItems: "center", gap: 10, minWidth: 0 },
  logo: {
    width: 22,
    height: 22,
    display: "grid",
    placeItems: "center",
    borderRadius: 6,
    background: "radial-gradient(120% 120% at 0% 0%, rgba(127,168,255,.25), transparent 60%)",
    color: "#9db9ff",
    fontSize: 12,
    border: "1px solid rgba(124,165,255,.25)",
    boxShadow: "inset 0 0 0 1px rgba(124,165,255,.15)",
  },
  titles: { display: "flex", flexDirection: "column", minWidth: 0 },
  titleRow: { display: "flex", alignItems: "center", gap: 8, minWidth: 0 },
  title: { fontWeight: 800, fontSize: 13, letterSpacing: ".2px", whiteSpace: "nowrap" },
  badge: {
    fontSize: 11,
    padding: "2px 8px",
    borderRadius: 999,
    color: "#cfe0ff",
    background: "rgba(124,165,255,.18)",
    border: "1px solid rgba(124,165,255,.35)",
  },
  subtitle: { fontSize: 11, color: "#a9b7d6" },
  headR: { display: "flex", alignItems: "center", gap: 8 },

  toggle: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: "rgba(255,255,255,.06)",
    border: "1px solid rgba(255,255,255,.12)",
    borderRadius: 999,
    padding: "4px 8px",
    cursor: "pointer",
    userSelect: "none",
  },
  toggleLbl: { fontSize: 12, color: "#cfe0ff" },

  iconBtn: {
    all: "unset",
    display: "grid",
    placeItems: "center",
    width: 28,
    height: 28,
    borderRadius: 8,
    cursor: "pointer",
    color: "#dbe7ff",
    background: "rgba(255,255,255,.06)",
    border: "1px solid rgba(255,255,255,.12)",
  },

  body: { padding: "10px 10px 12px", overflow: "auto" },
  empty: { fontSize: 12, color: "#a9b7d6", padding: "16px 8px", textAlign: "center" },
  grid: { display: "grid", gridTemplateColumns: "1fr", gap: 8 },

  row: {
    display: "grid",
    gridTemplateColumns: "36px 1fr 10px",
    alignItems: "center",
    gap: 10,
    background: "linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.02))",
    borderRadius: 12,
    padding: "8px 10px",
    transition: "transform .12s ease, box-shadow .2s ease",
  },
  rowText: { display: "flex", flexDirection: "column", minWidth: 0 },
  rowTitle: {
    fontSize: 13,
    fontWeight: 600,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  rowMeta: { fontSize: 11, color: "#9fb1d6", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  dot: { width: 8, height: 8, borderRadius: 999 },

  foot: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 12px",
    borderTop: "1px solid rgba(255,255,255,.12)",
    background: "linear-gradient(180deg, rgba(255,255,255,.02), rgba(255,255,255,.01))",
  },
  scaleWrap: { flex: 1, height: 6, borderRadius: 999, overflow: "hidden", border: "1px solid rgba(255,255,255,.12)" },
  scale: { width: "100%", height: "100%" },
  footText: { fontSize: 11, color: "#99a9c9" },
};

/* Symbol styles */
const symbolStyles = {
  fill: { width: 28, height: 20, borderRadius: 6, boxShadow: "inset 0 0 0 1px rgba(0,0,0,.25)" },
  lineWrap: { width: 28, height: 20, display: "grid", placeItems: "center" },
  line: { width: 26, height: 3, borderRadius: 2, boxShadow: "0 0 0 1px rgba(0,0,0,.25)" },
  point: { width: 28, height: 20, display: "grid", placeItems: "center" },
  pointDot: { width: 10, height: 10, borderRadius: 999, boxShadow: "0 0 0 1px rgba(0,0,0,.25)" },
};
