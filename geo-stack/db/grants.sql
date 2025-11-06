-- db/grants.sql
-- Create a read-only user for GeoServer (adjust host as needed)
CREATE USER IF NOT EXISTS 'gs'@'%' IDENTIFIED BY 'gs_password';
GRANT SELECT ON gis.* TO 'gs'@'%';
FLUSH PRIVILEGES;
