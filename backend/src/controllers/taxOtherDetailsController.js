import { database } from "../config/database.js";
import { formatDate } from '../lib/utils.js';

export async function getByTaxId(req, res) {
  try {
    const [data] = await database.execute('SELECT * FROM tax_other_details WHERE taxId = ?', [req.params.taxid]);
    if (data.length === 0) {
      return res.status(404).json({ error: "Data not found" });
    }
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Insert or Update Other Details
export async function upsertOtherDetails(req, res) {
  const { taxid } = req.params;
  const data = req.body;

  try {
    if (data.id) {
      //  Update existing record
      const sql = `
        UPDATE tax_other_details
        SET taxability = ?, effectivityYear = ?, quarter = ?, updateCode = ?, dateRegistered = ?
        WHERE id = ? AND taxId = ?
      `;
      const [result] = await database.execute(sql, [
        data.taxability || null,
        data.effectivityYear || null,
        data.quarter || null,
        data.updateCode || null,
        formatDate(data.dateRegistered) || null,
        data.id,
        taxid,
      ]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Record not found" });
      }

      return res.json({ message: "Other Details updated successfully" });
    } else {
      // Insert new record
      const sql = `
        INSERT INTO tax_other_details 
        (taxId, taxability, effectivityYear, quarter, updateCode, dateRegistered)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      const [result] = await database.execute(sql, [
        taxid,
        data.taxability || null,
        data.effectivityYear || null,
        data.quarter || null,
        data.updateCode || null,
        formatDate(data.dateRegistered) || null
      ]);

      return res.json({ message: "Other Details added successfully", id: result.insertId });
    }
  } catch (err) {
    console.error("Error inserting/updating Other Details:", err);
    res.status(500).json({ error: err.message });
  }
}
