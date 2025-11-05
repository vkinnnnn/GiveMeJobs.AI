"""
Performance regression testing with Python benchmarking.
"""

import pytest
import asyncio
import time
import statistics
from typing import List, Dict, Any, Callable
import psutil
import httpx
from dataclasses import dataclass
from pathlib import Path
import json


@dataclass
class BenchmarkResult:
    """Benchmark result data."""
    test_name: str
    execution_time: float
    memory_usage: float
    cpu_usage: float
    iterations: int
    min_time: float
    max_time: float
    median_time: float
    std_dev: float
    throughput: float


class PerformanceBenchmark:
    """Performance benchmarking utilities."""
    
    def __init__(self, baseline_file: Path = None):
        self.baseline_file = baseline_file or Path("performance_baseline.json")
        self.baseline_data = self._load_baseline()
        self.results: List[BenchmarkResult] = []
    
    def _load_baseline(self) -> Dict[str, Any]:
        """Load baseline performance data."""
        if self.baseline_file.exists():
            with open(self.baseline_file, 'r') as f:
                return json.load(f)
        return {}
    
    def _save_baseline(self):
        """Save current results as baseline."""
        baseline_data = {}
        for result in self.results:
            baseline_data[result.test_name] = {
                "execution_time": result.execution_time,
                "memory_usage": result.memory_usage,
                "cpu_usage": result.cpu_usage,
                "throughput": result.throughput,
                "median_time": result.median_time
            }
        
        with open(self.baseline_file, 'w') as f:
            json.dump(baseline_data, f, indent=2)
    
    async def benchmark_async_function(
        self, 
        func: Callable,
        test_name: str,
        iterations: int = 100,
        *args, 
        **kwargs
    ) -> BenchmarkResult:
        """Benchmark an async function."""
        times = []
        memory_usage = []
        cpu_usage = []
        
        # Warm up
        for _ in range(5):
            await func(*args, **kwargs)
        
        # Benchmark
        process = psutil.Process()
        
        for i in range(iterations):
            # Measure memory and CPU before
            mem_before = process.memory_info().rss / 1024 / 1024  # MB
            cpu_before = process.cpu_percent()
            
            # Execute function
            start_time = time.perf_counter()
            await func(*args, **kwargs)
            end_time = time.perf_counter()
            
            # Measure memory and CPU after
            mem_after = process.memory_info().rss / 1024 / 1024  # MB
            cpu_after = process.cpu_percent()
            
            execution_time = end_time - start_time
            times.append(execution_time)
            memory_usage.append(mem_after - mem_before)
            cpu_usage.append(cpu_after - cpu_before)
        
        # Calculate statistics
        total_time = sum(times)
        avg_memory = statistics.mean(memory_usage)
        avg_cpu = statistics.mean(cpu_usage)
        
        result = BenchmarkResult(
            test_name=test_name,
            execution_time=total_time / iterations,
            memory_usage=avg_memory,
            cpu_usage=avg_cpu,
            iterations=iterations,
            min_time=min(times),
            max_time=max(times),
            median_time=statistics.median(times),
            std_dev=statistics.stdev(times) if len(times) > 1 else 0,
            throughput=iterations / total_time
        )
        
        self.results.append(result)
        return result
    
    def benchmark_sync_function(
        self, 
        func: Callable,
        test_name: str,
        iterations: int = 100,
        *args, 
        **kwargs
    ) -> BenchmarkResult:
        """Benchmark a sync function."""
        times = []
        memory_usage = []
        cpu_usage = []
        
        # Warm up
        for _ in range(5):
            func(*args, **kwargs)
        
        # Benchmark
        process = psutil.Process()
        
        for i in range(iterations):
            # Measure memory and CPU before
            mem_before = process.memory_info().rss / 1024 / 1024  # MB
            cpu_before = process.cpu_percent()
            
            # Execute function
            start_time = time.perf_counter()
            func(*args, **kwargs)
            end_time = time.perf_counter()
            
            # Measure memory and CPU after
            mem_after = process.memory_info().rss / 1024 / 1024  # MB
            cpu_after = process.cpu_percent()
            
            execution_time = end_time - start_time
            times.append(execution_time)
            memory_usage.append(mem_after - mem_before)
            cpu_usage.append(cpu_after - cpu_before)
        
        # Calculate statistics
        total_time = sum(times)
        avg_memory = statistics.mean(memory_usage)
        avg_cpu = statistics.mean(cpu_usage)
        
        result = BenchmarkResult(
            test_name=test_name,
            execution_time=total_time / iterations,
            memory_usage=avg_memory,
            cpu_usage=avg_cpu,
            iterations=iterations,
            min_time=min(times),
            max_time=max(times),
            median_time=statistics.median(times),
            std_dev=statistics.stdev(times) if len(times) > 1 else 0,
            throughput=iterations / total_time
        )
        
        self.results.append(result)
        return result
    
    def compare_with_baseline(self, result: BenchmarkResult) -> Dict[str, Any]:
        """Compare result with baseline."""
        if result.test_name not in self.baseline_data:
            return {"status": "no_baseline", "message": "No baseline data available"}
        
        baseline = self.baseline_data[result.test_name]
        comparison = {}
        
        # Performance regression thresholds
        REGRESSION_THRESHOLD = 0.1  # 10% slower is considered regression
        MEMORY_THRESHOLD = 0.2  # 20% more memory is concerning
        
        # Compare execution time
        time_diff = (result.execution_time - baseline["execution_time"]) / baseline["execution_time"]
        comparison["execution_time"] = {
            "current": result.execution_time,
            "baseline": baseline["execution_time"],
            "change_percent": time_diff * 100,
            "status": "regression" if time_diff > REGRESSION_THRESHOLD else "ok"
        }
        
        # Compare memory usage
        memory_diff = (result.memory_usage - baseline["memory_usage"]) / baseline["memory_usage"] if baseline["memory_usage"] > 0 else 0
        comparison["memory_usage"] = {
            "current": result.memory_usage,
            "baseline": baseline["memory_usage"],
            "change_percent": memory_diff * 100,
            "status": "regression" if memory_diff > MEMORY_THRESHOLD else "ok"
        }
        
        # Compare throughput
        throughput_diff = (result.throughput - baseline["throughput"]) / baseline["throughput"]
        comparison["throughput"] = {
            "current": result.throughput,
            "baseline": baseline["throughput"],
            "change_percent": throughput_diff * 100,
            "status": "regression" if throughput_diff < -REGRESSION_THRESHOLD else "ok"
        }
        
        # Overall status
        has_regression = any(
            metric["status"] == "regression" 
            for metric in comparison.values() 
            if isinstance(metric, dict) and "status" in metric
        )
        
        comparison["overall_status"] = "regression" if has_regression else "ok"
        
        return comparison


@pytest.fixture
def benchmark():
    """Performance benchmark fixture."""
    return PerformanceBenchmark()


@pytest.mark.performance
@pytest.mark.asyncio
class TestAPIPerformanceRegression:
    """API performance regression tests."""
    
    async def test_user_registration_performance(self, benchmark):
        """Test user registration performance."""
        async def register_user():
            async with httpx.AsyncClient() as client:
                user_data = {
                    "email": f"perf_test_{time.time()}@example.com",
                    "password": "TestPassword123!",
                    "first_name": "Performance",
                    "last_name": "Test"
                }
                response = await client.post(
                    "http://localhost:8000/api/v1/auth/register",
                    json=user_data
                )
                return response.status_code
        
        result = await benchmark.benchmark_async_function(
            register_user,
            "user_registration",
            iterations=50
        )
        
        # Assert performance criteria
        assert result.execution_time < 0.5, f"Registration too slow: {result.execution_time:.3f}s"
        assert result.memory_usage < 10, f"Memory usage too high: {result.memory_usage:.1f}MB"
        
        # Compare with baseline
        comparison = benchmark.compare_with_baseline(result)
        if comparison.get("overall_status") == "regression":
            pytest.fail(f"Performance regression detected: {comparison}")
    
    async def test_job_search_performance(self, benchmark):
        """Test job search performance."""
        async def search_jobs():
            async with httpx.AsyncClient() as client:
                params = {
                    "q": "python developer",
                    "location": "remote",
                    "limit": 20
                }
                response = await client.get(
                    "http://localhost:8000/api/v1/jobs/search",
                    params=params
                )
                return response.status_code
        
        result = await benchmark.benchmark_async_function(
            search_jobs,
            "job_search",
            iterations=100
        )
        
        # Assert performance criteria
        assert result.execution_time < 0.3, f"Search too slow: {result.execution_time:.3f}s"
        assert result.throughput > 10, f"Throughput too low: {result.throughput:.1f} req/s"
        
        # Compare with baseline
        comparison = benchmark.compare_with_baseline(result)
        if comparison.get("overall_status") == "regression":
            pytest.fail(f"Performance regression detected: {comparison}")
    
    async def test_semantic_search_performance(self, benchmark):
        """Test semantic search performance."""
        async def semantic_search():
            async with httpx.AsyncClient() as client:
                search_data = {
                    "query": "machine learning engineer with python experience",
                    "limit": 10
                }
                response = await client.post(
                    "http://localhost:8000/api/v1/jobs/semantic-search",
                    json=search_data,
                    headers={"Authorization": "Bearer test-token"}
                )
                return response.status_code
        
        result = await benchmark.benchmark_async_function(
            semantic_search,
            "semantic_search",
            iterations=30
        )
        
        # Assert performance criteria (semantic search is more expensive)
        assert result.execution_time < 2.0, f"Semantic search too slow: {result.execution_time:.3f}s"
        assert result.memory_usage < 50, f"Memory usage too high: {result.memory_usage:.1f}MB"
        
        # Compare with baseline
        comparison = benchmark.compare_with_baseline(result)
        if comparison.get("overall_status") == "regression":
            pytest.fail(f"Performance regression detected: {comparison}")
    
    async def test_document_generation_performance(self, benchmark):
        """Test document generation performance."""
        async def generate_resume():
            async with httpx.AsyncClient(timeout=30.0) as client:
                generation_data = {
                    "job_description": "Python developer with FastAPI experience",
                    "template_id": "modern"
                }
                response = await client.post(
                    "http://localhost:8000/api/v1/documents/generate-resume",
                    json=generation_data,
                    headers={"Authorization": "Bearer test-token"}
                )
                return response.status_code
        
        result = await benchmark.benchmark_async_function(
            generate_resume,
            "document_generation",
            iterations=10  # Fewer iterations for expensive operations
        )
        
        # Assert performance criteria (AI operations are expensive)
        assert result.execution_time < 10.0, f"Document generation too slow: {result.execution_time:.3f}s"
        assert result.memory_usage < 100, f"Memory usage too high: {result.memory_usage:.1f}MB"
        
        # Compare with baseline
        comparison = benchmark.compare_with_baseline(result)
        if comparison.get("overall_status") == "regression":
            pytest.fail(f"Performance regression detected: {comparison}")


@pytest.mark.performance
@pytest.mark.asyncio
class TestDatabasePerformanceRegression:
    """Database performance regression tests."""
    
    async def test_user_query_performance(self, benchmark):
        """Test user database query performance."""
        from app.repositories.user import UserRepository
        from app.core.database import get_db_session
        from app.core.cache import get_redis_client
        
        async def query_users():
            async with get_db_session() as session:
                redis_client = await get_redis_client()
                repo = UserRepository(session, redis_client)
                
                # Simulate various query patterns
                await repo.find_by_id("test-user-123")
                await repo.find_all(limit=10)
                await repo.count()
                
                return True
        
        result = await benchmark.benchmark_async_function(
            query_users,
            "user_queries",
            iterations=50
        )
        
        # Assert performance criteria
        assert result.execution_time < 0.1, f"Database queries too slow: {result.execution_time:.3f}s"
        
        # Compare with baseline
        comparison = benchmark.compare_with_baseline(result)
        if comparison.get("overall_status") == "regression":
            pytest.fail(f"Performance regression detected: {comparison}")
    
    async def test_job_query_performance(self, benchmark):
        """Test job database query performance."""
        from app.repositories.job import JobRepository
        from app.core.database import get_db_session
        from app.core.cache import get_redis_client
        
        async def query_jobs():
            async with get_db_session() as session:
                redis_client = await get_redis_client()
                repo = JobRepository(session, redis_client)
                
                # Simulate search queries
                await repo.search_jobs("python", location="remote", limit=20)
                await repo.find_by_id("test-job-123")
                
                return True
        
        result = await benchmark.benchmark_async_function(
            query_jobs,
            "job_queries",
            iterations=50
        )
        
        # Assert performance criteria
        assert result.execution_time < 0.2, f"Job queries too slow: {result.execution_time:.3f}s"
        
        # Compare with baseline
        comparison = benchmark.compare_with_baseline(result)
        if comparison.get("overall_status") == "regression":
            pytest.fail(f"Performance regression detected: {comparison}")


@pytest.mark.performance
@pytest.mark.asyncio
class TestCachePerformanceRegression:
    """Cache performance regression tests."""
    
    async def test_redis_cache_performance(self, benchmark):
        """Test Redis cache performance."""
        from app.core.cache import get_redis_client
        
        async def cache_operations():
            redis_client = await get_redis_client()
            
            # Set operations
            await redis_client.set("perf_test_key", "test_value")
            await redis_client.setex("perf_test_ttl", 60, "test_value_ttl")
            
            # Get operations
            await redis_client.get("perf_test_key")
            await redis_client.get("perf_test_ttl")
            
            # Delete operations
            await redis_client.delete("perf_test_key", "perf_test_ttl")
            
            return True
        
        result = await benchmark.benchmark_async_function(
            cache_operations,
            "redis_cache",
            iterations=100
        )
        
        # Assert performance criteria
        assert result.execution_time < 0.01, f"Cache operations too slow: {result.execution_time:.3f}s"
        assert result.throughput > 100, f"Cache throughput too low: {result.throughput:.1f} ops/s"
        
        # Compare with baseline
        comparison = benchmark.compare_with_baseline(result)
        if comparison.get("overall_status") == "regression":
            pytest.fail(f"Performance regression detected: {comparison}")
    
    async def test_cache_warming_performance(self, benchmark):
        """Test cache warming performance."""
        from app.core.cache_warming import CacheWarmingService
        
        async def warm_cache():
            service = CacheWarmingService()
            await service.warm_user_cache("test-user-123")
            await service.warm_job_cache(["job1", "job2", "job3"])
            return True
        
        result = await benchmark.benchmark_async_function(
            warm_cache,
            "cache_warming",
            iterations=20
        )
        
        # Assert performance criteria
        assert result.execution_time < 1.0, f"Cache warming too slow: {result.execution_time:.3f}s"
        
        # Compare with baseline
        comparison = benchmark.compare_with_baseline(result)
        if comparison.get("overall_status") == "regression":
            pytest.fail(f"Performance regression detected: {comparison}")


@pytest.mark.performance
class TestDataProcessingPerformanceRegression:
    """Data processing performance regression tests."""
    
    def test_analytics_calculation_performance(self, benchmark):
        """Test analytics calculation performance."""
        from app.services.analytics.service import AnalyticsService
        import pandas as pd
        import numpy as np
        
        def calculate_analytics():
            # Create sample data
            data = pd.DataFrame({
                'user_id': np.random.choice(['user1', 'user2', 'user3'], 1000),
                'application_date': pd.date_range('2024-01-01', periods=1000, freq='H'),
                'status': np.random.choice(['applied', 'interview', 'offer', 'rejected'], 1000),
                'response_time_days': np.random.exponential(7, 1000)
            })
            
            service = AnalyticsService()
            
            # Perform various analytics calculations
            metrics = service._calculate_basic_metrics(data)
            insights = service._generate_insights(data, "user1")
            
            return len(metrics) + len(insights)
        
        result = benchmark.benchmark_sync_function(
            calculate_analytics,
            "analytics_calculation",
            iterations=20
        )
        
        # Assert performance criteria
        assert result.execution_time < 0.5, f"Analytics calculation too slow: {result.execution_time:.3f}s"
        assert result.memory_usage < 20, f"Memory usage too high: {result.memory_usage:.1f}MB"
        
        # Compare with baseline
        comparison = benchmark.compare_with_baseline(result)
        if comparison.get("overall_status") == "regression":
            pytest.fail(f"Performance regression detected: {comparison}")
    
    def test_ml_model_performance(self, benchmark):
        """Test ML model performance."""
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.model_selection import train_test_split
        import numpy as np
        
        def train_and_predict():
            # Generate sample data
            X = np.random.rand(1000, 10)
            y = np.random.randint(0, 2, 1000)
            
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
            
            # Train model
            model = RandomForestClassifier(n_estimators=10, random_state=42)
            model.fit(X_train, y_train)
            
            # Make predictions
            predictions = model.predict(X_test)
            
            return len(predictions)
        
        result = benchmark.benchmark_sync_function(
            train_and_predict,
            "ml_model_training",
            iterations=10
        )
        
        # Assert performance criteria
        assert result.execution_time < 2.0, f"ML model training too slow: {result.execution_time:.3f}s"
        
        # Compare with baseline
        comparison = benchmark.compare_with_baseline(result)
        if comparison.get("overall_status") == "regression":
            pytest.fail(f"Performance regression detected: {comparison}")


@pytest.mark.performance
@pytest.mark.asyncio
class TestConcurrencyPerformanceRegression:
    """Concurrency performance regression tests."""
    
    async def test_concurrent_api_requests(self, benchmark):
        """Test concurrent API request performance."""
        async def concurrent_requests():
            async with httpx.AsyncClient() as client:
                # Create multiple concurrent requests
                tasks = []
                for i in range(10):
                    task = client.get("http://localhost:8000/health")
                    tasks.append(task)
                
                responses = await asyncio.gather(*tasks)
                return len([r for r in responses if r.status_code == 200])
        
        result = await benchmark.benchmark_async_function(
            concurrent_requests,
            "concurrent_requests",
            iterations=20
        )
        
        # Assert performance criteria
        assert result.execution_time < 1.0, f"Concurrent requests too slow: {result.execution_time:.3f}s"
        assert result.throughput > 5, f"Concurrent throughput too low: {result.throughput:.1f} req/s"
        
        # Compare with baseline
        comparison = benchmark.compare_with_baseline(result)
        if comparison.get("overall_status") == "regression":
            pytest.fail(f"Performance regression detected: {comparison}")
    
    async def test_background_task_performance(self, benchmark):
        """Test background task performance."""
        from app.tasks.background_analytics import calculate_user_analytics
        
        async def process_background_tasks():
            # Simulate processing multiple background tasks
            tasks = []
            for i in range(5):
                task = calculate_user_analytics.delay(f"user-{i}")
                tasks.append(task)
            
            # Wait for tasks to complete (in real scenario)
            await asyncio.sleep(0.1)  # Simulate task processing time
            
            return len(tasks)
        
        result = await benchmark.benchmark_async_function(
            process_background_tasks,
            "background_tasks",
            iterations=10
        )
        
        # Assert performance criteria
        assert result.execution_time < 0.5, f"Background tasks too slow: {result.execution_time:.3f}s"
        
        # Compare with baseline
        comparison = benchmark.compare_with_baseline(result)
        if comparison.get("overall_status") == "regression":
            pytest.fail(f"Performance regression detected: {comparison}")


def pytest_configure(config):
    """Configure pytest for performance tests."""
    config.addinivalue_line(
        "markers", "performance: marks tests as performance regression tests"
    )


def pytest_collection_modifyitems(config, items):
    """Modify test collection for performance tests."""
    for item in items:
        if "performance" in item.keywords:
            # Add performance marker
            item.add_marker(pytest.mark.performance)
            
            # Set longer timeout for performance tests
            if hasattr(item, 'timeout'):
                item.timeout = 60  # 60 seconds timeout


@pytest.fixture(scope="session", autouse=True)
def setup_performance_testing():
    """Set up performance testing environment."""
    # Ensure performance results directory exists
    Path("performance_results").mkdir(exist_ok=True)
    
    # Set up logging for performance tests
    import logging
    logging.basicConfig(level=logging.INFO)
    
    yield
    
    # Cleanup after performance tests
    print("Performance testing completed")