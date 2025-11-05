import { injectable } from 'inversify';
import { redisClient } from '../config/database';
import { ICacheService } from '../types/repository.types';
import logger from './logger.service';

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalOperations: number;
  memoryUsage: {
    l1: number; // Memory cache size
    l2: number; // Redis cache size (estimated)
  };
}

export interface CacheOptions {
  ttl?: number;
  skipL1?: boolean; // Skip memory cache
  skipL2?: boolean; // Skip Redis cache
  compress?: boolean; // Compress large values
}

@injectable()
export class CacheServiceImpl implements ICacheService {
  private defaultTTL = 3600; // 1 hour
  private memoryCache = new Map<string, { value: any; expires: number; size: number }>();
  private maxMemoryCacheSize = 100 * 1024 * 1024; // 100MB
  private currentMemoryUsage = 0;
  private stats = {
    hits: 0,
    misses: 0,
    l1Hits: 0,
    l2Hits: 0,
  };

  // Cleanup interval for memory cache
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired memory cache entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupMemoryCache();
    }, 5 * 60 * 1000);
  }

  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    try {
      // Try L1 cache (memory) first
      if (!options?.skipL1) {
        const memoryResult = this.getFromMemory<T>(key);
        if (memoryResult !== null) {
          this.stats.hits++;
          this.stats.l1Hits++;
          return memoryResult;
        }
      }

      // Try L2 cache (Redis)
      if (!options?.skipL2) {
        const redisValue = await redisClient.get(key);
        if (redisValue) {
          const parsed = this.deserialize<T>(redisValue, options?.compress);
          
          // Store in L1 cache for faster future access
          if (!options?.skipL1) {
            this.setInMemory(key, parsed, options?.ttl || this.defaultTTL);
          }
          
          this.stats.hits++;
          this.stats.l2Hits++;
          return parsed;
        }
      }

      this.stats.misses++;
      return null;
    } catch (error) {
      logger.error('Cache get error', { key, error });
      this.stats.misses++;
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number, options?: CacheOptions): Promise<void> {
    const expiration = ttl || this.defaultTTL;
    
    try {
      // Set in L1 cache (memory)
      if (!options?.skipL1) {
        this.setInMemory(key, value, expiration);
      }

      // Set in L2 cache (Redis)
      if (!options?.skipL2) {
        const serialized = this.serialize(value, options?.compress);
        await redisClient.setEx(key, expiration, serialized);
      }
    } catch (error) {
      logger.error('Cache set error', { key, error });
    }
  }

  async delete(key: string): Promise<void> {
    try {
      // Delete from L1 cache
      const memoryEntry = this.memoryCache.get(key);
      if (memoryEntry) {
        this.currentMemoryUsage -= memoryEntry.size;
        this.memoryCache.delete(key);
      }

      // Delete from L2 cache
      await redisClient.del(key);
    } catch (error) {
      logger.error('Cache delete error', { key, error });
    }
  }

  async invalidate(pattern: string): Promise<void> {
    try {
      // Invalidate L1 cache
      const keysToDelete: string[] = [];
      for (const [key] of this.memoryCache) {
        if (this.matchesPattern(key, pattern)) {
          keysToDelete.push(key);
        }
      }
      
      for (const key of keysToDelete) {
        const entry = this.memoryCache.get(key);
        if (entry) {
          this.currentMemoryUsage -= entry.size;
        }
        this.memoryCache.delete(key);
      }

      // Invalidate L2 cache
      const redisKeys = await redisClient.keys(pattern);
      if (redisKeys.length > 0) {
        await redisClient.del(redisKeys);
      }
    } catch (error) {
      logger.error('Cache invalidate error', { pattern, error });
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      // Check L1 cache first
      if (this.memoryCache.has(key)) {
        const entry = this.memoryCache.get(key)!;
        if (entry.expires > Date.now()) {
          return true;
        } else {
          // Clean up expired entry
          this.currentMemoryUsage -= entry.size;
          this.memoryCache.delete(key);
        }
      }

      // Check L2 cache
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error', { key, error });
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalOperations = this.stats.hits + this.stats.misses;
    const hitRate = totalOperations > 0 ? (this.stats.hits / totalOperations) * 100 : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      totalOperations,
      memoryUsage: {
        l1: this.currentMemoryUsage,
        l2: 0, // Would need Redis MEMORY USAGE command
      },
    };
  }

  /**
   * Clear all cache statistics
   */
  clearStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      l1Hits: 0,
      l2Hits: 0,
    };
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmUp(keys: Array<{ key: string; fetcher: () => Promise<any>; ttl?: number }>): Promise<void> {
    logger.info('Starting cache warm-up', { keyCount: keys.length });
    
    const promises = keys.map(async ({ key, fetcher, ttl }) => {
      try {
        const exists = await this.exists(key);
        if (!exists) {
          const value = await fetcher();
          await this.set(key, value, ttl);
        }
      } catch (error) {
        logger.warn('Cache warm-up failed for key', { key, error });
      }
    });

    await Promise.allSettled(promises);
    logger.info('Cache warm-up completed');
  }

  /**
   * Get cache entry with metadata
   */
  async getWithMetadata<T>(key: string): Promise<{
    value: T | null;
    hit: boolean;
    source: 'l1' | 'l2' | 'miss';
    ttl?: number;
  }> {
    // Check L1 cache
    const memoryResult = this.getFromMemory<T>(key);
    if (memoryResult !== null) {
      const entry = this.memoryCache.get(key)!;
      const ttl = Math.max(0, Math.floor((entry.expires - Date.now()) / 1000));
      return {
        value: memoryResult,
        hit: true,
        source: 'l1',
        ttl,
      };
    }

    // Check L2 cache
    try {
      const redisValue = await redisClient.get(key);
      if (redisValue) {
        const parsed = this.deserialize<T>(redisValue);
        const ttl = await redisClient.ttl(key);
        return {
          value: parsed,
          hit: true,
          source: 'l2',
          ttl: ttl > 0 ? ttl : undefined,
        };
      }
    } catch (error) {
      logger.error('Cache get with metadata error', { key, error });
    }

    return {
      value: null,
      hit: false,
      source: 'miss',
    };
  }

  /**
   * Cache-aside pattern helper
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number,
    options?: CacheOptions
  ): Promise<T> {
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    const value = await fetcher();
    await this.set(key, value, ttl, options);
    return value;
  }

  /**
   * Batch operations
   */
  async mget<T>(keys: string[]): Promise<Array<T | null>> {
    const results: Array<T | null> = [];
    
    for (const key of keys) {
      const value = await this.get<T>(key);
      results.push(value);
    }
    
    return results;
  }

  async mset<T>(entries: Array<{ key: string; value: T; ttl?: number }>): Promise<void> {
    const promises = entries.map(({ key, value, ttl }) => 
      this.set(key, value, ttl)
    );
    
    await Promise.allSettled(promises);
  }

  /**
   * Memory cache operations
   */
  private getFromMemory<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expires <= Date.now()) {
      // Entry expired, clean it up
      this.currentMemoryUsage -= entry.size;
      this.memoryCache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  private setInMemory<T>(key: string, value: T, ttl: number): void {
    const serialized = JSON.stringify(value);
    const size = Buffer.byteLength(serialized, 'utf8');
    const expires = Date.now() + (ttl * 1000);

    // Check if we need to make space
    while (this.currentMemoryUsage + size > this.maxMemoryCacheSize && this.memoryCache.size > 0) {
      this.evictLRU();
    }

    // Remove existing entry if it exists
    const existingEntry = this.memoryCache.get(key);
    if (existingEntry) {
      this.currentMemoryUsage -= existingEntry.size;
    }

    this.memoryCache.set(key, { value, expires, size });
    this.currentMemoryUsage += size;
  }

  private evictLRU(): void {
    // Simple LRU: remove the first (oldest) entry
    const firstKey = this.memoryCache.keys().next().value;
    if (firstKey) {
      const entry = this.memoryCache.get(firstKey)!;
      this.currentMemoryUsage -= entry.size;
      this.memoryCache.delete(firstKey);
    }
  }

  private cleanupMemoryCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.memoryCache) {
      if (entry.expires <= now) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      const entry = this.memoryCache.get(key)!;
      this.currentMemoryUsage -= entry.size;
      this.memoryCache.delete(key);
    }

    if (keysToDelete.length > 0) {
      logger.debug('Cleaned up expired memory cache entries', { count: keysToDelete.length });
    }
  }

  private serialize<T>(value: T, compress?: boolean): string {
    const serialized = JSON.stringify(value);
    
    if (compress && serialized.length > 1024) {
      // Could implement compression here (e.g., using zlib)
      // For now, just return the serialized value
      return serialized;
    }
    
    return serialized;
  }

  private deserialize<T>(value: string, compressed?: boolean): T {
    if (compressed) {
      // Could implement decompression here
      // For now, just parse the JSON
    }
    
    return JSON.parse(value) as T;
  }

  private matchesPattern(key: string, pattern: string): boolean {
    // Simple pattern matching (supports * wildcard)
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(key);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.memoryCache.clear();
    this.currentMemoryUsage = 0;
  }
}