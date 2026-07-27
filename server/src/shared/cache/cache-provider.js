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

  async delByPattern(pattern) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
        this.ttls.delete(key);
      }
    }
  }
}

const fallbackCache = new MemoryCache();
let redisClient = null;
let isRedisConnected = false;
let initGen = 0;

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

async function initRedis() {
  const gen = ++initGen;
  try {
    const candidate = createClient({
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

    redisClient = candidate;

    candidate.on('error', (err) => {
      logger.warn(`[Redis Cache Provider] Client Error: ${err.message}`);
      isRedisConnected = false;
    });

    candidate.on('connect', () => {
      logger.info(`[Redis Cache Provider] Connected to Redis at ${redisUrl}`);
      isRedisConnected = true;
    });

    candidate.on('ready', () => {
      isRedisConnected = true;
    });

    candidate.on('end', () => {
      isRedisConnected = false;
    });

    await candidate.connect();
    if (candidate === redisClient && candidate.isReady) {
      isRedisConnected = true;
      logger.info(`[Redis Cache Provider] Ready at ${redisUrl}`);
    }
  } catch (err) {
    if (gen === initGen) {
      logger.warn(`[Redis Cache Provider] Initialization failed: ${err.message}. Using MemoryCache fallback.`);
      isRedisConnected = false;
    }
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

async function delByPattern(pattern) {
  if (isRedisConnected && redisClient) {
    try {
      const matched = [];
      let cursor = '0';
      do {
        const reply = await redisClient.scan(cursor, { MATCH: pattern, COUNT: 100 });
        cursor = reply.cursor;
        matched.push(...reply.keys);
      } while (cursor !== '0');
      if (matched.length > 0) {
        await redisClient.del(matched);
        logger.info(`[Redis Cache Provider] Invalidated ${matched.length} keys matching ${pattern}`);
      }
      return;
    } catch (err) {
      logger.warn(`[Redis Cache Provider] delByPattern failed: ${err.message}. Falling back to MemoryCache.`);
    }
  }
  await fallbackCache.delByPattern(pattern);
}

function isRedisAvailable() {
  return Boolean(isRedisConnected && redisClient);
}

function getRedisClient() {
  if (isRedisAvailable()) return redisClient;
  return null;
}

async function disconnect() {
  initGen++;
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch (err) {
      logger.warn(`[Redis Cache Provider] quit error: ${err.message}`);
    }
    isRedisConnected = false;
    redisClient = null;
  }
}

module.exports = {
  get,
  set,
  del,
  delByPattern,
  MemoryCache,
  isRedisAvailable,
  getRedisClient,
  disconnect,
};
