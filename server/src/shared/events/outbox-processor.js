const { query } = require('@/providers/database/postgres.client');
const { getIo } = require('@/shared/socket/socket-server');
const fcmService = require('@/modules/notifications/infrastructure/providers/fcm.service');
const logger = require('@/shared/logger');
const cron = require('node-cron');

let isProcessing = false;

// Registry of event processors by type
const PROCESSORS = {
    notification: async (payload) => {
        const { channel, target, title, body, data } = payload;
        if (channel === 'push') {
            if (payload.topic) {
                await fcmService.sendToTopic(payload.topic, title, body, data);
            } else if (target) {
                await fcmService.sendMulticast([target], title, body, data);
            }
        } else if (channel === 'socket') {
            const io = getIo();
            if (io && target) {
                io.to(target).emit(payload.event || 'notification', { title, body, data });
            }
        } else if (channel === 'email') {
            logger.info(`[Email Dispatcher Mock] Sending email to ${target}: ${title} - ${body}`);
        } else {
            logger.warn(`[Outbox Processor] Unknown notification channel: ${channel}`);
        }
    },
    search_index: async (payload) => {
        // Will be fully wired in P1.7-S2
        logger.info(`[Elastic Search Index Projector Mock] Processing search sync for event ${payload.eventId} (action: ${payload.action})`);
    }
};

async function processPending() {
    if (isProcessing) return;
    isProcessing = true;

    try {
        const result = await query(
            `SELECT * FROM outbox 
             WHERE status IN ('pending', 'failed') AND retry_count < 3
             ORDER BY created_at ASC 
             LIMIT 10`
        );

        if (result.rows.length === 0) {
            isProcessing = false;
            return;
        }

        logger.info(`[Outbox Processor] Found ${result.rows.length} entries to process.`);

        for (const row of result.rows) {
            await query(
                `UPDATE outbox SET status = 'processing', updated_at = $1 WHERE id = $2`,
                [Date.now(), row.id]
            );

            try {
                const processor = PROCESSORS[row.event_type];
                if (processor) {
                    await processor(row.payload);
                } else {
                    logger.warn(`[Outbox Processor] No handler for event type: ${row.event_type}`);
                }

                await query(
                    `UPDATE outbox SET status = 'completed', updated_at = $1 WHERE id = $2`,
                    [Date.now(), row.id]
                );
            } catch (err) {
                logger.error(`[Outbox Processor] Error processing entry ${row.id}: ${err.message}`);
                const nextRetry = row.retry_count + 1;
                const nextStatus = nextRetry >= 3 ? 'failed' : 'pending';
                await query(
                    `UPDATE outbox 
                     SET status = $1, retry_count = $2, error_message = $3, updated_at = $4 
                     WHERE id = $5`,
                    [nextStatus, nextRetry, err.message, Date.now(), row.id]
                );
            }
        }
    } catch (err) {
        logger.error(`[Outbox Processor] Runner error: ${err.message}`);
    } finally {
        isProcessing = false;
    }
}

function triggerProcess() {
    setImmediate(() => {
        processPending().catch(err => logger.error(`[Outbox Processor] Immediate trigger failed: ${err.message}`));
    });
}

function startCronJob() {
    // Run every 30 seconds
    cron.schedule('*/30 * * * * *', () => {
        processPending().catch(err => logger.error(`[Outbox Processor] Cron run failed: ${err.message}`));
    });
    logger.info('[Outbox Processor] Background cron scheduled to run every 30 seconds.');
}

module.exports = {
    processPending,
    triggerProcess,
    startCronJob,
    PROCESSORS
};
