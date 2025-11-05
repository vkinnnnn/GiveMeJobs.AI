"""
Performance Benchmarking and Regression Testing Service
Automated performance testing, benchmarking, and regression detection
"""

import asyncio
import time
import statistics
from typing import Dict, List, Optional, Any, Callable, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
import structlog
import json
import aiohttp
import psutil
from pathlib import Path
import subprocess
import tempfile

logger = structlog.get_logger()

class BenchmarkType(Enum):
    """Benchmark test types"""
    LOAD_TEST = "load_test"
    STRESS_TEST = "stress_test"
    SPIKE_TEST = "spike_test"
    ENDURANCE_TEST = "endurance_test"
    API_PERFORMANCE = "api_performance"
    DATABASE_PERFORMANCE = "database_performance"
    FRONTEND_PERFORMANCE = "frontend_performance"

class TestStatus(Enum):
    """Test execution status"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

@dataclass
class BenchmarkConfig:
    """Benchmark test configuration"""
    name: str
    benchmark_type: BenchmarkType
    target_url: str
    duration_seconds: int = 60
    concurrent_users: int = 10
    ramp_up_seconds: int = 10
    ramp_down_seconds: int = 10
    
    # Performance thresholds
    max_response_time: float = 2.0
    max_error_rate: float = 0.05
    min_throughput: float = 100.0  # requests per second
    
    # Test parameters
    test_data: Optional[Dict[str, Any]] = None
    headers: Optional[Dict[str, str]] = None
    custom_scenarios: Optional[List[Dict[str, Any]]] = None

@dataclass
class BenchmarkResult:
    """Benchmark test results"""
    config: BenchmarkConfig
    status: TestStatus
    start_time: datetime
    end_time: Optional[datetime] = None
    
    # Performance metrics
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    
    # Response time metrics
    avg_response_time: float = 0.0
    min_response_time: float = 0.0
    max_response_time: float = 0.0
    p50_response_time: float = 0.0
    p95_response_time: float = 0.0
    p99_response_time: float = 0.0
    
    # Throughput metrics
    requests_per_second: float = 0.0
    bytes_per_second: float = 0.0
    
    # Error metrics
    error_rate: float = 0.0
    error_distribution: Dict[str, int] = field(default_factory=dict)
    
    # System metrics during test
    avg_cpu_usage: float = 0.0
    avg_memory_usage: float = 0.0
    
    # Regression analysis
    baseline_comparison: Optional[Dict[str, float]] = None
    regression_detected: bool = False
    
    # Raw data
    response_times: List[float] = field(default_factory=list)
    timestamps: List[float] = field(default_factory=list)
    
    def calculate_metrics(self):
        """Calculate derived metrics from raw data"""
        if self.response_times:
            self.avg_response_time = statistics.mean(self.response_times)
            self.min_response_time = min(self.response_times)
            self.max_response_time = max(self.response_times)
            
            sorted_times = sorted(self.response_times)
            n = len(sorted_times)
            
            self.p50_response_time = sorted_times[int(n * 0.5)]
            self.p95_response_time = sorted_times[int(n * 0.95)]
            self.p99_response_time = sorted_times[int(n * 0.99)]
        
        if self.end_time and self.start_time:
            duration = (self.end_time - self.start_time).total_seconds()
            if duration > 0:
                self.requests_per_second = self.total_requests / duration
        
        if self.total_requests > 0:
            self.error_rate = self.failed_requests / self.total_requests

@dataclass
class RegressionAlert:
    """Performance regression alert"""
    benchmark_name: str
    metric_name: str
    current_value: float
    baseline_value: float
    threshold_percent: float
    regression_percent: float
    timestamp: datetime
    severity: str

class PerformanceBenchmarkingService:
    """Performance benchmarking and regression testing service"""
    
    def __init__(self):
        # Test management
        self.active_tests: Dict[str, BenchmarkResult] = {}
        self.test_history: List[BenchmarkResult] = []
        self.baselines: Dict[str, BenchmarkResult] = {}
        
        # Configuration
        self.regression_threshold = 0.15  # 15% regression threshold
        self.baseline_retention_days = 30
        self.max_concurrent_tests = 3
        
        # Test tools
        self.locust_available = False
        self.artillery_available = False
        self.lighthouse_available = False
        
        # Results storage
        self.results_dir = Path("benchmark_results")
        self.results_dir.mkdir(exist_ok=True)
        
        # Background tasks
        self.cleanup_task: Optional[asyncio.Task] = None
        self.monitoring_task: Optional[asyncio.Task] = None
    
    async def initialize(self):
        """Initialize the benchmarking service"""
        try:
            # Check available tools
            await self._check_available_tools()
            
            # Load historical baselines
            await self._load_baselines()
            
            # Start background tasks
            self.cleanup_task = asyncio.create_task(self._cleanup_loop())
            self.monitoring_task = asyncio.create_task(self._monitoring_loop())
            
            logger.info("Performance benchmarking service initialized",
                       locust_available=self.locust_available,
                       artillery_available=self.artillery_available,
                       lighthouse_available=self.lighthouse_available)
            
        except Exception as e:
            logger.error("Failed to initialize benchmarking service", error=str(e))
            raise
    
    async def close(self):
        """Close the benchmarking service"""
        # Cancel background tasks
        if self.cleanup_task:
            self.cleanup_task.cancel()
        if self.monitoring_task:
            self.monitoring_task.cancel()
        
        # Cancel active tests
        for test_id in list(self.active_tests.keys()):
            await self.cancel_test(test_id)
        
        logger.info("Performance benchmarking service closed")
    
    async def _check_available_tools(self):
        """Check which performance testing tools are available"""
        try:
            # Check for Locust
            result = subprocess.run(['locust', '--version'], 
                                  capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                self.locust_available = True
                logger.info("Locust available", version=result.stdout.strip())
        except (subprocess.TimeoutExpired, FileNotFoundError):
            logger.debug("Locust not available")
        
        try:
            # Check for Artillery
            result = subprocess.run(['artillery', '--version'], 
                                  capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                self.artillery_available = True
                logger.info("Artillery available", version=result.stdout.strip())
        except (subprocess.TimeoutExpired, FileNotFoundError):
            logger.debug("Artillery not available")
        
        try:
            # Check for Lighthouse
            result = subprocess.run(['lighthouse', '--version'], 
                                  capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                self.lighthouse_available = True
                logger.info("Lighthouse available", version=result.stdout.strip())
        except (subprocess.TimeoutExpired, FileNotFoundError):
            logger.debug("Lighthouse not available")
    
    async def run_benchmark(self, config: BenchmarkConfig) -> str:
        """Run a performance benchmark test"""
        if len(self.active_tests) >= self.max_concurrent_tests:
            raise RuntimeError(f"Maximum concurrent tests ({self.max_concurrent_tests}) reached")
        
        # Generate test ID
        test_id = f"{config.name}_{int(time.time())}"
        
        # Create result object
        result = BenchmarkResult(
            config=config,
            status=TestStatus.PENDING,
            start_time=datetime.utcnow()
        )
        
        self.active_tests[test_id] = result
        
        try:
            # Start test execution
            logger.info("Starting benchmark test", 
                       test_id=test_id, 
                       benchmark_type=config.benchmark_type.value)
            
            result.status = TestStatus.RUNNING
            
            # Execute test based on type
            if config.benchmark_type == BenchmarkType.LOAD_TEST:
                await self._run_load_test(test_id, config, result)
            elif config.benchmark_type == BenchmarkType.API_PERFORMANCE:
                await self._run_api_performance_test(test_id, config, result)
            elif config.benchmark_type == BenchmarkType.FRONTEND_PERFORMANCE:
                await self._run_frontend_performance_test(test_id, config, result)
            else:
                await self._run_generic_test(test_id, config, result)
            
            result.status = TestStatus.COMPLETED
            result.end_time = datetime.utcnow()
            
            # Calculate final metrics
            result.calculate_metrics()
            
            # Check for regressions
            await self._check_regression(result)
            
            # Save results
            await self._save_results(test_id, result)
            
            # Add to history
            self.test_history.append(result)
            
            logger.info("Benchmark test completed", 
                       test_id=test_id,
                       requests_per_second=result.requests_per_second,
                       avg_response_time=result.avg_response_time,
                       error_rate=result.error_rate)
            
            return test_id
            
        except Exception as e:
            result.status = TestStatus.FAILED
            result.end_time = datetime.utcnow()
            logger.error("Benchmark test failed", test_id=test_id, error=str(e))
            raise
        
        finally:
            # Remove from active tests
            if test_id in self.active_tests:
                del self.active_tests[test_id]
    
    async def _run_load_test(self, test_id: str, config: BenchmarkConfig, result: BenchmarkResult):
        """Run load test using available tools"""
        if self.locust_available:
            await self._run_locust_test(test_id, config, result)
        elif self.artillery_available:
            await self._run_artillery_test(test_id, config, result)
        else:
            await self._run_simple_load_test(test_id, config, result)
    
    async def _run_locust_test(self, test_id: str, config: BenchmarkConfig, result: BenchmarkResult):
        """Run load test using Locust"""
        try:
            # Create Locust test file
            locust_file = await self._create_locust_file(config)
            
            # Run Locust in headless mode
            cmd = [
                'locust',
                '-f', str(locust_file),
                '--headless',
                '--users', str(config.concurrent_users),
                '--spawn-rate', str(config.concurrent_users // config.ramp_up_seconds),
                '--run-time', f"{config.duration_seconds}s",
                '--host', config.target_url,
                '--csv', f"{self.results_dir}/{test_id}",
                '--html', f"{self.results_dir}/{test_id}_report.html"
            ]
            
            # Start system monitoring
            monitor_task = asyncio.create_task(self._monitor_system_during_test(result))
            
            # Execute Locust
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            # Stop monitoring
            monitor_task.cancel()
            
            if process.returncode != 0:
                raise RuntimeError(f"Locust failed: {stderr.decode()}")
            
            # Parse results
            await self._parse_locust_results(test_id, result)
            
        except Exception as e:
            logger.error("Locust test execution failed", error=str(e))
            raise
        finally:
            # Cleanup
            if 'locust_file' in locals():
                locust_file.unlink(missing_ok=True)
    
    async def _create_locust_file(self, config: BenchmarkConfig) -> Path:
        """Create Locust test file"""
        locust_content = f"""
from locust import HttpUser, task, between
import json

class WebsiteUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        # Setup code here
        pass
    
    @task
    def test_endpoint(self):
        headers = {json.dumps(config.headers or {})}
        
        if config.test_data:
            response = self.client.post(
                "/",
                json={json.dumps(config.test_data)},
                headers=headers
            )
        else:
            response = self.client.get("/", headers=headers)
        
        # Add custom validation here if needed
        if response.status_code >= 400:
            response.failure(f"HTTP {{response.status_code}}")
"""
        
        locust_file = Path(tempfile.mktemp(suffix='.py'))
        locust_file.write_text(locust_content)
        
        return locust_file
    
    async def _parse_locust_results(self, test_id: str, result: BenchmarkResult):
        """Parse Locust CSV results"""
        try:
            stats_file = self.results_dir / f"{test_id}_stats.csv"
            
            if stats_file.exists():
                with open(stats_file, 'r') as f:
                    lines = f.readlines()
                
                # Parse stats (simplified)
                for line in lines[1:]:  # Skip header
                    if line.startswith('Aggregated'):
                        parts = line.split(',')
                        result.total_requests = int(parts[1])
                        result.failed_requests = int(parts[2])
                        result.successful_requests = result.total_requests - result.failed_requests
                        result.avg_response_time = float(parts[3])
                        result.min_response_time = float(parts[4])
                        result.max_response_time = float(parts[5])
                        result.requests_per_second = float(parts[10])
                        break
            
        except Exception as e:
            logger.warning("Failed to parse Locust results", error=str(e))
    
    async def _run_simple_load_test(self, test_id: str, config: BenchmarkConfig, result: BenchmarkResult):
        """Run simple load test using aiohttp"""
        try:
            # Start system monitoring
            monitor_task = asyncio.create_task(self._monitor_system_during_test(result))
            
            # Create HTTP session
            timeout = aiohttp.ClientTimeout(total=30)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                
                # Prepare test parameters
                start_time = time.time()
                end_time = start_time + config.duration_seconds
                
                # Create semaphore to limit concurrent requests
                semaphore = asyncio.Semaphore(config.concurrent_users)
                
                # Track results
                response_times = []
                error_counts = {}
                
                async def make_request():
                    async with semaphore:
                        request_start = time.time()
                        
                        try:
                            if config.test_data:
                                async with session.post(
                                    config.target_url,
                                    json=config.test_data,
                                    headers=config.headers
                                ) as response:
                                    await response.text()
                                    
                                    request_time = time.time() - request_start
                                    response_times.append(request_time)
                                    
                                    if response.status >= 400:
                                        error_key = f"HTTP_{response.status}"
                                        error_counts[error_key] = error_counts.get(error_key, 0) + 1
                                        result.failed_requests += 1
                                    else:
                                        result.successful_requests += 1
                            else:
                                async with session.get(
                                    config.target_url,
                                    headers=config.headers
                                ) as response:
                                    await response.text()
                                    
                                    request_time = time.time() - request_start
                                    response_times.append(request_time)
                                    
                                    if response.status >= 400:
                                        error_key = f"HTTP_{response.status}"
                                        error_counts[error_key] = error_counts.get(error_key, 0) + 1
                                        result.failed_requests += 1
                                    else:
                                        result.successful_requests += 1
                        
                        except Exception as e:
                            request_time = time.time() - request_start
                            response_times.append(request_time)
                            
                            error_key = type(e).__name__
                            error_counts[error_key] = error_counts.get(error_key, 0) + 1
                            result.failed_requests += 1
                
                # Generate load
                tasks = []
                while time.time() < end_time:
                    # Create batch of requests
                    batch_size = min(config.concurrent_users, 10)
                    
                    for _ in range(batch_size):
                        if time.time() >= end_time:
                            break
                        
                        task = asyncio.create_task(make_request())
                        tasks.append(task)
                        result.total_requests += 1
                    
                    # Wait a bit before next batch
                    await asyncio.sleep(0.1)
                
                # Wait for all requests to complete
                if tasks:
                    await asyncio.gather(*tasks, return_exceptions=True)
                
                # Store results
                result.response_times = response_times
                result.error_distribution = error_counts
            
            # Stop monitoring
            monitor_task.cancel()
            
        except Exception as e:
            logger.error("Simple load test failed", error=str(e))
            raise
    
    async def _run_api_performance_test(self, test_id: str, config: BenchmarkConfig, result: BenchmarkResult):
        """Run API-specific performance test"""
        # This would implement API-specific testing logic
        await self._run_simple_load_test(test_id, config, result)
    
    async def _run_frontend_performance_test(self, test_id: str, config: BenchmarkConfig, result: BenchmarkResult):
        """Run frontend performance test using Lighthouse"""
        if not self.lighthouse_available:
            raise RuntimeError("Lighthouse not available for frontend testing")
        
        try:
            # Run Lighthouse audit
            cmd = [
                'lighthouse',
                config.target_url,
                '--output=json',
                '--output-path', f"{self.results_dir}/{test_id}_lighthouse.json",
                '--chrome-flags="--headless"',
                '--quiet'
            ]
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                raise RuntimeError(f"Lighthouse failed: {stderr.decode()}")
            
            # Parse Lighthouse results
            await self._parse_lighthouse_results(test_id, result)
            
        except Exception as e:
            logger.error("Frontend performance test failed", error=str(e))
            raise
    
    async def _parse_lighthouse_results(self, test_id: str, result: BenchmarkResult):
        """Parse Lighthouse JSON results"""
        try:
            lighthouse_file = self.results_dir / f"{test_id}_lighthouse.json"
            
            with open(lighthouse_file, 'r') as f:
                lighthouse_data = json.load(f)
            
            # Extract key metrics
            audits = lighthouse_data.get('audits', {})
            
            # Performance metrics
            if 'first-contentful-paint' in audits:
                fcp = audits['first-contentful-paint']['numericValue']
                result.response_times.append(fcp / 1000)  # Convert to seconds
            
            if 'largest-contentful-paint' in audits:
                lcp = audits['largest-contentful-paint']['numericValue']
                result.response_times.append(lcp / 1000)
            
            if 'speed-index' in audits:
                si = audits['speed-index']['numericValue']
                result.response_times.append(si / 1000)
            
            # Set basic metrics
            result.total_requests = 1
            result.successful_requests = 1
            result.failed_requests = 0
            
        except Exception as e:
            logger.warning("Failed to parse Lighthouse results", error=str(e))
    
    async def _monitor_system_during_test(self, result: BenchmarkResult):
        """Monitor system resources during test execution"""
        cpu_samples = []
        memory_samples = []
        
        try:
            while True:
                cpu_percent = psutil.cpu_percent(interval=1)
                memory_percent = psutil.virtual_memory().percent
                
                cpu_samples.append(cpu_percent)
                memory_samples.append(memory_percent)
                
                await asyncio.sleep(5)  # Sample every 5 seconds
                
        except asyncio.CancelledError:
            # Calculate averages
            if cpu_samples:
                result.avg_cpu_usage = statistics.mean(cpu_samples)
            if memory_samples:
                result.avg_memory_usage = statistics.mean(memory_samples)
    
    async def _check_regression(self, result: BenchmarkResult):
        """Check for performance regressions against baseline"""
        baseline_key = f"{result.config.name}_{result.config.benchmark_type.value}"
        
        if baseline_key not in self.baselines:
            # No baseline, set this as baseline if successful
            if result.status == TestStatus.COMPLETED and result.error_rate < 0.1:
                self.baselines[baseline_key] = result
                logger.info("New baseline established", baseline_key=baseline_key)
            return
        
        baseline = self.baselines[baseline_key]
        
        # Compare key metrics
        comparisons = {}
        alerts = []
        
        # Response time regression
        if baseline.avg_response_time > 0:
            response_time_change = (result.avg_response_time - baseline.avg_response_time) / baseline.avg_response_time
            comparisons['avg_response_time'] = response_time_change
            
            if response_time_change > self.regression_threshold:
                alerts.append(RegressionAlert(
                    benchmark_name=result.config.name,
                    metric_name="avg_response_time",
                    current_value=result.avg_response_time,
                    baseline_value=baseline.avg_response_time,
                    threshold_percent=self.regression_threshold * 100,
                    regression_percent=response_time_change * 100,
                    timestamp=datetime.utcnow(),
                    severity="warning" if response_time_change < 0.3 else "critical"
                ))
        
        # Throughput regression
        if baseline.requests_per_second > 0:
            throughput_change = (result.requests_per_second - baseline.requests_per_second) / baseline.requests_per_second
            comparisons['requests_per_second'] = throughput_change
            
            if throughput_change < -self.regression_threshold:  # Negative is bad for throughput
                alerts.append(RegressionAlert(
                    benchmark_name=result.config.name,
                    metric_name="requests_per_second",
                    current_value=result.requests_per_second,
                    baseline_value=baseline.requests_per_second,
                    threshold_percent=self.regression_threshold * 100,
                    regression_percent=abs(throughput_change) * 100,
                    timestamp=datetime.utcnow(),
                    severity="warning" if abs(throughput_change) < 0.3 else "critical"
                ))
        
        # Error rate regression
        error_rate_change = result.error_rate - baseline.error_rate
        comparisons['error_rate'] = error_rate_change
        
        if error_rate_change > 0.02:  # 2% increase in error rate
            alerts.append(RegressionAlert(
                benchmark_name=result.config.name,
                metric_name="error_rate",
                current_value=result.error_rate,
                baseline_value=baseline.error_rate,
                threshold_percent=2.0,
                regression_percent=error_rate_change * 100,
                timestamp=datetime.utcnow(),
                severity="critical"
            ))
        
        result.baseline_comparison = comparisons
        result.regression_detected = len(alerts) > 0
        
        # Log regression alerts
        for alert in alerts:
            logger.warning("Performance regression detected",
                         benchmark=alert.benchmark_name,
                         metric=alert.metric_name,
                         regression_percent=alert.regression_percent,
                         severity=alert.severity)
    
    async def _save_results(self, test_id: str, result: BenchmarkResult):
        """Save benchmark results to file"""
        try:
            results_file = self.results_dir / f"{test_id}_results.json"
            
            # Convert result to dict for JSON serialization
            result_dict = {
                'test_id': test_id,
                'config': {
                    'name': result.config.name,
                    'benchmark_type': result.config.benchmark_type.value,
                    'target_url': result.config.target_url,
                    'duration_seconds': result.config.duration_seconds,
                    'concurrent_users': result.config.concurrent_users,
                    'max_response_time': result.config.max_response_time,
                    'max_error_rate': result.config.max_error_rate,
                    'min_throughput': result.config.min_throughput
                },
                'status': result.status.value,
                'start_time': result.start_time.isoformat(),
                'end_time': result.end_time.isoformat() if result.end_time else None,
                'metrics': {
                    'total_requests': result.total_requests,
                    'successful_requests': result.successful_requests,
                    'failed_requests': result.failed_requests,
                    'avg_response_time': result.avg_response_time,
                    'min_response_time': result.min_response_time,
                    'max_response_time': result.max_response_time,
                    'p95_response_time': result.p95_response_time,
                    'p99_response_time': result.p99_response_time,
                    'requests_per_second': result.requests_per_second,
                    'error_rate': result.error_rate,
                    'avg_cpu_usage': result.avg_cpu_usage,
                    'avg_memory_usage': result.avg_memory_usage
                },
                'baseline_comparison': result.baseline_comparison,
                'regression_detected': result.regression_detected,
                'error_distribution': result.error_distribution
            }
            
            with open(results_file, 'w') as f:
                json.dump(result_dict, f, indent=2)
            
            logger.debug("Benchmark results saved", file=str(results_file))
            
        except Exception as e:
            logger.error("Failed to save benchmark results", error=str(e))
    
    async def _load_baselines(self):
        """Load historical baselines from saved results"""
        try:
            # Load recent successful tests as potential baselines
            for results_file in self.results_dir.glob("*_results.json"):
                try:
                    with open(results_file, 'r') as f:
                        result_data = json.load(f)
                    
                    # Only use successful tests with low error rates as baselines
                    if (result_data['status'] == 'completed' and 
                        result_data['metrics']['error_rate'] < 0.1):
                        
                        baseline_key = f"{result_data['config']['name']}_{result_data['config']['benchmark_type']}"
                        
                        # Use most recent successful test as baseline
                        if baseline_key not in self.baselines:
                            # Create simplified result object for baseline
                            baseline_result = BenchmarkResult(
                                config=BenchmarkConfig(
                                    name=result_data['config']['name'],
                                    benchmark_type=BenchmarkType(result_data['config']['benchmark_type']),
                                    target_url=result_data['config']['target_url']
                                ),
                                status=TestStatus.COMPLETED,
                                start_time=datetime.fromisoformat(result_data['start_time'])
                            )
                            
                            # Set key metrics
                            baseline_result.avg_response_time = result_data['metrics']['avg_response_time']
                            baseline_result.requests_per_second = result_data['metrics']['requests_per_second']
                            baseline_result.error_rate = result_data['metrics']['error_rate']
                            
                            self.baselines[baseline_key] = baseline_result
                
                except Exception as e:
                    logger.debug("Failed to load baseline from file", 
                               file=str(results_file), error=str(e))
            
            logger.info("Baselines loaded", count=len(self.baselines))
            
        except Exception as e:
            logger.warning("Failed to load baselines", error=str(e))
    
    async def _cleanup_loop(self):
        """Background cleanup of old test results"""
        while True:
            try:
                await asyncio.sleep(3600)  # Run every hour
                
                cutoff_date = datetime.utcnow() - timedelta(days=self.baseline_retention_days)
                
                # Clean up old result files
                for results_file in self.results_dir.glob("*_results.json"):
                    try:
                        file_time = datetime.fromtimestamp(results_file.stat().st_mtime)
                        if file_time < cutoff_date:
                            results_file.unlink()
                    except Exception:
                        pass
                
                # Clean up old test history
                self.test_history = [
                    result for result in self.test_history
                    if result.start_time > cutoff_date
                ]
                
                logger.debug("Benchmark cleanup completed")
                
            except Exception as e:
                logger.error("Benchmark cleanup error", error=str(e))
    
    async def _monitoring_loop(self):
        """Background monitoring of active tests"""
        while True:
            try:
                await asyncio.sleep(30)  # Check every 30 seconds
                
                # Check for stuck tests
                current_time = datetime.utcnow()
                
                for test_id, result in list(self.active_tests.items()):
                    test_duration = (current_time - result.start_time).total_seconds()
                    max_duration = result.config.duration_seconds + 300  # 5 minute buffer
                    
                    if test_duration > max_duration:
                        logger.warning("Test appears stuck, cancelling", 
                                     test_id=test_id, duration=test_duration)
                        await self.cancel_test(test_id)
                
            except Exception as e:
                logger.error("Monitoring loop error", error=str(e))
    
    async def cancel_test(self, test_id: str) -> bool:
        """Cancel an active test"""
        if test_id not in self.active_tests:
            return False
        
        try:
            result = self.active_tests[test_id]
            result.status = TestStatus.CANCELLED
            result.end_time = datetime.utcnow()
            
            # Save partial results
            await self._save_results(test_id, result)
            
            # Remove from active tests
            del self.active_tests[test_id]
            
            logger.info("Test cancelled", test_id=test_id)
            return True
            
        except Exception as e:
            logger.error("Failed to cancel test", test_id=test_id, error=str(e))
            return False
    
    def get_test_status(self, test_id: str) -> Optional[Dict[str, Any]]:
        """Get status of a test"""
        if test_id in self.active_tests:
            result = self.active_tests[test_id]
            return {
                'test_id': test_id,
                'status': result.status.value,
                'start_time': result.start_time.isoformat(),
                'duration_seconds': (datetime.utcnow() - result.start_time).total_seconds(),
                'progress': {
                    'total_requests': result.total_requests,
                    'successful_requests': result.successful_requests,
                    'failed_requests': result.failed_requests
                }
            }
        
        # Check test history
        for result in self.test_history:
            if f"{result.config.name}_{int(result.start_time.timestamp())}" == test_id:
                return {
                    'test_id': test_id,
                    'status': result.status.value,
                    'start_time': result.start_time.isoformat(),
                    'end_time': result.end_time.isoformat() if result.end_time else None,
                    'metrics': {
                        'requests_per_second': result.requests_per_second,
                        'avg_response_time': result.avg_response_time,
                        'error_rate': result.error_rate
                    },
                    'regression_detected': result.regression_detected
                }
        
        return None
    
    def get_active_tests(self) -> List[Dict[str, Any]]:
        """Get list of active tests"""
        return [
            {
                'test_id': test_id,
                'name': result.config.name,
                'benchmark_type': result.config.benchmark_type.value,
                'status': result.status.value,
                'start_time': result.start_time.isoformat(),
                'duration_seconds': (datetime.utcnow() - result.start_time).total_seconds()
            }
            for test_id, result in self.active_tests.items()
        ]
    
    def get_baselines(self) -> Dict[str, Dict[str, Any]]:
        """Get current baselines"""
        return {
            key: {
                'name': result.config.name,
                'benchmark_type': result.config.benchmark_type.value,
                'avg_response_time': result.avg_response_time,
                'requests_per_second': result.requests_per_second,
                'error_rate': result.error_rate,
                'established_at': result.start_time.isoformat()
            }
            for key, result in self.baselines.items()
        }