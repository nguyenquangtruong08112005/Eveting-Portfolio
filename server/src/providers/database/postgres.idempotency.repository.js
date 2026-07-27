const crypto = require('crypto');
const { query } = require('./postgres.client');
const { toDb, fromDb, nowDb } = require('./time.helper');

const getExisting = async (key, userId, endpoint) => {
    const result = await query(
        'SELECT * FROM idempotency_keys WHERE key = $1 AND user_id = $2 AND endpoint = $3',
        [key, userId, endpoint]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
        id: row.id,
        key: row.key,
        userId: row.user_id,
        endpoint: row.endpoint,
        requestHash: row.request_hash,
        status: row.status,
        responseCode: row.response_code,
        responseBody: row.response_body,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
    };
};

const acquireLock = async (key, userId, endpoint, requestHash, ttlSeconds = 86400) => {
    const now = nowDb();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
    try {
        await query(
            `INSERT INTO idempotency_keys (key, user_id, endpoint, request_hash, status, expires_at, created_at)
             VALUES ($1, $2, $3, $4, 'IN_PROGRESS', $5, $6)`,
            [key, userId, endpoint, requestHash, expiresAt, now]
        );
        return { success: true, status: 'IN_PROGRESS' };
    } catch (err) {
        // Unique key constraint violation: code 23505 in pg
        if (err.code === '23505') {
            const record = await getExisting(key, userId, endpoint);
            if (!record) {
                throw err;
            }

            // Verify request payload hash matches
            if (record.requestHash !== requestHash) {
                return { success: false, conflict: false, mismatch: true, record };
            }

            // Handle active lock in progress
            if (record.status === 'IN_PROGRESS') {
                // If lock has expired, reset status to in-progress and extend TTL
                if (record.expiresAt && record.expiresAt < now) {
                    await query(
                        `UPDATE idempotency_keys 
                         SET status = 'IN_PROGRESS', request_hash = $4, expires_at = $5, created_at = $6
                         WHERE key = $1 AND user_id = $2 AND endpoint = $3`,
                        [key, userId, endpoint, requestHash, expiresAt, now]
                    );
                    return { success: true, status: 'IN_PROGRESS' };
                }
                return { success: false, conflict: true, mismatch: false, record };
            }

            // Request completed already, cached response is available
            return { success: false, conflict: false, mismatch: false, record };
        }
        throw err;
    }
};

const saveResponse = async (key, userId, endpoint, responseCode, responseBody, ttlSeconds = 86400) => {
    const now = nowDb();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
    await query(
        `UPDATE idempotency_keys
         SET status = 'COMPLETED', response_code = $4, response_body = $5, expires_at = $6
         WHERE key = $1 AND user_id = $2 AND endpoint = $3`,
        [key, userId, endpoint, responseCode, JSON.stringify(responseBody), expiresAt]
    );
};

const deleteKey = async (key, userId, endpoint) => {
    await query(
        'DELETE FROM idempotency_keys WHERE key = $1 AND user_id = $2 AND endpoint = $3',
        [key, userId, endpoint]
    );
};

const deleteExpiredKeys = async () => {
    await query('DELETE FROM idempotency_keys WHERE expires_at < $1', [nowDb()]);
};

// Legacy compatibility functions (modified to work with refined schema)
const findIdempotencyKey = async (key) => {
    const result = await query(
        'SELECT * FROM idempotency_keys WHERE key = $1 LIMIT 1',
        [key]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
        key: row.key,
        responseCode: row.response_code,
        responseBody: row.response_body,
        createdAt: fromDb(row.created_at),
        expiresAt: fromDb(row.expires_at),
    };
};

const saveIdempotencyKey = async (key, responseCode, responseBody, ttlSeconds = 86400, allowOverwrite = true) => {
    const now = nowDb();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
    const userId = 'legacy';
    const endpoint = 'legacy';
    const requestHash = crypto.createHash('sha256').update(JSON.stringify(responseBody || {})).digest('hex');
    const status = responseCode === 0 ? 'IN_PROGRESS' : 'COMPLETED';

    if (allowOverwrite) {
        await query(
            `INSERT INTO idempotency_keys (key, user_id, endpoint, request_hash, status, response_code, response_body, created_at, expires_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (key, user_id, endpoint) DO UPDATE SET
                 request_hash = EXCLUDED.request_hash,
                 status = EXCLUDED.status,
                 response_code = EXCLUDED.response_code,
                 response_body = EXCLUDED.response_body,
                 created_at = EXCLUDED.created_at,
                 expires_at = EXCLUDED.expires_at`,
            [key, userId, endpoint, requestHash, status, responseCode, JSON.stringify(responseBody), now, expiresAt]
        );
    } else {
        await query(
            `INSERT INTO idempotency_keys (key, user_id, endpoint, request_hash, status, response_code, response_body, created_at, expires_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [key, userId, endpoint, requestHash, status, responseCode, JSON.stringify(responseBody), now, expiresAt]
        );
    }
};

module.exports = {
    getExisting,
    acquireLock,
    saveResponse,
    deleteKey,
    deleteExpiredKeys,
    findIdempotencyKey,
    saveIdempotencyKey,
};
