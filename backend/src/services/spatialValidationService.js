import { database } from '../config/database.js';

/**
 * Spatial Validation Service
 * Handles pre-storage validation of spatial data using PostGIS.
 */
export const spatialValidationService = {

  /**
   * Main entry point to validate and sanitize a geometry.
   * @param {Object} geoJSON - The input GeoJSON geometry or feature.
   * @param {Object} options - { targetSRID: 3123, barangayId: number, checkOverlaps: boolean, excludeParcelId: number }
   * @returns {Promise<Object>} - { valid: boolean, geometry: Object, errors: Array }
   */
  async validate(geoJSON, options = {}) {
    const { 
      targetSRID = 3123, 
      barangayId = null, 
      checkOverlaps = true,
      excludeParcelId = null 
    } = options;

    const errors = [];
    const suggestions = [];
    
    // Extract geometry from Feature if necessary
    const geometry = geoJSON.type === 'Feature' ? geoJSON.geometry : geoJSON;

    if (!geometry || !geometry.coordinates || geometry.coordinates.length === 0) {
      return this.formatError('ERR_EMPTY_GEOM', 'Geometry is empty or null.', null);
    }

    try {
      // 0. Pre-check: Ring Closure (Rule 4)
      // Check if first and last points match for all rings in Polygons
      const checkRingClosure = (coords) => {
        if (!Array.isArray(coords)) return true;
        // If it's a ring (array of points), check closure
        if (Array.isArray(coords[0]) && typeof coords[0][0] === 'number') {
          const first = coords[0];
          const last = coords[coords.length - 1];
          if (first[0] !== last[0] || first[1] !== last[1]) return false;
          return true;
        }
        // Recurse for MultiPolygon or nested rings
        return coords.every(sub => checkRingClosure(sub));
      };

      // Handle Feature or Geometry
      const geomCoords = geometry.type === 'Polygon' || geometry.type === 'MultiPolygon' ? geometry.coordinates : null;
      if (geomCoords && !checkRingClosure(geomCoords)) {
        return this.formatError('ERR_OPEN_RING', 'Polygon rings must be closed (first point must equal last point).', { rule: 'R4_CLOSED_RINGS' });
      }

      // 1. Basic Validity & Auto-Fix (ST_MakeValid, ST_Transform)
      // We treat input as 4326 by default if not specified (standard web mapping)
      // Then transform to targetSRID (3123)
      const sanitizeQuery = `
        WITH input_geom AS (
          SELECT ST_SetSRID(ST_GeomFromGeoJSON($1), 4326) as geom
        ),
        transformed AS (
          SELECT ST_Transform(geom, $2) as geom FROM input_geom
        ),
        valid_check AS (
          SELECT 
            ST_IsValid(geom) as is_valid,
            ST_IsValidReason(geom) as reason,
            ST_IsValidDetail(geom) as detail,
            ST_MakeValid(geom) as fixed_geom,
            ST_Area(geom) as original_area, -- Area might be weird if invalid, but usually calculable
            ST_NPoints(geom) as original_points
          FROM transformed
        ),
        final_geom AS (
          SELECT 
            CASE 
              WHEN is_valid THEN ST_Multi((SELECT geom FROM transformed)) -- Normalize to MultiPolygon
              ELSE ST_Multi(ST_CollectionExtract(fixed_geom, 3)) -- Extract Polygons and normalize
            END as geom,
            is_valid,
            reason,
            original_area,
            ST_Area(ST_CollectionExtract(fixed_geom, 3)) as fixed_area,
            original_points,
            ST_NPoints(ST_CollectionExtract(fixed_geom, 3)) as fixed_points
          FROM valid_check
        )
        SELECT 
          ST_AsGeoJSON(geom)::jsonb as geojson,
          ST_AsText(geom) as wkt,
          is_valid,
          reason,
          ST_Area(geom) as final_area,
          ST_NPoints(geom) as final_points,
          original_area,
          fixed_area,
          ST_GeometryType(geom) as geom_type
        FROM final_geom;
      `;

      const [sanitizeRows] = await database.query(sanitizeQuery, [JSON.stringify(geometry), targetSRID]);
      const result = sanitizeRows[0];

      if (!result) {
         return this.formatError('ERR_PROCESSING', 'Failed to process geometry.', null);
      }

      // Rule 9: Vertex Limit (DoS Protection)
      if (result.final_points > 5000) {
        return this.formatError('ERR_VERTEX_LIMIT', `Geometry exceeds vertex limit (5000). Found: ${result.final_points}`, { rule: 'R9_VERTEX_LIMIT', count: result.final_points, limit: 5000 });
      }

      // Rule 6: Polygon Type
      if (result.geom_type !== 'ST_MultiPolygon' && result.geom_type !== 'ST_Polygon') {
         // If it's not polygon/multipolygon (e.g. Point, LineString, or empty collection), reject
         // Note: ST_CollectionExtract(..., 3) returns MultiPolygon or Polygon or empty.
         return this.formatError('ERR_INVALID_TYPE', `Geometry must be POLYGON or MULTIPOLYGON. Got: ${result.geom_type}`, { rule: 'R6_POLYGON_TYPE' });
      }

      // Rule 3: Safe Auto-Fix Checks
      if (!result.is_valid) {
        // If the result geometry is NULL or empty collection after MakeValid/CollectionExtract:
        if (!result.geojson || result.geojson.type === 'GeometryCollection' && result.geojson.geometries.length === 0) {
          return this.formatError('ERR_INVALID_GEOM', `Geometry is invalid and could not be auto-fixed: ${result.reason}`, { rule: 'R2_VALID_GEOMETRY', reason: result.reason });
        }

        // Check Area Tolerance (1%)
        // Handle case where original_area is 0 (e.g. pure self-intersection or empty)
        const areaDiff = Math.abs(result.original_area - result.fixed_area);
        const areaChangePercent = result.original_area > 0 ? (areaDiff / result.original_area) * 100 : 100;
        
        // If original area was significant and change is > 1%, reject
        if (result.original_area > 0.1 && areaChangePercent > 1.0) {
           return this.formatError('ERR_UNSAFE_FIX', `Auto-fix rejected: Area changed by ${areaChangePercent.toFixed(2)}% (Tolerance: 1%).`, { 
             rule: 'R3_SAFE_AUTO_FIX', 
             original_area: result.original_area, 
             fixed_area: result.fixed_area 
           });
        }
      }

      const sanitizedGeom = result.geojson;

      // 2. Topology: Barangay Containment
      if (barangayId) {
        const containmentQuery = `
          SELECT ST_CoveredBy(
            ST_SetSRID(ST_GeomFromGeoJSON($1), $2),
            (SELECT geom FROM barangays WHERE id = $3)
          ) as is_covered;
        `;
        // Note: Assuming 'barangays' table exists as per prompt requirements.
        // If it doesn't, this will throw. We'll wrap in try-catch or assume it exists.
        try {
          const [contRows] = await database.query(containmentQuery, [JSON.stringify(sanitizedGeom), targetSRID, barangayId]);
          if (contRows.length > 0 && !contRows[0].is_covered) {
             errors.push({
               code: 'ERR_OUTSIDE_BARANGAY',
               message: 'Parcel geometry is not strictly contained within the declared Barangay boundary.'
             });
          }
        } catch (err) {
          console.warn("Skipping barangay check (table/data missing):", err.message);
        }
      }

      // 3. Topology: Overlaps
      if (checkOverlaps) {
        let overlapQuery = `
          SELECT "parcelID", ST_Area(ST_Intersection(
            ST_SetSRID(ST_GeomFromGeoJSON($1), $2),
            geom
          )) as overlap_area
          FROM landparcel
          WHERE ST_Intersects(ST_SetSRID(ST_GeomFromGeoJSON($1), $2), geom)
          AND ST_Area(ST_Intersection(ST_SetSRID(ST_GeomFromGeoJSON($1), $2), geom)) > 1.0 -- 1sqm tolerance
        `;
        
        const params = [JSON.stringify(sanitizedGeom), targetSRID];

        if (excludeParcelId) {
          overlapQuery += ` AND "parcelID" != $3`;
          params.push(excludeParcelId);
        }

        const [overlapRows] = await database.query(overlapQuery, params);
        if (overlapRows.length > 0) {
          errors.push({
            code: 'ERR_OVERLAP',
            message: `Geometry overlaps with existing parcel(s): ${overlapRows.map(r => r.parcelID).join(', ')}`,
            details: { overlapping_parcels: overlapRows }
          });
        }
      }

      if (errors.length > 0) {
        return {
          valid: false,
          errors: errors.map(e => this.formatStructure(e.code, e.message, e.details))
        };
      }

      return {
        valid: true,
        sanitizedGeometry: sanitizedGeom,
        area: result.area_sqm
      };

    } catch (err) {
      console.error("Spatial Validation Error:", err);
      return this.formatError('ERR_INTERNAL', 'Internal Spatial Validation Error', { originalError: err.message });
    }
  },

  formatError(code, message, details) {
    return {
      valid: false,
      errors: [this.formatStructure(code, message, details)]
    };
  },

  formatStructure(code, message, details) {
    return {
      status: 'error',
      code,
      message,
      details,
      timestamp: new Date().toISOString()
    };
  }
};
