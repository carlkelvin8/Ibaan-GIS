CREATE TABLE land_assessment_summary (
  id INT AUTO_INCREMENT PRIMARY KEY,
  taxId INT NOT NULL,
  propertyKind VARCHAR(100),
  propertyActualUse VARCHAR(100),
  adjustedMarketValue DECIMAL(15,2),
  level VARCHAR(50),
  assessedValue DECIMAL(15,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
commit;