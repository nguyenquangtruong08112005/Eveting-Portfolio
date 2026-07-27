const { query } = require('./postgres.client');
const { nowDb } = require('./time.helper');

const getByKey = async (key) => {
    const result = await query(
        'SELECT * FROM idempotency_keys WHERE key = $1',
        [key]
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

    const existingRecord = await getByKey(key);
    if (existingRecord) {
        // Check if key is owned by a different principal or endpoint
        if (existingRecord.userId !== userId || existingRecord.endpoint !== endpoint) {
            return { success: false, conflict: true, mismatch: false, ownedByOther: true, record: existingRecord };
        }

        // Verify request payload hash matches
        if (existingRecord.requestHash !== requestHash) {
            return { success: false, conflict: false, mismatch: true, record: existingRecord };
        }

        // Handle active lock in progress
        if (existingRecord.status === 'IN_PROGRESS') {
            // If lock has expired, reset status to in-progress and extend TTL
            if (existingRecord.expiresAt && new Date(existingRecord.expiresAt) < now) {
            await query(
                `UPDATE idempotency_keys
                 SET status = 'IN_PROGRESS', request_hash = $4, expires_at = $5, created_at = $6
                 WHERE key = $1 AND user_id = $2 AND endpoint = $3`,
                [key, userId, endpoint, requestHash, expiresAt, now]
            );
            return { success: true, status: 'IN_PROGRESS' };
        }
        return { success: false, conflict: true, mismatch: false, record: existingRecord };
    }

    // Request completed already, cached response is available
    return { success: false, conflict: false, mismatch: false, record: existingRecord };
}

try {
    await query(
        `INSERT INTO idempotency_keys (key, user_id, endpoint, request_hash, status, expires_at, created_at)
         VALUES ($1, $2, $3, $4, 'IN_PROGRESS', $5, $6)`,
        [key, userId, endpoint, requestHash, expiresAt, now]
    );
    return { success: true, status: 'IN_PROGRESS' };
} catch (err) {
    // Unique constraint violation (code 23505 in pg)
    if (err.code === '23505') {
        const record = await getByKey(key);
        if (!record) {
            throw err;
        }

        // Check if key is owned by a different principal or endpoint
        if (record.userId !== userId || record.endpoint !== endpoint) {
            return { success: false, conflict: true, mismatch: false, ownedByOther: true, record };
        }

        // Verify request payload hash matches
        if (record.requestHash !== requestHash) {
            return { success: false, conflict: false, mismatch: true, record };
        }

        // Handle active lock in progress
        if (record.status === 'IN_PROGRESS') {
            if (record.expiresAt && new Date(record.expiresAt) < now) {
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
    if (!key || !userId || !endpoint) {
        throw new Error('key, userId, and endpoint are required');
    }
    await query(
        'DELETE FROM idempotency_keys WHERE key = $1 AND user_id = $2 AND endpoint = $3',
        [key, userId, endpoint]
    );
};

const deleteExpiredKeys = async () => {
    await query('DELETE FROM idempotency_keys WHERE expires_at < $1', [nowDb()]);
};

module.exports = {
    getExisting,
    getByKey,
    acquireLock,
    saveResponse,
    deleteKey,
};
