
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve('backend/.env') });

const config = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
};

async function setup() {
    // 1. Create database if not exists
    console.log('Connecting to postgres database to check/create target DB...');
    const client1 = new pg.Client({ ...config, database: 'postgres' });
    try {
        await client1.connect();
        const res = await client1.query(`SELECT 1 FROM pg_database WHERE datname = '${process.env.DB_NAME}'`);
        if (res.rowCount === 0) {
            console.log(`Database ${process.env.DB_NAME} does not exist. Creating...`);
            await client1.query(`CREATE DATABASE "${process.env.DB_NAME}"`);
            console.log('Database created.');
        } else {
            console.log(`Database ${process.env.DB_NAME} already exists.`);
        }
    } catch (err) {
        console.error('Error checking/creating database:', err);
        // If we can't connect to postgres db, maybe we are restricted. 
        // We will try connecting to the target db directly in next step.
    } finally {
        await client1.end();
    }

    // 2. Import schema
    console.log(`Connecting to ${process.env.DB_NAME} to import schema...`);
    const client2 = new pg.Client({ ...config, database: process.env.DB_NAME });
    
    try {
        await client2.connect();
        const schemaPath = 'c:\\Users\\PC\\Documents\\GIS\\gis.sql';
        console.log(`Reading schema from ${schemaPath}...`);
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        
        console.log('Executing schema...');
        await client2.query(schemaSql);
        console.log('Schema imported successfully.');
        
    } catch (err) {
        console.error('Error importing schema:', err);
    } finally {
        await client2.end();
    }
}

setup();
