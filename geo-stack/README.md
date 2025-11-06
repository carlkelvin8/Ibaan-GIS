# GeoServer + MySQL Spatial bundle

This zip contains four parts:
- `db/`       — SQL scripts to prep the DB and create a read-only user
- `geoserver/`— Docker Compose to run GeoServer, SLD, and a publish script
- `backend/`  — (optional) Express proxy route to hide GeoServer
- `frontend/` — Env and a small helper for WMS/WFS URLs

## 1) Database
```sql
-- Run these in MySQL/MariaDB
SOURCE db/grants.sql;
SOURCE db/spatial_prep.sql;
```
Replace `your_db` with the actual schema name.

## 2) GeoServer
- Download the MySQL JDBC extension matching your GeoServer version and place the ZIP in `geoserver/extensions` as `mysql-plugin.zip`.
- Start: `cd geoserver && docker compose up -d`
- Publish layer: `./scripts/publish.sh` (edit variables inside as needed).

Test WMS:
`http://geoserver-custom-production.up.railway.app/geoserver/gis/wms?service=WMS&request=GetMap&version=1.1.1&layers=gis:ibaan&bbox=120,13,122,15&srs=EPSG:4326&width=800&height=600&format=image/png`

## 3) (Optional) API proxy
- `npm i express-http-proxy`
- Patch `backend/src/server.js` with `backend/src/server.patch.txt` instructions.
- Set `GEOSERVER_URL` in `backend/.env`.

## 4) Frontend
- Copy `frontend/.env.example` → `frontend/.env` and set values.
- Import and use `frontend/src/lib/geoserver.js` for your Leaflet WMS/WFS calls.
