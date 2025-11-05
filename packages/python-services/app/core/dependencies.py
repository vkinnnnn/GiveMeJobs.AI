"""Dependency injection system for AI/ML services."""

import asyncio
from typing import AsyncGenerator, Optional
from contextlib import asynccontextmanager

from fastapi import Depends
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_async_session
from app.core.logging import get_logger
from app.core.openai_client import get_openai_client, EnhancedOpenAIClient

logger = get_logger(__name__)

# Global instances
_redis_client: Optional[Redis] = None
_redis_lock = asyncio.Lock()


async def get_redis_client() -> Redis:
    """Get Redis client instance with connection pooling."""
    global _redis_client
    
    if _redis_client is None:
        async with _redis_lock:
            if _redis_client is None:
                settings = get_settings()
                _redis_client = Redis.from_url(
                    settings.redis.url,
                    max_connections=settings.redis.max_connections,
                    socket_timeout=settings.redis.socket_timeout,
                    socket_connect_timeout=settings.redis.socket_connect_timeout,
                    retry_on_timeout=settings.redis.retry_on_timeout,
                    health_check_interval=settings.redis.health_check_interval,
                    decode_responses=True
                )
                
                # Test connection
                try:
                    await _redis_client.ping()
                    logger.info("Redis connection established successfully")
                except Exception as e:
                    logger.error("Failed to connect to Redis", error=str(e))
                    raise
    
    return _redis_client


async def get_settings_dependency():
    """Get application settings."""
    return get_settings()


async def get_logger_dependency():
    """Get structured logger."""
    return get_logger(__name__)


# Service-specific dependencies
class ServiceDependencies:
    """Container for service dependencies."""
    
    def __init__(
        self,
        db_session: AsyncSession,
        redis_client: Redis,
        openai_client: EnhancedOpenAIClient,
        logger,
        settings
    ):
        self.db = db_session
        self.redis = redis_client
        self.openai = openai_client
        self.logger = logger
        self.settings = settings


async def get_service_dependencies(
    db_session: AsyncSession = Depends(get_async_session),
    redis_client: Redis = Depends(get_redis_client),
    openai_client: EnhancedOpenAIClient = Depends(get_openai_client),
    logger = Depends(get_logger_dependency),
    settings = Depends(get_settings_dependency)
) -> ServiceDependencies:
    """Get all service dependencies."""
    return ServiceDependencies(
        db_session=db_session,
        redis_client=redis_client,
        openai_client=openai_client,
        logger=logger,
        settings=settings
    )


# Document Processing Service Dependencies
async def get_document_processing_dependencies(
    deps: ServiceDependencies = Depends(get_service_dependencies)
) -> ServiceDependencies:
    """Get dependencies for document processing service."""
    deps.logger = deps.logger.bind(service="document-processing")
    return deps


# Semantic Search Service Dependencies  
async def get_semantic_search_dependencies(
    deps: ServiceDependencies = Depends(get_service_dependencies)
) -> ServiceDependencies:
    """Get dependencies for semantic search service."""
    deps.logger = deps.logger.bind(service="semantic-search")
    return deps


# Analytics Service Dependencies
async def get_analytics_dependencies(
    deps: ServiceDependencies = Depends(get_service_dependencies)
) -> ServiceDependencies:
    """Get dependencies for analytics service."""
    deps.logger = deps.logger.bind(service="analytics")
    return deps


# Health check dependencies
class HealthCheckDependencies:
    """Dependencies for health checks."""
    
    def __init__(self):
        self.checks = {}
    
    async def check_database(self, db_session: AsyncSession) -> bool:
        """Check database connectivity."""
        try:
            await db_session.execute("SELECT 1")
            return True
        except Exception as e:
            logger.error("Database health check failed", error=str(e))
            return False
    
    async def check_redis(self, redis_client: Redis) -> bool:
        """Check Redis connectivity."""
        try:
            await redis_client.ping()
            return True
        except Exception as e:
            logger.error("Redis health check failed", error=str(e))
            return False
    
    async def check_openai(self, openai_client: EnhancedOpenAIClient) -> bool:
        """Check OpenAI service."""
        try:
            return await openai_client.health_check()
        except Exception as e:
            logger.error("OpenAI health check failed", error=str(e))
            return False
    
    async def run_all_checks(self, deps: ServiceDependencies) -> dict:
        """Run all health checks."""
        checks = await asyncio.gather(
            self.check_database(deps.db),
            self.check_redis(deps.redis),
            self.check_openai(deps.openai),
            return_exceptions=True
        )
        
        return {
            "database": checks[0] if not isinstance(checks[0], Exception) else False,
            "redis": checks[1] if not isinstance(checks[1], Exception) else False,
            "openai": checks[2] if not isinstance(checks[2], Exception) else False,
        }


async def get_health_check_dependencies() -> HealthCheckDependencies:
    """Get health check dependencies."""
    return HealthCheckDependencies()


# Cache management
class CacheManager:
    """Centralized cache management."""
    
    def __init__(self, redis_client: Redis):
        self.redis = redis_client
        self.default_ttl = 3600  # 1 hour
    
    async def get(self, key: str, default=None):
        """Get value from cache."""
        try:
            value = await self.redis.get(key)
            return value if value is not None else default
        except Exception as e:
            logger.warning("Cache get failed", key=key, error=str(e))
            return default
    
    async def set(self, key: str, value: str, ttl: Optional[int] = None):
        """Set value in cache."""
        try:
            ttl = ttl or self.default_ttl
            await self.redis.setex(key, ttl, value)
        except Exception as e:
            logger.warning("Cache set failed", key=key, error=str(e))
    
    async def delete(self, key: str):
        """Delete value from cache."""
        try:
            await self.redis.delete(key)
        except Exception as e:
            logger.warning("Cache delete failed", key=key, error=str(e))
    
    async def exists(self, key: str) -> bool:
        """Check if key exists in cache."""
        try:
            return bool(await self.redis.exists(key))
        except Exception as e:
            logger.warning("Cache exists check failed", key=key, error=str(e))
            return False
    
    async def invalidate_pattern(self, pattern: str):
        """Invalidate all keys matching pattern."""
        try:
            keys = await self.redis.keys(pattern)
            if keys:
                await self.redis.delete(*keys)
        except Exception as e:
            logger.warning("Cache pattern invalidation failed", pattern=pattern, error=str(e))


async def get_cache_manager(
    redis_client: Redis = Depends(get_redis_client)
) -> CacheManager:
    """Get cache manager instance."""
    return CacheManager(redis_client)


# Context managers for resource management
@asynccontextmanager
async def service_context(service_name: str):
    """Context manager for service operations."""
    logger.info("Service operation started", service=service_name)
    start_time = asyncio.get_event_loop().time()
    
    try:
        yield
        duration = asyncio.get_event_loop().time() - start_time
        logger.info("Service operation completed", service=service_name, duration=duration)
    except Exception as e:
        duration = asyncio.get_event_loop().time() - start_time
        logger.error("Service operation failed", service=service_name, duration=duration, error=str(e))
        raise


@asynccontextmanager
async def database_transaction(db_session: AsyncSession):
    """Context manager for database transactions."""
    async with db_session.begin():
        try:
            yield db_session
        except Exception:
            await db_session.rollback()
            raise


# Cleanup functions
async def cleanup_redis():
    """Cleanup Redis connections."""
    global _redis_client
    if _redis_client:
        await _redis_client.close()
        _redis_client = None
        logger.info("Redis connections closed")


async def cleanup_all():
    """Cleanup all resources."""
    await cleanup_redis()
    logger.info("All resources cleaned up")