"""
Advanced multi-layer caching system with Redis and Python.

This module provides:
- Multi-layer caching (memory, Redis, CDN)
- Cache warming strategies with background tasks
- Intelligent cache invalidation with Redis pub/sub
- Cache performance monitoring with Python metrics
"""

import asyncio
import json
import pickle
import time
import hashlib
from abc import ABC, abstractmethod
from contextlib import asynccontextmanager
from dataclasses import dataclass, asdict
from enum import Enum
from typing import (
    Any, Dict, List, Optional, Union, Callable, TypeVar, Generic,
    AsyncGenerator, Set, Tuple
)
from functools import wraps
import weakref

import redis.asyncio as redis
from redis.asyncio import Redis
import structlog
from prometheus_client import Counter, Histogram, Gauge

from .config import get_settings

logger = structlog.get_logger(__name__)
settings = get_settings()

T = TypeVar('T')


class CacheLevel(Enum):
    """Cache level enumeration."""
    MEMORY = "memory"
    REDIS = "redis"
    CDN = "cdn"


class CacheStrategy(Enum):
    """Cache strategy enumeration."""
    CACHE_ASIDE = "cache_aside"
    WRITE_THROUGH = "write_through"
    WRITE_BEHIND = "write_behind"
    REFRESH_AHEAD = "refresh_ahead"


@dataclass
class CacheConfig:
    """Cache configuration."""
    ttl: int = 3600  # Time to live in seconds
    max_size: int = 1000  # Maximum cache size
    strategy: CacheStrategy = CacheStrategy.CACHE_ASIDE
    serialize_json: bool = True  # Use JSON serialization instead of pickle
    compress: bool = False  # Compress large values
    namespace: str = "default"  # Cache namespace
    tags: List[str] = None  # Cache tags for invalidation


@dataclass
class CacheMetrics:
    """Cache performance metrics."""
    hits: int = 0
    misses: int = 0
    sets: int = 0
    deletes: int = 0
    evictions: int = 0
    memory_usage: int = 0
    
    @property
    def hit_rate(self) -> float:
        """Calculate cache hit rate."""
        total = self.hits + self.misses
        return self.hits / total if total > 0 else 0.0


# Prometheus metrics
cache_operations = Counter(
    'cache_operations_total',
    'Total cache operations',
    ['operation', 'level', 'namespace']
)

cache_hit_rate = Gauge(
    'cache_hit_rate',
    'Cache hit rate by level and namespace',
    ['level', 'namespace']
)

cache_operation_duration = Histogram(
    'cache_operation_duration_seconds',
    'Cache operation duration',
    ['operation', 'level']
)

cache_memory_usage = Gauge(
    'cache_memory_usage_bytes',
    'Cache memory usage',
    ['level', 'namespace']
)


class CacheBackend(ABC, Generic[T]):
    """Abstract cache backend interface."""
    
    @abstractmethod
    async def get(self, key: str) -> Optional[T]:
        """Get value from cache."""
        pass
    
    @abstractmethod
    async def set(self, key: str, value: T, ttl: Optional[int] = None) -> bool:
        """Set value in cache."""
        pass
    
    @abstractmethod
    async def delete(self, key: str) -> bool:
        """Delete value from cache."""
        pass
    
    @abstractmethod
    async def exists(self, key: str) -> bool:
        """Check if key exists in cache."""
        pass
    
    @abstractmethod
    async def clear(self, pattern: Optional[str] = None) -> int:
        """Clear cache entries matching pattern."""
        pass
    
    @abstractmethod
    async def get_metrics(self) -> CacheMetrics:
        """Get cache metrics."""
        pass


class MemoryCache(CacheBackend[Any]):
    """
    In-memory cache implementation with LRU eviction.
    """
    
    def __init__(self, max_size: int = 1000, ttl: int = 3600):
        self.max_size = max_size
        self.default_ttl = ttl
        self._cache: Dict[str, Tuple[Any, float]] = {}  # key -> (value, expiry)
        self._access_order: List[str] = []  # LRU tracking
        self._metrics = CacheMetrics()
        self._lock = asyncio.Lock()
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from memory cache."""
        async with self._lock:
            if key not in self._cache:
                self._metrics.misses += 1
                cache_operations.labels(operation='miss', level='memory', namespace='default').inc()
                return None
            
            value, expiry = self._cache[key]
            
            # Check expiry
            if time.time() > expiry:
                del self._cache[key]
                if key in self._access_order:
                    self._access_order.remove(key)
                self._metrics.misses += 1
                cache_operations.labels(operation='miss', level='memory', namespace='default').inc()
                return None
            
            # Update access order for LRU
            if key in self._access_order:
                self._access_order.remove(key)
            self._access_order.append(key)
            
            self._metrics.hits += 1
            cache_operations.labels(operation='hit', level='memory', namespace='default').inc()
            return value
    
    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in memory cache."""
        async with self._lock:
            expiry = time.time() + (ttl or self.default_ttl)
            
            # Evict if at capacity
            if len(self._cache) >= self.max_size and key not in self._cache:
                await self._evict_lru()
            
            self._cache[key] = (value, expiry)
            
            # Update access order
            if key in self._access_order:
                self._access_order.remove(key)
            self._access_order.append(key)
            
            self._metrics.sets += 1
            cache_operations.labels(operation='set', level='memory', namespace='default').inc()
            return True
    
    async def delete(self, key: str) -> bool:
        """Delete value from memory cache."""
        async with self._lock:
            if key in self._cache:
                del self._cache[key]
                if key in self._access_order:
                    self._access_order.remove(key)
                self._metrics.deletes += 1
                cache_operations.labels(operation='delete', level='memory', namespace='default').inc()
                return True
            return False
    
    async def exists(self, key: str) -> bool:
        """Check if key exists in memory cache."""
        return await self.get(key) is not None
    
    async def clear(self, pattern: Optional[str] = None) -> int:
        """Clear memory cache entries."""
        async with self._lock:
            if pattern is None:
                count = len(self._cache)
                self._cache.clear()
                self._access_order.clear()
                return count
            
            # Pattern matching for keys
            import fnmatch
            keys_to_delete = [k for k in self._cache.keys() if fnmatch.fnmatch(k, pattern)]
            
            for key in keys_to_delete:
                del self._cache[key]
                if key in self._access_order:
                    self._access_order.remove(key)
            
            return len(keys_to_delete)
    
    async def get_metrics(self) -> CacheMetrics:
        """Get memory cache metrics."""
        async with self._lock:
            # Calculate memory usage (rough estimate)
            memory_usage = sum(
                len(str(key)) + len(str(value)) 
                for key, (value, _) in self._cache.items()
            )
            self._metrics.memory_usage = memory_usage
            return self._metrics
    
    async def _evict_lru(self):
        """Evict least recently used item."""
        if self._access_order:
            lru_key = self._access_order.pop(0)
            if lru_key in self._cache:
                del self._cache[lru_key]
                self._metrics.evictions += 1


class RedisCache(CacheBackend[Any]):
    """
    Redis cache implementation with async support.
    """
    
    def __init__(self, redis_client: Redis, namespace: str = "cache"):
        self.redis = redis_client
        self.namespace = namespace
        self._metrics = CacheMetrics()
    
    def _make_key(self, key: str) -> str:
        """Create namespaced cache key."""
        return f"{self.namespace}:{key}"
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from Redis cache."""
        try:
            start_time = time.time()
            redis_key = self._make_key(key)
            
            value = await self.redis.get(redis_key)
            
            cache_operation_duration.labels(operation='get', level='redis').observe(
                time.time() - start_time
            )
            
            if value is None:
                self._metrics.misses += 1
                cache_operations.labels(operation='miss', level='redis', namespace=self.namespace).inc()
                return None
            
            # Deserialize value
            try:
                deserialized = json.loads(value)
            except (json.JSONDecodeError, TypeError):
                # Fallback to pickle for non-JSON data
                deserialized = pickle.loads(value)
            
            self._metrics.hits += 1
            cache_operations.labels(operation='hit', level='redis', namespace=self.namespace).inc()
            return deserialized
            
        except Exception as e:
            logger.error("Redis cache get failed", key=key, error=str(e))
            self._metrics.misses += 1
            return None
    
    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in Redis cache."""
        try:
            start_time = time.time()
            redis_key = self._make_key(key)
            
            # Serialize value
            try:
                serialized = json.dumps(value, default=str)
            except (TypeError, ValueError):
                # Fallback to pickle for complex objects
                serialized = pickle.dumps(value)
            
            # Set with TTL
            if ttl:
                await self.redis.setex(redis_key, ttl, serialized)
            else:
                await self.redis.set(redis_key, serialized)
            
            cache_operation_duration.labels(operation='set', level='redis').observe(
                time.time() - start_time
            )
            
            self._metrics.sets += 1
            cache_operations.labels(operation='set', level='redis', namespace=self.namespace).inc()
            return True
            
        except Exception as e:
            logger.error("Redis cache set failed", key=key, error=str(e))
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete value from Redis cache."""
        try:
            redis_key = self._make_key(key)
            result = await self.redis.delete(redis_key)
            
            if result > 0:
                self._metrics.deletes += 1
                cache_operations.labels(operation='delete', level='redis', namespace=self.namespace).inc()
                return True
            return False
            
        except Exception as e:
            logger.error("Redis cache delete failed", key=key, error=str(e))
            return False
    
    async def exists(self, key: str) -> bool:
        """Check if key exists in Redis cache."""
        try:
            redis_key = self._make_key(key)
            return await self.redis.exists(redis_key) > 0
        except Exception as e:
            logger.error("Redis cache exists check failed", key=key, error=str(e))
            return False
    
    async def clear(self, pattern: Optional[str] = None) -> int:
        """Clear Redis cache entries."""
        try:
            if pattern is None:
                pattern = f"{self.namespace}:*"
            else:
                pattern = f"{self.namespace}:{pattern}"
            
            keys = await self.redis.keys(pattern)
            if keys:
                deleted = await self.redis.delete(*keys)
                return deleted
            return 0
            
        except Exception as e:
            logger.error("Redis cache clear failed", pattern=pattern, error=str(e))
            return 0
    
    async def get_metrics(self) -> CacheMetrics:
        """Get Redis cache metrics."""
        try:
            # Get Redis memory usage for this namespace
            info = await self.redis.info('memory')
            self._metrics.memory_usage = info.get('used_memory', 0)
            return self._metrics
        except Exception as e:
            logger.error("Failed to get Redis metrics", error=str(e))
            return self._metrics


class MultiLayerCache:
    """
    Multi-layer cache with memory, Redis, and CDN support.
    """
    
    def __init__(
        self,
        memory_cache: Optional[MemoryCache] = None,
        redis_cache: Optional[RedisCache] = None,
        config: Optional[CacheConfig] = None
    ):
        self.config = config or CacheConfig()
        self.memory_cache = memory_cache or MemoryCache(
            max_size=self.config.max_size,
            ttl=self.config.ttl
        )
        self.redis_cache = redis_cache
        self._invalidation_subscribers: Set[Callable] = set()
    
    async def get(self, key: str) -> Optional[Any]:
        """
        Get value from multi-layer cache.
        Checks memory first, then Redis, with automatic promotion.
        """
        # Try memory cache first
        value = await self.memory_cache.get(key)
        if value is not None:
            return value
        
        # Try Redis cache
        if self.redis_cache:
            value = await self.redis_cache.get(key)
            if value is not None:
                # Promote to memory cache
                await self.memory_cache.set(key, value, self.config.ttl)
                return value
        
        return None
    
    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """
        Set value in multi-layer cache.
        Writes to all available layers.
        """
        ttl = ttl or self.config.ttl
        success = True
        
        # Set in memory cache
        memory_success = await self.memory_cache.set(key, value, ttl)
        success = success and memory_success
        
        # Set in Redis cache
        if self.redis_cache:
            redis_success = await self.redis_cache.set(key, value, ttl)
            success = success and redis_success
        
        return success
    
    async def delete(self, key: str) -> bool:
        """
        Delete value from all cache layers.
        """
        success = True
        
        # Delete from memory cache
        memory_success = await self.memory_cache.delete(key)
        
        # Delete from Redis cache
        if self.redis_cache:
            redis_success = await self.redis_cache.delete(key)
            success = memory_success or redis_success
        else:
            success = memory_success
        
        # Notify invalidation subscribers
        await self._notify_invalidation(key)
        
        return success
    
    async def invalidate_pattern(self, pattern: str) -> int:
        """
        Invalidate cache entries matching pattern.
        """
        total_deleted = 0
        
        # Clear from memory cache
        memory_deleted = await self.memory_cache.clear(pattern)
        total_deleted += memory_deleted
        
        # Clear from Redis cache
        if self.redis_cache:
            redis_deleted = await self.redis_cache.clear(pattern)
            total_deleted += redis_deleted
        
        # Notify invalidation subscribers
        await self._notify_invalidation(pattern, is_pattern=True)
        
        return total_deleted
    
    async def invalidate_tags(self, tags: List[str]) -> int:
        """
        Invalidate cache entries by tags.
        """
        total_deleted = 0
        
        for tag in tags:
            pattern = f"*:{tag}:*"
            deleted = await self.invalidate_pattern(pattern)
            total_deleted += deleted
        
        return total_deleted
    
    async def get_combined_metrics(self) -> Dict[str, CacheMetrics]:
        """
        Get metrics from all cache layers.
        """
        metrics = {}
        
        # Memory cache metrics
        metrics['memory'] = await self.memory_cache.get_metrics()
        
        # Redis cache metrics
        if self.redis_cache:
            metrics['redis'] = await self.redis_cache.get_metrics()
        
        return metrics
    
    def subscribe_invalidation(self, callback: Callable[[str], None]):
        """
        Subscribe to cache invalidation events.
        """
        self._invalidation_subscribers.add(callback)
    
    def unsubscribe_invalidation(self, callback: Callable[[str], None]):
        """
        Unsubscribe from cache invalidation events.
        """
        self._invalidation_subscribers.discard(callback)
    
    async def _notify_invalidation(self, key: str, is_pattern: bool = False):
        """
        Notify subscribers of cache invalidation.
        """
        for callback in self._invalidation_subscribers:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(key)
                else:
                    callback(key)
            except Exception as e:
                logger.error("Cache invalidation callback failed", error=str(e))


class CacheWarmer:
    """
    Cache warming strategies with background tasks.
    """
    
    def __init__(self, cache: MultiLayerCache):
        self.cache = cache
        self._warming_tasks: Dict[str, asyncio.Task] = {}
        self._warming_strategies: Dict[str, Callable] = {}
    
    def register_warming_strategy(self, key_pattern: str, strategy: Callable):
        """
        Register a cache warming strategy for a key pattern.
        
        Args:
            key_pattern: Pattern to match cache keys
            strategy: Async function that returns data to cache
        """
        self._warming_strategies[key_pattern] = strategy
    
    async def warm_cache(self, key: str, force: bool = False) -> bool:
        """
        Warm cache for specific key.
        
        Args:
            key: Cache key to warm
            force: Force warming even if key exists
            
        Returns:
            True if warming was successful
        """
        try:
            # Check if key already exists and force is False
            if not force and await self.cache.get(key) is not None:
                return True
            
            # Find matching warming strategy
            strategy = None
            for pattern, strategy_func in self._warming_strategies.items():
                import fnmatch
                if fnmatch.fnmatch(key, pattern):
                    strategy = strategy_func
                    break
            
            if strategy is None:
                logger.warning("No warming strategy found for key", key=key)
                return False
            
            # Execute warming strategy
            data = await strategy(key)
            if data is not None:
                await self.cache.set(key, data)
                logger.info("Cache warmed successfully", key=key)
                return True
            
            return False
            
        except Exception as e:
            logger.error("Cache warming failed", key=key, error=str(e))
            return False
    
    async def warm_cache_batch(self, keys: List[str], concurrency: int = 10) -> Dict[str, bool]:
        """
        Warm cache for multiple keys concurrently.
        
        Args:
            keys: List of cache keys to warm
            concurrency: Maximum concurrent warming tasks
            
        Returns:
            Dictionary mapping keys to warming success status
        """
        semaphore = asyncio.Semaphore(concurrency)
        
        async def warm_with_semaphore(key: str) -> Tuple[str, bool]:
            async with semaphore:
                success = await self.warm_cache(key)
                return key, success
        
        tasks = [warm_with_semaphore(key) for key in keys]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        return {
            key: success for key, success in results 
            if not isinstance(success, Exception)
        }
    
    async def start_background_warming(self, interval: int = 300):
        """
        Start background cache warming task.
        
        Args:
            interval: Warming interval in seconds
        """
        async def warming_loop():
            while True:
                try:
                    await asyncio.sleep(interval)
                    
                    # Get keys that need warming (implement based on your logic)
                    keys_to_warm = await self._get_keys_to_warm()
                    
                    if keys_to_warm:
                        results = await self.warm_cache_batch(keys_to_warm)
                        successful = sum(1 for success in results.values() if success)
                        logger.info(
                            "Background cache warming completed",
                            total_keys=len(keys_to_warm),
                            successful=successful
                        )
                    
                except Exception as e:
                    logger.error("Background cache warming error", error=str(e))
        
        task = asyncio.create_task(warming_loop())
        self._warming_tasks['background'] = task
        logger.info("Background cache warming started", interval=interval)
    
    async def stop_background_warming(self):
        """Stop background cache warming."""
        for task_name, task in self._warming_tasks.items():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
        
        self._warming_tasks.clear()
        logger.info("Background cache warming stopped")
    
    async def _get_keys_to_warm(self) -> List[str]:
        """
        Get list of keys that need warming.
        Implement based on your application logic.
        """
        # Example: warm popular user profiles, recent jobs, etc.
        return [
            "user:popular:*",
            "jobs:recent:*",
            "analytics:dashboard:*"
        ]


class CacheInvalidationManager:
    """
    Intelligent cache invalidation with Redis pub/sub.
    """
    
    def __init__(self, redis_client: Redis, cache: MultiLayerCache):
        self.redis = redis_client
        self.cache = cache
        self._pubsub = None
        self._invalidation_task = None
        self._invalidation_rules: Dict[str, List[str]] = {}
    
    async def start_invalidation_listener(self):
        """Start Redis pub/sub listener for cache invalidation."""
        try:
            self._pubsub = self.redis.pubsub()
            await self._pubsub.subscribe('cache:invalidate')
            
            self._invalidation_task = asyncio.create_task(self._invalidation_loop())
            logger.info("Cache invalidation listener started")
            
        except Exception as e:
            logger.error("Failed to start invalidation listener", error=str(e))
            raise
    
    async def stop_invalidation_listener(self):
        """Stop Redis pub/sub listener."""
        if self._invalidation_task:
            self._invalidation_task.cancel()
            try:
                await self._invalidation_task
            except asyncio.CancelledError:
                pass
        
        if self._pubsub:
            await self._pubsub.unsubscribe('cache:invalidate')
            await self._pubsub.close()
        
        logger.info("Cache invalidation listener stopped")
    
    async def invalidate(self, key: str, propagate: bool = True):
        """
        Invalidate cache key and optionally propagate to other instances.
        
        Args:
            key: Cache key to invalidate
            propagate: Whether to propagate invalidation via pub/sub
        """
        # Invalidate locally
        await self.cache.delete(key)
        
        # Apply invalidation rules
        await self._apply_invalidation_rules(key)
        
        # Propagate to other instances
        if propagate:
            await self.redis.publish('cache:invalidate', json.dumps({
                'key': key,
                'timestamp': time.time(),
                'source': 'local'
            }))
    
    async def invalidate_pattern(self, pattern: str, propagate: bool = True):
        """
        Invalidate cache keys matching pattern.
        
        Args:
            pattern: Pattern to match cache keys
            propagate: Whether to propagate invalidation via pub/sub
        """
        # Invalidate locally
        deleted = await self.cache.invalidate_pattern(pattern)
        
        # Propagate to other instances
        if propagate:
            await self.redis.publish('cache:invalidate', json.dumps({
                'pattern': pattern,
                'timestamp': time.time(),
                'source': 'local'
            }))
        
        return deleted
    
    def add_invalidation_rule(self, trigger_pattern: str, invalidate_patterns: List[str]):
        """
        Add cache invalidation rule.
        
        Args:
            trigger_pattern: Pattern that triggers invalidation
            invalidate_patterns: Patterns to invalidate when triggered
        """
        self._invalidation_rules[trigger_pattern] = invalidate_patterns
    
    async def _invalidation_loop(self):
        """Main invalidation listener loop."""
        try:
            async for message in self._pubsub.listen():
                if message['type'] == 'message':
                    try:
                        data = json.loads(message['data'])
                        
                        # Skip messages from this instance
                        if data.get('source') == 'local':
                            continue
                        
                        # Handle key invalidation
                        if 'key' in data:
                            await self.cache.delete(data['key'])
                            await self._apply_invalidation_rules(data['key'])
                        
                        # Handle pattern invalidation
                        elif 'pattern' in data:
                            await self.cache.invalidate_pattern(data['pattern'])
                        
                        logger.debug("Processed cache invalidation", data=data)
                        
                    except Exception as e:
                        logger.error("Failed to process invalidation message", error=str(e))
                        
        except asyncio.CancelledError:
            logger.info("Cache invalidation loop cancelled")
        except Exception as e:
            logger.error("Cache invalidation loop error", error=str(e))
    
    async def _apply_invalidation_rules(self, key: str):
        """Apply invalidation rules for a key."""
        import fnmatch
        
        for trigger_pattern, invalidate_patterns in self._invalidation_rules.items():
            if fnmatch.fnmatch(key, trigger_pattern):
                for pattern in invalidate_patterns:
                    await self.cache.invalidate_pattern(pattern)
                    logger.debug("Applied invalidation rule", 
                               trigger=trigger_pattern, invalidated=pattern)


# Cache decorators
def cached(
    ttl: int = 3600,
    key_prefix: str = "",
    cache_instance: Optional[MultiLayerCache] = None
):
    """
    Decorator for caching function results.
    
    Args:
        ttl: Time to live in seconds
        key_prefix: Prefix for cache keys
        cache_instance: Cache instance to use
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key
            key_parts = [key_prefix, func.__name__]
            if args:
                key_parts.extend(str(arg) for arg in args)
            if kwargs:
                key_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()))
            
            cache_key = ":".join(filter(None, key_parts))
            cache_key = hashlib.md5(cache_key.encode()).hexdigest()
            
            # Use global cache if none provided
            cache = cache_instance or _global_cache
            
            # Try to get from cache
            cached_result = await cache.get(cache_key)
            if cached_result is not None:
                return cached_result
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            await cache.set(cache_key, result, ttl)
            
            return result
        
        return wrapper
    return decorator


# Global cache instance
_global_cache: Optional[MultiLayerCache] = None


async def initialize_caching():
    """Initialize global caching system."""
    global _global_cache
    
    try:
        # Create Redis client
        redis_client = redis.Redis.from_url(
            settings.redis.url or "redis://localhost:6379",
            decode_responses=False,  # Keep binary for pickle support
            retry_on_timeout=True,
            socket_keepalive=True,
            socket_keepalive_options={},
            health_check_interval=30
        )
        
        # Test Redis connection
        await redis_client.ping()
        
        # Create cache instances
        memory_cache = MemoryCache(max_size=1000, ttl=3600)
        redis_cache = RedisCache(redis_client, namespace="givemejobs")
        
        # Create multi-layer cache
        _global_cache = MultiLayerCache(
            memory_cache=memory_cache,
            redis_cache=redis_cache,
            config=CacheConfig(ttl=3600, max_size=1000)
        )
        
        logger.info("Caching system initialized successfully")
        
    except Exception as e:
        logger.error("Failed to initialize caching system", error=str(e))
        raise


async def cleanup_caching():
    """Cleanup caching system."""
    global _global_cache
    
    if _global_cache and _global_cache.redis_cache:
        await _global_cache.redis_cache.redis.close()
    
    logger.info("Caching system cleanup completed")


def get_cache() -> MultiLayerCache:
    """Get global cache instance."""
    if _global_cache is None:
        raise RuntimeError("Caching system not initialized")
    return _global_cache