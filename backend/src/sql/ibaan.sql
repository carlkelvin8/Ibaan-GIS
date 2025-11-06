CREATE TABLE ibaan (
  id INT AUTO_INCREMENT PRIMARY KEY, -- Optional auto ID
  ParcelId INT ,
  SurveyId INT ,
  BlockNumber VARCHAR(50) NULL,
  LotNumber VARCHAR(50) ,
  Area DOUBLE,
  Claimant VARCHAR(255),
  TiePointId INT,
  TiePointNa VARCHAR(255),
  SurveyPlan VARCHAR(100),
  BarangayNa VARCHAR(255),
  Coordinate INT,
  XI DOUBLE,
  YI DOUBLE,
  LongitudeI DOUBLE,
  LatitudeI DOUBLE,
  LengthI DOUBLE,
  AreaI DOUBLE,
  VersionI INT,
  tax_ID VARCHAR(100) NULL,
  Tax_Amount DECIMAL(15,2) NULL,
  Due_Date DATE NULL,
  AmountPaid DECIMAL(15,2) NULL,
  Date_paid DATE NULL,
  geometry JSON 
);
commit;