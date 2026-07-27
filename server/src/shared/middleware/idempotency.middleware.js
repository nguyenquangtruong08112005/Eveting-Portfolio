const crypto = require('crypto');
const idempotencyRepository = require('@/providers/database/idempotency.repository');
const logger = require('@/shared/logger');

const idempotency = () => {
    return async (req, res, next) => {
        if (process.env.IDEMPOTENCY_ENFORCE === 'false') {
            return next();
        }

        // Idempotency is only relevant for mutation requests (POST/PUT/DELETE)
        if (req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'DELETE') {
            return next();
        }

        const userId = req.user ? req.user.uid : 'anonymous';
        const endpoint = req.originalUrl || req.path;

        // Extract key from headers or body
        let key = req.headers['x-idempotency-key'] || req.headers['idempotency-key'];
        if (!key && req.body) {
            key = req.body.idempotencyKey || req.body.idempotency_key;
        }

        // Fallback fingerprint: deterministic hash of request details in 5-second window
        if (!key) {
            const hash = crypto.createHash('sha256');
            hash.update(userId);
            hash.update(endpoint);
            hash.update(JSON.stringify(req.body || {}));
            
            // 5-second sliding time window
            const timeWindow = Math.floor(Date.now() / 5000);
            hash.update(String(timeWindow));
            
            key = `fingerprint:${userId}:${hash.digest('hex')}`;
        }

        // Generate payload hash containing user_id to prevent cross-user key collision attacks
        const requestHash = crypto.createHash('sha256')
            .update(`${userId}:${JSON.stringify(req.body || {})}`)
            .digest('hex');

        try {
            // Acquire lock (status: IN_PROGRESS)
            const lockResult = await idempotencyRepository.acquireLock(key, userId, endpoint, requestHash);

            if (!lockResult.success) {
                if (lockResult.mismatch) {
                    return res.status(422).json({
                        success: false,
                        error: 'Unprocessable Entity',
                        code: 'IDEMPOTENCY_KEY_REUSE_PAYLOAD_MISMATCH',
                        message: 'Idempotency key reused with a different request payload.'
                    });
                }
                if (lockResult.conflict) {
                    return res.status(409).json({
                        success: false,
                        error: 'Conflict',
                        code: 'CONCURRENT_REQUEST_IN_PROGRESS',
                        message: 'A duplicate request is already in progress. Please try again later.'
                    });
                }
                if (lockResult.record) {
                    // Completed request, return cached response
                    logger.info(`[Idempotency] Returning cached response for key: ${key}`);
                    res.set('X-Idempotency-Cache', 'HIT');
                    return res.status(lockResult.record.responseCode).json(lockResult.record.responseBody);
                }
            }

            // Successfully acquired lock (IN_PROGRESS)
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
                        await idempotencyRepository.deleteKey(key, userId, endpoint);
                    } catch (delErr) {
                        logger.error(`[Idempotency] Failed to delete key on 500 error: ${delErr.message}`);
                    }
                } else {
                    // Save response on success or validation errors (2xx, 4xx)
                    try {
                        await idempotencyRepository.saveResponse(key, userId, endpoint, statusCode, responseBody);
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
