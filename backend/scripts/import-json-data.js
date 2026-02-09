import fs from 'fs';
import path from 'path';
import { database } from '../src/config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: node scripts/import-json-data.js <file_path> <table_name>');
  process.exit(1);
}

const [filePath, tableName] = args;

async function importData() {
  try {
    const absolutePath = path.resolve(filePath);
    console.log(`Reading file: ${absolutePath}`);
    
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File not found: ${absolutePath}`);
    }

    const fileContent = fs.readFileSync(absolutePath, 'utf-8');
    let jsonData = JSON.parse(fileContent);

    // Handle FeatureCollection
    if (jsonData.type === 'FeatureCollection' && Array.isArray(jsonData.features)) {
      jsonData = jsonData.features;
    }
    
    // Handle Array of Features (ibaan_ver2_UTM51N.json style)
    if (!Array.isArray(jsonData)) {
      throw new Error('JSON data must be an array or a FeatureCollection');
    }

    console.log(`Found ${jsonData.length} items to import.`);

    let successCount = 0;
    let errorCount = 0;

    for (const item of jsonData) {
      // Flatten properties and geometry
      // Assuming item is a GeoJSON Feature: { type: "Feature", properties: {...}, geometry: {...} }
      // Or just a plain object? The examples show Feature structure.
      
      let rowData = {};
      
      if (item.type === 'Feature' && item.properties) {
        rowData = { ...item.properties };
        if (item.geometry) {
          // Convert geometry to string for storage (as per ibaanController logic)
          rowData.geometry = JSON.stringify(item.geometry);
        }
      } else {
        // Fallback for plain objects
        rowData = item;
      }

      // Filter keys to match table columns (we need to know columns)
      // For now, we'll try to insert all keys that match columns in the DB.
      // But we don't know the columns dynamically easily without querying information_schema.
      // Let's query information_schema to get valid columns for the table.
      
      // Get table columns
      const [columnsResult] = await database.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
        [tableName]
      );
      
      if (columnsResult.length === 0) {
        throw new Error(`Table '${tableName}' not found or has no columns.`);
      }

      const validColumns = new Set(columnsResult.map(c => c.column_name));
      
      // Prepare insert object
      const insertData = {};
      for (const [key, value] of Object.entries(rowData)) {
        // Match keys case-insensitively or exact? PostgreSQL columns are usually lowercase.
        // The JSON keys are CamelCase or Mixed.
        // Let's try to match: exact, or lowercase(key) == column, or specific mappings.
        
        let targetCol = null;
        if (validColumns.has(key)) targetCol = key;
        else if (validColumns.has(key.toLowerCase())) targetCol = key.toLowerCase();
        
        if (targetCol) {
            insertData[targetCol] = value;
        }
      }

      if (Object.keys(insertData).length === 0) {
        console.warn('Skipping item with no matching columns:', JSON.stringify(item).substring(0, 100));
        errorCount++;
        continue;
      }

      const cols = Object.keys(insertData);
      const values = Object.values(insertData);
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
      
      const query = `INSERT INTO "${tableName}" (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`;

      try {
        await database.query(query, values);
        successCount++;
        if (successCount % 100 === 0) process.stdout.write('.');
      } catch (err) {
        console.error(`\nError inserting item (ID: ${rowData.ParcelId || rowData.id}):`, err.message);
        errorCount++;
      }
    }

    console.log(`\nImport completed.`);
    console.log(`Success: ${successCount}`);
    console.log(`Errors: ${errorCount}`);

  } catch (err) {
    console.error('\nFatal error:', err.message);
  } finally {
    // database.end() if needed, but the pool might keep open. 
    // In a script we might need to force exit.
    process.exit(0);
  }
}

importData();
