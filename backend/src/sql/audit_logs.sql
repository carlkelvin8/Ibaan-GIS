CREATE TABLE audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NULL,
  username VARCHAR(255) NOT NULL,
  action ENUM('CREATE','UPDATE','DELETE') NOT NULL,
  entity_type VARCHAR(64) NOT NULL,        -- 'ibaan','tax_forms','landparcel',...
  entity_id   VARCHAR(64) NOT NULL,        -- ParcelId, parcelID, tax_forms.id, etc.
  entity_ctx JSON NULL,                    -- small human-readable context
  changed_fields JSON NULL,                -- ["LotNumber","BarangayNa","geometry"]
  before_data JSON NULL,                   -- minimal snapshot (omit big geometry if you like)
  after_data  JSON NULL,
  ip VARCHAR(45) NULL,                     -- IPv4/IPv6
  user_agent VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_entity (entity_type, entity_id, created_at),
  KEY idx_username (username, created_at),
  KEY idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE audit_logs
  ADD COLUMN parcel_id_v VARCHAR(64)
    GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(entity_ctx, '$.ParcelId'))) VIRTUAL,
  ADD KEY idx_parcel (parcel_id_v, created_at);
