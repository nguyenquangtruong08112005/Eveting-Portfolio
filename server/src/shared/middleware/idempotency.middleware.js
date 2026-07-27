const crypto = require('crypto');
const idempotencyRepository = require('@/providers/database/idempotency.repository');
const logger = require('@/shared/logger');

function canonicalize(val) {
    if (val === null || typeof val !== 'object') {
        return val;
    }
    if (Array.isArray(val)) {
        return val.map(canonicalize);
    }
    const sortedKeys = Object.keys(val).sort();
    const result = {};
    for (const key of sortedKeys) {
        result[key] = canonicalize(val[key]);
    }
    return result;
}

function computePayloadHash(body) {
    const canonical = canonicalize(body || {});
    const jsonString = JSON.stringify(canonical);
    return crypto.createHash('sha256').update(jsonString).digest('hex');
}

const idempotency = ({ required = true } = {}) => {
    return async (req, res, next) => {
        if (process.env.IDEMPOTENCY_ENFORCE === 'false') {
            return next();
        }

        // Idempotency is only relevant for mutation requests (POST/PUT/DELETE)
        if (req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'DELETE') {
            return next();
        }

        // Idempotency is for authenticated high-risk routes only
        const userId = req.user ? (req.user.uid || req.user.id || req.user.user_id) : null;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                message: 'Authentication required for idempotent operations.'
            });
        }

        // Extract key strictly from HTTP headers
        const key = req.headers['x-idempotency-key'] || req.headers['idempotency-key'];

        if (!key) {
            if (required) {
                return res.status(400).json({
                    success: false,
                    error: 'Bad Request',
                    code: 'IDEMPOTENCY_KEY_REQUIRED',
                    message: 'Idempotency-Key header is required for this endpoint.'
                });
            }
            return next();
        }

        const endpoint = `${req.method}:${(req.originalUrl || req.path || '').split('?')[0]}`;
        const requestHash = computePayloadHash(req.body);

        try {
            // Acquire lock (status: IN_PROGRESS)
            const lockResult = await idempotencyRepository.acquireLock(key, userId, endpoint, requestHash);

            if (!lockResult.success) {
                if (lockResult.ownedByOther) {
                    return res.status(409).json({
                        success: false,
                        error: 'Conflict',
                        code: 'IDEMPOTENCY_KEY_OWNED_BY_OTHER',
                        message: 'Idempotency key is already in use by another principal or endpoint.'
                    });
                }
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
                    // Completed request, replay cached response
                    logger.info('[Idempotency] Returning cached response for completed request');
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
                        // Keep text if not parseable
                    }
                }

                if (statusCode >= 500) {
                    // Delete key on server errors to allow retries
                    try {
                        await idempotencyRepository.deleteKey(key, userId, endpoint);
                    } catch (delErr) {
                        logger.error('[Idempotency] Failed to delete key on 500 error');
                    }
                } else {
                    // Save response on success or client errors (2xx, 4xx)
                    try {
                        await idempotencyRepository.saveResponse(key, userId, endpoint, statusCode, responseBody);
                    } catch (saveErr) {
                        logger.error('[Idempotency] Failed to save completed response');
                    }
                }
            };

            res.json = function (data) {
                saveResult(res.statusCode, data, true).then(() => {
                    originalJson.call(res, data);
                }).catch(err => {
                    logger.error('[Idempotency] Error in res.json interceptor');
                    originalJson.call(res, data);
                });
            };

            res.send = function (data) {
                saveResult(res.statusCode, data, false).then(() => {
                    originalSend.call(res, data);
                }).catch(err => {
                    logger.error('[Idempotency] Error in res.send interceptor');
                    originalSend.call(res, data);
                });
            };

            next();
        } catch (err) {
            logger.error('[Idempotency] Middleware error');
            next(err);
        }
    };
};

module.exports = idempotency;
