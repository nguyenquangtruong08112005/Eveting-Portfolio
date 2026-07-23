const { query } = require('@/providers/database/postgres.client');
const { getIo } = require('@/shared/socket/socket-server');
const fcmService = require('@/modules/notifications/infrastructure/providers/fcm.service');
const logger = require('@/shared/logger');
const cron = require('node-cron');
const esClient = require('@/shared/config/elasticsearch.config');
const { buildElasticData } = require('@/modules/events/application/helpers/event-mappers');
const eventRepository = require('@/providers/database/event.repository');
const cacheProvider = require('@/shared/cache/cache-provider');
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

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
            const emailProvider = require('@/providers/email');
            const safeHtml = payload.html || (body ? `<p>${escapeHtml(body)}</p>` : undefined);
            await emailProvider.sendEmail({
                to: target,
                subject: title,
                text: body,
                html: safeHtml
            });
        } else if (channel === 'event_update') {
            const { notifyAttendeesAboutUpdate } = require('@/modules/events/application/helpers/notification-sender');
            await notifyAttendeesAboutUpdate(payload.eventId, payload.eventName);
        } else if (channel === 'event_cancellation') {
            const { notifyAttendeesAboutCancellation } = require('@/modules/events/application/helpers/notification-sender');
            await notifyAttendeesAboutCancellation(payload.eventId, payload.eventName);
        } else {
            logger.warn(`[Outbox Processor] Unknown notification channel: ${channel}`);
        }
    },
    search_index: async (payload) => {
        const { action, eventId } = payload;
        const ELASTIC_INDEX = 'events';

        // Invalidate cache actively on any update
        try {
            await cacheProvider.del(`cache:event:${eventId}`);
            logger.info(`[Cache Invalidation] Invalidated cache: cache:event:${eventId}`);
        } catch (cacheErr) {
            logger.warn(`[Cache Invalidation] Failed to invalidate cache for ${eventId}: ${cacheErr.message}`);
        }

        if (!esClient) {
            logger.warn(`[Elastic Search Index Projector] esClient is not configured. Skipping.`);
            return;
        }

        if (action === 'delete') {
            try {
                await esClient.delete({ index: ELASTIC_INDEX, id: eventId });
                logger.info(`[Elastic Search Index Projector] Deleted event ${eventId} from search index.`);
            } catch (error) {
                if (error.meta && error.meta.statusCode === 404) {
                    logger.info(`[Elastic Search Index Projector] Event ${eventId} was already deleted or not found in index.`);
                } else {
                    throw error;
                }
            }
        } else if (action === 'index') {
            const eventData = await eventRepository.getEventById(eventId);
            if (!eventData) {
                try {
                    await esClient.delete({ index: ELASTIC_INDEX, id: eventId });
                } catch (e) {}
                logger.info(`[Elastic Search Index Projector] Event ${eventId} not found in DB or inactive. Removed from index.`);
                return;
            }

            const STATUS = { ACTIVE: 'active' };
            const VISIBILITY = { PUBLIC: 'public' };
            if (eventData.status !== STATUS.ACTIVE || eventData.visibility !== VISIBILITY.PUBLIC) {
                try {
                    await esClient.delete({ index: ELASTIC_INDEX, id: eventId });
                } catch (e) {}
                logger.info(`[Elastic Search Index Projector] Event ${eventId} is status=${eventData.status}, visibility=${eventData.visibility}. Removed from index.`);
                return;
            }

            const elasticData = await buildElasticData(eventData);
            await esClient.index({
                index: ELASTIC_INDEX,
                id: eventId,
                body: elasticData
            });
            logger.info(`[Elastic Search Index Projector] Indexed event ${eventId} successfully.`);
        }
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
                [nowDb(), row.id]
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
                    [nowDb(), row.id]
                );
            } catch (err) {
                logger.error(`[Outbox Processor] Error processing entry ${row.id}: ${err.message}`);
                const nextRetry = row.retry_count + 1;
                const nextStatus = nextRetry >= 3 ? 'failed' : 'pending';
                await query(
                    `UPDATE outbox 
                     SET status = $1, retry_count = $2, error_message = $3, updated_at = $4 
                     WHERE id = $5`,
                    [nextStatus, nextRetry, err.message, nowDb(), row.id]
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
