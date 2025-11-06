// src/components/Geoportal/Includes/WMSCatalogPanel.jsx
import React from "react";

const GEOSERVER_URL = "https://geoserver.geoportal.gov.ph/geoserver/ows";
const GETCAP = `${GEOSERVER_URL}?service=WMS&version=1.1.1&request=GetCapabilities`;

// ----- Speed helpers (cache + TTL)
const CACHE_KEY = "wms_capabilities_cache_v1";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

const now = () => Date.now();
const isFresh = (ts) => typeof ts === "number" && now() - ts < CACHE_TTL_MS;

function loadCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.categories || !isFresh(parsed.timestamp)) return null;
    return parsed;
  } catch {
    return null;
  }
}
function saveCache(categories) {
  try {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ categories, timestamp: now() })
    );
  } catch {}
}
function relTime(ts) {
  if (!ts) return "";
  const secs = Math.max(1, Math.floor((now() - ts) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function WMSCatalogPanel({
  onToggle,      // (id:boolean, checked:boolean, meta) => void
  onToggleLayerById,
  onOpacity,     // (id:number 0..1, meta) => void
  onReorder,     // (orderedIds:string[]) => void
}) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [categories, setCategories] = React.useState({});
  const [expanded, setExpanded] = React.useState(() => new Set()); // start collapsed
  const [visible, setVisible] = React.useState(() =>
      new Set(["ibaan_parcel_main", "ibaan_roads", "ibaan_rivers", "ibaan_building_footprints"])
  );
  const [opacity, setOpacity] = React.useState({});                // {layerId: 0..1}
  const [manageOpen, setManageOpen] = React.useState(false);

  // Meta for small status chip
  const [lastUpdated, setLastUpdated] = React.useState(null); // timestamp (ms)
  const [dataSource, setDataSource] = React.useState("");     // "Cached" | "Live"

  // Dropdown filter
  const [catFilter, setCatFilter] = React.useState("All Categories");

  // Options for dropdown (non-empty)
  const catOptions = React.useMemo(() => {
    const keys = Object.keys(categories).filter(
      (k) => (categories[k] || []).length > 0
    );
    return ["All Categories", ...keys];
  }, [categories]);

  // Filtered view of categories without changing underlying data
  const filteredCategoryEntries = React.useMemo(() => {
    const entries = Object.entries(categories);
    if (catFilter === "All Categories") return entries;
    return entries.filter(([k]) => k === catFilter);
  }, [categories, catFilter]);

  // Flat ordered list for reorder UX
  const orderedIds = React.useMemo(() => {
    const seq = [];
    Object.values(categories).forEach((list) =>
      list.forEach((l) => seq.push(l.id))
    );
    return seq;
  }, [categories]);

  React.useEffect(() => {
    let alive = true;
    const ac = new AbortController();

    async function fetchAndParse() {
      const res = await fetch(GETCAP, {
        signal: ac.signal,
        headers: { Accept: "application/xml,text/xml,*/*;q=0.9" },
        cache: "no-cache",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const txt = await res.text();

      const xml = new DOMParser().parseFromString(txt, "text/xml");
      const nodes = xml.querySelectorAll("Capability > Layer > Layer");

      const cat = {
        "Buildings": [{id: "ibaan_building_footprints", title: "Building Footprints"}],
        "Taxation": [{id: "ibaan_parcel_main", title: "Ibaan Tax Lots"}],
        "Water Bodies": [{id: "ibaan_rivers", title: "Ibaan Rivers"}],
        "Administrative Boundaries": [],
        "Natural Resources & Environment": [],
        "Landform & Terrain": [],
        "Hazard Maps": [],
        "Agriculture & Land Use": [],
        "Infrastructure": [{id: "ibaan_roads", title: "Ibaan Roads"}],
        Other: [],
      };

      nodes.forEach((node) => {
        const name = node.querySelector("Name")?.textContent?.trim();
        const title = node.querySelector("Title")?.textContent?.trim();
        if (!name || !title) return;
        const lt = title.toLowerCase();

        if (lt.includes("covid-19")) return; // skip noisy demos

        const entry = { id: name, title };

        if (
          lt.includes("2020 land cover map") ||
          lt.includes("land cover") ||
          lt.includes("geohazard") ||
          lt.includes("forest") ||
          lt.includes("soil") ||
          lt.includes("watershed") ||
          lt.includes("river") ||
          lt.includes("lake")
        ) {
          cat["Natural Resources & Environment"].push(entry);
        } else if (
          lt.includes("cadastral") ||
          lt.includes("agricultural") ||
          lt.includes("zoning") ||
          lt.includes("fishpond") ||
          lt.includes("agri") ||
          lt.includes("land use") ||
          lt.includes("existing landuse")
        ) {
          cat["Agriculture & Land Use"].push(entry);
        } else if (
          lt.includes("administrative boundary") ||
          lt.includes("region") ||
          lt.includes("province") ||
          lt.includes("city") ||
          lt.includes("municipal") ||
          lt.includes("barangay") ||
          lt.includes("phl_admbnda_adm")
        ) {
          cat["Administrative Boundaries"].push(entry);
        } else if (
          lt.includes("inundation") ||
          lt.includes("flood") ||
          lt.includes("landslide") ||
          lt.includes("hazard") ||
          lt.includes("seismic") ||
          lt.includes("fault") ||
          lt.includes("tsunami")
        ) {
          cat["Hazard Maps"].push(entry);
        } else if (
          lt.includes("slope") ||
          lt.includes("geology") ||
          lt.includes("elevation")
        ) {
          cat["Landform & Terrain"].push(entry);
        } else if (
          lt.includes("road") ||
          lt.includes("bridge") ||
          lt.includes("port") ||
          lt.includes("airport") ||
          lt.includes("transport")
        ) {
          cat["Infrastructure"].push(entry);
        } else if (
            lt.includes("tax lots")
        ) {
          cat["Taxation"].push(entry);
        }else if (
            lt.includes("building footprint")
        ) {
          cat["Buildings"].push(entry);
        } else {
          cat["Other"].push(entry);
        }
      });

      return { categories: cat, timestamp: now() };
    }

    // 1) Instant cached view if available
    const cached = loadCache();
    if (cached) {
      setCategories(cached.categories);
      setExpanded(new Set()); // keep collapsed by default
      setLastUpdated(cached.timestamp);
      setDataSource("Cached");
      setLoading(false);
      setError("");
    } else {
      setLoading(true);
      setError("");
    }

    // 2) Background refresh (or primary load if no cache)
    (async () => {
      try {
        const fresh = await fetchAndParse();
        if (!alive) return;
        setCategories(fresh.categories);
        setExpanded(new Set()); // keep collapsed by default
        setLastUpdated(fresh.timestamp);
        setDataSource("Live");
        saveCache(fresh.categories);
      } catch (e) {
        if (!alive) return;
        if (!cached) {
          setError(
            "Failed to load WMS capabilities. If you’re opening this file directly from disk, run a local dev server to avoid CORS issues."
          );
        }
        console.error(e);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
      ac.abort();
    };
  }, []);

  function toggleCat(name) {
    const next = new Set(expanded);
    next.has(name) ? next.delete(name) : next.add(name);
    setExpanded(next);
  }

  function toggleLayer(id, checked, meta) {
    const next = new Set(visible);
    checked ? next.add(id) : next.delete(id);
    setVisible(next);
    const hardcodedLayers = ["ibaan_parcel_main", "ibaan_roads", "ibaan_rivers", "ibaan_building_footprints"];
    if (hardcodedLayers.includes(id)) {
      onToggleLayerById?.(id);  // ← Use the new prop
    } else {
      onToggle?.(id, checked, meta);  // ← Keep existing WMS behavior
    }
  }

  function changeOpacity(id, value, meta) {
    setOpacity((p) => ({ ...p, [id]: value }));
    onOpacity?.(id, value, meta);
  }

  // UI reorder (pure UI; sends ordered list upward)
  function move(id, dir) {
    const all = orderedIds.slice();
    const idx = all.indexOf(id);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= all.length) return;
    const tmp = all[idx];
    all[idx] = all[swap];
    all[swap] = tmp;
    onReorder?.(all);
  }

  const anyVisible = visible.size > 0;
  const activeList = orderedIds.filter((id) => visible.has(id));

  return (
    <section className="gpWms card">
      <style>{css}</style>

      <header className="cardHead">
        <span className="glyph">🗂️</span>
        <div className="cardTitle">
          <div className="t1">WMS Layers (PH GeoServer)</div>
          <div className="t2">UI-only catalog • GetCapabilities</div>
        </div>

        {/* Status chip */}
        <div className="statusChip" title={lastUpdated ? `Last update: ${relTime(lastUpdated)}` : ""}>
          {dataSource || (loading ? "Loading" : "Idle")}
          {lastUpdated ? ` • ${relTime(lastUpdated)}` : ""}
        </div>

        {/* Category dropdown filter */}
        <div className="ddWrap" title="Filter by category">
          <label className="srOnly" htmlFor="catFilter">Filter category</label>
          <select
            id="catFilter"
            className="dd"
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
          >
            {catOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <button
          className="btnGhost sm"
          onClick={() => setManageOpen(true)}
          disabled={!anyVisible}
          title={anyVisible ? "Manage Selected Layers" : "No active layers"}
        >
          Manage Selected Layers
        </button>
      </header>

      <div className="cardBody">
        {loading && <div className="note">Loading…</div>}
        {error && <div className="error">{error}</div>}

        {!loading &&
          !error &&
          filteredCategoryEntries.map(([cat, list]) => {
            if (list.length === 0) return null;
            const open = expanded.has(cat);
            const selectedCount = list.filter((l) => visible.has(l.id)).length;
            return (
              <div key={cat} className="sect">
                <button
                  className="sectHead"
                  onClick={() => toggleCat(cat)}
                  aria-expanded={open}
                >
                  <span className={`chev ${open ? "rot" : ""}`} aria-hidden>
                    ▸
                  </span>
                  <span className="name">{cat}</span>
                  <span className="chip">{selectedCount}/{list.length}</span>
                </button>

                {open && (
                  <ul className="list">
                    {list.map((l) => {
                      const op = opacity[l.id] ?? 1;
                      const isOn = visible.has(l.id);
                      const meta = { title: l.title, id: l.id, category: cat };
                      return (
                        <li key={l.id} className="row">
                          <label className="left">
                            <input
                              type="checkbox"
                              checked={isOn}
                              onChange={(e) =>
                                toggleLayer(l.id, e.target.checked, meta)
                              }
                            />
                            <span className="lab" title={l.id}>
                              {l.title}
                            </span>
                          </label>
                          <input
                            className="op"
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={op}
                            onChange={(e) =>
                              changeOpacity(l.id, parseFloat(e.target.value), meta)
                            }
                            title={`Opacity: ${Math.round(op * 100)}%`}
                          />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}

        {!loading && !error && (
          <div className="legendHint">
            Tip: Actual legend graphics are best shown on the map (GetLegendGraphic).
          </div>
        )}
      </div>

      {/* Manage Selected Layers (UI reorder only) */}
      {manageOpen && (
        <div className="modalWrap" role="dialog" aria-modal="true">
          <div className="modal">
            <header className="mHead">
              <div className="mTitle">Manage Selected Layers</div>
              <button className="iconBtn" onClick={() => setManageOpen(false)} title="Close">✕</button>
            </header>
            <div className="mBody">
              {activeList.length === 0 ? (
                <div className="note">No layers are currently active.</div>
              ) : (
                <ul className="mList">
                  {/* top of this list = drawn bottom; last = drawn on top */}
                  {activeList
                    .slice()
                    .reverse()
                    .map((id) => {
                      const meta = findMeta(id, categories);
                      if (!meta) return null;
                      return (
                        <li key={id} className="mRow">
                          <div className="mTitleRow">
                            <span className="mName">{meta.title}</span>
                            <span className="mCode" title={id}>{id}</span>
                          </div>
                          <div className="mBtns">
                            <button className="btnGhost sm" onClick={() => move(id, -1)} title="Move down (behind)">▼</button>
                            <button className="btnGhost sm" onClick={() => move(id, +1)} title="Move up (in front)">▲</button>
                          </div>
                        </li>
                      );
                    })}
                </ul>
              )}
            </div>
            <footer className="mFoot">
              <button className="btn" onClick={() => setManageOpen(false)}>Close</button>
            </footer>
          </div>
        </div>
      )}
    </section>
  );
}

function findMeta(id, categories) {
  for (const [cat, list] of Object.entries(categories)) {
    const hit = list.find((l) => l.id === id);
    if (hit) return { ...hit, category: cat };
  }
  return null;
}

const css = `
.gpWms.card{
  border:1px solid rgba(255,255,255,.08);
  border-radius:14px;
  background:linear-gradient(180deg,#0f162d,#0d1326);
  color:#eaf0ff;
  overflow:hidden;
  box-shadow:0 8px 30px rgba(0,0,0,.25);
}
.cardHead{
  display:flex; align-items:center; gap:10px;
  padding:10px 12px;
  border-bottom:1px solid rgba(255,255,255,.08);
}
.glyph{
  width:28px; height:28px; display:grid; place-items:center;
  border-radius:8px; background:rgba(121,168,255,.16);
  border:1px solid rgba(121,168,255,.38);
}
.cardTitle .t1{font-weight:800; letter-spacing:.2px;}
.cardTitle .t2{font-size:12px; color:#9bb0d6}
.statusChip{
  margin-left:auto;
  font-size:12px;
  background:rgba(121,168,255,.12);
  border:1px solid rgba(121,168,255,.35);
  color:#cfe0ff;
  padding:6px 8px;
  border-radius:10px;
}

/* Controls */
.btnGhost{
  background:transparent; border:1px solid rgba(255,255,255,.22);
  color:#eaf0ff; border-radius:10px; padding:8px 10px; cursor:pointer;
}
.btnGhost.sm{padding:6px 8px; font-size:12px; white-space:nowrap}
.btn{
  background:linear-gradient(180deg,#4f8cff,#79a8ff); color:#06122e;
  border:none; border-radius:10px; padding:8px 12px; font-weight:800; cursor:pointer;
}

.cardBody{padding:10px 10px 12px; display:grid; gap:10px}
.note{font-size:13px; color:#bcd0f7}
.error{font-size:13px; color:#ffb4b4}
.sect{border:1px solid rgba(255,255,255,.08); border-radius:12px; overflow:hidden; background:#11172b;}
.sectHead{
  width:100%; text-align:left; display:flex; align-items:center; gap:8px;
  justify-content:space-between; padding:10px 12px; cursor:pointer;
  background:linear-gradient(180deg,#111a33,#0f162d); border:none; color:#eaf0ff;
}
.sectHead .name{font-weight:700}
.chev{transition:transform .18s ease; display:inline-block}
.chev.rot{transform:rotate(90deg)}
.chip{
  background:rgba(255,255,255,.06);
  border:1px solid rgba(255,255,255,.12);
  border-radius:999px; padding:2px 8px; font-size:12px
}
.list{display:grid; gap:8px; padding:10px 12px 12px}
.row{
  display:flex; align-items:center; gap:10px; justify-content:space-between;
  background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.08);
  border-radius:10px; padding:8px 10px
}
.left{display:flex; align-items:center; gap:8px}
.lab{font-size:13px}
.op{width:90px}

.legendHint{font-size:11px; color:#9fb2da; padding-left:4px}

/* Dropdown */
.ddWrap{margin-left:10px; position:relative}
.dd{
  appearance:none;
  background:rgba(255,255,255,.06);
  border:1px solid rgba(255,255,255,.22);
  color:#eaf0ff;
  border-radius:10px;
  padding:8px 32px 8px 10px;
  font-size:12px;
  cursor:pointer;
  outline:none;
}
.dd:focus{box-shadow:0 0 0 2px rgba(121,168,255,.35)}
.ddWrap::after{
  content:"▾";
  position:absolute; right:10px; top:50%; transform:translateY(-50%);
  font-size:12px; color:#cfe0ff; pointer-events:none;
}

/* Modal */
.modalWrap{
  position:fixed; inset:0; z-index:9999;
  display:flex; align-items:center; justify-content:center;
  background:rgba(14,19,38,.75); backdrop-filter:blur(4px);
}
.modal{
  width:min(720px,92vw); max-height:80vh; overflow:auto;
  background:linear-gradient(180deg,#0f162d,#0b1226);
  border:1px solid rgba(255,255,255,.12); color:#eaf0ff; border-radius:16px;
  box-shadow:0 10px 40px rgba(0,0,0,.35);
}
.mHead{display:flex; align-items:center; justify-content:space-between; padding:12px 14px; border-bottom:1px solid rgba(255,255,255,.12)}
.mTitle{font-weight:800}
.iconBtn{all:unset; cursor:pointer; padding:6px 8px; border-radius:8px; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.2)}
.mBody{padding:12px 14px; display:grid; gap:10px}
.mList{display:grid; gap:8px}
.mRow{display:flex; align-items:center; justify-content:space-between; border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.03); border-radius:12px; padding:10px}
.mTitleRow{display:grid}
.mName{font-weight:700}
.mCode{font-family:ui-monospace, SFMono-Regular, Menlo, monospace; font-size:11px; color:#9fb2da}
.mBtns{display:flex; gap:8px}
.mFoot{padding:12px 14px; border-top:1px solid rgba(255,255,255,.12); display:flex; justify-content:flex-end}
.srOnly{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
`;
