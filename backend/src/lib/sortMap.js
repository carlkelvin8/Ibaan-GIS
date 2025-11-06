// src/lib/sortMap.js

/**
 * Whitelist ng sort keys → actual DB columns (aliased as `u` for users table).
 * Idagdag mo lang dito kung may bago kang column na dapat i-allow sa sort.
 */
export const SORT_MAP = Object.freeze({
  id: 'u.id',
  username: 'u.username',
  firstName: 'u.first_name',
  lastName: 'u.last_name',
  email: 'u.email',
  role: 'u.role',
  status: 'u.status',
  officeId: 'u.office_id',
  municipalityId: 'u.municipality_id',
  createdAt: 'u.created_at',
  updatedAt: 'u.updated_at',
});

/**
 * Parse ng sort string na gaya ng:
 *  - "username"    → ASC
 *  - "-createdAt"  → DESC
 *
 * @param {string} rawSort ex: "-createdAt", "username"
 * @param {string} defaultKey key sa SORT_MAP (default: "createdAt")
 * @param {"ASC"|"DESC"} defaultDir default direction (default: "DESC")
 * @param {string} [tieBreaker="u.id"] optional pangalawang sort para stable ordering
 *
 * @returns {{ column: string, direction: "ASC"|"DESC", sql: string }}
 *          sql example: "u.created_at DESC, u.id DESC"
 */
export function parseSort(
  rawSort,
  defaultKey = 'createdAt',
  defaultDir = 'DESC',
  tieBreaker = 'u.id'
) {
  let key = defaultKey;
  let dir = defaultDir;

  if (typeof rawSort === 'string' && rawSort.trim().length) {
    const s = rawSort.trim();
    const isDesc = s.startsWith('-');
    const maybeKey = isDesc ? s.slice(1) : s;

    if (SORT_MAP[maybeKey]) {
      key = maybeKey;
      dir = isDesc ? 'DESC' : 'ASC';
    }
  }

  const column = SORT_MAP[key] || SORT_MAP[defaultKey];
  // Stable ordering: idagdag tiebreaker para hindi "talon-talon" ang rows kapag equal ang primary column
  const sql = `${column} ${dir}${tieBreaker ? `, ${tieBreaker} ${dir}` : ''}`;

  return { column, direction: dir, sql };
}

export default { SORT_MAP, parseSort };
