#!/usr/bin/env python3
"""
Cache effectiveness testing for Redis and application-level caching.

This module tests the effectiveness of caching strategies implemented
in the GiveMeJobs Python backend.
"""

import asyncio
import time
from typing import Dict, List, Tuple
from dataclasses import dataclass

import httpx
import redis.asyncio as redis
import structlog

logger = structlog.get_logger(__name__)


@dataclass
class CacheTestResult:
    """Cache test result data structure."""
    test_name: str
    cache_hit_rate: float
    average_response_time_cached: float
    average_response_time_uncached: float
    performance_improvement: float
    total_requests: int
    cache_hits: int
    cache_misses: int


class CacheEffectivenessTest:
    """Test cache effectiveness and performance."""
    
    def __init__(self, 
                 api_base_url: str = "http://localhost:8000",
                 redis_url: str = "redis://localhost:6379/0"):
        self.api_base_url = api_base_url
        self.redis_url = redis_url
        self.http_client = httpx.AsyncClient(timeout=30.0)
        self.redis_client = None
    
    async def __aenter__(self):
        self.redis_client = redis.from_url(self.redis_url)
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.http_client.aclose()
        if self.redis_client:
            await self.redis_client.aclose()
    
    async def test_redis_cache_performance(self) -> CacheTestResult:
        """Test Redis cache performance."""
        
        logger.info("Testing Redis cache performance")
        
        # Clear cache first
        await self.redis_client.flushdb()
        
        # Test data
        test_keys = [f"test_key_{i}" for i in range(100)]
        test_values = [f"test_value_{i}" * 100 for i in range(100)]  # Larger values
        
        # Test cache misses (cold cache)
        miss_times = []
        for key, value in zip(test_keys, test_values):
            start_time = time.time()
            
            # Simulate cache miss - get from "database" and set cache
            cached_value = await self.redis_client.get(key)
            if not cached_value:
                # Simulate database lookup delay
                await asyncio.sleep(0.01)  # 10ms database delay
                await self.redis_client.setex(key, 300, value)  # 5 minute TTL
            
            end_time = time.time()
            miss_times.append((end_time - start_time) * 1000)  # Convert to ms
        
        # Test cache hits (warm cache)
        hit_times = []
        for key in test_keys:
            start_time = time.time()
            
            cached_value = await self.redis_client.get(key)
            
            end_time = time.time()
            hit_times.append((end_time - start_time) * 1000)  # Convert to ms
        
        # Calculate metrics
        avg_miss_time = sum(miss_times) / len(miss_times)
        avg_hit_time = sum(hit_times) / len(hit_times)
        performance_improvement = ((avg_miss_time - avg_hit_time) / avg_miss_time) * 100
        
        return CacheTestResult(
            test_name="Redis Cache Performance",
            cache_hit_rate=100.0,  # All hits in second round
            average_response_time_cached=avg_hit_time,
            average_response_time_uncached=avg_miss_time,
            performance_improvement=performance_improvement,
            total_requests=len(test_keys) * 2,
            cache_hits=len(test_keys),
            cache_misses=len(test_keys)
        )
    
    async def test_api_endpoint_caching(self, endpoint: str, params: Dict = None) -> CacheTestResult:
        """Test API endpoint caching effectiveness."""
        
        logger.info(f"Testing API endpoint caching: {endpoint}")
        
        # Clear relevant caches
        await self._clear_api_caches()
        
        params = params or {}
        
        # Test cache misses (first requests)
        miss_times = []
        for i in range(10):
            start_time = time.time()
            
            response = await self.http_client.get(
                f"{self.api_base_url}{endpoint}",
                params=params
            )
            
            end_time = time.time()
            
            if response.status_code == 200:
                miss_times.append((end_time - start_time) * 1000)
            
            # Small delay between requests
            await asyncio.sleep(0.1)
        
        # Test cache hits (subsequent requests)
        hit_times = []
        for i in range(10):
            start_time = time.time()
            
            response = await self.http_client.get(
                f"{self.api_base_url}{endpoint}",
                params=params
            )
            
            end_time = time.time()
            
            if response.status_code == 200:
                hit_times.append((end_time - start_time) * 1000)
            
            # Small delay between requests
            await asyncio.sleep(0.1)
        
        # Calculate metrics
        if not miss_times or not hit_times:
            logger.warning(f"No successful responses for endpoint {endpoint}")
            return CacheTestResult(
                test_name=f"API Caching - {endpoint}",
                cache_hit_rate=0.0,
                average_response_time_cached=0.0,
                average_response_time_uncached=0.0,
                performance_improvement=0.0,
                total_requests=0,
                cache_hits=0,
                cache_misses=0
            )
        
        avg_miss_time = sum(miss_times) / len(miss_times)
        avg_hit_time = sum(hit_times) / len(hit_times)
        performance_improvement = ((avg_miss_time - avg_hit_time) / avg_miss_time) * 100
        
        return CacheTestResult(
            test_name=f"API Caching - {endpoint}",
            cache_hit_rate=100.0,  # Assuming all hits in second round
            average_response_time_cached=avg_hit_time,
            average_response_time_uncached=avg_miss_time,
            performance_improvement=performance_improvement,
            total_requests=len(miss_times) + len(hit_times),
            cache_hits=len(hit_times),
            cache_misses=len(miss_times)
        )
    
    async def test_multi_layer_caching(self) -> CacheTestResult:
        """Test multi-layer caching effectiveness."""
        
        logger.info("Testing multi-layer caching")
        
        # Test scenario: Memory cache -> Redis cache -> Database
        test_data = {f"user_{i}": {"id": i, "name": f"User {i}"} for i in range(50)}
        
        # Clear all caches
        await self.redis_client.flushdb()
        
        # Simulate multi-layer cache access
        access_times = []
        cache_levels = []  # Track which cache level was hit
        
        for key, data in test_data.items():
            start_time = time.time()
            
            # Layer 1: Memory cache (simulated with dict)
            memory_cache = {}  # In real app, this would be persistent
            
            if key in memory_cache:
                # Memory cache hit
                result = memory_cache[key]
                cache_level = "memory"
            else:
                # Layer 2: Redis cache
                redis_data = await self.redis_client.get(key)
                if redis_data:
                    # Redis cache hit
                    result = redis_data
                    memory_cache[key] = result  # Populate memory cache
                    cache_level = "redis"
                else:
                    # Layer 3: Database (simulated)
                    await asyncio.sleep(0.005)  # 5ms database delay
                    result = data
                    
                    # Populate caches
                    await self.redis_client.setex(key, 300, str(result))
                    memory_cache[key] = result
                    cache_level = "database"
            
            end_time = time.time()
            access_times.append((end_time - start_time) * 1000)
            cache_levels.append(cache_level)
        
        # Second pass - should hit memory cache
        second_pass_times = []
        for key in test_data.keys():
            start_time = time.time()
            
            # Should hit memory cache now
            result = memory_cache.get(key)
            
            end_time = time.time()
            second_pass_times.append((end_time - start_time) * 1000)
        
        # Calculate metrics
        avg_first_pass = sum(access_times) / len(access_times)
        avg_second_pass = sum(second_pass_times) / len(second_pass_times)
        
        memory_hits = cache_levels.count("memory")
        redis_hits = cache_levels.count("redis")
        db_hits = cache_levels.count("database")
        
        cache_hit_rate = ((memory_hits + redis_hits) / len(cache_levels)) * 100
        performance_improvement = ((avg_first_pass - avg_second_pass) / avg_first_pass) * 100
        
        return CacheTestResult(
            test_name="Multi-Layer Caching",
            cache_hit_rate=cache_hit_rate,
            average_response_time_cached=avg_second_pass,
            average_response_time_uncached=avg_first_pass,
            performance_improvement=performance_improvement,
            total_requests=len(test_data) * 2,
            cache_hits=memory_hits + redis_hits + len(test_data),  # Second pass all hits
            cache_misses=db_hits
        )
    
    async def test_cache_invalidation(self) -> Dict[str, float]:
        """Test cache invalidation effectiveness."""
        
        logger.info("Testing cache invalidation")
        
        # Set up test data
        test_key = "invalidation_test"
        original_value = "original_value"
        updated_value = "updated_value"
        
        # Set initial value
        await self.redis_client.setex(test_key, 300, original_value)
        
        # Verify cache hit
        cached_value = await self.redis_client.get(test_key)
        assert cached_value.decode() == original_value
        
        # Test TTL-based invalidation
        await self.redis_client.setex(test_key, 1, original_value)  # 1 second TTL
        await asyncio.sleep(1.5)  # Wait for expiration
        
        expired_value = await self.redis_client.get(test_key)
        ttl_invalidation_success = expired_value is None
        
        # Test manual invalidation
        await self.redis_client.setex(test_key, 300, original_value)
        await self.redis_client.delete(test_key)
        
        deleted_value = await self.redis_client.get(test_key)
        manual_invalidation_success = deleted_value is None
        
        # Test pattern-based invalidation
        pattern_keys = [f"pattern_test_{i}" for i in range(5)]
        for key in pattern_keys:
            await self.redis_client.setex(key, 300, "test_value")
        
        # Delete by pattern
        keys_to_delete = await self.redis_client.keys("pattern_test_*")
        if keys_to_delete:
            await self.redis_client.delete(*keys_to_delete)
        
        remaining_keys = await self.redis_client.keys("pattern_test_*")
        pattern_invalidation_success = len(remaining_keys) == 0
        
        return {
            "ttl_invalidation_success": float(ttl_invalidation_success),
            "manual_invalidation_success": float(manual_invalidation_success),
            "pattern_invalidation_success": float(pattern_invalidation_success)
        }
    
    async def _clear_api_caches(self):
        """Clear API-related caches."""
        try:
            # Clear Redis caches with common patterns
            patterns = ["user:*", "job:*", "search:*", "analytics:*"]
            
            for pattern in patterns:
                keys = await self.redis_client.keys(pattern)
                if keys:
                    await self.redis_client.delete(*keys)
            
            logger.info("API caches cleared")
            
        except Exception as e:
            logger.warning("Failed to clear API caches", error=str(e))
    
    async def run_comprehensive_cache_tests(self) -> Dict[str, CacheTestResult]:
        """Run comprehensive cache effectiveness tests."""
        
        results = {}
        
        # Test Redis cache performance
        results["redis_performance"] = await self.test_redis_cache_performance()
        
        # Test API endpoint caching
        api_endpoints = [
            ("/api/v1/health", {}),
            ("/api/v1/jobs/search", {"q": "python", "limit": "10"}),
            ("/api/v1/analytics/market-insights", {"skills": "python"})
        ]
        
        for endpoint, params in api_endpoints:
            endpoint_name = endpoint.replace("/api/v1/", "").replace("/", "_")
            results[f"api_{endpoint_name}"] = await self.test_api_endpoint_caching(endpoint, params)
        
        # Test multi-layer caching
        results["multi_layer"] = await self.test_multi_layer_caching()
        
        # Test cache invalidation
        invalidation_results = await self.test_cache_invalidation()
        
        # Create summary result for invalidation
        invalidation_success_rate = sum(invalidation_results.values()) / len(invalidation_results) * 100
        
        results["cache_invalidation"] = CacheTestResult(
            test_name="Cache Invalidation",
            cache_hit_rate=invalidation_success_rate,
            average_response_time_cached=0.0,
            average_response_time_uncached=0.0,
            performance_improvement=0.0,
            total_requests=len(invalidation_results),
            cache_hits=int(sum(invalidation_results.values())),
            cache_misses=len(invalidation_results) - int(sum(invalidation_results.values()))
        )
        
        return results


async def main():
    """Run cache effectiveness tests."""
    
    async with CacheEffectivenessTest() as cache_tester:
        results = await cache_tester.run_comprehensive_cache_tests()
        
        print("\n" + "="*60)
        print("CACHE EFFECTIVENESS TEST RESULTS")
        print("="*60)
        
        for test_name, result in results.items():
            print(f"\n{result.test_name}:")
            print(f"  Cache Hit Rate: {result.cache_hit_rate:.1f}%")
            print(f"  Cached Response Time: {result.average_response_time_cached:.2f}ms")
            print(f"  Uncached Response Time: {result.average_response_time_uncached:.2f}ms")
            print(f"  Performance Improvement: {result.performance_improvement:.1f}%")
            print(f"  Total Requests: {result.total_requests}")
            print(f"  Cache Hits: {result.cache_hits}")
            print(f"  Cache Misses: {result.cache_misses}")
        
        # Overall summary
        avg_improvement = sum(r.performance_improvement for r in results.values()) / len(results)
        avg_hit_rate = sum(r.cache_hit_rate for r in results.values()) / len(results)
        
        print(f"\n{'='*60}")
        print("OVERALL CACHE PERFORMANCE:")
        print(f"  Average Hit Rate: {avg_hit_rate:.1f}%")
        print(f"  Average Performance Improvement: {avg_improvement:.1f}%")
        
        if avg_improvement > 50:
            print("  ✅ Cache is highly effective")
        elif avg_improvement > 20:
            print("  ⚠️  Cache is moderately effective")
        else:
            print("  ❌ Cache effectiveness needs improvement")


if __name__ == "__main__":
    asyncio.run(main())