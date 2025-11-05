"""Redis cache service with async support and multi-layer caching."""

import json
import pickle
from typing import Any, Dict, List, Optional, Union
from datetime import datetime, timedelta

import redis.asyncio as redis
from redis.asyncio import Redis

from .config import get_settings
from .logging import get_logger

settings = get_settings()
logger = get_logger(__name__)


class CacheService:
    """Async Redis cache service with multi-layer caching support."""
    
    def __init__(self):
        self.redis_client: Optional[Redis] = None
        self.memory_cache: Dict[str, Dict[str, Any]] = {}
        self.memory_cache_ttl: Dict[str, datetime] = {}
        self.max_memory_items = 1000
        
    async def initialize(self) -> None:
        """Initialize Redis connection."""
        try:
            self.redis_client = redis.from_url(
                settings.redis.url,
                max_connections=settings.redis.max_connections,
                socket_timeout=settings.redis.socket_timeout,
                socket_connect_timeout=settings.redis.socket_connect_timeout,
                retry_on_timeout=settings.redis.retry_on_timeout,
                health_check_interval=settings.redis.health_check_interval,
                decode_responses=True
            )
            
            # Test connection
            await self.redis_client.ping()
            logger.info("Redis cache service initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Redis cache: {e}")
            self.redis_client = None
    
    async def close(self) -> None:
        """Close Redis connection."""
        if self.redis_client:
            await self.redis_client.close()
            logger.info("Redis cache service closed")
    
    def _clean_memory_cache(self) -> None:
        """Clean expired items from memory cache."""
        now = datetime.utcnow()
        expired_keys = [
            key for key, expiry in self.memory_cache_ttl.items()
            if expiry < now
        ]
        
        for key in expired_keys:
            self.memory_cache.pop(key, None)
            self.memory_cache_ttl.pop(key, None)
        
        # Limit memory cache size
        if len(self.memory_cache) > self.max_memory_items:
            # Remove oldest items
            sorted_items = sorted(
                self.memory_cache_ttl.items(),
                key=lambda x: x[1]
            )
            items_to_remove = len(self.memory_cache) - self.max_memory_items
            
            for key, _ in sorted_items[:items_to_remove]:
                self.memory_cache.pop(key, None)
                self.memory_cache_ttl.pop(key, None)
    
    async def get(self, key: str, use_memory_cache: bool = True) -> Optional[Any]:
        """Get value from cache (memory first, then Redis)."""
        try:
            # Check memory cache first
            if use_memory_cache:
                self._clean_memory_cache()
                if key in self.memory_cache:
                    expiry = self.memory_cache_ttl.get(key)
                    if expiry and expiry > datetime.utcnow():
                        return self.memory_cache[key]['value']
                    else:
                        # Expired, remove from memory cache
                        self.memory_cache.pop(key, None)
                        self.memory_cache_ttl.pop(key, None)
            
            # Check Redis cache
            if self.redis_client:
                cached_data = await self.redis_client.get(key)
                if cached_data:
                    try:
                        # Try JSON first
                        data = json.loads(cached_data)
                    except json.JSONDecodeError:
                        # Fallback to pickle
                        data = pickle.loads(cached_data.encode('latin-1'))
                    
                    # Store in memory cache for faster access
                    if use_memory_cache:
                        ttl = await self.redis_client.ttl(key)
                        if ttl > 0:
                            expiry = datetime.utcnow() + timedelta(seconds=ttl)
                            self.memory_cache[key] = {'value': data}
                            self.memory_cache_ttl[key] = expiry
                    
                    return data
            
            return None
            
        except Exception as e:
            logger.warning(f"Cache get failed for key {key}: {e}")
            return None
    
    async def set(
        self, 
        key: str, 
        value: Any, 
        ttl: int = 3600,
        use_memory_cache: bool = True
    ) -> bool:
        """Set value in cache (both memory and Redis)."""
        try:
            # Store in Redis
            if self.redis_client:
                try:
                    # Try JSON serialization first
                    serialized_data = json.dumps(value, default=str)
                except (TypeError, ValueError):
                    # Fallback to pickle
                    serialized_data = pickle.dumps(value).decode('latin-1')
                
                await self.redis_client.setex(key, ttl, serialized_data)
            
            # Store in memory cache
            if use_memory_cache:
                self._clean_memory_cache()
                expiry = datetime.utcnow() + timedelta(seconds=ttl)
                self.memory_cache[key] = {'value': value}
                self.memory_cache_ttl[key] = expiry
            
            return True
            
        except Exception as e:
            logger.warning(f"Cache set failed for key {key}: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete value from cache."""
        try:
            # Remove from memory cache
            self.memory_cache.pop(key, None)
            self.memory_cache_ttl.pop(key, None)
            
            # Remove from Redis
            if self.redis_client:
                await self.redis_client.delete(key)
            
            return True
            
        except Exception as e:
            logger.warning(f"Cache delete failed for key {key}: {e}")
            return False
    
    async def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern."""
        try:
            deleted_count = 0
            
            # Remove from memory cache
            keys_to_remove = [
                key for key in self.memory_cache.keys()
                if self._match_pattern(key, pattern)
            ]
            
            for key in keys_to_remove:
                self.memory_cache.pop(key, None)
                self.memory_cache_ttl.pop(key, None)
                deleted_count += 1
            
            # Remove from Redis
            if self.redis_client:
                redis_keys = await self.redis_client.keys(pattern)
                if redis_keys:
                    await self.redis_client.delete(*redis_keys)
                    deleted_count += len(redis_keys)
            
            return deleted_count
            
        except Exception as e:
            logger.warning(f"Cache delete pattern failed for pattern {pattern}: {e}")
            return 0
    
    def _match_pattern(self, key: str, pattern: str) -> bool:
        """Simple pattern matching for cache keys."""
        import fnmatch
        return fnmatch.fnmatch(key, pattern)
    
    async def exists(self, key: str) -> bool:
        """Check if key exists in cache."""
        try:
            # Check memory cache first
            self._clean_memory_cache()
            if key in self.memory_cache:
                expiry = self.memory_cache_ttl.get(key)
                if expiry and expiry > datetime.utcnow():
                    return True
            
            # Check Redis
            if self.redis_client:
                return bool(await self.redis_client.exists(key))
            
            return False
            
        except Exception as e:
            logger.warning(f"Cache exists check failed for key {key}: {e}")
            return False
    
    async def ttl(self, key: str) -> int:
        """Get time to live for key."""
        try:
            if self.redis_client:
                return await self.redis_client.ttl(key)
            return -1
            
        except Exception as e:
            logger.warning(f"Cache TTL check failed for key {key}: {e}")
            return -1
    
    async def increment(self, key: str, amount: int = 1) -> int:
        """Increment numeric value in cache."""
        try:
            if self.redis_client:
                return await self.redis_client.incrby(key, amount)
            return 0
            
        except Exception as e:
            logger.warning(f"Cache increment failed for key {key}: {e}")
            return 0
    
    async def set_hash(self, key: str, mapping: Dict[str, Any], ttl: int = 3600) -> bool:
        """Set hash in cache."""
        try:
            if self.redis_client:
                # Convert values to strings
                string_mapping = {k: json.dumps(v, default=str) for k, v in mapping.items()}
                await self.redis_client.hset(key, mapping=string_mapping)
                await self.redis_client.expire(key, ttl)
                return True
            return False
            
        except Exception as e:
            logger.warning(f"Cache hash set failed for key {key}: {e}")
            return False
    
    async def get_hash(self, key: str, field: Optional[str] = None) -> Optional[Union[Dict[str, Any], Any]]:
        """Get hash or hash field from cache."""
        try:
            if self.redis_client:
                if field:
                    value = await self.redis_client.hget(key, field)
                    if value:
                        return json.loads(value)
                else:
                    hash_data = await self.redis_client.hgetall(key)
                    if hash_data:
                        return {k: json.loads(v) for k, v in hash_data.items()}
            return None
            
        except Exception as e:
            logger.warning(f"Cache hash get failed for key {key}: {e}")
            return None
    
    async def add_to_set(self, key: str, *values: Any, ttl: int = 3600) -> int:
        """Add values to set in cache."""
        try:
            if self.redis_client:
                # Convert values to strings
                string_values = [json.dumps(v, default=str) for v in values]
                result = await self.redis_client.sadd(key, *string_values)
                await self.redis_client.expire(key, ttl)
                return result
            return 0
            
        except Exception as e:
            logger.warning(f"Cache set add failed for key {key}: {e}")
            return 0
    
    async def get_set(self, key: str) -> List[Any]:
        """Get all members of set from cache."""
        try:
            if self.redis_client:
                members = await self.redis_client.smembers(key)
                return [json.loads(member) for member in members]
            return []
            
        except Exception as e:
            logger.warning(f"Cache set get failed for key {key}: {e}")
            return []
    
    async def health_check(self) -> Dict[str, Any]:
        """Check cache service health."""
        health_info = {
            "redis_connected": False,
            "memory_cache_items": len(self.memory_cache),
            "memory_cache_expired_items": 0
        }
        
        try:
            if self.redis_client:
                await self.redis_client.ping()
                health_info["redis_connected"] = True
                
                # Get Redis info
                redis_info = await self.redis_client.info()
                health_info["redis_memory_used"] = redis_info.get("used_memory_human", "unknown")
                health_info["redis_connected_clients"] = redis_info.get("connected_clients", 0)
        
        except Exception as e:
            logger.warning(f"Cache health check failed: {e}")
        
        # Check memory cache
        now = datetime.utcnow()
        expired_count = sum(
            1 for expiry in self.memory_cache_ttl.values()
            if expiry < now
        )
        health_info["memory_cache_expired_items"] = expired_count
        
        return health_info


# Global cache service instance
cache_service = CacheService()


async def get_cache_service() -> CacheService:
    """Get cache service instance."""
    return cache_service