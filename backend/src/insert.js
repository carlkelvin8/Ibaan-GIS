import { database } from './config/database.js';
import fs from 'fs';
console.log('insert data');


(async () => {
  try {
    // 1️⃣ Read and parse the JSON file
    const raw = fs.readFileSync('src/Alameda_UTM51N.json', 'utf8');
    const json = JSON.parse(raw);

    // Detect if the JSON is an array or a FeatureCollection
    let features = [];
    if (Array.isArray(json)) {
      features = json;
    } else if (json.type === 'FeatureCollection') {
      features = json.features;
    } else if (json.type === 'Feature') {
      features = [json];
    } else {
      throw new Error('Invalid GeoJSON format.');
    }

    // 2️⃣ Connect to MySQL

    console.log("✅ Connected to MySQL");

    // 3️⃣ Loop through features and insert
    for (const feature of features) {
      const data = {
        ...feature.properties,
        geometry: JSON.stringify(feature.geometry)
      };

      const columns = Object.keys(data).join(', ');
      const placeholders = Object.keys(data).map(() => '?').join(', ');
      const values = Object.values(data);

      const sql = `INSERT INTO alameda (${columns}) VALUES (${placeholders})`;
      await database.execute(sql, values);
    }

    console.log(`✅ Inserted ${features.length} records successfully!`);
    await database.end();
  } catch (err) {
    console.error("❌ Error:", err.message); 
  }
})(); 