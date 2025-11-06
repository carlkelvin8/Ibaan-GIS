// src/constants/roles.js

// ===== Role & Status enums (single source of truth) =====
export const ROLES = Object.freeze([
  "ADMIN",
  "ASSESSOR",
  "ENGINEER",
  "PLANNER",
  "BPLO",
]);

export const STATUSES = Object.freeze(["active", "pending", "disabled"]);

// Optional: human-readable labels (UI display)
export const ROLE_LABELS = Object.freeze({
  ADMIN: "Admin",
  ASSESSOR: "Assessor’s Office",
  ENGINEER: "Engineer’s Office",
  PLANNER: "Planning & Development Office",
  BPLO: "Business Permits & Licensing Office",
});

export const STATUS_LABELS = Object.freeze({
  active: "Active",
  pending: "Pending",
  disabled: "Disabled",
});

// Optional: default values
export const DEFAULT_ROLE = "BPLO";
export const DEFAULT_STATUS = "pending";

// ===== Helpers =====
export function normalizeRole(role) {
  if (role == null) return null;
  const r = String(role).trim().toUpperCase();
  // legacy fallbacks (optional)
  if (r === "SUPERADMIN") return "ADMIN";
  if (r === "1") return "ADMIN";
  return ROLES.includes(r) ? r : null;
}

export function normalizeStatus(status) {
  if (status == null) return null;
  const s = String(status).trim().toLowerCase();
  // legacy numeric mapping (optional)
  if (s === "1") return "active";
  if (s === "0") return "pending";
  if (s === "-1") return "disabled";
  return STATUSES.includes(s) ? s : null;
}

export function isAdminRole(role) {
  const r = normalizeRole(role);
  return r === "ADMIN";
}

export function isOfficeRole(role) {
  const r = normalizeRole(role);
  return r && r !== "ADMIN"; // ASSESSOR/ENGINEER/PLANNER/BPLO
}

// Quick permission helper (adjust as needed)
export function canManageUsers(role) {
  return isAdminRole(role); // only ADMIN by default
}

export default {
  ROLES,
  STATUSES,
  ROLE_LABELS,
  STATUS_LABELS,
  DEFAULT_ROLE,
  DEFAULT_STATUS,
  normalizeRole,
  normalizeStatus,
  isAdminRole,
  isOfficeRole,
  canManageUsers,
};
