const rateLimit = require('express-rate-limit');
const logger = require('@/shared/logger');
const { getRedisClient } = require('@/shared/cache/cache-provider');

class RedisFallbackStore {
  constructor(prefix = 'ratelimit:', windowMs = 60000) {
    this.prefix = prefix;
    this.windowMs = windowMs;
    this.memoryStore = new Map();
  }

  init(options) {
    if (options && options.windowMs) {
      this.windowMs = options.windowMs;
    }
  }

  async increment(key) {
    const redisKey = `${this.prefix}${key}`;
    const client = getRedisClient();

    if (client) {
      try {
        const totalHits = await client.sendCommand(['INCR', redisKey]);
        let pttl = await client.sendCommand(['PTTL', redisKey]);

        if (totalHits === 1 || pttl <= 0) {
          await client.sendCommand(['PEXPIRE', redisKey, String(this.windowMs)]);
          pttl = this.windowMs;
        }

        const resetTime = new Date(Date.now() + (pttl > 0 ? pttl : this.windowMs));
        return {
          totalHits: Number(totalHits),
          resetTime,
        };
      } catch (err) {
        logger.warn(`[RedisFallbackStore] Redis operation error for key ${key}: ${err.message}. Falling back to in-memory store.`);
      }
    }

    return this.incrementMemory(key);
  }

  incrementMemory(key) {
    const now = Date.now();
    let record = this.memoryStore.get(key);

    if (!record || record.resetTime <= now) {
      record = {
        totalHits: 1,
        resetTime: now + this.windowMs,
      };
    } else {
      record.totalHits += 1;
    }

    this.memoryStore.set(key, record);

    if (this.memoryStore.size > 10000) {
      for (const [k, v] of this.memoryStore.entries()) {
        if (v.resetTime <= now) this.memoryStore.delete(k);
      }
    }

    return {
      totalHits: record.totalHits,
      resetTime: new Date(record.resetTime),
    };
  }

  async decrement(key) {
    const redisKey = `${this.prefix}${key}`;
    const client = getRedisClient();
    if (client) {
      try {
        await client.sendCommand(['DECR', redisKey]);
      } catch (_) {}
    }
    const record = this.memoryStore.get(key);
    if (record && record.totalHits > 0) {
      record.totalHits -= 1;
    }
  }

  async resetKey(key) {
    const redisKey = `${this.prefix}${key}`;
    const client = getRedisClient();
    if (client) {
      try {
        await client.sendCommand(['DEL', redisKey]);
      } catch (_) {}
    }
    this.memoryStore.delete(key);
  }

  async resetAll() {
    this.memoryStore.clear();
  }
}

function createRedisRateLimiter(options) {
  const windowMs = options.windowMs || 60 * 1000;
  const max = options.max || 100;
  const prefix = options.prefix || 'ratelimit:';
  const store = new RedisFallbackStore(prefix, windowMs);

  return rateLimit({
    windowMs,
    max,
    message: options.message || { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    store,
    keyGenerator: options.keyGenerator,
    skip: options.skip || (() => process.env.SKIP_RATE_LIMIT === 'true'),
    validate: { trustProxy: false, keyGeneratorIpFallback: false },
  });
}

const publicApiLimiter = createRedisRateLimiter({
  windowMs: 1 * 60 * 1000,
  max: Number(process.env.PUBLIC_API_RATE_LIMIT || 100),
  prefix: 'ratelimit:public:',
  message: { error: 'Too many requests from this IP, please try again after 1 minute.' },
});

const authLimiter = createRedisRateLimiter({
  windowMs: 1 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 10),
  prefix: 'ratelimit:auth:',
  message: { error: 'Too many login or registration attempts, please try again after 1 minute.' },
});

const bookingLimiter = createRedisRateLimiter({
  windowMs: 1 * 60 * 1000,
  max: Number(process.env.BOOKING_RATE_LIMIT_MAX || 20),
  prefix: 'ratelimit:booking:',
  keyGenerator: (req) => {
    const userId = req.user && (req.user.uid || req.user.id || req.user.user_id);
    return userId ? `user:${userId}` : `ip:${req.ip}`;
  },
  message: { error: 'Too many ticket booking or seat holding requests, please try again after 1 minute.' },
});

const webhookLimiter = createRedisRateLimiter({
  windowMs: 1 * 60 * 1000,
  max: 500,
  prefix: 'ratelimit:webhook:',
  message: { error: 'Too many webhook callback requests, please try again later.' },
});

const resendVerificationLimiter = createRedisRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RESEND_VERIFICATION_RATE_LIMIT_MAX || 3),
  prefix: 'ratelimit:resend:',
  message: { error: 'Too many email verification resend requests, please try again after 15 minutes.' },
});

module.exports = {
  RedisFallbackStore,
  publicApiLimiter,
  authLimiter,
  bookingLimiter,
  webhookLimiter,
  resendVerificationLimiter,
};
