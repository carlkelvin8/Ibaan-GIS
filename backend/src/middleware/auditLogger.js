// middleware/auditLogger.js
import { database } from '../config/database.js';

const SENSITIVE_KEYS = new Set([
  'password', 'new_password', 'current_password', 'confirm_password',
  'token', 'jwt', 'secret', 'apiKey'
]);

function maskDeep(value) {
  if (value == null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(maskDeep);
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = SENSITIVE_KEYS.has(String(k).toLowerCase()) ? '***' : maskDeep(v);
  }
  return out;
}

function getClientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length) return xf.split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || null;
}

/**
 * Log an audit event. Never throws.
 * Stores everything extra inside `meta` JSON to match your table.
 * Maps unknown actions to 'UPDATE' to satisfy the ENUM('CREATE','UPDATE','DELETE').
 *
 * @param {Request} req
 * @param {Object} evt { action, entity, entityId, details }
 */
export async function logAudit(req, evt = {}) {
  try {
    // Action mapping to satisfy ENUM('CREATE','UPDATE','DELETE')
    const rawAction = String(evt.action || '').toUpperCase() || 'UPDATE';
    const ALLOWED = new Set(['CREATE', 'UPDATE', 'DELETE']);
    const action = ALLOWED.has(rawAction) ? rawAction : 'UPDATE';

    const userId   = req.user?.id ?? null;
    const // username is NOT NULL in your schema -> never pass null
      username = (req.user?.username ?? req.body?.username ?? req.query?.username ?? '').toString().slice(0, 255);

    // entity_type is NOT NULL in your schema -> always provide something
    const entity     = String(evt.entity || '').slice(0, 64) || null;
    const entityType = String(evt.entity || 'system').slice(0, 64); // required, never null
    const entityId   = evt.entityId == null ? null : String(evt.entityId).slice(0, 64);

    const ip   = (getClientIp(req) || '').slice(0, 45);
    const ua   = (req.headers['user-agent'] || '').slice(0, 255);

    // Pack request info + custom details safely into meta JSON
    const metaObj = {
      originalAction: rawAction,
      method: req.method,
      path: req.originalUrl || req.url,
      details: evt.details ? maskDeep(evt.details) : undefined,
      body: req.body ? maskDeep(req.body) : undefined,
      query: req.query ? maskDeep(req.query) : undefined,
    };
    // Remove undefined keys for a cleaner JSON
    Object.keys(metaObj).forEach(k => metaObj[k] === undefined && delete metaObj[k]);

    await database.execute(
      `INSERT INTO audit_logs
         (created_at, user_id, username, action, entity, entity_type, entity_id,
          ip, ua, user_agent, meta)
       VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        username,
        action,
        entity,
        entityType,
        entityId,
        ip,
        ua,
        ua, // store in both ua and user_agent cols you have
        JSON.stringify(metaObj),
      ]
    );
  } catch (e) {
    console.error('[auditLogger] failed to write log:', e?.message || e);
  }
}