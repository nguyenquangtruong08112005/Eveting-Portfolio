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

const activeCache = new MemoryCache();

module.exports = {
  get: (key) => activeCache.get(key),
  set: (key, value, ttlSeconds) => activeCache.set(key, value, ttlSeconds),
  del: (key) => activeCache.del(key),
  MemoryCache
};
