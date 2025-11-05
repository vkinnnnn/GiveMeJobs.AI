"""
Performance Monitoring and Optimization Service
Comprehensive APM solution with real-time monitoring, alerting, and optimization recommendations
"""

import asyncio
import time
import psutil
import gc
from typing import Dict, List, Optional, Any, Callable, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from collections import deque, defaultdict
from enum import Enum
import structlog
import json
import aiohttp
from contextlib import asynccontextmanager
import threading
from concurrent.futures import ThreadPoolExecutor

logger = structlog.get_logger()

class MetricType(Enum):
    """Performance metric types"""
    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"
    TIMER = "timer"

class AlertSeverity(Enum):
    """Alert severity levels"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

@dataclass
class PerformanceMetric:
    """Performance metric data structure"""
    name: str
    value: float
    metric_type: MetricType
    timestamp: datetime
    tags: Dict[str, str] = field(default_factory=dict)
    unit: Optional[str] = None

@dataclass
class PerformanceAlert:
    """Performance alert data structure"""
    name: str
    severity: AlertSeverity
    message: str
    timestamp: datetime
    metric_name: str
    current_value: float
    threshold: float
    tags: Dict[str, str] = field(default_factory=dict)

@dataclass
class SystemMetrics:
    """System-level performance metrics"""
    cpu_percent: float
    memory_percent: float
    memory_available_mb: float
    disk_usage_percent: float
    disk_io_read_mb: float
    disk_io_write_mb: float
    network_bytes_sent: int
    network_bytes_recv: int
    load_average: Tuple[float, float, float]
    process_count: int
    thread_count: int
    file_descriptors: int
    timestamp: datetime = field(default_factory=datetime.utcnow)

@dataclass
class ApplicationMetrics:
    """Application-level performance metrics"""
    request_count: int
    request_rate: float
    avg_response_time: float
    p95_response_time: float
    p99_response_time: float
    error_rate: float
    active_connections: int
    database_connections: int
    cache_hit_rate: float
    memory_usage_mb: float
    gc_collections: int
    timestamp: datetime = field(default_factory=datetime.utcnow)

class PerformanceMonitoringService:
    """Comprehensive performance monitoring and optimization service"""
    
    def __init__(self):
        # Metrics storage
        self.metrics: Dict[str, deque] = defaultdict(lambda: deque(maxlen=1000))
        self.alerts: deque = deque(maxlen=500)
        
        # System monitoring
        self.system_metrics_history: deque = deque(maxlen=1000)
        self.app_metrics_history: deque = deque(maxlen=1000)
        
        # Performance tracking
        self.request_times: deque = deque(maxlen=10000)
        self.error_counts: Dict[str, int] = defaultdict(int)
        self.endpoint_stats: Dict[str, Dict[str, Any]] = defaultdict(lambda: {
            'count': 0,
            'total_time': 0.0,
            'min_time': float('inf'),
            'max_time': 0.0,
            'error_count': 0,
            'recent_times': deque(maxlen=100)
        })
        
        # Alert thresholds
        self.alert_thresholds = {
            'cpu_percent': {'warning': 70, 'critical': 90},
            'memory_percent': {'warning': 80, 'critical': 95},
            'disk_usage_percent': {'warning': 85, 'critical': 95},
            'response_time_p95': {'warning': 2.0, 'critical': 5.0},
            'error_rate': {'warning': 0.05, 'critical': 0.10},
            'database_connections': {'warning': 80, 'critical': 95}
        }
        
        # Monitoring configuration
        self.monitoring_enabled = True
        self.collection_interval = 30  # seconds
        self.retention_hours = 24
        
        # Background tasks
        self.monitoring_tasks: List[asyncio.Task] = []
        self.shutdown_event = asyncio.Event()
        
        # External integrations
        self.webhook_urls: List[str] = []
        self.prometheus_enabled = False
        self.grafana_enabled = False
        
        # Performance optimization
        self.optimization_recommendations: List[Dict[str, Any]] = []
        self.auto_optimization_enabled = False
        
        # Thread pool for CPU-intensive operations
        self.thread_pool = ThreadPoolExecutor(max_workers=2)
    
    async def start_monitoring(self):
        """Start background monitoring tasks"""
        if not self.monitoring_enabled:
            return
        
        # Start monitoring tasks
        self.monitoring_tasks = [
            asyncio.create_task(self._system_metrics_loop()),
            asyncio.create_task(self._application_metrics_loop()),
            asyncio.create_task(self._alert_processing_loop()),
            asyncio.create_task(self._optimization_analysis_loop()),
            asyncio.create_task(self._cleanup_loop())
        ]
        
        logger.info("Performance monitoring started")
    
    async def stop_monitoring(self):
        """Stop background monitoring tasks"""
        self.shutdown_event.set()
        
        # Cancel all monitoring tasks
        for task in self.monitoring_tasks:
            task.cancel()
        
        # Wait for tasks to complete
        if self.monitoring_tasks:
            await asyncio.gather(*self.monitoring_tasks, return_exceptions=True)
        
        # Shutdown thread pool
        self.thread_pool.shutdown(wait=True)
        
        logger.info("Performance monitoring stopped")
    
    async def _system_metrics_loop(self):
        """Background system metrics collection"""
        while not self.shutdown_event.is_set():
            try:
                await asyncio.sleep(self.collection_interval)
                
                # Collect system metrics in thread pool to avoid blocking
                metrics = await asyncio.get_event_loop().run_in_executor(
                    self.thread_pool, self._collect_system_metrics
                )
                
                self.system_metrics_history.append(metrics)
                
                # Check for alerts
                await self._check_system_alerts(metrics)
                
            except Exception as e:
                logger.error("System metrics collection error", error=str(e))
    
    def _collect_system_metrics(self) -> SystemMetrics:
        """Collect system-level metrics (runs in thread pool)"""
        try:
            # CPU metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            
            # Memory metrics
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            memory_available_mb = memory.available / 1024 / 1024
            
            # Disk metrics
            disk = psutil.disk_usage('/')
            disk_usage_percent = disk.percent
            
            # Disk I/O
            disk_io = psutil.disk_io_counters()
            disk_io_read_mb = disk_io.read_bytes / 1024 / 1024 if disk_io else 0
            disk_io_write_mb = disk_io.write_bytes / 1024 / 1024 if disk_io else 0
            
            # Network metrics
            network = psutil.net_io_counters()
            network_bytes_sent = network.bytes_sent if network else 0
            network_bytes_recv = network.bytes_recv if network else 0
            
            # Load average
            load_avg = psutil.getloadavg() if hasattr(psutil, 'getloadavg') else (0, 0, 0)
            
            # Process metrics
            process_count = len(psutil.pids())
            
            # Current process metrics
            current_process = psutil.Process()
            thread_count = current_process.num_threads()
            
            try:
                file_descriptors = current_process.num_fds()
            except (AttributeError, psutil.AccessDenied):
                file_descriptors = 0
            
            return SystemMetrics(
                cpu_percent=cpu_percent,
                memory_percent=memory_percent,
                memory_available_mb=memory_available_mb,
                disk_usage_percent=disk_usage_percent,
                disk_io_read_mb=disk_io_read_mb,
                disk_io_write_mb=disk_io_write_mb,
                network_bytes_sent=network_bytes_sent,
                network_bytes_recv=network_bytes_recv,
                load_average=load_avg,
                process_count=process_count,
                thread_count=thread_count,
                file_descriptors=file_descriptors
            )
            
        except Exception as e:
            logger.error("Failed to collect system metrics", error=str(e))
            # Return default metrics on error
            return SystemMetrics(
                cpu_percent=0, memory_percent=0, memory_available_mb=0,
                disk_usage_percent=0, disk_io_read_mb=0, disk_io_write_mb=0,
                network_bytes_sent=0, network_bytes_recv=0, load_average=(0, 0, 0),
                process_count=0, thread_count=0, file_descriptors=0
            )
    
    async def _application_metrics_loop(self):
        """Background application metrics collection"""
        while not self.shutdown_event.is_set():
            try:
                await asyncio.sleep(self.collection_interval)
                
                metrics = self._collect_application_metrics()
                self.app_metrics_history.append(metrics)
                
                # Check for alerts
                await self._check_application_alerts(metrics)
                
            except Exception as e:
                logger.error("Application metrics collection error", error=str(e))
    
    def _collect_application_metrics(self) -> ApplicationMetrics:
        """Collect application-level metrics"""
        try:
            # Request metrics
            total_requests = sum(stats['count'] for stats in self.endpoint_stats.values())
            total_errors = sum(stats['error_count'] for stats in self.endpoint_stats.values())
            
            # Calculate rates (per minute)
            request_rate = total_requests / max(1, len(self.app_metrics_history)) * 60 / self.collection_interval
            error_rate = total_errors / max(1, total_requests) if total_requests > 0 else 0
            
            # Response time metrics
            recent_times = list(self.request_times)
            if recent_times:
                recent_times.sort()
                avg_response_time = sum(recent_times) / len(recent_times)
                p95_index = int(len(recent_times) * 0.95)
                p99_index = int(len(recent_times) * 0.99)
                p95_response_time = recent_times[p95_index] if p95_index < len(recent_times) else 0
                p99_response_time = recent_times[p99_index] if p99_index < len(recent_times) else 0
            else:
                avg_response_time = p95_response_time = p99_response_time = 0
            
            # Memory metrics for current process
            current_process = psutil.Process()
            memory_info = current_process.memory_info()
            memory_usage_mb = memory_info.rss / 1024 / 1024
            
            # Garbage collection metrics
            gc_stats = gc.get_stats()
            gc_collections = sum(stat['collections'] for stat in gc_stats)
            
            return ApplicationMetrics(
                request_count=total_requests,
                request_rate=request_rate,
                avg_response_time=avg_response_time,
                p95_response_time=p95_response_time,
                p99_response_time=p99_response_time,
                error_rate=error_rate,
                active_connections=0,  # Would be set by connection pool
                database_connections=0,  # Would be set by database pool
                cache_hit_rate=0,  # Would be set by cache service
                memory_usage_mb=memory_usage_mb,
                gc_collections=gc_collections
            )
            
        except Exception as e:
            logger.error("Failed to collect application metrics", error=str(e))
            return ApplicationMetrics(
                request_count=0, request_rate=0, avg_response_time=0,
                p95_response_time=0, p99_response_time=0, error_rate=0,
                active_connections=0, database_connections=0, cache_hit_rate=0,
                memory_usage_mb=0, gc_collections=0
            )
    
    async def _check_system_alerts(self, metrics: SystemMetrics):
        """Check system metrics for alert conditions"""
        alerts_to_send = []
        
        # CPU usage alerts
        if metrics.cpu_percent >= self.alert_thresholds['cpu_percent']['critical']:
            alerts_to_send.append(PerformanceAlert(
                name="high_cpu_usage",
                severity=AlertSeverity.CRITICAL,
                message=f"Critical CPU usage: {metrics.cpu_percent:.1f}%",
                timestamp=datetime.utcnow(),
                metric_name="cpu_percent",
                current_value=metrics.cpu_percent,
                threshold=self.alert_thresholds['cpu_percent']['critical']
            ))
        elif metrics.cpu_percent >= self.alert_thresholds['cpu_percent']['warning']:
            alerts_to_send.append(PerformanceAlert(
                name="high_cpu_usage",
                severity=AlertSeverity.WARNING,
                message=f"High CPU usage: {metrics.cpu_percent:.1f}%",
                timestamp=datetime.utcnow(),
                metric_name="cpu_percent",
                current_value=metrics.cpu_percent,
                threshold=self.alert_thresholds['cpu_percent']['warning']
            ))
        
        # Memory usage alerts
        if metrics.memory_percent >= self.alert_thresholds['memory_percent']['critical']:
            alerts_to_send.append(PerformanceAlert(
                name="high_memory_usage",
                severity=AlertSeverity.CRITICAL,
                message=f"Critical memory usage: {metrics.memory_percent:.1f}%",
                timestamp=datetime.utcnow(),
                metric_name="memory_percent",
                current_value=metrics.memory_percent,
                threshold=self.alert_thresholds['memory_percent']['critical']
            ))
        elif metrics.memory_percent >= self.alert_thresholds['memory_percent']['warning']:
            alerts_to_send.append(PerformanceAlert(
                name="high_memory_usage",
                severity=AlertSeverity.WARNING,
                message=f"High memory usage: {metrics.memory_percent:.1f}%",
                timestamp=datetime.utcnow(),
                metric_name="memory_percent",
                current_value=metrics.memory_percent,
                threshold=self.alert_thresholds['memory_percent']['warning']
            ))
        
        # Disk usage alerts
        if metrics.disk_usage_percent >= self.alert_thresholds['disk_usage_percent']['critical']:
            alerts_to_send.append(PerformanceAlert(
                name="high_disk_usage",
                severity=AlertSeverity.CRITICAL,
                message=f"Critical disk usage: {metrics.disk_usage_percent:.1f}%",
                timestamp=datetime.utcnow(),
                metric_name="disk_usage_percent",
                current_value=metrics.disk_usage_percent,
                threshold=self.alert_thresholds['disk_usage_percent']['critical']
            ))
        
        # Send alerts
        for alert in alerts_to_send:
            await self._send_alert(alert)
    
    async def _check_application_alerts(self, metrics: ApplicationMetrics):
        """Check application metrics for alert conditions"""
        alerts_to_send = []
        
        # Response time alerts
        if metrics.p95_response_time >= self.alert_thresholds['response_time_p95']['critical']:
            alerts_to_send.append(PerformanceAlert(
                name="high_response_time",
                severity=AlertSeverity.CRITICAL,
                message=f"Critical response time: {metrics.p95_response_time:.2f}s (P95)",
                timestamp=datetime.utcnow(),
                metric_name="response_time_p95",
                current_value=metrics.p95_response_time,
                threshold=self.alert_thresholds['response_time_p95']['critical']
            ))
        elif metrics.p95_response_time >= self.alert_thresholds['response_time_p95']['warning']:
            alerts_to_send.append(PerformanceAlert(
                name="high_response_time",
                severity=AlertSeverity.WARNING,
                message=f"High response time: {metrics.p95_response_time:.2f}s (P95)",
                timestamp=datetime.utcnow(),
                metric_name="response_time_p95",
                current_value=metrics.p95_response_time,
                threshold=self.alert_thresholds['response_time_p95']['warning']
            ))
        
        # Error rate alerts
        if metrics.error_rate >= self.alert_thresholds['error_rate']['critical']:
            alerts_to_send.append(PerformanceAlert(
                name="high_error_rate",
                severity=AlertSeverity.CRITICAL,
                message=f"Critical error rate: {metrics.error_rate:.2%}",
                timestamp=datetime.utcnow(),
                metric_name="error_rate",
                current_value=metrics.error_rate,
                threshold=self.alert_thresholds['error_rate']['critical']
            ))
        elif metrics.error_rate >= self.alert_thresholds['error_rate']['warning']:
            alerts_to_send.append(PerformanceAlert(
                name="high_error_rate",
                severity=AlertSeverity.WARNING,
                message=f"High error rate: {metrics.error_rate:.2%}",
                timestamp=datetime.utcnow(),
                metric_name="error_rate",
                current_value=metrics.error_rate,
                threshold=self.alert_thresholds['error_rate']['warning']
            ))
        
        # Send alerts
        for alert in alerts_to_send:
            await self._send_alert(alert)
    
    async def _send_alert(self, alert: PerformanceAlert):
        """Send performance alert"""
        try:
            # Add to alerts history
            self.alerts.append(alert)
            
            # Log alert
            logger.warning("Performance alert triggered",
                         name=alert.name,
                         severity=alert.severity.value,
                         message=alert.message,
                         current_value=alert.current_value,
                         threshold=alert.threshold)
            
            # Send to webhooks
            if self.webhook_urls:
                await self._send_webhook_alert(alert)
            
        except Exception as e:
            logger.error("Failed to send alert", alert_name=alert.name, error=str(e))
    
    async def _send_webhook_alert(self, alert: PerformanceAlert):
        """Send alert to webhook endpoints"""
        payload = {
            "name": alert.name,
            "severity": alert.severity.value,
            "message": alert.message,
            "timestamp": alert.timestamp.isoformat(),
            "metric_name": alert.metric_name,
            "current_value": alert.current_value,
            "threshold": alert.threshold,
            "tags": alert.tags
        }
        
        async with aiohttp.ClientSession() as session:
            for webhook_url in self.webhook_urls:
                try:
                    async with session.post(
                        webhook_url,
                        json=payload,
                        timeout=aiohttp.ClientTimeout(total=10)
                    ) as response:
                        if response.status == 200:
                            logger.debug("Alert sent to webhook", url=webhook_url)
                        else:
                            logger.warning("Webhook alert failed", 
                                         url=webhook_url, 
                                         status=response.status)
                
                except Exception as e:
                    logger.error("Webhook alert error", url=webhook_url, error=str(e))
    
    async def _alert_processing_loop(self):
        """Background alert processing and deduplication"""
        alert_counts = defaultdict(int)
        last_reset = time.time()
        
        while not self.shutdown_event.is_set():
            try:
                await asyncio.sleep(60)  # Check every minute
                
                # Reset alert counts every hour
                if time.time() - last_reset > 3600:
                    alert_counts.clear()
                    last_reset = time.time()
                
                # Process recent alerts for deduplication
                recent_alerts = [alert for alert in self.alerts 
                               if (datetime.utcnow() - alert.timestamp).seconds < 300]
                
                # Count alert types
                for alert in recent_alerts:
                    alert_counts[alert.name] += 1
                
                # Log alert summary
                if alert_counts:
                    logger.info("Alert summary", **dict(alert_counts))
                
            except Exception as e:
                logger.error("Alert processing error", error=str(e))
    
    async def _optimization_analysis_loop(self):
        """Background performance optimization analysis"""
        while not self.shutdown_event.is_set():
            try:
                await asyncio.sleep(300)  # Run every 5 minutes
                
                recommendations = await self._analyze_performance_patterns()
                
                if recommendations:
                    self.optimization_recommendations.extend(recommendations)
                    
                    # Keep only recent recommendations
                    cutoff_time = datetime.utcnow() - timedelta(hours=1)
                    self.optimization_recommendations = [
                        rec for rec in self.optimization_recommendations
                        if datetime.fromisoformat(rec['timestamp']) > cutoff_time
                    ]
                    
                    logger.info("Performance optimization recommendations generated",
                              count=len(recommendations))
                
            except Exception as e:
                logger.error("Optimization analysis error", error=str(e))
    
    async def _analyze_performance_patterns(self) -> List[Dict[str, Any]]:
        """Analyze performance patterns and generate recommendations"""
        recommendations = []
        
        try:
            # Analyze recent system metrics
            if len(self.system_metrics_history) > 10:
                recent_metrics = list(self.system_metrics_history)[-10:]
                
                # High CPU usage pattern
                avg_cpu = sum(m.cpu_percent for m in recent_metrics) / len(recent_metrics)
                if avg_cpu > 60:
                    recommendations.append({
                        "type": "cpu_optimization",
                        "severity": "warning",
                        "message": f"Sustained high CPU usage ({avg_cpu:.1f}%). Consider optimizing CPU-intensive operations.",
                        "suggestions": [
                            "Profile application to identify CPU hotspots",
                            "Consider async processing for CPU-intensive tasks",
                            "Implement caching for expensive computations",
                            "Scale horizontally if needed"
                        ],
                        "timestamp": datetime.utcnow().isoformat()
                    })
                
                # Memory usage pattern
                avg_memory = sum(m.memory_percent for m in recent_metrics) / len(recent_metrics)
                if avg_memory > 70:
                    recommendations.append({
                        "type": "memory_optimization",
                        "severity": "warning",
                        "message": f"High memory usage ({avg_memory:.1f}%). Consider memory optimization.",
                        "suggestions": [
                            "Profile memory usage to identify leaks",
                            "Implement object pooling for frequently created objects",
                            "Optimize data structures and algorithms",
                            "Consider increasing available memory"
                        ],
                        "timestamp": datetime.utcnow().isoformat()
                    })
            
            # Analyze application metrics
            if len(self.app_metrics_history) > 10:
                recent_app_metrics = list(self.app_metrics_history)[-10:]
                
                # Response time pattern
                avg_response_time = sum(m.avg_response_time for m in recent_app_metrics) / len(recent_app_metrics)
                if avg_response_time > 1.0:
                    recommendations.append({
                        "type": "response_time_optimization",
                        "severity": "warning",
                        "message": f"High average response time ({avg_response_time:.2f}s). Consider performance optimization.",
                        "suggestions": [
                            "Implement database query optimization",
                            "Add caching for frequently accessed data",
                            "Optimize API endpoints and reduce payload sizes",
                            "Consider using CDN for static assets"
                        ],
                        "timestamp": datetime.utcnow().isoformat()
                    })
                
                # Error rate pattern
                avg_error_rate = sum(m.error_rate for m in recent_app_metrics) / len(recent_app_metrics)
                if avg_error_rate > 0.02:  # 2%
                    recommendations.append({
                        "type": "error_rate_optimization",
                        "severity": "error",
                        "message": f"High error rate ({avg_error_rate:.2%}). Investigate and fix errors.",
                        "suggestions": [
                            "Review error logs to identify common issues",
                            "Implement better error handling and retry logic",
                            "Add input validation and sanitization",
                            "Monitor external service dependencies"
                        ],
                        "timestamp": datetime.utcnow().isoformat()
                    })
            
            # Analyze endpoint performance
            slow_endpoints = []
            for endpoint, stats in self.endpoint_stats.items():
                if stats['count'] > 10:  # Only analyze endpoints with sufficient data
                    avg_time = stats['total_time'] / stats['count']
                    if avg_time > 2.0:  # Slow endpoint threshold
                        slow_endpoints.append((endpoint, avg_time))
            
            if slow_endpoints:
                slow_endpoints.sort(key=lambda x: x[1], reverse=True)
                recommendations.append({
                    "type": "endpoint_optimization",
                    "severity": "warning",
                    "message": f"Found {len(slow_endpoints)} slow endpoints requiring optimization.",
                    "slow_endpoints": slow_endpoints[:5],  # Top 5 slowest
                    "suggestions": [
                        "Profile slow endpoints to identify bottlenecks",
                        "Optimize database queries and add indexes",
                        "Implement caching for expensive operations",
                        "Consider pagination for large result sets"
                    ],
                    "timestamp": datetime.utcnow().isoformat()
                })
            
        except Exception as e:
            logger.error("Performance pattern analysis failed", error=str(e))
        
        return recommendations
    
    async def _cleanup_loop(self):
        """Background cleanup of old metrics and data"""
        while not self.shutdown_event.is_set():
            try:
                await asyncio.sleep(3600)  # Run every hour
                
                cutoff_time = datetime.utcnow() - timedelta(hours=self.retention_hours)
                
                # Clean up old metrics
                for metric_name, metric_deque in self.metrics.items():
                    # Remove old metrics (this is approximate since deque doesn't support filtering)
                    # In a production system, you'd use a proper time-series database
                    pass
                
                # Clean up old alerts
                old_alerts = [alert for alert in self.alerts 
                            if (datetime.utcnow() - alert.timestamp).total_seconds() > 86400]
                
                for alert in old_alerts:
                    try:
                        self.alerts.remove(alert)
                    except ValueError:
                        pass
                
                logger.debug("Performance monitoring cleanup completed")
                
            except Exception as e:
                logger.error("Cleanup loop error", error=str(e))
    
    @asynccontextmanager
    async def track_request(self, endpoint: str):
        """Context manager to track request performance"""
        start_time = time.time()
        error_occurred = False
        
        try:
            yield
        except Exception as e:
            error_occurred = True
            self.endpoint_stats[endpoint]['error_count'] += 1
            raise
        finally:
            # Record request metrics
            duration = time.time() - start_time
            
            stats = self.endpoint_stats[endpoint]
            stats['count'] += 1
            stats['total_time'] += duration
            stats['min_time'] = min(stats['min_time'], duration)
            stats['max_time'] = max(stats['max_time'], duration)
            stats['recent_times'].append(duration)
            
            # Add to global request times
            self.request_times.append(duration)
            
            # Record metric
            await self.record_metric(
                name=f"request_duration_{endpoint}",
                value=duration,
                metric_type=MetricType.TIMER,
                tags={"endpoint": endpoint, "error": str(error_occurred)}
            )
    
    async def record_metric(
        self, 
        name: str, 
        value: float, 
        metric_type: MetricType,
        tags: Optional[Dict[str, str]] = None,
        unit: Optional[str] = None
    ):
        """Record a custom performance metric"""
        metric = PerformanceMetric(
            name=name,
            value=value,
            metric_type=metric_type,
            timestamp=datetime.utcnow(),
            tags=tags or {},
            unit=unit
        )
        
        self.metrics[name].append(metric)
    
    def get_current_metrics(self) -> Dict[str, Any]:
        """Get current performance metrics snapshot"""
        try:
            # Latest system metrics
            latest_system = self.system_metrics_history[-1] if self.system_metrics_history else None
            
            # Latest application metrics
            latest_app = self.app_metrics_history[-1] if self.app_metrics_history else None
            
            # Endpoint statistics
            endpoint_summary = {}
            for endpoint, stats in self.endpoint_stats.items():
                if stats['count'] > 0:
                    endpoint_summary[endpoint] = {
                        'count': stats['count'],
                        'avg_time': stats['total_time'] / stats['count'],
                        'min_time': stats['min_time'],
                        'max_time': stats['max_time'],
                        'error_rate': stats['error_count'] / stats['count']
                    }
            
            # Recent alerts
            recent_alerts = [
                {
                    'name': alert.name,
                    'severity': alert.severity.value,
                    'message': alert.message,
                    'timestamp': alert.timestamp.isoformat()
                }
                for alert in list(self.alerts)[-10:]  # Last 10 alerts
            ]
            
            return {
                'timestamp': datetime.utcnow().isoformat(),
                'system_metrics': {
                    'cpu_percent': latest_system.cpu_percent if latest_system else 0,
                    'memory_percent': latest_system.memory_percent if latest_system else 0,
                    'disk_usage_percent': latest_system.disk_usage_percent if latest_system else 0,
                    'load_average': latest_system.load_average if latest_system else (0, 0, 0),
                    'process_count': latest_system.process_count if latest_system else 0
                } if latest_system else {},
                'application_metrics': {
                    'request_count': latest_app.request_count if latest_app else 0,
                    'request_rate': latest_app.request_rate if latest_app else 0,
                    'avg_response_time': latest_app.avg_response_time if latest_app else 0,
                    'p95_response_time': latest_app.p95_response_time if latest_app else 0,
                    'error_rate': latest_app.error_rate if latest_app else 0,
                    'memory_usage_mb': latest_app.memory_usage_mb if latest_app else 0
                } if latest_app else {},
                'endpoint_stats': endpoint_summary,
                'recent_alerts': recent_alerts,
                'optimization_recommendations': self.optimization_recommendations[-5:],  # Last 5 recommendations
                'monitoring_status': {
                    'enabled': self.monitoring_enabled,
                    'collection_interval': self.collection_interval,
                    'retention_hours': self.retention_hours,
                    'active_tasks': len([t for t in self.monitoring_tasks if not t.done()])
                }
            }
            
        except Exception as e:
            logger.error("Failed to get current metrics", error=str(e))
            return {'error': str(e)}
    
    def configure_alerts(self, thresholds: Dict[str, Dict[str, float]]):
        """Configure alert thresholds"""
        self.alert_thresholds.update(thresholds)
        logger.info("Alert thresholds updated", thresholds=thresholds)
    
    def add_webhook_url(self, url: str):
        """Add webhook URL for alert notifications"""
        if url not in self.webhook_urls:
            self.webhook_urls.append(url)
            logger.info("Webhook URL added", url=url)
    
    def remove_webhook_url(self, url: str):
        """Remove webhook URL"""
        if url in self.webhook_urls:
            self.webhook_urls.remove(url)
            logger.info("Webhook URL removed", url=url)

# Global instance
_performance_monitor: Optional[PerformanceMonitoringService] = None

def get_performance_monitor() -> PerformanceMonitoringService:
    """Get global performance monitor instance"""
    global _performance_monitor
    if _performance_monitor is None:
        _performance_monitor = PerformanceMonitoringService()
    return _performance_monitor

async def initialize_performance_monitoring():
    """Initialize global performance monitoring"""
    monitor = get_performance_monitor()
    await monitor.start_monitoring()

async def shutdown_performance_monitoring():
    """Shutdown global performance monitoring"""
    global _performance_monitor
    if _performance_monitor:
        await _performance_monitor.stop_monitoring()
        _performance_monitor = None