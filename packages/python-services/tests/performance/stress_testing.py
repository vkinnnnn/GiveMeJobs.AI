"""
Stress testing scenarios for critical endpoints.
"""

import asyncio
import time
import random
from typing import List, Dict, Any
from dataclasses import dataclass
import httpx
import psutil
import structlog

logger = structlog.get_logger(__name__)


@dataclass
class StressTestResult:
    """Stress test result data."""
    test_name: str
    duration_seconds: float
    total_requests: int
    successful_requests: int
    failed_requests: int
    requests_per_second: float
    average_response_time: float
    max_response_time: float
    min_response_time: float
    error_rate: float
    peak_memory_mb: float
    peak_cpu_percent: float
    errors: List[str]


class StressTestRunner:
    """Stress test runner for FastAPI endpoints."""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.results: List[StressTestResult] = []
    
    async def run_stress_test(
        self,
        test_name: str,
        endpoint: str,
        method: str = "GET",
        concurrent_users: int = 100,
        duration_seconds: int = 60,
        ramp_up_seconds: int = 10,
        data: Dict[str, Any] = None,
        headers: Dict[str, str] = None
    ) -> StressTestResult:
        """Run stress test on a specific endpoint."""
        
        logger.info(
            "Starting stress test",
            test_name=test_name,
            endpoint=endpoint,
            concurrent_users=concurrent_users,
            duration_seconds=duration_seconds
        )
        
        # Initialize tracking variables
        start_time = time.time()
        end_time = start_time + duration_seconds
        ramp_up_end = start_time + ramp_up_seconds
        
        request_times = []
        successful_requests = 0
        failed_requests = 0
        errors = []
        
        # Memory and CPU monitoring
        process = psutil.Process()
        peak_memory = 0
        peak_cpu = 0
        
        # Create semaphore to limit concurrent requests
        semaphore = asyncio.Semaphore(concurrent_users)
        
        async def make_request(session: httpx.AsyncClient) -> Dict[str, Any]:
            """Make a single request."""
            nonlocal successful_requests, failed_requests, peak_memory, peak_cpu
            
            async with semaphore:
                try:
                    # Monitor system resources
                    current_memory = process.memory_info().rss / 1024 / 1024  # MB
                    current_cpu = process.cpu_percent()
                    peak_memory = max(peak_memory, current_memory)
                    peak_cpu = max(peak_cpu, current_cpu)
                    
                    # Make request
                    request_start = time.time()
                    
                    if method.upper() == "GET":
                        response = await session.get(f"{self.base_url}{endpoint}", headers=headers)
                    elif method.upper() == "POST":
                        response = await session.post(f"{self.base_url}{endpoint}", json=data, headers=headers)
                    elif method.upper() == "PUT":
                        response = await session.put(f"{self.base_url}{endpoint}", json=data, headers=headers)
                    elif method.upper() == "DELETE":
                        response = await session.delete(f"{self.base_url}{endpoint}", headers=headers)
                    else:
                        raise ValueError(f"Unsupported HTTP method: {method}")
                    
                    request_end = time.time()
                    response_time = request_end - request_start
                    
                    if response.status_code < 400:
                        successful_requests += 1
                    else:
                        failed_requests += 1
                        errors.append(f"HTTP {response.status_code}: {response.text[:100]}")
                    
                    return {
                        "response_time": response_time,
                        "status_code": response.status_code,
                        "success": response.status_code < 400
                    }
                    
                except Exception as e:
                    failed_requests += 1
                    error_msg = str(e)[:100]
                    errors.append(f"Exception: {error_msg}")
                    return {
                        "response_time": 0,
                        "status_code": 0,
                        "success": False,
                        "error": error_msg
                    }
        
        # Run stress test
        async with httpx.AsyncClient(timeout=30.0) as session:
            tasks = []
            
            while time.time() < end_time:
                current_time = time.time()
                
                # Calculate current user count (ramp up)
                if current_time < ramp_up_end:
                    progress = (current_time - start_time) / ramp_up_seconds
                    current_users = int(concurrent_users * progress)
                else:
                    current_users = concurrent_users
                
                # Maintain desired number of concurrent requests
                while len(tasks) < current_users and time.time() < end_time:
                    task = asyncio.create_task(make_request(session))
                    tasks.append(task)
                
                # Clean up completed tasks
                completed_tasks = [task for task in tasks if task.done()]
                for task in completed_tasks:
                    try:
                        result = await task
                        if result["success"]:
                            request_times.append(result["response_time"])
                    except Exception as e:
                        logger.error("Task failed", error=str(e))
                    tasks.remove(task)
                
                # Small delay to prevent overwhelming the system
                await asyncio.sleep(0.01)
            
            # Wait for remaining tasks to complete
            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)
                for task in tasks:
                    if task.done() and not task.exception():
                        try:
                            result = await task
                            if result["success"]:
                                request_times.append(result["response_time"])
                        except Exception:
                            pass
        
        # Calculate results
        total_time = time.time() - start_time
        total_requests = successful_requests + failed_requests
        
        result = StressTestResult(
            test_name=test_name,
            duration_seconds=total_time,
            total_requests=total_requests,
            successful_requests=successful_requests,
            failed_requests=failed_requests,
            requests_per_second=total_requests / total_time if total_time > 0 else 0,
            average_response_time=sum(request_times) / len(request_times) if request_times else 0,
            max_response_time=max(request_times) if request_times else 0,
            min_response_time=min(request_times) if request_times else 0,
            error_rate=(failed_requests / total_requests * 100) if total_requests > 0 else 0,
            peak_memory_mb=peak_memory,
            peak_cpu_percent=peak_cpu,
            errors=list(set(errors))  # Remove duplicates
        )
        
        self.results.append(result)
        
        logger.info(
            "Stress test completed",
            test_name=test_name,
            total_requests=total_requests,
            rps=result.requests_per_second,
            error_rate=result.error_rate,
            avg_response_time=result.average_response_time
        )
        
        return result
    
    async def run_spike_test(
        self,
        test_name: str,
        endpoint: str,
        method: str = "GET",
        normal_users: int = 10,
        spike_users: int = 100,
        spike_duration: int = 30,
        total_duration: int = 120,
        data: Dict[str, Any] = None,
        headers: Dict[str, str] = None
    ) -> StressTestResult:
        """Run spike test with sudden load increase."""
        
        logger.info(
            "Starting spike test",
            test_name=test_name,
            normal_users=normal_users,
            spike_users=spike_users,
            spike_duration=spike_duration
        )
        
        start_time = time.time()
        spike_start = start_time + (total_duration - spike_duration) / 2
        spike_end = spike_start + spike_duration
        end_time = start_time + total_duration
        
        request_times = []
        successful_requests = 0
        failed_requests = 0
        errors = []
        
        # Memory and CPU monitoring
        process = psutil.Process()
        peak_memory = 0
        peak_cpu = 0
        
        async def make_request(session: httpx.AsyncClient) -> Dict[str, Any]:
            """Make a single request."""
            nonlocal successful_requests, failed_requests, peak_memory, peak_cpu
            
            try:
                # Monitor system resources
                current_memory = process.memory_info().rss / 1024 / 1024  # MB
                current_cpu = process.cpu_percent()
                peak_memory = max(peak_memory, current_memory)
                peak_cpu = max(peak_cpu, current_cpu)
                
                # Make request
                request_start = time.time()
                
                if method.upper() == "GET":
                    response = await session.get(f"{self.base_url}{endpoint}", headers=headers)
                elif method.upper() == "POST":
                    response = await session.post(f"{self.base_url}{endpoint}", json=data, headers=headers)
                else:
                    raise ValueError(f"Unsupported HTTP method: {method}")
                
                request_end = time.time()
                response_time = request_end - request_start
                
                if response.status_code < 400:
                    successful_requests += 1
                else:
                    failed_requests += 1
                    errors.append(f"HTTP {response.status_code}")
                
                return {
                    "response_time": response_time,
                    "status_code": response.status_code,
                    "success": response.status_code < 400
                }
                
            except Exception as e:
                failed_requests += 1
                errors.append(f"Exception: {str(e)[:50]}")
                return {
                    "response_time": 0,
                    "status_code": 0,
                    "success": False
                }
        
        # Run spike test
        async with httpx.AsyncClient(timeout=30.0) as session:
            while time.time() < end_time:
                current_time = time.time()
                
                # Determine current load level
                if spike_start <= current_time <= spike_end:
                    current_users = spike_users
                    logger.info("Spike phase active", users=spike_users)
                else:
                    current_users = normal_users
                
                # Create batch of concurrent requests
                tasks = []
                for _ in range(current_users):
                    task = asyncio.create_task(make_request(session))
                    tasks.append(task)
                
                # Wait for batch to complete
                results = await asyncio.gather(*tasks, return_exceptions=True)
                
                for result in results:
                    if isinstance(result, dict) and result.get("success"):
                        request_times.append(result["response_time"])
                
                # Small delay between batches
                await asyncio.sleep(0.1)
        
        # Calculate results
        total_time = time.time() - start_time
        total_requests = successful_requests + failed_requests
        
        result = StressTestResult(
            test_name=test_name,
            duration_seconds=total_time,
            total_requests=total_requests,
            successful_requests=successful_requests,
            failed_requests=failed_requests,
            requests_per_second=total_requests / total_time if total_time > 0 else 0,
            average_response_time=sum(request_times) / len(request_times) if request_times else 0,
            max_response_time=max(request_times) if request_times else 0,
            min_response_time=min(request_times) if request_times else 0,
            error_rate=(failed_requests / total_requests * 100) if total_requests > 0 else 0,
            peak_memory_mb=peak_memory,
            peak_cpu_percent=peak_cpu,
            errors=list(set(errors))
        )
        
        self.results.append(result)
        
        logger.info(
            "Spike test completed",
            test_name=test_name,
            total_requests=total_requests,
            error_rate=result.error_rate
        )
        
        return result
    
    async def run_endurance_test(
        self,
        test_name: str,
        endpoint: str,
        method: str = "GET",
        concurrent_users: int = 50,
        duration_minutes: int = 30,
        data: Dict[str, Any] = None,
        headers: Dict[str, str] = None
    ) -> StressTestResult:
        """Run endurance test for long-term stability."""
        
        logger.info(
            "Starting endurance test",
            test_name=test_name,
            duration_minutes=duration_minutes
        )
        
        return await self.run_stress_test(
            test_name=f"{test_name}_endurance",
            endpoint=endpoint,
            method=method,
            concurrent_users=concurrent_users,
            duration_seconds=duration_minutes * 60,
            ramp_up_seconds=60,  # Longer ramp up for endurance
            data=data,
            headers=headers
        )
    
    def generate_stress_test_report(self) -> Dict[str, Any]:
        """Generate comprehensive stress test report."""
        
        if not self.results:
            return {"error": "No stress test results available"}
        
        report = {
            "summary": {
                "total_tests": len(self.results),
                "total_requests": sum(r.total_requests for r in self.results),
                "total_failures": sum(r.failed_requests for r in self.results),
                "average_rps": sum(r.requests_per_second for r in self.results) / len(self.results),
                "max_rps": max(r.requests_per_second for r in self.results),
                "average_error_rate": sum(r.error_rate for r in self.results) / len(self.results),
                "peak_memory_mb": max(r.peak_memory_mb for r in self.results),
                "peak_cpu_percent": max(r.peak_cpu_percent for r in self.results)
            },
            "test_results": [],
            "performance_analysis": {},
            "recommendations": []
        }
        
        # Add individual test results
        for result in self.results:
            report["test_results"].append({
                "test_name": result.test_name,
                "duration_seconds": result.duration_seconds,
                "total_requests": result.total_requests,
                "successful_requests": result.successful_requests,
                "failed_requests": result.failed_requests,
                "requests_per_second": result.requests_per_second,
                "average_response_time": result.average_response_time,
                "max_response_time": result.max_response_time,
                "error_rate": result.error_rate,
                "peak_memory_mb": result.peak_memory_mb,
                "peak_cpu_percent": result.peak_cpu_percent,
                "status": "PASS" if result.error_rate < 5 and result.average_response_time < 2000 else "FAIL"
            })
        
        # Performance analysis
        high_error_tests = [r for r in self.results if r.error_rate > 5]
        slow_tests = [r for r in self.results if r.average_response_time > 2000]
        resource_intensive_tests = [r for r in self.results if r.peak_cpu_percent > 80 or r.peak_memory_mb > 1000]
        
        report["performance_analysis"] = {
            "high_error_rate_tests": len(high_error_tests),
            "slow_response_tests": len(slow_tests),
            "resource_intensive_tests": len(resource_intensive_tests),
            "stability_score": max(0, 100 - (len(high_error_tests) + len(slow_tests)) * 10)
        }
        
        # Generate recommendations
        recommendations = []
        
        if high_error_tests:
            recommendations.append(
                f"High error rates detected in {len(high_error_tests)} tests. "
                "Investigate error causes and implement better error handling."
            )
        
        if slow_tests:
            recommendations.append(
                f"Slow response times detected in {len(slow_tests)} tests. "
                "Consider optimizing database queries, implementing caching, or scaling resources."
            )
        
        if resource_intensive_tests:
            recommendations.append(
                f"High resource usage detected in {len(resource_intensive_tests)} tests. "
                "Consider optimizing algorithms or increasing system resources."
            )
        
        if report["summary"]["average_rps"] < 100:
            recommendations.append(
                "Low overall throughput detected. Consider horizontal scaling or performance optimization."
            )
        
        report["recommendations"] = recommendations
        
        return report


# Predefined stress test scenarios
class StressTestScenarios:
    """Predefined stress test scenarios for common endpoints."""
    
    @staticmethod
    async def test_authentication_stress():
        """Stress test authentication endpoints."""
        runner = StressTestRunner()
        
        # Test user registration under load
        await runner.run_stress_test(
            test_name="user_registration_stress",
            endpoint="/api/v1/auth/register",
            method="POST",
            concurrent_users=50,
            duration_seconds=60,
            data={
                "email": f"stress_test_{random.randint(1000, 9999)}@example.com",
                "password": "StressTest123!",
                "first_name": "Stress",
                "last_name": "Test"
            }
        )
        
        # Test user login under load
        await runner.run_stress_test(
            test_name="user_login_stress",
            endpoint="/api/v1/auth/login",
            method="POST",
            concurrent_users=100,
            duration_seconds=60,
            data={
                "email": "test@example.com",
                "password": "TestPassword123!"
            }
        )
        
        return runner.generate_stress_test_report()
    
    @staticmethod
    async def test_job_search_stress():
        """Stress test job search endpoints."""
        runner = StressTestRunner()
        
        # Test basic job search
        await runner.run_stress_test(
            test_name="job_search_stress",
            endpoint="/api/v1/jobs/search?q=python&limit=20",
            method="GET",
            concurrent_users=200,
            duration_seconds=120
        )
        
        # Test semantic search
        await runner.run_stress_test(
            test_name="semantic_search_stress",
            endpoint="/api/v1/jobs/semantic-search",
            method="POST",
            concurrent_users=50,
            duration_seconds=60,
            data={
                "query": "machine learning engineer with python experience",
                "limit": 10
            },
            headers={"Authorization": "Bearer test-token"}
        )
        
        return runner.generate_stress_test_report()
    
    @staticmethod
    async def test_document_generation_stress():
        """Stress test document generation endpoints."""
        runner = StressTestRunner()
        
        # Test resume generation under load
        await runner.run_stress_test(
            test_name="resume_generation_stress",
            endpoint="/api/v1/documents/generate-resume",
            method="POST",
            concurrent_users=20,  # Lower concurrency for AI operations
            duration_seconds=120,
            data={
                "job_description": "Python developer with FastAPI experience",
                "template_id": "modern"
            },
            headers={"Authorization": "Bearer test-token"}
        )
        
        return runner.generate_stress_test_report()
    
    @staticmethod
    async def test_spike_scenarios():
        """Test spike scenarios."""
        runner = StressTestRunner()
        
        # Health check spike test
        await runner.run_spike_test(
            test_name="health_check_spike",
            endpoint="/health",
            method="GET",
            normal_users=10,
            spike_users=200,
            spike_duration=30,
            total_duration=120
        )
        
        # Job search spike test
        await runner.run_spike_test(
            test_name="job_search_spike",
            endpoint="/api/v1/jobs/search?q=developer",
            method="GET",
            normal_users=20,
            spike_users=150,
            spike_duration=45,
            total_duration=180
        )
        
        return runner.generate_stress_test_report()


# CLI interface for stress testing
if __name__ == "__main__":
    import sys
    
    async def main():
        if len(sys.argv) < 2:
            print("Usage: python stress_testing.py <scenario>")
            print("Available scenarios: auth, search, documents, spike")
            return
        
        scenario = sys.argv[1].lower()
        
        if scenario == "auth":
            report = await StressTestScenarios.test_authentication_stress()
        elif scenario == "search":
            report = await StressTestScenarios.test_job_search_stress()
        elif scenario == "documents":
            report = await StressTestScenarios.test_document_generation_stress()
        elif scenario == "spike":
            report = await StressTestScenarios.test_spike_scenarios()
        else:
            print(f"Unknown scenario: {scenario}")
            return
        
        print("\nStress Test Report:")
        print("=" * 50)
        print(f"Total Tests: {report['summary']['total_tests']}")
        print(f"Total Requests: {report['summary']['total_requests']:,}")
        print(f"Average RPS: {report['summary']['average_rps']:.1f}")
        print(f"Average Error Rate: {report['summary']['average_error_rate']:.2f}%")
        print(f"Peak Memory: {report['summary']['peak_memory_mb']:.1f} MB")
        print(f"Peak CPU: {report['summary']['peak_cpu_percent']:.1f}%")
        
        if report['recommendations']:
            print("\nRecommendations:")
            for rec in report['recommendations']:
                print(f"- {rec}")
    
    asyncio.run(main())