/**
 * Cache configuration
 */

export interface CacheConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
    keyPrefix: string;
  };
  defaultTTL: number;
  maxMemoryItems: number;
}

export function getCacheConfig(): CacheConfig {
  // Parse REDIS_URL if provided (for production environments)
  if (process.env.REDIS_URL) {
    const url = new URL(process.env.REDIS_URL);
    
    return {
      redis: {
        host: url.hostname,
        port: parseInt(url.port) || 6379,
        password: url.password || undefined,
        db: parseInt(process.env.REDIS_DB || '0'),
        keyPrefix: process.env.REDIS_KEY_PREFIX || 'givemejobs:'
      },
      defaultTTL: parseInt(process.env.CACHE_DEFAULT_TTL || '3600'), // 1 hour
      maxMemoryItems: parseInt(process.env.CACHE_MAX_MEMORY_ITEMS || '1000')
    };
  }

  // Use individual environment variables
  return {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0'),
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'givemejobs:'
    },
    defaultTTL: parseInt(process.env.CACHE_DEFAULT_TTL || '3600'), // 1 hour
    maxMemoryItems: parseInt(process.env.CACHE_MAX_MEMORY_ITEMS || '1000')
  };
}

// Validate cache configuration
export function validateCacheConfig(config: CacheConfig): void {
  if (!config.redis.host) {
    throw new Error('Redis host is required');
  }

  if (config.redis.port < 1 || config.redis.port > 65535) {
    throw new Error('Redis port must be between 1 and 65535');
  }

  if (config.redis.db < 0 || config.redis.db > 15) {
    throw new Error('Redis database must be between 0 and 15');
  }

  if (config.defaultTTL < 1) {
    throw new Error('Default TTL must be >= 1 second');
  }

  if (config.maxMemoryItems < 100) {
    throw new Error('Max memory items must be >= 100');
  }
}