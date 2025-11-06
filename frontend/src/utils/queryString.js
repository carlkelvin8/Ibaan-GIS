// frontend/src/utils/queryString.js

/**
 * toObject(sp)
 *  - Gawing plain object ang URLSearchParams
 */
export function toObject(sp) {
  const obj = {};
  for (const [k, v] of sp.entries()) obj[k] = v;
  return obj;
}

/**
 * fromObject(obj)
 *  - Gawing URLSearchParams ang plain object (skip undefined/null)
 */
export function fromObject(obj = {}) {
  const sp = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    sp.set(k, String(v));
  });
  return sp;
}

/**
 * setParam(sp, key, value)
 *  - Itakda o burahin ang isang param sa URLSearchParams (immutable: returns new)
 */
export function setParam(sp, key, value) {
  const next = new URLSearchParams(sp);
  if (value === undefined || value === null || value === "") next.delete(key);
  else next.set(key, String(value));
  return next;
}

/**
 * setParams(sp, obj)
 *  - Batch set ng params (immutable)
 */
export function setParams(sp, obj = {}) {
  let next = new URLSearchParams(sp);
  Object.entries(obj).forEach(([k, v]) => {
    next = setParam(next, k, v);
  });
  return next;
}

/**
 * mergeSearchParams(sp, obj)
 *  - Merge object → URLSearchParams (immutable)
 *    (Pareho lang halos sa setParams; name lang for semantics)
 */
export function mergeSearchParams(sp, obj = {}) {
  return setParams(sp, obj);
}

/**
 * withResetPage(sp, keys, changedKey)
 *  - Kung ang binago mong key ay kabilang sa `keys`, auto-set page=1
 */
export function withResetPage(sp, keys = [], changedKey) {
  const next = new URLSearchParams(sp);
  if (keys.includes(changedKey)) next.set("page", "1");
  return next;
}

/**
 * ensureBounds(val, min, max, fallback)
 *  - Safe numeric bounds (para sa page/limit)
 */
export function ensureBounds(val, min = 1, max = 100, fallback = 20) {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

/**
 * parseQuery(sp, schema)
 *  - Parse query params gamit ang simple "schema" (type + default).
 *  - type: 'string' | 'number' | 'date' | 'bool'
 *  - example schema:
 *    {
 *      q:        { type: 'string', default: '' },
 *      page:     { type: 'number', default: 1, min: 1 },
 *      limit:    { type: 'number', default: 20, min: 1, max: 100 },
 *      dateFrom: { type: 'date'   },
 *      active:   { type: 'bool',   default: false }
 *    }
 */
export function parseQuery(sp, schema = {}) {
  const out = {};
  for (const [key, conf] of Object.entries(schema)) {
    const raw = sp.get(key);
    const def = conf.default;
    switch (conf.type) {
      case "number": {
        const min = conf.min ?? Number.MIN_SAFE_INTEGER;
        const max = conf.max ?? Number.MAX_SAFE_INTEGER;
        const parsed = ensureBounds(raw, min, max, def ?? 0);
        out[key] = parsed;
        break;
      }
      case "bool": {
        // supports: "true"/"1" as true, "false"/"0" as false
        const v = (raw ?? "").toLowerCase();
        out[key] =
          v === "true" || v === "1"
            ? true
            : v === "false" || v === "0"
            ? false
            : Boolean(def);
        break;
      }
      case "date": {
        // leave as string YYYY-MM-DD (frontend forms friendly)
        out[key] = raw ?? def ?? "";
        break;
      }
      case "string":
      default: {
        out[key] = raw ?? def ?? "";
        break;
      }
    }
  }
  return out;
}

/**
 * applyQuery(setSearchParams, updater)
 *  - Convenience wrapper para sa React Router useSearchParams setter
 *  - Example:
 *    applyQuery(setSearchParams, (sp) => setParam(sp, 'q', 'john'))
 */
export function applyQuery(setSearchParams, updater, options = { replace: true }) {
  if (typeof updater !== "function") return;
  setSearchParams((prev) => {
    const cur = new URLSearchParams(prev);
    const next = updater(cur) || cur;
    return next;
  }, options);
}

/**
 * toggleSort(currentSort, key, defaultDescKeys = ['createdAt'])
 *  - Sorting helper (string gaya ng "-createdAt", "username")
 *  - Logic:
 *    * Kapag ibang column ang pinili → default ASC (maliban sa defaultDescKeys → DESC)
 *    * Kapag parehong column, i-toggle ASC/DESC
 */
export function toggleSort(currentSort, key, defaultDescKeys = ["createdAt"]) {
  const cur = (currentSort || "").trim();
  const curKey = cur.startsWith("-") ? cur.slice(1) : cur;
  const curDir = cur.startsWith("-") ? "DESC" : "ASC";
  if (curKey === key) {
    return curDir === "ASC" ? `-${key}` : key;
  }
  return defaultDescKeys.includes(key) ? `-${key}` : key;
}

/**
 * syncField(setSearchParams, key, value, autoResetKeys = [...])
 *  - Set single field + optional auto-reset ng page
 */
export function syncField(setSearchParams, key, value, autoResetKeys = ["q", "role", "status", "officeId", "municipalityId", "dateFrom", "dateTo", "limit"]) {
  applyQuery(setSearchParams, (sp) => withResetPage(setParam(sp, key, value), autoResetKeys, key));
}

/**
 * syncMany(setSearchParams, obj, options?)
 *  - Batch update ng maraming fields (di auto-reset unless idagdag mo sa obj.page)
 */
export function syncMany(setSearchParams, obj = {}, options = { replace: true }) {
  applyQuery(setSearchParams, (sp) => setParams(sp, obj), options);
}
