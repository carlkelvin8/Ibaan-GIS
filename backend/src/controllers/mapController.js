import { database } from '../config/database.js';

export async function getParcels(req, res) {
  try {
    const { bbox } = req.query; // bbox format: minLng,minLat,maxLng,maxLat
    let bboxFilter = "";
    const params = [];

    if (bbox) {
      const parts = bbox.split(',').map(Number);
      if (parts.length === 4 && !parts.some(isNaN)) {
        // Transform 4326 bbox to 3123 for querying
        bboxFilter = `AND p.geom && ST_Transform(ST_MakeEnvelope(?, ?, ?, ?, 4326), 3123)`;
        params.push(parts[0], parts[1], parts[2], parts[3]);
      }
    }

    const query = `
      SELECT jsonb_build_object(
        'type', 'Feature',
        'geometry', ST_AsGeoJSON(ST_Transform(p.geom, 4326))::jsonb,
        'properties', jsonb_build_object(
          'id', p."parcelID",
          'parcel_number', p."parcelID", 
          'classification', p.classification,
          'assessed_value', p.assessed_value,
          'market_value', p.market_value,
          'area_sqm', p.area_sqm,
          'barangay_id', p.barangay_id,
          'delinquent', p.delinquent,
          'delinquent_amount', p.delinquent_amount,
          'owner_name', COALESCE(tf."ownerName", i."Claimant", 'Unknown'),
          'LotNumber', i."LotNumber"
        )
      ) AS feature
      FROM landparcel p
      LEFT JOIN ibaan i ON p."parcelID" = i."ParcelId"
      LEFT JOIN tax_forms tf ON i."tax_ID" = tf."arpNo"
      WHERE p.geom IS NOT NULL
      ${bboxFilter}
      LIMIT 3000;
    `;

    const [rows] = await database.query(query, params);

    const featureCollection = {
      type: "FeatureCollection",
      features: rows.map(r => r.feature)
    };

    res.json(featureCollection);
  } catch (err) {
    console.error("getParcels error:", err);
    res.status(500).json({ error: err.message });
  }
}

export async function getBarangays(req, res) {
  try {
    const query = `
      SELECT jsonb_build_object(
        'type', 'Feature',
        'geometry', ST_AsGeoJSON(ST_Transform(geom, 4326))::jsonb,
        'properties', jsonb_build_object(
          'id', id,
          'name', name
        )
      ) AS feature
      FROM barangays
      WHERE geom IS NOT NULL;
    `;
    
    const [rows] = await database.query(query);

    const featureCollection = {
      type: "FeatureCollection",
      features: rows.map(r => r.feature)
    };

    res.json(featureCollection);
  } catch (err) {
    console.error("getBarangays error:", err);
    // Return empty if table doesn't exist to avoid crash
    res.json({ type: "FeatureCollection", features: [] });
  }
}

export async function getParcelById(req, res) {
  try {
    const { id } = req.params;
    const query = `
      SELECT jsonb_build_object(
        'type', 'Feature',
        'geometry', ST_AsGeoJSON(ST_Transform(p.geom, 4326))::jsonb,
        'properties', jsonb_build_object(
          'id', p."parcelID",
          'parcel_number', p."parcelID", 
          'classification', p.classification,
          'assessed_value', p.assessed_value,
          'market_value', p.market_value,
          'area_sqm', p.area_sqm,
          'barangay_id', p.barangay_id,
          'delinquent', p.delinquent,
          'delinquent_amount', p.delinquent_amount,
          'owner_name', COALESCE(tf."ownerName", i."Claimant", 'Unknown'),
          'tax_due', (p.assessed_value * COALESCE(r.rate, 0)),
          'LotNumber', i."LotNumber"
        )
      ) AS feature
      FROM landparcel p
      LEFT JOIN ibaan i ON p."parcelID" = i."ParcelId"
      LEFT JOIN tax_forms tf ON i."tax_ID" = tf."arpNo"
      LEFT JOIN tax_rates r ON p.classification = r.classification
      WHERE p."parcelID" = ?
    `;

    const [rows] = await database.query(query, [id]);

    if (!rows.length) {
      return res.status(404).json({ error: "Parcel not found" });
    }

    res.json(rows[0].feature);
  } catch (err) {
    console.error("getParcelById error:", err);
    res.status(500).json({ error: err.message });
  }
}

export async function searchParcels(req, res) {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) return res.json({ type: "FeatureCollection", features: [] });

    const rawTerm = q.trim();
    const term = `%${rawTerm}%`;
    
    // Optimized query:
    // 1. Remove unnecessary casts in JOINs (parcelID is bigint)
    // 2. Prioritize exact ID match if input is numeric
    
    let whereClause = "";
    const params = [];

    // Check if search term is numeric
    const isNumeric = /^\d+$/.test(rawTerm);

    if (isNumeric) {
      // If numeric, prioritize exact ID match or prefix match
      whereClause = `
        (p."parcelID" = $1) OR
        (CAST(p."parcelID" AS TEXT) LIKE $2) OR
        (i."LotNumber" ILIKE $3) OR
        (tf."ownerName" ILIKE $4) OR
        (i."Claimant" ILIKE $5) OR
        (tf."arpNo" ILIKE $6)
      `;
      // Params: exact ID, prefix ID, others with %term%
      params.push(rawTerm, `${rawTerm}%`, term, term, term, term);
    } else {
      // Non-numeric: standard text search
      whereClause = `
        (i."LotNumber" ILIKE $1) OR
        (tf."ownerName" ILIKE $2) OR
        (i."Claimant" ILIKE $3) OR
        (tf."arpNo" ILIKE $4)
      `;
      params.push(term, term, term, term);
    }

    const query = `
      SELECT jsonb_build_object(
        'type', 'Feature',
        'geometry', ST_AsGeoJSON(ST_Transform(p.geom, 4326))::jsonb,
        'properties', jsonb_build_object(
          'id', p."parcelID",
          'parcel_number', p."parcelID", 
          'classification', p.classification,
          'assessed_value', p.assessed_value,
          'market_value', p.market_value,
          'area_sqm', p.area_sqm,
          'barangay_id', p.barangay_id,
          'delinquent', p.delinquent,
          'delinquent_amount', p.delinquent_amount,
          'owner_name', COALESCE(tf."ownerName", i."Claimant", 'Unknown'),
          'LotNumber', i."LotNumber",
          'tax_due', (p.assessed_value * COALESCE(r.rate, 0))
        )
      ) AS feature
      FROM landparcel p
      LEFT JOIN ibaan i ON p."parcelID" = i."ParcelId"
      LEFT JOIN tax_forms tf ON i."tax_ID" = tf."arpNo"
      LEFT JOIN tax_rates r ON p.classification = r.classification
      WHERE ${whereClause}
      LIMIT 20
    `;

    const [rows] = await database.query(query, params);

    const featureCollection = {
      type: "FeatureCollection",
      features: rows.map(r => r.feature)
    };

    res.json(featureCollection);
  } catch (err) {
    console.error("searchParcels error:", err);
    res.status(500).json({ error: err.message });
  }
}
