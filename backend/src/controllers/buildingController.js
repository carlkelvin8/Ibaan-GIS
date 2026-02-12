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
    const sql = `INSERT INTO building ("buildingName", "buildingUseType", "buildingType", "area")
                 VALUES (?, ?, ?, ?) RETURNING *`;
    const [rows] = await database.query(sql, [
      data.buildingName ?? null,
      data.buildingUseType ?? null,
      data.buildingType ?? null,
      data.area ?? null
    ]);
    noStore(res);
    res.json({ message: 'Building added successfully', data: rows[0] });
  } catch (err) {
    console.error('Error inserting data:', err);
    noStore(res);
    res.status(500).json({ error: 'Database insert failed' });
  }
}

export async function getAll(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";

    let whereClause = "WHERE deleted_at IS NULL";
    let params = [];

    if (search) {
      const term = `%${search}%`;
      // Use positional parameters for the WHERE clause
      whereClause += ` AND ("buildingName" ILIKE ? OR "buildingType" ILIKE ? OR "buildingUseType" ILIKE ?)`;
      params = [term, term, term];
    }

    // Get total count
    const [countResult] = await database.query(
      `SELECT COUNT(*) as count FROM building ${whereClause}`,
      params
    );
    const totalItems = parseInt(countResult[0].count);
    const totalPages = Math.ceil(totalItems / limit);

    // Get paginated data
    // We inject limit and offset directly into the query string as integers to avoid any parameter binding issues with LIMIT/OFFSET
    // This is safe because we ran parseInt/Number() on them above.
    
    const query = `
      SELECT * 
      FROM building 
      ${whereClause} 
      ORDER BY building_num DESC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `;
    
    // We only pass the search params, not limit/offset, since we inlined them
    const [data] = await database.query(query, params);
    
    noStore(res);
    res.json({
      data: data || [], 
      totalItems,
      totalPages: totalPages || 1, 
      currentPage: page
    });
  } catch (err) {
    console.error('Error getting data:', err);
    noStore(res);
    res.status(500).json({ error: err.message });
  }
}

// Special endpoint to sync from GeoJSON
export async function syncFromGeoJSON(req, res) {
    try {
        const geojsonPath = './ibaan_BF_WGS84.geojson'; // Adjust path relative to root
        // We will read the file using standard fs
        // For now, let's assume we read from the file on disk or the frontend sends it.
        // Actually, the best way is to read the file server-side.
        
        // However, since the user said "fetch all the buildings in the maps data",
        // we should probably just return the data if the DB is empty or provide a sync button.
        
        // Let's implement a direct query that populates from the `ibaan` table if possible,
        // OR we can create a one-time migration script.
        
        // But since the user wants them to be editable, they must be in the `building` table.
        // Let's check if we can migrate data from the `ibaan_BF_WGS84.geojson` file content.
        
        res.json({ message: "Sync not implemented yet, use the migration script." });
    } catch (err) {
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
      SET "buildingName" = ?, "buildingUseType" = ?, "buildingType" = ?, "area" = ?
      WHERE building_num = ? AND deleted_at IS NULL
      RETURNING *
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
      message: "Building updated successfully"
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
    if (result.rowCount === 0) {
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