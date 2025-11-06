export function normalizeDate(value) {
  if (!value) return null;

  // If already in YYYY-MM-DD format → return as is
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return null; // invalid date

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    return `${y}-${m}-${day}`;
  } catch (err) {
    console.error("normalizeDate error:", err);
    return null;
  }
}
