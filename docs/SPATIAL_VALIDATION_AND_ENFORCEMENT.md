# Spatial Validation & Enforcement Layer (Production Design)

## Overview
This document outlines the architecture for the **Spatial Validation and Enforcement Layer** of the LGU Land & Property Management System. It guarantees that all spatial data (Parcels, Barangays) stored in the PostgreSQL + PostGIS database maintains strict cadastral integrity.

The solution is a **dual-layer defense**:
1.  **API Layer (Validation Service)**: Pre-checks incoming payloads, normalizes formats, and provides detailed, structured error messages to the client.
2.  **Database Layer (Enforcement)**: Uses constraints and triggers as the final authority to reject invalid data that bypasses the API.

---

## 1. Validation Rules & Policies

| ID | Rule Name | Description | Failure Action |
|----|-----------|-------------|----------------|
| **R1** | **No Empty/Null** | Geometry must not be NULL or Empty. | `REJECT` |
| **R2** | **Valid Geometry** | Must pass `ST_IsValid()`. No self-intersections. | `ATTEMPT_FIX` -> `REJECT` |
| **R3** | **Safe Auto-Fix** | Attempt `ST_MakeValid`. Accept only if area change ≤ 1% and vertex count ≤ 5000. | `REJECT` if unsafe |
| **R4** | **Closed Rings** | Polygon rings must be closed (first point = last point). | `REJECT` |
| **R5** | **SRID Enforcement** | Must be **EPSG:3123** (PRS92 / Philippines Zone 3). | `TRANSFORM` -> `REJECT` |
| **R6** | **Polygon Type** | Must be strict `MULTIPOLYGON`. | `NORMALIZE` -> `REJECT` |
| **R7** | **Barangay Containment** | Parcel must be strictly `ST_CoveredBy` its parent Barangay. | `REJECT` |
| **R8** | **No Overlaps** | Parcel must not overlap existing parcels (tolerance > 1 sqm). | `REJECT` |
| **R9** | **Vertex Limit** | Geometry must not exceed 5000 vertices (DoS protection). | `REJECT` |

---

## 2. API-Layer Validation Service

The API layer acts as the first line of defense. It accepts GeoJSON, sanitizes it, and runs a "dry-run" validation against PostGIS before attempting a write.

### Service Signature
```javascript
validate(geoJSON, options = { targetSRID: 3123, barangayId: null, checkOverlaps: true })
```

### Workflow
1.  **Input Parsing**: Accept GeoJSON Feature or Geometry.
2.  **Structural Check**: Ensure required fields (coordinates, type) exist.
3.  **Ring Closure Check**: Verify `coords[0] === coords[last]` for all rings.
4.  **SRID Normalization**:
    *   If no CRS provided, assume EPSG:4326 (WGS84).
    *   Reproject to EPSG:3123.
5.  **Geometry Check (Dry Run)**:
    *   Execute `SELECT ST_IsValidDetail(...)`, `ST_MakeValid(...)`, `ST_Area(...)`, `ST_NPoints(...)`.
    *   If invalid:
        *   Attempt auto-fix (`ST_MakeValid` + `ST_CollectionExtract` + `ST_Multi`).
        *   **Safety Check**:
            *   Is the fixed geometry `MULTIPOLYGON`?
            *   Is `ABS(original_area - fixed_area) / original_area <= 0.01` (1%)?
            *   Is `ST_NPoints(fixed_geom) <= 5000`?
        *   If unsafe, return detailed error.
6.  **Topology Check**:
    *   Check `ST_CoveredBy(parcel, barangay)` (if `barangayId` provided).
    *   Check `ST_Intersects(parcel, others)` (if `checkOverlaps` true).

---

## 3. Database-Layer Enforcement

### Constraints
```sql
-- Enforce Geometry Type and SRID
ALTER TABLE "landparcel"
  ADD CONSTRAINT "enforce_srid_geom" CHECK (ST_SRID(geom) = 3123),
  ADD CONSTRAINT "enforce_type_geom" CHECK (GeometryType(geom) = 'MULTIPOLYGON');

-- Enforce Validity & Non-Empty
ALTER TABLE "landparcel"
  ADD CONSTRAINT "enforce_validity_geom" CHECK (ST_IsValid(geom)),
  ADD CONSTRAINT "enforce_not_empty_geom" CHECK (NOT ST_IsEmpty(geom));

-- Enforce Vertex Limit (DoS Protection)
ALTER TABLE "landparcel"
  ADD CONSTRAINT "enforce_vertex_limit" CHECK (ST_NPoints(geom) <= 5000);
```

### Triggers
Triggers handle complex topology checks (Containment, Overlaps) that simple CHECK constraints cannot.
- **Trigger 1**: Check Overlaps (Tolerance > 1sqm)
- **Trigger 2**: Check Barangay Containment (Parcel inside Barangay)

---

## 4. Standard Error Response Format

All validation errors return a **400 Bad Request** with this JSON body:

```json
{
  "status": "error",
  "code": "SPATIAL_VALIDATION_FAILED",
  "message": "The provided geometry failed spatial validation.",
  "details": {
    "rule": "R7_BARANGAY_CONTAINMENT",
    "reason": "Geometry is not contained within the declared Barangay.",
    "violating_feature_id": "PARCEL-123",
    "expected": "EPSG:3123",
    "found": "EPSG:4326",
    "location": { "lat": 14.123, "lng": 121.456 },
    "tolerance": "1%"
  },
  "suggestions": [
    "Ensure the parcel is within Barangay Santa Clara.",
    "Reproject your data to EPSG:3123 before uploading."
  ],
  "request_id": "req_abc123"
}
```

---

## 5. Test Cases

| Case | Input | Expected Outcome | Code |
|------|-------|------------------|------|
| **Empty** | `{"type": "Polygon", "coordinates": []}` | Error | `ERR_EMPTY_GEOM` |
| **Bowtie** | Self-intersecting polygon | Error (with location) | `ERR_SELF_INTERSECTION` |
| **Open Ring** | Last point != First point | Error | `ERR_OPEN_RING` |
| **Wrong SRID** | EPSG:3857 coordinates | Auto-transform to 3123 | `SUCCESS` (Sanitized) |
| **Overlap** | Intersects existing parcel > 1sqm | Error | `ERR_OVERLAP` |
| **Complex** | > 5000 vertices | Error | `ERR_VERTEX_LIMIT` |
| **Bad Auto-fix**| Fix changes area by > 1% | Error | `ERR_UNSAFE_FIX` |

---

## 6. Performance Notes
*   **Indexes**: `CREATE INDEX landparcel_geom_idx ON landparcel USING GIST (geom);` is mandatory.
*   **Pre-filtering**: Always use `&&` (bounding box) before `ST_Intersects` or `ST_CoveredBy`.
*   **Optimization**: Overlap check uses `ST_Area(ST_Intersection(...))` only if `ST_Intersects` is true.
