// backend/src/controllers/ibaanController.js
import { database } from "../config/database.js";
import { formatDate } from "../lib/utils.js";
import { writeAuditLog, diffFields } from "../lib/audit.js";

const WRITABLE_FIELDS = [
  "ParcelId","SurveyId","BlockNumber","LotNumber","Area","Claimant","TiePointId","TiePointNa",
  "SurveyPlan","BarangayNa","Coordinate","XI","YI","LongitudeI","LatitudeI","LengthI","AreaI",
  "VersionI","tax_ID","Tax_Amount","Due_Date","AmountPaid","Date_paid","geometry"
];
const DATE_FIELDS = ["Due_Date","Date_paid"];

const DBG = process.env.DEBUG_IB === "1"; // set to 1 to enable console debug

function pickWritable(body = {}) {
  const out = {};
  for (const k of WRITABLE_FIELDS) {
    if (body[k] === undefined) continue;
    let v = body[k];

    if (DATE_FIELDS.includes(k)) v = formatDate(v) || null;

    if (k === "geometry") {
      // Accept string JSON or object; always end up with a JSON string for MySQL JSON column
      if (v && typeof v === "string") {
        try { v = JSON.parse(v); } catch { /* keep raw string if not JSON */ }
      }
      if (v && typeof v === "object") {
        try { v = JSON.stringify(v); } catch { /* leave as-is; audit/DB may reject invalid JSON */ }
      }
    }

    out[k] = v;
  }
  return out;
}

function slim(row = {}) {
  if (!row) return null;
  const {
    ParcelId, SurveyId, BlockNumber, LotNumber, Area, Claimant, TiePointId, TiePointNa,
    SurveyPlan, BarangayNa, Coordinate, XI, YI, LongitudeI, LatitudeI, LengthI, AreaI,
    VersionI, tax_ID, Tax_Amount, Due_Date, AmountPaid, Date_paid
  } = row;
  return {
    ParcelId, SurveyId, BlockNumber, LotNumber, Area, Claimant, TiePointId, TiePointNa,
    SurveyPlan, BarangayNa, Coordinate, XI, YI, LongitudeI, LatitudeI, LengthI, AreaI,
    VersionI, tax_ID, Tax_Amount, Due_Date, AmountPaid, Date_paid
  };
}

/* ===== READ ===== */
export async function getAll(_req, res) {
  try {
    const [rows] = await database.query("SELECT * FROM ibaan");
    res.json(rows);
  } catch (err) {
    console.error("getAll error:", err);
    res.status(500).json({ error: err?.sqlMessage || err.message });
  }
}

export async function getById(req, res) {
  try {
    const idRaw = String(req.params.id ?? "").trim();
    if (!/^\d+$/.test(idRaw)) {
      return res.status(400).json({ error: "ParcelId must be numeric" });
    }
    const id = Number(idRaw);

    const [rows] = await database.query(
      "SELECT * FROM ibaan WHERE ParcelId = ? LIMIT 1",
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: "Data not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("getById error:", err);
    res.status(500).json({ error: err?.sqlMessage || err.message });
  }
}

/* ===== CREATE ===== */
export async function addNew(req, res) {
  try {
    const data = pickWritable(req.body);
    if (!data.ParcelId) return res.status(400).json({ error: "ParcelId is required" });

    const cols = Object.keys(data);
    const placeholders = cols.map(() => "?").join(", ");
    const values = cols.map((k) => data[k]);

    if (DBG) console.log("[ibaan.addNew] cols:", cols, "values:", values);

    await database.query(
      `INSERT INTO ibaan (${cols.join(", ")}) VALUES (${placeholders})`,
      values
    );

    const [rows] = await database.query(
      "SELECT * FROM ibaan WHERE ParcelId = ? LIMIT 1",
      [data.ParcelId]
    );
    const created = rows[0] || data;

    try {
      await writeAuditLog({
        req,
        action: "CREATE",
        entity_type: "ibaan",
        entity_id: String(data.ParcelId),
        entity_ctx: { ParcelId: data.ParcelId, LotNumber: created?.LotNumber, BarangayNa: created?.BarangayNa },
        changed_fields: Object.keys(slim(created) || {}),
        before_data: null,
        after_data: slim(created),
      });
    } catch (auditErr) {
      console.error("Audit log error in addNew:", auditErr);
    }

    res.status(201).json({ message: "Parcel created", data: created });
  } catch (err) {
    console.error("addNew error:", err);
    res.status(500).json({ error: err?.sqlMessage || err.message });
  }
}

/* ===== UPDATE ===== */
export async function editById(req, res) {
  try {
    const idRaw = String(req.params.id ?? "").trim();
    if (!/^\d+$/.test(idRaw)) {
      return res.status(400).json({ error: "ParcelId must be numeric" });
    }
    const id = Number(idRaw);

    const patch = pickWritable(req.body);
    if ("ParcelId" in patch) delete patch.ParcelId; // don't allow PK change

    // Get before state
    const [beforeRows] = await database.query(
      "SELECT * FROM ibaan WHERE ParcelId = ? LIMIT 1",
      [id]
    );
    if (!beforeRows.length) return res.status(404).json({ error: "Data not found" });
    const before = beforeRows[0];

    if (!Object.keys(patch).length) {
      return res.status(400).json({ error: "No updatable fields provided" });
    }

    // Build update query with proper escaping
    const sets = Object.keys(patch).map((k) => `\`${k}\` = ?`).join(", ");
    const values = Object.keys(patch).map((k) => patch[k]);

    if (DBG) console.log("[ibaan.update] id:", id, "patch:", patch, "sets:", sets, "values:", values);

    const [result] = await database.query(
      `UPDATE ibaan SET ${sets} WHERE ParcelId = ?`,
      [...values, id]
    );

    if (DBG) console.log("[ibaan.update] result:", result);

    // Treat no-op updates as success to avoid confusion
    if (!result.affectedRows) {
      return res.json({ message: "No changes", data: before });
    }

    // Get after state
    const [afterRows] = await database.query(
      "SELECT * FROM ibaan WHERE ParcelId = ? LIMIT 1",
      [id]
    );
    const after = afterRows[0];

    // Calculate changes safely
    const beforeSlim = slim(before);
    const afterSlim = slim(after);

    let changed = [];
    try {
      changed = diffFields(beforeSlim, afterSlim);
    } catch (diffErr) {
      console.error("Error calculating field differences:", diffErr);
      // Fallback to just the fields that were in the patch
      changed = Object.keys(patch);
    }

    // Only log when there are actual changes
    if (changed.length) {
      try {
        await writeAuditLog({
          req,
          action: "UPDATE",
          entity_type: "ibaan",
          entity_id: String(id),
          entity_ctx: {
            ParcelId: id,
            LotNumber: after?.LotNumber || before?.LotNumber,
            BarangayNa: after?.BarangayNa || before?.BarangayNa,
          },
          changed_fields: changed,
          before_data: beforeSlim,
          after_data: afterSlim,
        });
      } catch (auditErr) {
        console.error("Audit log error in editById:", auditErr);
      }
    }

    res.json({ message: "Parcel updated successfully", data: after });
  } catch (err) {
    console.error("editById error:", err);
    res.status(500).json({ error: err?.sqlMessage || err.message });
  }
}

/* ===== DELETE ===== */
export async function removeById(req, res) {
  try {
    const idRaw = String(req.params.id ?? "").trim();
    if (!/^\d+$/.test(idRaw)) {
      return res.status(400).json({ error: "ParcelId must be numeric" });
    }
    const id = Number(idRaw);

    const [rows] = await database.query(
      "SELECT * FROM ibaan WHERE ParcelId = ? LIMIT 1",
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: "Data not found" });
    const before = rows[0];

    const [result] = await database.query(
      "DELETE FROM ibaan WHERE ParcelId = ?",
      [id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: "Not found" });

    try {
      await writeAuditLog({
        req,
        action: "DELETE",
        entity_type: "ibaan",
        entity_id: String(id),
        entity_ctx: { ParcelId: id, LotNumber: before?.LotNumber, BarangayNa: before?.BarangayNa },
        changed_fields: [],
        before_data: slim(before),
        after_data: null,
      });
    } catch (auditErr) {
      console.error("Audit log error in removeById:", auditErr);
    }

    res.json({ message: "Parcel deleted" });
  } catch (err) {
    console.error("removeById error:", err);
    res.status(500).json({ error: err?.sqlMessage || err.message });
  }
}

/* ===== SEARCH ===== */
export async function search(req, res) {
  try {
    const raw = String(req.params.value ?? "").trim();
    if (!raw) return res.json([]);

    const needle = `%${raw}%`;
    const [rows] = await database.query(
      `SELECT * FROM ibaan
       WHERE CAST(ParcelId AS CHAR) LIKE ?
          OR Claimant LIKE ?
          OR BarangayNa LIKE ?`,
      [needle, needle, needle]
    );
    res.json(rows);
  } catch (err) {
    console.error("search error:", err);
    res.status(500).json({ error: err?.sqlMessage || err.message });
  }
}
