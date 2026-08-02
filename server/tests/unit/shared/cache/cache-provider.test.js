jest.mock('@/shared/logger', () => ({ info: jest.fn(), warn: jest.fn() }));

const mockRedisClient = {
  isReady: false,
  connect: jest.fn().mockResolvedValue(),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  scan: jest.fn().mockResolvedValue({ cursor: '0', keys: [] }),
  quit: jest.fn().mockResolvedValue(),
  on: jest.fn((event, handler) => {
    mockRedisClient._eventHandlers[event] = handler;
  }),
  _eventHandlers: {},
};

const createClientConfigs = [];
jest.mock('redis', () => ({
  createClient: jest.fn(config => {
    createClientConfigs.push(config);
    return mockRedisClient;
  }),
}));

const logger = require('@/shared/logger');
const CacheProvider = require('@/shared/cache/cache-provider');

beforeEach(() => {
  jest.clearAllMocks();
  mockRedisClient.isReady = false;
  mockRedisClient.get.mockResolvedValue(null);
  mockRedisClient.set.mockResolvedValue('OK');
  mockRedisClient.del.mockResolvedValue(1);
  mockRedisClient.scan.mockResolvedValue({ cursor: '0', keys: [] });
  mockRedisClient.quit.mockResolvedValue();
});

// ---------------------------------------------------------------------------
// MemoryCache
// ---------------------------------------------------------------------------
describe('MemoryCache', () => {
  let cache;

  beforeEach(() => {
    cache = new CacheProvider.MemoryCache();
  });

  it('get returns null for missing key', async () => {
    expect(await cache.get('nope')).toBeNull();
  });

  it('set then get returns the value', async () => {
    await cache.set('k', 'v');
    expect(await cache.get('k')).toBe('v');
  });

  it('set with TTL expires the key', async () => {
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);
    await cache.set('k', 'v', 1);
    jest.spyOn(Date, 'now').mockReturnValue(now + 2000);
    expect(await cache.get('k')).toBeNull();
    jest.restoreAllMocks();
  });

  it('set without TTL persists indefinitely', async () => {
    await cache.set('k', 'v');
    expect(await cache.get('k')).toBe('v');
  });

  it('del removes an existing key', async () => {
    await cache.set('k', 'v');
    await cache.del('k');
    expect(await cache.get('k')).toBeNull();
  });

  it('del is idempotent on missing key', async () => {
    await cache.del('missing');
    expect(await cache.get('missing')).toBeNull();
  });

  it('delByPattern removes keys matching glob', async () => {
    await cache.set('user:1', 'a');
    await cache.set('user:2', 'b');
    await cache.set('admin:1', 'c');
    await cache.delByPattern('user:*');
    expect(await cache.get('user:1')).toBeNull();
    expect(await cache.get('user:2')).toBeNull();
    expect(await cache.get('admin:1')).toBe('c');
  });

  it('delByPattern with ? matches single char wildcard', async () => {
    await cache.set('ab', 'x');
    await cache.set('ac', 'y');
    await cache.set('abc', 'z');
    await cache.delByPattern('a?');
    expect(await cache.get('ab')).toBeNull();
    expect(await cache.get('ac')).toBeNull();
    expect(await cache.get('abc')).toBe('z');
  });

  it('delByPattern with no match does nothing', async () => {
    await cache.set('keep', 'v');
    await cache.delByPattern('no_match:*');
    expect(await cache.get('keep')).toBe('v');
  });

  it('get returns null for expired key and cleans up', async () => {
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);
    await cache.set('k', 'v', 1);
    jest.spyOn(Date, 'now').mockReturnValue(now + 2000);
    expect(await cache.get('k')).toBeNull();
    expect(await cache.get('k')).toBeNull();
    jest.restoreAllMocks();
  });
});

// ---------------------------------------------------------------------------
// CacheProvider – disabled mode (isRedisConnected = false)
// ---------------------------------------------------------------------------
describe('CacheProvider (disabled mode – MemoryCache fallback)', () => {
  it('get returns null for missing key', async () => {
    expect(await CacheProvider.get('missing')).toBeNull();
  });

  it('set and get roundtrip via MemoryCache', async () => {
    await CacheProvider.set('k', 'v');
    expect(await CacheProvider.get('k')).toBe('v');
  });

  it('set with TTL works via MemoryCache', async () => {
    await CacheProvider.set('k', 'v', 60);
    expect(await CacheProvider.get('k')).toBe('v');
  });

  it('del removes key from MemoryCache', async () => {
    await CacheProvider.set('k', 'v');
    await CacheProvider.del('k');
    expect(await CacheProvider.get('k')).toBeNull();
  });

  it('delByPattern removes matching keys from MemoryCache', async () => {
    await CacheProvider.set('x:a', '1');
    await CacheProvider.set('x:b', '2');
    await CacheProvider.set('y:c', '3');
    await CacheProvider.delByPattern('x:*');
    expect(await CacheProvider.get('x:a')).toBeNull();
    expect(await CacheProvider.get('x:b')).toBeNull();
    expect(await CacheProvider.get('y:c')).toBe('3');
  });

  it('isRedisAvailable returns false', () => {
    expect(CacheProvider.isRedisAvailable()).toBe(false);
  });

  it('getRedisClient returns null', () => {
    expect(CacheProvider.getRedisClient()).toBeNull();
  });

  it('never calls redis get/set/del/scan', async () => {
    await CacheProvider.get('k');
    await CacheProvider.set('k', 'v');
    await CacheProvider.del('k');
    await CacheProvider.delByPattern('*');
    expect(mockRedisClient.get).not.toHaveBeenCalled();
    expect(mockRedisClient.set).not.toHaveBeenCalled();
    expect(mockRedisClient.del).not.toHaveBeenCalled();
    expect(mockRedisClient.scan).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// CacheProvider – enabled mode (Redis connected)
// ---------------------------------------------------------------------------
describe('CacheProvider (enabled mode – Redis connected)', () => {
  beforeAll(() => {
    if (mockRedisClient._eventHandlers.ready) {
      mockRedisClient._eventHandlers.ready();
    }
  });

  it('isRedisAvailable returns true', () => {
    expect(CacheProvider.isRedisAvailable()).toBe(true);
  });

  it('getRedisClient returns the client', () => {
    expect(CacheProvider.getRedisClient()).toBe(mockRedisClient);
  });

  it('get returns a value from Redis', async () => {
    mockRedisClient.get.mockResolvedValue('redis-val');
    const result = await CacheProvider.get('rk');
    expect(result).toBe('redis-val');
    expect(mockRedisClient.get).toHaveBeenCalledWith('rk');
  });

  it('get returns null when Redis returns null', async () => {
    mockRedisClient.get.mockResolvedValue(null);
    expect(await CacheProvider.get('rk')).toBeNull();
  });

  it('set stores value in Redis without TTL', async () => {
    await CacheProvider.set('rk', 'plain');
    expect(mockRedisClient.set).toHaveBeenCalledWith('rk', 'plain');
  });

  it('set stores value in Redis with TTL', async () => {
    await CacheProvider.set('rk', 'ttl-val', 120);
    expect(mockRedisClient.set).toHaveBeenCalledWith('rk', 'ttl-val', { EX: 120 });
  });

  it('del calls redis.del', async () => {
    await CacheProvider.del('rk');
    expect(mockRedisClient.del).toHaveBeenCalledWith('rk');
  });

  it('delByPattern scans and deletes matching keys', async () => {
    mockRedisClient.scan.mockResolvedValue({ cursor: '0', keys: ['a', 'b'] });
    await CacheProvider.delByPattern('test:*');
    expect(mockRedisClient.scan).toHaveBeenCalledWith('0', { MATCH: 'test:*', COUNT: 100 });
    expect(mockRedisClient.del).toHaveBeenCalledWith(['a', 'b']);
    expect(logger.info).toHaveBeenCalledWith(
      '[Redis Cache Provider] Invalidated 2 keys matching test:*'
    );
  });

  it('delByPattern with no matches does not call del', async () => {
    mockRedisClient.scan.mockResolvedValue({ cursor: '0', keys: [] });
    await CacheProvider.delByPattern('empty:*');
    expect(mockRedisClient.del).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalledWith(
      expect.stringContaining('Invalidated')
    );
  });

  it('get fallback on Redis error', async () => {
    mockRedisClient.set.mockRejectedValue(new Error('SET_ERR'));
    mockRedisClient.get.mockRejectedValue(new Error('TIMEOUT'));
    await CacheProvider.set('fallback-key', 'mem');
    const result = await CacheProvider.get('fallback-key');
    expect(result).toBe('mem');
    expect(logger.warn).toHaveBeenCalledWith(
      '[Redis Cache Provider] get failed: TIMEOUT. Falling back to MemoryCache.'
    );
  });

  it('set fallback on Redis error', async () => {
    mockRedisClient.set.mockRejectedValue(new Error('SET_ERR'));
    mockRedisClient.get.mockRejectedValue(new Error('GET_ERR'));
    await CacheProvider.set('k', 'v');
    expect(await CacheProvider.get('k')).toBe('v');
    expect(logger.warn).toHaveBeenCalledWith(
      '[Redis Cache Provider] set failed: SET_ERR. Falling back to MemoryCache.'
    );
  });

  it('del fallback on Redis error', async () => {
    mockRedisClient.set.mockRejectedValue(new Error('SET_ERR'));
    mockRedisClient.del.mockRejectedValue(new Error('DEL_ERR'));
    mockRedisClient.get.mockRejectedValue(new Error('GET_ERR'));
    await CacheProvider.set('k', 'v');
    await CacheProvider.del('k');
    expect(await CacheProvider.get('k')).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(
      '[Redis Cache Provider] del failed: DEL_ERR. Falling back to MemoryCache.'
    );
  });

  it('delByPattern fallback on Redis scan error', async () => {
    mockRedisClient.scan.mockRejectedValue(new Error('SCAN_ERR'));
    await CacheProvider.delByPattern('x:*');
    expect(logger.warn).toHaveBeenCalledWith(
      '[Redis Cache Provider] delByPattern failed: SCAN_ERR. Falling back to MemoryCache.'
    );
  });

  it('delByPattern fallback clears MemoryCache via fallback', async () => {
    mockRedisClient.scan.mockRejectedValue(new Error('SCAN_ERR'));
    await CacheProvider.set('x:a', '1');
    await CacheProvider.set('x:b', '2');
    await CacheProvider.delByPattern('x:*');
    expect(await CacheProvider.get('x:a')).toBeNull();
    expect(await CacheProvider.get('x:b')).toBeNull();
  });

  it('preserves raw string payload through get/set roundtrip (JSON passthrough)', async () => {
    const raw = '{"nested": {"a":1},"arr":[1,2,3]}';
    let stored;
    mockRedisClient.set.mockImplementation((key, val) => {
      stored = val;
      return Promise.resolve('OK');
    });
    mockRedisClient.get.mockImplementation(() => Promise.resolve(stored));
    await CacheProvider.set('json', raw);
    const result = await CacheProvider.get('json');
    expect(result).toBe(raw);
  });

  it('preserves gzip64: prefix payload through roundtrip', async () => {
    const gzipPayload = 'gzip64:H4sIAAAAAAAA...';
    mockRedisClient.get.mockResolvedValue(gzipPayload);
    const result = await CacheProvider.get('compressed');
    expect(result).toBe(gzipPayload);
  });

  it('large string passthrough (compression boundary – provider is transparent)', async () => {
    const big = 'x'.repeat(9000);
    mockRedisClient.get.mockResolvedValue(big);
    const result = await CacheProvider.get('big');
    expect(result).toBe(big);
    expect(result.length).toBe(9000);
  });

  it('set with falsy ttlSeconds (0) stores without EX', async () => {
    await CacheProvider.set('k', 'v', 0);
    expect(mockRedisClient.set).toHaveBeenCalledWith('k', 'v');
  });

  it('set with undefined ttlSeconds stores without EX', async () => {
    await CacheProvider.set('k', 'v', undefined);
    expect(mockRedisClient.set).toHaveBeenCalledWith('k', 'v');
  });
});

// ---------------------------------------------------------------------------
// Init lifecycle – client event handlers
// (runs after enabled mode so redisClient is still set)
// ---------------------------------------------------------------------------
describe('CacheProvider (init lifecycle – event handlers)', () => {
  it('connect event logs and sets isRedisConnected true', () => {
    jest.clearAllMocks();
    mockRedisClient._eventHandlers.connect();
    expect(CacheProvider.isRedisAvailable()).toBe(true);
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('[Redis Cache Provider] Connected to Redis')
    );
  });

  it('error event logs and sets isRedisConnected false', () => {
    jest.clearAllMocks();
    mockRedisClient._eventHandlers.error(new Error('CONN_LOST'));
    expect(CacheProvider.isRedisAvailable()).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith(
      '[Redis Cache Provider] Client Error: CONN_LOST'
    );
  });

  it('ready event sets isRedisConnected true', () => {
    jest.clearAllMocks();
    mockRedisClient._eventHandlers.ready();
    expect(CacheProvider.isRedisAvailable()).toBe(true);
  });

  it('end event sets isRedisConnected false', () => {
    jest.clearAllMocks();
    mockRedisClient._eventHandlers.end();
    expect(CacheProvider.isRedisAvailable()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// CacheProvider – disconnect
// (a single describe block because disconnect nullifies redisClient)
// ---------------------------------------------------------------------------
describe('CacheProvider (disconnect)', () => {
  beforeAll(() => {
    // Re-enable before disconnect test
    if (mockRedisClient._eventHandlers.ready) {
      mockRedisClient._eventHandlers.ready();
    }
  });

  it('calls quit on the redis client', async () => {
    jest.clearAllMocks();
    await CacheProvider.disconnect();
    expect(mockRedisClient.quit).toHaveBeenCalled();
  });

  it('isRedisAvailable returns false after disconnect', () => {
    expect(CacheProvider.isRedisAvailable()).toBe(false);
  });

  it('getRedisClient returns null after disconnect', () => {
    expect(CacheProvider.getRedisClient()).toBeNull();
  });

  it('falls back to MemoryCache after disconnect', async () => {
    expect(await CacheProvider.get('post-disc')).toBeNull();
    await CacheProvider.set('post-disc', 'mem');
    expect(await CacheProvider.get('post-disc')).toBe('mem');
  });

  it('del works via MemoryCache after disconnect', async () => {
    await CacheProvider.set('pd', 'v');
    await CacheProvider.del('pd');
    expect(await CacheProvider.get('pd')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// CacheProvider – disconnect with quit error (isolated module)
// ---------------------------------------------------------------------------
describe('CacheProvider (disconnect with quit error)', () => {
  it('logs warning when quit fails', () => new Promise(done => {
    jest.isolateModules(() => {
      // Re-use mocks already set up
      const redis = require('redis');
      redis.createClient.mockReturnValue(mockRedisClient);

      const cp = require('@/shared/cache/cache-provider');
      const localLogger = require('@/shared/logger');

      // clear call history, set quit to reject, enable redis, then disconnect
      jest.clearAllMocks();
      if (mockRedisClient._eventHandlers.ready) {
        mockRedisClient._eventHandlers.ready();
      }
      mockRedisClient.quit.mockRejectedValue(new Error('QUIT_FAIL'));

      cp.disconnect().then(() => {
        try {
          expect(localLogger.warn).toHaveBeenCalledWith(
            '[Redis Cache Provider] quit error: QUIT_FAIL'
          );
          done();
        } catch (e) {
          done(e);
        }
      });
    });
  }));
});

// ---------------------------------------------------------------------------
// Init lifecycle – reconnect strategy (no module state dependency)
// ---------------------------------------------------------------------------
describe('CacheProvider (init lifecycle – reconnect strategy)', () => {
  it('returns backoff delay for retries 1–3', () => {
    const strategy = createClientConfigs[0].socket.reconnectStrategy;
    expect(strategy(1)).toBe(500);
    expect(strategy(2)).toBe(1000);
    expect(strategy(3)).toBe(1500);
  });

  it('returns false for retries > 3 and warns', () => {
    jest.clearAllMocks();
    const strategy = createClientConfigs[0].socket.reconnectStrategy;
    expect(strategy(4)).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith(
      'Redis connection retry limit reached. Falling back to MemoryCache.'
    );
  });
});

// ---------------------------------------------------------------------------
// Init lifecycle – initRedis failure (isolated module)
// ---------------------------------------------------------------------------
describe('CacheProvider (initRedis failure)', () => {
  it('logs warning and falls back to MemoryCache', () => new Promise(done => {
    jest.isolateModules(() => {
      const redis = require('redis');
      redis.createClient.mockReturnValue({
        isReady: false,
        connect: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')),
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
        scan: jest.fn(),
        quit: jest.fn(),
        on: jest.fn(),
        _eventHandlers: {},
      });

      const localLogger = require('@/shared/logger');
      const cp = require('@/shared/cache/cache-provider');

      setImmediate(() => {
        try {
          expect(localLogger.warn).toHaveBeenCalledWith(
            '[Redis Cache Provider] Initialization failed: ECONNREFUSED. Using MemoryCache fallback.'
          );
          expect(cp.isRedisAvailable()).toBe(false);
          cp.get('k').then(result => {
            expect(result).toBeNull();
            done();
          });
        } catch (e) {
          done(e);
        }
      });
    });
  }));
});
