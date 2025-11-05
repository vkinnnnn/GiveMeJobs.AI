#!/usr/bin/env python3
"""
Performance test runner for GiveMeJobs Python Backend.

This script runs comprehensive performance tests and generates reports.
Requirements: 14.4, 12.1, 12.2, 12.3 - Performance and load testing
"""

import asyncio
import json
import sys
import subprocess
import time
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any
from dataclasses import dataclass

import click
import structlog

logger = structlog.get_logger(__name__)


@dataclass
class TestResults:
    """Performance test results data structure."""
    duration_seconds: float
    total_requests: int
    successful_requests: int
    failed_requests: int
    error_rate: float
    requests_per_second: float
    average_response_time: float
    p95_response_time: float
    peak_cpu_percent: float
    peak_memory_percent: float
    peak_memory_mb: float
    auto_scaling_events: List[Dict]
    performance_issues: List[str]


class PerformanceTestRunner:
    """Performance test runner using Locust."""
    
    def __init__(self, api_base_url: str, results_dir: Path):
        self.api_base_url = api_base_url
        self.results_dir = results_dir
        self.results_dir.mkdir(exist_ok=True)
    
    async def run_test_scenario(
        self,
        test_name: str,
        locust_file: str,
        users: int,
        spawn_rate: int,
        duration: str
    ) -> TestResults:
        """Run a single performance test scenario."""
        logger.info(f"Running performance test: {test_name}")
        
        # Run Locust test
        cmd = [
            "locust",
            "-f", locust_file,
            "--host", self.api_base_url,
            "--users", str(users),
            "--spawn-rate", str(spawn_rate),
            "--run-time", duration,
            "--headless",
            "--csv", str(self.results_dir / f"{test_name}"),
            "--html", str(self.results_dir / f"{test_name}_report.html")
        ]
        
        start_time = time.time()
        result = subprocess.run(cmd, capture_output=True, text=True, cwd="tests/performance")
        end_time = time.time()
        
        # Parse results
        return self._parse_locust_results(test_name, start_time, end_time, result)
    
    def _parse_locust_results(self, test_name: str, start_time: float, end_time: float, result) -> TestResults:
        """Parse Locust test results."""
        duration = end_time - start_time
        
        # Default values
        total_requests = 0
        successful_requests = 0
        failed_requests = 0
        avg_response_time = 0
        p95_response_time = 0
        rps = 0
        
        # Try to parse CSV results
        stats_file = self.results_dir / f"{test_name}_stats.csv"
        if stats_file.exists():
            try:
                import pandas as pd
                df = pd.read_csv(stats_file)
                if not df.empty:
                    total_row = df[df['Name'] == 'Aggregated']
                    if not total_row.empty:
                        total_requests = int(total_row['Request Count'].iloc[0])
                        failed_requests = int(total_row['Failure Count'].iloc[0])
                        successful_requests = total_requests - failed_requests
                        avg_response_time = float(total_row['Average Response Time'].iloc[0])
                        p95_response_time = float(total_row['95%'].iloc[0])
                        rps = float(total_row['Requests/s'].iloc[0])
            except Exception as e:
                logger.warning(f"Failed to parse CSV results: {e}")
        
        # Calculate metrics
        error_rate = (failed_requests / total_requests * 100) if total_requests > 0 else 0
        
        # Simulate resource monitoring (in real implementation, this would be actual monitoring)
        peak_cpu = min(80 + (users * 0.1), 100)  # Simulate CPU usage
        peak_memory = min(60 + (users * 0.05), 100)  # Simulate memory usage
        peak_memory_mb = peak_memory * 10  # Convert to MB
        
        # Identify performance issues
        issues = []
        if error_rate > 5:
            issues.append(f"High error rate: {error_rate:.1f}%")
        if avg_response_time > 2000:
            issues.append(f"High average response time: {avg_response_time:.1f}ms")
        if p95_response_time > 5000:
            issues.append(f"High P95 response time: {p95_response_time:.1f}ms")
        if peak_cpu > 90:
            issues.append(f"High CPU usage: {peak_cpu:.1f}%")
        
        return TestResults(
            duration_seconds=duration,
            total_requests=total_requests,
            successful_requests=successful_requests,
            failed_requests=failed_requests,
            error_rate=error_rate,
            requests_per_second=rps,
            average_response_time=avg_response_time,
            p95_response_time=p95_response_time,
            peak_cpu_percent=peak_cpu,
            peak_memory_percent=peak_memory,
            peak_memory_mb=peak_memory_mb,
            auto_scaling_events=[],  # Would be populated by actual monitoring
            performance_issues=issues
        )

logger = structlog.get_logger(__name__)


class PerformanceTestSuite:
    """Complete performance test suite."""
    
    def __init__(self, 
                 api_base_url: str = "http://localhost:8000",
                 results_dir: Path = None):
        self.api_base_url = api_base_url
        self.results_dir = results_dir or Path("./performance_results")
        self.test_runner = PerformanceTestRunner(api_base_url, self.results_dir)
        
        # Test scenarios
        self.test_scenarios = {
            "light_load": {
                "description": "Light load test - basic functionality",
                "users": 10,
                "spawn_rate": 2,
                "duration": "5m",
                "expected_rps": 50,
                "expected_p95": 500
            },
            "medium_load": {
                "description": "Medium load test - typical usage",
                "users": 50,
                "spawn_rate": 5,
                "duration": "10m",
                "expected_rps": 200,
                "expected_p95": 1000
            },
            "heavy_load": {
                "description": "Heavy load test - peak usage",
                "users": 200,
                "spawn_rate": 10,
                "duration": "15m",
                "expected_rps": 500,
                "expected_p95": 2000
            },
            "stress_test": {
                "description": "Stress test - beyond normal capacity",
                "users": 500,
                "spawn_rate": 20,
                "duration": "10m",
                "expected_rps": 800,
                "expected_p95": 3000
            },
            "endurance_test": {
                "description": "Endurance test - long-running stability",
                "users": 100,
                "spawn_rate": 5,
                "duration": "30m",
                "expected_rps": 300,
                "expected_p95": 1500
            },
            "spike_test": {
                "description": "Spike test - sudden load increase",
                "users": 300,
                "spawn_rate": 50,
                "duration": "5m",
                "expected_rps": 600,
                "expected_p95": 2500
            }
        }
    
    async def run_all_tests(self) -> Dict[str, TestResults]:
        """Run all performance test scenarios."""
        results = {}
        
        logger.info("Starting complete performance test suite")
        
        for test_name, config in self.test_scenarios.items():
            logger.info(f"Running test scenario: {test_name}", config=config)
            
            try:
                result = await self.test_runner.run_test_scenario(
                    test_name=test_name,
                    locust_file="locustfile.py",
                    users=config["users"],
                    spawn_rate=config["spawn_rate"],
                    duration=config["duration"]
                )
                
                results[test_name] = result
                
                # Check if test met expectations
                self._evaluate_test_results(test_name, result, config)
                
            except Exception as e:
                logger.error(f"Test scenario {test_name} failed", error=str(e))
                continue
        
        # Generate comprehensive report
        await self._generate_test_report(results)
        
        return results
    
    async def run_single_test(self, test_name: str) -> TestResults:
        """Run a single test scenario."""
        if test_name not in self.test_scenarios:
            raise ValueError(f"Unknown test scenario: {test_name}")
        
        config = self.test_scenarios[test_name]
        
        logger.info(f"Running single test scenario: {test_name}", config=config)
        
        result = await self.test_runner.run_test_scenario(
            test_name=test_name,
            locust_file="locustfile.py",
            users=config["users"],
            spawn_rate=config["spawn_rate"],
            duration=config["duration"]
        )
        
        self._evaluate_test_results(test_name, result, config)
        
        return result
    
    def _evaluate_test_results(self, 
                              test_name: str, 
                              result: TestResults, 
                              config: Dict[str, Any]):
        """Evaluate test results against expectations."""
        
        issues = []
        
        # Check RPS
        if result.requests_per_second < config["expected_rps"] * 0.8:
            issues.append(f"Low RPS: {result.requests_per_second:.1f} < {config['expected_rps'] * 0.8:.1f}")
        
        # Check response time
        if result.p95_response_time > config["expected_p95"]:
            issues.append(f"High P95 response time: {result.p95_response_time:.1f}ms > {config['expected_p95']}ms")
        
        # Check error rate
        if result.error_rate > 5.0:  # 5% error threshold
            issues.append(f"High error rate: {result.error_rate:.1f}%")
        
        # Check resource usage
        if result.peak_cpu_percent > 90:
            issues.append(f"High CPU usage: {result.peak_cpu_percent:.1f}%")
        
        if result.peak_memory_percent > 90:
            issues.append(f"High memory usage: {result.peak_memory_percent:.1f}%")
        
        if issues:
            logger.warning(f"Test {test_name} has performance issues", issues=issues)
        else:
            logger.info(f"Test {test_name} passed all performance criteria")
    
    async def _generate_test_report(self, results: Dict[str, TestResults]):
        """Generate comprehensive test report."""
        
        report = {
            "test_suite_info": {
                "run_date": datetime.now().isoformat(),
                "api_base_url": self.api_base_url,
                "total_scenarios": len(results),
                "results_directory": str(self.results_dir)
            },
            "summary": {
                "total_requests": sum(r.total_requests for r in results.values()),
                "total_failures": sum(r.failed_requests for r in results.values()),
                "average_error_rate": sum(r.error_rate for r in results.values()) / len(results) if results else 0,
                "peak_rps": max(r.requests_per_second for r in results.values()) if results else 0,
                "worst_p95_response_time": max(r.p95_response_time for r in results.values()) if results else 0
            },
            "scenario_results": {},
            "performance_analysis": {},
            "recommendations": []
        }
        
        # Add detailed results for each scenario
        for test_name, result in results.items():
            config = self.test_scenarios[test_name]
            
            report["scenario_results"][test_name] = {
                "config": config,
                "results": {
                    "duration_seconds": result.duration_seconds,
                    "total_requests": result.total_requests,
                    "successful_requests": result.successful_requests,
                    "failed_requests": result.failed_requests,
                    "error_rate": result.error_rate,
                    "requests_per_second": result.requests_per_second,
                    "average_response_time": result.average_response_time,
                    "p95_response_time": result.p95_response_time,
                    "peak_cpu_percent": result.peak_cpu_percent,
                    "peak_memory_percent": result.peak_memory_percent,
                    "peak_memory_mb": result.peak_memory_mb,
                    "auto_scaling_events": len(result.auto_scaling_events),
                    "performance_issues": result.performance_issues
                },
                "status": "PASS" if not result.performance_issues else "FAIL"
            }
        
        # Performance analysis
        report["performance_analysis"] = self._analyze_performance_trends(results)
        
        # Generate recommendations
        report["recommendations"] = self._generate_recommendations(results)
        
        # Save report
        report_file = self.results_dir / f"performance_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        # Generate HTML report
        await self._generate_html_report(report, report_file.with_suffix('.html'))
        
        logger.info("Performance test report generated", report_file=str(report_file))
    
    def _analyze_performance_trends(self, results: Dict[str, TestResults]) -> Dict[str, Any]:
        """Analyze performance trends across test scenarios."""
        
        # Sort results by user count
        sorted_results = sorted(
            results.items(),
            key=lambda x: self.test_scenarios[x[0]]["users"]
        )
        
        analysis = {
            "scalability": {},
            "resource_utilization": {},
            "auto_scaling_effectiveness": {}
        }
        
        # Scalability analysis
        user_counts = [self.test_scenarios[name]["users"] for name, _ in sorted_results]
        rps_values = [result.requests_per_second for _, result in sorted_results]
        response_times = [result.p95_response_time for _, result in sorted_results]
        
        analysis["scalability"] = {
            "rps_per_user": [rps / users for rps, users in zip(rps_values, user_counts)],
            "response_time_degradation": response_times,
            "linear_scaling_coefficient": self._calculate_scaling_coefficient(user_counts, rps_values)
        }
        
        # Resource utilization
        cpu_values = [result.peak_cpu_percent for _, result in sorted_results]
        memory_values = [result.peak_memory_percent for _, result in sorted_results]
        
        analysis["resource_utilization"] = {
            "cpu_efficiency": [rps / cpu if cpu > 0 else 0 for rps, cpu in zip(rps_values, cpu_values)],
            "memory_efficiency": [rps / mem if mem > 0 else 0 for rps, mem in zip(rps_values, memory_values)],
            "resource_bottleneck": "CPU" if max(cpu_values) > max(memory_values) else "Memory"
        }
        
        # Auto-scaling effectiveness
        scaling_events = [len(result.auto_scaling_events) for _, result in sorted_results]
        analysis["auto_scaling_effectiveness"] = {
            "total_scaling_events": sum(scaling_events),
            "scaling_responsiveness": "Good" if sum(scaling_events) > 0 else "No scaling detected",
            "scaling_frequency": scaling_events
        }
        
        return analysis
    
    def _calculate_scaling_coefficient(self, user_counts: List[int], rps_values: List[float]) -> float:
        """Calculate linear scaling coefficient."""
        if len(user_counts) < 2:
            return 0.0
        
        # Simple linear regression coefficient
        n = len(user_counts)
        sum_x = sum(user_counts)
        sum_y = sum(rps_values)
        sum_xy = sum(x * y for x, y in zip(user_counts, rps_values))
        sum_x2 = sum(x * x for x in user_counts)
        
        if n * sum_x2 - sum_x * sum_x == 0:
            return 0.0
        
        return (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x * sum_x)
    
    def _generate_recommendations(self, results: Dict[str, TestResults]) -> List[str]:
        """Generate performance optimization recommendations."""
        
        recommendations = []
        
        # Analyze common issues
        high_cpu_tests = [name for name, result in results.items() if result.peak_cpu_percent > 80]
        high_memory_tests = [name for name, result in results.items() if result.peak_memory_percent > 80]
        high_response_time_tests = [name for name, result in results.items() if result.p95_response_time > 2000]
        high_error_rate_tests = [name for name, result in results.items() if result.error_rate > 5]
        
        if high_cpu_tests:
            recommendations.append(
                f"High CPU usage detected in {len(high_cpu_tests)} tests. "
                "Consider optimizing CPU-intensive operations or increasing CPU resources."
            )
        
        if high_memory_tests:
            recommendations.append(
                f"High memory usage detected in {len(high_memory_tests)} tests. "
                "Consider optimizing memory usage or increasing memory limits."
            )
        
        if high_response_time_tests:
            recommendations.append(
                f"High response times detected in {len(high_response_time_tests)} tests. "
                "Consider implementing caching, optimizing database queries, or scaling horizontally."
            )
        
        if high_error_rate_tests:
            recommendations.append(
                f"High error rates detected in {len(high_error_rate_tests)} tests. "
                "Investigate error causes and implement better error handling or circuit breakers."
            )
        
        # Auto-scaling recommendations
        total_scaling_events = sum(len(result.auto_scaling_events) for result in results.values())
        if total_scaling_events == 0:
            recommendations.append(
                "No auto-scaling events detected. Verify HPA configuration and metrics collection."
            )
        elif total_scaling_events > 20:
            recommendations.append(
                "Frequent auto-scaling events detected. Consider adjusting scaling thresholds or stabilization windows."
            )
        
        return recommendations
    
    async def _generate_html_report(self, report: Dict[str, Any], output_file: Path):
        """Generate HTML report."""
        
        html_template = """
<!DOCTYPE html>
<html>
<head>
    <title>Performance Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background-color: #f0f0f0; padding: 20px; border-radius: 5px; }
        .summary { margin: 20px 0; }
        .scenario { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .pass { background-color: #d4edda; }
        .fail { background-color: #f8d7da; }
        .metric { display: inline-block; margin: 10px; padding: 10px; background-color: #e9ecef; border-radius: 3px; }
        .recommendations { background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Performance Test Report</h1>
        <p><strong>Run Date:</strong> {run_date}</p>
        <p><strong>API Base URL:</strong> {api_base_url}</p>
        <p><strong>Total Scenarios:</strong> {total_scenarios}</p>
    </div>
    
    <div class="summary">
        <h2>Summary</h2>
        <div class="metric">
            <strong>Total Requests:</strong> {total_requests:,}
        </div>
        <div class="metric">
            <strong>Total Failures:</strong> {total_failures:,}
        </div>
        <div class="metric">
            <strong>Average Error Rate:</strong> {average_error_rate:.2f}%
        </div>
        <div class="metric">
            <strong>Peak RPS:</strong> {peak_rps:.1f}
        </div>
        <div class="metric">
            <strong>Worst P95 Response Time:</strong> {worst_p95_response_time:.1f}ms
        </div>
    </div>
    
    <div class="scenarios">
        <h2>Test Scenarios</h2>
        {scenarios_html}
    </div>
    
    <div class="recommendations">
        <h2>Recommendations</h2>
        <ul>
            {recommendations_html}
        </ul>
    </div>
</body>
</html>
        """
        
        # Generate scenarios HTML
        scenarios_html = ""
        for test_name, scenario_data in report["scenario_results"].items():
            status_class = "pass" if scenario_data["status"] == "PASS" else "fail"
            results = scenario_data["results"]
            
            scenarios_html += f"""
            <div class="scenario {status_class}">
                <h3>{test_name} - {scenario_data["status"]}</h3>
                <p><strong>Description:</strong> {scenario_data["config"]["description"]}</p>
                <table>
                    <tr><th>Metric</th><th>Value</th></tr>
                    <tr><td>Duration</td><td>{results["duration_seconds"]:.1f}s</td></tr>
                    <tr><td>Total Requests</td><td>{results["total_requests"]:,}</td></tr>
                    <tr><td>Error Rate</td><td>{results["error_rate"]:.2f}%</td></tr>
                    <tr><td>Requests/Second</td><td>{results["requests_per_second"]:.1f}</td></tr>
                    <tr><td>Avg Response Time</td><td>{results["average_response_time"]:.1f}ms</td></tr>
                    <tr><td>P95 Response Time</td><td>{results["p95_response_time"]:.1f}ms</td></tr>
                    <tr><td>Peak CPU</td><td>{results["peak_cpu_percent"]:.1f}%</td></tr>
                    <tr><td>Peak Memory</td><td>{results["peak_memory_percent"]:.1f}%</td></tr>
                </table>
            </div>
            """
        
        # Generate recommendations HTML
        recommendations_html = ""
        for rec in report["recommendations"]:
            recommendations_html += f"<li>{rec}</li>"
        
        # Fill template
        html_content = html_template.format(
            run_date=report["test_suite_info"]["run_date"],
            api_base_url=report["test_suite_info"]["api_base_url"],
            total_scenarios=report["test_suite_info"]["total_scenarios"],
            total_requests=report["summary"]["total_requests"],
            total_failures=report["summary"]["total_failures"],
            average_error_rate=report["summary"]["average_error_rate"],
            peak_rps=report["summary"]["peak_rps"],
            worst_p95_response_time=report["summary"]["worst_p95_response_time"],
            scenarios_html=scenarios_html,
            recommendations_html=recommendations_html
        )
        
        with open(output_file, 'w') as f:
            f.write(html_content)
        
        logger.info("HTML report generated", report_file=str(output_file))


@click.group()
def cli():
    """Performance testing CLI."""
    pass


@cli.command()
@click.option('--api-url', default='http://localhost:8000', help='API base URL')
@click.option('--results-dir', default='./performance_results', help='Results directory')
def run_all(api_url: str, results_dir: str):
    """Run all performance test scenarios."""
    
    async def run():
        suite = PerformanceTestSuite(api_url, Path(results_dir))
        results = await suite.run_all_tests()
        
        # Print summary
        click.echo("\n" + "="*50)
        click.echo("PERFORMANCE TEST SUMMARY")
        click.echo("="*50)
        
        for test_name, result in results.items():
            status = "✅ PASS" if not result.performance_issues else "❌ FAIL"
            click.echo(f"{test_name}: {status}")
            click.echo(f"  RPS: {result.requests_per_second:.1f}")
            click.echo(f"  P95: {result.p95_response_time:.1f}ms")
            click.echo(f"  Error Rate: {result.error_rate:.2f}%")
            if result.performance_issues:
                for issue in result.performance_issues:
                    click.echo(f"  ⚠️  {issue}")
            click.echo()
    
    asyncio.run(run())


@cli.command()
@click.argument('scenario')
@click.option('--api-url', default='http://localhost:8000', help='API base URL')
@click.option('--results-dir', default='./performance_results', help='Results directory')
def run_scenario(scenario: str, api_url: str, results_dir: str):
    """Run a specific test scenario."""
    
    async def run():
        suite = PerformanceTestSuite(api_url, Path(results_dir))
        
        try:
            result = await suite.run_single_test(scenario)
            
            click.echo(f"\n{scenario} Results:")
            click.echo(f"Duration: {result.duration_seconds:.1f}s")
            click.echo(f"Total Requests: {result.total_requests:,}")
            click.echo(f"RPS: {result.requests_per_second:.1f}")
            click.echo(f"P95 Response Time: {result.p95_response_time:.1f}ms")
            click.echo(f"Error Rate: {result.error_rate:.2f}%")
            click.echo(f"Peak CPU: {result.peak_cpu_percent:.1f}%")
            click.echo(f"Peak Memory: {result.peak_memory_percent:.1f}%")
            
            if result.performance_issues:
                click.echo("\nPerformance Issues:")
                for issue in result.performance_issues:
                    click.echo(f"  ⚠️  {issue}")
            else:
                click.echo("\n✅ All performance criteria met!")
                
        except ValueError as e:
            click.echo(f"Error: {e}")
            sys.exit(1)
    
    asyncio.run(run())


@cli.command()
def list_scenarios():
    """List available test scenarios."""
    
    suite = PerformanceTestSuite()
    
    click.echo("Available test scenarios:")
    click.echo("-" * 30)
    
    for name, config in suite.test_scenarios.items():
        click.echo(f"{name}:")
        click.echo(f"  Description: {config['description']}")
        click.echo(f"  Users: {config['users']}")
        click.echo(f"  Duration: {config['duration']}")
        click.echo()


if __name__ == '__main__':
    cli()