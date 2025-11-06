CREATE TABLE tax_other_details (
  id INT AUTO_INCREMENT PRIMARY KEY,
  taxId INT NOT NULL,
  taxability VARCHAR(50),
  effectivityYear INT,
  quarter VARCHAR(50),
  updateCode VARCHAR(50),
  dateRegistered DATE,
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
commit;