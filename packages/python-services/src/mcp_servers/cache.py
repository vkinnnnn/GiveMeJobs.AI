"""Caching layer for MCP servers to improve performance.

Implements in-memory caching with TTL and LRU eviction for frequently accessed data.
"""

import time
from typing import Any, Dict, Optional, Tuple
from collections import OrderedDict
from functools import wraps
import hashlib
import json


class MCPCache:
    """Thread-safe LRU cache with TTL support."""
    
    def __init__(self, max_size: int = 1000, default_ttl: int = 300):
        """
        Initialize cache.
        
        Args:
            max_size: Maximum number of entries to cache
            default_ttl: Default time-to-live in seconds
        """
        self.max_size = max_size
        self.default_ttl = default_ttl
        self._cache: OrderedDict = OrderedDict()
        self._timestamps: Dict[str, float] = {}
        self._hits = 0
        self._misses = 0
    
    def _generate_key(self, *args, **kwargs) -> str:
        """Generate cache key from arguments."""
        key_data = json.dumps({"args": args, "kwargs": kwargs}, sort_keys=True)
        return hashlib.md5(key_data.encode()).hexdigest()
    
    def _is_expired(self, key: str, ttl: Optional[int] = None) -> bool:
        """Check if cache entry is expired."""
        if key not in self._timestamps:
            return True
        
        ttl = ttl or self.default_ttl
        age = time.time() - self._timestamps[key]
        return age > ttl
    
    def get(self, key: str, ttl: Optional[int] = None) -> Optional[Any]:
        """
        Get value from cache.
        
        Args:
            key: Cache key
            ttl: Optional TTL override
            
        Returns:
            Cached value or None if not found/expired
        """
        if key not in self._cache or self._is_expired(key, ttl):
            self._misses += 1
            if key in self._cache:
                del self._cache[key]
                del self._timestamps[key]
            return None
        
        self._hits += 1
        # Move to end (most recently used)
        self._cache.move_to_end(key)
        return self._cache[key]
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """
        Set value in cache.
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: Optional TTL override
        """
        # Remove if exists (to update timestamp)
        if key in self._cache:
            del self._cache[key]
        
        # Evict oldest if at capacity
        if len(self._cache) >= self.max_size:
            oldest_key = next(iter(self._cache))
            del self._cache[oldest_key]
            del self._timestamps[oldest_key]
        
        self._cache[key] = value
        self._timestamps[key] = time.time()
        
        # Move to end
        self._cache.move_to_end(key)
    
    def clear(self) -> None:
        """Clear all cache entries."""
        self._cache.clear()
        self._timestamps.clear()
        self._hits = 0
        self._misses = 0
    
    def stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        total = self._hits + self._misses
        hit_rate = (self._hits / total * 100) if total > 0 else 0
        
        return {
            "size": len(self._cache),
            "max_size": self.max_size,
            "hits": self._hits,
            "misses": self._misses,
            "hit_rate": round(hit_rate, 2),
            "total_requests": total
        }


def cached(ttl: int = 300, key_prefix: str = ""):
    """
    Decorator for caching function results.
    
    Args:
        ttl: Time-to-live in seconds
        key_prefix: Prefix for cache keys
        
    Returns:
        Decorated function
    """
    def decorator(func):
        cache = MCPCache(default_ttl=ttl)
        
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = f"{key_prefix}:{cache._generate_key(*args, **kwargs)}"
            
            # Try cache
            cached_result = cache.get(cache_key, ttl)
            if cached_result is not None:
                return cached_result
            
            # Execute function
            result = await func(*args, **kwargs)
            
            # Cache result (only if successful)
            if isinstance(result, dict) and result.get("success"):
                cache.set(cache_key, result, ttl)
            
            return result
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = f"{key_prefix}:{cache._generate_key(*args, **kwargs)}"
            
            # Try cache
            cached_result = cache.get(cache_key, ttl)
            if cached_result is not None:
                return cached_result
            
            # Execute function
            result = func(*args, **kwargs)
            
            # Cache result (only if successful)
            if isinstance(result, dict) and result.get("success"):
                cache.set(cache_key, result, ttl)
            
            return result
        
        # Store cache reference for testing/monitoring
        if hasattr(func, '__name__'):
            wrapper = async_wrapper if 'async' in str(func) else sync_wrapper
            wrapper.cache = cache
            return wrapper
        
        return async_wrapper
    
    return decorator


class QueryCache:
    """Specialized cache for database queries."""
    
    def __init__(self, max_size: int = 500, ttl: int = 60):
        """Initialize query cache."""
        self._cache = MCPCache(max_size=max_size, default_ttl=ttl)
    
    def get_query_result(self, database: str, query: str, params: Tuple = ()) -> Optional[Dict]:
        """Get cached query result."""
        key = self._make_query_key(database, query, params)
        return self._cache.get(key)
    
    def set_query_result(self, database: str, query: str, params: Tuple, result: Dict) -> None:
        """Cache query result."""
        key = self._make_query_key(database, query, params)
        self._cache.set(key, result)
    
    def _make_query_key(self, database: str, query: str, params: Tuple) -> str:
        """Generate cache key for query."""
        key_data = {
            "database": database,
            "query": query.strip().lower(),
            "params": params
        }
        return self._cache._generate_key(**key_data)
    
    def clear(self) -> None:
        """Clear query cache."""
        self._cache.clear()
    
    def stats(self) -> Dict:
        """Get cache statistics."""
        return self._cache.stats()


class SchemaCache:
    """Specialized cache for database schemas."""
    
    def __init__(self, max_size: int = 100, ttl: int = 600):
        """Initialize schema cache."""
        self._cache = MCPCache(max_size=max_size, default_ttl=ttl)
    
    def get_schema(self, database: str, object_name: Optional[str] = None) -> Optional[Dict]:
        """Get cached schema."""
        key = f"{database}:{object_name or 'all'}"
        return self._cache.get(key)
    
    def set_schema(self, database: str, object_name: Optional[str], schema: Dict) -> None:
        """Cache schema."""
        key = f"{database}:{object_name or 'all'}"
        self._cache.set(key, schema)
    
    def invalidate(self, database: str, object_name: Optional[str] = None) -> None:
        """Invalidate cached schema."""
        if object_name:
            key = f"{database}:{object_name}"
            if key in self._cache._cache:
                del self._cache._cache[key]
                del self._cache._timestamps[key]
        else:
            # Invalidate all schemas for database
            keys_to_delete = [k for k in self._cache._cache.keys() if k.startswith(f"{database}:")]
            for key in keys_to_delete:
                del self._cache._cache[key]
                del self._cache._timestamps[key]
    
    def stats(self) -> Dict:
        """Get cache statistics."""
        return self._cache.stats()


class ContainerCache:
    """Specialized cache for Docker container information."""
    
    def __init__(self, max_size: int = 200, ttl: int = 30):
        """Initialize container cache."""
        self._cache = MCPCache(max_size=max_size, default_ttl=ttl)
    
    def get_container_list(self, all_containers: bool = False) -> Optional[Dict]:
        """Get cached container list."""
        key = f"list:all={all_containers}"
        return self._cache.get(key)
    
    def set_container_list(self, all_containers: bool, result: Dict) -> None:
        """Cache container list."""
        key = f"list:all={all_containers}"
        self._cache.set(key, result)
    
    def get_container_stats(self, container_name: str) -> Optional[Dict]:
        """Get cached container stats."""
        key = f"stats:{container_name}"
        return self._cache.get(key)
    
    def set_container_stats(self, container_name: str, stats: Dict) -> None:
        """Cache container stats."""
        key = f"stats:{container_name}"
        self._cache.set(key, stats)
    
    def invalidate_container(self, container_name: str) -> None:
        """Invalidate all cache entries for a container."""
        keys_to_delete = [k for k in self._cache._cache.keys() 
                         if container_name in k]
        for key in keys_to_delete:
            if key in self._cache._cache:
                del self._cache._cache[key]
                del self._cache._timestamps[key]
    
    def stats(self) -> Dict:
        """Get cache statistics."""
        return self._cache.stats()


# Global cache instances
query_cache = QueryCache()
schema_cache = SchemaCache()
container_cache = ContainerCache()
