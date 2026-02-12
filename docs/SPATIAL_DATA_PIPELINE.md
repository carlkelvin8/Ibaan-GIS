# Spatial Data Pipeline Architecture Documentation

**Project:** LGU Land & Property Management System  
**Version:** 1.2 (LGU Production Hardened)  
**Date:** 2026-02-11  
**Backend:** Node.js / Express  
**Database:** PostgreSQL + PostGIS  
**Frontend:** React + Leaflet/Mapbox  
**Compliance Standard:** PRS92 (Philippines Reference System of 1992)

---

## 1. End-to-End Spatial Data Flow

This section outlines the lifecycle of spatial data from ingestion to reporting, strictly adhering to Philippine cadastral standards and production safety rules.

### **Layered Architecture View**

| Layer | Responsibility | Components |
| :--- | :--- | :--- |
| **Ingestion** | Accept raw files, validate structure, enforce vertex limits | API Endpoint, `multer`, `ogr2ogr` |
| **Processing** | Topology validation, SRID transformation (to PRS92), complexity checks | Backend Services, PostGIS |
| **Storage** | Persist high-precision geometries in local projection with strict CHECK constraints | PostgreSQL (`geometry(MultiPolygon, 3123)`) |
| **Serving** | Transform to global CRS for web, simplify for performance | Read API, `ST_AsGeoJSON`, `ST_AsMVT` |
| **Rendering** | Client-side visualization | Leaflet (EPSG:4326/3857) |

### **High-Level Sequence Flow**

1.  **Ingestion:** User uploads file (GeoJSON/KML/Shapefile).
2.  **Pre-Validation (API Layer):**
    *   **Format:** Verify JSON structure / Zip contents.
    *   **Complexity:** Reject if `ST_NPoints > 5000` (DoS prevention).
3.  **Transformation:**
    *   Identify Input CRS (e.g., WGS84).
    *   **Reproject:** Transform to LGU-specific PRS92 Zone (e.g., EPSG:3123 for Zone 3).
    *   **Normalize:** Force to `MULTIPOLYGON`.
4.  **Spatial Integrity (DB Layer):**
    *   **Constraint Checks:** `ST_IsValid`, `ST_SRID`, `GeometryType`.
    *   **Topology Trigger:** `ST_CoveredBy` (Must be inside Barangay), `ST_Overlaps` (Must not overlap).
5.  **Storage:** Insert into `landparcel` table.
6.  **Triggers:** Calculate Area (sqm) natively in PRS92.
7.  **Reporting:** API serves data transformed to EPSG:4326 for web maps.

---

## 2. GeoJSON Pipeline

### **Ingestion**
*   **Method:** POST `/api/parcels`
*   **Payload:** GeoJSON `FeatureCollection` (EPSG:4326 assumed)

### **Validation & Transformation**
1.  **Schema Check:** Validate JSON structure.
2.  **Complexity Safeguard:**
    ```javascript
    // Backend Logic
    if (feature.geometry.coordinates.flat(3).length > 5000) {
      throw new Error("Geometry too complex (Max 5000 vertices)");
    }
    ```
3.  **SRID Strategy (PRS92):**
    *   **Selection:** Identify correct PRS92 Zone based on LGU longitude (e.g., Zone 3 EPSG:3123 for 120°E-122°E).
    *   **Input:** WGS84 (EPSG:4326)
    *   **Target:** Selected PRS92 Zone.
    *   **SQL:** `ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(?), 4326), <LGU_SRID>)`

### **Storage**
*   **Table Definition (Production Hardened):**
    ```sql
    CREATE TABLE landparcel (
      "parcelID" BIGSERIAL PRIMARY KEY,
      "barangay_id" INTEGER REFERENCES barangays(id), -- FK for safe lookups
      "geometry" geometry(MultiPolygon, 3123) NOT NULL, -- PRS92 Zone 3 (Adjust per LGU)
      "areaSqm" numeric(12,2) GENERATED ALWAYS AS (ST_Area(geometry)) STORED,
      
      -- Database-Level Integrity Enforcement
      CONSTRAINT check_validity CHECK (ST_IsValid(geometry)),
      CONSTRAINT check_srid CHECK (ST_SRID(geometry) = 3123),
      CONSTRAINT check_type CHECK (GeometryType(geometry) = 'MULTIPOLYGON'),
      CONSTRAINT check_complexity CHECK (ST_NPoints(geometry) <= 5000)
    );
    ```

---

## 3. KML Pipeline

### **Ingestion**
*   **Upload:** `POST /api/ingest/kml`
*   **Validation:**
    *   **Coordinate Order:** Ensure `Lon,Lat` (standard KML) vs `Lat,Lon`.
    *   **Altitude:** Strip altitude using `ST_Force2D` to prevent 3D geometry errors in 2D indexes.
*   **Conversion:**
    *   Use `ogr2ogr` or `gdal` to parse.
    *   **Transform:** `ST_Transform(..., <LGU_SRID>)`.

---

## 4. Shapefile Pipeline

### **Conversion Strategy: `ogr2ogr`**
Convert directly to PRS92 for storage.

**Command:**
```bash
ogr2ogr -f "PostgreSQL" PG:"host=localhost dbname=gis" \
  "/tmp/upload.shp" \
  -nln landparcel \
  -t_srs EPSG:3123 \
  -nlt MULTIPOLYGON \
  -lco GEOMETRY_NAME=geometry \
  -append
```

---

## 5. Spatial Integrity & Topology Rules

These rules are enforced at the Database level via **BEFORE INSERT/UPDATE** triggers.

### **A. Topology Validation (Parcel within Barangay)**
Parcels must strictly fall within their parent Barangay's boundary.

**Improved Logic:**
1.  Uses `barangay_id` FK instead of name string matching (robustness).
2.  Optimizes overlap check using BBOX pre-filtering (`&&`) to avoid expensive `ST_Intersection` on non-overlapping features.

```sql
CREATE OR REPLACE FUNCTION check_parcel_topology() RETURNS TRIGGER AS $$
DECLARE
  barangay_geom geometry;
BEGIN
  -- 1. Get Barangay Geometry via Foreign Key
  SELECT geometry INTO barangay_geom 
  FROM barangays 
  WHERE id = NEW.barangay_id;

  IF barangay_geom IS NULL THEN
    RAISE EXCEPTION 'Barangay ID % not found', NEW.barangay_id USING ERRCODE = 'P0002';
  END IF;

  -- 2. Check Containment (ST_CoveredBy is robust for shared boundaries)
  IF NOT ST_CoveredBy(NEW.geometry, barangay_geom) THEN
     RAISE EXCEPTION 'Parcel geometry is not contained within the declared Barangay boundary' 
     USING ERRCODE = 'P0001';
  END IF;

  -- 3. Check Overlaps (Optimized)
  -- Uses && (Bounding Box) first for speed, then checks actual intersection area
  IF EXISTS (
      SELECT 1 FROM landparcel 
      WHERE "parcelID" != NEW."parcelID" 
      AND geometry && NEW.geometry -- BBOX filter (Fast)
      AND ST_Intersects(geometry, NEW.geometry) -- Exact check (Slow)
      AND ST_Area(ST_Intersection(geometry, NEW.geometry)) > 1.0 -- Tolerance: 1 sqm
  ) THEN
      RAISE EXCEPTION 'Parcel overlaps with an existing claim (Intersection > 1sqm)' 
      USING ERRCODE = 'P0003';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### **B. Area Calculation Strategy**
Because we store in **PRS92 (Projected CRS)**, `ST_Area(geometry)` returns planar square meters. This is **legally appropriate** for tax mapping and minimizes distortion compared to Web Mercator.

---

## 6. Read-Only vs Write API Separation

### **Write API (Admin)**
*   **Strict Validation:** Triggers run on every write.
*   **Audit Logging:** Logs specific topology errors (e.g., "Overlap detected with Parcel ID 123").

### **Read API (Public)**
*   **Output Transformation:**
    *   Since storage is PRS92, output must be transformed to EPSG:4326 for Leaflet/Mapbox.
    *   **Query:** `ST_AsGeoJSON(ST_Transform(geometry, 4326))`
*   **Performance:**
    *   `ST_Simplify(geometry, 1)` (1 meter tolerance) for high-zoom levels.

---

## 7. Production Considerations

1.  **Compliance:** System adheres to **DENR/LMB** standards by using appropriate PRS92 Zone.
2.  **Indexing:** `CREATE INDEX idx_parcel_geom ON landparcel USING GIST (geometry);`
3.  **Security:**
    *   **Vertex Limits:** DB Constraint `CHECK (ST_NPoints(geometry) <= 5000)` guarantees API safety.
    *   **Sanitization:** Parameterized queries.
4.  **Failure Handling (Structured Error Response):**

```json
{
  "status": "error",
  "code": "TOPOLOGY_VIOLATION",
  "message": "Parcel overlaps with an existing claim (Intersection > 1sqm)",
  "details": {
    "violation_type": "OVERLAP_ERROR",
    "conflicting_parcel_id": 1045,
    "overlap_area_sqm": 45.2
  }
}
```
