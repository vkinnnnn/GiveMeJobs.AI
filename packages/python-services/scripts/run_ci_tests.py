#!/usr/bin/env python3
"""
CI/CD test runner script for local development and CI environments.
"""

import asyncio
import subprocess
import sys
import os
import json
import time
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
import argparse
import structlog

logger = structlog.get_logger(__name__)


@dataclass
class TestResult:
    """Test execution result."""
    name: str
    success: bool
    duration: float
    output: str
    error: Optional[str] = None


class CITestRunner:
    """CI/CD test runner for Python services."""
    
    def __init__(self, 
                 parallel: bool = False,
                 coverage_threshold: float = 85.0,
                 output_dir: Path = None):
        self.parallel = parallel
        self.coverage_threshold = coverage_threshold
        self.output_dir = output_dir or Path("test_results")
        self.output_dir.mkdir(exist_ok=True)
        self.results: List[TestResult] = []
    
    async def run_all_tests(self) -> bool:
        """Run all test suites in CI/CD pipeline order."""
        logger.info("Starting CI/CD test pipeline")
        
        # Test execution order (fail-fast approach)
        test_stages = [
            ("Code Quality", self._run_code_quality_checks),
            ("Security Scan", self._run_security_scans),
            ("Unit Tests", self._run_unit_tests),
            ("Integration Tests", self._run_integration_tests),
            ("Security Tests", self._run_security_tests),
            ("Performance Tests", self._run_performance_tests),
            ("E2E Tests", self._run_e2e_tests)
        ]
        
        overall_success = True
        
        for stage_name, stage_func in test_stages:
            logger.info(f"Running {stage_name}")
            
            try:
                success = await stage_func()
                if not success:
                    logger.error(f"{stage_name} failed")
                    overall_success = False
                    
                    # Fail fast for critical stages
                    if stage_name in ["Code Quality", "Unit Tests", "Security Tests"]:
                        logger.error(f"Critical stage {stage_name} failed, stopping pipeline")
                        break
                else:
                    logger.info(f"{stage_name} passed")
                    
            except Exception as e:
                logger.error(f"{stage_name} encountered error", error=str(e))
                overall_success = False
                break
        
        # Generate final report
        await self._generate_ci_report(overall_success)
        
        return overall_success
    
    async def _run_code_quality_checks(self) -> bool:
        """Run code quality checks."""
        checks = [
            ("Black formatting", ["black", "--check", "--diff", "app/", "tests/"]),
            ("isort imports", ["isort", "--check-only", "--diff", "app/", "tests/"]),
            ("flake8 linting", ["flake8", "app/", "tests/", "--max-line-length=100", "--extend-ignore=E203,W503"]),
            ("mypy type checking", ["mypy", "app/", "--ignore-missing-imports", "--no-strict-optional"])
        ]
        
        all_passed = True
        
        for check_name, command in checks:
            result = await self._run_command(check_name, command)
            if not result.success:
                all_passed = False
                logger.error(f"Code quality check failed: {check_name}")
        
        return all_passed
    
    async def _run_security_scans(self) -> bool:
        """Run security scans."""
        scans = [
            ("Bandit security scan", ["bandit", "-r", "app/", "-f", "json", "-o", str(self.output_dir / "bandit.json")]),
            ("Safety dependency scan", ["safety", "check", "--json", "--output", str(self.output_dir / "safety.json")]),
        ]
        
        # Try to install semgrep if available
        try:
            subprocess.run(["pip", "install", "semgrep"], check=True, capture_output=True)
            scans.append(("Semgrep security scan", ["semgrep", "--config=auto", "--json", f"--output={self.output_dir}/semgrep.json", "app/"]))
        except subprocess.CalledProcessError:
            logger.warning("Semgrep not available, skipping")
        
        # Security scans can have warnings but shouldn't fail the build
        scan_results = []
        
        for scan_name, command in scans:
            result = await self._run_command(scan_name, command, allow_failure=True)
            scan_results.append(result)
        
        # Check for critical security issues
        critical_issues = await self._check_critical_security_issues()
        
        return not critical_issues
    
    async def _check_critical_security_issues(self) -> bool:
        """Check for critical security issues in scan results."""
        critical_found = False
        
        # Check Bandit results
        bandit_file = self.output_dir / "bandit.json"
        if bandit_file.exists():
            try:
                with open(bandit_file, 'r') as f:
                    bandit_data = json.load(f)
                
                high_severity = [
                    issue for issue in bandit_data.get("results", [])
                    if issue.get("issue_severity") == "HIGH"
                ]
                
                if high_severity:
                    logger.error(f"Found {len(high_severity)} high-severity security issues")
                    critical_found = True
                    
            except Exception as e:
                logger.warning(f"Could not parse Bandit results: {e}")
        
        # Check Safety results
        safety_file = self.output_dir / "safety.json"
        if safety_file.exists():
            try:
                with open(safety_file, 'r') as f:
                    safety_data = json.load(f)
                
                if safety_data:  # Any vulnerabilities found
                    logger.error(f"Found {len(safety_data)} vulnerable dependencies")
                    critical_found = True
                    
            except Exception as e:
                logger.warning(f"Could not parse Safety results: {e}")
        
        return critical_found
    
    async def _run_unit_tests(self) -> bool:
        """Run unit tests with coverage."""
        command = [
            "pytest", "tests/unit/",
            "--cov=app",
            "--cov-report=xml",
            "--cov-report=html",
            "--cov-report=term-missing",
            f"--cov-fail-under={self.coverage_threshold}",
            "--junitxml=" + str(self.output_dir / "junit-unit.xml"),
            "-v"
        ]
        
        if self.parallel:
            command.extend(["--dist=loadscope", "--tx=auto"])
        
        result = await self._run_command("Unit Tests", command)
        return result.success
    
    async def _run_integration_tests(self) -> bool:
        """Run integration tests."""
        # Check if services are available
        services_available = await self._check_test_services()
        
        if not services_available:
            logger.warning("Test services not available, skipping integration tests")
            return True  # Don't fail if services aren't available
        
        command = [
            "pytest", "tests/integration/",
            "--cov=app",
            "--cov-append",
            "--junitxml=" + str(self.output_dir / "junit-integration.xml"),
            "-v"
        ]
        
        result = await self._run_command("Integration Tests", command)
        return result.success
    
    async def _run_security_tests(self) -> bool:
        """Run security tests."""
        # Check if services are available
        services_available = await self._check_test_services()
        
        if not services_available:
            logger.warning("Test services not available, running offline security tests only")
            command = [
                "pytest", "tests/security/test_vulnerability_scanning.py",
                "--junitxml=" + str(self.output_dir / "junit-security.xml"),
                "-v"
            ]
        else:
            command = [
                "pytest", "tests/security/",
                "--junitxml=" + str(self.output_dir / "junit-security.xml"),
                "-v"
            ]
        
        result = await self._run_command("Security Tests", command)
        return result.success
    
    async def _run_performance_tests(self) -> bool:
        """Run performance tests."""
        # Performance tests are optional in CI
        services_available = await self._check_test_services()
        
        if not services_available:
            logger.warning("Test services not available, skipping performance tests")
            return True
        
        command = [
            "pytest", "tests/performance/test_performance_regression.py",
            "--junitxml=" + str(self.output_dir / "junit-performance.xml"),
            "-v"
        ]
        
        result = await self._run_command("Performance Tests", command, allow_failure=True)
        
        # Performance tests can fail without failing the build
        if not result.success:
            logger.warning("Performance tests failed, but not blocking deployment")
        
        return True
    
    async def _run_e2e_tests(self) -> bool:
        """Run end-to-end tests."""
        # E2E tests require full environment
        if not os.getenv("RUN_E2E_TESTS"):
            logger.info("E2E tests skipped (set RUN_E2E_TESTS=1 to enable)")
            return True
        
        # Install Playwright if needed
        try:
            await self._run_command("Install Playwright", ["playwright", "install", "chromium"])
        except Exception:
            logger.warning("Could not install Playwright, skipping E2E tests")
            return True
        
        command = [
            "pytest", "tests/e2e/",
            "--junitxml=" + str(self.output_dir / "junit-e2e.xml"),
            "-v"
        ]
        
        result = await self._run_command("E2E Tests", command, allow_failure=True)
        
        # E2E tests can fail without failing the build in CI
        if not result.success:
            logger.warning("E2E tests failed, but not blocking deployment")
        
        return True
    
    async def _check_test_services(self) -> bool:
        """Check if test services (PostgreSQL, Redis) are available."""
        try:
            # Check PostgreSQL
            pg_result = await self._run_command(
                "Check PostgreSQL", 
                ["pg_isready", "-h", "localhost", "-p", "5432"],
                allow_failure=True
            )
            
            # Check Redis
            redis_result = await self._run_command(
                "Check Redis",
                ["redis-cli", "-h", "localhost", "-p", "6379", "ping"],
                allow_failure=True
            )
            
            return pg_result.success and redis_result.success
            
        except Exception:
            return False
    
    async def _run_command(self, 
                          name: str, 
                          command: List[str], 
                          allow_failure: bool = False) -> TestResult:
        """Run a command and capture results."""
        start_time = time.time()
        
        try:
            logger.info(f"Running: {name}")
            
            process = await asyncio.create_subprocess_exec(
                *command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
                cwd=Path.cwd()
            )
            
            stdout, _ = await process.communicate()
            duration = time.time() - start_time
            
            output = stdout.decode('utf-8') if stdout else ""
            success = process.returncode == 0 or allow_failure
            
            result = TestResult(
                name=name,
                success=success,
                duration=duration,
                output=output,
                error=None if success else f"Command failed with exit code {process.returncode}"
            )
            
            self.results.append(result)
            
            if not success and not allow_failure:
                logger.error(f"{name} failed", output=output[:500])
            else:
                logger.info(f"{name} completed", duration=f"{duration:.2f}s")
            
            return result
            
        except Exception as e:
            duration = time.time() - start_time
            error_msg = str(e)
            
            result = TestResult(
                name=name,
                success=False,
                duration=duration,
                output="",
                error=error_msg
            )
            
            self.results.append(result)
            logger.error(f"{name} failed with exception", error=error_msg)
            
            return result
    
    async def _generate_ci_report(self, overall_success: bool):
        """Generate CI/CD test report."""
        report = {
            "overall_success": overall_success,
            "total_tests": len(self.results),
            "passed_tests": len([r for r in self.results if r.success]),
            "failed_tests": len([r for r in self.results if not r.success]),
            "total_duration": sum(r.duration for r in self.results),
            "results": [
                {
                    "name": r.name,
                    "success": r.success,
                    "duration": r.duration,
                    "error": r.error
                }
                for r in self.results
            ],
            "timestamp": time.time()
        }
        
        # Save JSON report
        report_file = self.output_dir / "ci_report.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        # Generate summary
        logger.info("CI/CD Test Summary")
        logger.info(f"Overall Success: {overall_success}")
        logger.info(f"Total Tests: {report['total_tests']}")
        logger.info(f"Passed: {report['passed_tests']}")
        logger.info(f"Failed: {report['failed_tests']}")
        logger.info(f"Total Duration: {report['total_duration']:.2f}s")
        
        # Print failed tests
        failed_tests = [r for r in self.results if not r.success]
        if failed_tests:
            logger.error("Failed Tests:")
            for test in failed_tests:
                logger.error(f"  - {test.name}: {test.error}")


async def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(description="CI/CD Test Runner")
    parser.add_argument("--parallel", action="store_true", help="Run tests in parallel")
    parser.add_argument("--coverage-threshold", type=float, default=85.0, help="Coverage threshold")
    parser.add_argument("--output-dir", type=Path, help="Output directory for results")
    parser.add_argument("--stage", choices=["all", "quality", "security", "unit", "integration", "performance", "e2e"], 
                       default="all", help="Run specific test stage")
    
    args = parser.parse_args()
    
    runner = CITestRunner(
        parallel=args.parallel,
        coverage_threshold=args.coverage_threshold,
        output_dir=args.output_dir
    )
    
    if args.stage == "all":
        success = await runner.run_all_tests()
    else:
        # Run specific stage
        stage_methods = {
            "quality": runner._run_code_quality_checks,
            "security": runner._run_security_scans,
            "unit": runner._run_unit_tests,
            "integration": runner._run_integration_tests,
            "performance": runner._run_performance_tests,
            "e2e": runner._run_e2e_tests
        }
        
        success = await stage_methods[args.stage]()
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())