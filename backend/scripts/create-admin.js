
import { database } from '../src/config/database.js';
import bcrypt from 'bcryptjs';

async function createAdmin() {
    const username = 'admin';
    const password = 'password123';
    const email = 'admin@example.com';
    const firstName = 'Admin';
    const lastName = 'User';
    const role = 1; // ADMIN
    const status = 'active';

    try {
        // 1. Ensure columns exist (Schema sync)
        console.log('Checking schema...');
        try {
            await database.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT \'active\'');
            await database.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS office_id INTEGER');
            await database.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS municipality_id INTEGER');
            await database.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP');
            console.log('Schema updated with missing columns.');
        } catch (err) {
            console.error('Schema update warning:', err.message);
        }

        // 2. Check if user exists
        const [existing] = await database.query('SELECT * FROM users WHERE username = ?', [username]);
        if (existing.length > 0) {
            console.log('Admin user already exists.');
            process.exit(0);
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await database.query(
            `INSERT INTO users (username, first_name, last_name, email, password, role, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [username, firstName, lastName, email, hashedPassword, role, status]
        );

        console.log('Admin user created successfully.');
        console.log('Username: admin');
        console.log('Password: password123');

    } catch (error) {
        console.error('Error creating admin user:', error);
    } finally {
        if (database.end) {
            await database.end();
        } else {
             console.log('No end() method on database object, exiting manually.');
             process.exit(0);
        }
    }
}

createAdmin();
