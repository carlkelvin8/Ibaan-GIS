CREATE TABLE landparcel ( 
	parcelID BIGINT PRIMARY KEY AUTO_INCREMENT, 
	improvement BOOLEAN, 
	totalValue DOUBLE, 
	StreetAddress VARCHAR(255), 
	Barangay VARCHAR(255), 
	Municipality VARCHAR(255), 
	ZipCode INT, 
	areaSize DOUBLE, 
	propertyType VARCHAR(255), 
	actualLandUse VARCHAR(255) ) 
AUTO_INCREMENT = 1000000;
commit;