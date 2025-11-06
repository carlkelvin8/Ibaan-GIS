// frontend/src/hooks/useUsersQuery.js
import { useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../lib/axios";

/**
 * Helper: basahin filters mula sa URL
 */
function readFilters(sp) {
  const num = (v, d) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : d;
  };

  const get = (k) => sp.get(k) ?? "";

  const page = num(sp.get("page"), 1);
  const limit = Math.min(num(sp.get("limit"), 20), 100);
  const sort = sp.get("sort") ?? "-createdAt";

  return {
    q: get("q"),
    role: get("role"),
    status: get("status"),
    officeId: get("officeId"),
    municipalityId: get("municipalityId"),
    dateFrom: get("dateFrom"),
    dateTo: get("dateTo"),
    page,
    limit,
    sort,
  };
}

/**
 * Helper: update a single URL param (auto-reset page kung filter ang binago)
 */
function useParamSetter(searchParams, setSearchParams) {
  return useCallback(
    (key, value) => {
      const next = new URLSearchParams(searchParams);
      if (value === "" || value == null) next.delete(key);
      else next.set(key, String(value));

      if (["q", "role", "status", "officeId", "municipalityId", "dateFrom", "dateTo", "limit"].includes(key)) {
        next.set("page", "1");
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );
}

/**
 * Main hook
 * Returns:
 *  - data: { rows, total, pages, page, limit, summary }
 *  - loading / error
 *  - setters: setParam, setPage, setSort, setLimit
 *  - refetch
 */
export default function useUsersQuery() {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = useMemo(() => readFilters(searchParams), [searchParams]);
  const setParam = useParamSetter(searchParams, setSearchParams);

  const queryKey = useMemo(() => ["admin-users", params], [params]);

  const fetchUsers = async () => {
    const { data } = await api.get("/admin/users", { params });
    // normalize
    return {
      rows: Array.isArray(data.data) ? data.data : [],
      total: Number(data.total ?? 0),
      pages: Number(data.pages ?? 1),
      page: Number(data.page ?? params.page),
      limit: Number(data.limit ?? params.limit),
      summary: data.summary ?? { total: data.total ?? 0, active: 0, pending: 0, disabled: 0 },
    };
  };

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching, // pwede mong gamitin for spinners
  } = useQuery({
    queryKey,
    queryFn: fetchUsers,
    keepPreviousData: true,
    staleTime: 15_000,
  });

  // convenience setters
  const setPage = (p) => setParam("page", Math.max(1, Number(p) || 1));
  const setSort = (s) => setParam("sort", s || "-createdAt");
  const setLimit = (n) => setParam("limit", Math.min(Math.max(Number(n) || 20, 1), 100));

  return {
    data: data || {
      rows: [],
      total: 0,
      pages: 1,
      page: params.page,
      limit: params.limit,
      summary: { total: 0, active: 0, pending: 0, disabled: 0 },
    },
    loading: isLoading,
    fetching: isFetching,
    error: isError ? (error?.response?.data?.error || error?.message || "Error") : null,
    refetch,
    // current filters
    params,
    // setters
    setParam,
    setPage,
    setSort,
    setLimit,
  };
}
