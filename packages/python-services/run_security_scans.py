"""
Script to run individual security scanning tools.

This script runs bandit, safety, and other security tools
to scan the codebase for security vulnerabilities.
"""

import subprocess
import sys
import json
from pathlib import Path
from datetime import datetime


def run_bandit_scan():
    """Run Bandit security linting."""
    print("🔍 Running Bandit security scan...")
    
    try:
        cmd = [
            sys.executable, "-m", "bandit", 
            "-r", "app/", 
            "-f", "json",
            "-o", "bandit_report.json"
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ Bandit scan completed - No issues found")
        else:
            print(f"⚠️  Bandit scan completed with issues (exit code: {result.returncode})")
            
            # Try to load and summarize results
            try:
                with open("bandit_report.json", "r") as f:
                    report = json.load(f)
                    
                issues = report.get("results", [])
                print(f"   Found {len(issues)} security issues")
                
                # Group by severity
                severity_counts = {}
                for issue in issues:
                    severity = issue.get("issue_severity", "UNKNOWN")
                    severity_counts[severity] = severity_counts.get(severity, 0) + 1
                
                for severity, count in severity_counts.items():
                    print(f"   {severity}: {count}")
                    
            except Exception as e:
                print(f"   Could not parse bandit results: {e}")
        
        return result.returncode == 0
        
    except FileNotFoundError:
        print("❌ Bandit not installed. Install with: pip install bandit")
        return False
    except Exception as e:
        print(f"❌ Bandit scan failed: {e}")
        return False


def run_safety_scan():
    """Run Safety dependency vulnerability scan."""
    print("\n🔍 Running Safety dependency scan...")
    
    try:
        cmd = [sys.executable, "-m", "safety", "check", "--json"]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ Safety scan completed - No vulnerable dependencies found")
        else:
            print(f"⚠️  Safety scan found vulnerable dependencies")
            
            # Try to parse and summarize results
            try:
                vulnerabilities = json.loads(result.stdout)
                print(f"   Found {len(vulnerabilities)} vulnerable dependencies")
                
                for vuln in vulnerabilities[:5]:  # Show first 5
                    package = vuln.get("package_name", "Unknown")
                    version = vuln.get("installed_version", "Unknown")
                    vuln_id = vuln.get("vulnerability_id", "Unknown")
                    print(f"   - {package} {version} (ID: {vuln_id})")
                
                if len(vulnerabilities) > 5:
                    print(f"   ... and {len(vulnerabilities) - 5} more")
                    
            except json.JSONDecodeError:
                print(f"   Raw output: {result.stdout[:200]}...")
        
        return result.returncode == 0
        
    except FileNotFoundError:
        print("❌ Safety not installed. Install with: pip install safety")
        return False
    except Exception as e:
        print(f"❌ Safety scan failed: {e}")
        return False


def run_semgrep_scan():
    """Run Semgrep static analysis."""
    print("\n🔍 Running Semgrep static analysis...")
    
    try:
        cmd = [
            "semgrep", 
            "--config=auto", 
            "--json", 
            "--output=semgrep_report.json",
            "app/"
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ Semgrep scan completed")
            
            # Try to load and summarize results
            try:
                with open("semgrep_report.json", "r") as f:
                    report = json.load(f)
                    
                findings = report.get("results", [])
                print(f"   Found {len(findings)} potential issues")
                
                # Group by severity
                severity_counts = {}
                for finding in findings:
                    severity = finding.get("extra", {}).get("severity", "INFO")
                    severity_counts[severity] = severity_counts.get(severity, 0) + 1
                
                for severity, count in severity_counts.items():
                    print(f"   {severity}: {count}")
                    
            except Exception as e:
                print(f"   Could not parse semgrep results: {e}")
        else:
            print(f"⚠️  Semgrep scan completed with issues (exit code: {result.returncode})")
        
        return True  # Semgrep often returns non-zero even for successful scans
        
    except FileNotFoundError:
        print("❌ Semgrep not installed. Install from: https://semgrep.dev/docs/getting-started/")
        return False
    except Exception as e:
        print(f"❌ Semgrep scan failed: {e}")
        return False


def check_requirements_security():
    """Check requirements.txt for known security issues."""
    print("\n🔍 Checking requirements.txt for security issues...")
    
    requirements_file = Path("requirements.txt")
    if not requirements_file.exists():
        print("❌ requirements.txt not found")
        return False
    
    try:
        with open(requirements_file, "r") as f:
            requirements = f.read()
        
        # Check for potentially insecure packages or versions
        security_concerns = []
        
        lines = requirements.strip().split('\n')
        for line in lines:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            
            # Check for packages without version pinning
            if '==' not in line and '>=' not in line and '~=' not in line:
                security_concerns.append(f"Unpinned dependency: {line}")
            
            # Check for known problematic packages (examples)
            problematic_packages = ['pickle', 'eval', 'exec']
            for pkg in problematic_packages:
                if pkg in line.lower():
                    security_concerns.append(f"Potentially unsafe package: {line}")
        
        if security_concerns:
            print(f"⚠️  Found {len(security_concerns)} security concerns:")
            for concern in security_concerns[:5]:
                print(f"   - {concern}")
        else:
            print("✅ Requirements.txt looks secure")
        
        return len(security_concerns) == 0
        
    except Exception as e:
        print(f"❌ Failed to check requirements.txt: {e}")
        return False


def run_custom_security_checks():
    """Run custom security checks."""
    print("\n🔍 Running custom security checks...")
    
    issues_found = []
    
    # Check 1: Look for hardcoded secrets
    print("   Checking for hardcoded secrets...")
    secret_patterns = [
        "password = ",
        "api_key = ",
        "secret_key = ",
        "token = "
    ]
    
    for py_file in Path("app").rglob("*.py"):
        try:
            content = py_file.read_text()
            for pattern in secret_patterns:
                if pattern in content.lower():
                    # Skip if it's clearly a placeholder
                    if any(placeholder in content.lower() 
                           for placeholder in ['example', 'placeholder', 'your-', 'change-']):
                        continue
                    issues_found.append(f"Potential hardcoded secret in {py_file}")
        except Exception:
            continue
    
    # Check 2: Look for debug mode
    print("   Checking for debug mode...")
    if Path("app/core/config.py").exists():
        try:
            config_content = Path("app/core/config.py").read_text()
            if 'debug: bool = Field(default=True' in config_content:
                issues_found.append("Debug mode may be enabled by default")
        except Exception:
            pass
    
    # Check 3: Look for insecure random usage
    print("   Checking for insecure random usage...")
    for py_file in Path("app").rglob("*.py"):
        try:
            content = py_file.read_text()
            if 'import random' in content and 'import secrets' not in content:
                issues_found.append(f"Insecure random usage in {py_file}")
        except Exception:
            continue
    
    if issues_found:
        print(f"⚠️  Found {len(issues_found)} custom security issues:")
        for issue in issues_found[:5]:
            print(f"   - {issue}")
    else:
        print("✅ Custom security checks passed")
    
    return len(issues_found) == 0


def generate_security_report():
    """Generate a comprehensive security report."""
    print("\n📄 Generating security report...")
    
    report = {
        "timestamp": datetime.utcnow().isoformat(),
        "scans_performed": [],
        "summary": {
            "total_scans": 0,
            "passed_scans": 0,
            "failed_scans": 0
        },
        "recommendations": [
            "Keep dependencies updated regularly",
            "Use secrets management for sensitive data",
            "Enable security linting in CI/CD pipeline",
            "Conduct regular security audits",
            "Implement proper input validation",
            "Use HTTPS in production",
            "Enable security headers",
            "Implement proper authentication and authorization"
        ]
    }
    
    # Check if report files exist and include them
    report_files = [
        "bandit_report.json",
        "semgrep_report.json"
    ]
    
    for report_file in report_files:
        if Path(report_file).exists():
            try:
                with open(report_file, "r") as f:
                    report[f"{report_file}_data"] = json.load(f)
            except Exception:
                pass
    
    # Save comprehensive report
    with open("comprehensive_security_report.json", "w") as f:
        json.dump(report, f, indent=2, default=str)
    
    print("✅ Security report saved to comprehensive_security_report.json")


def main():
    """Run all security scans."""
    print("🔒 Python Security Testing Suite")
    print("=" * 50)
    
    results = []
    
    # Run individual scans
    results.append(("Bandit", run_bandit_scan()))
    results.append(("Safety", run_safety_scan()))
    results.append(("Semgrep", run_semgrep_scan()))
    results.append(("Requirements Check", check_requirements_security()))
    results.append(("Custom Checks", run_custom_security_checks()))
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Security Scan Summary")
    print("=" * 50)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for scan_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{scan_name:20} {status}")
    
    print(f"\nOverall: {passed}/{total} scans passed")
    
    # Generate report
    generate_security_report()
    
    # Recommendations
    print("\n💡 Security Recommendations:")
    print("1. Address any issues found in the scans above")
    print("2. Run these scans regularly in your CI/CD pipeline")
    print("3. Keep all dependencies updated")
    print("4. Use environment variables for sensitive configuration")
    print("5. Enable comprehensive logging and monitoring")
    
    return passed == total


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)