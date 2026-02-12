// controllers/auditLogsController.js
import { database } from '../config/database.js';

/* ------------------------- helpers ------------------------- */
function csvEscape(val) {
  if (val === null || val === undefined) return '';
  let s = String(val);
  s = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function buildAuditWhere(query) {
  const {
    q, userId, action, entity, dateFrom, dateTo,
  } = query || {};
  const where = ['1=1'];
  const params = [];

  if (q && String(q).trim()) {
    const like = `%${String(q).trim()}%`;
    // meta is LONGTEXT; cast to CHAR for LIKE to avoid collation surprises
    where.push('(a.username LIKE ? OR a.action LIKE ? OR a.entity_type LIKE ? OR CAST(a.entity_ctx AS CHAR) LIKE ?)');
    params.push(like, like, like, like);
  }
  if (userId) { where.push('a.user_id = ?'); params.push(parseInt(userId, 10)); }
  if (action) { where.push('a.action = ?'); params.push(String(action)); }
  if (entity) { where.push('a.entity_type = ?'); params.push(String(entity)); }
  if (dateFrom) { where.push('a.created_at >= ?'); params.push(`${dateFrom} 00:00:00`); }
  if (dateTo)   { where.push('a.created_at <= ?'); params.push(`${dateTo} 23:59:59`); }

  return { whereSql: `WHERE ${where.join(' AND ')}`, params };
}

/* ----------------------------- list ----------------------------- */
// GET /api/audit
export async function listAuditLogs(req, res) {
  try {
    const {
      page = 1, limit = 50, sort = '-createdAt',
    } = req.query || {};

    const _page  = Math.max(parseInt(page, 10) || 1, 1);
    const _limit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const offset = (_page - 1) * _limit;

    const SORT_MAP = {
      id: 'a.id',
      userId: 'a.user_id',
      action: 'a.action',
      entity: 'a.entity_type',
      createdAt: 'a.created_at',
      ts: 'a.created_at',
    };
    let orderBy = 'a.created_at';
    let orderDir = 'DESC';
    if (typeof sort === 'string' && sort.trim()) {
      const raw = sort.trim();
      const desc = raw.startsWith('-');
      const key = desc ? raw.slice(1) : raw;
      if (SORT_MAP[key]) { orderBy = SORT_MAP[key]; orderDir = desc ? 'DESC' : 'ASC'; }
    }

    const { whereSql, params } = buildAuditWhere(req.query);

    const listSql = `
      SELECT
        a.id,
        a.user_id AS userId,
        a.username,
        a.action,
        a.entity_type AS entity,
        a.ip,
        a.user_agent AS ua,
        a.entity_ctx AS meta,
        a.created_at AS ts
      FROM audit_logs a
      ${whereSql}
      ORDER BY ${orderBy} ${orderDir}
      LIMIT ? OFFSET ?`;

    const countSql = `SELECT COUNT(*) AS total FROM audit_logs a ${whereSql}`;

    const [listRowsP, countRowsP] = await Promise.all([
      database.execute(listSql, [...params, _limit, offset]),
      database.execute(countSql, params),
    ]);

    const [rows] = listRowsP;
    const [countRows] = countRowsP;
    const total = countRows?.[0]?.total ?? 0;

    const data = rows.map(r => ({
      ...r,
      meta: (() => {
        const m = r.meta;
        if (m && typeof m === 'string' && (m.startsWith('{') || m.startsWith('['))) {
          try { return JSON.parse(m); } catch { return m; }
        }
        return m;
      })(),
    }));

    return res.json({
      data,
      page: _page,
      limit: _limit,
      total,
      pages: Math.max(Math.ceil(total / _limit), 1),
    });
  } catch (err) {
    console.error('[listAuditLogs]', err);
    return res.status(500).json({ error: err.message });
  }
}

/* ----------------------------- by id ----------------------------- */
// GET /api/audit/:id
export async function getAuditLogById(req, res) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });

    const [rows] = await database.execute(
      `SELECT
         a.id,
         a.user_id AS userId,
         a.username,
         a.action,
         a.entity_type AS entity,
         a.ip,
         a.user_agent AS ua,
         a.entity_ctx AS meta,
         a.created_at AS ts
       FROM audit_logs a
       WHERE a.id = ?`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });

    const r = rows[0];
    let meta = r.meta;
    if (meta && typeof meta === 'string' && (meta.startsWith('{') || meta.startsWith('['))) {
      try { meta = JSON.parse(meta); } catch {}
    }
    return res.json({ data: { ...r, meta } });
  } catch (err) {
    console.error('[getAuditLogById]', err);
    return res.status(500).json({ error: err.message });
  }
}

/* ------------------------------ stats ------------------------------ */
// GET /api/audit/stats
export async function getAuditStats(req, res) {
  try {
    const { days = 30 } = req.query || {};
    const d = Math.max(parseInt(days, 10) || 30, 1);

    const [rows] = await database.execute(
      `SELECT action, COUNT(*) AS cnt
         FROM audit_logs
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY action
        ORDER BY cnt DESC`,
      [d]
    );

    const [totalRows] = await database.execute(
      `SELECT COUNT(*) AS total
         FROM audit_logs
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [d]
    );

    return res.json({ total: totalRows?.[0]?.total ?? 0, byAction: rows });
  } catch (err) {
    console.error('[getAuditStats]', err);
    return res.status(500).json({ error: err.message });
  }
}

/* ------------------------------ delete ------------------------------ */
// DELETE /api/audit/:id
export async function deleteAuditLog(req, res) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });

    const [result] = await database.execute('DELETE FROM audit_logs WHERE id = ?', [id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Audit log not found' });
    return res.json({ result: 1, message: 'Audit log deleted' });
  } catch (err) {
    console.error('[deleteAuditLog]', err);
    return res.status(500).json({ error: err.message });
  }
}

/* ------------------------------ export CSV ------------------------------ */
// GET /api/audit/export.csv
export async function exportAuditLogsCsv(req, res) {
  try {
    const fileName = `audit-logs-${new Date().toISOString().slice(0,10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    const headers = [
      'id','ts','userId','username','action','entity','ip','ua','meta'
    ];
    res.write(headers.join(',') + '\n');

    const { whereSql, params } = buildAuditWhere(req.query);
    const max = Math.min(parseInt(req.query.max, 10) || 50000, 200000);

    const sql = `
      SELECT
        a.id,
        a.created_at AS ts,
        a.user_id AS userId,
        a.username,
        a.action,
        a.entity,
        a.ip,
        COALESCE(a.user_agent, a.ua) AS ua,
        a.meta
      FROM audit_logs a
      ${whereSql}
      ORDER BY a.created_at DESC
      LIMIT ?`;
    const [rows] = await database.execute(sql, [...params, max]);

    for (const r of rows) {
      let meta = r.meta;
      if (meta && typeof meta === 'object') {
        try { meta = JSON.stringify(meta); } catch { meta = String(meta); }
      }
      const line = [
        csvEscape(r.id),
        csvEscape(new Date(r.ts).toISOString()),
        csvEscape(r.userId),
        csvEscape(r.username),
        csvEscape(r.action),
        csvEscape(r.entity),
        csvEscape(r.ip),
        csvEscape(r.ua),
        csvEscape(meta),
      ].join(',') + '\n';
      res.write(line);
    }

    res.end();
  } catch (err) {
    console.error('[exportAuditLogsCsv]', err);
    if (!res.headersSent) return res.status(500).json({ error: err.message });
    try { res.end(); } catch {}
  }
}

export default {
  listAuditLogs,
  getAuditLogById,
  getAuditStats,
  deleteAuditLog,
  exportAuditLogsCsv,
};