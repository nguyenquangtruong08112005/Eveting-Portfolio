jest.mock('@/shared/cache/cache-provider', () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  delByPattern: jest.fn(),
}));

jest.mock('@/shared/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
}));

const cacheProvider = require('@/shared/cache/cache-provider');
const logger = require('@/shared/logger');
const helpers = require('@/shared/cache/namespace-helpers');

describe('namespace-helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('set / get', () => {
    it('stores and retrieves JSON objects', async () => {
      const data = { foo: 1, bar: [2, 3] };

      cacheProvider.get.mockResolvedValue(JSON.stringify(data));
      const result = await helpers.get('k');

      expect(result).toEqual(data);
    });

    it('returns raw string when cache value is not valid JSON', async () => {
      cacheProvider.get.mockResolvedValue('plain-string');
      const result = await helpers.get('k');

      expect(result).toBe('plain-string');
    });

    it('returns null when cacheProvider returns null/undefined', async () => {
      cacheProvider.get.mockResolvedValue(null);
      expect(await helpers.get('k')).toBeNull();

      cacheProvider.get.mockResolvedValue(undefined);
      expect(await helpers.get('k')).toBeNull();
    });

    it('returns null on cache access failure and logs warning', async () => {
      cacheProvider.get.mockRejectedValue(new Error('redis down'));
      const result = await helpers.get('fail-key');

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        '[CacheNamespace] get error for fail-key: redis down'
      );
    });

    it('compresses and decompresses large payloads (>8KiB) via gzip', async () => {
      const large = { data: 'x'.repeat(8200) };
      let capturedValue;

      cacheProvider.set.mockImplementation((key, value) => {
        capturedValue = value;
      });
      await helpers.set('big', large);

      expect(capturedValue).toMatch(/^gzip64:/);
      expect(cacheProvider.set).toHaveBeenCalledWith('big', capturedValue, undefined);

      cacheProvider.get.mockResolvedValue(capturedValue);
      const result = await helpers.get('big');

      expect(result).toEqual(large);
    });

    it('returns null when gzip data is malformed', async () => {
      cacheProvider.get.mockResolvedValue('gzip64:!!!not-valid-base64!!!');
      const result = await helpers.get('corrupt');

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('[CacheNamespace] get error for corrupt')
      );
    });

    it('aborts set when cacheProvider.set fails', async () => {
      cacheProvider.set.mockRejectedValue(new Error('write fail'));
      await helpers.set('k', { val: 1 });

      expect(logger.warn).toHaveBeenCalledWith(
        '[CacheNamespace] set error for k: write fail'
      );
    });
  });

  describe('del / delByPattern', () => {
    it('del removes a key', async () => {
      await helpers.del('some-key');
      expect(cacheProvider.del).toHaveBeenCalledWith('some-key');
    });

    it('delByPattern removes keys by pattern', async () => {
      await helpers.delByPattern('cache:*');
      expect(cacheProvider.delByPattern).toHaveBeenCalledWith('cache:*');
    });

    it('logs warning when del fails', async () => {
      cacheProvider.del.mockRejectedValue(new Error('del err'));
      await helpers.del('x');
      expect(logger.warn).toHaveBeenCalledWith(
        '[CacheNamespace] del error for x: del err'
      );
    });
  });

  describe('helper key / TTL wiring', () => {
    it('getEvent uses cache:event:{id}', async () => {
      cacheProvider.get.mockResolvedValue(JSON.stringify({ name: 'Test' }));
      const result = await helpers.getEvent('evt_1');

      expect(cacheProvider.get).toHaveBeenCalledWith('cache:event:evt_1');
      expect(result).toEqual({ name: 'Test' });
    });

    it('setEvent stores with cache:event:{id} and EVENT TTL', async () => {
      await helpers.setEvent('evt_1', { name: 'Test' });
      expect(cacheProvider.set).toHaveBeenCalledWith(
        'cache:event:evt_1',
        JSON.stringify({ name: 'Test' }),
        helpers.TTL.EVENT
      );
    });

    it('getCategories uses cache:categories', async () => {
      cacheProvider.get.mockResolvedValue(JSON.stringify(['cat1']));
      await helpers.getCategories();
      expect(cacheProvider.get).toHaveBeenCalledWith('cache:categories');
    });

    it('setCategories uses cache:categories and CATEGORIES TTL', async () => {
      await helpers.setCategories(['cat1']);
      expect(cacheProvider.set).toHaveBeenCalledWith(
        'cache:categories',
        JSON.stringify(['cat1']),
        helpers.TTL.CATEGORIES
      );
    });

    it('getVenue uses cache:venue:{id}', async () => {
      await helpers.getVenue('ven_1');
      expect(cacheProvider.get).toHaveBeenCalledWith('cache:venue:ven_1');
    });

    it('setVenue uses cache:venue:{id} and VENUES TTL', async () => {
      await helpers.setVenue('ven_1', { name: 'Hall' });
      expect(cacheProvider.set).toHaveBeenCalledWith(
        'cache:venue:ven_1',
        JSON.stringify({ name: 'Hall' }),
        helpers.TTL.VENUES
      );
    });

    it('getSeatAvailability uses cache:seat:{id}', async () => {
      await helpers.getSeatAvailability('evt_1');
      expect(cacheProvider.get).toHaveBeenCalledWith('cache:seat:evt_1');
    });

    it('setSeatAvailability uses cache:seat:{id} and SEAT TTL', async () => {
      await helpers.setSeatAvailability('evt_1', { seats: 10 });
      expect(cacheProvider.set).toHaveBeenCalledWith(
        'cache:seat:evt_1',
        JSON.stringify({ seats: 10 }),
        helpers.TTL.SEAT_AVAILABILITY
      );
    });
  });

  describe('invalidation dispatch', () => {
    it('invalidate dispatches event type to invalidateEvent', async () => {
      await helpers.invalidate('event', 'evt_1');
      expect(cacheProvider.del).toHaveBeenCalledWith('cache:event:evt_1');
    });

    it('invalidate dispatches venue type', async () => {
      await helpers.invalidate('venue', 'ven_1');
      expect(cacheProvider.del).toHaveBeenCalledWith('cache:venue:ven_1');
    });

    it('invalidate dispatches categories type', async () => {
      await helpers.invalidate('categories');
      expect(cacheProvider.del).toHaveBeenCalledWith('cache:categories');
    });

    it('invalidate dispatches seat_availability type', async () => {
      await helpers.invalidate('seat_availability', 'evt_1');
      expect(cacheProvider.del).toHaveBeenCalledWith('cache:seat:evt_1');
    });

    it('invalidate warns on unknown type', async () => {
      await helpers.invalidate('unknown_type');
      expect(logger.warn).toHaveBeenCalledWith(
        '[CacheNamespace] Unknown invalidation type: unknown_type'
      );
      expect(cacheProvider.del).not.toHaveBeenCalled();
    });

    it('invalidateEvent deletes key and logs', async () => {
      await helpers.invalidateEvent('evt_1');
      expect(cacheProvider.del).toHaveBeenCalledWith('cache:event:evt_1');
      expect(logger.info).toHaveBeenCalledWith(
        '[CacheNamespace] Invalidated event cache for evt_1'
      );
    });

    it('invalidateAllEvents calls delByPattern', async () => {
      await helpers.invalidateAllEvents();
      expect(cacheProvider.delByPattern).toHaveBeenCalledWith('cache:event:*');
    });

    it('invalidateAllVenues calls delByPattern and del', async () => {
      await helpers.invalidateAllVenues();
      expect(cacheProvider.delByPattern).toHaveBeenCalledWith('cache:venue:*');
      expect(cacheProvider.del).toHaveBeenCalledWith('cache:venues');
    });
  });


});
