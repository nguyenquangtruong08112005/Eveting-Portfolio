const { createClient } = require('redis');
const logger = require('@/shared/logger');

class MemoryCache {
  constructor() {
    this.store = new Map();
    this.ttls = new Map();
  }

  async get(key) {
    if (this.ttls.has(key) && this.ttls.get(key) < Date.now()) {
      this.store.delete(key);
      this.ttls.delete(key);
      return null;
    }
    return this.store.get(key) || null;
  }

  async set(key, value, ttlSeconds) {
    this.store.set(key, value);
    if (ttlSeconds) {
      this.ttls.set(key, Date.now() + (ttlSeconds * 1000));
    }
  }

  async del(key) {
    this.store.delete(key);
    this.ttls.delete(key);
  }
}

const fallbackCache = new MemoryCache();
let redisClient = null;
let isRedisConnected = false;

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

async function initRedis() {
  try {
    redisClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            logger.warn(`Redis connection retry limit reached. Falling back to MemoryCache.`);
            isRedisConnected = false;
            return false; // stop reconnecting
          }
          return Math.min(retries * 500, 2000);
        }
      }
    });

    redisClient.on('error', (err) => {
      logger.warn(`[Redis Cache Provider] Client Error: ${err.message}`);
      isRedisConnected = false;
    });

    redisClient.on('connect', () => {
      logger.info(`[Redis Cache Provider] Connected to Redis at ${redisUrl}`);
      isRedisConnected = true;
    });

    await redisClient.connect();
  } catch (err) {
    logger.warn(`[Redis Cache Provider] Initialization failed: ${err.message}. Using MemoryCache fallback.`);
    isRedisConnected = false;
  }
}

// Start connection attempt asynchronously
initRedis().catch(err => {
  logger.warn(`[Redis Cache Provider] Redis connection failure: ${err.message}`);
});

async function get(key) {
  if (isRedisConnected && redisClient) {
    try {
      return await redisClient.get(key);
    } catch (err) {
      logger.warn(`[Redis Cache Provider] get failed: ${err.message}. Falling back to MemoryCache.`);
    }
  }
  return fallbackCache.get(key);
}

async function set(key, value, ttlSeconds) {
  if (isRedisConnected && redisClient) {
    try {
      if (ttlSeconds) {
        await redisClient.set(key, value, { EX: ttlSeconds });
      } else {
        await redisClient.set(key, value);
      }
      return;
    } catch (err) {
      logger.warn(`[Redis Cache Provider] set failed: ${err.message}. Falling back to MemoryCache.`);
    }
  }
  await fallbackCache.set(key, value, ttlSeconds);
}

async function del(key) {
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.del(key);
      return;
    } catch (err) {
      logger.warn(`[Redis Cache Provider] del failed: ${err.message}. Falling back to MemoryCache.`);
    }
  }
  await fallbackCache.del(key);
}

module.exports = {
  get,
  set,
  del,
  MemoryCache
};
