import { database } from '../config/database.js';
import { spatialValidationService } from '../services/spatialValidationService.js';

export async function getAll(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";

    let whereClause = "";
    let params = [];

    if (search) {
      const term = `%${search}%`;
      // Use ILIKE for case-insensitive search (PostgreSQL)
      // Note: ILIKE is PostgreSQL specific. For MySQL use LIKE (which is often case-insensitive depending on collation)
      whereClause = `WHERE CAST("parcelID" AS TEXT) ILIKE ? 
                     OR "StreetAddress" ILIKE ? 
                     OR "Barangay" ILIKE ? 
                     OR "Municipality" ILIKE ?`;
      params = [term, term, term, term];
    }

    // Get total count
    const [countResult] = await database.query(
      `SELECT COUNT(*) as count FROM landparcel ${whereClause}`,
      params
    );
    const totalItems = parseInt(countResult[0].count);

    // Get paginated data
    // Append limit and offset to params
    const dataParams = [...params, limit, offset];
    
    // Construct final query
    const query = `
      SELECT *, ST_AsGeoJSON(ST_Transform(ST_SetSRID(geom, 3123), 4326))::jsonb AS geojson 
      FROM landparcel
      ${whereClause}
      ORDER BY "parcelID" DESC
      LIMIT ? OFFSET ?
    `;

    const [data] = await database.query(query, dataParams);

    res.json({
      data,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      currentPage: page
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function addNew(req, res) {
  const {
    parcelID,
    improvement,
    totalValue,
    StreetAddress,
    Barangay,
    Municipality,
    ZipCode,
    areaSize,
    propertyType,
    actualLandUse,
    geom, // GeoJSON geometry
    checkOverlaps = true,
    classification,
    assessed_value,
    market_value,
    delinquent,
    delinquent_amount,
    last_payment_date
  } = req.body;

  try {
    // 1. Backend Re-validation (Dual-Layer)
    if (geom) {
        const validationResult = await spatialValidationService.validateParcel({
            geometry: geom,
            barangayId: null,
            checkOverlaps: checkOverlaps
        });

        if (!validationResult.valid) {
            return res.status(400).json({
                status: 'error',
                code: 'SPATIAL_VALIDATION_FAILED',
                message: 'Spatial validation failed during save.',
                details: validationResult.errors,
                warnings: validationResult.warnings
            });
        }
    }

    // 2. Insert into DB
    // We explicitly insert parcelID because the table structure does not seem to have auto-increment
    const sql = `
      INSERT INTO LandParcel (
        "parcelID", "improvement", "totalValue", "StreetAddress", "Barangay", "Municipality", 
        "ZipCode", "areaSize", "propertyType", "actualLandUse",
        "classification", "assessed_value", "market_value", "delinquent", "delinquent_amount", "last_payment_date"
        ${geom ? ', "geom"' : ''}
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? ${geom ? ', ST_GeomFromGeoJSON(?)' : ''}) 
      RETURNING "parcelID"
    `;

    const params = [
      parcelID,
      improvement,
      totalValue,
      StreetAddress,
      Barangay,
      Municipality,
      ZipCode,
      areaSize,
      propertyType,
      actualLandUse,
      classification || null,
      assessed_value || 0,
      market_value || 0,
      delinquent || false,
      delinquent_amount || 0,
      last_payment_date || null
    ];
    
    if (geom) {
        params.push(JSON.stringify(geom));
    }

    const [result] = await database.query(sql, params);

    res.json({ message: "LandParcel added successfully", parcelID: result[0].parcelID });
  } catch (err) {
    console.error("Error inserting data:", err);
    res.status(500).json({ 
        status: 'error',
        code: 'DB_INSERT_ERROR',
        message: err.message || "Database insert failed"
    });
  }
}

export async function getById(req, res) {
  try {
    const [data] = await database.query(
      `SELECT *, ST_AsGeoJSON(ST_Transform(ST_SetSRID(geom, 3123), 4326))::jsonb AS geojson 
       FROM landparcel WHERE "parcelID" = ?`,
      [req.params.id]
    );

    if (data.length === 0) {
      return res.status(404).json({ error: "Data not found" });
    }

    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function search(req, res) {
  try {
    const { term } = req.params;
    if (!term) return res.json([]);
    
    const searchPattern = `%${term}%`;
    const [data] = await database.query(`
      SELECT *, ST_AsGeoJSON(ST_Transform(ST_SetSRID(geom, 3123), 4326))::jsonb AS geojson 
      FROM landparcel
      WHERE CAST("parcelID" AS TEXT) ILIKE ? 
      OR "StreetAddress" ILIKE ?
      OR "Barangay" ILIKE ?
      OR "Municipality" ILIKE ?
    `, [searchPattern, searchPattern, searchPattern, searchPattern]);
    
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function editById(req, res) {
  try {
    const { id } = req.params;
    const {
      improvement,
      totalValue,
      StreetAddress,
      Barangay,
      Municipality,
      ZipCode,
      areaSize,
      propertyType,
      actualLandUse,
      classification,
      assessed_value,
      market_value,
      delinquent,
      delinquent_amount,
      last_payment_date
    } = req.body;

    const sql = `
      UPDATE LandParcel 
      SET 
        "improvement" = ?, 
        "totalValue" = ?, 
        "StreetAddress" = ?, 
        "Barangay" = ?, 
        "Municipality" = ?, 
        "ZipCode" = ?, 
        "areaSize" = ?, 
        "propertyType" = ?, 
        "actualLandUse" = ?,
        "classification" = ?,
        "assessed_value" = ?,
        "market_value" = ?,
        "delinquent" = ?,
        "delinquent_amount" = ?,
        "last_payment_date" = ?
      WHERE "parcelID" = ?
    `;

    const params = [
      improvement,
      totalValue,
      StreetAddress,
      Barangay,
      Municipality,
      ZipCode,
      areaSize,
      propertyType,
      actualLandUse,
      classification || null,
      assessed_value || 0,
      market_value || 0,
      delinquent || false,
      delinquent_amount || 0,
      last_payment_date || null,
      id
    ];

    const [result] = await database.query(sql, params);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Not found" });
    }

    res.status(200).json({ message: "Parcel updated successfully" });
  } catch (err) {
    console.error("editById error:", err);
    res.status(500).json({ error: err.message });
  }
}

/** ✅ DELETE /api/landparcel/:id */
export async function removeById(req, res) {
  try {
    const { id } = req.params;
    const [result] = await database.query(
      'DELETE FROM landparcel WHERE "parcelID" = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Not found" });
    }

    res.json({ message: "Parcel deleted successfully" });
  } catch (err) {
    console.error("removeById error:", err);
    res.status(500).json({ error: err.message });
  }
}
