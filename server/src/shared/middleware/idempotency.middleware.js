const crypto = require('crypto');
const idempotencyRepository = require('@/providers/database/idempotency.repository');
const logger = require('@/shared/logger');

const idempotency = () => {
    return async (req, res, next) => {
        // Idempotency is only relevant for mutation requests (POST/PUT)
        if (req.method !== 'POST' && req.method !== 'PUT') {
            return next();
        }

        const userId = req.user ? req.user.uid : 'anonymous';
        
        // Extract key from headers or body
        let key = req.headers['x-idempotency-key'] || req.headers['idempotency-key'];
        if (!key && req.body) {
            key = req.body.idempotencyKey || req.body.idempotency_key;
        }

        // Fallback fingerprint: deterministic hash of request details in 5-second window
        if (!key) {
            const hash = crypto.createHash('sha256');
            hash.update(userId);
            hash.update(req.originalUrl || req.path);
            hash.update(JSON.stringify(req.body || {}));
            
            // 5-second sliding time window
            const timeWindow = Math.floor(Date.now() / 5000);
            hash.update(String(timeWindow));
            
            key = `fingerprint:${userId}:${hash.digest('hex')}`;
        }

        try {
            // Attempt to insert a placeholder to lock the request in-flight
            const now = Date.now();
            const lockTimeout = 120000; // 2 minutes lock timeout for in-flight requests
            const expiresAt = now + lockTimeout;

            try {
                await idempotencyRepository.saveIdempotencyKey(key, 0, {}, lockTimeout / 1000, false);
            } catch (dbErr) {
                // Key already exists (Conflict / duplicate request)
                const record = await idempotencyRepository.findIdempotencyKey(key);
                if (record) {
                    if (record.responseCode === 0) {
                        // Request is in progress
                        return res.status(409).json({
                            success: false,
                            error: 'Conflict',
                            message: 'Duplicate request in progress. Please wait and try again.'
                        });
                    } else {
                        // Completed request, return cached response
                        logger.info(`[Idempotency] Returning cached response for key: ${key}`);
                        return res.status(record.responseCode).json(record.responseBody);
                    }
                }
                throw dbErr;
            }

            // Successfully set placeholder/lock, proceed with request interceptor
            let finished = false;

            const originalJson = res.json;
            const originalSend = res.send;

            const saveResult = async (statusCode, body, isJson) => {
                if (finished) return;
                finished = true;

                let responseBody = body;
                if (!isJson && typeof body === 'string') {
                    try {
                        responseBody = JSON.parse(body);
                    } catch (_) {
                        // Keep as text if not parseable
                    }
                }

                if (statusCode >= 500) {
                    // Delete key on server errors to allow retries
                    try {
                        const { query } = require('@/providers/database/postgres.client');
                        await query('DELETE FROM idempotency_keys WHERE key = $1', [key]);
                    } catch (delErr) {
                        logger.error(`[Idempotency] Failed to delete key on 500 error: ${delErr.message}`);
                    }
                } else {
                    // Save response on success or validation errors (2xx, 4xx)
                    try {
                        await idempotencyRepository.saveIdempotencyKey(key, statusCode, responseBody, 86400); // Cache for 24 hours
                    } catch (saveErr) {
                        logger.error(`[Idempotency] Failed to save completed response: ${saveErr.message}`);
                    }
                }
            };

            res.json = function (data) {
                saveResult(res.statusCode, data, true).then(() => {
                    originalJson.call(res, data);
                }).catch(err => {
                    logger.error(`[Idempotency] Error saving response JSON: ${err.message}`);
                    originalJson.call(res, data);
                });
            };

            res.send = function (data) {
                saveResult(res.statusCode, data, false).then(() => {
                    originalSend.call(res, data);
                }).catch(err => {
                    logger.error(`[Idempotency] Error saving response send: ${err.message}`);
                    originalSend.call(res, data);
                });
            };

            next();
        } catch (err) {
            logger.error(`[Idempotency] Middleware error: ${err.message}`);
            next(err);
        }
    };
};

module.exports = idempotency;
