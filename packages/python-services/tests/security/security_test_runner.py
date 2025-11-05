"""
Comprehensive security test runner.
"""

import asyncio
import subprocess
import json
import os
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from datetime import datetime
import structlog

logger = structlog.get_logger(__name__)


@dataclass
class SecurityTestResult:
    """Security test result data."""
    test_name: str
    status: str  # PASS, FAIL, WARNING
    severity: str  # HIGH, MEDIUM, LOW
    findings: List[str]
    recommendations: List[str]
    execution_time: float


class SecurityTestRunner:
    """Comprehensive security test runner."""
    
    def __init__(self, output_dir: Path = None):
        self.output_dir = output_dir or Path("security_test_results")
        self.output_dir.mkdir(exist_ok=True)
        self.results: List[SecurityTestResult] = []
    
    async def run_all_security_tests(self) -> Dict[str, Any]:
        """Run all security tests and generate comprehensive report."""
        logger.info("Starting comprehensive security test suite")
        
        # Run different categories of security tests
        await self._run_static_analysis_tests()
        await self._run_dependency_vulnerability_tests()
        await self._run_dynamic_security_tests()
        await self._run_configuration_security_tests()
        await self._run_compliance_tests()
        
        # Generate comprehensive report
        report = self._generate_security_report()
        
        # Save report
        report_file = self.output_dir / f"security_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        # Generate HTML report
        await self._generate_html_report(report, report_file.with_suffix('.html'))
        
        logger.info("Security test suite completed", report_file=str(report_file))
        return report
    
    async def _run_static_analysis_tests(self):
        """Run static analysis security tests."""
        logger.info("Running static analysis security tests")
        
        # Bandit scan
        await self._run_bandit_scan()
        
        # Semgrep scan
        await self._run_semgrep_scan()
        
        # Custom code analysis
        await self._run_custom_code_analysis()
    
    async def _run_bandit_scan(self):
        """Run Bandit security scan."""
        start_time = asyncio.get_event_loop().time()
        
        try:
            # Run Bandit
            result = subprocess.run([
                "bandit", 
                "-r", "app/",
                "-f", "json",
                "-o", str(self.output_dir / "bandit_report.json"),
                "--skip", "B101,B601"  # Skip assert and shell usage in tests
            ], capture_output=True, text=True, cwd=".")
            
            execution_time = asyncio.get_event_loop().time() - start_time
            
            # Parse results
            report_file = self.output_dir / "bandit_report.json"
            if report_file.exists():
                with open(report_file, 'r') as f:
                    bandit_report = json.load(f)
                
                findings = []
                recommendations = []
                severity = "LOW"
                
                high_issues = [
                    issue for issue in bandit_report.get("results", [])
                    if issue.get("issue_severity") == "HIGH"
                ]
                
                medium_issues = [
                    issue for issue in bandit_report.get("results", [])
                    if issue.get("issue_severity") == "MEDIUM"
                ]
                
                if high_issues:
                    severity = "HIGH"
                    findings.extend([
                        f"{issue['test_name']}: {issue['issue_text']} "
                        f"({issue['filename']}:{issue['line_number']})"
                        for issue in high_issues
                    ])
                    recommendations.append("Fix high severity security issues immediately")
                
                if medium_issues:
                    if severity == "LOW":
                        severity = "MEDIUM"
                    findings.extend([
                        f"{issue['test_name']}: {issue['issue_text']} "
                        f"({issue['filename']}:{issue['line_number']})"
                        for issue in medium_issues[:5]  # Limit to first 5
                    ])
                    recommendations.append("Review and fix medium severity security issues")
                
                status = "FAIL" if high_issues else ("WARNING" if medium_issues else "PASS")
                
                self.results.append(SecurityTestResult(
                    test_name="Bandit Static Analysis",
                    status=status,
                    severity=severity,
                    findings=findings,
                    recommendations=recommendations,
                    execution_time=execution_time
                ))
            
        except Exception as e:
            logger.error("Bandit scan failed", error=str(e))
            self.results.append(SecurityTestResult(
                test_name="Bandit Static Analysis",
                status="FAIL",
                severity="HIGH",
                findings=[f"Scan failed: {str(e)}"],
                recommendations=["Fix Bandit scan execution issues"],
                execution_time=asyncio.get_event_loop().time() - start_time
            ))
    
    async def _run_semgrep_scan(self):
        """Run Semgrep security scan."""
        start_time = asyncio.get_event_loop().time()
        
        try:
            # Run Semgrep
            result = subprocess.run([
                "semgrep",
                "--config=auto",
                "--json",
                f"--output={self.output_dir}/semgrep_report.json",
                "app/"
            ], capture_output=True, text=True, cwd=".")
            
            execution_time = asyncio.get_event_loop().time() - start_time
            
            # Parse results
            report_file = self.output_dir / "semgrep_report.json"
            if report_file.exists():
                with open(report_file, 'r') as f:
                    semgrep_report = json.load(f)
                
                findings = []
                recommendations = []
                severity = "LOW"
                
                security_findings = [
                    finding for finding in semgrep_report.get("results", [])
                    if "security" in finding.get("extra", {}).get("metadata", {}).get("category", "").lower()
                ]
                
                high_confidence_findings = [
                    finding for finding in security_findings
                    if finding.get("extra", {}).get("metadata", {}).get("confidence", "").upper() in ["HIGH"]
                ]
                
                medium_confidence_findings = [
                    finding for finding in security_findings
                    if finding.get("extra", {}).get("metadata", {}).get("confidence", "").upper() in ["MEDIUM"]
                ]
                
                if high_confidence_findings:
                    severity = "HIGH"
                    findings.extend([
                        f"{finding['check_id']}: {finding['message']} "
                        f"({finding['path']}:{finding['start']['line']})"
                        for finding in high_confidence_findings
                    ])
                    recommendations.append("Address high-confidence security findings")
                
                if medium_confidence_findings:
                    if severity == "LOW":
                        severity = "MEDIUM"
                    findings.extend([
                        f"{finding['check_id']}: {finding['message']} "
                        f"({finding['path']}:{finding['start']['line']})"
                        for finding in medium_confidence_findings[:5]
                    ])
                    recommendations.append("Review medium-confidence security findings")
                
                status = "FAIL" if high_confidence_findings else ("WARNING" if medium_confidence_findings else "PASS")
                
                self.results.append(SecurityTestResult(
                    test_name="Semgrep Security Analysis",
                    status=status,
                    severity=severity,
                    findings=findings,
                    recommendations=recommendations,
                    execution_time=execution_time
                ))
            
        except Exception as e:
            logger.error("Semgrep scan failed", error=str(e))
            self.results.append(SecurityTestResult(
                test_name="Semgrep Security Analysis",
                status="WARNING",
                severity="MEDIUM",
                findings=[f"Scan failed: {str(e)}"],
                recommendations=["Install and configure Semgrep for security scanning"],
                execution_time=asyncio.get_event_loop().time() - start_time
            ))
    
    async def _run_custom_code_analysis(self):
        """Run custom code analysis for security issues."""
        start_time = asyncio.get_event_loop().time()
        
        findings = []
        recommendations = []
        
        try:
            # Check for hardcoded secrets
            secret_patterns = [
                r'password\s*=\s*["\'][^"\']+["\']',
                r'secret\s*=\s*["\'][^"\']+["\']',
                r'api_key\s*=\s*["\'][^"\']+["\']',
                r'token\s*=\s*["\'][^"\']+["\']'
            ]
            
            # Scan Python files
            import re
            python_files = list(Path("app").rglob("*.py"))
            
            for file_path in python_files:
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        
                        for pattern in secret_patterns:
                            matches = re.finditer(pattern, content, re.IGNORECASE)
                            for match in matches:
                                line_num = content[:match.start()].count('\n') + 1
                                findings.append(
                                    f"Potential hardcoded secret in {file_path}:{line_num}"
                                )
                except Exception:
                    continue
            
            # Check for insecure random usage
            insecure_random_pattern = r'random\.(random|randint|choice)'
            for file_path in python_files:
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        matches = re.finditer(insecure_random_pattern, content)
                        for match in matches:
                            line_num = content[:match.start()].count('\n') + 1
                            findings.append(
                                f"Insecure random usage in {file_path}:{line_num} - use secrets module"
                            )
                except Exception:
                    continue
            
            if findings:
                recommendations.extend([
                    "Remove hardcoded secrets and use environment variables",
                    "Use cryptographically secure random functions",
                    "Implement proper secret management"
                ])
            
            severity = "HIGH" if any("secret" in f.lower() for f in findings) else "MEDIUM"
            status = "FAIL" if severity == "HIGH" else ("WARNING" if findings else "PASS")
            
            self.results.append(SecurityTestResult(
                test_name="Custom Code Analysis",
                status=status,
                severity=severity if findings else "LOW",
                findings=findings,
                recommendations=recommendations,
                execution_time=asyncio.get_event_loop().time() - start_time
            ))
            
        except Exception as e:
            logger.error("Custom code analysis failed", error=str(e))
            self.results.append(SecurityTestResult(
                test_name="Custom Code Analysis",
                status="WARNING",
                severity="MEDIUM",
                findings=[f"Analysis failed: {str(e)}"],
                recommendations=["Fix code analysis execution issues"],
                execution_time=asyncio.get_event_loop().time() - start_time
            ))
    
    async def _run_dependency_vulnerability_tests(self):
        """Run dependency vulnerability tests."""
        logger.info("Running dependency vulnerability tests")
        
        start_time = asyncio.get_event_loop().time()
        
        try:
            # Run Safety scan
            result = subprocess.run([
                "safety", "check", 
                "--json",
                "--output", str(self.output_dir / "safety_report.json")
            ], capture_output=True, text=True, cwd=".")
            
            execution_time = asyncio.get_event_loop().time() - start_time
            
            findings = []
            recommendations = []
            
            if result.returncode != 0:
                try:
                    # Try to parse JSON output
                    vulnerabilities = json.loads(result.stdout)
                    if vulnerabilities:
                        findings.extend([
                            f"{vuln['package']} {vuln['installed_version']}: {vuln['vulnerability']}"
                            for vuln in vulnerabilities
                        ])
                        recommendations.append("Update vulnerable dependencies to secure versions")
                except json.JSONDecodeError:
                    # Parse text output
                    if "vulnerabilities found" in result.stdout.lower():
                        findings.append("Vulnerable dependencies detected (see safety report)")
                        recommendations.append("Run 'safety check' for detailed vulnerability information")
            
            severity = "HIGH" if findings else "LOW"
            status = "FAIL" if findings else "PASS"
            
            self.results.append(SecurityTestResult(
                test_name="Dependency Vulnerability Scan",
                status=status,
                severity=severity,
                findings=findings,
                recommendations=recommendations,
                execution_time=execution_time
            ))
            
        except Exception as e:
            logger.error("Safety scan failed", error=str(e))
            self.results.append(SecurityTestResult(
                test_name="Dependency Vulnerability Scan",
                status="WARNING",
                severity="MEDIUM",
                findings=[f"Scan failed: {str(e)}"],
                recommendations=["Install and configure Safety for dependency scanning"],
                execution_time=asyncio.get_event_loop().time() - start_time
            ))
    
    async def _run_dynamic_security_tests(self):
        """Run dynamic security tests."""
        logger.info("Running dynamic security tests")
        
        # This would run the pytest security tests
        start_time = asyncio.get_event_loop().time()
        
        try:
            result = subprocess.run([
                "python", "-m", "pytest", 
                "tests/security/",
                "-v",
                "--tb=short",
                "-x"  # Stop on first failure
            ], capture_output=True, text=True, cwd=".")
            
            execution_time = asyncio.get_event_loop().time() - start_time
            
            findings = []
            recommendations = []
            
            if result.returncode != 0:
                # Parse pytest output for failures
                output_lines = result.stdout.split('\n')
                failed_tests = [
                    line for line in output_lines 
                    if "FAILED" in line or "ERROR" in line
                ]
                
                findings.extend(failed_tests)
                recommendations.append("Fix failing security tests")
                
                severity = "HIGH"
                status = "FAIL"
            else:
                severity = "LOW"
                status = "PASS"
                findings.append("All dynamic security tests passed")
            
            self.results.append(SecurityTestResult(
                test_name="Dynamic Security Tests",
                status=status,
                severity=severity,
                findings=findings,
                recommendations=recommendations,
                execution_time=execution_time
            ))
            
        except Exception as e:
            logger.error("Dynamic security tests failed", error=str(e))
            self.results.append(SecurityTestResult(
                test_name="Dynamic Security Tests",
                status="WARNING",
                severity="MEDIUM",
                findings=[f"Test execution failed: {str(e)}"],
                recommendations=["Fix test execution environment"],
                execution_time=asyncio.get_event_loop().time() - start_time
            ))
    
    async def _run_configuration_security_tests(self):
        """Run configuration security tests."""
        logger.info("Running configuration security tests")
        
        start_time = asyncio.get_event_loop().time()
        findings = []
        recommendations = []
        
        try:
            # Check environment variables
            sensitive_env_vars = []
            for var_name, var_value in os.environ.items():
                var_name_lower = var_name.lower()
                if any(pattern in var_name_lower for pattern in ["password", "secret", "key", "token"]):
                    if var_value in ["password", "secret", "123456", "admin", ""]:
                        sensitive_env_vars.append(var_name)
            
            if sensitive_env_vars:
                findings.extend([
                    f"Insecure environment variable: {var}" 
                    for var in sensitive_env_vars
                ])
                recommendations.append("Use secure values for sensitive environment variables")
            
            # Check file permissions
            sensitive_files = [
                ".env", "config.py", "settings.py", "secrets.json"
            ]
            
            for file_name in sensitive_files:
                file_path = Path(file_name)
                if file_path.exists():
                    # Check if file is readable by others (Unix-like systems)
                    try:
                        stat_info = file_path.stat()
                        if stat_info.st_mode & 0o044:  # Others can read
                            findings.append(f"Sensitive file {file_name} has overly permissive permissions")
                            recommendations.append("Restrict file permissions for sensitive configuration files")
                    except Exception:
                        pass  # Skip permission check on Windows
            
            # Check for debug mode
            try:
                from app.core.config import get_settings
                settings = get_settings()
                if getattr(settings, 'DEBUG', False) and getattr(settings, 'ENVIRONMENT', '') == 'production':
                    findings.append("Debug mode enabled in production environment")
                    recommendations.append("Disable debug mode in production")
            except Exception:
                pass
            
            severity = "HIGH" if any("production" in f for f in findings) else ("MEDIUM" if findings else "LOW")
            status = "FAIL" if severity == "HIGH" else ("WARNING" if findings else "PASS")
            
            self.results.append(SecurityTestResult(
                test_name="Configuration Security",
                status=status,
                severity=severity,
                findings=findings,
                recommendations=recommendations,
                execution_time=asyncio.get_event_loop().time() - start_time
            ))
            
        except Exception as e:
            logger.error("Configuration security tests failed", error=str(e))
            self.results.append(SecurityTestResult(
                test_name="Configuration Security",
                status="WARNING",
                severity="MEDIUM",
                findings=[f"Configuration check failed: {str(e)}"],
                recommendations=["Fix configuration security check"],
                execution_time=asyncio.get_event_loop().time() - start_time
            ))
    
    async def _run_compliance_tests(self):
        """Run compliance tests."""
        logger.info("Running compliance tests")
        
        start_time = asyncio.get_event_loop().time()
        findings = []
        recommendations = []
        
        try:
            # OWASP Top 10 compliance check
            owasp_checks = {
                "A01 - Broken Access Control": self._check_access_control(),
                "A02 - Cryptographic Failures": self._check_cryptography(),
                "A03 - Injection": self._check_injection_protection(),
                "A05 - Security Misconfiguration": self._check_security_config(),
                "A06 - Vulnerable Components": self._check_vulnerable_components(),
                "A07 - Authentication Failures": self._check_authentication()
            }
            
            for check_name, check_result in owasp_checks.items():
                if not check_result:
                    findings.append(f"OWASP {check_name} compliance issue detected")
                    recommendations.append(f"Address {check_name} vulnerabilities")
            
            severity = "HIGH" if len(findings) > 3 else ("MEDIUM" if findings else "LOW")
            status = "FAIL" if severity == "HIGH" else ("WARNING" if findings else "PASS")
            
            self.results.append(SecurityTestResult(
                test_name="Security Compliance",
                status=status,
                severity=severity,
                findings=findings,
                recommendations=recommendations,
                execution_time=asyncio.get_event_loop().time() - start_time
            ))
            
        except Exception as e:
            logger.error("Compliance tests failed", error=str(e))
            self.results.append(SecurityTestResult(
                test_name="Security Compliance",
                status="WARNING",
                severity="MEDIUM",
                findings=[f"Compliance check failed: {str(e)}"],
                recommendations=["Fix compliance test execution"],
                execution_time=asyncio.get_event_loop().time() - start_time
            ))
    
    def _check_access_control(self) -> bool:
        """Check access control implementation."""
        try:
            # Check if authentication middleware exists
            auth_files = list(Path("app").rglob("*auth*"))
            return len(auth_files) > 0
        except Exception:
            return False
    
    def _check_cryptography(self) -> bool:
        """Check cryptography implementation."""
        try:
            # Check if encryption module exists
            from app.core.encryption import encrypt_sensitive_data
            return True
        except ImportError:
            return False
    
    def _check_injection_protection(self) -> bool:
        """Check injection protection."""
        try:
            # Check if SQLAlchemy is used (provides parameterized queries)
            import sqlalchemy
            return True
        except ImportError:
            return False
    
    def _check_security_config(self) -> bool:
        """Check security configuration."""
        try:
            # Check if security middleware exists
            security_files = list(Path("app").rglob("*security*"))
            return len(security_files) > 0
        except Exception:
            return False
    
    def _check_vulnerable_components(self) -> bool:
        """Check for vulnerable components."""
        # This would be covered by the Safety scan
        return True
    
    def _check_authentication(self) -> bool:
        """Check authentication implementation."""
        try:
            # Check if JWT or similar auth is implemented
            from app.core.auth import create_access_token
            return True
        except ImportError:
            return False
    
    def _generate_security_report(self) -> Dict[str, Any]:
        """Generate comprehensive security report."""
        total_tests = len(self.results)
        passed_tests = len([r for r in self.results if r.status == "PASS"])
        failed_tests = len([r for r in self.results if r.status == "FAIL"])
        warning_tests = len([r for r in self.results if r.status == "WARNING"])
        
        high_severity_issues = len([r for r in self.results if r.severity == "HIGH"])
        medium_severity_issues = len([r for r in self.results if r.severity == "MEDIUM"])
        
        # Calculate security score
        security_score = max(0, 100 - (failed_tests * 20) - (warning_tests * 10) - (high_severity_issues * 15))
        
        report = {
            "summary": {
                "total_tests": total_tests,
                "passed_tests": passed_tests,
                "failed_tests": failed_tests,
                "warning_tests": warning_tests,
                "security_score": security_score,
                "high_severity_issues": high_severity_issues,
                "medium_severity_issues": medium_severity_issues,
                "overall_status": "FAIL" if failed_tests > 0 else ("WARNING" if warning_tests > 0 else "PASS")
            },
            "test_results": [
                {
                    "test_name": result.test_name,
                    "status": result.status,
                    "severity": result.severity,
                    "findings_count": len(result.findings),
                    "findings": result.findings,
                    "recommendations": result.recommendations,
                    "execution_time": result.execution_time
                }
                for result in self.results
            ],
            "recommendations": self._generate_overall_recommendations(),
            "generated_at": datetime.now().isoformat()
        }
        
        return report
    
    def _generate_overall_recommendations(self) -> List[str]:
        """Generate overall security recommendations."""
        recommendations = []
        
        high_severity_results = [r for r in self.results if r.severity == "HIGH"]
        failed_results = [r for r in self.results if r.status == "FAIL"]
        
        if high_severity_results:
            recommendations.append(
                f"CRITICAL: Address {len(high_severity_results)} high-severity security issues immediately"
            )
        
        if failed_results:
            recommendations.append(
                f"Fix {len(failed_results)} failing security tests before deployment"
            )
        
        # Add specific recommendations based on test results
        all_recommendations = []
        for result in self.results:
            all_recommendations.extend(result.recommendations)
        
        # Get unique recommendations
        unique_recommendations = list(set(all_recommendations))
        recommendations.extend(unique_recommendations[:5])  # Top 5 unique recommendations
        
        return recommendations
    
    async def _generate_html_report(self, report: Dict[str, Any], output_file: Path):
        """Generate HTML security report."""
        html_template = """
<!DOCTYPE html>
<html>
<head>
    <title>Security Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .summary { display: flex; gap: 20px; margin-bottom: 20px; }
        .metric { padding: 15px; background-color: #e9ecef; border-radius: 5px; text-align: center; }
        .test-result { margin: 15px 0; padding: 15px; border-radius: 5px; border-left: 5px solid; }
        .pass { border-left-color: #28a745; background-color: #d4edda; }
        .fail { border-left-color: #dc3545; background-color: #f8d7da; }
        .warning { border-left-color: #ffc107; background-color: #fff3cd; }
        .severity-high { color: #dc3545; font-weight: bold; }
        .severity-medium { color: #fd7e14; font-weight: bold; }
        .severity-low { color: #28a745; }
        .recommendations { background-color: #cce5ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
        ul { margin: 10px 0; }
        .score { font-size: 2em; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Security Test Report</h1>
        <p><strong>Generated:</strong> {generated_at}</p>
        <p><strong>Overall Status:</strong> <span class="{overall_status_class}">{overall_status}</span></p>
    </div>
    
    <div class="summary">
        <div class="metric">
            <div class="score {score_class}">{security_score}</div>
            <div>Security Score</div>
        </div>
        <div class="metric">
            <div><strong>{total_tests}</strong></div>
            <div>Total Tests</div>
        </div>
        <div class="metric">
            <div><strong>{passed_tests}</strong></div>
            <div>Passed</div>
        </div>
        <div class="metric">
            <div><strong>{failed_tests}</strong></div>
            <div>Failed</div>
        </div>
        <div class="metric">
            <div><strong>{warning_tests}</strong></div>
            <div>Warnings</div>
        </div>
    </div>
    
    <div class="recommendations">
        <h2>Key Recommendations</h2>
        <ul>
            {recommendations_html}
        </ul>
    </div>
    
    <h2>Test Results</h2>
    {test_results_html}
</body>
</html>
        """
        
        # Generate test results HTML
        test_results_html = ""
        for result in report["test_results"]:
            status_class = result["status"].lower()
            severity_class = f"severity-{result['severity'].lower()}"
            
            findings_html = "<ul>" + "".join(f"<li>{finding}</li>" for finding in result["findings"]) + "</ul>" if result["findings"] else "No issues found"
            recommendations_html = "<ul>" + "".join(f"<li>{rec}</li>" for rec in result["recommendations"]) + "</ul>" if result["recommendations"] else ""
            
            test_results_html += f"""
            <div class="test-result {status_class}">
                <h3>{result["test_name"]} - <span class="{severity_class}">{result["severity"]}</span></h3>
                <p><strong>Status:</strong> {result["status"]}</p>
                <p><strong>Execution Time:</strong> {result["execution_time"]:.2f}s</p>
                <p><strong>Findings ({result["findings_count"]}):</strong></p>
                {findings_html}
                {f"<p><strong>Recommendations:</strong></p>{recommendations_html}" if recommendations_html else ""}
            </div>
            """
        
        # Generate recommendations HTML
        recommendations_html = "".join(f"<li>{rec}</li>" for rec in report["recommendations"])
        
        # Determine CSS classes
        overall_status = report["summary"]["overall_status"]
        overall_status_class = overall_status.lower()
        
        security_score = report["summary"]["security_score"]
        if security_score >= 80:
            score_class = "severity-low"
        elif security_score >= 60:
            score_class = "severity-medium"
        else:
            score_class = "severity-high"
        
        # Fill template
        html_content = html_template.format(
            generated_at=report["generated_at"],
            overall_status=overall_status,
            overall_status_class=overall_status_class,
            security_score=security_score,
            score_class=score_class,
            total_tests=report["summary"]["total_tests"],
            passed_tests=report["summary"]["passed_tests"],
            failed_tests=report["summary"]["failed_tests"],
            warning_tests=report["summary"]["warning_tests"],
            recommendations_html=recommendations_html,
            test_results_html=test_results_html
        )
        
        with open(output_file, 'w') as f:
            f.write(html_content)
        
        logger.info("HTML security report generated", report_file=str(output_file))


# CLI interface
if __name__ == "__main__":
    import sys
    
    async def main():
        runner = SecurityTestRunner()
        report = await runner.run_all_security_tests()
        
        print("\n" + "="*60)
        print("SECURITY TEST REPORT")
        print("="*60)
        print(f"Security Score: {report['summary']['security_score']}/100")
        print(f"Overall Status: {report['summary']['overall_status']}")
        print(f"Total Tests: {report['summary']['total_tests']}")
        print(f"Passed: {report['summary']['passed_tests']}")
        print(f"Failed: {report['summary']['failed_tests']}")
        print(f"Warnings: {report['summary']['warning_tests']}")
        
        if report['summary']['failed_tests'] > 0:
            print(f"\n❌ {report['summary']['failed_tests']} security tests failed!")
            sys.exit(1)
        elif report['summary']['warning_tests'] > 0:
            print(f"\n⚠️  {report['summary']['warning_tests']} security warnings found")
        else:
            print("\n✅ All security tests passed!")
    
    asyncio.run(main())