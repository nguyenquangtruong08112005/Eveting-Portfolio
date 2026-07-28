require('dotenv').config({ quiet: true });
require('../alias-bootstrap');

const seatRepository = require('@/providers/database/seat.repository');
const { getPool } = require('@/providers/database/postgres.client');
const { getIo } = require('@/shared/socket/socket-server');
const logger = require('@/shared/logger');

const POLL_INTERVAL_MS = 15 * 1000;
const BATCH_SIZE = 500;
const WORKER_ENABLED = process.env.SEAT_RELEASE_WORKER_ENABLED !== 'false';
const RUN_ONCE = process.argv.includes('--once');

let active = false;
let pollTimer = null;
let cacheProvider = null;
let cacheNamespace = null;

function getCacheProviders() {
    if (!cacheProvider) {
        cacheProvider = require('@/shared/cache/cache-provider');
        cacheNamespace = require('@/shared/cache/namespace-helpers');
    }
    return { cacheProvider, cacheNamespace };
}

async function invalidateAndEmit(releasedSeats) {
    const cache = getCacheProviders();
    const groups = new Map();

    for (const seat of releasedSeats) {
        await cache.cacheProvider.del(`seat:status:${seat.performanceId}:${seat.seatId}`);
        const key = `${seat.eventId}:${seat.performanceId}`;
        const group = groups.get(key) || {
            eventId: seat.eventId,
            performanceId: seat.performanceId,
            seatIds: []
        };
        group.seatIds.push(seat.seatId);
        groups.set(key, group);
    }

    const io = getIo();
    for (const group of groups.values()) {
        await cache.cacheNamespace.invalidateSeatAvailability(group.eventId);
        if (io) {
            io.to(`event_${group.eventId}`).emit('seat:released', {
                eventId: group.eventId,
                performanceId: group.performanceId,
                seatIds: group.seatIds,
                reason: 'EXPIRED'
            });
        }
    }
}

async function processExpiredHolds() {
    if (active) return [];
    active = true;

    try {
        const releasedSeats = await seatRepository.releaseExpiredPerformanceSeatHolds(BATCH_SIZE);
        if (releasedSeats.length > 0) {
            await invalidateAndEmit(releasedSeats);
            logger.info(`[SeatReleaseWorker] Released ${releasedSeats.length} expired seat hold(s).`);
        }
        return releasedSeats;
    } catch (error) {
        logger.error(`[SeatReleaseWorker] Failed to release expired holds: ${error.message}`);
        throw error;
    } finally {
        active = false;
    }
}

function startPolling() {
    if (!WORKER_ENABLED) {
        logger.info('[SeatReleaseWorker] Worker disabled via SEAT_RELEASE_WORKER_ENABLED=false');
        return;
    }

    async function poll() {
        try {
            await processExpiredHolds();
        } catch (_) {
            // The next fixed poll retries after the error has been logged.
        }

        if (!RUN_ONCE) {
            pollTimer = setTimeout(poll, POLL_INTERVAL_MS);
        }
    }

    logger.info(`[SeatReleaseWorker] Starting polling (interval=${POLL_INTERVAL_MS}ms).`);
    poll();
}

function stopPolling() {
    if (pollTimer) {
        clearTimeout(pollTimer);
        pollTimer = null;
    }
}

async function shutdown(exitCode = 0) {
    stopPolling();
    try {
        if (cacheProvider) {
            await cacheProvider.disconnect();
        }
        await getPool().end();
    } finally {
        process.exit(exitCode);
    }
}

if (require.main === module) {
    if (RUN_ONCE) {
        if (!WORKER_ENABLED) {
            logger.info('[SeatReleaseWorker] Worker disabled; --once skipped.');
            process.exit(0);
        } else {
            processExpiredHolds()
                .then(() => shutdown(0))
                .catch(() => shutdown(1));
        }
    } else {
        startPolling();
        process.on('SIGINT', () => shutdown(0));
        process.on('SIGTERM', () => shutdown(0));
    }
}

module.exports = {
    POLL_INTERVAL_MS,
    processExpiredHolds,
    startPolling,
    stopPolling
};
