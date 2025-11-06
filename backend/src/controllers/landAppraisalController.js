import { database } from '../config/database.js';

export async function addNew(req, res) {
  const data = req.body;
  
  try {
    const sql = `INSERT INTO land_appraisal (taxId, class, subClass, actualUse, unitValue, area, stripping, adjustment, marketValue
    )
    VALUES (?,?,?,?,?,?,?,?,?)`;

    for (const row of data) {
      if (row.id) {
        // 🔹 Update existing row
        const updateSql = `
          UPDATE land_appraisal 
          SET class = ?, subClass = ?, actualUse = ?, unitValue = ?, area = ?, stripping = ?, adjustment = ?, marketValue = ?
          WHERE id = ? AND taxId = ?
        `;
        await database.execute(updateSql, [
          row.class || null,
          row.subClass || null,
          row.actualUse || null,
          row.unitValue || null,
          row.area || null,
          row.stripping || null,
          row.adjustment || null,
          row.marketValue || null,
          row.id,
          req.params.taxid,
        ]);
      } else {
        // 🔹 Insert new row
        const insertSql = `
          INSERT INTO land_appraisal 
          (taxId, class, subClass, actualUse, unitValue, area, stripping, adjustment, marketValue)
          VALUES (?,?,?,?,?,?,?,?,?)
        `;
        await database.execute(insertSql, [
          req.params.taxid,
          row.class || null,
          row.subClass || null,
          row.actualUse || null,
          row.unitValue || null,
          row.area || null,
          row.stripping || null,
          row.adjustment || null,
          row.marketValue || null,
        ]);
      }
    }

    //res.json({ message: "All land_appraisal rows added successfully" });
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getAll(req, res) {
  try {
    const [data] = await database.execute('SELECT * FROM land_appraisal WHERE taxId = ?', [req.params.taxid]);
    if (data.length === 0) {
      return res.status(404).json({ error: "Data not found" });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function deleteOne(req, res) {
  const { id, taxid } = req.params;

  try {
    const sql = `DELETE FROM land_appraisal WHERE id = ? AND taxId = ?`;
    const [result] = await database.execute(sql, [id, taxid]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Record not found" });
    }

    res.json({ message: "Record deleted successfully" });
  } catch (err) {
    console.error("Error deleting record:", err);
    res.status(500).json({ error: err.message });
  }
}