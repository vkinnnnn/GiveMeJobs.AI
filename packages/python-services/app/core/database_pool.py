"""
Advanced Database Connection Pooling with Read Replicas
Implements optimized connection pooling, read/write splitting, and performance monitoring
"""

import asyncio
import time
from typing import Dict, List, Optional, Any, Callable, Union
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from enum import Enum
import structlog
from sqlalchemy.ext.asyncio import (
    AsyncEngine, 
    AsyncSession, 
    create_async_engine,
    async_sessionmaker
)
from sqlalchemy.pool import QueuePool, NullPool
from sqlalchemy import event, text
from sqlalchemy.engine.events import PoolEvents
import asyncpg
from asyncpg.pool import Pool as AsyncPGPool
import psutil
import threading

logger = structlog.get_logger()

class DatabaseRole(Enum):
    """Database role enumeration"""
    PRIMARY = "primary"
    READ_REPLICA = "read_replica"
    ANALYTICS = "analytics"

class QueryType(Enum):
    """Query type enumeration for routing"""
    READ = "read"
    WRITE = "write"
    ANALYTICS = "analytics"

@dataclass
class DatabaseConfig:
    """Database configuration"""
    host: str
    port: int
    database: str
    username: str
    password: str
    role: DatabaseRole
    
    # Connection pool settings
    min_size: int = 5
    max_size: int = 20
    max_queries: int = 50000
    max_inactive_connection_lifetime: float = 300.0
    
    # Performance settings
    statement_cache_size: int = 1024
    prepared_statement_cache_size: int = 100
    
    # Health check settings
    health_check_interval: int = 30
    max_retries: int = 3
    retry_delay: float = 1.0

@dataclass
class ConnectionMetrics:
    """Connection pool metrics"""
    total_connections: int = 0
    active_connections: int = 0
    idle_connections: int = 0
    queries_executed: int = 0
    query_times: List[float] = field(default_factory=list)
    connection_errors: int = 0
    last_health_check: Optional[float] = None
    health_status: bool = True
    
    def add_query_time(self, duration: float):
        """Add query execution time"""
        self.queries_executed += 1
        self.query_times.append(duration)
        
        # Keep only last 1000 query times
        if len(self.query_times) > 1000:
            self.query_times = self.query_times[-1000:]
    
    def get_avg_query_time(self) -> float:
        """Get average query time"""
        return sum(self.query_times) / len(self.query_times) if self.query_times else 0.0

class DatabaseConnectionPool:
    """Advanced database connection pool with read replica support"""
    
    def __init__(self, configs: List[DatabaseConfig]):
        self.configs = {config.role: config for config in configs}
        self.engines: Dict[DatabaseRole, AsyncEngine] = {}
        self.session_makers: Dict[DatabaseRole, async_sessionmaker] = {}
        self.asyncpg_pools: Dict[DatabaseRole, AsyncPGPool] = {}
        self.metrics: Dict[DatabaseRole, ConnectionMetrics] = {}
        
        # Query routing
        self.read_replicas: List[DatabaseRole] = []
        self.primary_role = DatabaseRole.PRIMARY
        
        # Performance monitoring
        self.slow_query_threshold = 1.0  # seconds
        self.query_log_enabled = True
        
        # Health monitoring
        self.health_check_tasks: List[asyncio.Task] = []
        self._shutdown_event = asyncio.Event()
    
    async def initialize(self):
        """Initialize all database connections"""
        try:
            for role, config in self.configs.items():
                await self._initialize_role(role, config)
                
                if role != DatabaseRole.PRIMARY:
                    self.read_replicas.append(role)
            
            # Start health monitoring
            await self._start_health_monitoring()
            
            logger.info("Database connection pool initialized", 
                       roles=list(self.configs.keys()))
            
        except Exception as e:
            logger.error("Failed to initialize database pool", error=str(e))
            raise
    
    async def _initialize_role(self, role: DatabaseRole, config: DatabaseConfig):
        """Initialize connections for a specific database role"""
        try:
            # Create SQLAlchemy async engine
            engine_url = f"postgresql+asyncpg://{config.username}:{config.password}@{config.host}:{config.port}/{config.database}"
            
            engine = create_async_engine(
                engine_url,
                poolclass=QueuePool,
                pool_size=config.min_size,
                max_overflow=config.max_size - config.min_size,
                pool_pre_ping=True,
                pool_recycle=3600,  # 1 hour
                echo=False,  # Set to True for SQL logging
                future=True,
                connect_args={
                    "server_settings": {
                        "application_name": f"givemejobs_{role.value}",
                        "statement_timeout": "30000",  # 30 seconds
                        "idle_in_transaction_session_timeout": "60000",  # 1 minute
                    },
                    "command_timeout": 30,
                }
            )
            
            # Create session maker
            session_maker = async_sessionmaker(
                engine,
                class_=AsyncSession,
                expire_on_commit=False,
                autoflush=True,
                autocommit=False
            )
            
            # Create AsyncPG pool for raw queries
            asyncpg_pool = await asyncpg.create_pool(
                host=config.host,
                port=config.port,
                database=config.database,
                user=config.username,
                password=config.password,
                min_size=config.min_size,
                max_size=config.max_size,
                max_queries=config.max_queries,
                max_inactive_connection_lifetime=config.max_inactive_connection_lifetime,
                statement_cache_size=config.statement_cache_size,
                server_settings={
                    "application_name": f"givemejobs_raw_{role.value}",
                    "statement_timeout": "30000",
                }
            )
            
            self.engines[role] = engine
            self.session_makers[role] = session_maker
            self.asyncpg_pools[role] = asyncpg_pool
            self.metrics[role] = ConnectionMetrics()
            
            # Set up event listeners for monitoring
            self._setup_engine_events(engine, role)
            
            logger.info("Database role initialized", 
                       role=role.value, 
                       host=config.host,
                       pool_size=f"{config.min_size}-{config.max_size}")
            
        except Exception as e:
            logger.error("Failed to initialize database role", 
                        role=role.value, error=str(e))
            raise
    
    def _setup_engine_events(self, engine: AsyncEngine, role: DatabaseRole):
        """Set up SQLAlchemy event listeners for monitoring"""
        
        @event.listens_for(engine.sync_engine, "before_cursor_execute")
        def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            context._query_start_time = time.time()
        
        @event.listens_for(engine.sync_engine, "after_cursor_execute")
        def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            if hasattr(context, '_query_start_time'):
                duration = time.time() - context._query_start_time
                self.metrics[role].add_query_time(duration)
                
                if duration > self.slow_query_threshold:
                    logger.warning("Slow query detected", 
                                 role=role.value,
                                 duration=duration,
                                 statement=statement[:200])
        
        @event.listens_for(engine.sync_engine.pool, "connect")
        def on_connect(dbapi_conn, connection_record):
            self.metrics[role].total_connections += 1
        
        @event.listens_for(engine.sync_engine.pool, "checkout")
        def on_checkout(dbapi_conn, connection_record, connection_proxy):
            self.metrics[role].active_connections += 1
        
        @event.listens_for(engine.sync_engine.pool, "checkin")
        def on_checkin(dbapi_conn, connection_record):
            self.metrics[role].active_connections = max(0, self.metrics[role].active_connections - 1)
    
    async def _start_health_monitoring(self):
        """Start background health monitoring tasks"""
        for role in self.configs.keys():
            task = asyncio.create_task(self._health_monitor_loop(role))
            self.health_check_tasks.append(task)
    
    async def _health_monitor_loop(self, role: DatabaseRole):
        """Background health monitoring for a database role"""
        config = self.configs[role]
        
        while not self._shutdown_event.is_set():
            try:
                await asyncio.sleep(config.health_check_interval)
                
                # Perform health check
                start_time = time.time()
                healthy = await self._perform_health_check(role)
                check_duration = time.time() - start_time
                
                self.metrics[role].last_health_check = start_time
                self.metrics[role].health_status = healthy
                
                if not healthy:
                    logger.warning("Database health check failed", 
                                 role=role.value,
                                 duration=check_duration)
                else:
                    logger.debug("Database health check passed", 
                               role=role.value,
                               duration=check_duration)
                
            except Exception as e:
                logger.error("Health monitoring error", 
                           role=role.value, error=str(e))
                self.metrics[role].health_status = False
    
    async def _perform_health_check(self, role: DatabaseRole) -> bool:
        """Perform health check on a database role"""
        try:
            async with self.get_raw_connection(role) as conn:
                result = await conn.fetchval("SELECT 1")
                return result == 1
        except Exception as e:
            logger.error("Health check query failed", 
                        role=role.value, error=str(e))
            return False
    
    def _select_read_replica(self) -> DatabaseRole:
        """Select the best available read replica"""
        if not self.read_replicas:
            return self.primary_role
        
        # Select replica with lowest active connections
        best_replica = self.primary_role
        min_connections = float('inf')
        
        for replica in self.read_replicas:
            if not self.metrics[replica].health_status:
                continue
                
            active_conns = self.metrics[replica].active_connections
            if active_conns < min_connections:
                min_connections = active_conns
                best_replica = replica
        
        return best_replica
    
    def _route_query(self, query_type: QueryType) -> DatabaseRole:
        """Route query to appropriate database based on type"""
        if query_type == QueryType.WRITE:
            return self.primary_role
        elif query_type == QueryType.ANALYTICS:
            # Prefer analytics replica if available
            analytics_role = DatabaseRole.ANALYTICS
            if (analytics_role in self.configs and 
                self.metrics[analytics_role].health_status):
                return analytics_role
            return self._select_read_replica()
        else:  # READ
            return self._select_read_replica()
    
    @asynccontextmanager
    async def get_session(self, query_type: QueryType = QueryType.READ):
        """Get database session with automatic routing"""
        role = self._route_query(query_type)
        session_maker = self.session_makers[role]
        
        async with session_maker() as session:
            try:
                yield session
            except Exception as e:
                await session.rollback()
                self.metrics[role].connection_errors += 1
                logger.error("Database session error", 
                           role=role.value, error=str(e))
                raise
            finally:
                await session.close()
    
    @asynccontextmanager
    async def get_raw_connection(self, role: Optional[DatabaseRole] = None):
        """Get raw AsyncPG connection"""
        if role is None:
            role = self.primary_role
        
        pool = self.asyncpg_pools[role]
        
        async with pool.acquire() as conn:
            try:
                yield conn
            except Exception as e:
                self.metrics[role].connection_errors += 1
                logger.error("Raw connection error", 
                           role=role.value, error=str(e))
                raise
    
    async def execute_query(
        self, 
        query: str, 
        params: Optional[Dict[str, Any]] = None,
        query_type: QueryType = QueryType.READ
    ) -> List[Dict[str, Any]]:
        """Execute raw SQL query with automatic routing"""
        role = self._route_query(query_type)
        start_time = time.time()
        
        try:
            async with self.get_raw_connection(role) as conn:
                if params:
                    result = await conn.fetch(query, *params.values())
                else:
                    result = await conn.fetch(query)
                
                # Convert to list of dicts
                return [dict(row) for row in result]
                
        except Exception as e:
            logger.error("Query execution failed", 
                        role=role.value, 
                        query=query[:200],
                        error=str(e))
            raise
        finally:
            duration = time.time() - start_time
            self.metrics[role].add_query_time(duration)
    
    async def execute_scalar(
        self, 
        query: str, 
        params: Optional[Dict[str, Any]] = None,
        query_type: QueryType = QueryType.READ
    ) -> Any:
        """Execute query and return single value"""
        role = self._route_query(query_type)
        start_time = time.time()
        
        try:
            async with self.get_raw_connection(role) as conn:
                if params:
                    result = await conn.fetchval(query, *params.values())
                else:
                    result = await conn.fetchval(query)
                
                return result
                
        except Exception as e:
            logger.error("Scalar query execution failed", 
                        role=role.value, 
                        query=query[:200],
                        error=str(e))
            raise
        finally:
            duration = time.time() - start_time
            self.metrics[role].add_query_time(duration)
    
    async def execute_transaction(
        self, 
        queries: List[tuple],  # [(query, params), ...]
        query_type: QueryType = QueryType.WRITE
    ) -> List[Any]:
        """Execute multiple queries in a transaction"""
        role = self._route_query(query_type)
        start_time = time.time()
        results = []
        
        try:
            async with self.get_raw_connection(role) as conn:
                async with conn.transaction():
                    for query, params in queries:
                        if params:
                            result = await conn.fetch(query, *params.values())
                        else:
                            result = await conn.fetch(query)
                        results.append([dict(row) for row in result])
                
                return results
                
        except Exception as e:
            logger.error("Transaction execution failed", 
                        role=role.value, 
                        queries_count=len(queries),
                        error=str(e))
            raise
        finally:
            duration = time.time() - start_time
            self.metrics[role].add_query_time(duration)
    
    def get_pool_stats(self) -> Dict[str, Dict[str, Any]]:
        """Get connection pool statistics"""
        stats = {}
        
        for role, engine in self.engines.items():
            pool = engine.pool
            metrics = self.metrics[role]
            
            stats[role.value] = {
                "pool_size": pool.size(),
                "checked_in": pool.checkedin(),
                "checked_out": pool.checkedout(),
                "overflow": pool.overflow(),
                "total_connections": metrics.total_connections,
                "active_connections": metrics.active_connections,
                "queries_executed": metrics.queries_executed,
                "avg_query_time": metrics.get_avg_query_time(),
                "connection_errors": metrics.connection_errors,
                "health_status": metrics.health_status,
                "last_health_check": metrics.last_health_check
            }
        
        return stats
    
    async def optimize_connections(self):
        """Optimize connection pool sizes based on usage patterns"""
        try:
            # Get system resources
            cpu_percent = psutil.cpu_percent(interval=1)
            memory_percent = psutil.virtual_memory().percent
            
            for role, config in self.configs.items():
                metrics = self.metrics[role]
                engine = self.engines[role]
                
                # Calculate optimal pool size based on metrics
                avg_active = metrics.active_connections
                query_rate = len(metrics.query_times) / 60  # queries per minute
                
                # Adjust pool size if needed
                if avg_active > config.max_size * 0.8:  # 80% utilization
                    new_max_size = min(config.max_size + 5, 50)  # Cap at 50
                    logger.info("Increasing pool size", 
                              role=role.value,
                              old_size=config.max_size,
                              new_size=new_max_size)
                    config.max_size = new_max_size
                
                elif avg_active < config.max_size * 0.3:  # 30% utilization
                    new_max_size = max(config.max_size - 2, config.min_size)
                    logger.info("Decreasing pool size", 
                              role=role.value,
                              old_size=config.max_size,
                              new_size=new_max_size)
                    config.max_size = new_max_size
            
        except Exception as e:
            logger.error("Connection optimization failed", error=str(e))
    
    async def close(self):
        """Close all database connections"""
        try:
            # Signal shutdown
            self._shutdown_event.set()
            
            # Cancel health monitoring tasks
            for task in self.health_check_tasks:
                task.cancel()
            
            # Wait for tasks to complete
            if self.health_check_tasks:
                await asyncio.gather(*self.health_check_tasks, return_exceptions=True)
            
            # Close AsyncPG pools
            for pool in self.asyncpg_pools.values():
                await pool.close()
            
            # Dispose SQLAlchemy engines
            for engine in self.engines.values():
                await engine.dispose()
            
            logger.info("Database connection pool closed")
            
        except Exception as e:
            logger.error("Error closing database pool", error=str(e))

# Factory function
async def create_database_pool(configs: List[DatabaseConfig]) -> DatabaseConnectionPool:
    """Create and initialize database connection pool"""
    pool = DatabaseConnectionPool(configs)
    await pool.initialize()
    return pool

# Dependency injection helper
_db_pool: Optional[DatabaseConnectionPool] = None

async def get_database_pool() -> DatabaseConnectionPool:
    """Get the global database pool instance"""
    global _db_pool
    if _db_pool is None:
        raise RuntimeError("Database pool not initialized")
    return _db_pool

async def initialize_database_pool(configs: List[DatabaseConfig]):
    """Initialize the global database pool"""
    global _db_pool
    _db_pool = await create_database_pool(configs)

async def close_database_pool():
    """Close the global database pool"""
    global _db_pool
    if _db_pool:
        await _db_pool.close()
        _db_pool = None