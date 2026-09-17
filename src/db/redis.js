const { createClient } = require('redis');
const config = require('../config');

let redisClient = null;
const memoryCache = new Map();

class FallbackCache {
  constructor() {
    this.isReady = true;
  }

  async get(key) {
    const item = memoryCache.get(key);
    if (!item) return null;
    if (item.expiry && item.expiry < Date.now()) {
      memoryCache.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key, value, options = {}) {
    let expiry = null;
    if (options.EX) {
      expiry = Date.now() + options.EX * 1000;
    }
    memoryCache.set(key, { value: String(value), expiry });
    return 'OK';
  }

  async del(key) {
    return memoryCache.delete(key) ? 1 : 0;
  }

  async flushAll() {
    memoryCache.clear();
    return 'OK';
  }

  async ping() {
    return 'PONG';
  }

  async quit() {
    return 'OK';
  }
}

const fallbackCache = new FallbackCache();

async function initRedis() {
  if (process.env.NODE_ENV === 'test' || process.env.REDIS_MOCK === 'true') {
    return fallbackCache;
  }

  if (redisClient && redisClient.isReady) {
    return redisClient;
  }

  try {
    redisClient = createClient({
      url: config.redis.url,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            console.warn('Redis reconnection attempts exceeded. Falling back to memory cache.');
            return false;
          }
          return Math.min(retries * 100, 1000);
        }
      }
    });

    redisClient.on('error', (err) => {
      console.warn('Redis Client Warning:', err.message);
    });

    await redisClient.connect();
    return redisClient;
  } catch (err) {
    console.warn('Failed to connect to Redis. Using resilient in-memory cache:', err.message);
    return fallbackCache;
  }
}

function getCache() {
  if (redisClient && redisClient.isReady) {
    return redisClient;
  }
  return fallbackCache;
}

module.exports = {
  initRedis,
  getCache,
  fallbackCache
};
