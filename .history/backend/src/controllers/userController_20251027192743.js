import { database } from '../config/database.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import crypto from "crypto";
import jwt from 'jsonwebtoken';
import { logAudit } from "../middleware/auditLogger.js";
import { sendResetEmail } from "../config/mailer.js";
dotenv.config();

/* ---------- Cookie settings ---------- */
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'session';
const COOKIE_SECURE = process.env.NODE_ENV === 'production';
const COOKIE_SAMESITE = process.env.COOKIE_SAMESITE || 'Lax';
const COOKIE_MAX_AGE = 60 * 60 * 8; // 8h

function setSessionCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: COOKIE_SAMESITE,
    maxAge: COOKIE_MAX_AGE * 1000,
    path: '/',
  });
}

/* ---------- Role mapping ---------- */
const ROLE_NAME_TO_CODE = { ADMIN: 1, ASSESSOR: 2, ENGINEER: 3, PLANNER: 4, BPLO: 5 };
const ROLE_CODE_TO_NAME = Object.fromEntries(Object.entries(ROLE_NAME_TO_CODE).map(([k, v]) => [v, k]));
const roleToCode = (input) => {
  if (input == null || input === '') return null;
  const s = String(input).trim();
  if (/^\d+$/.test(s)) return ROLE_CODE_TO_NAME[parseInt(s, 10)] ? parseInt(s, 10) : null;
  if (['admin', 'superadmin', '1'].includes(s.toLowerCase())) return ROLE_NAME_TO_CODE.ADMIN;
  return ROLE_NAME_TO_CODE[s.toUpperCase()] ?? null;
};
const codeToRole = (code) => ROLE_CODE_TO_NAME[Number(code)] || null;

/* ---------- Status helpers ---------- */
const STATUSES = new Set(['active', 'pending', 'disabled']);
const normalizeStatus = (status) => {
  if (status == null || status === '') return null;
  const s = String(status).trim().toLowerCase();
  if (STATUSES.has(s)) return s;
  if (s === '1') return 'active';
  if (s === '0') return 'pending';
  if (s === '-1') return 'disabled';
  return null;
};

const safeInt = (v) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};
const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || '').trim());
const isUsername = (u) => /^[A-Za-z0-9_.-]{3,32}$/.test(String(u || '').trim());
const isGoodPassword = (p) => String(p || '').length >= 6;
const requireFields = (obj, fields=[]) => fields.filter((f) => obj[f] == null || String(obj[f]).trim() === '');

/* ---------- Status auto-derivation policy ---------- */
function deriveStatus({ roleCode, office_id, municipality_id }) {
  const autoRoles = (process.env.AUTO_ACTIVATE_ROLES || 'ADMIN')
    .split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
  const byOffice = (process.env.AUTO_ACTIVATE_WITH_OFFICE ?? 'true') === 'true';
  const roleName = codeToRole(roleCode);
  if (roleName && autoRoles.includes(roleName)) return 'active';
  if (byOffice && (safeInt(office_id) || safeInt(municipality_id))) return 'active';
  return 'pending';
}

/* ---------- AUTH ---------- */
export async function signup(req, res) {
  try {
    const { username, first_name, last_name, email, password, office_id, municipality_id } = req.body || {};
    const missing = requireFields(req.body || {}, ['username', 'first_name', 'last_name', 'email', 'password']);
    if (missing.length) return res.status(400).json({ result: 0, error: `Missing: ${missing.join(', ')}` });
    if (!isUsername(username)) return res.status(400).json({ result: 0, error: 'Invalid username format' });
    if (!isEmail(email)) return res.status(400).json({ result: 0, error: 'Invalid email' });
    if (!isGoodPassword(password)) return res.status(400).json({ result: 0, error: 'Password too short (min 6)' });

    const roleCode = roleToCode('BPLO');
    const status = deriveStatus({ roleCode, office_id, municipality_id });

    const [dup] = await database.execute(
      `SELECT id FROM users WHERE username = ? OR LOWER(email) = LOWER(?) LIMIT 1`,
      [username, email]
    );
    if (dup.length) return res.status(409).json({ result: 0, error: 'Username or email already exists' });

    const hash = await bcrypt.hash(password, 10);
    await database.execute(
      `INSERT INTO users
       (username, first_name, last_name, email, password, role, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [username, first_name, last_name, email, hash, roleCode, status]
    );

    await logAudit(req, {
      action: "SIGNUP",
      entity: "auth",
      entityId: username,
      statusCode: 201,
      details: { email }
    });

    return res.status(201).json({ result: 1, message: 'User registered successfully' });
  } catch (err) {
    console.error('[signup]', err);
    return res.status(500).json({ result: 0, error: err.message });
  }
}

export async function login(req, res) {
  try {
    const { username, password } = req.body || {};
    const JWT_SECRET = process.env.JWT_SECRET;

    if (!username || !password) {
      await logAudit(req, {
        action: "LOGIN_FAIL",
        entity: "auth",
        entityId: String(username || "").trim() || null,
        statusCode: 400,
        details: { reason: "missing_credentials" }
      });
      return res.status(400).json({ result: 0, error: 'Missing username or password' });
    }

    const [rows] = await database.execute(
      `SELECT * FROM users WHERE (username = ? OR LOWER(email) = LOWER(?)) AND deleted_at IS NULL LIMIT 1`,
      [username, username]
    );
    if (!rows.length) {
      await logAudit(req, {
        action: "LOGIN_FAIL",
        entity: "auth",
        entityId: String(username || "").trim() || null,
        statusCode: 401,
        details: { reason: "user_not_found" }
      });
      return res.status(401).json({ result: 0, error: 'Invalid credentials' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      await logAudit(req, {
        action: "LOGIN_FAIL",
        entity: "auth",
        entityId: user?.id ?? username,
        statusCode: 401,
        details: { reason: "bad_password" }
      });
      return res.status(401).json({ result: 0, error: 'Invalid credentials' });
    }
    if (!JWT_SECRET) return res.status(500).json({ result: 0, error: 'Server misconfiguration: JWT secret missing' });

    const roleName = codeToRole(user.role) || 'UNKNOWN';
    const token = jwt.sign(
      { id: user.id, username: user.username, role: roleName, role_code: user.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    // discourage caching login response
    res.set('Cache-Control', 'no-store');

    setSessionCookie(res, token);

    await logAudit(req, {
      action: "LOGIN",
      entity: "auth",
      entityId: user.id,
      statusCode: 200,
      details: { username: user.username, role: roleName }
    });

    const { password: _pw, ...safeUser } = user;
    return res.json({
      result: 1,
      message: 'Login successful',
      token, // optional; FE can ignore
      user: { ...safeUser, role: roleName, role_code: user.role },
    });
  } catch (err) {
    console.error('[login]', err);
    return res.status(500).json({ result: 0, error: err.message });
  }
}

/* ---------- Admin create/read/update/delete ---------- */
export async function createUser(req, res) {
  try {
    const { username, first_name, last_name, email, password, role, office_id, municipality_id } = req.body || {};

    const missing = requireFields(req.body || {}, ['username', 'first_name', 'last_name', 'email', 'password']);
    if (missing.length) return res.status(400).json({ error: `Missing: ${missing.join(', ')}` });
    if (!isUsername(username)) return res.status(400).json({ error: 'Invalid username format' });
    if (!isEmail(email)) return res.status(400).json({ error: 'Invalid email' });
    if (!isGoodPassword(password)) return res.status(400).json({ error: 'Password too short (min 6)' });

    const roleCode = roleToCode(role) ?? roleToCode('BPLO');
    const status = deriveStatus({ roleCode, office_id, municipality_id });

    const [dup] = await database.execute(
      `SELECT id FROM users WHERE (username = ? OR LOWER(email) = LOWER(?)) AND deleted_at IS NULL LIMIT 1`,
      [username, email]
    );
    if (dup.length) return res.status(409).json({ error: 'Username or email already exists' });

    const hash = await bcrypt.hash(password, 10);
    const [result] = await database.execute(
      `INSERT INTO users
       (username, first_name, last_name, email, password, role, status, office_id, municipality_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [username, first_name, last_name, email, hash, roleCode, status, safeInt(office_id), safeInt(municipality_id)]
    );

    const [rows] = await database.execute(
      `SELECT id, username, first_name, last_name, email, role, status, office_id, municipality_id, created_at, updated_at
       FROM users WHERE id = ?`,
      [result.insertId]
    );

    await logAudit(req, {
      action: "CREATE",
      entity: "users",
      entityId: result.insertId,
      statusCode: 201,
      details: { username, role: roleCode, status }
    });

    const u = rows[0];
    return res.status(201).json({ data: { ...u, role_code: u.role, role: codeToRole(u.role) || 'UNKNOWN' } });
  } catch (err) {
    console.error('[createUser]', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function getUserById(req, res) {
  try {
    const id = safeInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });

    const [rows] = await database.execute(
      `SELECT id, username, first_name, last_name, email, role, status, office_id, municipality_id, created_at, updated_at
       FROM users WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });

    await logAudit(req, {
      action: "VIEW",
      entity: "users",
      entityId: id,
      statusCode: 200
    });

    const u = rows[0];
    return res.json({ data: { ...u, role_code: u.role, role: codeToRole(u.role) || 'UNKNOWN' } });
  } catch (err) {
    console.error('[getUserById]', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function updateUser(req, res) {
  try {
    const id = safeInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });

    const [curRows] = await database.execute(
      `SELECT * FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [id]
    );
    if (!curRows.length) return res.status(404).json({ error: 'User not found' });
    const current = curRows[0];

    const {
      first_name = current.first_name,
      last_name = current.last_name,
      email = current.email,
      password,
      role = current.role,
      status,
      office_id = current.office_id,
      municipality_id = current.municipality_id,
    } = req.body || {};

    if (!isEmail(email)) return res.status(400).json({ error: 'Invalid email' });

    const roleCode = roleToCode(role) ?? current.role;

    const callerRole = (req.user?.role || '').toString().toUpperCase();
    const callerIsAdmin = callerRole === 'ADMIN';

    if (String(email).toLowerCase() !== String(current.email).toLowerCase()) {
      const [dup] = await database.execute(
        `SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id <> ? AND deleted_at IS NULL LIMIT 1`,
        [email, id]
      );
      if (dup.length) return res.status(409).json({ error: 'Email already exists' });
    }

    let hash = null;
    if (password && String(password).trim()) {
      if (!isGoodPassword(password)) return res.status(400).json({ error: 'Password too short (min 6)' });
      hash = await bcrypt.hash(password, 10);
    }

    let effectiveStatus = current.status;
    const norm = normalizeStatus(status);
    if (callerIsAdmin && norm) {
      effectiveStatus = norm;
    } else if ((process.env.AUTO_PROMOTE_ON_ASSIGNMENT || 'true') === 'true') {
      const newDerived = deriveStatus({ roleCode, office_id, municipality_id });
      if (current.status !== 'active' && newDerived === 'active') effectiveStatus = 'active';
    }

    const sets = [
      'first_name = ?', 'last_name = ?', 'email = ?',
      'role = ?', 'status = ?', 'office_id = ?', 'municipality_id = ?',
      'updated_at = NOW()',
    ];
    const params = [
      first_name, last_name, email,
      roleCode, effectiveStatus, safeInt(office_id), safeInt(municipality_id),
    ];
    if (hash) { sets.splice(3, 0, 'password = ?'); params.splice(3, 0, hash); }
    params.push(id);

    await database.execute(
      `UPDATE users SET ${sets.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
      params
    );

    await logAudit(req, {
      action: "UPDATE",
      entity: "users",
      entityId: id,
      statusCode: 200,
      details: { fields: Object.keys(req.body || {}) }
    });

    const [rows] = await database.execute(
      `SELECT id, username, first_name, last_name, email, role, status, office_id, municipality_id, created_at, updated_at
       FROM users WHERE id = ?`,
      [id]
    );
    const u = rows[0];
    return res.json({ data: { ...u, role_code: u.role, role: codeToRole(u.role) || 'UNKNOWN' } });
  } catch (err) {
    console.error('[updateUser]', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function deleteUser(req, res) {
  try {
    const id = safeInt(req.params?.id ?? req.body?.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });

    // Try to soft-delete only if not already deleted
    const [result] = await database.execute(
      `UPDATE users
         SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );

    if (result.affectedRows === 0) {
      // No row changed — either it doesn't exist or is already deleted
      const [existsRows] = await database.execute(
        `SELECT id, deleted_at FROM users WHERE id = ? LIMIT 1`,
        [id]
      );
      if (!existsRows.length) {
        return res.status(404).json({ error: 'User not found' });
      }
      // Exists but already soft-deleted
      return res.status(409).json({ error: 'User already deleted' });
    }

    await logAudit(req, {
      action: "DELETE",
      entity: "users",
      entityId: id,
      statusCode: 200
    });

    return res.json({ result: 1, message: 'User deleted' });
  } catch (err) {
    console.error('[deleteUser]', err);
    return res.status(500).json({ error: err.message });
  }
}

/* ---------- Session helpers ---------- */
export async function me(req, res) {
  try {
    const { id } = req.user || {};
    if (!id) return res.status(401).json({ error: 'Unauthorized' });

    // no-cache for /me
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    const [rows] = await database.execute(
      `SELECT id, username, first_name, last_name, email, role, status, office_id, municipality_id, created_at, updated_at
       FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });

    await logAudit(req, {
      action: "VIEW_ME",
      entity: "users",
      entityId: id,
      statusCode: 200
    });

    const u = rows[0];
    return res.json({ data: { ...u, role_code: u.role, role: codeToRole(u.role) || 'UNKNOWN' }});
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function logout(req, res) {
  try {
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: COOKIE_SAMESITE,
      path: '/',
    });

    await logAudit(req, {
      action: "LOGOUT",
      entity: "auth",
      entityId: req.user?.id ?? null,
      statusCode: 200
    });

    return res.json({ result: 1, message: 'Logged out' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

/* ---------- Admin list (filtered) at /api/admin/users ---------- */
export async function listFilteredUsers(req, res) {
  try {
    const {
      q, role, status, officeId, municipalityId,
      dateFrom, dateTo, page = 1, limit = 20, sort = '-createdAt',
    } = req.query || {};

    const _page = Math.max(parseInt(page, 10) || 1, 1);
    const _limit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const offset = (_page - 1) * _limit;

    const SORT_MAP = {
      id: 'u.id', username: 'u.username', firstName: 'u.first_name', lastName: 'u.last_name',
      email: 'u.email', role: 'u.role', status: 'u.status', officeId: 'u.office_id',
      municipalityId: 'u.municipality_id', createdAt: 'u.created_at', updatedAt: 'u.updated_at',
    };

    let orderBy = 'u.created_at';
    let orderDir = 'DESC';
    if (typeof sort === 'string' && sort.trim()) {
      const raw = sort.trim();
      const desc = raw.startsWith('-');
      const key = desc ? raw.slice(1) : raw;
      if (SORT_MAP[key]) { orderBy = SORT_MAP[key]; orderDir = desc ? 'DESC' : 'ASC'; }
    }

    const where = ['u.deleted_at IS NULL'];
    const params = [];

    if (q && String(q).trim()) {
      const like = `%${String(q).trim()}%`;
      where.push(`(u.username LIKE ? OR u.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)`);
      params.push(like, like, like, like);
    }

    const roleCodeFilter = roleToCode(role);
    if (roleCodeFilter != null) { where.push('u.role = ?'); params.push(roleCodeFilter); }

    const statusNorm = normalizeStatus(status);
    if (statusNorm) { where.push('u.status = ?'); params.push(statusNorm); }

    if (officeId !== undefined && officeId !== '') { where.push('u.office_id = ?'); params.push(safeInt(officeId)); }
    if (municipalityId !== undefined && municipalityId !== '') { where.push('u.municipality_id = ?'); params.push(safeInt(municipalityId)); }

    if (dateFrom) { where.push('u.created_at >= ?'); params.push(`${dateFrom} 00:00:00`); }
    if (dateTo) { where.push('u.created_at <= ?'); params.push(`${dateTo} 23:59:59`); }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const listSql = `
      SELECT u.id, u.username, u.first_name, u.last_name, u.email, u.role, u.status,
             u.office_id, u.municipality_id, u.created_at, u.updated_at
      FROM users u
      ${whereSql}
      ORDER BY ${orderBy} ${orderDir}
      LIMIT ? OFFSET ?`;
    const countSql = `SELECT COUNT(*) AS total FROM users u ${whereSql}`;
    const summarySql = `
      SELECT COUNT(*) AS total,
             SUM(CASE WHEN u.status = 'active' THEN 1 ELSE 0 END) AS active,
             SUM(CASE WHEN u.status = 'pending' THEN 1 ELSE 0 END) AS pending,
             SUM(CASE WHEN u.status = 'disabled' THEN 1 ELSE 0 END) AS disabled
      FROM users u ${whereSql}`;

    const listParams = [...params, _limit, offset];
    const [listRowsP, countRowsP, summaryRowsP] = await Promise.all([
      database.execute(listSql, listParams),
      database.execute(countSql, params),
      database.execute(summarySql, params),
    ]);

    const [listRows] = listRowsP;
    const [countRows] = countRowsP;
    const [summaryRows] = summaryRowsP;

    const total = countRows?.[0]?.total ?? 0;
    const pages = Math.max(Math.ceil(total / _limit), 1);
    const summary = summaryRows?.[0] || { total, active: 0, pending: 0, disabled: 0 };

    const data = listRows.map((u) => ({
      ...u,
      role_code: u.role,
      role: ROLE_CODE_TO_NAME[u.role] || 'UNKNOWN',
    }));

    res.set('X-Total-Count', String(total));

    await logAudit(req, {
      action: "LIST",
      entity: "users",
      statusCode: 200,
      details: {
        q, role, status, officeId, municipalityId, dateFrom, dateTo,
        page: _page, limit: _limit, sort
      }
    });

    return res.json({ data, page: _page, limit: _limit, total, pages, summary });
  } catch (err) {
    console.error('[listFilteredUsers]', err);
    return res.status(500).json({ error: err.message });
  }
}

// --- helper to (re)issue session after profile changes ---
function signAndSetSession(res, dbUser) {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) throw new Error('Server misconfiguration: JWT secret missing');

  const roleName = codeToRole(dbUser.role) || 'UNKNOWN';
  const token = jwt.sign(
    { id: dbUser.id, username: dbUser.username, role: roleName, role_code: dbUser.role },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
  setSessionCookie(res, token);
  return token;
}

/* =========================
   ME: update my profile (username, first/last, email, office/municipality)
   PATCH /api/user/me
   ========================= */
export async function updateMyProfile(req, res) {
  try {
    const meId = req.user?.id;
    if (!meId) return res.status(401).json({ error: 'Unauthorized' });

    const {
      username,
      first_name,
      last_name,
      email,
      office_id,
      municipality_id,
    } = req.body || {};

    // read current
    const [curRows] = await database.execute(
      `SELECT * FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [meId]
    );
    if (!curRows.length) return res.status(404).json({ error: 'User not found' });
    const current = curRows[0];

    // validate inputs only if provided
    if (username != null) {
      if (!isUsername(username)) return res.status(400).json({ error: 'Invalid username format' });
      if (String(username) !== String(current.username)) {
        const [dupU] = await database.execute(
          `SELECT id FROM users WHERE username = ? AND id <> ? AND deleted_at IS NULL LIMIT 1`,
          [username, meId]
        );
        if (dupU.length) return res.status(409).json({ error: 'Username already exists' });
      }
    }

    if (email != null) {
      if (!isEmail(email)) return res.status(400).json({ error: 'Invalid email' });
      if (String(email).toLowerCase() !== String(current.email).toLowerCase()) {
        const [dupE] = await database.execute(
          `SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id <> ? AND deleted_at IS NULL LIMIT 1`,
          [email, meId]
        );
        if (dupE.length) return res.status(409).json({ error: 'Email already exists' });
      }
    }

    const newVals = {
      username: username ?? current.username,
      first_name: first_name ?? current.first_name,
      last_name:  last_name  ?? current.last_name,
      email:      email      ?? current.email,
      office_id:  safeInt(office_id ?? current.office_id),
      municipality_id: safeInt(municipality_id ?? current.municipality_id),
    };

    await database.execute(
      `UPDATE users
          SET username = ?, first_name = ?, last_name = ?, email = ?,
              office_id = ?, municipality_id = ?, updated_at = NOW()
        WHERE id = ? AND deleted_at IS NULL`,
      [
        newVals.username, newVals.first_name, newVals.last_name, newVals.email,
        newVals.office_id, newVals.municipality_id, meId
      ]
    );

    const [rows] = await database.execute(
      `SELECT id, username, first_name, last_name, email, role, status, office_id, municipality_id, created_at, updated_at
         FROM users WHERE id = ? LIMIT 1`,
      [meId]
    );
    const updated = rows[0];

    // re-issue session (username may be in token)
    const token = signAndSetSession(res, updated);

    await logAudit(req, {
      action: "UPDATE_ME",
      entity: "users",
      entityId: meId,
      statusCode: 200,
      details: { fields: Object.keys(req.body || {}) }
    });

    return res.json({
      data: {
        ...updated,
        role_code: updated.role,
        role: codeToRole(updated.role) || 'UNKNOWN'
      },
      token // optional for FE
    });
  } catch (err) {
    console.error('[updateMyProfile]', err);
    return res.status(500).json({ error: err.message });
  }
}

/* =========================
   ME: change my password
   POST /api/user/me/password   { current_password, new_password }
   ========================= */
export async function changeMyPassword(req, res) {
  try {
    const meId = req.user?.id;
    if (!meId) return res.status(401).json({ error: 'Unauthorized' });

    const { current_password, new_password } = req.body || {};
    if (!current_password || !new_password)
      return res.status(400).json({ error: 'Missing current_password or new_password' });
    if (!isGoodPassword(new_password))
      return res.status(400).json({ error: 'New password too short (min 6)' });

    const [rows] = await database.execute(
      `SELECT id, username, password, role FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [meId]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    const user = rows[0];

    const ok = await bcrypt.compare(current_password, user.password);
    if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });

    const hash = await bcrypt.hash(new_password, 10);
    await database.execute(
      `UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?`,
      [hash, meId]
    );

    // rotate session token (optional but good)
    const [freshRows] = await database.execute(
      `SELECT id, username, role FROM users WHERE id = ? LIMIT 1`,
      [meId]
    );
    const fresh = freshRows[0];
    signAndSetSession(res, fresh);

    await logAudit(req, {
      action: "PWD_CHANGE",
      entity: "users",
      entityId: meId,
      statusCode: 200
    });

    return res.json({ result: 1, message: 'Password updated' });
  } catch (err) {
    console.error('[changeMyPassword]', err);
    return res.status(500).json({ error: err.message });
  }
}


const RESET_TTL_MINUTES = Number(process.env.RESET_TTL_MINUTES || 15);
const CLIENT_URL = (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/+$/, "");

// POST /user/forgot-password  { email }
export async function forgotPassword(req, res) {
  const { email } = req.body || {};
  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    // Find user by email (not exposing existence)
    const [rows] = await database.execute(
      "SELECT id FROM users WHERE email = ? AND deleted_at IS NULL LIMIT 1",
      [email]
    );

    // Always respond 200 even if not found (no account enumeration)
    if (rows.length === 0) {
      return res.json({ message: "If that email exists, a reset link has been sent." });
    }

    const userId = rows[0].id;
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Optional: invalidate previous tokens for this user
    await database.execute(
      "DELETE FROM password_resets WHERE user_id = ? OR expires_at < NOW() OR used_at IS NOT NULL",
      [userId]
    );

    // Store new token
    await database.execute(
      `INSERT INTO password_resets (user_id, token_hash, expires_at, ip, user_agent)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE), ?, ?)`,
      [userId, tokenHash, RESET_TTL_MINUTES, req.ip || null, req.headers["user-agent"] || null]
    );

    const resetUrl = `${CLIENT_URL}/reset-password?token=${token}`;
    await sendResetEmail({ to: email, resetUrl });

    return res.json({ message: "If that email exists, a reset link has been sent." });
  } catch (err) {
    console.error("forgotPassword error ▶", err);
    return res.status(500).json({ error: "Unable to process request" });
  }
}

// GET /user/reset-password/:token  -> verify token validity
export async function verifyResetToken(req, res) {
  const { token } = req.params;
  if (!token) return res.status(400).json({ error: "Token is required" });

  try {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const [rows] = await database.execute(
      `SELECT pr.id, pr.user_id
         FROM password_resets pr
        WHERE pr.token_hash = ?
          AND pr.used_at IS NULL
          AND pr.expires_at > NOW()
        LIMIT 1`,
      [tokenHash]
    );

    if (rows.length === 0) return res.status(400).json({ error: "Invalid or expired token" });
    return res.json({ ok: true });
  } catch (err) {
    console.error("verifyResetToken error ▶", err);
    return res.status(500).json({ error: "Unable to verify token" });
  }
}

// POST /user/reset-password  { token, password }
export async function resetPassword(req, res) {
  const { token, password } = req.body || {};
  if (!token || !password) {
    return res.status(400).json({ error: "Token and new password are required" });
  }

  // Basic password policy (adjust as needed)
  if (String(password).length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  try {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Verify token
    const [rows] = await database.execute(
      `SELECT pr.id, pr.user_id
         FROM password_resets pr
        WHERE pr.token_hash = ?
          AND pr.used_at IS NULL
          AND pr.expires_at > NOW()
        LIMIT 1`,
      [tokenHash]
    );
    if (rows.length === 0) return res.status(400).json({ error: "Invalid or expired token" });

    const userId = rows[0].user_id;
    const hashed = await bcrypt.hash(password, 12);

    // Update user password
    await database.execute(
      "UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?",
      [hashed, userId]
    );

    // Mark token as used and clean others
    await database.execute("UPDATE password_resets SET used_at = NOW() WHERE id = ?", [rows[0].id]);
    await database.execute("DELETE FROM password_resets WHERE user_id = ? AND used_at IS NULL", [userId]);

    return res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error("resetPassword error ▶", err);
    return res.status(500).json({ error: "Unable to reset password" });
  }
}

export default {
  signup, login,
  createUser, getUserById, updateUser, deleteUser, listFilteredUsers,
  me, logout,
  updateMyProfile, changeMyPassword,  forgotPassword,
  verifyResetToken,
  resetPassword,
};