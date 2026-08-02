jest.mock('express-rate-limit', () => jest.fn((opts) => {
  const mw = jest.fn((req, res, next) => next());
  mw.__options = opts;
  return mw;
}));

jest.mock('@/shared/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));

jest.mock('@/shared/cache/cache-provider', () => ({ getRedisClient: jest.fn() }));

jest.resetModules();

const logger = require('@/shared/logger');
const rateLimit = require('express-rate-limit');
const cacheProvider = require('@/shared/cache/cache-provider');

const {
  RedisFallbackStore,
  publicApiLimiter,
  authLimiter,
  bookingLimiter,
  webhookLimiter,
  resendVerificationLimiter
} = require('@/shared/middleware/rateLimit.middleware');

describe('RedisFallbackStore', () => {
  let store, mockRedisClient;

  beforeEach(() => {
    mockRedisClient = { sendCommand: jest.fn() };
    cacheProvider.getRedisClient.mockReset();
    cacheProvider.getRedisClient.mockReturnValue(mockRedisClient);
    logger.info.mockClear();
    logger.warn.mockClear();
    logger.error.mockClear();
    store = new RedisFallbackStore('test:', 60000);
  });

  describe('constructor', () => {
    it('sets prefix, windowMs, and initializes empty memoryStore', () => {
      expect(store.prefix).toBe('test:');
      expect(store.windowMs).toBe(60000);
      expect(store.memoryStore).toBeInstanceOf(Map);
      expect(store.memoryStore.size).toBe(0);
    });
  });

  describe('init', () => {
    it('updates windowMs from options', () => {
      store.init({ windowMs: 30000 });
      expect(store.windowMs).toBe(30000);
    });

    it('does not change windowMs when options missing', () => {
      store.init({});
      expect(store.windowMs).toBe(60000);
    });

    it('does not change windowMs when options is null', () => {
      store.init(null);
      expect(store.windowMs).toBe(60000);
    });
  });

  describe('increment with Redis available', () => {
    it('returns totalHits and resetTime on success', async () => {
      mockRedisClient.sendCommand
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(60000)
        .mockResolvedValueOnce('OK');

      const result = await store.increment('key1');
      expect(result.totalHits).toBe(1);
      expect(result.resetTime).toBeInstanceOf(Date);
      expect(mockRedisClient.sendCommand).toHaveBeenNthCalledWith(1, ['INCR', 'test:key1']);
      expect(mockRedisClient.sendCommand).toHaveBeenNthCalledWith(2, ['PTTL', 'test:key1']);
      expect(mockRedisClient.sendCommand).toHaveBeenNthCalledWith(3, ['PEXPIRE', 'test:key1', '60000']);
    });

    it('sets PEXPIRE when totalHits is 1', async () => {
      mockRedisClient.sendCommand
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(-1)
        .mockResolvedValueOnce('OK');

      await store.increment('key1');
      expect(mockRedisClient.sendCommand).toHaveBeenCalledWith(['PEXPIRE', 'test:key1', '60000']);
    });

    it('sets PEXPIRE when PTTL <= 0', async () => {
      mockRedisClient.sendCommand
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce('OK');

      await store.increment('key1');
      expect(mockRedisClient.sendCommand).toHaveBeenCalledWith(['PEXPIRE', 'test:key1', '60000']);
    });

    it('skips PEXPIRE when totalHits > 1 and PTTL > 0', async () => {
      mockRedisClient.sendCommand
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(45000);

      const result = await store.increment('key1');
      expect(result.totalHits).toBe(3);
      expect(mockRedisClient.sendCommand).not.toHaveBeenCalledWith(['PEXPIRE', expect.any(String), expect.any(String)]);
    });
  });

  describe('increment fallback to memory', () => {
    it('falls back to memory when getRedisClient returns null', async () => {
      cacheProvider.getRedisClient.mockReturnValue(null);
      const result = await store.increment('memkey');
      expect(result.totalHits).toBe(1);
      expect(result.resetTime).toBeInstanceOf(Date);
    });

    it('falls back to memory when Redis throws', async () => {
      mockRedisClient.sendCommand.mockRejectedValue(new Error('ECONNREFUSED'));
      const result = await store.increment('memkey');
      expect(result.totalHits).toBe(1);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Redis operation error'));
    });
  });

  describe('incrementMemory', () => {
    it('creates a new record when key does not exist', () => {
      const result = store.incrementMemory('newkey');
      expect(result.totalHits).toBe(1);
      expect(result.resetTime).toBeInstanceOf(Date);
    });

    it('increments existing record', () => {
      store.incrementMemory('existing');
      const result = store.incrementMemory('existing');
      expect(result.totalHits).toBe(2);
    });

    it('creates new record when existing has expired', () => {
      const past = Date.now() - 100000;
      store.memoryStore.set('expired', { totalHits: 99, resetTime: past });
      const result = store.incrementMemory('expired');
      expect(result.totalHits).toBe(1);
    });
  });

  describe('decrement', () => {
    it('calls DECR on Redis when client is available', async () => {
      mockRedisClient.sendCommand.mockResolvedValue(0);
      await store.decrement('key1');
      expect(mockRedisClient.sendCommand).toHaveBeenCalledWith(['DECR', 'test:key1']);
    });

    it('ignores Redis error', async () => {
      mockRedisClient.sendCommand.mockRejectedValue(new Error('fail'));
      await expect(store.decrement('key1')).resolves.toBeUndefined();
    });

    it('decrements memory store record', async () => {
      cacheProvider.getRedisClient.mockReturnValue(null);
      store.memoryStore.set('memkey', { totalHits: 5, resetTime: Date.now() + 60000 });
      await store.decrement('memkey');
      expect(store.memoryStore.get('memkey').totalHits).toBe(4);
    });

    it('does not decrement below 0', async () => {
      cacheProvider.getRedisClient.mockReturnValue(null);
      store.memoryStore.set('memkey', { totalHits: 0, resetTime: Date.now() + 60000 });
      await store.decrement('memkey');
      expect(store.memoryStore.get('memkey').totalHits).toBe(0);
    });
  });

  describe('resetKey', () => {
    it('calls DEL on Redis when client is available', async () => {
      mockRedisClient.sendCommand.mockResolvedValue(1);
      await store.resetKey('key1');
      expect(mockRedisClient.sendCommand).toHaveBeenCalledWith(['DEL', 'test:key1']);
    });

    it('ignores Redis error', async () => {
      mockRedisClient.sendCommand.mockRejectedValue(new Error('fail'));
      await expect(store.resetKey('key1')).resolves.toBeUndefined();
    });

    it('removes key from memory store', async () => {
      cacheProvider.getRedisClient.mockReturnValue(null);
      store.memoryStore.set('memkey', { totalHits: 1, resetTime: Date.now() + 60000 });
      await store.resetKey('memkey');
      expect(store.memoryStore.has('memkey')).toBe(false);
    });
  });

  describe('resetAll', () => {
    it('clears the memory store', async () => {
      store.memoryStore.set('a', { totalHits: 1 });
      store.memoryStore.set('b', { totalHits: 2 });
      await store.resetAll();
      expect(store.memoryStore.size).toBe(0);
    });
  });
});

describe('rate limiters', () => {
  function findCall(prefix) {
    const call = rateLimit.mock.calls.find(([opts]) => opts.store.prefix === prefix);
    return call ? call[0] : undefined;
  }

  it('publicApiLimiter is created with correct options', () => {
    expect(rateLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        windowMs: 60000,
        max: 100,
        standardHeaders: true,
        legacyHeaders: false
      })
    );
    const opts = findCall('ratelimit:public:');
    expect(opts).toBeDefined();
    expect(opts.store.prefix).toBe('ratelimit:public:');
  });

  it('authLimiter is created with correct options', () => {
    expect(rateLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        windowMs: 60000,
        max: 10,
        message: { error: expect.stringContaining('login or registration') }
      })
    );
    const opts = findCall('ratelimit:auth:');
    expect(opts).toBeDefined();
    expect(opts.store.windowMs).toBe(60000);
  });

  it('bookingLimiter is created with correct options and keyGenerator', () => {
    const opts = findCall('ratelimit:booking:');
    expect(opts).toBeDefined();
    expect(opts.windowMs).toBe(60000);
    expect(opts.max).toBe(20);
    const kg = opts.keyGenerator;
    expect(kg({ user: { uid: 'u1' }, ip: '1.2.3.4' })).toBe('user:u1');
    expect(kg({ user: null, ip: '1.2.3.4' })).toBe('ip:1.2.3.4');
  });

  it('webhookLimiter is created with correct options', () => {
    expect(rateLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        windowMs: 60000,
        max: 500,
        message: { error: expect.stringContaining('webhook') }
      })
    );
    const opts = findCall('ratelimit:webhook:');
    expect(opts).toBeDefined();
  });

  it('resendVerificationLimiter is created with correct options', () => {
    expect(rateLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        windowMs: 900000,
        max: 3,
        message: { error: expect.stringContaining('verification resend') }
      })
    );
    const opts = findCall('ratelimit:resend:');
    expect(opts).toBeDefined();
  });

  it('all limiters use RedisFallbackStore', () => {
    const rateLimitCalls = rateLimit.mock.calls;
    for (const [opts] of rateLimitCalls) {
      expect(opts.store).toBeInstanceOf(RedisFallbackStore);
    }
  });
});
