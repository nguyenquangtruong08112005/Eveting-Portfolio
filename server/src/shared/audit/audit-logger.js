const { v4: uuidv4 } = require('uuid');
const logger = require('@/shared/logger');

async function logAction(transactionClient, { userId, action, resourceType, resourceId, changes = null, ipAddress = null }) {
    const auditId = `aud_${uuidv4()}`;
    const createdAt = Date.now();

    await transactionClient.query(
        `INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, changes, ip_address, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [auditId, userId, action, resourceType, resourceId, changes ? JSON.stringify(changes) : null, ipAddress, createdAt]
    );

    const lokiAuditRecord = {
        type: 'audit',
        auditId,
        userId,
        action,
        resourceType,
        resourceId,
        changes,
        ipAddress,
        createdAt
    };

    logger.info(`[Audit Log] ${action} on ${resourceType}:${resourceId}`, lokiAuditRecord);

    return auditId;
}

module.exports = {
    logAction
};
