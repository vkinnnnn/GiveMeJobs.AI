"""
Database performance optimization with async SQLAlchemy 2.0.

This module provides comprehensive database optimization including:
- Async connection pooling with asyncpg
- Database indexes for common queries
- Read replica configuration
- Query optimization utilities
- Performance monitoring
"""

import asyncio
import time
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Dict, List, Optional, Any, Union
from dataclasses import dataclass
from enum import Enum

from sqlalchemy import (
    Index, text, event, create_engine, MetaData, 
    select, func, inspect, Table
)
from sqlalchemy.ext.asyncio import (
    AsyncSession, create_async_engine, async_sessionmaker, AsyncEngine
)
from sqlalchemy.pool import QueuePool, NullPool
from sqlalchemy.orm import sessionmaker
from sqlalchemy.sql import Select
from sqlalchemy.engine import Engine
import structlog

from .config import get_settings
from .database import Base, async_engine, sync_engine

logger = structlog.get_logger(__name__)
settings = get_settings()


class DatabaseRole(Enum):
    """Database role for read/write separation."""
    PRIMARY = "primary"
    REPLICA = "replica"


@dataclass
class DatabaseConfig:
    """Database configuration for different roles."""
    url: str
    role: DatabaseRole
    pool_size: int = 10
    max_overflow: int = 20
    pool_timeout: int = 30
    pool_recycle: int = 3600
    echo: bool = False


class AsyncDatabaseManager:
    """
    Advanced async database manager with read/write separation and optimization.
    """
    
    def __init__(self):
        self.engines: Dict[DatabaseRole, AsyncEngine] = {}
        self.session_factories: Dict[DatabaseRole, async_sessionmaker] = {}
        self._initialized = False
        
    async def initialize(self):
        """Initialize database engines and session factories."""
        if self._initialized:
            return
            
        # Primary database configuration
        primary_config = DatabaseConfig(
            url=settings.database.url or "postgresql+asyncpg://user:password@localhost/givemejobs",
            role=DatabaseRole.PRIMARY,
            pool_size=settings.database.pool_size,
            max_overflow=settings.database.max_overflow,
            pool_timeout=settings.database.pool_timeout,
            pool_recycle=settings.database.pool_recycle,
            echo=settings.database.echo
        )
        
        # Read replica configuration (fallback to primary if not configured)
        replica_url = getattr(settings.database, 'replica_url', None) or primary_config.url
        replica_config = DatabaseConfig(
            url=replica_url,
            role=DatabaseRole.REPLICA,
            pool_size=max(settings.database.pool_size // 2, 5),  # Smaller pool for reads
            max_overflow=settings.database.max_overflow,
            pool_timeout=settings.database.pool_timeout,
            pool_recycle=settings.database.pool_recycle,
            echo=settings.database.echo
        )
        
        # Create engines
        await self._create_engine(primary_config)
        await self._create_engine(replica_config)
        
        # Test connections
        await self._test_connections()
        
        self._initialized = True
        logger.info("Database manager initialized with read/write separation")
    
    async def _create_engine(self, config: DatabaseConfig):
        """Create optimized async engine for specific role."""
        engine = create_async_engine(
            config.url,
            echo=config.echo,
            poolclass=NullPool if settings.environment == "test" else QueuePool,
            pool_size=config.pool_size,
            max_overflow=config.max_overflow,
            pool_timeout=config.pool_timeout,
            pool_recycle=config.pool_recycle,
            pool_pre_ping=True,
            # Async-specific optimizations
            connect_args={
                "server_settings": {
                    "application_name": f"givemejobs-{config.role.value}-{settings.environment}",
                    "jit": "off",  # Disable JIT for better connection performance
                    "statement_timeout": "30000",  # 30 second statement timeout
                    "idle_in_transaction_session_timeout": "60000",  # 1 minute idle timeout
                    "tcp_keepalives_idle": "600",  # 10 minutes
                    "tcp_keepalives_interval": "30",  # 30 seconds
                    "tcp_keepalives_count": "3",  # 3 retries
                },
                "command_timeout": 60,
                "prepared_statement_cache_size": 100,  # Cache prepared statements
                "prepared_statement_name_func": lambda: f"ps_{int(time.time() * 1000000)}",
            },
        )
        
        # Store engine and create session factory
        self.engines[config.role] = engine
        self.session_factories[config.role] = async_sessionmaker(
            bind=engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=True,
            autocommit=False
        )
        
        logger.info(f"Created {config.role.value} database engine", 
                   pool_size=config.pool_size, max_overflow=config.max_overflow)
    
    async def _test_connections(self):
        """Test all database connections."""
        for role, engine in self.engines.items():
            try:
                async with engine.begin() as conn:
                    await conn.execute(text("SELECT 1"))
                logger.info(f"{role.value} database connection test successful")
            except Exception as e:
                logger.error(f"{role.value} database connection test failed", error=str(e))
                raise
    
    @asynccontextmanager
    async def get_session(
        self, 
        role: DatabaseRole = DatabaseRole.PRIMARY
    ) -> AsyncGenerator[AsyncSession, None]:
        """
        Get database session for specific role.
        
        Args:
            role: Database role (PRIMARY for writes, REPLICA for reads)
        """
        if not self._initialized:
            await self.initialize()
            
        session_factory = self.session_factories[role]
        async with session_factory() as session:
            try:
                yield session
            except Exception as e:
                await session.rollback()
                logger.error(f"Database session error ({role.value})", error=str(e))
                raise
            finally:
                await session.close()
    
    async def get_pool_status(self) -> Dict[str, Dict[str, int]]:
        """Get connection pool status for all engines."""
        status = {}
        for role, engine in self.engines.items():
            pool = engine.pool
            status[role.value] = {
                "pool_size": pool.size(),
                "checked_in": pool.checkedin(),
                "checked_out": pool.checkedout(),
                "overflow": pool.overflow(),
                "invalid": pool.invalid()
            }
        return status
    
    async def close_all(self):
        """Close all database connections."""
        for role, engine in self.engines.items():
            try:
                await engine.dispose()
                logger.info(f"Closed {role.value} database engine")
            except Exception as e:
                logger.error(f"Error closing {role.value} database engine", error=str(e))


# Global database manager instance
db_manager = AsyncDatabaseManager()


class DatabaseIndexManager:
    """
    Manage database indexes for optimal query performance.
    """
    
    @staticmethod
    def get_recommended_indexes() -> List[Index]:
        """
        Get list of recommended indexes for common query patterns.
        
        Returns:
            List of SQLAlchemy Index objects
        """
        return [
            # User-related indexes
            Index('idx_users_email', 'users.email'),
            Index('idx_users_created_at', 'users.created_at'),
            Index('idx_users_last_login', 'users.last_login_at'),
            Index('idx_users_status', 'users.status'),
            
            # Job-related indexes
            Index('idx_jobs_title', 'jobs.title'),
            Index('idx_jobs_company', 'jobs.company_name'),
            Index('idx_jobs_location', 'jobs.location'),
            Index('idx_jobs_posted_date', 'jobs.posted_date'),
            Index('idx_jobs_salary_range', 'jobs.salary_min', 'jobs.salary_max'),
            Index('idx_jobs_status', 'jobs.status'),
            Index('idx_jobs_remote', 'jobs.is_remote'),
            
            # Application-related indexes
            Index('idx_applications_user_id', 'applications.user_id'),
            Index('idx_applications_job_id', 'applications.job_id'),
            Index('idx_applications_status', 'applications.status'),
            Index('idx_applications_applied_date', 'applications.applied_date'),
            Index('idx_applications_user_status', 'applications.user_id', 'applications.status'),
            
            # Profile-related indexes
            Index('idx_profiles_user_id', 'user_profiles.user_id'),
            Index('idx_profiles_skills', 'user_profiles.skills'),  # GIN index for JSON
            Index('idx_profiles_experience_years', 'user_profiles.years_experience'),
            
            # Skill-related indexes
            Index('idx_skills_name', 'skills.name'),
            Index('idx_skills_category', 'skills.category'),
            Index('idx_user_skills_user_id', 'user_skills.user_id'),
            Index('idx_user_skills_skill_id', 'user_skills.skill_id'),
            Index('idx_user_skills_proficiency', 'user_skills.proficiency_level'),
            
            # Analytics-related indexes
            Index('idx_analytics_user_id', 'user_analytics.user_id'),
            Index('idx_analytics_date', 'user_analytics.date'),
            Index('idx_analytics_metric_type', 'user_analytics.metric_type'),
            
            # Notification-related indexes
            Index('idx_notifications_user_id', 'notifications.user_id'),
            Index('idx_notifications_read', 'notifications.is_read'),
            Index('idx_notifications_created', 'notifications.created_at'),
            
            # Composite indexes for common query patterns
            Index('idx_jobs_location_salary', 'jobs.location', 'jobs.salary_min'),
            Index('idx_jobs_company_posted', 'jobs.company_name', 'jobs.posted_date'),
            Index('idx_applications_user_date', 'applications.user_id', 'applications.applied_date'),
            Index('idx_user_skills_composite', 'user_skills.user_id', 'user_skills.skill_id', 'user_skills.proficiency_level'),
        ]
    
    @staticmethod
    async def create_indexes():
        """Create recommended indexes in the database."""
        try:
            async with db_manager.get_session(DatabaseRole.PRIMARY) as session:
                # Get database metadata
                async with session.begin():
                    # Create indexes using raw SQL for better control
                    indexes_sql = [
                        # User indexes
                        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email)",
                        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at ON users(created_at)",
                        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_login ON users(last_login_at)",
                        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_status ON users(status)",
                        
                        # Job indexes
                        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_title ON jobs USING gin(to_tsvector('english', title))",
                        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_company ON jobs(company_name)",
                        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_location ON jobs(location)",
                        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_posted_date ON jobs(posted_date DESC)",
                        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_salary_range ON jobs(salary_min, salary_max)",
                        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_status ON jobs(status)",
                        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_remote ON jobs(is_remote)",
                        
                        # Application indexes
                        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_user_id ON applications(user_id)",
                        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_job_id ON applications(job_id)",
                        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_status ON applications(status)",
                        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_applied_date ON applications(applied_date DESC)",
                        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_user_status ON applications(user_id, status)",
                        
                        # Profile indexes
                        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_user_id ON user_profiles(user_id)",
                        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_skills ON user_profiles USING gin(skills)",
                        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_experience_years ON user_profiles(years_experience)",
                        
                        # Composite indexes for performance
                        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_location_salary ON jobs(location, salary_min)",
                        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_company_posted ON jobs(company_name, posted_date DESC)",
                        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_user_date ON applications(user_id, applied_date DESC)",
                    ]
                    
                    for sql in indexes_sql:
                        try:
                            await session.execute(text(sql))
                            logger.info(f"Created index: {sql.split('idx_')[1].split(' ')[0]}")
                        except Exception as e:
                            # Index might already exist, log warning but continue
                            logger.warning(f"Index creation skipped: {str(e)}")
                    
                    await session.commit()
                    
            logger.info("Database indexes created successfully")
            
        except Exception as e:
            logger.error("Failed to create database indexes", error=str(e))
            raise
    
    @staticmethod
    async def analyze_query_performance(query: str, params: Optional[Dict] = None) -> Dict:
        """
        Analyze query performance using EXPLAIN ANALYZE.
        
        Args:
            query: SQL query to analyze
            params: Query parameters
            
        Returns:
            Dictionary with performance analysis
        """
        try:
            async with db_manager.get_session(DatabaseRole.REPLICA) as session:
                # Run EXPLAIN ANALYZE
                explain_query = f"EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {query}"
                result = await session.execute(text(explain_query), params or {})
                analysis = result.fetchone()[0]
                
                return {
                    "query": query,
                    "analysis": analysis,
                    "execution_time": analysis[0]["Execution Time"],
                    "planning_time": analysis[0]["Planning Time"],
                    "total_cost": analysis[0]["Plan"]["Total Cost"]
                }
                
        except Exception as e:
            logger.error("Query performance analysis failed", error=str(e))
            return {"error": str(e)}


class QueryOptimizer:
    """
    Query optimization utilities for common patterns.
    """
    
    @staticmethod
    def optimize_select_query(query: Select) -> Select:
        """
        Apply common optimizations to SELECT queries.
        
        Args:
            query: SQLAlchemy Select object
            
        Returns:
            Optimized Select object
        """
        # Add execution options for better performance
        return query.execution_options(
            compiled_cache={},  # Enable compiled query cache
            autocommit=True,    # Use autocommit for read-only queries
            stream_results=True  # Stream large result sets
        )
    
    @staticmethod
    async def get_table_statistics(table_name: str) -> Dict:
        """
        Get table statistics for query optimization.
        
        Args:
            table_name: Name of the table
            
        Returns:
            Dictionary with table statistics
        """
        try:
            async with db_manager.get_session(DatabaseRole.REPLICA) as session:
                # Get table size and row count
                stats_query = text("""
                    SELECT 
                        schemaname,
                        tablename,
                        attname,
                        n_distinct,
                        correlation,
                        most_common_vals,
                        most_common_freqs
                    FROM pg_stats 
                    WHERE tablename = :table_name
                """)
                
                result = await session.execute(stats_query, {"table_name": table_name})
                stats = result.fetchall()
                
                # Get table size
                size_query = text("""
                    SELECT 
                        pg_size_pretty(pg_total_relation_size(:table_name)) as total_size,
                        pg_size_pretty(pg_relation_size(:table_name)) as table_size,
                        (SELECT count(*) FROM {}) as row_count
                """.format(table_name))
                
                size_result = await session.execute(size_query, {"table_name": table_name})
                size_info = size_result.fetchone()
                
                return {
                    "table_name": table_name,
                    "total_size": size_info[0],
                    "table_size": size_info[1],
                    "row_count": size_info[2],
                    "column_stats": [dict(row._mapping) for row in stats]
                }
                
        except Exception as e:
            logger.error(f"Failed to get table statistics for {table_name}", error=str(e))
            return {"error": str(e)}
    
    @staticmethod
    async def suggest_missing_indexes() -> List[Dict]:
        """
        Suggest missing indexes based on query patterns.
        
        Returns:
            List of suggested indexes
        """
        try:
            async with db_manager.get_session(DatabaseRole.REPLICA) as session:
                # Query to find missing indexes
                missing_indexes_query = text("""
                    SELECT 
                        schemaname,
                        tablename,
                        attname,
                        n_distinct,
                        correlation
                    FROM pg_stats
                    WHERE schemaname = 'public'
                    AND n_distinct > 100  -- High cardinality columns
                    AND correlation < 0.1  -- Low correlation (good for indexing)
                    ORDER BY n_distinct DESC
                """)
                
                result = await session.execute(missing_indexes_query)
                suggestions = []
                
                for row in result.fetchall():
                    suggestions.append({
                        "table": row[1],
                        "column": row[2],
                        "distinct_values": row[3],
                        "correlation": row[4],
                        "suggested_index": f"CREATE INDEX idx_{row[1]}_{row[2]} ON {row[1]}({row[2]})"
                    })
                
                return suggestions
                
        except Exception as e:
            logger.error("Failed to suggest missing indexes", error=str(e))
            return []


class ConnectionPoolMonitor:
    """
    Monitor database connection pool performance and health.
    """
    
    @staticmethod
    async def get_detailed_pool_metrics() -> Dict:
        """Get detailed connection pool metrics."""
        try:
            pool_status = await db_manager.get_pool_status()
            
            # Add additional metrics
            metrics = {
                "pools": pool_status,
                "timestamp": time.time(),
                "total_connections": sum(
                    status["checked_in"] + status["checked_out"] 
                    for status in pool_status.values()
                ),
                "total_overflow": sum(
                    status["overflow"] 
                    for status in pool_status.values()
                ),
                "health_status": "healthy"
            }
            
            # Check for potential issues
            for role, status in pool_status.items():
                if status["overflow"] > status["pool_size"] * 0.8:
                    metrics["health_status"] = "warning"
                    metrics["warnings"] = metrics.get("warnings", [])
                    metrics["warnings"].append(f"{role} pool overflow high: {status['overflow']}")
                
                if status["invalid"] > 0:
                    metrics["health_status"] = "error"
                    metrics["errors"] = metrics.get("errors", [])
                    metrics["errors"].append(f"{role} pool has invalid connections: {status['invalid']}")
            
            return metrics
            
        except Exception as e:
            logger.error("Failed to get pool metrics", error=str(e))
            return {"error": str(e)}
    
    @staticmethod
    async def log_pool_metrics():
        """Log current pool metrics."""
        metrics = await ConnectionPoolMonitor.get_detailed_pool_metrics()
        logger.info("Database pool metrics", **metrics)


# Convenience functions for common operations
async def get_read_session() -> AsyncGenerator[AsyncSession, None]:
    """Get session for read operations (uses replica if available)."""
    async with db_manager.get_session(DatabaseRole.REPLICA) as session:
        yield session


async def get_write_session() -> AsyncGenerator[AsyncSession, None]:
    """Get session for write operations (uses primary)."""
    async with db_manager.get_session(DatabaseRole.PRIMARY) as session:
        yield session


# Initialize database optimization on module import
async def initialize_database_optimization():
    """Initialize database optimization features."""
    try:
        await db_manager.initialize()
        await DatabaseIndexManager.create_indexes()
        logger.info("Database optimization initialized successfully")
    except Exception as e:
        logger.error("Failed to initialize database optimization", error=str(e))
        raise


# Cleanup function
async def cleanup_database_optimization():
    """Cleanup database optimization resources."""
    try:
        await db_manager.close_all()
        logger.info("Database optimization cleanup completed")
    except Exception as e:
        logger.error("Database optimization cleanup failed", error=str(e))