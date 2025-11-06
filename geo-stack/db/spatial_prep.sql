-- db/spatial_prep.sql
-- Ensure required spatial columns are NOT NULL and have SPATIAL indexes
-- Make sure your data has been populated with proper non-null geometries first.

-- IBAAN
ALTER TABLE ibaan
  MODIFY COLUMN geom GEOMETRY NOT NULL,
  ADD SPATIAL INDEX IF NOT EXISTS sidx_ibaan_geom (geom);

-- ALAMEDA
ALTER TABLE alameda
  MODIFY COLUMN geom GEOMETRY NOT NULL,
  ADD SPATIAL INDEX IF NOT EXISTS sidx_alameda_geom (geom);

-- Optional: a simplified view for map usage
DROP VIEW IF EXISTS v_ibaan_simple;
CREATE VIEW v_ibaan_simple AS
SELECT
  ParcelId, LotNumber, BarangayNa, Area, Claimant, geom
FROM ibaan;
