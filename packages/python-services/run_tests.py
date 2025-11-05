"""
Comprehensive test runner for the Python services.

This script provides various test execution modes including unit tests,
integration tests, performance tests, and coverage reporting.
"""

import argparse
import asyncio
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import List, Optional


class TestRunner:
    """Test runner with various execution modes."""
    
    def __init__(self):
        self.project_root = Path(__file__).parent
        self.test_dir = self.project_root / "tests"
        
    def run_command(self, command: List[str], capture_output: bool = False) -> subprocess.CompletedProcess:
        """Run a command and return the result."""
        print(f"Running: {' '.join(command)}")
        
        result = subprocess.run(
            command,
            cwd=self.project_root,
            capture_output=capture_output,
            text=True
        )
        
        if result.returncode != 0 and not capture_output:
            print(f"Command failed with exit code {result.returncode}")
            if result.stderr:
                print(f"Error: {result.stderr}")
        
        return result
    
    def run_unit_tests(self, verbose: bool = False, coverage: bool = True) -> bool:
        """Run unit tests."""
        print("🧪 Running Unit Tests")
        print("=" * 50)
        
        command = ["python", "-m", "pytest", "tests/unit/"]
        
        if verbose:
            command.append("-v")
        
        if coverage:
            command.extend([
                "--cov=app",
                "--cov-report=term-missing",
                "--cov-report=html:htmlcov",
                "--cov-fail-under=85"
            ])
        
        command.extend([
            "--tb=short",
            "-m", "unit"
        ])
        
        result = self.run_command(command)
        return result.returncode == 0
    
    def run_integration_tests(self, verbose: bool = False) -> bool:
        """Run integration tests."""
        print("🔗 Running Integration Tests")
        print("=" * 50)
        
        command = ["python", "-m", "pytest", "tests/integration/"]
        
        if verbose:
            command.append("-v")
        
        command.extend([
            "--tb=short",
            "-m", "integration"
        ])
        
        result = self.run_command(command)
        return result.returncode == 0
    
    def run_security_tests(self, verbose: bool = False) -> bool:
        """Run security tests."""
        print("🔒 Running Security Tests")
        print("=" * 50)
        
        command = ["python", "-m", "pytest", "tests/"]
        
        if verbose:
            command.append("-v")
        
        command.extend([
            "--tb=short",
            "-m", "security"
        ])
        
        result = self.run_command(command)
        return result.returncode == 0
    
    def run_performance_tests(self, verbose: bool = False) -> bool:
        """Run performance tests."""
        print("⚡ Running Performance Tests")
        print("=" * 50)
        
        command = ["python", "-m", "pytest", "tests/"]
        
        if verbose:
            command.append("-v")
        
        command.extend([
            "--tb=short",
            "-m", "performance",
            "--durations=0"  # Show all test durations
        ])
        
        result = self.run_command(command)
        return result.returncode == 0
    
    def run_all_tests(self, verbose: bool = False, coverage: bool = True) -> bool:
        """Run all tests."""
        print("🚀 Running All Tests")
        print("=" * 50)
        
        command = ["python", "-m", "pytest", "tests/"]
        
        if verbose:
            command.append("-v")
        
        if coverage:
            command.extend([
                "--cov=app",
                "--cov-report=term-missing",
                "--cov-report=html:htmlcov",
                "--cov-report=xml",
                "--cov-fail-under=85"
            ])
        
        command.extend([
            "--tb=short",
            "--durations=10"
        ])
        
        result = self.run_command(command)
        return result.returncode == 0
    
    def run_specific_test(self, test_path: str, verbose: bool = False) -> bool:
        """Run a specific test file or test function."""
        print(f"🎯 Running Specific Test: {test_path}")
        print("=" * 50)
        
        command = ["python", "-m", "pytest", test_path]
        
        if verbose:
            command.append("-v")
        
        command.extend(["--tb=short"])
        
        result = self.run_command(command)
        return result.returncode == 0
    
    def run_failed_tests(self, verbose: bool = False) -> bool:
        """Run only previously failed tests."""
        print("🔄 Running Failed Tests")
        print("=" * 50)
        
        command = ["python", "-m", "pytest", "--lf"]  # --last-failed
        
        if verbose:
            command.append("-v")
        
        command.extend(["--tb=short"])
        
        result = self.run_command(command)
        return result.returncode == 0
    
    def run_code_quality_checks(self) -> bool:
        """Run code quality checks."""
        print("✨ Running Code Quality Checks")
        print("=" * 50)
        
        checks = [
            (["python", "-m", "black", "--check", "app/", "tests/"], "Black formatting"),
            (["python", "-m", "isort", "--check-only", "app/", "tests/"], "Import sorting"),
            (["python", "-m", "flake8", "app/", "tests/"], "Flake8 linting"),
            (["python", "-m", "mypy", "app/"], "MyPy type checking"),
        ]
        
        all_passed = True
        
        for command, check_name in checks:
            print(f"\n📋 {check_name}")
            print("-" * 30)
            
            result = self.run_command(command)
            if result.returncode != 0:
                all_passed = False
                print(f"❌ {check_name} failed")
            else:
                print(f"✅ {check_name} passed")
        
        return all_passed
    
    def run_security_scans(self) -> bool:
        """Run security scans."""
        print("🔐 Running Security Scans")
        print("=" * 50)
        
        scans = [
            (["python", "-m", "bandit", "-r", "app/"], "Bandit security scan"),
            (["python", "-m", "safety", "check"], "Safety dependency scan"),
        ]
        
        all_passed = True
        
        for command, scan_name in scans:
            print(f"\n🔍 {scan_name}")
            print("-" * 30)
            
            result = self.run_command(command)
            if result.returncode != 0:
                print(f"⚠️  {scan_name} found issues")
                # Don't fail on security scans, just warn
            else:
                print(f"✅ {scan_name} passed")
        
        return all_passed
    
    def generate_coverage_report(self) -> bool:
        """Generate detailed coverage report."""
        print("📊 Generating Coverage Report")
        print("=" * 50)
        
        # Run tests with coverage
        command = [
            "python", "-m", "pytest", "tests/",
            "--cov=app",
            "--cov-report=html:htmlcov",
            "--cov-report=xml",
            "--cov-report=term-missing",
            "--cov-fail-under=85"
        ]
        
        result = self.run_command(command)
        
        if result.returncode == 0:
            print("\n📈 Coverage report generated:")
            print(f"  HTML: {self.project_root}/htmlcov/index.html")
            print(f"  XML:  {self.project_root}/coverage.xml")
        
        return result.returncode == 0
    
    def run_test_discovery(self) -> bool:
        """Run test discovery to check for test collection issues."""
        print("🔍 Running Test Discovery")
        print("=" * 50)
        
        command = ["python", "-m", "pytest", "--collect-only", "-q"]
        
        result = self.run_command(command, capture_output=True)
        
        if result.returncode == 0:
            print("✅ Test discovery successful")
            print(f"Output:\n{result.stdout}")
        else:
            print("❌ Test discovery failed")
            print(f"Error:\n{result.stderr}")
        
        return result.returncode == 0
    
    def run_parallel_tests(self, num_workers: int = 4) -> bool:
        """Run tests in parallel using pytest-xdist."""
        print(f"⚡ Running Tests in Parallel ({num_workers} workers)")
        print("=" * 50)
        
        try:
            import pytest_xdist
        except ImportError:
            print("❌ pytest-xdist not installed. Install with: pip install pytest-xdist")
            return False
        
        command = [
            "python", "-m", "pytest", "tests/",
            f"-n{num_workers}",
            "--cov=app",
            "--cov-report=term-missing",
            "--tb=short"
        ]
        
        result = self.run_command(command)
        return result.returncode == 0
    
    def cleanup_test_artifacts(self):
        """Clean up test artifacts."""
        print("🧹 Cleaning up test artifacts")
        print("=" * 30)
        
        artifacts = [
            ".pytest_cache",
            "__pycache__",
            "htmlcov",
            "coverage.xml",
            ".coverage",
            "test_results.xml"
        ]
        
        for artifact in artifacts:
            artifact_path = self.project_root / artifact
            if artifact_path.exists():
                if artifact_path.is_dir():
                    import shutil
                    shutil.rmtree(artifact_path)
                else:
                    artifact_path.unlink()
                print(f"  Removed: {artifact}")
        
        print("✅ Cleanup completed")


def main():
    """Main entry point for test runner."""
    parser = argparse.ArgumentParser(description="Comprehensive test runner for Python services")
    
    parser.add_argument(
        "mode",
        choices=[
            "unit", "integration", "security", "performance", "all",
            "quality", "scans", "coverage", "discovery", "parallel",
            "failed", "cleanup", "specific"
        ],
        help="Test execution mode"
    )
    
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Verbose output"
    )
    
    parser.add_argument(
        "--no-coverage",
        action="store_true",
        help="Disable coverage reporting"
    )
    
    parser.add_argument(
        "--workers", "-w",
        type=int,
        default=4,
        help="Number of parallel workers (for parallel mode)"
    )
    
    parser.add_argument(
        "--test-path",
        type=str,
        help="Specific test path (for specific mode)"
    )
    
    args = parser.parse_args()
    
    runner = TestRunner()
    
    start_time = time.time()
    success = False
    
    try:
        if args.mode == "unit":
            success = runner.run_unit_tests(args.verbose, not args.no_coverage)
        elif args.mode == "integration":
            success = runner.run_integration_tests(args.verbose)
        elif args.mode == "security":
            success = runner.run_security_tests(args.verbose)
        elif args.mode == "performance":
            success = runner.run_performance_tests(args.verbose)
        elif args.mode == "all":
            success = runner.run_all_tests(args.verbose, not args.no_coverage)
        elif args.mode == "quality":
            success = runner.run_code_quality_checks()
        elif args.mode == "scans":
            success = runner.run_security_scans()
        elif args.mode == "coverage":
            success = runner.generate_coverage_report()
        elif args.mode == "discovery":
            success = runner.run_test_discovery()
        elif args.mode == "parallel":
            success = runner.run_parallel_tests(args.workers)
        elif args.mode == "failed":
            success = runner.run_failed_tests(args.verbose)
        elif args.mode == "cleanup":
            runner.cleanup_test_artifacts()
            success = True
        elif args.mode == "specific":
            if not args.test_path:
                print("❌ --test-path required for specific mode")
                sys.exit(1)
            success = runner.run_specific_test(args.test_path, args.verbose)
        
        duration = time.time() - start_time
        
        print(f"\n{'='*50}")
        if success:
            print(f"✅ Tests completed successfully in {duration:.2f}s")
        else:
            print(f"❌ Tests failed after {duration:.2f}s")
        print(f"{'='*50}")
        
    except KeyboardInterrupt:
        print("\n⚠️  Tests interrupted by user")
        success = False
    except Exception as e:
        print(f"\n❌ Test runner error: {e}")
        success = False
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()