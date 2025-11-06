import { database } from "../config/database.js";
import { formatDate } from "../lib/utils.js";

// Helpers
const b = (v) => (v ? 1 : 0); // boolean -> tinyint(1)
const maybe = (v) => (v === undefined || v === "" ? null : v);

/**
 * GET /api/tax
 * Optional filters: ?lotNo=...&barangay=...
 * (parcelId is intentionally NOT supported because the table has no parcelId column)
 */
export async function getAll(req, res) {
  try {
    const { lotNo, barangay } = req.query;

    let sql = "SELECT * FROM tax_forms";
    const params = [];

    if (lotNo) {
      sql += " WHERE lotNo = ?";
      params.push(lotNo);
      if (barangay) {
        sql += " AND barangay = ?";
        params.push(barangay);
      }
    }

    const [rows] = await database.query(sql, params);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "No tax record found" });
    }
    res.json(rows);
  } catch (err) {
    console.error("getAll error:", err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/tax
 * Insert WITHOUT parcelId (column does not exist in schema)
 */
export async function addNew(req, res) {
  const d = req.body || {};
  try {
    const sql = `
      INSERT INTO tax_forms (
        arpNo, tdPrinted, municipalCode, accountNo, ownerName, ownerAddress,
        administrator, adminAddress, north, east, south, west,
        propertyIndexNo, subdivision, phase, lotNo, tdPrintedNo,
        houseNo, street, landmark, barangay, barangayOnPrint, barangayText,
        octNo, dated, surveyNo, cadLotNo, lotNo2, blockNo
      )
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `;

    const [result] = await database.query(sql, [
      maybe(d.arpNo),
      b(d.tdPrinted),
      b(d.municipalCode),
      maybe(d.accountNo),
      maybe(d.ownerName),
      maybe(d.ownerAddress),
      maybe(d.administrator),
      maybe(d.adminAddress),
      maybe(d.north),
      maybe(d.east),
      maybe(d.south),
      maybe(d.west),
      maybe(d.propertyIndexNo),
      maybe(d.subdivision),
      maybe(d.phase),
      maybe(d.lotNo),
      maybe(d.tdPrintedNo),
      maybe(d.houseNo),
      maybe(d.street),
      maybe(d.landmark),
      maybe(d.barangay),
      b(d.barangayOnPrint),
      maybe(d.barangayText),
      maybe(d.octNo),
      formatDate(d.dated) || null,
      maybe(d.surveyNo),
      maybe(d.cadLotNo),
      maybe(d.lotNo2),
      maybe(d.blockNo),
    ]);

    res.json({ message: "Tax added successfully", insertId: result.insertId });
  } catch (err) {
    console.error("addNew error:", err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/tax/:id
 */
export async function getById(req, res) {
  try {
    const [rows] = await database.execute(
      "SELECT * FROM tax_forms WHERE id = ?",
      [req.params.id]
    );
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "Data not found" });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error("getById error:", err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * PUT /api/tax/:id
 * Update WITHOUT parcelId (column does not exist in schema)
 */
export async function editById(req, res) {
  try {
    const d = req.body || {};
    const { id } = req.params;

    const sql = `
      UPDATE tax_forms SET
        arpNo = ?, tdPrinted = ?, municipalCode = ?, accountNo = ?, ownerName = ?, ownerAddress = ?,
        administrator = ?, adminAddress = ?, north = ?, east = ?, south = ?, west = ?,
        propertyIndexNo = ?, subdivision = ?, phase = ?, lotNo = ?, tdPrintedNo = ?,
        houseNo = ?, street = ?, landmark = ?, barangay = ?, barangayOnPrint = ?, barangayText = ?,
        octNo = ?, dated = ?, surveyNo = ?, cadLotNo = ?, lotNo2 = ?, blockNo = ?
      WHERE id = ?
    `;

    const [result] = await database.query(sql, [
      maybe(d.arpNo),
      b(d.tdPrinted),
      b(d.municipalCode),
      maybe(d.accountNo),
      maybe(d.ownerName),
      maybe(d.ownerAddress),
      maybe(d.administrator),
      maybe(d.adminAddress),
      maybe(d.north),
      maybe(d.east),
      maybe(d.south),
      maybe(d.west),
      maybe(d.propertyIndexNo),
      maybe(d.subdivision),
      maybe(d.phase),
      maybe(d.lotNo),
      maybe(d.tdPrintedNo),
      maybe(d.houseNo),
      maybe(d.street),
      maybe(d.landmark),
      maybe(d.barangay),
      b(d.barangayOnPrint),
      maybe(d.barangayText),
      maybe(d.octNo),
      formatDate(d.dated) || null,
      maybe(d.surveyNo),
      maybe(d.cadLotNo),
      maybe(d.lotNo2),
      maybe(d.blockNo),
      id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Not found" });
    }
    res.status(200).json({ message: "Tax updated successfully" });
  } catch (err) {
    console.error("editById error:", err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/tax/lookup?lotNo=...&barangay=...
 * parcelId LOOKUP IS NOT SUPPORTED by current DB schema. If a client sends parcelId
 * without lotNo, we return 400 explaining the limitation.
 */
export async function lookup(req, res) {
  try {
    const { parcelId, lotNo, barangay } = req.query;

    if (parcelId && !lotNo) {
      return res.status(400).json({
        error: "parcelId lookup is not supported by current schema; provide lotNo (and optional barangay)",
      });
    }

    if (!lotNo) {
      return res.status(400).json({ error: "lotNo is required" });
    }

    let sql = "SELECT id FROM tax_forms WHERE lotNo = ?";
    const params = [lotNo];
    if (barangay) {
      sql += " AND barangay = ?";
      params.push(barangay);
    }
    sql += " LIMIT 1";

    const [rows] = await database.query(sql, params);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "Not found" });
    }

    res.json({ id: rows[0].id });
  } catch (err) {
    console.error("lookup error:", err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * DELETE /api/tax/:id
 */
export async function removeById(req, res) {
  try {
    const { id } = req.params;
    const [result] = await database.query("DELETE FROM tax_forms WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Not found" });
    }
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("removeById error:", err);
    res.status(500).json({ error: err.message });
  }
}
