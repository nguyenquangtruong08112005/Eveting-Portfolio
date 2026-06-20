const { query } = require('./postgres.client');

const findIdempotencyKey = async (key) => {
    const result = await query(
        'SELECT * FROM idempotency_keys WHERE key = $1',
        [key]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
        key: row.key,
        responseCode: row.response_code,
        responseBody: row.response_body,
        createdAt: Number(row.created_at),
        expiresAt: Number(row.expires_at)
    };
};

const saveIdempotencyKey = async (key, responseCode, responseBody, ttlSeconds = 86400, allowOverwrite = true) => {
    const now = Date.now();
    const expiresAt = now + (ttlSeconds * 1000);
    if (allowOverwrite) {
        await query(
            `INSERT INTO idempotency_keys (key, response_code, response_body, created_at, expires_at)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (key) DO UPDATE SET
                 response_code = EXCLUDED.response_code,
                 response_body = EXCLUDED.response_body,
                 created_at = EXCLUDED.created_at,
                 expires_at = EXCLUDED.expires_at`,
            [key, responseCode, JSON.stringify(responseBody), now, expiresAt]
        );
    } else {
        await query(
            `INSERT INTO idempotency_keys (key, response_code, response_body, created_at, expires_at)
             VALUES ($1, $2, $3, $4, $5)`,
            [key, responseCode, JSON.stringify(responseBody), now, expiresAt]
        );
    }
};

const deleteExpiredKeys = async () => {
    const now = Date.now();
    await query('DELETE FROM idempotency_keys WHERE expires_at < $1', [now]);
};

module.exports = {
    findIdempotencyKey,
    saveIdempotencyKey,
    deleteExpiredKeys,
};
