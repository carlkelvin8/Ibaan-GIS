// src/lib/paginate.js

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Safe parse ng integer na may fallback.
 * @param {any} val
 * @param {number} fallback
 * @returns {number}
 */
function toInt(val, fallback) {
  const n = parseInt(val, 10);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Kunin ang page/limit mula sa query at i-compute ang offset.
 * @param {object} raw - karaniwang galing sa req.query
 * @param {number} [defaultLimit=DEFAULT_LIMIT]
 * @param {number} [maxLimit=MAX_LIMIT]
 * @returns {{ page:number, limit:number, offset:number }}
 */
export function parsePagination(raw = {}, defaultLimit = DEFAULT_LIMIT, maxLimit = MAX_LIMIT) {
  const page = Math.max(toInt(raw.page, 1), 1);
  const limit = Math.min(Math.max(toInt(raw.limit, defaultLimit), 1), maxLimit);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/**
 * Compute ng meta info para sa response.
 * @param {number} total - kabuuang rows (COUNT)
 * @param {number} page
 * @param {number} limit
 * @returns {{ total:number, page:number, limit:number, pages:number, hasPrev:boolean, hasNext:boolean }}
 */
export function buildMeta(total = 0, page = 1, limit = DEFAULT_LIMIT) {
  const safeTotal = Math.max(0, Number(total) || 0);
  const safeLimit = Math.max(1, Number(limit) || DEFAULT_LIMIT);
  const pages = Math.max(Math.ceil(safeTotal / safeLimit), 1);
  const safePage = Math.min(Math.max(1, Number(page) || 1), pages);
  const hasPrev = safePage > 1;
  const hasNext = safePage < pages;
  return { total: safeTotal, page: safePage, limit: safeLimit, pages, hasPrev, hasNext };
}

/**
 * (Optional) Mag-set ng pagination headers:
 * - X-Total-Count: total rows
 * - Link: RFC5988 links para sa prev/next (kung applicable)
 *
 * @param {import('express').Response} res
 * @param {number} total
 * @param {{protocol:string, get:Function, originalUrl:string}} reqLike - karaniwang req object
 * @param {{page:number, limit:number}} paging
 */
export function setPaginationHeaders(res, total, reqLike, paging) {
  try {
    res.set('X-Total-Count', String(total));

    // Build absolute URLs for the Link header
    const { page, limit } = paging;
    const { protocol, get, originalUrl } = reqLike;
    const host = typeof get === 'function' ? get.call(reqLike, 'host') : reqLike.host;

    if (!protocol || !host || !originalUrl) return;

    const baseUrl = `${protocol}://${host}${originalUrl}`;
    const url = new URL(baseUrl);

    const mkUrl = (p) => {
      const u = new URL(url.toString());
      u.searchParams.set('page', String(p));
      u.searchParams.set('limit', String(limit));
      return u.toString();
    };

    const pages = Math.max(Math.ceil((Number(total) || 0) / (Number(limit) || DEFAULT_LIMIT)), 1);
    const parts = [];

    if (page > 1) {
      parts.push(`<${mkUrl(1)}>; rel="first"`);
      parts.push(`<${mkUrl(page - 1)}>; rel="prev"`);
    }
    if (page < pages) {
      parts.push(`<${mkUrl(page + 1)}>; rel="next"`);
      parts.push(`<${mkUrl(pages)}>; rel="last"`);
    }

    if (parts.length) res.set('Link', parts.join(', '));
  } catch {
    // tahimik lang kung hindi ma-build (e.g., test env or malformed reqLike)
  }
}

export default {
  parsePagination,
  buildMeta,
  setPaginationHeaders,
};
