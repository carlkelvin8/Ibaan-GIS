import fs from 'fs';
import path from 'path';
import { database } from '../src/config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const filePath = 'src/ibaan_ver2_UTM51N.geojson';

async function importData() {
  try {
    const absolutePath = path.resolve(filePath);
    console.log(`Reading file: ${absolutePath}`);
    
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File not found: ${absolutePath}`);
    }

    const fileContent = fs.readFileSync(absolutePath, 'utf-8');
    let jsonData = JSON.parse(fileContent);

    if (jsonData.type === 'FeatureCollection' && Array.isArray(jsonData.features)) {
      jsonData = jsonData.features;
    }
    
    console.log(`Found ${jsonData.length} items to import.`);

    let successCount = 0;
    let errorCount = 0;

    for (const item of jsonData) {
      const props = item.properties || item;
      const geometry = item.geometry;
      
      const parcelId = props.ParcelId;
      if (!parcelId) {
        console.warn('Skipping item with no ParcelId');
        continue;
      }

      // 1. Insert into landparcel if not exists
      try {
        // Check if exists
        const [existing] = await database.query('SELECT "parcelID" FROM landparcel WHERE "parcelID" = $1', [parcelId]);
        
        if (existing.length === 0) {
            // Insert into landparcel
            // Mapping: Area -> areaSize, BarangayNa -> Barangay
            await database.query(
                `INSERT INTO landparcel ("parcelID", "areaSize", "Barangay") VALUES ($1, $2, $3)`,
                [parcelId, props.Area || null, props.BarangayNa || null]
            );
        }
      } catch (err) {
        console.error(`Error processing landparcel for ID ${parcelId}:`, err.message);
        errorCount++;
        continue; // Skip ibaan insert if landparcel failed
      }

      // 2. Insert into ibaan
      // Check if exists in ibaan
      const [ibaanExists] = await database.query('SELECT "ParcelId" FROM ibaan WHERE "ParcelId" = $1', [parcelId]);
      if (ibaanExists.length > 0) {
        // console.log(`Skipping existing ibaan record ${parcelId}`);
        continue;
      }

      // Prepare fields
      const rowData = { ...props };
      if (geometry) {
        rowData.geometry = JSON.stringify(geometry);
      }

      // Filter columns (hardcoded list from ibaanController for safety)
      const WRITABLE_FIELDS = [
        "ParcelId","SurveyId","BlockNumber","LotNumber","Area","Claimant","TiePointId","TiePointNa",
        "SurveyPlan","BarangayNa","Coordinate","XI","YI","LongitudeI","LatitudeI","LengthI","AreaI",
        "VersionI","tax_ID","Tax_Amount","Due_Date","AmountPaid","Date_paid","geometry"
      ];
      
      const insertData = {};
      for (const k of WRITABLE_FIELDS) {
        if (rowData[k] !== undefined) {
            insertData[k] = rowData[k];
        }
      }

      const cols = Object.keys(insertData);
      const values = Object.values(insertData);
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');

      const query = `INSERT INTO "ibaan" (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`;

      try {
        await database.query(query, values);
        successCount++;
        if (successCount % 100 === 0) process.stdout.write('.');
      } catch (err) {
        console.error(`\nError inserting ibaan item (ID: ${parcelId}):`, err.message);
        errorCount++;
      }
    }

    console.log(`\nImport completed.`);
    console.log(`Success: ${successCount}`);
    console.log(`Errors: ${errorCount}`);

  } catch (err) {
    console.error('\nFatal error:', err.message);
  } finally {
    process.exit(0);
  }
}

importData();
