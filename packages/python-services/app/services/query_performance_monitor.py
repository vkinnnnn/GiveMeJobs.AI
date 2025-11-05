"""
Query Performance Monitoring Service
Monitors database query performance, identifies slow queries, and provides optimization recommendations
"""

import asyncio
import time
import hashlib
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from collections import defaultdict, deque
import structlog
import re
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database_pool import DatabaseConnectionPool, QueryType

logger = structlog.get_logger()

@dataclass
class QueryStats:
    """Query execution statistics"""
    query_hash: str
    query_pattern: str
    execution_count: int = 0
    total_time: float = 0.0
    min_time: float = float('inf')
    max_time: float = 0.0
    avg_time: float = 0.0
    last_executed: Optional[datetime] = None
    error_count: int = 0
    
    # Recent execution times (for trend analysis)
    recent_times: deque = field(default_factory=lambda: deque(maxlen=100))
    
    def add_execution(self, duration: float, error: bool = False):
        """Add execution statistics"""
        self.execution_count += 1
        
        if error:
            self.error_count += 1
            return
        
        self.total_time += duration
        self.min_time = min(self.min_time, duration)
        self.max_time = max(self.max_time, duration)
        self.avg_time = self.total_time / (self.execution_count - self.error_count)
        self.last_executed = datetime.utcnow()
        self.recent_times.append(duration)
    
    def get_recent_avg(self) -> float:
        """Get average of recent executions"""
        if not self.recent_times:
            return 0.0
        return sum(self.recent_times) / len(self.recent_times)
    
    def is_degrading(self, threshold: float = 1.5) -> bool:
        """Check if query performance is degrading"""
        if len(self.recent_times) < 10:
            return False
        
        recent_avg = self.get_recent_avg()
        return recent_avg > self.avg_time * threshold

@dataclass
class SlowQuery:
    """Slow query information"""
    query_hash: str
    query_pattern: str
    duration: float
    timestamp: datetime
    parameters: Optional[Dict[str, Any]] = None
    execution_plan: Optional[str] = None
    recommendations: List[str] = field(default_factory=list)

class QueryPerformanceMonitor:
    """Query performance monitoring and optimization service"""
    
    def __init__(self, db_pool: DatabaseConnectionPool):
        self.db_pool = db_pool
        self.query_stats: Dict[str, QueryStats] = {}
        self.slow_queries: deque = deque(maxlen=1000)  # Keep last 1000 slow queries
        
        # Configuration
        self.slow_query_threshold = 1.0  # seconds
        self.monitoring_enabled = True
        self.explain_analyze_enabled = True
        
        # Performance tracking
        self.monitoring_overhead = deque(maxlen=100)
        
        # Background tasks
        self.analysis_task: Optional[asyncio.Task] = None
        self.cleanup_task: Optional[asyncio.Task] = None
    
    async def start_monitoring(self):
        """Start background monitoring tasks"""
        if not self.monitoring_enabled:
            return
        
        self.analysis_task = asyncio.create_task(self._analysis_loop())
        self.cleanup_task = asyncio.create_task(self._cleanup_loop())
        
        logger.info("Query performance monitoring started")
    
    async def stop_monitoring(self):
        """Stop background monitoring tasks"""
        if self.analysis_task:
            self.analysis_task.cancel()
        if self.cleanup_task:
            self.cleanup_task.cancel()
        
        logger.info("Query performance monitoring stopped")
    
    def _normalize_query(self, query: str) -> str:
        """Normalize query for pattern matching"""
        # Remove extra whitespace
        normalized = re.sub(r'\s+', ' ', query.strip())
        
        # Replace parameter placeholders with generic markers
        normalized = re.sub(r'\$\d+', '$?', normalized)  # PostgreSQL parameters
        normalized = re.sub(r'%\([^)]+\)s', '%(?)', normalized)  # Python parameters
        normalized = re.sub(r"'[^']*'", "'?'", normalized)  # String literals
        normalized = re.sub(r'\b\d+\b', '?', normalized)  # Numeric literals
        
        # Replace IN clauses with generic form
        normalized = re.sub(r'IN\s*\([^)]+\)', 'IN (?)', normalized, flags=re.IGNORECASE)
        
        return normalized.lower()
    
    def _get_query_hash(self, query: str) -> str:
        """Generate hash for query pattern"""
        normalized = self._normalize_query(query)
        return hashlib.md5(normalized.encode()).hexdigest()[:16]
    
    async def record_query_execution(
        self, 
        query: str, 
        duration: float, 
        error: bool = False,
        parameters: Optional[Dict[str, Any]] = None
    ):
        """Record query execution for monitoring"""
        if not self.monitoring_enabled:
            return
        
        start_time = time.time()
        
        try:
            query_hash = self._get_query_hash(query)
            query_pattern = self._normalize_query(query)
            
            # Update or create query stats
            if query_hash not in self.query_stats:
                self.query_stats[query_hash] = QueryStats(
                    query_hash=query_hash,
                    query_pattern=query_pattern
                )
            
            self.query_stats[query_hash].add_execution(duration, error)
            
            # Record slow queries
            if not error and duration > self.slow_query_threshold:
                await self._record_slow_query(query_hash, query_pattern, duration, parameters)
            
        except Exception as e:
            logger.error("Failed to record query execution", error=str(e))
        finally:
            # Track monitoring overhead
            overhead = time.time() - start_time
            self.monitoring_overhead.append(overhead)
    
    async def _record_slow_query(
        self, 
        query_hash: str, 
        query_pattern: str, 
        duration: float,
        parameters: Optional[Dict[str, Any]] = None
    ):
        """Record slow query with analysis"""
        try:
            execution_plan = None
            recommendations = []
            
            # Get execution plan if enabled
            if self.explain_analyze_enabled:
                execution_plan = await self._get_execution_plan(query_pattern, parameters)
                recommendations = self._analyze_execution_plan(execution_plan)
            
            slow_query = SlowQuery(
                query_hash=query_hash,
                query_pattern=query_pattern,
                duration=duration,
                timestamp=datetime.utcnow(),
                parameters=parameters,
                execution_plan=execution_plan,
                recommendations=recommendations
            )
            
            self.slow_queries.append(slow_query)
            
            logger.warning("Slow query detected", 
                         duration=duration,
                         query_hash=query_hash,
                         recommendations=recommendations)
            
        except Exception as e:
            logger.error("Failed to analyze slow query", error=str(e))
    
    async def _get_execution_plan(
        self, 
        query: str, 
        parameters: Optional[Dict[str, Any]] = None
    ) -> Optional[str]:
        """Get query execution plan"""
        try:
            # Prepare EXPLAIN ANALYZE query
            explain_query = f"EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {query}"
            
            async with self.db_pool.get_session(QueryType.READ) as session:
                if parameters:
                    result = await session.execute(text(explain_query), parameters)
                else:
                    result = await session.execute(text(explain_query))
                
                plan_data = result.fetchone()
                if plan_data:
                    return str(plan_data[0])
                
        except Exception as e:
            logger.debug("Failed to get execution plan", error=str(e))
        
        return None
    
    def _analyze_execution_plan(self, execution_plan: Optional[str]) -> List[str]:
        """Analyze execution plan and provide recommendations"""
        if not execution_plan:
            return []
        
        recommendations = []
        
        try:
            import json
            plan_json = json.loads(execution_plan)
            
            # Analyze plan for common issues
            self._analyze_plan_node(plan_json[0]['Plan'], recommendations)
            
        except Exception as e:
            logger.debug("Failed to analyze execution plan", error=str(e))
        
        return recommendations
    
    def _analyze_plan_node(self, node: Dict[str, Any], recommendations: List[str]):
        """Recursively analyze execution plan nodes"""
        node_type = node.get('Node Type', '')
        
        # Check for sequential scans on large tables
        if node_type == 'Seq Scan':
            rows = node.get('Actual Rows', 0)
            if rows > 10000:
                recommendations.append(
                    f"Consider adding index for sequential scan on large table ({rows} rows)"
                )
        
        # Check for expensive sorts
        if node_type == 'Sort':
            sort_method = node.get('Sort Method', '')
            if 'external' in sort_method.lower():
                recommendations.append(
                    "Sort operation using external storage - consider increasing work_mem"
                )
        
        # Check for nested loops with high cost
        if node_type == 'Nested Loop':
            actual_loops = node.get('Actual Loops', 1)
            if actual_loops > 1000:
                recommendations.append(
                    f"High-cost nested loop ({actual_loops} loops) - consider hash join"
                )
        
        # Check for hash joins with memory issues
        if node_type == 'Hash Join':
            hash_buckets = node.get('Hash Buckets', 0)
            hash_batches = node.get('Hash Batches', 0)
            if hash_batches > 1:
                recommendations.append(
                    "Hash join using multiple batches - consider increasing work_mem"
                )
        
        # Recursively analyze child nodes
        for child in node.get('Plans', []):
            self._analyze_plan_node(child, recommendations)
    
    async def _analysis_loop(self):
        """Background analysis loop"""
        while True:
            try:
                await asyncio.sleep(300)  # Run every 5 minutes
                await self._analyze_query_patterns()
                await self._detect_performance_regressions()
                
            except Exception as e:
                logger.error("Query analysis loop error", error=str(e))
    
    async def _cleanup_loop(self):
        """Background cleanup loop"""
        while True:
            try:
                await asyncio.sleep(3600)  # Run every hour
                await self._cleanup_old_data()
                
            except Exception as e:
                logger.error("Query cleanup loop error", error=str(e))
    
    async def _analyze_query_patterns(self):
        """Analyze query patterns for optimization opportunities"""
        try:
            # Find most frequent queries
            frequent_queries = sorted(
                self.query_stats.values(),
                key=lambda x: x.execution_count,
                reverse=True
            )[:10]
            
            # Find slowest queries
            slow_queries = sorted(
                self.query_stats.values(),
                key=lambda x: x.avg_time,
                reverse=True
            )[:10]
            
            # Log analysis results
            logger.info("Query pattern analysis completed",
                       total_patterns=len(self.query_stats),
                       most_frequent=[q.query_hash for q in frequent_queries[:5]],
                       slowest=[q.query_hash for q in slow_queries[:5]])
            
        except Exception as e:
            logger.error("Query pattern analysis failed", error=str(e))
    
    async def _detect_performance_regressions(self):
        """Detect performance regressions in queries"""
        try:
            degrading_queries = []
            
            for query_stats in self.query_stats.values():
                if query_stats.is_degrading():
                    degrading_queries.append(query_stats)
            
            if degrading_queries:
                logger.warning("Performance regressions detected",
                             count=len(degrading_queries),
                             queries=[q.query_hash for q in degrading_queries])
            
        except Exception as e:
            logger.error("Performance regression detection failed", error=str(e))
    
    async def _cleanup_old_data(self):
        """Clean up old monitoring data"""
        try:
            cutoff_time = datetime.utcnow() - timedelta(hours=24)
            
            # Remove old query stats with no recent activity
            old_queries = []
            for query_hash, stats in self.query_stats.items():
                if (stats.last_executed and 
                    stats.last_executed < cutoff_time and 
                    stats.execution_count < 10):
                    old_queries.append(query_hash)
            
            for query_hash in old_queries:
                del self.query_stats[query_hash]
            
            logger.debug("Query monitoring cleanup completed",
                        removed_patterns=len(old_queries))
            
        except Exception as e:
            logger.error("Query monitoring cleanup failed", error=str(e))
    
    async def get_performance_report(self) -> Dict[str, Any]:
        """Generate comprehensive performance report"""
        try:
            # Calculate summary statistics
            total_queries = sum(stats.execution_count for stats in self.query_stats.values())
            total_time = sum(stats.total_time for stats in self.query_stats.values())
            avg_query_time = total_time / total_queries if total_queries > 0 else 0
            
            # Get top queries by different metrics
            top_by_count = sorted(
                self.query_stats.values(),
                key=lambda x: x.execution_count,
                reverse=True
            )[:10]
            
            top_by_time = sorted(
                self.query_stats.values(),
                key=lambda x: x.total_time,
                reverse=True
            )[:10]
            
            top_by_avg_time = sorted(
                self.query_stats.values(),
                key=lambda x: x.avg_time,
                reverse=True
            )[:10]
            
            # Recent slow queries
            recent_slow = list(self.slow_queries)[-20:]  # Last 20 slow queries
            
            # Monitoring overhead
            avg_overhead = (sum(self.monitoring_overhead) / len(self.monitoring_overhead) 
                          if self.monitoring_overhead else 0)
            
            return {
                "summary": {
                    "total_query_patterns": len(self.query_stats),
                    "total_executions": total_queries,
                    "total_execution_time": total_time,
                    "average_query_time": avg_query_time,
                    "slow_queries_count": len(self.slow_queries),
                    "monitoring_overhead_ms": avg_overhead * 1000
                },
                "top_by_frequency": [
                    {
                        "query_hash": stats.query_hash,
                        "pattern": stats.query_pattern[:200],
                        "execution_count": stats.execution_count,
                        "avg_time": stats.avg_time
                    }
                    for stats in top_by_count
                ],
                "top_by_total_time": [
                    {
                        "query_hash": stats.query_hash,
                        "pattern": stats.query_pattern[:200],
                        "total_time": stats.total_time,
                        "execution_count": stats.execution_count
                    }
                    for stats in top_by_time
                ],
                "slowest_queries": [
                    {
                        "query_hash": stats.query_hash,
                        "pattern": stats.query_pattern[:200],
                        "avg_time": stats.avg_time,
                        "max_time": stats.max_time,
                        "execution_count": stats.execution_count
                    }
                    for stats in top_by_avg_time
                ],
                "recent_slow_queries": [
                    {
                        "query_hash": slow.query_hash,
                        "duration": slow.duration,
                        "timestamp": slow.timestamp.isoformat(),
                        "recommendations": slow.recommendations
                    }
                    for slow in recent_slow
                ]
            }
            
        except Exception as e:
            logger.error("Failed to generate performance report", error=str(e))
            return {"error": str(e)}
    
    async def get_query_recommendations(self) -> List[Dict[str, Any]]:
        """Get optimization recommendations for queries"""
        recommendations = []
        
        try:
            # Analyze query patterns for optimization opportunities
            for stats in self.query_stats.values():
                query_recommendations = []
                
                # High frequency queries with moderate performance
                if (stats.execution_count > 100 and 
                    0.1 < stats.avg_time < 1.0):
                    query_recommendations.append(
                        "Consider optimizing this frequently executed query"
                    )
                
                # Queries with high variance in execution time
                if len(stats.recent_times) > 10:
                    variance = max(stats.recent_times) - min(stats.recent_times)
                    if variance > stats.avg_time * 2:
                        query_recommendations.append(
                            "Query has high execution time variance - investigate parameter sensitivity"
                        )
                
                # Degrading performance
                if stats.is_degrading():
                    query_recommendations.append(
                        "Query performance is degrading - check for data growth or plan changes"
                    )
                
                if query_recommendations:
                    recommendations.append({
                        "query_hash": stats.query_hash,
                        "pattern": stats.query_pattern[:200],
                        "recommendations": query_recommendations,
                        "stats": {
                            "execution_count": stats.execution_count,
                            "avg_time": stats.avg_time,
                            "max_time": stats.max_time
                        }
                    })
            
        except Exception as e:
            logger.error("Failed to generate query recommendations", error=str(e))
        
        return recommendations
    
    def get_monitoring_stats(self) -> Dict[str, Any]:
        """Get monitoring service statistics"""
        return {
            "monitoring_enabled": self.monitoring_enabled,
            "tracked_patterns": len(self.query_stats),
            "slow_queries_recorded": len(self.slow_queries),
            "slow_query_threshold": self.slow_query_threshold,
            "avg_monitoring_overhead_ms": (
                sum(self.monitoring_overhead) / len(self.monitoring_overhead) * 1000
                if self.monitoring_overhead else 0
            )
        }