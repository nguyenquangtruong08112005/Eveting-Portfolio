let pool = null;

function getPool() {
    if (!pool) {
        const { Pool } = require('pg');
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
        });
    }
    return pool;
}

async function query(text, params) {
    return getPool().query(text, params);
}

module.exports = { getPool, query };
