CREATE TABLE land_appraisal (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    taxid BIGINT,
    class VARCHAR(100),
    subClass VARCHAR(100),
    actualUse VARCHAR(150),
    unitValue DECIMAL(12,2),
    area VARCHAR(100),
    baseMarketValue DECIMAL(14,2),
    stripping VARCHAR(100),
    adjustment VARCHAR(100),
    marketValue DECIMAL(14,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) AUTO_INCREMENT = 1000;
commit;