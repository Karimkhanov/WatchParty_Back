const Redis = require('ioredis');
const logger = require('./logger');

// Redis client configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
};

// Create Redis client
const redis = new Redis(redisConfig);

// Redis event handlers
redis.on('connect', () => {
  logger.info('✅ Redis connected successfully');
});

redis.on('error', (err) => {
  logger.error('❌ Redis connection error:', err);
});

redis.on('ready', () => {
  logger.info('🚀 Redis is ready to accept commands');
});

redis.on('reconnecting', () => {
  logger.warn('⚠️ Redis reconnecting...');
});

// Cache helper functions
const cache = {
  /**
   * Get cached data
   * @param {string} key - Cache key
   * @returns {Promise<any>} Parsed cached data or null
   */
  async get(key) {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  },

  /**
   * Set cache data with TTL
   * @param {string} key - Cache key
   * @param {any} value - Data to cache
   * @param {number} ttl - Time to live in seconds (default: 5 minutes)
   */
  async set(key, value, ttl = 300) {
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
      logger.info(`✅ Cached: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
    }
  },

  /**
   * Delete cached data
   * @param {string} key - Cache key or pattern
   */
  async del(key) {
    try {
      // If key contains wildcard, delete multiple keys
      if (key.includes('*')) {
        const keys = await redis.keys(key);
        if (keys.length > 0) {
          await redis.del(...keys);
          logger.info(`🗑️ Deleted ${keys.length} cache keys matching: ${key}`);
        }
      } else {
        await redis.del(key);
        logger.info(`🗑️ Deleted cache: ${key}`);
      }
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
    }
  },

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>}
   */
  async exists(key) {
    try {
      return (await redis.exists(key)) === 1;
    } catch (error) {
      logger.error(`Cache exists check error for key ${key}:`, error);
      return false;
    }
  },

  /**
   * Increment counter
   * @param {string} key - Counter key
   * @returns {Promise<number>} New counter value
   */
  async incr(key) {
    try {
      return await redis.incr(key);
    } catch (error) {
      logger.error(`Cache incr error for key ${key}:`, error);
      return 0;
    }
  },

  /**
   * Set expiration time for existing key
   * @param {string} key - Cache key
   * @param {number} ttl - Time to live in seconds
   */
  async expire(key, ttl) {
    try {
      await redis.expire(key, ttl);
    } catch (error) {
      logger.error(`Cache expire error for key ${key}:`, error);
    }
  },

  /**
   * Get multiple keys at once
   * @param {string[]} keys - Array of cache keys
   * @returns {Promise<any[]>} Array of parsed values
   */
  async mget(keys) {
    try {
      const values = await redis.mget(keys);
      return values.map(v => v ? JSON.parse(v) : null);
    } catch (error) {
      logger.error('Cache mget error:', error);
      return keys.map(() => null);
    }
  },

  /**
   * Clear all cache
   */
  async flush() {
    try {
      await redis.flushdb();
      logger.warn('⚠️ All cache cleared');
    } catch (error) {
      logger.error('Cache flush error:', error);
    }
  }
};

module.exports = { redis, cache };
