// src/middleware/isAdmin.js

/**
 * Admin gate middleware.
 *
 * Modern allowed role:
 *   - "ADMIN"
 *
 * Legacy accepted (during transition):
 *   - "admin"
 *   - "superadmin"
 *   - 1 (numeric)
 *
 * Notes:
 * - Other office roles (ASSESSOR, ENGINEER, PLANNER, BPLO) are NOT allowed here.
 * - Ensure your auth middleware has set req.user.role.
 */
export default function isAdmin(req, res, next) {
  const raw = req.user?.role;

  // Normalize to make robust against different storage types
  const roleStr = raw != null ? String(raw).trim() : "";
  const upper = roleStr.toUpperCase();

  const isModernAdmin = upper === "ADMIN";
  const isLegacyAdmin =
    roleStr.toLowerCase() === "admin" ||
    roleStr.toLowerCase() === "superadmin" ||
    Number(raw) === 1;

  if (isModernAdmin || isLegacyAdmin) {
    return next();
  }

  return res.status(403).json({
    result: 0,
    error:
      "Admin access required. Allowed roles: ADMIN (or legacy: admin/superadmin/1).",
  });
}

/*
 * If you ever want to allow office roles into some routes:
 *   const OFFICE_ROLES = new Set(["ASSESSOR","ENGINEER","PLANNER","BPLO"]);
 *   if (OFFICE_ROLES.has(upper)) { ... } // but NOT in isAdmin—make a separate middleware, e.g., hasOfficeRole()
 */
