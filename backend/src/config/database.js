import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

/**
 * Converts MySQL SQL syntax to PostgreSQL syntax
 * @param {string} sql 
 * @returns {string}
 */
function convertQuery(sql) {
    // 1. Replace ? with $1, $2, ...
    let paramCount = 1;
    // We need to be careful not to replace ? inside strings, but for now simple regex is usually enough for parameterized queries
    let newSql = sql.replace(/\?/g, () => `$${paramCount++}`);
    
    // 2. Replace backticks with double quotes for identifiers
    newSql = newSql.replace(/`/g, '"');
    
    // 3. Replace CAST(... AS CHAR) with CAST(... AS TEXT)
    newSql = newSql.replace(/CAST\((.*?) AS CHAR\)/gi, 'CAST($1 AS TEXT)');

    // 4. Replace specific MySQL functions
    // IFNULL -> COALESCE (Postgres supports COALESCE)
    newSql = newSql.replace(/IFNULL\(/gi, 'COALESCE(');

    return newSql;
}

const database = {
    pool, 
    query: async (sql, params) => {
        const pgSql = convertQuery(sql);
        try {
            const res = await pool.query(pgSql, params);
            // Mimic mysql2 structure: [rows, fields]
            // Attach rowCount/affectedRows to the rows array for compatibility
            const rows = res.rows;
            rows.rowCount = res.rowCount;
            rows.affectedRows = res.rowCount; 
            return [rows, res.fields]; 
        } catch (err) {
            // Enhanced error logging
            console.error('----------------------------------------');
            console.error('SQL Error:', err.message);
            console.error('Original Query:', sql);
            console.error('Converted Query:', pgSql);
            console.error('Params:', params);
            console.error('----------------------------------------');
            throw err;
        }
    },
    execute: async (sql, params) => {
        // In pg, query() handles parameterized queries automatically
        return database.query(sql, params);
    },
    end: () => pool.end()
};

export { database };
