"""
Advanced Multi-Layer Caching Service with Redis Cluster Support
Implements cache-aside pattern, intelligent cache warming, and event-driven invalidation
"""

import asyncio
import json
import time
from typing import Any, Dict, List, Optional, Union, Callable, Set
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import hashlib
import pickle
import structlog
from redis.asyncio import Redis, RedisCluster
from redis.asyncio.connection import ConnectionPool
from redis.exceptions import RedisError, ConnectionError
import aioredis
from pydantic import BaseModel, Field
from contextlib import asynccontextmanager

logger = structlog.get_logger()

class CacheLevel(Enum):
    """Cache levels in order of priority"""
    MEMORY = "memory"
    REDIS = "redis"
    PERSISTENT = "persistent"

class CacheStrategy(Enum):
    """Cache strategies for different use cases"""
    CACHE_ASIDE = "cache_aside"
    WRITE_THROUGH = "write_through"
    WRITE_BEHIND = "write_behind"
    REFRESH_AHEAD = "refresh_ahead"

@dataclass
class CacheConfig:
    """Configuration for cache service"""
    redis_cluster_nodes: List[Dict[str, Union[str, int]]]
    redis_password: Optional[str] = None
    memory_cache_size: int = 10000
    default_ttl: int = 3600  # 1 hour
    cache_warming_enabled: bool = True
    cache_warming_interval: int = 300  # 5 minutes
    compression_enabled: bool = True
    compression_threshold: int = 1024  # bytes
    metrics_enabled: bool = True
    circuit_breaker_enabled: bool = True
    circuit_breaker_failure_threshold: int = 5
    circuit_breaker_recovery_timeout: int = 60

@dataclass
class CacheItem:
    """Cache item with metadata"""
    value: Any
    created_at: float
    expires_at: float
    access_count: int = 0
    last_accessed: float = 0
    size_bytes: int = 0
    cache_level: CacheLevel = CacheLevel.MEMORY

class CacheMetrics(BaseModel):
    """Cache performance metrics"""
    hits: int = 0
    misses: int = 0
    sets: int = 0
    deletes: int = 0
    evictions: int = 0
    memory_usage_bytes: int = 0
    redis_usage_bytes: int = 0
    average_response_time_ms: float = 0
    hit_rate: float = 0
    
    def calculate_hit_rate(self):
        total = self.hits + self.misses
        self.hit_rate = (self.hits / total * 100) if total > 0 else 0

class CircuitBreaker:
    """Circuit breaker for Redis operations"""
    
    def __init__(self, failure_threshold: int = 5, recovery_timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.last_failure_time = 0
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
    
    def can_execute(self) -> bool:
        if self.state == "CLOSED":
            return True
        elif self.state == "OPEN":
            if time.time() - self.last_failure_time > self.recovery_timeout:
                self.state = "HALF_OPEN"
                return True
            return False
        else:  # HALF_OPEN
            return True
    
    def record_success(self):
        self.failure_count = 0
        self.state = "CLOSED"
    
    def record_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.failure_count >= self.failure_threshold:
            self.state = "OPEN"

class AdvancedCacheService:
    """Advanced multi-layer caching service with Redis cluster support"""
    
    def __init__(self, config: CacheConfig):
        self.config = config
        self.memory_cache: Dict[str, CacheItem] = {}
        self.redis_cluster: Optional[RedisCluster] = None
        self.redis_pool: Optional[ConnectionPool] = None
        self.metrics = CacheMetrics()
        self.circuit_breaker = CircuitBreaker(
            config.circuit_breaker_failure_threshold,
            config.circuit_breaker_recovery_timeout
        ) if config.circuit_breaker_enabled else None
        
        # Cache warming
        self.cache_warming_tasks: Set[str] = set()
        self.warming_functions: Dict[str, Callable] = {}
        
        # Event-driven invalidation
        self.invalidation_patterns: Dict[str, Set[str]] = {}
        self.event_subscribers: Dict[str, List[Callable]] = {}
        
        # Performance tracking
        self.operation_times: List[float] = []
        
    async def initialize(self):
        """Initialize Redis cluster connection"""
        try:
            # Create Redis cluster connection
            startup_nodes = [
                {"host": node["host"], "port": node["port"]} 
                for node in self.config.redis_cluster_nodes
            ]
            
            self.redis_cluster = RedisCluster(
                startup_nodes=startup_nodes,
                password=self.config.redis_password,
                decode_responses=False,  # We handle encoding ourselves
                skip_full_coverage_check=True,
                health_check_interval=30,
                retry_on_timeout=True,
                socket_keepalive=True,
                socket_keepalive_options={},
            )
            
            # Test connection
            await self.redis_cluster.ping()
            logger.info("Redis cluster initialized successfully", 
                       nodes=len(startup_nodes))
            
            # Start background tasks
            if self.config.cache_warming_enabled:
                asyncio.create_task(self._cache_warming_loop())
            
            asyncio.create_task(self._metrics_collection_loop())
            asyncio.create_task(self._memory_cleanup_loop())
            
        except Exception as e:
            logger.error("Failed to initialize Redis cluster", error=str(e))
            # Continue with memory-only caching
    
    async def get(self, key: str, default: Any = None) -> Any:
        """Get value from cache with multi-layer fallback"""
        start_time = time.time()
        
        try:
            # Try memory cache first
            memory_item = self.memory_cache.get(key)
            if memory_item and memory_item.expires_at > time.time():
                memory_item.access_count += 1
                memory_item.last_accessed = time.time()
                self.metrics.hits += 1
                
                logger.debug("Cache hit (memory)", key=key)
                return memory_item.value
            
            # Try Redis cluster
            if self.redis_cluster and self._can_use_redis():
                try:
                    redis_value = await self.redis_cluster.get(key)
                    if redis_value:
                        # Deserialize value
                        value = self._deserialize(redis_value)
                        
                        # Store in memory cache for faster access
                        await self._set_memory_cache(key, value, self.config.default_ttl)
                        
                        self.metrics.hits += 1
                        logger.debug("Cache hit (redis)", key=key)
                        return value
                        
                except RedisError as e:
                    logger.warning("Redis get failed", key=key, error=str(e))
                    if self.circuit_breaker:
                        self.circuit_breaker.record_failure()
            
            # Cache miss
            self.metrics.misses += 1
            logger.debug("Cache miss", key=key)
            return default
            
        finally:
            # Track operation time
            operation_time = (time.time() - start_time) * 1000
            self.operation_times.append(operation_time)
            if len(self.operation_times) > 1000:
                self.operation_times = self.operation_times[-1000:]
    
    async def set(
        self, 
        key: str, 
        value: Any, 
        ttl: Optional[int] = None,
        strategy: CacheStrategy = CacheStrategy.CACHE_ASIDE
    ) -> bool:
        """Set value in cache with specified strategy"""
        start_time = time.time()
        actual_ttl = ttl or self.config.default_ttl
        
        try:
            success = False
            
            if strategy == CacheStrategy.CACHE_ASIDE:
                success = await self._set_cache_aside(key, value, actual_ttl)
            elif strategy == CacheStrategy.WRITE_THROUGH:
                success = await self._set_write_through(key, value, actual_ttl)
            elif strategy == CacheStrategy.WRITE_BEHIND:
                success = await self._set_write_behind(key, value, actual_ttl)
            
            if success:
                self.metrics.sets += 1
                
                # Trigger cache warming for related keys
                await self._trigger_cache_warming(key)
                
                # Notify event subscribers
                await self._notify_cache_event("set", key, value)
            
            return success
            
        finally:
            operation_time = (time.time() - start_time) * 1000
            self.operation_times.append(operation_time)
    
    async def _set_cache_aside(self, key: str, value: Any, ttl: int) -> bool:
        """Cache-aside pattern: set in both memory and Redis"""
        success = True
        
        # Set in memory cache
        await self._set_memory_cache(key, value, ttl)
        
        # Set in Redis cluster
        if self.redis_cluster and self._can_use_redis():
            try:
                serialized = self._serialize(value)
                await self.redis_cluster.setex(key, ttl, serialized)
                
                if self.circuit_breaker:
                    self.circuit_breaker.record_success()
                    
            except RedisError as e:
                logger.warning("Redis set failed", key=key, error=str(e))
                if self.circuit_breaker:
                    self.circuit_breaker.record_failure()
                success = False
        
        return success
    
    async def _set_write_through(self, key: str, value: Any, ttl: int) -> bool:
        """Write-through pattern: write to Redis first, then memory"""
        if self.redis_cluster and self._can_use_redis():
            try:
                serialized = self._serialize(value)
                await self.redis_cluster.setex(key, ttl, serialized)
                
                # Then set in memory
                await self._set_memory_cache(key, value, ttl)
                
                if self.circuit_breaker:
                    self.circuit_breaker.record_success()
                return True
                
            except RedisError as e:
                logger.warning("Redis write-through failed", key=key, error=str(e))
                if self.circuit_breaker:
                    self.circuit_breaker.record_failure()
                
                # Fallback to memory only
                await self._set_memory_cache(key, value, ttl)
                return False
        else:
            # Redis not available, use memory only
            await self._set_memory_cache(key, value, ttl)
            return False
    
    async def _set_write_behind(self, key: str, value: Any, ttl: int) -> bool:
        """Write-behind pattern: write to memory immediately, Redis asynchronously"""
        # Set in memory immediately
        await self._set_memory_cache(key, value, ttl)
        
        # Schedule Redis write asynchronously
        if self.redis_cluster and self._can_use_redis():
            asyncio.create_task(self._async_redis_write(key, value, ttl))
        
        return True
    
    async def _async_redis_write(self, key: str, value: Any, ttl: int):
        """Asynchronous Redis write for write-behind pattern"""
        try:
            serialized = self._serialize(value)
            await self.redis_cluster.setex(key, ttl, serialized)
            
            if self.circuit_breaker:
                self.circuit_breaker.record_success()
                
        except RedisError as e:
            logger.warning("Async Redis write failed", key=key, error=str(e))
            if self.circuit_breaker:
                self.circuit_breaker.record_failure()
    
    async def _set_memory_cache(self, key: str, value: Any, ttl: int):
        """Set value in memory cache with LRU eviction"""
        # Check memory limit
        if len(self.memory_cache) >= self.config.memory_cache_size:
            await self._evict_lru_items()
        
        # Calculate size
        size_bytes = len(pickle.dumps(value))
        
        # Create cache item
        cache_item = CacheItem(
            value=value,
            created_at=time.time(),
            expires_at=time.time() + ttl,
            size_bytes=size_bytes,
            cache_level=CacheLevel.MEMORY
        )
        
        self.memory_cache[key] = cache_item
        self.metrics.memory_usage_bytes += size_bytes
    
    async def _evict_lru_items(self):
        """Evict least recently used items from memory cache"""
        if not self.memory_cache:
            return
        
        # Sort by last accessed time (or created time if never accessed)
        sorted_items = sorted(
            self.memory_cache.items(),
            key=lambda x: x[1].last_accessed or x[1].created_at
        )
        
        # Remove oldest 10% of items
        items_to_remove = max(1, len(sorted_items) // 10)
        
        for i in range(items_to_remove):
            key, item = sorted_items[i]
            del self.memory_cache[key]
            self.metrics.memory_usage_bytes -= item.size_bytes
            self.metrics.evictions += 1
        
        logger.debug("Memory cache LRU eviction", items_removed=items_to_remove)
    
    async def delete(self, key: str) -> bool:
        """Delete key from all cache levels"""
        success = True
        
        # Delete from memory
        if key in self.memory_cache:
            item = self.memory_cache.pop(key)
            self.metrics.memory_usage_bytes -= item.size_bytes
            self.metrics.deletes += 1
        
        # Delete from Redis
        if self.redis_cluster and self._can_use_redis():
            try:
                await self.redis_cluster.delete(key)
                if self.circuit_breaker:
                    self.circuit_breaker.record_success()
            except RedisError as e:
                logger.warning("Redis delete failed", key=key, error=str(e))
                if self.circuit_breaker:
                    self.circuit_breaker.record_failure()
                success = False
        
        # Notify event subscribers
        await self._notify_cache_event("delete", key, None)
        
        return success
    
    async def invalidate_pattern(self, pattern: str) -> int:
        """Invalidate keys matching pattern"""
        invalidated_count = 0
        
        # Invalidate memory cache
        keys_to_delete = []
        for key in self.memory_cache:
            if self._match_pattern(key, pattern):
                keys_to_delete.append(key)
        
        for key in keys_to_delete:
            await self.delete(key)
            invalidated_count += 1
        
        # Invalidate Redis cache
        if self.redis_cluster and self._can_use_redis():
            try:
                # Use SCAN to find matching keys
                async for key in self.redis_cluster.scan_iter(match=pattern):
                    await self.redis_cluster.delete(key)
                    invalidated_count += 1
                    
            except RedisError as e:
                logger.warning("Redis pattern invalidation failed", 
                             pattern=pattern, error=str(e))
        
        logger.info("Cache pattern invalidation completed", 
                   pattern=pattern, count=invalidated_count)
        
        return invalidated_count
    
    def register_cache_warming(self, key_pattern: str, warming_function: Callable):
        """Register a function for cache warming"""
        self.warming_functions[key_pattern] = warming_function
        logger.info("Cache warming registered", pattern=key_pattern)
    
    async def _trigger_cache_warming(self, key: str):
        """Trigger cache warming for related keys"""
        if not self.config.cache_warming_enabled:
            return
        
        for pattern, warming_func in self.warming_functions.items():
            if self._match_pattern(key, pattern):
                if pattern not in self.cache_warming_tasks:
                    self.cache_warming_tasks.add(pattern)
                    asyncio.create_task(self._execute_cache_warming(pattern, warming_func))
    
    async def _execute_cache_warming(self, pattern: str, warming_func: Callable):
        """Execute cache warming function"""
        try:
            await warming_func()
            logger.debug("Cache warming completed", pattern=pattern)
        except Exception as e:
            logger.error("Cache warming failed", pattern=pattern, error=str(e))
        finally:
            self.cache_warming_tasks.discard(pattern)
    
    async def _cache_warming_loop(self):
        """Background cache warming loop"""
        while True:
            try:
                await asyncio.sleep(self.config.cache_warming_interval)
                
                for pattern, warming_func in self.warming_functions.items():
                    if pattern not in self.cache_warming_tasks:
                        asyncio.create_task(self._execute_cache_warming(pattern, warming_func))
                        
            except Exception as e:
                logger.error("Cache warming loop error", error=str(e))
    
    def subscribe_to_events(self, event_type: str, callback: Callable):
        """Subscribe to cache events for invalidation"""
        if event_type not in self.event_subscribers:
            self.event_subscribers[event_type] = []
        self.event_subscribers[event_type].append(callback)
    
    async def _notify_cache_event(self, event_type: str, key: str, value: Any):
        """Notify event subscribers"""
        if event_type in self.event_subscribers:
            for callback in self.event_subscribers[event_type]:
                try:
                    await callback(key, value)
                except Exception as e:
                    logger.error("Event callback failed", 
                               event_type=event_type, key=key, error=str(e))
    
    async def _metrics_collection_loop(self):
        """Background metrics collection"""
        while True:
            try:
                await asyncio.sleep(60)  # Collect metrics every minute
                
                # Calculate hit rate
                self.metrics.calculate_hit_rate()
                
                # Calculate average response time
                if self.operation_times:
                    self.metrics.average_response_time_ms = sum(self.operation_times) / len(self.operation_times)
                
                # Log metrics
                logger.info("Cache metrics", **asdict(self.metrics))
                
            except Exception as e:
                logger.error("Metrics collection error", error=str(e))
    
    async def _memory_cleanup_loop(self):
        """Background memory cleanup for expired items"""
        while True:
            try:
                await asyncio.sleep(300)  # Cleanup every 5 minutes
                
                current_time = time.time()
                expired_keys = []
                
                for key, item in self.memory_cache.items():
                    if item.expires_at < current_time:
                        expired_keys.append(key)
                
                for key in expired_keys:
                    item = self.memory_cache.pop(key)
                    self.metrics.memory_usage_bytes -= item.size_bytes
                
                if expired_keys:
                    logger.debug("Memory cache cleanup", expired_items=len(expired_keys))
                    
            except Exception as e:
                logger.error("Memory cleanup error", error=str(e))
    
    def _can_use_redis(self) -> bool:
        """Check if Redis can be used based on circuit breaker"""
        if not self.circuit_breaker:
            return True
        return self.circuit_breaker.can_execute()
    
    def _serialize(self, value: Any) -> bytes:
        """Serialize value for Redis storage"""
        if self.config.compression_enabled:
            serialized = pickle.dumps(value)
            if len(serialized) > self.config.compression_threshold:
                import gzip
                return gzip.compress(serialized)
            return serialized
        else:
            return pickle.dumps(value)
    
    def _deserialize(self, data: bytes) -> Any:
        """Deserialize value from Redis"""
        if self.config.compression_enabled:
            try:
                # Try to decompress first
                import gzip
                decompressed = gzip.decompress(data)
                return pickle.loads(decompressed)
            except:
                # Not compressed
                return pickle.loads(data)
        else:
            return pickle.loads(data)
    
    def _match_pattern(self, key: str, pattern: str) -> bool:
        """Match key against pattern (supports * wildcards)"""
        import fnmatch
        return fnmatch.fnmatch(key, pattern)
    
    async def get_metrics(self) -> CacheMetrics:
        """Get current cache metrics"""
        self.metrics.calculate_hit_rate()
        return self.metrics
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform health check on cache service"""
        health = {
            "memory_cache": True,
            "redis_cluster": False,
            "circuit_breaker_state": self.circuit_breaker.state if self.circuit_breaker else "disabled",
            "metrics": asdict(self.metrics)
        }
        
        if self.redis_cluster:
            try:
                await self.redis_cluster.ping()
                health["redis_cluster"] = True
            except:
                pass
        
        return health
    
    async def close(self):
        """Close all connections and cleanup"""
        if self.redis_cluster:
            await self.redis_cluster.close()
        
        self.memory_cache.clear()
        logger.info("Cache service closed")

# Factory function for creating cache service
async def create_cache_service(config: CacheConfig) -> AdvancedCacheService:
    """Create and initialize cache service"""
    service = AdvancedCacheService(config)
    await service.initialize()
    return service