"""Read replica support for database load balancing."""

import random
from typing import AsyncGenerator, List, Optional
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import QueuePool, NullPool

from .config import get_settings
from .logging import get_logger

settings = get_settings()
logger = get_logger(__name__)


class ReadReplicaManager:
    """Manage read replica connections for load balancing."""
    
    def __init__(self):
        self.primary_engine = None
        self.replica_engines = []
        self.replica_sessions = []
        self.primary_session = None
        self.enabled = False
        
    async def initialize(self, replica_urls: List[str]) -> None:
        """Initialize read replica connections."""
        if not replica_urls:
            logger.info("No read replicas configured")
            return
        
        try:
            # Create replica engines
            for i, replica_url in enumerate(replica_urls):
                replica_engine = create_async_engine(
                    replica_url,
                    echo=settings.database.echo,
                    poolclass=NullPool if settings.environment == "test" else QueuePool,
                    pool_size=max(5, settings.database.pool_size // 2),  # Smaller pool for replicas
                    max_overflow=max(10, settings.database.max_overflow // 2),
                    pool_timeout=settings.database.pool_timeout,
                    pool_recycle=settings.database.pool_recycle,
                    pool_pre_ping=True,
                    connect_args={
                        "server_settings": {
                            "application_name": f"givemejobs-python-replica-{i}",
                            "default_transaction_read_only": "on",  # Ensure read-only
                        },
                        "command_timeout": 30,  # Shorter timeout for replicas
                    },
                    pool_reset_on_return="commit",
                    pool_logging_name=f"givemejobs_replica_pool_{i}",
                )
                
                # Test replica connection
                async with replica_engine.begin() as conn:
                    await conn.execute("SELECT 1")
                
                self.replica_engines.append(replica_engine)
                
                # Create session factory for this replica
                replica_session_factory = async_sessionmaker(
                    bind=replica_engine,
                    class_=AsyncSession,
                    expire_on_commit=False,
                    autoflush=True,
                    autocommit=False
                )
                self.replica_sessions.append(replica_session_factory)
                
                logger.info(f"Read replica {i} initialized successfully")
            
            self.enabled = len(self.replica_engines) > 0
            logger.info(f"Read replica manager initialized with {len(self.replica_engines)} replicas")
            
        except Exception as e:
            logger.error(f"Failed to initialize read replicas: {e}")
            self.enabled = False
    
    async def close(self) -> None:
        """Close all replica connections."""
        for engine in self.replica_engines:
            try:
                await engine.dispose()
            except Exception as e:
                logger.warning(f"Error closing replica engine: {e}")
        
        self.replica_engines.clear()
        self.replica_sessions.clear()
        self.enabled = False
        logger.info("Read replica connections closed")
    
    def get_replica_session(self) -> Optional[async_sessionmaker]:
        """Get a random replica session factory."""
        if not self.enabled or not self.replica_sessions:
            return None
        
        # Simple round-robin or random selection
        return random.choice(self.replica_sessions)
    
    async def check_replica_health(self) -> List[bool]:
        """Check health of all read replicas."""
        health_status = []
        
        for i, engine in enumerate(self.replica_engines):
            try:
                async with engine.begin() as conn:
                    await conn.execute("SELECT 1")
                health_status.append(True)
                logger.debug(f"Replica {i} is healthy")
            except Exception as e:
                health_status.append(False)
                logger.warning(f"Replica {i} health check failed: {e}")
        
        return health_status
    
    async def get_replica_lag(self) -> List[Optional[float]]:
        """Get replication lag for all replicas (PostgreSQL specific)."""
        lag_info = []
        
        for i, engine in enumerate(self.replica_engines):
            try:
                async with engine.begin() as conn:
                    # Query replication lag (requires appropriate permissions)
                    result = await conn.execute("""
                        SELECT 
                            CASE 
                                WHEN pg_is_in_recovery() THEN 
                                    EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()))
                                ELSE 0 
                            END as lag_seconds
                    """)
                    lag = result.scalar()
                    lag_info.append(lag)
                    
                    if lag and lag > 5.0:  # Warn if lag > 5 seconds
                        logger.warning(f"Replica {i} has high lag: {lag:.2f} seconds")
                        
            except Exception as e:
                logger.warning(f"Failed to get lag for replica {i}: {e}")
                lag_info.append(None)
        
        return lag_info


# Global read replica manager
read_replica_manager = ReadReplicaManager()


@asynccontextmanager
async def get_read_session(prefer_replica: bool = True) -> AsyncGenerator[AsyncSession, None]:
    """
    Get database session, preferring read replica for read operations.
    
    Args:
        prefer_replica: If True, try to use read replica first
    """
    session_factory = None
    
    # Try to get replica session if preferred and available
    if prefer_replica and read_replica_manager.enabled:
        session_factory = read_replica_manager.get_replica_session()
    
    # Fall back to primary if no replica available
    if not session_factory:
        from .database import AsyncSessionLocal
        session_factory = AsyncSessionLocal
    
    async with session_factory() as session:
        try:
            yield session
        except Exception as e:
            await session.rollback()
            logger.error(f"Read session error: {str(e)}")
            raise
        finally:
            await session.close()


@asynccontextmanager
async def get_write_session() -> AsyncGenerator[AsyncSession, None]:
    """Get database session for write operations (always uses primary)."""
    from .database import AsyncSessionLocal
    
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception as e:
            await session.rollback()
            logger.error(f"Write session error: {str(e)}")
            raise
        finally:
            await session.close()


class DatabaseRouter:
    """Route database operations to appropriate connections."""
    
    @staticmethod
    def should_use_replica(operation_type: str, table_name: Optional[str] = None) -> bool:
        """Determine if operation should use read replica."""
        
        # Always use primary for write operations
        write_operations = {'insert', 'update', 'delete', 'create', 'drop', 'alter'}
        if operation_type.lower() in write_operations:
            return False
        
        # Use primary for critical tables that need consistency
        critical_tables = {'users', 'applications', 'user_profiles'}
        if table_name and table_name.lower() in critical_tables:
            return False
        
        # Use replica for read operations on other tables
        read_operations = {'select', 'count', 'exists'}
        if operation_type.lower() in read_operations:
            return True
        
        # Default to primary for unknown operations
        return False
    
    @staticmethod
    @asynccontextmanager
    async def get_session_for_operation(
        operation_type: str, 
        table_name: Optional[str] = None
    ) -> AsyncGenerator[AsyncSession, None]:
        """Get appropriate session based on operation type."""
        
        use_replica = DatabaseRouter.should_use_replica(operation_type, table_name)
        
        if use_replica:
            async with get_read_session(prefer_replica=True) as session:
                yield session
        else:
            async with get_write_session() as session:
                yield session


# Dependency for FastAPI
async def get_read_db_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency for read-only database sessions."""
    async with get_read_session(prefer_replica=True) as session:
        yield session


async def get_write_db_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency for write database sessions."""
    async with get_write_session() as session:
        yield session


# Initialize read replicas on startup
async def initialize_read_replicas():
    """Initialize read replica connections."""
    # This would typically read replica URLs from configuration
    replica_urls = []  # TODO: Add replica URLs from settings
    
    if replica_urls:
        await read_replica_manager.initialize(replica_urls)
    else:
        logger.info("No read replica URLs configured")


# Cleanup on shutdown
async def shutdown_read_replicas():
    """Shutdown read replica connections."""
    await read_replica_manager.close()