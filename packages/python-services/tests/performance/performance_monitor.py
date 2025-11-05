"""
Performance monitoring and analysis tools.

This module provides tools to monitor and analyze performance during testing.
"""

import asyncio
import json
import time
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from pathlib import Path

import httpx
import psutil
import structlog
from prometheus_client.parser import text_string_to_metric_families

logger = structlog.get_logger(__name__)


@dataclass
class PerformanceMetrics:
    """Performance metrics data structure."""
    timestamp: float
    cpu_percent: float
    memory_percent: float
    memory_used_mb: float
    disk_io_read_mb: float
    disk_io_write_mb: float
    network_sent_mb: float
    network_recv_mb: float
    response_time_p50: Optional[float] = None
    response_time_p95: Optional[float] = None
    response_time_p99: Optional[float] = None
    requests_per_second: Optional[float] = None
    error_rate: Optional[float] = None
    active_connections: Optional[int] = None
    queue_length: Optional[int] = None


@dataclass
class TestResults:
    """Test results summary."""
    test_name: str
    start_time: datetime
    end_time: datetime
    duration_seconds: float
    total_requests: int
    successful_requests: int
    failed_requests: int
    average_response_time: float
    p95_response_time: float
    p99_response_time: float
    max_response_time: float
    requests_per_second: float
    error_rate: float
    peak_cpu_percent: float
    peak_memory_percent: float
    peak_memory_mb: float
    auto_scaling_events: List[Dict[str, Any]]
    performance_issues: List[str]


class PerformanceMonitor:
    """Monitor system and application performance during tests."""
    
    def __init__(self, 
                 api_base_url: str = "http://localhost:8000",
                 metrics_url: str = "http://localhost:8001/metrics",
                 monitoring_interval: float = 5.0):
        self.api_base_url = api_base_url
        self.metrics_url = metrics_url
        self.monitoring_interval = monitoring_interval
        self.metrics_history: List[PerformanceMetrics] = []
        self.is_monitoring = False
        self.http_client = httpx.AsyncClient(timeout=10.0)
        
        # System monitoring
        self.process = psutil.Process()
        self.initial_disk_io = psutil.disk_io_counters()
        self.initial_network_io = psutil.net_io_counters()
    
    async def start_monitoring(self):
        """Start performance monitoring."""
        self.is_monitoring = True
        self.metrics_history.clear()
        
        logger.info("Starting performance monitoring")
        
        while self.is_monitoring:
            try:
                metrics = await self._collect_metrics()
                self.metrics_history.append(metrics)
                
                # Log performance warnings
                await self._check_performance_thresholds(metrics)
                
                await asyncio.sleep(self.monitoring_interval)
                
            except Exception as e:
                logger.error("Error collecting metrics", error=str(e))
                await asyncio.sleep(self.monitoring_interval)
    
    async def stop_monitoring(self):
        """Stop performance monitoring."""
        self.is_monitoring = False
        logger.info("Stopped performance monitoring")
    
    async def _collect_metrics(self) -> PerformanceMetrics:
        """Collect current performance metrics."""
        # System metrics
        cpu_percent = psutil.cpu_percent()
        memory = psutil.virtual_memory()
        
        # Disk I/O
        current_disk_io = psutil.disk_io_counters()
        disk_read_mb = (current_disk_io.read_bytes - self.initial_disk_io.read_bytes) / 1024 / 1024
        disk_write_mb = (current_disk_io.write_bytes - self.initial_disk_io.write_bytes) / 1024 / 1024
        
        # Network I/O
        current_network_io = psutil.net_io_counters()
        network_sent_mb = (current_network_io.bytes_sent - self.initial_network_io.bytes_sent) / 1024 / 1024
        network_recv_mb = (current_network_io.bytes_recv - self.initial_network_io.bytes_recv) / 1024 / 1024
        
        # Application metrics from Prometheus
        app_metrics = await self._collect_app_metrics()
        
        return PerformanceMetrics(
            timestamp=time.time(),
            cpu_percent=cpu_percent,
            memory_percent=memory.percent,
            memory_used_mb=memory.used / 1024 / 1024,
            disk_io_read_mb=disk_read_mb,
            disk_io_write_mb=disk_write_mb,
            network_sent_mb=network_sent_mb,
            network_recv_mb=network_recv_mb,
            **app_metrics
        )
    
    async def _collect_app_metrics(self) -> Dict[str, Optional[float]]:
        """Collect application metrics from Prometheus endpoint."""
        try:
            response = await self.http_client.get(self.metrics_url)
            if response.status_code != 200:
                return {}
            
            metrics_text = response.text
            metrics = {}
            
            # Parse Prometheus metrics
            for family in text_string_to_metric_families(metrics_text):
                if family.name == 'http_requests_per_second':
                    metrics['requests_per_second'] = family.samples[0].value
                elif family.name == 'response_time_p95':
                    metrics['response_time_p95'] = family.samples[0].value
                elif family.name == 'active_connections':
                    metrics['active_connections'] = int(family.samples[0].value)
                elif family.name == 'celery_queue_length':
                    # Sum all queue lengths
                    total_queue = sum(sample.value for sample in family.samples)
                    metrics['queue_length'] = int(total_queue)
            
            return metrics
            
        except Exception as e:
            logger.warning("Failed to collect app metrics", error=str(e))
            return {}
    
    async def _check_performance_thresholds(self, metrics: PerformanceMetrics):
        """Check performance thresholds and log warnings."""
        warnings = []
        
        if metrics.cpu_percent > 80:
            warnings.append(f"High CPU usage: {metrics.cpu_percent:.1f}%")
        
        if metrics.memory_percent > 85:
            warnings.append(f"High memory usage: {metrics.memory_percent:.1f}%")
        
        if metrics.response_time_p95 and metrics.response_time_p95 > 2000:
            warnings.append(f"High response time P95: {metrics.response_time_p95:.1f}ms")
        
        if metrics.queue_length and metrics.queue_length > 100:
            warnings.append(f"High queue length: {metrics.queue_length}")
        
        if warnings:
            logger.warning("Performance threshold exceeded", warnings=warnings)
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """Get performance summary from collected metrics."""
        if not self.metrics_history:
            return {}
        
        cpu_values = [m.cpu_percent for m in self.metrics_history]
        memory_values = [m.memory_percent for m in self.metrics_history]
        memory_mb_values = [m.memory_used_mb for m in self.metrics_history]
        
        response_times = [m.response_time_p95 for m in self.metrics_history if m.response_time_p95]
        rps_values = [m.requests_per_second for m in self.metrics_history if m.requests_per_second]
        
        return {
            "monitoring_duration_seconds": len(self.metrics_history) * self.monitoring_interval,
            "cpu_stats": {
                "average": sum(cpu_values) / len(cpu_values),
                "peak": max(cpu_values),
                "min": min(cpu_values)
            },
            "memory_stats": {
                "average_percent": sum(memory_values) / len(memory_values),
                "peak_percent": max(memory_values),
                "peak_mb": max(memory_mb_values)
            },
            "response_time_stats": {
                "average_p95": sum(response_times) / len(response_times) if response_times else 0,
                "peak_p95": max(response_times) if response_times else 0
            },
            "throughput_stats": {
                "average_rps": sum(rps_values) / len(rps_values) if rps_values else 0,
                "peak_rps": max(rps_values) if rps_values else 0
            }
        }
    
    def export_metrics(self, filepath: Path):
        """Export collected metrics to JSON file."""
        data = {
            "collection_info": {
                "start_time": self.metrics_history[0].timestamp if self.metrics_history else None,
                "end_time": self.metrics_history[-1].timestamp if self.metrics_history else None,
                "interval_seconds": self.monitoring_interval,
                "total_samples": len(self.metrics_history)
            },
            "metrics": [asdict(m) for m in self.metrics_history],
            "summary": self.get_performance_summary()
        }
        
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
        
        logger.info("Metrics exported", filepath=str(filepath))


class AutoScalingMonitor:
    """Monitor auto-scaling events during performance tests."""
    
    def __init__(self, namespace: str = "givemejobs"):
        self.namespace = namespace
        self.scaling_events: List[Dict[str, Any]] = []
        self.is_monitoring = False
    
    async def start_monitoring(self):
        """Start monitoring auto-scaling events."""
        self.is_monitoring = True
        self.scaling_events.clear()
        
        logger.info("Starting auto-scaling monitoring")
        
        while self.is_monitoring:
            try:
                await self._check_scaling_events()
                await asyncio.sleep(30)  # Check every 30 seconds
            except Exception as e:
                logger.error("Error monitoring auto-scaling", error=str(e))
                await asyncio.sleep(30)
    
    async def stop_monitoring(self):
        """Stop monitoring auto-scaling events."""
        self.is_monitoring = False
        logger.info("Stopped auto-scaling monitoring")
    
    async def _check_scaling_events(self):
        """Check for scaling events using kubectl."""
        try:
            import subprocess
            
            # Get HPA status
            result = subprocess.run([
                "kubectl", "get", "hpa",
                f"--namespace={self.namespace}",
                "-o", "json"
            ], capture_output=True, text=True, check=True)
            
            hpa_data = json.loads(result.stdout)
            
            for item in hpa_data.get("items", []):
                name = item["metadata"]["name"]
                status = item.get("status", {})
                
                current_replicas = status.get("currentReplicas", 0)
                desired_replicas = status.get("desiredReplicas", 0)
                
                if current_replicas != desired_replicas:
                    event = {
                        "timestamp": time.time(),
                        "hpa_name": name,
                        "current_replicas": current_replicas,
                        "desired_replicas": desired_replicas,
                        "metrics": status.get("currentMetrics", [])
                    }
                    
                    self.scaling_events.append(event)
                    
                    logger.info(
                        "Auto-scaling event detected",
                        hpa_name=name,
                        current=current_replicas,
                        desired=desired_replicas
                    )
        
        except Exception as e:
            logger.warning("Failed to check scaling events", error=str(e))
    
    def get_scaling_summary(self) -> Dict[str, Any]:
        """Get auto-scaling summary."""
        if not self.scaling_events:
            return {"total_events": 0}
        
        events_by_hpa = {}
        for event in self.scaling_events:
            hpa_name = event["hpa_name"]
            if hpa_name not in events_by_hpa:
                events_by_hpa[hpa_name] = []
            events_by_hpa[hpa_name].append(event)
        
        return {
            "total_events": len(self.scaling_events),
            "events_by_hpa": events_by_hpa,
            "first_event": self.scaling_events[0]["timestamp"],
            "last_event": self.scaling_events[-1]["timestamp"]
        }


class PerformanceTestRunner:
    """Run and analyze performance tests."""
    
    def __init__(self, 
                 api_base_url: str = "http://localhost:8000",
                 results_dir: Path = Path("./performance_results")):
        self.api_base_url = api_base_url
        self.results_dir = results_dir
        self.results_dir.mkdir(exist_ok=True)
        
        self.performance_monitor = PerformanceMonitor(api_base_url)
        self.scaling_monitor = AutoScalingMonitor()
    
    async def run_test_scenario(self, 
                               test_name: str,
                               locust_file: str,
                               users: int,
                               spawn_rate: int,
                               duration: str) -> TestResults:
        """Run a complete test scenario with monitoring."""
        
        logger.info(
            "Starting performance test scenario",
            test_name=test_name,
            users=users,
            spawn_rate=spawn_rate,
            duration=duration
        )
        
        start_time = datetime.now()
        
        # Start monitoring
        monitor_task = asyncio.create_task(self.performance_monitor.start_monitoring())
        scaling_task = asyncio.create_task(self.scaling_monitor.start_monitoring())
        
        try:
            # Run Locust test
            import subprocess
            
            cmd = [
                "locust",
                "-f", locust_file,
                "--host", self.api_base_url,
                "--users", str(users),
                "--spawn-rate", str(spawn_rate),
                "--run-time", duration,
                "--headless",
                "--csv", str(self.results_dir / f"{test_name}_results")
            ]
            
            logger.info("Running Locust test", command=" ".join(cmd))
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode != 0:
                logger.error("Locust test failed", stderr=result.stderr)
                raise RuntimeError(f"Locust test failed: {result.stderr}")
            
        finally:
            # Stop monitoring
            await self.performance_monitor.stop_monitoring()
            await self.scaling_monitor.stop_monitoring()
            
            monitor_task.cancel()
            scaling_task.cancel()
        
        end_time = datetime.now()
        
        # Analyze results
        test_results = await self._analyze_results(test_name, start_time, end_time)
        
        # Export detailed metrics
        self.performance_monitor.export_metrics(
            self.results_dir / f"{test_name}_metrics.json"
        )
        
        # Export scaling events
        scaling_summary = self.scaling_monitor.get_scaling_summary()
        with open(self.results_dir / f"{test_name}_scaling.json", 'w') as f:
            json.dump(scaling_summary, f, indent=2)
        
        logger.info("Performance test completed", test_name=test_name)
        
        return test_results
    
    async def _analyze_results(self, 
                              test_name: str, 
                              start_time: datetime, 
                              end_time: datetime) -> TestResults:
        """Analyze test results and create summary."""
        
        # Read Locust CSV results
        stats_file = self.results_dir / f"{test_name}_results_stats.csv"
        
        if not stats_file.exists():
            logger.warning("Locust stats file not found", file=str(stats_file))
            return TestResults(
                test_name=test_name,
                start_time=start_time,
                end_time=end_time,
                duration_seconds=(end_time - start_time).total_seconds(),
                total_requests=0,
                successful_requests=0,
                failed_requests=0,
                average_response_time=0,
                p95_response_time=0,
                p99_response_time=0,
                max_response_time=0,
                requests_per_second=0,
                error_rate=0,
                peak_cpu_percent=0,
                peak_memory_percent=0,
                peak_memory_mb=0,
                auto_scaling_events=[],
                performance_issues=[]
            )
        
        # Parse Locust results (simplified)
        import csv
        
        total_requests = 0
        failed_requests = 0
        avg_response_time = 0
        
        with open(stats_file, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row['Type'] == 'GET' or row['Type'] == 'POST':
                    total_requests += int(row['Request Count'])
                    failed_requests += int(row['Failure Count'])
                    avg_response_time = float(row['Average Response Time'])
        
        # Get performance summary
        perf_summary = self.performance_monitor.get_performance_summary()
        scaling_summary = self.scaling_monitor.get_scaling_summary()
        
        # Identify performance issues
        issues = []
        if perf_summary.get('cpu_stats', {}).get('peak', 0) > 90:
            issues.append("High CPU usage detected")
        if perf_summary.get('memory_stats', {}).get('peak_percent', 0) > 90:
            issues.append("High memory usage detected")
        if avg_response_time > 2000:
            issues.append("High average response time")
        
        return TestResults(
            test_name=test_name,
            start_time=start_time,
            end_time=end_time,
            duration_seconds=(end_time - start_time).total_seconds(),
            total_requests=total_requests,
            successful_requests=total_requests - failed_requests,
            failed_requests=failed_requests,
            average_response_time=avg_response_time,
            p95_response_time=perf_summary.get('response_time_stats', {}).get('peak_p95', 0),
            p99_response_time=0,  # Would need to calculate from detailed data
            max_response_time=perf_summary.get('response_time_stats', {}).get('peak_p95', 0),
            requests_per_second=perf_summary.get('throughput_stats', {}).get('peak_rps', 0),
            error_rate=(failed_requests / total_requests * 100) if total_requests > 0 else 0,
            peak_cpu_percent=perf_summary.get('cpu_stats', {}).get('peak', 0),
            peak_memory_percent=perf_summary.get('memory_stats', {}).get('peak_percent', 0),
            peak_memory_mb=perf_summary.get('memory_stats', {}).get('peak_mb', 0),
            auto_scaling_events=scaling_summary.get('events_by_hpa', {}),
            performance_issues=issues
        )