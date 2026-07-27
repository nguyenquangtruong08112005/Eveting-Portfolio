require('dotenv').config({ quiet: true });
require('../alias-bootstrap');
const { query } = require('../providers/database/postgres.client');
const cron = require('node-cron');
const logger = require('@/shared/logger');

const DRY = process.env.RETENTION_DRY_RUN !== 'false';
const OUTBOX_DAYS = Number(process.env.RETENTION_OUTBOX_DAYS || 7);
const RETENTION_BATCH = Number(process.env.RETENTION_BATCH || 500);
const SCHEDULE_TZ = 'Asia/Ho_Chi_Minh';
const SCHEDULE_PATTERN = process.env.RETENTION_CRON || '30 2 * * *';

async function runOnce() {
    logger.info(`[retention] dryRun=${DRY} outboxDays=${OUTBOX_DAYS} batch=${RETENTION_BATCH} tz=${SCHEDULE_TZ}`);

    const cutoff = new Date(Date.now() - (OUTBOX_DAYS * 86400000));

    const outboxCount = await query(
        `SELECT count(*)::int AS n FROM outbox
         WHERE status = 'completed' AND created_at < $1`,
        [cutoff]
    );
    logger.info(`[retention] outbox completed rows older than ${OUTBOX_DAYS}d: ${outboxCount.rows[0].n}`);

    if (!DRY && outboxCount.rows[0].n > 0) {
        let deleted = 0;
        let hasMore = true;
        while (hasMore) {
            const result = await query(
                `DELETE FROM outbox
                 WHERE id IN (
                     SELECT id FROM outbox
                     WHERE status = 'completed' AND created_at < $1
                     LIMIT $2
                 )`,
                [cutoff, RETENTION_BATCH]
            );
            deleted += result.rowCount;
            hasMore = result.rowCount >= RETENTION_BATCH;
            logger.info(`[retention] Deleted ${result.rowCount} completed outbox rows (total=${deleted})`);
        }
        logger.info(`[retention] Total completed outbox rows deleted: ${deleted}`);
    }

    const idempNow = new Date();
    const idempCount = await query(
        `SELECT count(*)::int AS n FROM idempotency_keys WHERE expires_at < $1`,
        [idempNow]
    );
    logger.info(`[retention] idempotency expired rows: ${idempCount.rows[0].n}`);
    if (!DRY && idempCount.rows[0].n > 0) {
        await query(`DELETE FROM idempotency_keys WHERE expires_at < $1`, [idempNow]);
        logger.info(`[retention] Deleted expired idempotency keys`);
    }

    logger.info('[retention] done');
}

function startRetentionCron() {
    logger.info(`[retention] Cron scheduled: "${SCHEDULE_PATTERN}" (${SCHEDULE_TZ})`);
    cron.schedule(SCHEDULE_PATTERN, () => {
        runOnce().catch(err => logger.error(`[retention] Cron run failed: ${err.message}`));
    }, {
        scheduled: true,
        timezone: SCHEDULE_TZ
    });
}

if (require.main === module) {
    const isCron = process.argv.includes('--cron');
    if (isCron) {
        startRetentionCron();
    } else {
        runOnce().then(() => process.exit(0)).catch(e => {
            logger.error(`[retention] failed: ${e.message}`);
            process.exit(1);
        });
    }
}

module.exports = { runOnce, startRetentionCron };
