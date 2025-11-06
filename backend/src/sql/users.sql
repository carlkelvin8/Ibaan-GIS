-- src/routes/sql/users.sql
-- =========================================
-- Ensure structure: required columns + indexes
-- =========================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT 'user' AFTER password,
  ADD COLUMN IF NOT EXISTS status ENUM('active','pending','disabled') NOT NULL DEFAULT 'pending' AFTER role,
  ADD COLUMN IF NOT EXISTS office_id INT NULL AFTER status,
  ADD COLUMN IF NOT EXISTS municipality_id INT NULL AFTER office_id,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

-- Indexes for fast filtering/pagination
CREATE INDEX IF NOT EXISTS idx_users_role         ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status       ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_office       ON users(office_id);
CREATE INDEX IF NOT EXISTS idx_users_municipality ON users(municipality_id);
CREATE INDEX IF NOT EXISTS idx_users_created_at   ON users(created_at);

-- (Optional) kung may reference tables:
-- ALTER TABLE users
--   ADD CONSTRAINT fk_users_office
--     FOREIGN KEY (office_id) REFERENCES offices(id)
--     ON UPDATE CASCADE ON DELETE SET NULL,
--   ADD CONSTRAINT fk_users_municipality
--     FOREIGN KEY (municipality_id) REFERENCES municipalities(id)
--     ON UPDATE CASCADE ON DELETE SET NULL;

-- =========================================
-- Main SELECT (filters + sort + pagination)
-- (Gamitin sa database.execute sa Node: WHERE + params + LIMIT/OFFSET)
-- =========================================
-- :WHERE_CLAUSE placeholder para i-inject ng backend builder mo (buildUserFilters.js)
-- :ORDER_BY placeholder galing sa whitelist (sortMap.js)
-- :LIMIT at :OFFSET params

-- LIST
-- Tipikal na columns; huwag isama ang password.
SELECT
  u.id, u.username, u.first_name, u.last_name, u.email,
  u.role, u.status, u.office_id, u.municipality_id,
  u.created_at, u.updated_at
FROM users u
/* :WHERE_CLAUSE */
ORDER BY /* :ORDER_BY */ u.created_at DESC, u.id DESC
LIMIT ? OFFSET ?;

-- COUNT (para sa pagination)
SELECT COUNT(*) AS total
FROM users u
/* :WHERE_CLAUSE */;

-- =========================================
-- KPI SUMMARY (total/active/pending/disabled) para sa dashboard
-- Gumagana kahit string ang status enum
-- =========================================
SELECT
  COUNT(*) AS total,
  SUM(CASE WHEN u.status = 'active'  THEN 1 ELSE 0 END) AS active,
  SUM(CASE WHEN u.status = 'pending' THEN 1 ELSE 0 END) AS pending,
  SUM(CASE WHEN u.status = 'disabled' THEN 1 ELSE 0 END) AS disabled
FROM users u
/* :WHERE_CLAUSE */;
