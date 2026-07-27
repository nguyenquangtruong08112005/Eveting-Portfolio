require('dotenv').config({ quiet: true });
require('../../src/alias-bootstrap');
const { query } = require('../../src/providers/database/postgres.client');
const { processPending } = require('../../src/jobs/outbox-publisher');
const MAX_BACK_TO_OUTBOX = Number(process.env.DLQ_RETRY_MAX) || 50;

const COMMANDS = ['list', 'retry', 'retry-all', 'delete', 'delete-all', 'show'];

function usage() {
    console.log(`
Usage: node scripts/maintenance/retry-dlq.js <command> [options]

Commands:
  list                     List all DLQ entries
  show <dlq_id>            Show details of a specific DLQ entry
  retry <dlq_id>           Move one DLQ entry back to outbox for retry
  retry-all                Move all pending DLQ entries back to outbox
  delete <dlq_id>          Delete a single DLQ entry
  delete-all               Delete all DLQ entries (dangerous)

Options:
  --limit <n>              Limit for list/retry-all (default: ${MAX_BACK_TO_OUTBOX})
  --dry-run                Show what would be done without making changes
  --help                   Show this help
`);
}

async function listEntries(limit) {
    const rows = await query(
        `SELECT id, outbox_id, event_type, retry_count, error_message, failed_at
         FROM outbox_dlq
         ORDER BY failed_at DESC
         LIMIT $1`,
        [limit]
    );
    if (rows.rows.length === 0) {
        console.log('No DLQ entries found.');
        return;
    }
    console.log(`DLQ entries (${rows.rows.length}):`);
    for (const r of rows.rows) {
        console.log(`  ${r.id} | outbox=${r.outbox_id} | type=${r.event_type} | retries=${r.retry_count} | error=${r.error_message || 'N/A'} | failed_at=${r.failed_at}`);
    }
}

async function showEntry(dlqId) {
    const rows = await query(
        `SELECT * FROM outbox_dlq WHERE id = $1`,
        [dlqId]
    );
    if (rows.rows.length === 0) {
        console.error(`DLQ entry not found: ${dlqId}`);
        process.exit(1);
    }
    console.log(JSON.stringify(rows.rows[0], null, 2));
}

async function retryEntry(dlqId, dryRun) {
    const rows = await query(
        `SELECT * FROM outbox_dlq WHERE id = $1`,
        [dlqId]
    );
    if (rows.rows.length === 0) {
        console.error(`DLQ entry not found: ${dlqId}`);
        process.exit(1);
    }
    const entry = rows.rows[0];

    if (dryRun) {
        console.log(`[DRY-RUN] Would retry DLQ entry ${dlqId} (event_type=${entry.event_type})`);
        return;
    }

    const now = new Date();
    await query(
        `UPDATE outbox SET status = 'pending', retry_count = 0, error_message = NULL, updated_at = $2 WHERE id = $1`,
        [entry.outbox_id, now]
    );
    const updated = (await query(`SELECT count(*)::int AS n FROM outbox WHERE id = $1`, [entry.outbox_id])).rows[0].n;
    if (updated === 0) {
        await query(
            `INSERT INTO outbox (id, event_type, payload, status, retry_count, error_message, created_at, updated_at)
             VALUES ($1, $2, $3, 'pending', 0, NULL, $4, $4)`,
            [entry.outbox_id, entry.event_type, entry.payload, now]
        );
    }
    await query(`DELETE FROM outbox_dlq WHERE id = $1`, [dlqId]);
    console.log(`Moved ${dlqId} back to outbox as ${entry.outbox_id} (reset to 0 retries)`);

    await processPending();
}

async function retryAll(limit, dryRun) {
    const rows = await query(
        `SELECT id, outbox_id, event_type, payload FROM outbox_dlq WHERE status = 'pending' ORDER BY failed_at ASC LIMIT $1`,
        [limit]
    );
    if (rows.rows.length === 0) {
        console.log('No pending DLQ entries to retry.');
        return;
    }
    console.log(`Found ${rows.rows.length} DLQ entries to retry.`);

    for (const entry of rows.rows) {
        if (dryRun) {
            console.log(`[DRY-RUN] Would retry ${entry.id} -> ${entry.outbox_id}`);
            continue;
        }
        const retryNow = new Date();
        const outboxExists = (await query(`SELECT count(*)::int AS n FROM outbox WHERE id = $1`, [entry.outbox_id])).rows[0].n;
        if (outboxExists > 0) {
            await query(
                `UPDATE outbox SET status = 'pending', retry_count = 0, error_message = NULL, updated_at = $2 WHERE id = $1`,
                [entry.outbox_id, retryNow]
            );
        } else {
            await query(
                `INSERT INTO outbox (id, event_type, payload, status, retry_count, error_message, created_at, updated_at)
                 VALUES ($1, $2, $3, 'pending', 0, NULL, $4, $4)`,
                [entry.outbox_id, entry.event_type, entry.payload, retryNow]
            );
        }
        await query(`DELETE FROM outbox_dlq WHERE id = $1`, [entry.id]);
        console.log(`Retried ${entry.id} -> outbox ${entry.outbox_id}`);
    }

    if (!dryRun) {
        await processPending();
    }
}

async function deleteEntry(dlqId, dryRun) {
    if (dryRun) {
        console.log(`[DRY-RUN] Would delete DLQ entry ${dlqId}`);
        return;
    }
    const result = await query(`DELETE FROM outbox_dlq WHERE id = $1`, [dlqId]);
    if (result.rowCount === 0) {
        console.error(`DLQ entry not found: ${dlqId}`);
        process.exit(1);
    }
    console.log(`Deleted DLQ entry ${dlqId}`);
}

async function deleteAll(dryRun) {
    if (dryRun) {
        const count = await query(`SELECT count(*)::int AS n FROM outbox_dlq`);
        console.log(`[DRY-RUN] Would delete ${count.rows[0].n} DLQ entries`);
        return;
    }
    const result = await query(`DELETE FROM outbox_dlq`);
    console.log(`Deleted ${result.rowCount} DLQ entries`);
}

async function run() {
    const args = process.argv.slice(2);
    if (args.length === 0 || args.includes('--help')) {
        usage();
        process.exit(0);
    }

    const cmd = args[0];
    if (!COMMANDS.includes(cmd)) {
        console.error(`Unknown command: ${cmd}`);
        usage();
        process.exit(1);
    }

    const limitIdx = args.indexOf('--limit');
    const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : MAX_BACK_TO_OUTBOX;
    const dryRun = args.includes('--dry-run');

    switch (cmd) {
        case 'list':
            await listEntries(limit);
            break;
        case 'show':
            if (!args[1] || args[1].startsWith('--')) {
                console.error('show requires a dlq_id argument');
                process.exit(1);
            }
            await showEntry(args[1]);
            break;
        case 'retry':
            if (!args[1] || args[1].startsWith('--')) {
                console.error('retry requires a dlq_id argument');
                process.exit(1);
            }
            await retryEntry(args[1], dryRun);
            break;
        case 'retry-all':
            await retryAll(limit, dryRun);
            break;
        case 'delete':
            if (!args[1] || args[1].startsWith('--')) {
                console.error('delete requires a dlq_id argument');
                process.exit(1);
            }
            await deleteEntry(args[1], dryRun);
            break;
        case 'delete-all':
            await deleteAll(dryRun);
            break;
    }

    process.exit(0);
}

run().catch(err => {
    console.error(`retry-dlq error: ${err.message}`);
    process.exit(1);
});
