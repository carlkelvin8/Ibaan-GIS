import { database } from "../config/database.js";

export async function getByTaxId(req, res) {
  try {
    const [data] = await database.execute('SELECT * FROM land_assessment_summary WHERE taxId = ?', [req.params.taxid]);
    if (data.length === 0) {
      return res.status(404).json({ error: "Data not found" });
    }
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Insert or Update Land Assessment Summary
export async function upsertAssessmentSummary(req, res) {
  const { taxid } = req.params;
  const data = req.body;

  try {
    if (data.id) {
      // Update existing record
      const sql = `
        UPDATE land_assessment_summary
        SET propertyKind = ?, propertyActualUse = ?, adjustedMarketValue = ?, level = ?, assessedValue = ?
        WHERE id = ? AND taxId = ?
      `;
      const [result] = await database.execute(sql, [
        data.propertyKind || null,
        data.propertyActualUse || null,
        data.adjustedMarketValue || null,
        data.level || null,
        data.assessedValue || null,
        data.id,
        taxid,
      ]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Record not found" });
      }

      return res.json({ message: "Land Assessment Summary updated successfully" });
    } else {
      // Insert new record
      const sql = `
        INSERT INTO land_assessment_summary 
        (taxId, propertyKind, propertyActualUse, adjustedMarketValue, level, assessedValue)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      const [result] = await database.execute(sql, [
        taxid,
        data.propertyKind || null,
        data.propertyActualUse || null,
        data.adjustedMarketValue || null,
        data.level || null,
        data.assessedValue || null,
      ]);

      return res.json({ message: "Land Assessment Summary added successfully", id: result.insertId });
    }
  } catch (err) {
    console.error("Error inserting/updating Land Assessment Summary:", err);
    res.status(500).json({ error: err.message });
  }
}
