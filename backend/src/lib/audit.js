// backend/src/lib/audit.js
import { database } from "../config/database.js";

export function diffFields(before = {}, after = {}) {
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  const norm = (v) => {
    if (v instanceof Date) return v.toISOString().slice(0, 10); // YYYY-MM-DD for DATE
    return v;
  };
  const changed = [];
  for (const k of keys) {
    const b = norm(before?.[k]);
    const a = norm(after?.[k]);
    if (JSON.stringify(b) !== JSON.stringify(a)) changed.push(k);
  }
  return changed;
}

export async function writeAuditLog({
  req,
  action,                // 'CREATE' | 'UPDATE' | 'DELETE'
  entity_type,           // e.g. 'ibaan'
  entity_id,             // e.g. ParcelId as string
  entity_ctx = {},       // small JSON for quick display
  changed_fields = [],   // ['LotNumber', ...]
  before_data = null,    // slimmed JSON snapshot
  after_data = null,     // slimmed JSON snapshot
}) {
  // Never throw out of here; validate & stringify cleanly
  try {
    const username = (req?.user?.username ?? req?.auth?.username ?? "anonymous").slice(0, 255);
    const user_id = req?.user?.id ?? null;
    const ip = (req?.headers?.["x-forwarded-for"]?.split(",")[0] || req?.ip || null);
    const user_agent = req?.headers?.["user-agent"] || null;

    // Stringify once; MariaDB treats JSON columns as LONGTEXT and doesn't support CAST(... AS JSON)
    const entity_ctx_json     = JSON.stringify(entity_ctx ?? {});
    const changed_fields_json = JSON.stringify(Array.isArray(changed_fields) ? changed_fields : []);
    const before_json         = before_data == null ? null : JSON.stringify(before_data);
    const after_json          = after_data  == null ? null : JSON.stringify(after_data);

    await database.query(
      `INSERT INTO audit_logs
        (user_id, username, action, entity_type, entity_id,
         entity_ctx, changed_fields, before_data, after_data, ip, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id, username, action, entity_type, String(entity_id),
        entity_ctx_json, changed_fields_json, before_json, after_json, ip, user_agent,
      ]
    );
  } catch (e) {
    // log and swallow — never break the main flow
    console.error("writeAuditLog failed (swallowed):", e?.sqlMessage || e?.message || e);
  }
}

