// controllers/buildingController.js
import { database } from '../config/database.js';

// small helper to stop caching per-response
function noStore(res) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
}

export async function addNew(req, res) {
  const data = req.body;
  try {
    const sql = `INSERT INTO building (buildingName, buildingUseType, buildingType, area)
                 VALUES (?, ?, ?, ?)`;
    await database.query(sql, [
      data.buildingName ?? null,
      data.buildingUseType ?? null,
      data.buildingType ?? null,
      data.area ?? null
    ]);
    noStore(res);
    res.json({ message: 'Building added successfully' });
  } catch (err) {
    console.error('Error inserting data:', err);
    noStore(res);
    res.status(500).json({ error: 'Database insert failed' });
  }
}

export async function getAll(req, res) {
  try {
    const [data] = await database.query(
      'SELECT * FROM building WHERE deleted_at IS NULL ORDER BY building_num DESC'
    );
    noStore(res);
    res.json(data);
  } catch (err) {
    noStore(res);
    res.status(500).json({ error: err.message });
  }
}

export async function getById(req, res) {
  try {
    const [data] = await database.execute(
      'SELECT * FROM building WHERE building_num = ? AND deleted_at IS NULL',
      [req.params.id]
    );
    if (data.length === 0) {
      noStore(res);
      return res.status(404).json({ error: "Data not found" });
    }
    noStore(res);
    res.json(data[0]);
  } catch (err) {
    noStore(res);
    res.status(500).json({ error: err.message });
  }
}

export async function editById(req, res) {
  try {
    const data = req.body;
    const { id } = req.params;

    console.log("PUT /building/:id", { id, body: data });

    if (!id || isNaN(Number(id))) {
      noStore(res);
      return res.status(400).json({ error: "Invalid id" });
    }

    // 1) Ensure the row exists and is not soft-deleted
    const [existsRows] = await database.execute(
      'SELECT building_num FROM building WHERE building_num = ? AND deleted_at IS NULL',
      [Number(id)]
    );
    if (existsRows.length === 0) {
      noStore(res);
      return res.status(404).json({ error: "Not found or already deleted" });
    }

    // 2) Perform the update (values may be identical)
    const sql = `
      UPDATE building
      SET buildingName = ?, buildingUseType = ?, buildingType = ?, area = ?
      WHERE building_num = ? AND deleted_at IS NULL
    `;
    const [result] = await database.query(sql, [
      data.buildingName ?? null,
      data.buildingUseType ?? null,
      data.buildingType ?? null,
      data.area ?? null,
      Number(id),
    ]);

    // NOTE: MySQL returns 0 affected rows if the values are identical.
    // Treat that as success (no-op) instead of 404.
    noStore(res);
    return res.status(200).json({
      message: result.affectedRows > 0
        ? "Building updated successfully"
        : "No changes (already up to date)"
    });
  } catch (err) {
    console.error("Edit error ▶", err);
    noStore(res);
    res.status(500).json({ error: err.message });
  }
}

// Soft delete
export async function deleteById(req, res) {
  try {
    const { id } = req.params;
    const [result] = await database.query(
      'UPDATE building SET deleted_at = NOW() WHERE building_num = ? AND deleted_at IS NULL',
      [Number(id)]
    );
    if (result.affectedRows === 0) {
      noStore(res);
      return res.status(404).json({ error: "Not found or already deleted" });
    }
    noStore(res);
    res.json({ message: "Building deleted successfully" });
  } catch (err) {
    console.error('Error deleting data:', err);
    noStore(res);
    res.status(500).json({ error: 'Database delete failed' });
  }
}