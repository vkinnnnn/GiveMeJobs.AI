#!/usr/bin/env python3
"""
Comprehensive performance testing script.

This script runs all performance tests including load testing,
cache effectiveness testing, and auto-scaling verification.
"""

import asyncio
import subprocess
import sys
from pathlib import Path
from datetime import datetime

import click
import structlog

# Add the tests directory to the path
sys.path.append(str(Path(__file__).parent.parent / "tests" / "performance"))

from test_cache_effectiveness import CacheEffectivenessTest
from run_performance_tests import PerformanceTestSuite

logger = structlog.get_logger(__name__)


class ComprehensivePerformanceTest:
    """Comprehensive performance test runner."""
    
    def __init__(self, 
                 api_base_url: str = "http://localhost:8000",
                 results_dir: Path = None):
        self.api_base_url = api_base_url
        self.results_dir = results_dir or Path("./performance_results")
        self.results_dir.mkdir(exist_ok=True)
        
        # Initialize test components
        self.load_test_suite = PerformanceTestSuite(api_base_url, self.results_dir)
    
    async def run_all_tests(self, include_load_tests: bool = True, include_cache_tests: bool = True):
        """Run all performance tests."""
        
        logger.info("Starting comprehensive performance testing")
        
        test_results = {
            "start_time": datetime.now().isoformat(),
            "api_base_url": self.api_base_url,
            "results_directory": str(self.results_dir)
        }
        
        # 1. Cache Effectiveness Tests
        if include_cache_tests:
            logger.info("Running cache effectiveness tests")
            try:
                async with CacheEffectivenessTest(self.api_base_url) as cache_tester:
                    cache_results = await cache_tester.run_comprehensive_cache_tests()
                    test_results["cache_tests"] = {
                        "status": "completed",
                        "results": {name: {
                            "cache_hit_rate": result.cache_hit_rate,
                            "performance_improvement": result.performance_improvement,
                            "avg_cached_time": result.average_response_time_cached,
                            "avg_uncached_time": result.average_response_time_uncached
                        } for name, result in cache_results.items()}
                    }
                    
                    # Print cache results summary
                    self._print_cache_summary(cache_results)
                    
            except Exception as e:
                logger.error("Cache effectiveness tests failed", error=str(e))
                test_results["cache_tests"] = {"status": "failed", "error": str(e)}
        
        # 2. Load Testing
        if include_load_tests:
            logger.info("Running load tests")
            try:
                load_results = await self.load_test_suite.run_all_tests()
                test_results["load_tests"] = {
                    "status": "completed",
                    "results": {name: {
                        "requests_per_second": result.requests_per_second,
                        "p95_response_time": result.p95_response_time,
                        "error_rate": result.error_rate,
                        "peak_cpu": result.peak_cpu_percent,
                        "peak_memory": result.peak_memory_percent,
                        "performance_issues": result.performance_issues
                    } for name, result in load_results.items()}
                }
                
                # Print load test summary
                self._print_load_test_summary(load_results)
                
            except Exception as e:
                logger.error("Load tests failed", error=str(e))
                test_results["load_tests"] = {"status": "failed", "error": str(e)}
        
        # 3. Auto-scaling Verification
        logger.info("Verifying auto-scaling configuration")
        try:
            scaling_status = await self._check_autoscaling_config()
            test_results["autoscaling_verification"] = scaling_status
            self._print_autoscaling_summary(scaling_status)
            
        except Exception as e:
            logger.error("Auto-scaling verification failed", error=str(e))
            test_results["autoscaling_verification"] = {"status": "failed", "error": str(e)}
        
        # 4. Generate final report
        test_results["end_time"] = datetime.now().isoformat()
        await self._generate_final_report(test_results)
        
        logger.info("Comprehensive performance testing completed")
        
        return test_results
    
    def _print_cache_summary(self, cache_results):
        """Print cache test summary."""
        
        print("\n" + "="*60)
        print("CACHE EFFECTIVENESS SUMMARY")
        print("="*60)
        
        total_improvement = 0
        total_hit_rate = 0
        
        for test_name, result in cache_results.items():
            print(f"\n{result.test_name}:")
            print(f"  Hit Rate: {result.cache_hit_rate:.1f}%")
            print(f"  Performance Improvement: {result.performance_improvement:.1f}%")
            
            total_improvement += result.performance_improvement
            total_hit_rate += result.cache_hit_rate
        
        avg_improvement = total_improvement / len(cache_results)
        avg_hit_rate = total_hit_rate / len(cache_results)
        
        print(f"\nOverall Cache Performance:")
        print(f"  Average Hit Rate: {avg_hit_rate:.1f}%")
        print(f"  Average Performance Improvement: {avg_improvement:.1f}%")
        
        if avg_improvement > 50:
            print("  ✅ Cache is highly effective")
        elif avg_improvement > 20:
            print("  ⚠️  Cache is moderately effective")
        else:
            print("  ❌ Cache needs optimization")
    
    def _print_load_test_summary(self, load_results):
        """Print load test summary."""
        
        print("\n" + "="*60)
        print("LOAD TESTING SUMMARY")
        print("="*60)
        
        for test_name, result in load_results.items():
            status = "✅ PASS" if not result.performance_issues else "❌ FAIL"
            print(f"\n{test_name}: {status}")
            print(f"  RPS: {result.requests_per_second:.1f}")
            print(f"  P95 Response Time: {result.p95_response_time:.1f}ms")
            print(f"  Error Rate: {result.error_rate:.2f}%")
            print(f"  Peak CPU: {result.peak_cpu_percent:.1f}%")
            print(f"  Peak Memory: {result.peak_memory_percent:.1f}%")
            
            if result.performance_issues:
                for issue in result.performance_issues:
                    print(f"    ⚠️  {issue}")
    
    def _print_autoscaling_summary(self, scaling_status):
        """Print auto-scaling summary."""
        
        print("\n" + "="*60)
        print("AUTO-SCALING VERIFICATION")
        print("="*60)
        
        if scaling_status["status"] == "verified":
            print("✅ Auto-scaling configuration verified")
            
            for hpa_name, hpa_info in scaling_status.get("hpa_status", {}).items():
                print(f"\n{hpa_name}:")
                print(f"  Min/Max Replicas: {hpa_info['min_replicas']}/{hpa_info['max_replicas']}")
                print(f"  Current Replicas: {hpa_info['current_replicas']}")
                print(f"  Metrics Configured: {len(hpa_info.get('metrics', []))}")
        else:
            print("❌ Auto-scaling verification failed")
            print(f"Error: {scaling_status.get('error', 'Unknown error')}")
    
    async def _check_autoscaling_config(self):
        """Check auto-scaling configuration."""
        
        try:
            # Check if kubectl is available
            result = subprocess.run(
                ["kubectl", "version", "--client"],
                capture_output=True,
                text=True,
                check=True
            )
            
            # Check HPA status
            result = subprocess.run([
                "kubectl", "get", "hpa",
                "--namespace=givemejobs",
                "-o", "json"
            ], capture_output=True, text=True, check=False)
            
            if result.returncode != 0:
                return {
                    "status": "not_available",
                    "error": "HPA not found or kubectl not configured"
                }
            
            import json
            hpa_data = json.loads(result.stdout)
            
            hpa_status = {}
            for item in hpa_data.get("items", []):
                name = item["metadata"]["name"]
                spec = item["spec"]
                status_info = item.get("status", {})
                
                hpa_status[name] = {
                    "min_replicas": spec.get("minReplicas"),
                    "max_replicas": spec.get("maxReplicas"),
                    "current_replicas": status_info.get("currentReplicas"),
                    "desired_replicas": status_info.get("desiredReplicas"),
                    "metrics": spec.get("metrics", [])
                }
            
            return {
                "status": "verified",
                "hpa_status": hpa_status,
                "total_hpa": len(hpa_status)
            }
            
        except subprocess.CalledProcessError as e:
            return {
                "status": "error",
                "error": f"kubectl command failed: {e}"
            }
        except Exception as e:
            return {
                "status": "error",
                "error": str(e)
            }
    
    async def _generate_final_report(self, test_results):
        """Generate final comprehensive report."""
        
        import json
        
        # Save detailed results
        report_file = self.results_dir / f"comprehensive_performance_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        with open(report_file, 'w') as f:
            json.dump(test_results, f, indent=2)
        
        # Generate summary report
        summary_file = self.results_dir / "performance_summary.txt"
        
        with open(summary_file, 'w') as f:
            f.write("COMPREHENSIVE PERFORMANCE TEST SUMMARY\n")
            f.write("="*50 + "\n\n")
            
            f.write(f"Test Date: {test_results['start_time']}\n")
            f.write(f"API URL: {test_results['api_base_url']}\n\n")
            
            # Cache tests summary
            if "cache_tests" in test_results and test_results["cache_tests"]["status"] == "completed":
                f.write("CACHE EFFECTIVENESS:\n")
                cache_results = test_results["cache_tests"]["results"]
                
                total_improvement = sum(r["performance_improvement"] for r in cache_results.values())
                avg_improvement = total_improvement / len(cache_results)
                
                f.write(f"  Average Performance Improvement: {avg_improvement:.1f}%\n")
                f.write(f"  Status: {'GOOD' if avg_improvement > 30 else 'NEEDS IMPROVEMENT'}\n\n")
            
            # Load tests summary
            if "load_tests" in test_results and test_results["load_tests"]["status"] == "completed":
                f.write("LOAD TESTING:\n")
                load_results = test_results["load_tests"]["results"]
                
                failed_tests = [name for name, result in load_results.items() if result["performance_issues"]]
                
                f.write(f"  Total Scenarios: {len(load_results)}\n")
                f.write(f"  Failed Scenarios: {len(failed_tests)}\n")
                f.write(f"  Success Rate: {((len(load_results) - len(failed_tests)) / len(load_results) * 100):.1f}%\n\n")
            
            # Auto-scaling summary
            if "autoscaling_verification" in test_results:
                f.write("AUTO-SCALING:\n")
                scaling_status = test_results["autoscaling_verification"]
                f.write(f"  Status: {scaling_status['status'].upper()}\n")
                if scaling_status["status"] == "verified":
                    f.write(f"  HPA Configurations: {scaling_status.get('total_hpa', 0)}\n")
                f.write("\n")
            
            # Overall assessment
            f.write("OVERALL ASSESSMENT:\n")
            
            issues = []
            if "cache_tests" in test_results and test_results["cache_tests"]["status"] != "completed":
                issues.append("Cache tests failed")
            if "load_tests" in test_results and test_results["load_tests"]["status"] != "completed":
                issues.append("Load tests failed")
            if "autoscaling_verification" in test_results and test_results["autoscaling_verification"]["status"] != "verified":
                issues.append("Auto-scaling not properly configured")
            
            if not issues:
                f.write("  ✅ All performance tests passed\n")
                f.write("  System is ready for production load\n")
            else:
                f.write("  ⚠️  Issues found:\n")
                for issue in issues:
                    f.write(f"    - {issue}\n")
        
        logger.info("Final performance report generated", 
                   report_file=str(report_file),
                   summary_file=str(summary_file))


@click.command()
@click.option('--api-url', default='http://localhost:8000', help='API base URL')
@click.option('--results-dir', default='./performance_results', help='Results directory')
@click.option('--skip-load-tests', is_flag=True, help='Skip load testing')
@click.option('--skip-cache-tests', is_flag=True, help='Skip cache testing')
def main(api_url: str, results_dir: str, skip_load_tests: bool, skip_cache_tests: bool):
    """Run comprehensive performance tests."""
    
    async def run():
        tester = ComprehensivePerformanceTest(api_url, Path(results_dir))
        
        results = await tester.run_all_tests(
            include_load_tests=not skip_load_tests,
            include_cache_tests=not skip_cache_tests
        )
        
        print("\n" + "="*60)
        print("COMPREHENSIVE PERFORMANCE TESTING COMPLETED")
        print("="*60)
        print(f"Results saved to: {results_dir}")
        
        # Check overall status
        all_passed = True
        
        if "cache_tests" in results and results["cache_tests"]["status"] != "completed":
            all_passed = False
        
        if "load_tests" in results and results["load_tests"]["status"] != "completed":
            all_passed = False
        
        if "autoscaling_verification" in results and results["autoscaling_verification"]["status"] != "verified":
            all_passed = False
        
        if all_passed:
            print("✅ All performance tests completed successfully!")
            return 0
        else:
            print("❌ Some performance tests failed. Check the detailed reports.")
            return 1
    
    exit_code = asyncio.run(run())
    sys.exit(exit_code)


if __name__ == '__main__':
    main()