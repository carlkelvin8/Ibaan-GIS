// frontend/src/components/admin/KpiCards.jsx
import React from "react";

/**
 * Props:
 * - summary?: { total?: number, active?: number, pending?: number, disabled?: number }
 * - loading?: boolean
 * - labels?: { total?: string, active?: string, pending?: string, disabled?: string }
 * - gridCols?: string  // CSS grid template e.g. "repeat(auto-fit, minmax(180px, 1fr))"
 */
export default function KpiCards({
  summary = {},
  loading = false,
  labels = {},
  gridCols = "repeat(auto-fit, minmax(180px, 1fr))",
}) {
  const data = [
    { key: "total",    title: labels.total ?? "Total Users", value: summary.total ?? 0, tone: "default" },
    { key: "active",   title: labels.active ?? "Active",     value: summary.active ?? 0, tone: "success" },
    { key: "pending",  title: labels.pending ?? "Pending",   value: summary.pending ?? 0, tone: "warn" },
    { key: "disabled", title: labels.disabled ?? "Disabled", value: summary.disabled ?? 0, tone: "danger" },
  ];

  return (
    <section
      aria-label="User KPIs"
      style={{
        display: "grid",
        gridTemplateColumns: gridCols,
        gap: 12,
        marginBottom: 16,
      }}
    >
      {data.map((kpi) => (
        <Card
          key={kpi.key}
          title={kpi.title}
          value={kpi.value}
          loading={loading}
          tone={kpi.tone}
        />
      ))}
    </section>
  );
}

/* ----------------- subcomponents ----------------- */

function Card({ title, value, loading, tone = "default" }) {
  const toneStyle = tones[tone] || tones.default;

  return (
    <article
      role="group"
      aria-label={title}
      style={{
        border: "1px solid var(--kpi-border, #d0d7de)",
        borderRadius: 12,
        padding: 12,
        background: "var(--kpi-bg, #fff)",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        minHeight: 84,
      }}
    >
      <h3
        style={{
          margin: 0,
          fontSize: 12,
          lineHeight: 1.2,
          color: "var(--kpi-muted, #57606a)",
          fontWeight: 600,
        }}
      >
        {title}
      </h3>

      {loading ? (
        <Skeleton ariaLabel={`${title} loading`} />
      ) : (
        <div
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: toneStyle.text,
            lineHeight: 1.1,
          }}
        >
          {formatNum(value)}
        </div>
      )}

      <div
        aria-hidden="true"
        style={{
          height: 4,
          width: "100%",
          background: toneStyle.barBg,
          borderRadius: 999,
          marginTop: 2,
        }}
      />
    </article>
  );
}

function Skeleton({ ariaLabel }) {
  return (
    <div
      role="status"
      aria-label={ariaLabel}
      aria-live="polite"
      style={{
        height: 28,
        width: 90,
        borderRadius: 6,
        background:
          "linear-gradient(90deg, #eee 25%, #f5f5f5 37%, #eee 63%)",
        backgroundSize: "400% 100%",
        animation: "kpi-skeleton 1.2s ease-in-out infinite",
      }}
    />
  );
}

const tones = {
  default: { text: "#111827", barBg: "#e5e7eb" },
  success: { text: "#065f46", barBg: "#a7f3d0" },
  warn:    { text: "#92400e", barBg: "#fde68a" },
  danger:  { text: "#991b1b", barBg: "#fecaca" },
};

/* ----------------- utils ----------------- */

function formatNum(n) {
  try {
    return new Intl.NumberFormat().format(Number(n) || 0);
  } catch {
    return String(n ?? 0);
  }
}

/* Inject once: skeleton keyframes (scoped) */
const styleId = "kpi-cards-skeleton-style";
if (typeof document !== "undefined" && !document.getElementById(styleId)) {
  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    @keyframes kpi-skeleton {
      0% { background-position: 100% 50%; }
      100% { background-position: 0 50%; }
    }
  `;
  document.head.appendChild(style);
}
