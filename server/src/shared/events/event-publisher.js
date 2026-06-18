const { query } = require('@/providers/database/postgres.client');
const { v4: uuidv4 } = require('uuid');

async function publish(eventType, payload, transactionClient = null) {
    const client = (transactionClient && typeof transactionClient.query === 'function')
        ? transactionClient
        : { query };

    const outboxId = `out_${uuidv4()}`;
    const now = Date.now();

    await client.query(
        `INSERT INTO outbox (id, event_type, payload, status, retry_count, created_at, updated_at)
         VALUES ($1, $2, $3, 'pending', 0, $4, $4)`,
        [outboxId, eventType, JSON.stringify(payload), now]
    );

    return outboxId;
}

module.exports = {
    publish
};
