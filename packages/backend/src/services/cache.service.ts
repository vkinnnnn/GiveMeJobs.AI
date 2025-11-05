/**
 * Enhanced Cache service implementation with Redis Cluster and advanced multi-layer caching
 */

import { injectable, inject } from 'inversify';
import { ICacheService } from '../types/repository.types';
import { Logger } from 'winston';
import { TYPES } from '../types/container.types';
import { createClient, RedisClientType, createCluster, RedisClusterType } from 'redis';
import { EventEmitter } from 'events';

interface CacheConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
    keyPrefix: string;
  };
  cluster?: {
    nodes: Array<{ host: string; port: number }>;
    password?: string;
    enableReadyCheck: boolean;
    maxRetriesPerRequest: number;
  };
  defaultTTL: number;
  maxMemoryItems: number;
  compressionEnabled: boolean;
  compressionThreshold: number;
  circuitBreaker: {
    enabled: boolean;
    failureThreshold: number;
    recoveryTimeout: number;
  };
  metrics: {
    enabled: boolean;
    collectionInterval: number;
  };
}

interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  memoryUsageBytes: number;
  redisUsageBytes: number;
  averageResponseTimeMs: number;
  hitRate: number;
  operationTimes: number[];
}

enum CacheLevel {
  MEMORY = 'memory',
  REDIS = 'redis',
  CLUSTER = 'cluster'
}

enum CacheStrategy {
  CACHE_ASIDE = 'cache_aside',
  WRITE_THROUGH = 'write_through',
  WRITE_BEHIND = 'write_behind',
  REFRESH_AHEAD = 'refresh_ahead'
}

class CircuitBreaker extends EventEmitter {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private failureThreshold: number = 5,
    private recoveryTimeout: number = 60000
  ) {
    super();
  }

  canExecute(): boolean {
    if (this.state === 'CLOSED') {
      return true;
    } else if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
        return true;
      }
      return false;
    } else { // HALF_OPEN
      return true;
    }
  }

  recordSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
    this.emit('success');
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.emit('open');
    }
  }

  getState(): string {
    return this.state;
  }
}

@injectable()
export class CacheService implements ICacheService {
  private redis: RedisClientType;
  private redisCluster: RedisClusterType | null = null;
  private memoryCache: Map<string, { value: any; expires: number; size: number; accessCount: number; lastAccessed: number }>;
  private readonly defaultTTL: number;
  private readonly maxMemoryItems: number;
  private redisConnected: boolean = false;
  private clusterConnected: boolean = false;
  private circuitBreaker: CircuitBreaker | null = null;
  private metrics: CacheMetrics;
  private compressionEnabled: boolean;
  private compressionThreshold: number;

  constructor(
    @inject(TYPES.Logger) private logger: Logger,
    @inject(TYPES.Config) private config: CacheConfig
  ) {
    this.defaultTTL = config.defaultTTL || 3600; // 1 hour default
    this.maxMemoryItems = config.maxMemoryItems || 1000;
    this.compressionEnabled = config.compressionEnabled || true;
    this.compressionThreshold = config.compressionThreshold || 1024;
    this.memoryCache = new Map();
    
    // Initialize metrics
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      memoryUsageBytes: 0,
      redisUsageBytes: 0,
      averageResponseTimeMs: 0,
      hitRate: 0,
      operationTimes: []
    };

    // Initialize circuit breaker
    if (config.circuitBreaker?.enabled) {
      this.circuitBreaker = new CircuitBreaker(
        config.circuitBreaker.failureThreshold,
        config.circuitBreaker.recoveryTimeout
      );
      this.setupCircuitBreakerListeners();
    }
    
    this.initializeRedis();
    this.initializeCluster();
    this.setupCleanupInterval();
    this.setupMetricsCollection();
  }

  private initializeRedis(): void {
    try {
      const redisUrl = `redis://${this.config.redis.password ? `:${this.config.redis.password}@` : ''}${this.config.redis.host}:${this.config.redis.port}/${this.config.redis.db}`;
      
      this.redis = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => Math.min(retries * 50, 500)
        }
      });

      this.redis.on('connect', () => {
        this.redisConnected = true;
        this.logger.info('Redis connected successfully');
      });

      this.redis.on('error', (error) => {
        this.redisConnected = false;
        this.logger.error('Redis connection error', { error: error.message });
        if (this.circuitBreaker) {
          this.circuitBreaker.recordFailure();
        }
      });

      this.redis.on('reconnecting', () => {
        this.logger.info('Redis reconnecting...');
      });

      // Connect to Redis (but don't wait for it)
      this.redis.connect().catch((error) => {
        this.logger.warn('Redis connection failed, using memory cache only', { error: error.message });
      });

    } catch (error) {
      this.logger.error('Failed to initialize Redis', { error: error.message });
    }
  }

  private initializeCluster(): void {
    if (!this.config.cluster) {
      return;
    }

    try {
      this.redisCluster = createCluster({
        rootNodes: this.config.cluster.nodes.map(node => ({
          url: `redis://${this.config.cluster!.password ? `:${this.config.cluster!.password}@` : ''}${node.host}:${node.port}`
        })),
        defaults: {
          socket: {
            reconnectStrategy: (retries) => Math.min(retries * 50, 500)
          }
        }
      });

      this.redisCluster.on('connect', () => {
        this.clusterConnected = true;
        this.logger.info('Redis cluster connected successfully');
      });

      this.redisCluster.on('error', (error) => {
        this.clusterConnected = false;
        this.logger.error('Redis cluster connection error', { error: error.message });
        if (this.circuitBreaker) {
          this.circuitBreaker.recordFailure();
        }
      });

      // Connect to cluster
      this.redisCluster.connect().catch((error) => {
        this.logger.warn('Redis cluster connection failed', { error: error.message });
      });

    } catch (error) {
      this.logger.error('Failed to initialize Redis cluster', { error: error.message });
    }
  }

  private setupCircuitBreakerListeners(): void {
    if (!this.circuitBreaker) return;

    this.circuitBreaker.on('open', () => {
      this.logger.warn('Circuit breaker opened - Redis operations disabled');
    });

    this.circuitBreaker.on('success', () => {
      this.logger.info('Circuit breaker closed - Redis operations restored');
    });
  }

  private setupMetricsCollection(): void {
    if (!this.config.metrics?.enabled) return;

    const interval = this.config.metrics.collectionInterval || 60000; // 1 minute default
    
    setInterval(() => {
      this.collectMetrics();
    }, interval);
  }

  private collectMetrics(): void {
    // Calculate hit rate
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = total > 0 ? (this.metrics.hits / total) * 100 : 0;

    // Calculate average response time
    if (this.metrics.operationTimes.length > 0) {
      this.metrics.averageResponseTimeMs = 
        this.metrics.operationTimes.reduce((a, b) => a + b, 0) / this.metrics.operationTimes.length;
      
      // Keep only last 1000 operation times
      if (this.metrics.operationTimes.length > 1000) {
        this.metrics.operationTimes = this.metrics.operationTimes.slice(-1000);
      }
    }

    // Calculate memory usage
    this.metrics.memoryUsageBytes = Array.from(this.memoryCache.values())
      .reduce((total, item) => total + item.size, 0);

    this.logger.info('Cache metrics collected', {
      hitRate: this.metrics.hitRate.toFixed(2) + '%',
      memoryItems: this.memoryCache.size,
      memoryUsageMB: (this.metrics.memoryUsageBytes / 1024 / 1024).toFixed(2),
      avgResponseTime: this.metrics.averageResponseTimeMs.toFixed(2) + 'ms'
    });
  }

  private setupCleanupInterval(): void {
    // Clean up expired memory cache entries every 5 minutes
    setInterval(() => {
      this.cleanupMemoryCache();
    }, 5 * 60 * 1000);
  }

  private cleanupMemoryCache(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, item] of this.memoryCache.entries()) {
      if (item.expires < now) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug('Memory cache cleanup completed', { 
        itemsCleaned: cleaned, 
        remainingItems: this.memoryCache.size 
      });
    }
  }

  private enforceMemoryLimit(): void {
    if (this.memoryCache.size >= this.maxMemoryItems) {
      // Implement LRU eviction based on access patterns
      const entries = Array.from(this.memoryCache.entries());
      
      // Sort by last accessed time (oldest first)
      entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
      
      // Remove oldest 10% of items
      const itemsToRemove = Math.max(1, Math.floor(entries.length * 0.1));
      
      for (let i = 0; i < itemsToRemove; i++) {
        const [key, item] = entries[i];
        this.memoryCache.delete(key);
        this.metrics.memoryUsageBytes -= item.size;
        this.metrics.evictions++;
      }
      
      this.logger.debug('Memory cache LRU eviction', { 
        removedItems: itemsToRemove,
        currentSize: this.memoryCache.size,
        memoryUsageMB: (this.metrics.memoryUsageBytes / 1024 / 1024).toFixed(2)
      });
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();
    
    try {
      // Try memory cache first (fastest)
      const memoryItem = this.memoryCache.get(key);
      if (memoryItem && memoryItem.expires > Date.now()) {
        memoryItem.accessCount++;
        memoryItem.lastAccessed = Date.now();
        this.metrics.hits++;
        
        this.logger.debug('Cache hit (Memory)', { key, level: CacheLevel.MEMORY });
        return memoryItem.value;
      }

      // Remove expired memory cache item
      if (memoryItem) {
        this.metrics.memoryUsageBytes -= memoryItem.size;
        this.memoryCache.delete(key);
      }

      // Try Redis cluster if available and circuit breaker allows
      if (this.clusterConnected && this.redisCluster && this.canUseRedis()) {
        try {
          const clusterValue = await this.redisCluster.get(key);
          if (clusterValue) {
            const parsed = this.deserialize(clusterValue);
            
            // Cache in memory for faster subsequent access
            this.setMemoryCache(key, parsed, this.defaultTTL);
            
            this.metrics.hits++;
            if (this.circuitBreaker) {
              this.circuitBreaker.recordSuccess();
            }
            
            this.logger.debug('Cache hit (Cluster)', { key, level: CacheLevel.CLUSTER });
            return parsed;
          }
        } catch (error) {
          this.logger.warn('Redis cluster get failed', { key, error: error.message });
          if (this.circuitBreaker) {
            this.circuitBreaker.recordFailure();
          }
        }
      }

      // Try single Redis instance
      if (this.redisConnected && this.redis.isReady && this.canUseRedis()) {
        try {
          const redisValue = await this.redis.get(key);
          if (redisValue) {
            const parsed = this.deserialize(redisValue);
            
            // Cache in memory for faster subsequent access
            this.setMemoryCache(key, parsed, this.defaultTTL);
            
            this.metrics.hits++;
            if (this.circuitBreaker) {
              this.circuitBreaker.recordSuccess();
            }
            
            this.logger.debug('Cache hit (Redis)', { key, level: CacheLevel.REDIS });
            return parsed;
          }
        } catch (error) {
          this.logger.warn('Redis get failed', { key, error: error.message });
          if (this.circuitBreaker) {
            this.circuitBreaker.recordFailure();
          }
        }
      }

      // Cache miss
      this.metrics.misses++;
      this.logger.debug('Cache miss', { key });
      return null;

    } catch (error) {
      this.logger.error('Cache get error', { key, error: error.message });
      this.metrics.misses++;
      return null;
    } finally {
      // Track operation time
      const operationTime = Date.now() - startTime;
      this.metrics.operationTimes.push(operationTime);
    }
  }

  async set<T>(key: string, value: T, ttl?: number, strategy: CacheStrategy = CacheStrategy.CACHE_ASIDE): Promise<void> {
    const startTime = Date.now();
    const actualTTL = ttl || this.defaultTTL;
    
    try {
      let success = false;

      switch (strategy) {
        case CacheStrategy.CACHE_ASIDE:
          success = await this.setCacheAside(key, value, actualTTL);
          break;
        case CacheStrategy.WRITE_THROUGH:
          success = await this.setWriteThrough(key, value, actualTTL);
          break;
        case CacheStrategy.WRITE_BEHIND:
          success = await this.setWriteBehind(key, value, actualTTL);
          break;
        case CacheStrategy.REFRESH_AHEAD:
          success = await this.setRefreshAhead(key, value, actualTTL);
          break;
        default:
          success = await this.setCacheAside(key, value, actualTTL);
      }

      if (success) {
        this.metrics.sets++;
      }

    } catch (error) {
      this.logger.error('Cache set error', { key, strategy, error: error.message });
      
      // Fallback to memory cache only
      this.setMemoryCache(key, value, actualTTL);
    } finally {
      // Track operation time
      const operationTime = Date.now() - startTime;
      this.metrics.operationTimes.push(operationTime);
    }
  }

  private async setCacheAside<T>(key: string, value: T, ttl: number): Promise<boolean> {
    let success = true;
    
    // Set in memory cache first (fastest)
    this.setMemoryCache(key, value, ttl);

    // Set in Redis cluster if available
    if (this.clusterConnected && this.redisCluster && this.canUseRedis()) {
      try {
        const serialized = this.serialize(value);
        await this.redisCluster.setEx(key, ttl, serialized);
        
        if (this.circuitBreaker) {
          this.circuitBreaker.recordSuccess();
        }
      } catch (error) {
        this.logger.warn('Redis cluster set failed', { key, error: error.message });
        if (this.circuitBreaker) {
          this.circuitBreaker.recordFailure();
        }
        success = false;
      }
    }

    // Set in single Redis instance as fallback
    if (this.redisConnected && this.redis.isReady && this.canUseRedis()) {
      try {
        const serialized = this.serialize(value);
        await this.redis.setEx(key, ttl, serialized);
        
        if (this.circuitBreaker) {
          this.circuitBreaker.recordSuccess();
        }
      } catch (error) {
        this.logger.warn('Redis set failed', { key, error: error.message });
        if (this.circuitBreaker) {
          this.circuitBreaker.recordFailure();
        }
        success = false;
      }
    }

    return success;
  }

  private async setWriteThrough<T>(key: string, value: T, ttl: number): Promise<boolean> {
    // Write to Redis first, then memory
    let redisSuccess = false;

    if (this.clusterConnected && this.redisCluster && this.canUseRedis()) {
      try {
        const serialized = this.serialize(value);
        await this.redisCluster.setEx(key, ttl, serialized);
        redisSuccess = true;
        
        if (this.circuitBreaker) {
          this.circuitBreaker.recordSuccess();
        }
      } catch (error) {
        this.logger.warn('Redis cluster write-through failed', { key, error: error.message });
        if (this.circuitBreaker) {
          this.circuitBreaker.recordFailure();
        }
      }
    }

    if (!redisSuccess && this.redisConnected && this.redis.isReady && this.canUseRedis()) {
      try {
        const serialized = this.serialize(value);
        await this.redis.setEx(key, ttl, serialized);
        redisSuccess = true;
        
        if (this.circuitBreaker) {
          this.circuitBreaker.recordSuccess();
        }
      } catch (error) {
        this.logger.warn('Redis write-through failed', { key, error: error.message });
        if (this.circuitBreaker) {
          this.circuitBreaker.recordFailure();
        }
      }
    }

    // Always set in memory cache
    this.setMemoryCache(key, value, ttl);

    return redisSuccess;
  }

  private async setWriteBehind<T>(key: string, value: T, ttl: number): Promise<boolean> {
    // Set in memory immediately
    this.setMemoryCache(key, value, ttl);

    // Schedule Redis write asynchronously
    setImmediate(async () => {
      await this.asyncRedisWrite(key, value, ttl);
    });

    return true;
  }

  private async setRefreshAhead<T>(key: string, value: T, ttl: number): Promise<boolean> {
    // Set normally first
    const success = await this.setCacheAside(key, value, ttl);

    // Schedule refresh before expiry (at 80% of TTL)
    const refreshTime = ttl * 0.8 * 1000; // Convert to milliseconds
    setTimeout(async () => {
      // This would typically call the original data source to refresh
      // For now, we'll just log that refresh is needed
      this.logger.debug('Cache refresh needed', { key });
    }, refreshTime);

    return success;
  }

  private async asyncRedisWrite<T>(key: string, value: T, ttl: number): Promise<void> {
    try {
      const serialized = this.serialize(value);

      if (this.clusterConnected && this.redisCluster && this.canUseRedis()) {
        await this.redisCluster.setEx(key, ttl, serialized);
      } else if (this.redisConnected && this.redis.isReady && this.canUseRedis()) {
        await this.redis.setEx(key, ttl, serialized);
      }

      if (this.circuitBreaker) {
        this.circuitBreaker.recordSuccess();
      }
    } catch (error) {
      this.logger.warn('Async Redis write failed', { key, error: error.message });
      if (this.circuitBreaker) {
        this.circuitBreaker.recordFailure();
      }
    }
  }

  private setMemoryCache<T>(key: string, value: T, ttl: number): void {
    this.enforceMemoryLimit();
    
    const expires = Date.now() + (ttl * 1000);
    const serialized = JSON.stringify(value);
    const size = Buffer.byteLength(serialized, 'utf8');
    
    const cacheItem = {
      value,
      expires,
      size,
      accessCount: 0,
      lastAccessed: Date.now()
    };
    
    this.memoryCache.set(key, cacheItem);
    this.metrics.memoryUsageBytes += size;
    
    this.logger.debug('Cache set (Memory)', { key, ttl, sizeBytes: size });
  }

  private serialize<T>(value: T): string {
    const serialized = JSON.stringify(value);
    
    if (this.compressionEnabled && serialized.length > this.compressionThreshold) {
      // In a real implementation, you'd use a compression library like zlib
      // For now, we'll just return the serialized value
      return serialized;
    }
    
    return serialized;
  }

  private deserialize<T>(data: string): T {
    // In a real implementation, you'd handle decompression here
    return JSON.parse(data);
  }

  private canUseRedis(): boolean {
    if (!this.circuitBreaker) {
      return true;
    }
    return this.circuitBreaker.canExecute();
  }

  async delete(key: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Delete from memory cache
      const memoryItem = this.memoryCache.get(key);
      if (memoryItem) {
        this.memoryCache.delete(key);
        this.metrics.memoryUsageBytes -= memoryItem.size;
        this.metrics.deletes++;
      }

      // Delete from Redis cluster
      if (this.clusterConnected && this.redisCluster && this.canUseRedis()) {
        try {
          await this.redisCluster.del(key);
          if (this.circuitBreaker) {
            this.circuitBreaker.recordSuccess();
          }
        } catch (error) {
          this.logger.warn('Redis cluster delete failed', { key, error: error.message });
          if (this.circuitBreaker) {
            this.circuitBreaker.recordFailure();
          }
        }
      }

      // Delete from single Redis instance
      if (this.redisConnected && this.redis.isReady && this.canUseRedis()) {
        try {
          await this.redis.del(key);
          if (this.circuitBreaker) {
            this.circuitBreaker.recordSuccess();
          }
        } catch (error) {
          this.logger.warn('Redis delete failed', { key, error: error.message });
          if (this.circuitBreaker) {
            this.circuitBreaker.recordFailure();
          }
        }
      }

      this.logger.debug('Cache delete', { key });

    } catch (error) {
      this.logger.error('Cache delete error', { key, error: error.message });
    } finally {
      // Track operation time
      const operationTime = Date.now() - startTime;
      this.metrics.operationTimes.push(operationTime);
    }
  }

  async invalidate(pattern: string): Promise<void> {
    try {
      // Invalidate Redis keys
      if (this.redisConnected && this.redis.isReady) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(keys);
          this.logger.debug('Cache invalidate (Redis)', { pattern, keysDeleted: keys.length });
        }
      }

      // Invalidate memory cache keys
      const memoryKeysToDelete: string[] = [];
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      
      for (const key of this.memoryCache.keys()) {
        if (regex.test(key)) {
          memoryKeysToDelete.push(key);
        }
      }

      memoryKeysToDelete.forEach(key => this.memoryCache.delete(key));
      
      if (memoryKeysToDelete.length > 0) {
        this.logger.debug('Cache invalidate (Memory)', { 
          pattern, 
          keysDeleted: memoryKeysToDelete.length 
        });
      }

    } catch (error) {
      this.logger.error('Cache invalidate error', { pattern, error: error.message });
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      // Check Redis first
      if (this.redisConnected && this.redis.isReady) {
        const exists = await this.redis.exists(key);
        if (exists) {
          return true;
        }
      }

      // Check memory cache
      const memoryItem = this.memoryCache.get(key);
      return memoryItem ? memoryItem.expires > Date.now() : false;

    } catch (error) {
      this.logger.error('Cache exists error', { key, error: error.message });
      
      // Fallback to memory cache
      const memoryItem = this.memoryCache.get(key);
      return memoryItem ? memoryItem.expires > Date.now() : false;
    }
  }

  // Additional utility methods
  async increment(key: string, amount: number = 1): Promise<number> {
    try {
      if (this.redisConnected && this.redis.isReady) {
        return await this.redis.incrBy(key, amount);
      }

      // Fallback to memory cache
      const current = await this.get<number>(key) || 0;
      const newValue = current + amount;
      await this.set(key, newValue, this.defaultTTL);
      return newValue;

    } catch (error) {
      this.logger.error('Cache increment error', { key, amount, error: error.message });
      throw error;
    }
  }

  async setWithExpiry(key: string, value: any, expiryDate: Date): Promise<void> {
    const ttl = Math.max(0, Math.floor((expiryDate.getTime() - Date.now()) / 1000));
    await this.set(key, value, ttl);
  }

  async getMultiple<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      if (this.redisConnected && this.redis.isReady) {
        const values = await this.redis.mGet(keys);
        return values.map(value => value ? JSON.parse(value) : null);
      }

      // Fallback to individual gets
      return Promise.all(keys.map(key => this.get<T>(key)));

    } catch (error) {
      this.logger.error('Cache getMultiple error', { keys, error: error.message });
      return keys.map(() => null);
    }
  }

  async setMultiple<T>(items: Array<{ key: string; value: T; ttl?: number }>): Promise<void> {
    try {
      if (this.redisConnected && this.redis.isReady) {
        const multi = this.redis.multi();
        
        items.forEach(({ key, value, ttl }) => {
          const actualTTL = ttl || this.defaultTTL;
          multi.setEx(key, actualTTL, JSON.stringify(value));
        });
        
        await multi.exec();
      }

      // Also set in memory cache
      items.forEach(({ key, value, ttl }) => {
        this.setMemoryCache(key, value, ttl || this.defaultTTL);
      });

      this.logger.debug('Cache setMultiple', { count: items.length });

    } catch (error) {
      this.logger.error('Cache setMultiple error', { error: error.message });
      
      // Fallback to individual sets
      await Promise.all(items.map(({ key, value, ttl }) => 
        this.set(key, value, ttl)
      ));
    }
  }

  // Enhanced pattern-based invalidation
  async invalidatePattern(pattern: string): Promise<number> {
    let invalidatedCount = 0;

    try {
      // Invalidate memory cache
      const memoryKeysToDelete: string[] = [];
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      
      for (const key of this.memoryCache.keys()) {
        if (regex.test(key)) {
          memoryKeysToDelete.push(key);
        }
      }

      for (const key of memoryKeysToDelete) {
        const item = this.memoryCache.get(key);
        if (item) {
          this.memoryCache.delete(key);
          this.metrics.memoryUsageBytes -= item.size;
          invalidatedCount++;
        }
      }

      // Invalidate Redis cluster
      if (this.clusterConnected && this.redisCluster && this.canUseRedis()) {
        try {
          // Use SCAN to find matching keys
          const keys: string[] = [];
          for await (const key of this.redisCluster.scanIterator({ MATCH: pattern })) {
            keys.push(key);
          }
          
          if (keys.length > 0) {
            await this.redisCluster.del(keys);
            invalidatedCount += keys.length;
          }
        } catch (error) {
          this.logger.warn('Redis cluster pattern invalidation failed', { pattern, error: error.message });
        }
      }

      // Invalidate single Redis instance
      if (this.redisConnected && this.redis.isReady && this.canUseRedis()) {
        try {
          const keys = await this.redis.keys(pattern);
          if (keys.length > 0) {
            await this.redis.del(keys);
            invalidatedCount += keys.length;
          }
        } catch (error) {
          this.logger.warn('Redis pattern invalidation failed', { pattern, error: error.message });
        }
      }

      this.logger.info('Cache pattern invalidation completed', { pattern, count: invalidatedCount });
      return invalidatedCount;

    } catch (error) {
      this.logger.error('Cache pattern invalidation error', { pattern, error: error.message });
      return invalidatedCount;
    }
  }

  // Batch operations for better performance
  async getMultiple<T>(keys: string[]): Promise<(T | null)[]> {
    const startTime = Date.now();
    const results: (T | null)[] = new Array(keys.length).fill(null);
    const missingKeys: number[] = [];

    try {
      // Check memory cache first
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const memoryItem = this.memoryCache.get(key);
        
        if (memoryItem && memoryItem.expires > Date.now()) {
          memoryItem.accessCount++;
          memoryItem.lastAccessed = Date.now();
          results[i] = memoryItem.value;
          this.metrics.hits++;
        } else {
          missingKeys.push(i);
          if (memoryItem) {
            this.memoryCache.delete(key);
            this.metrics.memoryUsageBytes -= memoryItem.size;
          }
        }
      }

      // Get missing keys from Redis
      if (missingKeys.length > 0 && this.canUseRedis()) {
        const missingKeyNames = missingKeys.map(i => keys[i]);
        
        try {
          let redisValues: (string | null)[] = [];
          
          if (this.clusterConnected && this.redisCluster) {
            redisValues = await this.redisCluster.mGet(missingKeyNames);
          } else if (this.redisConnected && this.redis.isReady) {
            redisValues = await this.redis.mGet(missingKeyNames);
          }

          for (let j = 0; j < redisValues.length; j++) {
            const redisValue = redisValues[j];
            const originalIndex = missingKeys[j];
            
            if (redisValue) {
              const parsed = this.deserialize(redisValue);
              results[originalIndex] = parsed;
              
              // Cache in memory
              this.setMemoryCache(keys[originalIndex], parsed, this.defaultTTL);
              this.metrics.hits++;
            } else {
              this.metrics.misses++;
            }
          }

          if (this.circuitBreaker) {
            this.circuitBreaker.recordSuccess();
          }
        } catch (error) {
          this.logger.warn('Redis mGet failed', { error: error.message });
          if (this.circuitBreaker) {
            this.circuitBreaker.recordFailure();
          }
          
          // Count remaining as misses
          this.metrics.misses += missingKeys.length;
        }
      } else {
        // Count remaining as misses
        this.metrics.misses += missingKeys.length;
      }

      return results;

    } finally {
      const operationTime = Date.now() - startTime;
      this.metrics.operationTimes.push(operationTime);
    }
  }

  async setMultiple<T>(items: Array<{ key: string; value: T; ttl?: number }>): Promise<void> {
    const startTime = Date.now();

    try {
      // Set in memory cache
      for (const { key, value, ttl } of items) {
        this.setMemoryCache(key, value, ttl || this.defaultTTL);
      }

      // Batch set in Redis
      if (this.canUseRedis()) {
        try {
          if (this.clusterConnected && this.redisCluster) {
            const pipeline = this.redisCluster.multi();
            
            for (const { key, value, ttl } of items) {
              const serialized = this.serialize(value);
              const actualTTL = ttl || this.defaultTTL;
              pipeline.setEx(key, actualTTL, serialized);
            }
            
            await pipeline.exec();
          } else if (this.redisConnected && this.redis.isReady) {
            const pipeline = this.redis.multi();
            
            for (const { key, value, ttl } of items) {
              const serialized = this.serialize(value);
              const actualTTL = ttl || this.defaultTTL;
              pipeline.setEx(key, actualTTL, serialized);
            }
            
            await pipeline.exec();
          }

          if (this.circuitBreaker) {
            this.circuitBreaker.recordSuccess();
          }
        } catch (error) {
          this.logger.warn('Redis batch set failed', { error: error.message });
          if (this.circuitBreaker) {
            this.circuitBreaker.recordFailure();
          }
        }
      }

      this.metrics.sets += items.length;
      this.logger.debug('Cache batch set completed', { count: items.length });

    } finally {
      const operationTime = Date.now() - startTime;
      this.metrics.operationTimes.push(operationTime);
    }
  }

  // Cache warming methods
  async warmCache(keys: string[], dataLoader: (key: string) => Promise<any>): Promise<number> {
    let warmedCount = 0;

    for (const key of keys) {
      try {
        // Check if already cached
        const existing = await this.get(key);
        if (existing === null) {
          // Load and cache data
          const data = await dataLoader(key);
          if (data !== null && data !== undefined) {
            await this.set(key, data);
            warmedCount++;
          }
        }
      } catch (error) {
        this.logger.warn('Cache warming failed for key', { key, error: error.message });
      }
    }

    this.logger.info('Cache warming completed', { 
      totalKeys: keys.length, 
      warmedCount 
    });

    return warmedCount;
  }

  // Performance and monitoring methods
  getMetrics(): CacheMetrics {
    this.collectMetrics();
    return { ...this.metrics };
  }

  async getCacheSize(): Promise<{ memory: number; redis?: number; cluster?: number }> {
    const result: { memory: number; redis?: number; cluster?: number } = {
      memory: this.memoryCache.size
    };

    try {
      if (this.redisConnected && this.redis.isReady) {
        const info = await this.redis.info('keyspace');
        // Parse keyspace info to get key count
        const match = info.match(/keys=(\d+)/);
        if (match) {
          result.redis = parseInt(match[1]);
        }
      }

      if (this.clusterConnected && this.redisCluster) {
        // For cluster, we'd need to query each node
        // This is a simplified implementation
        result.cluster = 0; // Placeholder
      }
    } catch (error) {
      this.logger.warn('Failed to get Redis cache size', { error: error.message });
    }

    return result;
  }

  // Health check method
  async healthCheck(): Promise<{ 
    memory: boolean; 
    redis: boolean; 
    cluster: boolean; 
    circuitBreaker: string;
    metrics: CacheMetrics;
  }> {
    let redisHealthy = false;
    let clusterHealthy = false;

    try {
      if (this.redisConnected && this.redis.isReady) {
        await this.redis.ping();
        redisHealthy = true;
      }
    } catch (error) {
      this.logger.warn('Redis health check failed', { error: error.message });
    }

    try {
      if (this.clusterConnected && this.redisCluster) {
        await this.redisCluster.ping();
        clusterHealthy = true;
      }
    } catch (error) {
      this.logger.warn('Redis cluster health check failed', { error: error.message });
    }

    return {
      memory: true, // Memory cache is always available
      redis: redisHealthy,
      cluster: clusterHealthy,
      circuitBreaker: this.circuitBreaker?.getState() || 'disabled',
      metrics: this.getMetrics()
    };
  }

  // Graceful shutdown
  async disconnect(): Promise<void> {
    try {
      if (this.redis && this.redis.isOpen) {
        await this.redis.quit();
        this.logger.info('Redis connection closed');
      }
      
      this.memoryCache.clear();
      this.logger.info('Memory cache cleared');
      
    } catch (error) {
      this.logger.error('Error during cache service shutdown', { error: error.message });
    }
  }
}