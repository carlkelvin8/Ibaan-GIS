import jwt from 'jsonwebtoken';

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'session';

/** Accept session from cookie OR Authorization: Bearer */
export function authRequired(req, res, next) {
  try {
    const auth = req.headers.authorization;
    const bearer = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
    const token = req.cookies?.[COOKIE_NAME] || bearer;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, username, role, role_code }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

/** Role guard: requireRole('ADMIN') etc */
export function requireRole(...roles) {
  const expected = roles.map((r) => String(r).toUpperCase());
  return (req, res, next) => {
    const roleName = String(req.user?.role || '').toUpperCase();
    const roleCode = Number(req.user?.role_code);
    if (roleName && expected.includes(roleName)) return next();
    if (Number.isFinite(roleCode) && expected.some((r) => /^\d+$/.test(r) && Number(r) === roleCode)) return next();
    return res.status(403).json({ error: 'Forbidden' });
  };
}

export default { authRequired, requireRole };