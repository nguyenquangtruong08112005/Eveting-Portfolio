const { query } = require('@/providers/database/postgres.client');
const { v4: uuidv4 } = require('uuid');
const { nowDb } = require('@/providers/database/time.helper');

async function publish(eventType, payload, transactionClient = null) {
    const client = (transactionClient && typeof transactionClient.query === 'function')
        ? transactionClient
        : { query };

    const outboxId = `out_${uuidv4()}`;
    // outbox.created_at / updated_at are TIMESTAMPTZ — pass Date, not raw millis
    const now = nowDb();

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
