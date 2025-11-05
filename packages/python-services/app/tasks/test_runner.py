"""Test runner for background job processing tests."""

import asyncio
import sys
import time
from pathlib import Path

import pytest


def run_job_aggregation_tests():
    """Run job aggregation tests."""
    print("🔄 Running Job Aggregation Tests...")
    
    test_file = Path(__file__).parent / "test_job_aggregation.py"
    
    # Run pytest with specific configuration
    exit_code = pytest.main([
        str(test_file),
        "-v",
        "--tb=short",
        "--disable-warnings",
        "-x"  # Stop on first failure
    ])
    
    return exit_code == 0


def run_background_analytics_tests():
    """Run background analytics tests."""
    print("🔄 Running Background Analytics Tests...")
    
    test_file = Path(__file__).parent / "test_background_analytics.py"
    
    # Run pytest with specific configuration
    exit_code = pytest.main([
        str(test_file),
        "-v",
        "--tb=short",
        "--disable-warnings",
        "-x"  # Stop on first failure
    ])
    
    return exit_code == 0


def run_pipeline_manager_tests():
    """Run pipeline manager tests."""
    print("🔄 Running Pipeline Manager Tests...")
    
    test_file = Path(__file__).parent.parent / "management" / "test_job_pipeline_manager.py"
    
    # Run pytest with specific configuration
    exit_code = pytest.main([
        str(test_file),
        "-v",
        "--tb=short",
        "--disable-warnings",
        "-x"  # Stop on first failure
    ])
    
    return exit_code == 0


def run_all_background_job_tests():
    """Run all background job processing tests."""
    print("🚀 Starting Background Job Processing Test Suite")
    print("=" * 60)
    
    start_time = time.time()
    results = {}
    
    # Test configurations
    test_configs = [
        {
            "name": "Job Aggregation Tasks",
            "runner": run_job_aggregation_tests,
            "description": "Tests job aggregation with mocked external APIs"
        },
        {
            "name": "Background Analytics Tasks",
            "runner": run_background_analytics_tests,
            "description": "Tests analytics calculations and data processing"
        },
        {
            "name": "Pipeline Management",
            "runner": run_pipeline_manager_tests,
            "description": "Tests pipeline orchestration and monitoring"
        }
    ]
    
    # Run each test suite
    for config in test_configs:
        print(f"\n📋 Testing: {config['name']}")
        print(f"   {config['description']}")
        print("-" * 40)
        
        test_start = time.time()
        
        try:
            success = config["runner"]()
            test_duration = time.time() - test_start
            
            if success:
                print(f"✅ {config['name']} - PASSED ({test_duration:.2f}s)")
                results[config['name']] = {"status": "PASSED", "duration": test_duration}
            else:
                print(f"❌ {config['name']} - FAILED ({test_duration:.2f}s)")
                results[config['name']] = {"status": "FAILED", "duration": test_duration}
                
        except Exception as e:
            test_duration = time.time() - test_start
            print(f"💥 {config['name']} - ERROR: {str(e)} ({test_duration:.2f}s)")
            results[config['name']] = {"status": "ERROR", "duration": test_duration, "error": str(e)}
    
    # Print summary
    total_duration = time.time() - start_time
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    
    passed_count = sum(1 for r in results.values() if r["status"] == "PASSED")
    failed_count = sum(1 for r in results.values() if r["status"] == "FAILED")
    error_count = sum(1 for r in results.values() if r["status"] == "ERROR")
    
    for name, result in results.items():
        status_emoji = {
            "PASSED": "✅",
            "FAILED": "❌",
            "ERROR": "💥"
        }
        
        print(f"{status_emoji[result['status']]} {name}: {result['status']} ({result['duration']:.2f}s)")
        
        if "error" in result:
            print(f"   Error: {result['error']}")
    
    print(f"\nTotal Tests: {len(results)}")
    print(f"Passed: {passed_count}")
    print(f"Failed: {failed_count}")
    print(f"Errors: {error_count}")
    print(f"Total Duration: {total_duration:.2f}s")
    
    # Overall result
    if failed_count == 0 and error_count == 0:
        print("\n🎉 ALL TESTS PASSED!")
        return True
    else:
        print(f"\n⚠️  {failed_count + error_count} TEST SUITE(S) FAILED")
        return False


def run_specific_test_class(test_file: str, test_class: str):
    """Run a specific test class."""
    print(f"🔄 Running {test_class} from {test_file}...")
    
    # Run pytest with specific class
    exit_code = pytest.main([
        f"{test_file}::{test_class}",
        "-v",
        "--tb=short",
        "--disable-warnings"
    ])
    
    return exit_code == 0


def run_specific_test_method(test_file: str, test_class: str, test_method: str):
    """Run a specific test method."""
    print(f"🔄 Running {test_class}::{test_method} from {test_file}...")
    
    # Run pytest with specific method
    exit_code = pytest.main([
        f"{test_file}::{test_class}::{test_method}",
        "-v",
        "--tb=short",
        "--disable-warnings"
    ])
    
    return exit_code == 0


if __name__ == "__main__":
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "job-aggregation":
            success = run_job_aggregation_tests()
        elif command == "analytics":
            success = run_background_analytics_tests()
        elif command == "pipeline":
            success = run_pipeline_manager_tests()
        elif command == "class" and len(sys.argv) > 3:
            test_file = sys.argv[2]
            test_class = sys.argv[3]
            success = run_specific_test_class(test_file, test_class)
        elif command == "method" and len(sys.argv) > 4:
            test_file = sys.argv[2]
            test_class = sys.argv[3]
            test_method = sys.argv[4]
            success = run_specific_test_method(test_file, test_class, test_method)
        else:
            print("Usage: python test_runner.py <command> [args]")
            print("Commands:")
            print("  job-aggregation - Run job aggregation tests")
            print("  analytics - Run background analytics tests")
            print("  pipeline - Run pipeline manager tests")
            print("  class <file> <class> - Run specific test class")
            print("  method <file> <class> <method> - Run specific test method")
            sys.exit(1)
    else:
        success = run_all_background_job_tests()
    
    sys.exit(0 if success else 1)