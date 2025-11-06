// src/lib/buildUserFilters.js

/**
 * Builder ng SQL filters para sa Users list.
 * Input: query params (q, role, status, officeId, municipalityId, dateFrom, dateTo, page, limit, sort)
 * Output: { whereSql, params, sortSql, page, limit, offset }
 */

export const ROLE_ENUM = Object.freeze([
  "ADMIN",
  "ASSESSOR",
  "ENGINEER",
  "PLANNER",
  "BPLO",
]);

export const STATUS_ENUM = Object.freeze(["active", "pending", "disabled"]);

const SORT_MAP = Object.freeze({
  id: "u.id",
  username: "u.username",
  firstName: "u.first_name",
  lastName: "u.last_name",
  email: "u.email",
  role: "u.role",
  status: "u.status",
  officeId: "u.office_id",
  municipalityId: "u.municipality_id",
  createdAt: "u.created_at",
  updatedAt: "u.updated_at",
});

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function toInt(val, def) {
  const n = parseInt(val, 10);
  return Number.isFinite(n) ? n : def;
}

function normalizeRoleValue(v) {
  if (v == null) return null;
  const up = String(v).trim().toUpperCase();
  return ROLE_ENUM.includes(up) ? up : null;
}

function parseRoleFilter(input) {
  if (input == null || input === "") return [];
  // allow array or comma-separated string
  const arr = Array.isArray(input) ? input : String(input).split(",");
  const norm = arr
    .map((r) => normalizeRoleValue(r))
    .filter((r) => !!r);
  // unique
  return [...new Set(norm)];
}

function normalizeStatusValue(v) {
  if (v == null) return null;
  const s = String(v).trim().toLowerCase();
  if (STATUS_ENUM.includes(s)) return s;
  // legacy numeric mapping (optional)
  if (s === "1") return "active";
  if (s === "0") return "pending";
  if (s === "-1") return "disabled";
  return null;
}

export function buildUserFilters(rawQuery = {}) {
  const q = (rawQuery.q ?? "").toString().trim();
  const roleInput = rawQuery.role ?? ""; // string|array
  const statusInput = rawQuery.status ?? "";
  const officeId = rawQuery.officeId ?? "";
  const municipalityId = rawQuery.municipalityId ?? "";
  const dateFrom = (rawQuery.dateFrom ?? "").toString().trim(); // YYYY-MM-DD
  const dateTo = (rawQuery.dateTo ?? "").toString().trim(); // YYYY-MM-DD

  const page = Math.max(toInt(rawQuery.page, 1), 1);
  const limit = Math.min(Math.max(toInt(rawQuery.limit, DEFAULT_LIMIT), 1), MAX_LIMIT);
  const offset = (page - 1) * limit;

  // sort: "-createdAt" | "username" etc.
  let sort = (rawQuery.sort ?? "-createdAt").toString().trim();
  let orderByCol = SORT_MAP.createdAt;
  let orderDir = "DESC";
  if (sort) {
    const isDesc = sort.startsWith("-");
    const key = isDesc ? sort.slice(1) : sort;
    if (SORT_MAP[key]) {
      orderByCol = SORT_MAP[key];
      orderDir = isDesc ? "DESC" : "ASC";
    }
  }
  const sortSql = `${orderByCol} ${orderDir}`;

  const where = ["u.deleted_at IS NULL"]; // exclude soft-deleted
  const params = [];

  if (q) {
    const like = `%${q}%`;
    where.push(
      "(u.username LIKE ? OR u.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)"
    );
    params.push(like, like, like, like);
  }

  // role: supports single or multiple (IN)
  const roles = parseRoleFilter(roleInput);
  if (roles.length === 1) {
    where.push("u.role = ?");
    params.push(roles[0]);
  } else if (roles.length > 1) {
    where.push(`u.role IN (${roles.map(() => "?").join(", ")})`);
    params.push(...roles);
  }

  // status normalization
  const statusNorm = normalizeStatusValue(statusInput);
  if (statusNorm) {
    where.push("u.status = ?");
    params.push(statusNorm);
  }

  if (officeId !== "") {
    where.push("u.office_id = ?");
    params.push(officeId);
  }

  if (municipalityId !== "") {
    where.push("u.municipality_id = ?");
    params.push(municipalityId);
  }

  if (dateFrom) {
    where.push("DATE(u.created_at) >= ?");
    params.push(dateFrom);
  }
  if (dateTo) {
    where.push("DATE(u.created_at) <= ?");
    params.push(dateTo);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  return {
    whereSql,
    params,
    sortSql,
    page,
    limit,
    offset,
  };
}

export default buildUserFilters;
