// frontend/src/components/admin/Users.jsx
import React from "react";
import UserFilters from "./UserFilters";
import KpiCards from "./KpiCards";
import UsersTable from "./UsersTable";
import useUsersQuery from "../../hooks/useUsersQuery";

/**
 * Admin Users Page
 * - Filters (URL-synced)
 * - KPI Cards (Total / Active / Pending / Disabled)
 * - Sortable, paginated table
 */
export default function Users() {
  const {
    data: { rows, total, pages, page, summary },
    loading,
    error,
    params,
    setPage,
    setSort,
  } = useUsersQuery();

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ margin: "0 0 12px", fontWeight: 800 }}>Admin • Users</h2>

      {/* KPIs */}
      <KpiCards summary={summary} loading={loading} />

      {/* Filters (URL-synced) */}
      <UserFilters />

      {/* Table */}
      <UsersTable
        rows={rows}
        loading={loading}
        error={error}
        total={total}
        page={page}
        pages={pages}
        sort={params.sort}
        onSortChange={setSort}
        onPageChange={setPage}
      />
    </div>
  );
}
