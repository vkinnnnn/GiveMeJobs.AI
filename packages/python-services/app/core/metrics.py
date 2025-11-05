"""
Custom Prometheus metrics for auto-scaling and monitoring.
"""

import asyncio
import time
from typing import Dict, Optional, List
from dataclasses import dataclass

import structlog
from prometheus_client import (
    Counter, Histogram, Gauge, Info, Enum,
    CollectorRegistry, generate_latest, CONTENT_TYPE_LATEST
)
from fastapi import FastAPI, Response
from fastapi.responses import PlainTextResponse
import redis.asyncio as redis
import httpx

logger = structlog.get_logger(__name__)


@dataclass
class MetricConfig:
    """Configuration for custom metrics."""
    name: str
    description: str
    labels: List[str]
    metric_type: str  # 'counter', 'histogram', 'gauge', 'info', 'enum'


class CustomMetricsCollector:
    """Custom metrics collector for FastAPI auto-scaling."""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis_client = redis_client
        self.registry = CollectorRegistry()
        
        # HTTP Request Metrics
        self.http_requests_total = Counter(
            'http_requests_total',
            'Total HTTP requests',
            ['method', 'endpoint', 'status_code'],
            registry=self.registry
        )
        
        self.http_request_duration = Histogram(
            'http_request_duration_seconds',
            'HTTP request duration in seconds',
            ['method', 'endpoint'],
            registry=self.registry
        )
        
        self.http_requests_per_second = Gauge(
            'http_requests_per_second',
            'HTTP requests per second (1-minute average)',
            registry=self.registry
        )
        
        self.response_time_p95 = Gauge(
            'response_time_p95',
            '95th percentile response time in milliseconds',
            registry=self.registry
        )
        
        # Application Metrics
        self.active_connections = Gauge(
            'active_connections',
            'Number of active connections',
            registry=self.registry
        )
        
        self.concurrent_requests = Gauge(
            'concurrent_requests',
            'Number of concurrent requests being processed',
            registry=self.registry
        )
        
        self.queue_size = Gauge(
            'queue_size',
            'Size of processing queues',
            ['queue_name'],
            registry=self.registry
        )
        
        # Database Metrics
        self.db_connections_active = Gauge(
            'db_connections_active',
            'Active database connections',
            registry=self.registry
        )
        
        self.db_connections_idle = Gauge(
            'db_connections_idle',
            'Idle database connections',
            registry=self.registry
        )
        
        self.db_query_duration = Histogram(
            'db_query_duration_seconds',
            'Database query duration in seconds',
            ['query_type'],
            registry=self.registry
        )
        
        # Redis Metrics
        self.redis_connections_active = Gauge(
            'redis_connections_active',
            'Active Redis connections',
            registry=self.registry
        )
        
        self.redis_memory_usage = Gauge(
            'redis_memory_usage_bytes',
            'Redis memory usage in bytes',
            registry=self.registry
        )
        
        self.cache_hit_rate = Gauge(
            'cache_hit_rate',
            'Cache hit rate percentage',
            ['cache_type'],
            registry=self.registry
        )
        
        # AI/ML Metrics
        self.ai_requests_total = Counter(
            'ai_requests_total',
            'Total AI/ML requests',
            ['service', 'model', 'status'],
            registry=self.registry
        )
        
        self.ai_request_duration = Histogram(
            'ai_request_duration_seconds',
            'AI/ML request duration in seconds',
            ['service', 'model'],
            registry=self.registry
        )
        
        self.ai_queue_length = Gauge(
            'ai_queue_length',
            'AI processing queue length',
            ['service'],
            registry=self.registry
        )
        
        # Celery Metrics
        self.celery_tasks_total = Counter(
            'celery_tasks_total',
            'Total Celery tasks',
            ['task_name', 'status'],
            registry=self.registry
        )
        
        self.celery_task_duration = Histogram(
            'celery_task_duration_seconds',
            'Celery task duration in seconds',
            ['task_name'],
            registry=self.registry
        )
        
        self.celery_queue_length = Gauge(
            'celery_queue_length',
            'Celery queue length',
            ['queue'],
            registry=self.registry
        )
        
        self.celery_workers_active = Gauge(
            'celery_workers_active',
            'Number of active Celery workers',
            registry=self.registry
        )
        
        # Business Metrics
        self.user_sessions_active = Gauge(
            'user_sessions_active',
            'Number of active user sessions',
            registry=self.registry
        )
        
        self.job_applications_per_minute = Gauge(
            'job_applications_per_minute',
            'Job applications submitted per minute',
            registry=self.registry
        )
        
        self.document_generations_per_minute = Gauge(
            'document_generations_per_minute',
            'Document generations per minute',
            registry=self.registry
        )
        
        # System Health Metrics
        self.service_health = Enum(
            'service_health',
            'Service health status',
            ['service'],
            states=['healthy', 'degraded', 'unhealthy'],
            registry=self.registry
        )
        
        self.dependency_health = Gauge(
            'dependency_health',
            'Dependency health (1=healthy, 0=unhealthy)',
            ['dependency'],
            registry=self.registry
        )
        
        # Start background metrics collection
        self._metrics_task = None
        
    async def start_collection(self):
        """Start background metrics collection."""
        if self._metrics_task is None:
            self._metrics_task = asyncio.create_task(self._collect_metrics_loop())
    
    async def stop_collection(self):
        """Stop background metrics collection."""
        if self._metrics_task:
            self._metrics_task.cancel()
            try:
                await self._metrics_task
            except asyncio.CancelledError:
                pass
            self._metrics_task = None
    
    async def _collect_metrics_loop(self):
        """Background loop to collect metrics."""
        while True:
            try:
                await self._collect_system_metrics()
                await self._collect_redis_metrics()
                await self._collect_celery_metrics()
                await self._collect_business_metrics()
                await asyncio.sleep(30)  # Collect every 30 seconds
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Error collecting metrics", error=str(e))
                await asyncio.sleep(60)  # Wait longer on error
    
    async def _collect_system_metrics(self):
        """Collect system-level metrics."""
        try:
            # This would typically collect from system APIs
            # For now, we'll simulate some metrics
            
            # Simulate active connections
            self.active_connections.set(50)
            
            # Simulate concurrent requests
            self.concurrent_requests.set(10)
            
        except Exception as e:
            logger.error("Error collecting system metrics", error=str(e))
    
    async def _collect_redis_metrics(self):
        """Collect Redis metrics."""
        try:
            # Get Redis info
            info = await self.redis_client.info()
            
            # Connected clients
            self.redis_connections_active.set(info.get('connected_clients', 0))
            
            # Memory usage
            self.redis_memory_usage.set(info.get('used_memory', 0))
            
            # Calculate cache hit rate
            keyspace_hits = info.get('keyspace_hits', 0)
            keyspace_misses = info.get('keyspace_misses', 0)
            total_requests = keyspace_hits + keyspace_misses
            
            if total_requests > 0:
                hit_rate = (keyspace_hits / total_requests) * 100
                self.cache_hit_rate.labels(cache_type='redis').set(hit_rate)
            
        except Exception as e:
            logger.error("Error collecting Redis metrics", error=str(e))
    
    async def _collect_celery_metrics(self):
        """Collect Celery metrics."""
        try:
            # This would typically use Celery's inspect API
            # For now, we'll simulate some metrics
            
            # Simulate queue lengths
            self.celery_queue_length.labels(queue='job_processing').set(25)
            self.celery_queue_length.labels(queue='document_processing').set(10)
            self.celery_queue_length.labels(queue='analytics').set(5)
            
            # Simulate active workers
            self.celery_workers_active.set(4)
            
        except Exception as e:
            logger.error("Error collecting Celery metrics", error=str(e))
    
    async def _collect_business_metrics(self):
        """Collect business-specific metrics."""
        try:
            # This would typically query the database for business metrics
            # For now, we'll simulate some metrics
            
            # Simulate active user sessions
            self.user_sessions_active.set(150)
            
            # Simulate job applications per minute
            self.job_applications_per_minute.set(5)
            
            # Simulate document generations per minute
            self.document_generations_per_minute.set(8)
            
        except Exception as e:
            logger.error("Error collecting business metrics", error=str(e))
    
    def record_http_request(self, method: str, endpoint: str, status_code: int, duration: float):
        """Record HTTP request metrics."""
        self.http_requests_total.labels(
            method=method,
            endpoint=endpoint,
            status_code=str(status_code)
        ).inc()
        
        self.http_request_duration.labels(
            method=method,
            endpoint=endpoint
        ).observe(duration)
    
    def record_db_query(self, query_type: str, duration: float):
        """Record database query metrics."""
        self.db_query_duration.labels(query_type=query_type).observe(duration)
    
    def record_ai_request(self, service: str, model: str, status: str, duration: float):
        """Record AI/ML request metrics."""
        self.ai_requests_total.labels(
            service=service,
            model=model,
            status=status
        ).inc()
        
        self.ai_request_duration.labels(
            service=service,
            model=model
        ).observe(duration)
    
    def record_celery_task(self, task_name: str, status: str, duration: float):
        """Record Celery task metrics."""
        self.celery_tasks_total.labels(
            task_name=task_name,
            status=status
        ).inc()
        
        self.celery_task_duration.labels(task_name=task_name).observe(duration)
    
    def set_service_health(self, service: str, status: str):
        """Set service health status."""
        self.service_health.labels(service=service).state(status)
    
    def set_dependency_health(self, dependency: str, healthy: bool):
        """Set dependency health status."""
        self.dependency_health.labels(dependency=dependency).set(1 if healthy else 0)
    
    def get_metrics(self) -> str:
        """Get metrics in Prometheus format."""
        return generate_latest(self.registry).decode('utf-8')


# Global metrics collector instance
_metrics_collector: Optional[CustomMetricsCollector] = None


def get_metrics_collector() -> Optional[CustomMetricsCollector]:
    """Get the global metrics collector."""
    return _metrics_collector


def init_metrics_collector(redis_client: redis.Redis) -> CustomMetricsCollector:
    """Initialize the global metrics collector."""
    global _metrics_collector
    _metrics_collector = CustomMetricsCollector(redis_client)
    return _metrics_collector


def setup_metrics_endpoint(app: FastAPI):
    """Set up metrics endpoint for Prometheus scraping."""
    
    @app.get("/metrics", response_class=PlainTextResponse)
    async def metrics():
        """Prometheus metrics endpoint."""
        collector = get_metrics_collector()
        if collector:
            return collector.get_metrics()
        return "# No metrics available\n"
    
    @app.get("/metrics/health")
    async def metrics_health():
        """Metrics collector health check."""
        collector = get_metrics_collector()
        if collector:
            return {
                "status": "healthy",
                "collector_active": collector._metrics_task is not None,
                "timestamp": time.time()
            }
        return {
            "status": "unhealthy",
            "error": "Metrics collector not initialized",
            "timestamp": time.time()
        }