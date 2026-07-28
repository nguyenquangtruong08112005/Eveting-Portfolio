require('dotenv').config({ quiet: true });
require('../alias-bootstrap');
const { query } = require('@/providers/database/postgres.client');
const { getIo } = require('@/shared/socket/socket-server');
const fcmService = require('@/modules/notifications/infrastructure/providers/fcm.service');
const logger = require('@/shared/logger');
const esClient = require('@/shared/config/elasticsearch.config');
const { buildElasticData } = require('@/modules/events/application/helpers/event-mappers');
const eventRepository = require('@/providers/database/event.repository');
const cacheNamespace = require('@/shared/cache/namespace-helpers');

const BATCH_SIZE = Number(process.env.OUTBOX_BATCH_SIZE) || 50;
const POLL_INTERVAL_MS = Number(process.env.OUTBOX_POLL_INTERVAL_MS) || 2000;
const MAX_RETRIES = Number(process.env.OUTBOX_MAX_RETRIES) || 5;
const WORKER_ENABLED = process.env.OUTBOX_WORKER_ENABLED !== 'false';
const RUN_ONCE = process.argv.includes('--once');

let active = false;
let pollTimer = null;

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

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
            logger.warn(`[OutboxPublisher] Unknown notification channel: ${channel}`);
        }
    },
    search_index: async (payload) => {
        const { action, eventId } = payload;

        await cacheNamespace.invalidateEvent(eventId);

        if (!esClient) {
            logger.warn(`[OutboxPublisher] esClient not configured. Skipping search_index.`);
            return;
        }

        if (action === 'delete') {
            try {
                await esClient.delete({ index: 'events', id: eventId });
                logger.info(`[OutboxPublisher] Deleted event ${eventId} from search index.`);
            } catch (error) {
                if (error.meta && error.meta.statusCode === 404) {
                    logger.info(`[OutboxPublisher] Event ${eventId} already deleted from index.`);
                } else {
                    throw error;
                }
            }
        } else if (action === 'index') {
            const eventData = await eventRepository.getEventById(eventId);
            if (!eventData) {
                try {
                    await esClient.delete({ index: 'events', id: eventId });
                } catch (e) {}
                logger.info(`[OutboxPublisher] Event ${eventId} not found in DB. Removed from index.`);
                return;
            }

            const STATUS = { ACTIVE: 'active' };
            const VISIBILITY = { PUBLIC: 'public' };
            if (
                eventData.status !== STATUS.ACTIVE
                || eventData.visibility !== VISIBILITY.PUBLIC
                || eventData.isPrivate === true
            ) {
                try {
                    await esClient.delete({ index: 'events', id: eventId });
                } catch (e) {}
                logger.info(`[OutboxPublisher] Event ${eventId} status=${eventData.status}, visibility=${eventData.visibility}. Removed.`);
                return;
            }

            const elasticData = await buildElasticData(eventData);
            await esClient.index({
                index: 'events',
                id: eventId,
                body: elasticData
            });
            logger.info(`[OutboxPublisher] Indexed event ${eventId} successfully.`);
        }
    }
};

async function claimBatch() {
    const now = new Date();
    const staleCutoff = new Date(Date.now() - 30000);
    const result = await query(
        `UPDATE outbox
         SET status = 'processing', updated_at = $3
         WHERE id IN (
             SELECT id FROM outbox
             WHERE (
                 (status IN ('pending', 'failed') AND retry_count < $1)
                 OR (status = 'processing' AND updated_at < $4)
             )
             AND (
                 retry_count = 0
                 OR updated_at + (LEAST((1000 * POWER(2, retry_count::float - 1))::bigint, 30000) * interval '1 millisecond') <= $3
             )
             ORDER BY created_at ASC
             LIMIT $2
             FOR UPDATE SKIP LOCKED
         )
         RETURNING id, event_type, payload, retry_count`,
        [MAX_RETRIES, BATCH_SIZE, now, staleCutoff]
    );
    return result.rows;
}

async function processRows(rows) {
    for (const row of rows) {
        try {
            const processor = PROCESSORS[row.event_type];
            if (processor) {
                await processor(row.payload);
            } else {
                logger.warn(`[OutboxPublisher] No processor for event_type: ${row.event_type}`);
            }

            const completeNow = new Date();
            await query(
                `UPDATE outbox SET status = 'completed', updated_at = $1 WHERE id = $2`,
                [completeNow, row.id]
            );
            logger.info(`[OutboxPublisher] Completed outbox ${row.id} (${row.event_type})`);
        } catch (err) {
            const nextRetry = row.retry_count + 1;
            logger.error(`[OutboxPublisher] Failed outbox ${row.id} (${row.event_type}): ${err.message} (retry ${nextRetry}/${MAX_RETRIES})`);

            if (nextRetry >= MAX_RETRIES) {
                const dlqNow = new Date();
                const dlqResult = await query(
                    `INSERT INTO outbox_dlq (id, outbox_id, event_type, payload, status, retry_count, error_message, failed_at, created_at, updated_at)
                     VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $7, $7)
                     ON CONFLICT (id) DO NOTHING
                     RETURNING id`,
                    [`dlq_${row.id}`, row.id, row.event_type, JSON.stringify(row.payload), nextRetry, err.message, dlqNow]
                );
                if (dlqResult.rows.length > 0) {
                    logger.info(`[OutboxPublisher] Moved ${row.id} to DLQ as ${dlqResult.rows[0].id}`);
                }
                await query(
                    `UPDATE outbox SET status = 'failed', retry_count = $1, error_message = $2, updated_at = $3 WHERE id = $4`,
                    [nextRetry, err.message, dlqNow, row.id]
                );
            } else {
                const backoffMs = Math.min(1000 * Math.pow(2, nextRetry - 1), 30000);
                const retryAt = new Date();
                await query(
                    `UPDATE outbox SET status = 'pending', retry_count = $1, error_message = $2, updated_at = $3 WHERE id = $4`,
                    [nextRetry, err.message, retryAt, row.id]
                );
                logger.info(`[OutboxPublisher] Scheduled retry ${nextRetry}/${MAX_RETRIES} for ${row.id} in ${backoffMs}ms`);
            }
        }
    }
}

async function processPending() {
    if (active) return;
    active = true;

    try {
        const rows = await claimBatch();
        if (rows.length > 0) {
            logger.info(`[OutboxPublisher] Claimed ${rows.length} outbox rows for processing`);
            await processRows(rows);
        }
    } catch (err) {
        logger.error(`[OutboxPublisher] processPending error: ${err.message}`);
    } finally {
        active = false;
    }
}

function startPolling() {
    if (!WORKER_ENABLED) {
        logger.info('[OutboxPublisher] Worker disabled via OUTBOX_WORKER_ENABLED=false');
        return;
    }

    logger.info(`[OutboxPublisher] Starting polling (interval=${POLL_INTERVAL_MS}ms, batch=${BATCH_SIZE}, maxRetries=${MAX_RETRIES})`);

    async function poll() {
        if (RUN_ONCE) {
            logger.info('[OutboxPublisher] --once mode: single run');
            await processPending();
            logger.info('[OutboxPublisher] --once run complete');
            return;
        }
        await processPending();
        pollTimer = setTimeout(poll, POLL_INTERVAL_MS);
    }

    poll().catch(err => logger.error(`[OutboxPublisher] Poll loop error: ${err.message}`));
}

function stopPolling() {
    if (pollTimer) {
        clearTimeout(pollTimer);
        pollTimer = null;
    }
    logger.info('[OutboxPublisher] Polling stopped');
}

if (require.main === module) {
    startPolling();

    process.on('SIGINT', () => {
        logger.info('[OutboxPublisher] Shutting down...');
        stopPolling();
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        logger.info('[OutboxPublisher] Shutting down...');
        stopPolling();
        process.exit(0);
    });
}

module.exports = {
    processPending,
    startPolling,
    stopPolling,
    PROCESSORS
};
