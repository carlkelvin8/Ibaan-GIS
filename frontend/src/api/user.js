// frontend/src/api/users.js
import api from "../lib/axios";

/**
 * Build querystring from plain object (skips null/undefined/"")
 */
function toQuery(params = {}) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === null || v === undefined || v === "") return;
    sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/**
 * GET /api/admin/users
 * params: { q, role, status, officeId, municipalityId, dateFrom, dateTo, page, limit, sort }
 */
export async function listUsers(params = {}) {
  const qs = toQuery(params);
  const { data } = await api.get(`/admin/users${qs}`);
  return data; // { data, page, limit, total, pages, summary }
}

/** GET /api/admin/users/:id */
export async function getUser(id) {
  const { data } = await api.get(`/admin/users/${id}`);
  return data;
}

/** POST /api/admin/users */
export async function createUser(payload) {
  // payload: { username, first_name, last_name, email, password, role, status, office_id?, municipality_id? }
  const { data } = await api.post(`/admin/users`, payload);
  return data;
}

/** PATCH /api/admin/users/:id */
export async function updateUser(id, payload) {
  // payload: same as create; password optional (only if changing)
  const { data } = await api.patch(`/admin/users/${id}`, payload);
  return data;
}

/** DELETE /api/admin/users/:id */
export async function deleteUser(id) {
  const { data } = await api.delete(`/admin/users/${id}`);
  return data;
}

/** PATCH /api/admin/users/:id/password */
export async function changePassword(id, { password }) {
  const { data } = await api.patch(`/admin/users/${id}/password`, { password });
  return data;
}

/**
 * (optional) PATCH /api/admin/users:bulk
 * actions: { ids: number[], action: 'activate'|'disable'|'setRole', role?: 'ADMIN'|'ASSESSOR'|'ENGINEER'|'PLANNER'|'BPLO' }
 */
export async function bulkUpdate(payload) {
  const { data } = await api.patch(`/admin/users:bulk`, payload);
  return data;
}

export default {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  changePassword,
  bulkUpdate,
};
