#!/usr/bin/env python3
"""
Comprehensive test runner for Python services.
Runs all tests with proper mocking for missing dependencies.
"""

import subprocess
import sys
from pathlib import Path


def run_tests():
    """Run comprehensive tests for all Python services."""
    
    print("🧪 Running Comprehensive Tests for Python Services")
    print("=" * 60)
    
    # Test configurations
    test_configs = [
        {
            "name": "Document Processing Service",
            "path": "app/services/document_processing/test_service.py",
            "description": "Tests document generation with mocked OpenAI responses"
        },
        {
            "name": "Document Processing Integration",
            "path": "app/services/document_processing/test_integration.py",
            "description": "Tests API endpoints and workflows"
        },
        {
            "name": "Analytics Service",
            "path": "app/services/analytics/test_comprehensive.py",
            "description": "Tests analytics calculations with sample data"
        },
        {
            "name": "Semantic Search Service", 
            "path": "app/services/semantic_search/test_comprehensive.py",
            "description": "Tests semantic search with sample embeddings"
        }
    ]
    
    results = []
    
    for config in test_configs:
        print(f"\n📋 Testing: {config['name']}")
        print(f"   {config['description']}")
        print("-" * 40)
        
        try:
            # Run pytest for this test file
            result = subprocess.run([
                sys.executable, "-m", "pytest", 
                config["path"],
                "-v", "--tb=short", "-x"
            ], capture_output=True, text=True, cwd=Path(__file__).parent)
            
            if result.returncode == 0:
                print(f"✅ {config['name']}: PASSED")
                # Count passed tests
                passed_count = result.stdout.count(" PASSED")
                print(f"   {passed_count} tests passed")
                results.append(("PASSED", config['name'], passed_count, 0))
            else:
                print(f"❌ {config['name']}: FAILED")
                failed_count = result.stdout.count(" FAILED")
                error_count = result.stdout.count(" ERROR")
                print(f"   {failed_count} tests failed, {error_count} errors")
                results.append(("FAILED", config['name'], 0, failed_count + error_count))
                
                # Show first few lines of error for debugging
                if result.stderr:
                    print("   Error details:")
                    print("   " + "\n   ".join(result.stderr.split("\n")[:5]))
                    
        except Exception as e:
            print(f"❌ {config['name']}: ERROR - {str(e)}")
            results.append(("ERROR", config['name'], 0, 1))
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    
    total_passed = 0
    total_failed = 0
    
    for status, name, passed, failed in results:
        status_icon = "✅" if status == "PASSED" else "❌"
        print(f"{status_icon} {name}: {passed} passed, {failed} failed")
        total_passed += passed
        total_failed += failed
    
    print("-" * 60)
    print(f"🎯 TOTAL: {total_passed} passed, {total_failed} failed")
    
    if total_failed == 0:
        print("\n🎉 All tests passed! The comprehensive test suite is working correctly.")
        print("\n✨ Key achievements:")
        print("   • Document generation with mocked OpenAI responses")
        print("   • Analytics calculations with sample data")
        print("   • Semantic search with sample embeddings")
        print("   • Error handling and service resilience")
        print("   • Performance requirements validation")
        return True
    else:
        print(f"\n⚠️  {total_failed} tests failed. Check the output above for details.")
        return False


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)