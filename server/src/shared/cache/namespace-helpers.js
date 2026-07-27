const zlib = require('zlib');
const cacheProvider = require('./cache-provider');
const logger = require('@/shared/logger');

const GZIP_THRESHOLD = Number(process.env.CACHE_GZIP_THRESHOLD) || 8192;
const CACHE_ENABLED = process.env.CACHE_ENABLED !== 'false';
const GZIP_PREFIX = 'gzip64:';

const TTL = {
    EVENT: Number(process.env.CACHE_TTL_EVENT) || 300,
    CATEGORIES: Number(process.env.CACHE_TTL_CATEGORIES) || 3600,
    VENUES: Number(process.env.CACHE_TTL_VENUES) || 3600,
    SEAT_AVAILABILITY: Number(process.env.CACHE_TTL_SEAT) || 10,
};

const PREFIX = {
    EVENT: 'cache:event',
    CATEGORIES: 'cache:categories',
    VENUES: 'cache:venues',
    VENUE: 'cache:venue',
    SEAT_AVAILABILITY: 'cache:seat',
};

function isGzipCandidate(value) {
    if (typeof value === 'string') {
        return Buffer.byteLength(value, 'utf8') >= GZIP_THRESHOLD;
    }
    return false;
}

function compress(value) {
    return new Promise((resolve, reject) => {
        zlib.gzip(value, (err, compressed) => {
            if (err) reject(err);
            else resolve(compressed);
        });
    });
}

function decompress(value) {
    return new Promise((resolve, reject) => {
        zlib.gunzip(value, (err, decompressed) => {
            if (err) reject(err);
            else resolve(decompressed.toString('utf8'));
        });
    });
}

async function get(key) {
    if (!CACHE_ENABLED) return null;
    try {
        const raw = await cacheProvider.get(key);
        if (raw === null || raw === undefined) return null;

        if (typeof raw === 'string' && raw.startsWith(GZIP_PREFIX)) {
            const buf = Buffer.from(raw.slice(GZIP_PREFIX.length), 'base64');
            const str = await decompress(buf);
            return JSON.parse(str);
        }

        try {
            return JSON.parse(raw);
        } catch {
            return raw;
        }
    } catch (err) {
        logger.warn(`[CacheNamespace] get error for ${key}: ${err.message}`);
        return null;
    }
}

async function set(key, value, ttlSeconds) {
    if (!CACHE_ENABLED) return;
    try {
        const jsonStr = JSON.stringify(value);
        if (isGzipCandidate(jsonStr)) {
            const compressed = await compress(jsonStr);
            const encoded = GZIP_PREFIX + compressed.toString('base64');
            await cacheProvider.set(key, encoded, ttlSeconds);
        } else {
            await cacheProvider.set(key, jsonStr, ttlSeconds);
        }
    } catch (err) {
        logger.warn(`[CacheNamespace] set error for ${key}: ${err.message}`);
    }
}

async function del(key) {
    if (!CACHE_ENABLED) return;
    try {
        await cacheProvider.del(key);
    } catch (err) {
        logger.warn(`[CacheNamespace] del error for ${key}: ${err.message}`);
    }
}

async function delByPattern(pattern) {
    if (!CACHE_ENABLED) return;
    try {
        await cacheProvider.delByPattern(pattern);
    } catch (err) {
        logger.warn(`[CacheNamespace] delByPattern error for ${pattern}: ${err.message}`);
    }
}

async function getEvent(eventId) {
    return get(`${PREFIX.EVENT}:${eventId}`);
}

async function setEvent(eventId, data) {
    return set(`${PREFIX.EVENT}:${eventId}`, data, TTL.EVENT);
}

async function invalidateEvent(eventId) {
    await del(`${PREFIX.EVENT}:${eventId}`);
    logger.info(`[CacheNamespace] Invalidated event cache for ${eventId}`);
}

async function invalidateAllEvents() {
    await delByPattern(`${PREFIX.EVENT}:*`);
}

async function getCategories() {
    return get(PREFIX.CATEGORIES);
}

async function setCategories(data) {
    return set(PREFIX.CATEGORIES, data, TTL.CATEGORIES);
}

async function invalidateCategories() {
    await del(PREFIX.CATEGORIES);
    logger.info('[CacheNamespace] Invalidated categories cache');
}

async function getVenue(venueId) {
    return get(`${PREFIX.VENUE}:${venueId}`);
}

async function setVenue(venueId, data) {
    return set(`${PREFIX.VENUE}:${venueId}`, data, TTL.VENUES);
}

async function invalidateVenue(venueId) {
    await del(`${PREFIX.VENUE}:${venueId}`);
    logger.info(`[CacheNamespace] Invalidated venue cache for ${venueId}`);
}

async function invalidateAllVenues() {
    await delByPattern(`${PREFIX.VENUE}:*`);
    await del(PREFIX.VENUES);
}

async function getSeatAvailability(eventId) {
    return get(`${PREFIX.SEAT_AVAILABILITY}:${eventId}`);
}

async function setSeatAvailability(eventId, data) {
    return set(`${PREFIX.SEAT_AVAILABILITY}:${eventId}`, data, TTL.SEAT_AVAILABILITY);
}

async function invalidateSeatAvailability(eventId) {
    await del(`${PREFIX.SEAT_AVAILABILITY}:${eventId}`);
    logger.info(`[CacheNamespace] Invalidated seat availability for event ${eventId}`);
}

async function invalidate(eventType, id) {
    switch (eventType) {
        case 'event':
            await invalidateEvent(id);
            break;
        case 'venue':
            await invalidateVenue(id);
            break;
        case 'categories':
            await invalidateCategories();
            break;
        case 'seat_availability':
            await invalidateSeatAvailability(id);
            break;
        default:
            logger.warn(`[CacheNamespace] Unknown invalidation type: ${eventType}`);
    }
}

module.exports = {
    TTL,
    PREFIX,
    get,
    set,
    del,
    delByPattern,
    getEvent,
    setEvent,
    invalidateEvent,
    invalidateAllEvents,
    getCategories,
    setCategories,
    invalidateCategories,
    getVenue,
    setVenue,
    invalidateVenue,
    invalidateAllVenues,
    getSeatAvailability,
    setSeatAvailability,
    invalidateSeatAvailability,
    invalidate,
};
