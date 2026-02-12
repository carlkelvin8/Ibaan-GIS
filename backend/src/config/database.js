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
    let newSql = sql.replace(/\?/g, () => `$${paramCount++}`);
    
    // 2. Replace backticks with double quotes for identifiers
    newSql = newSql.replace(/`/g, '"');
    
    // 3. Replace CAST(... AS CHAR) with CAST(... AS TEXT)
    newSql = newSql.replace(/CAST\((.*?) AS CHAR\)/gi, 'CAST($1 AS TEXT)');

    // 4. Replace specific MySQL functions
    newSql = newSql.replace(/IFNULL\(/gi, 'COALESCE(');

    return newSql;
}

const database = {
    pool, 
    query: async (sql, params) => {
        // If params is provided, use conversion. If params is undefined, use raw SQL.
        const pgSql = convertQuery(sql);
        
        try {
            // Log for debugging pagination issues
            // console.log("SQL EXEC:", pgSql, params);

            const res = await pool.query(pgSql, params);
            
            // Normalize result to match mysql2 [rows, fields]
            // For SELECT, res.rows is the data.
            const rows = res.rows || []; 
            Object.defineProperty(rows, 'affectedRows', { value: res.rowCount, enumerable: false });
            Object.defineProperty(rows, 'insertId', { value: 0, enumerable: false }); 
            
            return [rows, res.fields]; 
        } catch (err) {
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
        return database.query(sql, params);
    },
    end: () => pool.end()
};

export { database };
