
import { database } from '../src/config/database.js';

async function updateSchema() {
    try {
        console.log('Adding deleted_at column to users table...');
        await database.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL');
        
        console.log('Adding deleted_at column to building table...');
        await database.query('ALTER TABLE building ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL');

        console.log('Schema update complete.');
    } catch (err) {
        console.error('Error updating schema:', err);
    } finally {
        if (database.end) {
            await database.end();
        } else {
             console.log('No end() method on database object, exiting manually.');
             process.exit(0);
        }
    }
}

updateSchema();
