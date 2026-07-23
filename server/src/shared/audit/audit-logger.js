const { v4: uuidv4 } = require('uuid');
const logger = require('@/shared/logger');
const { nowDb, nowMs } = require('@/providers/database/time.helper');

async function logAction(transactionClient, { userId = null, action, resourceType, resourceId, changes = null, ipAddress = null }) {
    const auditId = `aud_${uuidv4()}`;
    // audit_logs.created_at is timestamptz — never pass raw epoch millis
    const createdAtDb = nowDb();
    const createdAtMs = nowMs();
    // user_id is nullable (FK ON DELETE SET NULL); system jobs may pass null
    const actorId = userId == null || userId === '' ? null : userId;

    await transactionClient.query(
        `INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, changes, ip_address, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [auditId, actorId, action, resourceType, resourceId, changes ? JSON.stringify(changes) : null, ipAddress, createdAtDb]
    );

    const lokiAuditRecord = {
        type: 'audit',
        auditId,
        userId: actorId,
        action,
        resourceType,
        resourceId,
        changes,
        ipAddress,
        createdAt: createdAtMs
    };

    logger.info(`[Audit Log] ${action} on ${resourceType}:${resourceId}`, lokiAuditRecord);

    return auditId;
}

module.exports = {
    logAction
};
