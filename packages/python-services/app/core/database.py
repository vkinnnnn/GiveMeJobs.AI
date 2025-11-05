"""Database configuration and session management for async operations."""

import asyncio
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional

from sqlalchemy import create_engine, MetaData, event
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import NullPool, QueuePool

from .config import get_settings
from .logging import get_logger

settings = get_settings()
logger = get_logger(__name__)

# Database URL with async driver
DATABASE_URL = settings.database.url or "postgresql+asyncpg://user:password@localhost/givemejobs"

# Create async engine with optimized configuration
async_engine = create_async_engine(
    DATABASE_URL,
    echo=settings.database.echo,
    poolclass=NullPool if settings.environment == "test" else None,  # Use default async pool
    pool_size=settings.database.pool_size,
    max_overflow=settings.database.max_overflow,
    pool_timeout=settings.database.pool_timeout,
    pool_recycle=settings.database.pool_recycle,
    pool_pre_ping=True,
    # Async-specific optimizations
    connect_args={
        "server_settings": {
            "application_name": f"givemejobs-python-{settings.environment}",
            "jit": "off",  # Disable JIT for better connection performance
            "statement_timeout": "30000",  # 30 second statement timeout
            "idle_in_transaction_session_timeout": "60000",  # 1 minute idle timeout
        },
        "command_timeout": 60,
        "prepared_statement_cache_size": 100,  # Cache prepared statements
    },
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=True,
    autocommit=False
)

# Create sync engine for migrations and other sync operations
sync_engine = create_engine(
    DATABASE_URL.replace("+asyncpg", ""),
    echo=settings.database.echo,
    pool_pre_ping=True,
    pool_recycle=3600
)

# Create sync session factory
SessionLocal = sessionmaker(
    bind=sync_engine,
    autocommit=False,
    autoflush=False
)

# Base class for models
Base = declarative_base()
metadata = MetaData()


@asynccontextmanager
async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Get async database session with automatic cleanup.
    
    Usage:
        async with get_async_session() as session:
            # Use session here
            result = await session.execute(query)
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception as e:
            await session.rollback()
            logger.error(f"Database session error: {str(e)}")
            raise
        finally:
            await session.close()


def get_sync_session():
    """
    Get synchronous database session.
    
    Usage:
        with get_sync_session() as session:
            # Use session here
            result = session.execute(query)
    """
    return SessionLocal()


async def init_database():
    """Initialize database connection and create tables if needed."""
    try:
        async with async_engine.begin() as conn:
            # Test connection
            await conn.execute("SELECT 1")
            logger.info("Database connection established successfully")
            
            # Create tables if they don't exist (in development)
            if settings.environment == "development":
                await conn.run_sync(Base.metadata.create_all)
                logger.info("Database tables created/verified")
                
    except Exception as e:
        logger.error(f"Failed to initialize database: {str(e)}")
        raise


async def close_database():
    """Close database connections."""
    try:
        await async_engine.dispose()
        sync_engine.dispose()
        logger.info("Database connections closed")
    except Exception as e:
        logger.error(f"Error closing database connections: {str(e)}")


class DatabaseHealthCheck:
    """Database health check utilities."""
    
    @staticmethod
    async def check_async_connection() -> bool:
        """Check if async database connection is healthy."""
        try:
            async with get_async_session() as session:
                await session.execute("SELECT 1")
                return True
        except Exception as e:
            logger.error(f"Async database health check failed: {str(e)}")
            return False
    
    @staticmethod
    def check_sync_connection() -> bool:
        """Check if sync database connection is healthy."""
        try:
            with get_sync_session() as session:
                session.execute("SELECT 1")
                return True
        except Exception as e:
            logger.error(f"Sync database health check failed: {str(e)}")
            return False


# Database utilities for common operations
class DatabaseUtils:
    """Utility functions for database operations."""
    
    @staticmethod
    async def execute_raw_query(query: str, params: Optional[dict] = None) -> list:
        """Execute raw SQL query and return results."""
        async with get_async_session() as session:
            result = await session.execute(query, params or {})
            return result.fetchall()
    
    @staticmethod
    async def execute_raw_query_single(query: str, params: Optional[dict] = None):
        """Execute raw SQL query and return single result."""
        async with get_async_session() as session:
            result = await session.execute(query, params or {})
            return result.fetchone()
    
    @staticmethod
    async def get_table_row_count(table_name: str) -> int:
        """Get row count for a table."""
        query = f"SELECT COUNT(*) FROM {table_name}"
        result = await DatabaseUtils.execute_raw_query_single(query)
        return result[0] if result else 0


# Connection pool monitoring
class ConnectionPoolMonitor:
    """Monitor database connection pool health."""
    
    @staticmethod
    def get_pool_status() -> dict:
        """Get connection pool status."""
        pool = async_engine.pool
        return {
            "pool_size": pool.size(),
            "checked_in": pool.checkedin(),
            "checked_out": pool.checkedout(),
            "overflow": pool.overflow(),
            "invalid": pool.invalid()
        }
    
    @staticmethod
    async def log_pool_status():
        """Log current pool status."""
        status = ConnectionPoolMonitor.get_pool_status()
        logger.info("Database pool status", extra=status)


# Database migration utilities (for development)
async def run_migrations():
    """Run database migrations (placeholder for Alembic integration)."""
    logger.info("Database migrations would run here (integrate with Alembic)")
    # In production, this would integrate with Alembic
    # alembic upgrade head


# Event handlers for application lifecycle
async def startup_database():
    """Database startup handler."""
    await init_database()
    logger.info("Database startup completed")


async def shutdown_database():
    """Database shutdown handler."""
    await close_database()
    logger.info("Database shutdown completed")