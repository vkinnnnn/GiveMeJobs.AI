"""Cache warming strategies and performance monitoring."""

import asyncio
from typing import Dict, List, Any, Optional, Callable
from datetime import datetime, timedelta

from .cache import CacheService
from .logging import get_logger

logger = get_logger(__name__)


class CacheWarmingStrategy:
    """Base class for cache warming strategies."""
    
    def __init__(self, cache_service: CacheService):
        self.cache = cache_service
        self.logger = get_logger(f"{__name__}.{self.__class__.__name__}")
    
    async def warm_cache(self) -> Dict[str, Any]:
        """Warm cache with strategy-specific data."""
        raise NotImplementedError


class PopularJobsCacheWarmer(CacheWarmingStrategy):
    """Cache warmer for popular job listings."""
    
    async def warm_cache(self) -> Dict[str, Any]:
        """Warm cache with popular job listings."""
        try:
            # This would typically query the database for popular jobs
            # For now, we'll simulate the warming process
            
            warmed_keys = []
            
            # Simulate warming popular job categories
            popular_categories = ["software", "data", "marketing", "sales", "design"]
            
            for category in popular_categories:
                cache_key = f"popular_jobs:{category}"
                
                # Simulate job data (in real implementation, this would come from database)
                job_data = {
                    "category": category,
                    "jobs": [f"job_{i}" for i in range(10)],
                    "cached_at": datetime.utcnow().isoformat()
                }
                
                await self.cache.set(cache_key, job_data, ttl=3600)  # 1 hour
                warmed_keys.append(cache_key)
            
            self.logger.info(f"Warmed {len(warmed_keys)} popular job cache keys")
            
            return {
                "strategy": "popular_jobs",
                "warmed_keys": len(warmed_keys),
                "keys": warmed_keys
            }
            
        except Exception as e:
            self.logger.error(f"Failed to warm popular jobs cache: {e}")
            return {"strategy": "popular_jobs", "error": str(e)}


class UserProfileCacheWarmer(CacheWarmingStrategy):
    """Cache warmer for frequently accessed user profiles."""
    
    async def warm_cache(self) -> Dict[str, Any]:
        """Warm cache with active user profiles."""
        try:
            warmed_keys = []
            
            # This would typically query for active users
            # For simulation, we'll warm some sample user profiles
            active_user_ids = [f"user_{i}" for i in range(1, 101)]  # Top 100 active users
            
            for user_id in active_user_ids:
                cache_key = f"user_profile:{user_id}"
                
                # Check if already cached
                if await self.cache.exists(cache_key):
                    continue
                
                # Simulate user profile data
                profile_data = {
                    "user_id": user_id,
                    "skills": [f"skill_{i}" for i in range(5)],
                    "experience": [f"exp_{i}" for i in range(3)],
                    "cached_at": datetime.utcnow().isoformat()
                }
                
                await self.cache.set(cache_key, profile_data, ttl=1800)  # 30 minutes
                warmed_keys.append(cache_key)
                
                # Add small delay to avoid overwhelming the system
                if len(warmed_keys) % 10 == 0:
                    await asyncio.sleep(0.1)
            
            self.logger.info(f"Warmed {len(warmed_keys)} user profile cache keys")
            
            return {
                "strategy": "user_profiles",
                "warmed_keys": len(warmed_keys),
                "keys": warmed_keys[:10]  # Only show first 10 for brevity
            }
            
        except Exception as e:
            self.logger.error(f"Failed to warm user profiles cache: {e}")
            return {"strategy": "user_profiles", "error": str(e)}


class SearchResultsCacheWarmer(CacheWarmingStrategy):
    """Cache warmer for common search queries."""
    
    async def warm_cache(self) -> Dict[str, Any]:
        """Warm cache with common search results."""
        try:
            warmed_keys = []
            
            # Common search terms to pre-cache
            common_searches = [
                "python developer",
                "data scientist", 
                "frontend developer",
                "product manager",
                "marketing manager",
                "sales representative",
                "ui designer",
                "backend engineer",
                "devops engineer",
                "business analyst"
            ]
            
            for search_term in common_searches:
                cache_key = f"search_results:{search_term.replace(' ', '_')}"
                
                # Simulate search results
                search_results = {
                    "query": search_term,
                    "results": [f"job_{i}" for i in range(20)],
                    "total": 150,
                    "cached_at": datetime.utcnow().isoformat()
                }
                
                await self.cache.set(cache_key, search_results, ttl=600)  # 10 minutes
                warmed_keys.append(cache_key)
            
            self.logger.info(f"Warmed {len(warmed_keys)} search results cache keys")
            
            return {
                "strategy": "search_results",
                "warmed_keys": len(warmed_keys),
                "keys": warmed_keys
            }
            
        except Exception as e:
            self.logger.error(f"Failed to warm search results cache: {e}")
            return {"strategy": "search_results", "error": str(e)}


class CacheWarmingManager:
    """Manage cache warming operations."""
    
    def __init__(self, cache_service: CacheService):
        self.cache = cache_service
        self.strategies = [
            PopularJobsCacheWarmer(cache_service),
            UserProfileCacheWarmer(cache_service),
            SearchResultsCacheWarmer(cache_service)
        ]
        self.logger = get_logger(f"{__name__}.CacheWarmingManager")
        self.warming_in_progress = False
    
    async def warm_all_caches(self) -> Dict[str, Any]:
        """Execute all cache warming strategies."""
        if self.warming_in_progress:
            return {"status": "warming_in_progress"}
        
        self.warming_in_progress = True
        start_time = datetime.utcnow()
        
        try:
            results = []
            
            # Execute all warming strategies concurrently
            tasks = [strategy.warm_cache() for strategy in self.strategies]
            strategy_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for result in strategy_results:
                if isinstance(result, Exception):
                    results.append({"error": str(result)})
                else:
                    results.append(result)
            
            end_time = datetime.utcnow()
            duration = (end_time - start_time).total_seconds()
            
            total_warmed = sum(
                r.get("warmed_keys", 0) for r in results 
                if isinstance(r, dict) and "warmed_keys" in r
            )
            
            self.logger.info(f"Cache warming completed: {total_warmed} keys in {duration:.2f}s")
            
            return {
                "status": "completed",
                "duration_seconds": duration,
                "total_warmed_keys": total_warmed,
                "strategies": results,
                "completed_at": end_time.isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Cache warming failed: {e}")
            return {
                "status": "failed",
                "error": str(e),
                "completed_at": datetime.utcnow().isoformat()
            }
        finally:
            self.warming_in_progress = False
    
    async def warm_specific_strategy(self, strategy_name: str) -> Dict[str, Any]:
        """Warm cache using a specific strategy."""
        strategy_map = {
            "popular_jobs": PopularJobsCacheWarmer,
            "user_profiles": UserProfileCacheWarmer,
            "search_results": SearchResultsCacheWarmer
        }
        
        if strategy_name not in strategy_map:
            return {
                "status": "error",
                "message": f"Unknown strategy: {strategy_name}",
                "available_strategies": list(strategy_map.keys())
            }
        
        try:
            strategy = strategy_map[strategy_name](self.cache)
            result = await strategy.warm_cache()
            
            return {
                "status": "completed",
                "strategy": strategy_name,
                "result": result
            }
            
        except Exception as e:
            self.logger.error(f"Failed to warm {strategy_name} cache: {e}")
            return {
                "status": "failed",
                "strategy": strategy_name,
                "error": str(e)
            }


class CachePerformanceMonitor:
    """Monitor cache performance and provide insights."""
    
    def __init__(self, cache_service: CacheService):
        self.cache = cache_service
        self.logger = get_logger(f"{__name__}.CachePerformanceMonitor")
        self.metrics = {
            "hits": 0,
            "misses": 0,
            "sets": 0,
            "deletes": 0,
            "errors": 0
        }
    
    def record_hit(self):
        """Record cache hit."""
        self.metrics["hits"] += 1
    
    def record_miss(self):
        """Record cache miss."""
        self.metrics["misses"] += 1
    
    def record_set(self):
        """Record cache set operation."""
        self.metrics["sets"] += 1
    
    def record_delete(self):
        """Record cache delete operation."""
        self.metrics["deletes"] += 1
    
    def record_error(self):
        """Record cache error."""
        self.metrics["errors"] += 1
    
    def get_hit_rate(self) -> float:
        """Calculate cache hit rate."""
        total_requests = self.metrics["hits"] + self.metrics["misses"]
        if total_requests == 0:
            return 0.0
        return (self.metrics["hits"] / total_requests) * 100
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get all cache metrics."""
        return {
            **self.metrics,
            "hit_rate_percent": self.get_hit_rate(),
            "total_requests": self.metrics["hits"] + self.metrics["misses"]
        }
    
    def reset_metrics(self):
        """Reset all metrics."""
        for key in self.metrics:
            self.metrics[key] = 0
    
    async def get_detailed_performance_report(self) -> Dict[str, Any]:
        """Get detailed cache performance report."""
        try:
            # Get cache health info
            health_info = await self.cache.health_check()
            
            # Get basic metrics
            basic_metrics = self.get_metrics()
            
            # Calculate additional insights
            hit_rate = self.get_hit_rate()
            performance_rating = "excellent" if hit_rate > 90 else \
                               "good" if hit_rate > 75 else \
                               "fair" if hit_rate > 50 else "poor"
            
            return {
                "timestamp": datetime.utcnow().isoformat(),
                "basic_metrics": basic_metrics,
                "health_info": health_info,
                "performance_rating": performance_rating,
                "recommendations": self._generate_recommendations(hit_rate, basic_metrics)
            }
            
        except Exception as e:
            self.logger.error(f"Failed to generate performance report: {e}")
            return {
                "timestamp": datetime.utcnow().isoformat(),
                "error": str(e)
            }
    
    def _generate_recommendations(self, hit_rate: float, metrics: Dict[str, Any]) -> List[str]:
        """Generate performance recommendations."""
        recommendations = []
        
        if hit_rate < 50:
            recommendations.append("Consider implementing cache warming for frequently accessed data")
            recommendations.append("Review cache TTL settings - they might be too short")
        
        if hit_rate < 75:
            recommendations.append("Analyze cache miss patterns to identify optimization opportunities")
        
        if metrics["errors"] > metrics["hits"] * 0.1:
            recommendations.append("High error rate detected - check Redis connection stability")
        
        if metrics["total_requests"] == 0:
            recommendations.append("No cache requests recorded - verify cache integration")
        
        return recommendations


# Global instances
cache_warming_manager = None
cache_performance_monitor = None


async def initialize_cache_warming(cache_service: CacheService):
    """Initialize cache warming and monitoring."""
    global cache_warming_manager, cache_performance_monitor
    
    cache_warming_manager = CacheWarmingManager(cache_service)
    cache_performance_monitor = CachePerformanceMonitor(cache_service)
    
    logger.info("Cache warming and monitoring initialized")


async def get_cache_warming_manager() -> Optional[CacheWarmingManager]:
    """Get cache warming manager instance."""
    return cache_warming_manager


async def get_cache_performance_monitor() -> Optional[CachePerformanceMonitor]:
    """Get cache performance monitor instance."""
    return cache_performance_monitor