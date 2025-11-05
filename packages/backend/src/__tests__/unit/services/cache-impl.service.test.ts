import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { CacheServiceImpl } from '../../../services/cache-impl.service';
import logger from '../../../services/logger.service';

// Mock database config first
vi.mock('../../../config/database', () => ({
  redisClient: {
    get: vi.fn(),
    setEx: vi.fn(),
    del: vi.fn(),
    keys: vi.fn(),
    exists: vi.fn(),
    ttl: vi.fn(),
  },
}));

// Mock logger
vi.mock('../../../services/logger.service', () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('CacheServiceImpl', () => {
  let cacheService: CacheServiceImpl;
  let mockRedisClient: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Get the mocked redis client
    const { redisClient } = await import('../../../config/database');
    mockRedisClient = redisClient;
    
    cacheService = new CacheServiceImpl();
  });

  afterEach(() => {
    cacheService.destroy();
  });

  describe('get', () => {
    it('should return value from memory cache (L1) if available', async () => {
      // Arrange
      const key = 'test:key';
      const value = { data: 'test-data' };
      
      // Set in memory cache first
      await cacheService.set(key, value);

      // Act
      const result = await cacheService.get(key);

      // Assert
      expect(result).toEqual(value);
      expect(mockRedisClient.get).not.toHaveBeenCalled();
    });

    it('should return value from Redis (L2) if not in memory cache', async () => {
      // Arrange
      const key = 'test:key';
      const value = { data: 'test-data' };
      const serializedValue = JSON.stringify(value);

      mockRedisClient.get.mockResolvedValue(serializedValue);

      // Act
      const result = await cacheService.get(key);

      // Assert
      expect(result).toEqual(value);
      expect(mockRedisClient.get).toHaveBeenCalledWith(key);
    });

    it('should return null if key not found in any cache', async () => {
      // Arrange
      const key = 'nonexistent:key';
      mockRedisClient.get.mockResolvedValue(null);

      // Act
      const result = await cacheService.get(key);

      // Assert
      expect(result).toBeNull();
      expect(mockRedisClient.get).toHaveBeenCalledWith(key);
    });

    it('should handle Redis errors gracefully', async () => {
      // Arrange
      const key = 'test:key';
      const error = new Error('Redis connection error');
      mockRedisClient.get.mockRejectedValue(error);

      // Act
      const result = await cacheService.get(key);

      // Assert
      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith('Cache get error', { key, error });
    });

    it('should skip L1 cache when skipL1 option is true', async () => {
      // Arrange
      const key = 'test:key';
      const value = { data: 'test-data' };
      const serializedValue = JSON.stringify(value);

      // Set in memory cache first
      await cacheService.set(key, value);
      mockRedisClient.get.mockResolvedValue(serializedValue);

      // Act
      const result = await cacheService.get(key, { skipL1: true });

      // Assert
      expect(result).toEqual(value);
      expect(mockRedisClient.get).toHaveBeenCalledWith(key);
    });

    it('should skip L2 cache when skipL2 option is true', async () => {
      // Arrange
      const key = 'test:key';

      // Act
      const result = await cacheService.get(key, { skipL2: true });

      // Assert
      expect(result).toBeNull();
      expect(mockRedisClient.get).not.toHaveBeenCalled();
    });
  });

  describe('set', () => {
    it('should set value in both memory and Redis cache', async () => {
      // Arrange
      const key = 'test:key';
      const value = { data: 'test-data' };
      const ttl = 3600;

      // Act
      await cacheService.set(key, value, ttl);

      // Assert
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        key,
        ttl,
        JSON.stringify(value)
      );

      // Verify it's in memory cache
      const memoryResult = await cacheService.get(key, { skipL2: true });
      expect(memoryResult).toEqual(value);
    });

    it('should use default TTL if not provided', async () => {
      // Arrange
      const key = 'test:key';
      const value = { data: 'test-data' };

      // Act
      await cacheService.set(key, value);

      // Assert
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        key,
        3600, // default TTL
        JSON.stringify(value)
      );
    });

    it('should skip L1 cache when skipL1 option is true', async () => {
      // Arrange
      const key = 'test:key';
      const value = { data: 'test-data' };

      // Act
      await cacheService.set(key, value, 3600, { skipL1: true });

      // Assert
      expect(mockRedisClient.setEx).toHaveBeenCalled();
      
      // Verify it's not in memory cache
      const memoryResult = await cacheService.get(key, { skipL2: true });
      expect(memoryResult).toBeNull();
    });

    it('should skip L2 cache when skipL2 option is true', async () => {
      // Arrange
      const key = 'test:key';
      const value = { data: 'test-data' };

      // Act
      await cacheService.set(key, value, 3600, { skipL2: true });

      // Assert
      expect(mockRedisClient.setEx).not.toHaveBeenCalled();
      
      // Verify it's in memory cache
      const memoryResult = await cacheService.get(key, { skipL2: true });
      expect(memoryResult).toEqual(value);
    });
  });

  describe('delete', () => {
    it('should delete from both memory and Redis cache', async () => {
      // Arrange
      const key = 'test:key';
      const value = { data: 'test-data' };

      // Set value first
      await cacheService.set(key, value);

      // Act
      await cacheService.delete(key);

      // Assert
      expect(mockRedisClient.del).toHaveBeenCalledWith(key);
      
      // Verify it's removed from memory cache
      const result = await cacheService.get(key, { skipL2: true });
      expect(result).toBeNull();
    });
  });

  describe('invalidate', () => {
    it('should invalidate matching keys in both caches', async () => {
      // Arrange
      const pattern = 'test:*';
      const keys = ['test:key1', 'test:key2'];
      
      // Set some values in memory cache
      await cacheService.set('test:key1', { data: '1' });
      await cacheService.set('test:key2', { data: '2' });
      await cacheService.set('other:key', { data: '3' });

      mockRedisClient.keys.mockResolvedValue(keys);

      // Act
      await cacheService.invalidate(pattern);

      // Assert
      expect(mockRedisClient.keys).toHaveBeenCalledWith(pattern);
      expect(mockRedisClient.del).toHaveBeenCalledWith(keys);
      
      // Verify memory cache invalidation
      const result1 = await cacheService.get('test:key1', { skipL2: true });
      const result2 = await cacheService.get('test:key2', { skipL2: true });
      const result3 = await cacheService.get('other:key', { skipL2: true });
      
      expect(result1).toBeNull();
      expect(result2).toBeNull();
      expect(result3).toEqual({ data: '3' }); // Should not be invalidated
    });
  });

  describe('exists', () => {
    it('should return true if key exists in memory cache', async () => {
      // Arrange
      const key = 'test:key';
      const value = { data: 'test-data' };
      
      await cacheService.set(key, value);

      // Act
      const result = await cacheService.exists(key);

      // Assert
      expect(result).toBe(true);
      expect(mockRedisClient.exists).not.toHaveBeenCalled();
    });

    it('should check Redis if not in memory cache', async () => {
      // Arrange
      const key = 'test:key';
      mockRedisClient.exists.mockResolvedValue(1);

      // Act
      const result = await cacheService.exists(key);

      // Assert
      expect(result).toBe(true);
      expect(mockRedisClient.exists).toHaveBeenCalledWith(key);
    });

    it('should return false if key does not exist', async () => {
      // Arrange
      const key = 'nonexistent:key';
      mockRedisClient.exists.mockResolvedValue(0);

      // Act
      const result = await cacheService.exists(key);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getOrSet', () => {
    it('should return cached value if exists', async () => {
      // Arrange
      const key = 'test:key';
      const cachedValue = { data: 'cached' };
      const fetcher = vi.fn().mockResolvedValue({ data: 'fetched' });

      await cacheService.set(key, cachedValue);

      // Act
      const result = await cacheService.getOrSet(key, fetcher);

      // Assert
      expect(result).toEqual(cachedValue);
      expect(fetcher).not.toHaveBeenCalled();
    });

    it('should fetch and cache value if not exists', async () => {
      // Arrange
      const key = 'test:key:new';
      const fetchedValue = { data: 'fetched' };
      const fetcher = vi.fn().mockResolvedValue(fetchedValue);

      // Ensure key doesn't exist in cache
      mockRedisClient.get.mockResolvedValue(null);

      // Act
      const result = await cacheService.getOrSet(key, fetcher, 1800);

      // Assert
      expect(result).toEqual(fetchedValue);
      expect(fetcher).toHaveBeenCalled();
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        key,
        1800,
        JSON.stringify(fetchedValue)
      );
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      // Arrange
      const key = 'test:key';
      const value = { data: 'test' };

      // Generate some cache hits and misses
      await cacheService.set(key, value);
      await cacheService.get(key); // hit
      await cacheService.get('nonexistent'); // miss

      // Act
      const stats = cacheService.getStats();

      // Assert
      expect(stats).toEqual(
        expect.objectContaining({
          hits: expect.any(Number),
          misses: expect.any(Number),
          hitRate: expect.any(Number),
          totalOperations: expect.any(Number),
          memoryUsage: expect.objectContaining({
            l1: expect.any(Number),
            l2: expect.any(Number),
          }),
        })
      );
    });
  });

  describe('memory cache management', () => {
    it('should evict expired entries during cleanup', async () => {
      // Arrange
      const key = 'test:key';
      const value = { data: 'test' };
      const shortTTL = 0.001; // Very short TTL (1ms)

      await cacheService.set(key, value, shortTTL);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 10));

      // Act - trigger cleanup by getting the key
      const result = await cacheService.get(key, { skipL2: true });

      // Assert
      expect(result).toBeNull();
    });
  });
});