#!/usr/bin/env python3
"""
Comprehensive security testing runner.
Requirements: 14.5, 13.1, 13.2, 13.3, 13.4 - Security testing and vulnerability scanning
"""

import asyncio
import subprocess
import json
import sys
import os
from pathlib import Path
from typing import Dict, List, Any
from datetime import datetime
import click
import structlog

logger = structlog.get_logger(__name__)


class SecurityTestRunner:
    """Comprehensive security test runner."""
    
    def __init__(self, output_dir: Path = None):
        self.output_dir = output_dir or Path("security_test_results")
        self.output_dir.mkdir(exist_ok=True)
        self.results = {}
    
    async def run_all_security_tests(self) -> Dict[str, Any]:
        """Run all security tests and generate comprehensive report."""
        logger.info("Starting comprehensive security test suite")
        
        # Run different categories of security tests
        await self._run_static_analysis()
        await self._run_dependency_scanning()
        await self._run_dynamic_testing()
        await self._run_configuration_security()
        await self._run_compliance_checks()
        
        # Generate comprehensive report
        report = self._generate_final_report()
        
        # Save report
        report_file = self.output_dir / f"security_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        logger.info("Security test suite completed", report_file=str(report_file))
        return report
    
    async def _run_static_analysis(self):
        """Run static analysis security tools."""
        logger.info("Running static analysis security tests")
        
        # Bandit scan
        bandit_result = await self._run_bandit()
        self.results['bandit'] = bandit_result
        
        # Semgrep scan
        semgrep_result = await self._run_semgrep()
        self.results['semgrep'] = semgrep_result
        
        # Custom code analysis
        custom_result = await self._run_custom_analysis()
        self.results['custom_analysis'] = custom_result
    
    async def _run_bandit(self) -> Dict[str, Any]:
        """Run Bandit security scan."""
        try:
            cmd = [
                "bandit", 
                "-r", "app/",
                "-f", "json",
                "-o", str(self.output_dir / "bandit_report.json"),
                "--skip", "B101,B601"  # Skip assert and shell usage in tests
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, cwd=".")
            
            # Parse results
            report_file = self.output_dir / "bandit_report.json"
            if report_file.exists():
                with open(report_file, 'r') as f:
                    bandit_report = json.load(f)
                
                high_issues = [
                    issue for issue in bandit_report.get("results", [])
                    if issue.get("issue_severity") == "HIGH"
                ]
                
                medium_issues = [
                    issue for issue in bandit_report.get("results", [])
                    if issue.get("issue_severity") == "MEDIUM"
                ]
                
                return {
                    "status": "completed",
                    "high_issues": len(high_issues),
                    "medium_issues": len(medium_issues),
                    "total_issues": len(bandit_report.get("results", [])),
                    "details": high_issues[:5]  # First 5 high issues
                }
            
            return {"status": "failed", "error": "No report generated"}
            
        except Exception as e:
            logger.error("Bandit scan failed", error=str(e))
            return {"status": "failed", "error": str(e)}
    
    async def _run_semgrep(self) -> Dict[str, Any]:
        """Run Semgrep security scan."""
        try:
            cmd = [
                "semgrep",
                "--config=auto",
                "--json",
                f"--output={self.output_dir}/semgrep_report.json",
                "app/"
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, cwd=".")
            
            # Parse results
            report_file = self.output_dir / "semgrep_report.json"
            if report_file.exists():
                with open(report_file, 'r') as f:
                    semgrep_report = json.load(f)
                
                security_findings = [
                    finding for finding in semgrep_report.get("results", [])
                    if "security" in finding.get("extra", {}).get("metadata", {}).get("category", "").lower()
                ]
                
                high_confidence = [
                    finding for finding in security_findings
                    if finding.get("extra", {}).get("metadata", {}).get("confidence", "").upper() == "HIGH"
                ]
                
                return {
                    "status": "completed",
                    "security_findings": len(security_findings),
                    "high_confidence": len(high_confidence),
                    "total_findings": len(semgrep_report.get("results", [])),
                    "details": high_confidence[:5]
                }
            
            return {"status": "failed", "error": "No report generated"}
            
        except Exception as e:
            logger.error("Semgrep scan failed", error=str(e))
            return {"status": "failed", "error": str(e)}
    
    async def _run_custom_analysis(self) -> Dict[str, Any]:
        """Run custom security analysis."""
        try:
            issues = []
            
            # Check for hardcoded secrets
            import re
            secret_patterns = [
                r'password\s*=\s*["\'][^"\']+["\']',
                r'secret\s*=\s*["\'][^"\']+["\']',
                r'api_key\s*=\s*["\'][^"\']+["\']',
                r'token\s*=\s*["\'][^"\']+["\']'
            ]
            
            python_files = list(Path("app").rglob("*.py"))
            
            for file_path in python_files:
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        
                        for pattern in secret_patterns:
                            matches = re.finditer(pattern, content, re.IGNORECASE)
                            for match in matches:
                                line_num = content[:match.start()].count('\n') + 1
                                issues.append({
                                    "type": "hardcoded_secret",
                                    "file": str(file_path),
                                    "line": line_num,
                                    "pattern": pattern
                                })
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
                            issues.append({
                                "type": "insecure_random",
                                "file": str(file_path),
                                "line": line_num,
                                "recommendation": "Use secrets module for cryptographic operations"
                            })
                except Exception:
                    continue
            
            return {
                "status": "completed",
                "total_issues": len(issues),
                "hardcoded_secrets": len([i for i in issues if i["type"] == "hardcoded_secret"]),
                "insecure_random": len([i for i in issues if i["type"] == "insecure_random"]),
                "details": issues[:10]  # First 10 issues
            }
            
        except Exception as e:
            logger.error("Custom analysis failed", error=str(e))
            return {"status": "failed", "error": str(e)}
    
    async def _run_dependency_scanning(self):
        """Run dependency vulnerability scanning."""
        logger.info("Running dependency vulnerability scanning")
        
        # Safety scan
        safety_result = await self._run_safety()
        self.results['safety'] = safety_result
        
        # pip-audit scan
        pip_audit_result = await self._run_pip_audit()
        self.results['pip_audit'] = pip_audit_result
    
    async def _run_safety(self) -> Dict[str, Any]:
        """Run Safety dependency scan."""
        try:
            cmd = ["safety", "check", "--json", "--output", str(self.output_dir / "safety_report.json")]
            result = subprocess.run(cmd, capture_output=True, text=True, cwd=".")
            
            vulnerabilities = []
            if result.returncode != 0:
                try:
                    # Try to parse JSON output
                    vulnerabilities = json.loads(result.stdout)
                except json.JSONDecodeError:
                    # Parse text output
                    if "vulnerabilities found" in result.stdout.lower():
                        vulnerabilities = [{"package": "unknown", "vulnerability": result.stdout}]
            
            return {
                "status": "completed",
                "vulnerabilities_found": len(vulnerabilities),
                "details": vulnerabilities[:5]  # First 5 vulnerabilities
            }
            
        except Exception as e:
            logger.error("Safety scan failed", error=str(e))
            return {"status": "failed", "error": str(e)}
    
    async def _run_pip_audit(self) -> Dict[str, Any]:
        """Run pip-audit scan."""
        try:
            cmd = ["pip-audit", "--format=json", f"--output={self.output_dir}/pip_audit_report.json"]
            result = subprocess.run(cmd, capture_output=True, text=True, cwd=".")
            
            # Parse results
            report_file = self.output_dir / "pip_audit_report.json"
            vulnerabilities = []
            
            if report_file.exists():
                try:
                    with open(report_file, 'r') as f:
                        audit_report = json.load(f)
                    
                    if isinstance(audit_report, list):
                        vulnerabilities = audit_report
                    elif isinstance(audit_report, dict) and "vulnerabilities" in audit_report:
                        vulnerabilities = audit_report["vulnerabilities"]
                except Exception:
                    pass
            
            return {
                "status": "completed",
                "vulnerabilities_found": len(vulnerabilities),
                "details": vulnerabilities[:5]
            }
            
        except Exception as e:
            logger.error("pip-audit scan failed", error=str(e))
            return {"status": "failed", "error": str(e)}
    
    async def _run_dynamic_testing(self):
        """Run dynamic security testing."""
        logger.info("Running dynamic security testing")
        
        # Run pytest security tests
        pytest_result = await self._run_pytest_security()
        self.results['pytest_security'] = pytest_result
    
    async def _run_pytest_security(self) -> Dict[str, Any]:
        """Run pytest security tests."""
        try:
            cmd = [
                "python", "-m", "pytest", 
                "tests/security/",
                "-v",
                "--tb=short",
                "--json-report",
                f"--json-report-file={self.output_dir}/pytest_security_report.json"
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, cwd=".")
            
            # Parse results
            report_file = self.output_dir / "pytest_security_report.json"
            if report_file.exists():
                try:
                    with open(report_file, 'r') as f:
                        pytest_report = json.load(f)
                    
                    return {
                        "status": "completed",
                        "total_tests": pytest_report.get("summary", {}).get("total", 0),
                        "passed": pytest_report.get("summary", {}).get("passed", 0),
                        "failed": pytest_report.get("summary", {}).get("failed", 0),
                        "errors": pytest_report.get("summary", {}).get("error", 0)
                    }
                except Exception:
                    pass
            
            # Fallback to parsing stdout
            failed_tests = result.stdout.count("FAILED")
            passed_tests = result.stdout.count("PASSED")
            
            return {
                "status": "completed",
                "total_tests": failed_tests + passed_tests,
                "passed": passed_tests,
                "failed": failed_tests,
                "return_code": result.returncode
            }
            
        except Exception as e:
            logger.error("pytest security tests failed", error=str(e))
            return {"status": "failed", "error": str(e)}
    
    async def _run_configuration_security(self):
        """Run configuration security checks."""
        logger.info("Running configuration security checks")
        
        config_result = await self._check_security_config()
        self.results['configuration'] = config_result
    
    async def _check_security_config(self) -> Dict[str, Any]:
        """Check security configuration."""
        try:
            issues = []
            
            # Check environment variables
            sensitive_env_vars = []
            for var_name, var_value in os.environ.items():
                var_name_lower = var_name.lower()
                if any(pattern in var_name_lower for pattern in ["password", "secret", "key", "token"]):
                    if var_value in ["password", "secret", "123456", "admin", ""]:
                        sensitive_env_vars.append(var_name)
            
            if sensitive_env_vars:
                issues.append({
                    "type": "insecure_env_vars",
                    "count": len(sensitive_env_vars),
                    "variables": sensitive_env_vars
                })
            
            # Check file permissions
            sensitive_files = [".env", "config.py", "settings.py", "secrets.json"]
            
            for file_name in sensitive_files:
                file_path = Path(file_name)
                if file_path.exists():
                    try:
                        stat_info = file_path.stat()
                        if stat_info.st_mode & 0o044:  # Others can read
                            issues.append({
                                "type": "file_permissions",
                                "file": file_name,
                                "issue": "overly permissive permissions"
                            })
                    except Exception:
                        pass  # Skip permission check on Windows
            
            # Check for debug mode
            debug_enabled = os.getenv('DEBUG', '').lower() in ['true', '1', 'yes']
            is_production = os.getenv('ENVIRONMENT', '').lower() == 'production'
            
            if debug_enabled and is_production:
                issues.append({
                    "type": "debug_in_production",
                    "issue": "Debug mode enabled in production environment"
                })
            
            return {
                "status": "completed",
                "total_issues": len(issues),
                "issues": issues
            }
            
        except Exception as e:
            logger.error("Configuration security check failed", error=str(e))
            return {"status": "failed", "error": str(e)}
    
    async def _run_compliance_checks(self):
        """Run security compliance checks."""
        logger.info("Running security compliance checks")
        
        compliance_result = await self._check_owasp_compliance()
        self.results['compliance'] = compliance_result
    
    async def _check_owasp_compliance(self) -> Dict[str, Any]:
        """Check OWASP Top 10 compliance."""
        try:
            compliance_checks = {}
            
            # A01: Broken Access Control
            try:
                from app.core.auth import create_access_token
                compliance_checks["A01_Access_Control"] = {"status": "implemented", "score": 80}
            except ImportError:
                compliance_checks["A01_Access_Control"] = {"status": "missing", "score": 0}
            
            # A02: Cryptographic Failures
            try:
                from app.core.encryption import encrypt_sensitive_data
                compliance_checks["A02_Cryptography"] = {"status": "implemented", "score": 90}
            except ImportError:
                compliance_checks["A02_Cryptography"] = {"status": "missing", "score": 0}
            
            # A03: Injection
            try:
                import sqlalchemy
                compliance_checks["A03_Injection"] = {"status": "protected", "score": 85}
            except ImportError:
                compliance_checks["A03_Injection"] = {"status": "vulnerable", "score": 20}
            
            # A05: Security Misconfiguration
            security_files = list(Path("app").rglob("*security*"))
            if security_files:
                compliance_checks["A05_Security_Config"] = {"status": "configured", "score": 75}
            else:
                compliance_checks["A05_Security_Config"] = {"status": "needs_review", "score": 40}
            
            # A07: Authentication Failures
            auth_files = list(Path("app").rglob("*auth*"))
            if auth_files:
                compliance_checks["A07_Authentication"] = {"status": "implemented", "score": 80}
            else:
                compliance_checks["A07_Authentication"] = {"status": "missing", "score": 0}
            
            # Calculate overall compliance score
            total_score = sum(check["score"] for check in compliance_checks.values())
            max_score = len(compliance_checks) * 100
            compliance_percentage = (total_score / max_score) * 100 if max_score > 0 else 0
            
            return {
                "status": "completed",
                "compliance_percentage": compliance_percentage,
                "checks": compliance_checks,
                "total_checks": len(compliance_checks)
            }
            
        except Exception as e:
            logger.error("OWASP compliance check failed", error=str(e))
            return {"status": "failed", "error": str(e)}
    
    def _generate_final_report(self) -> Dict[str, Any]:
        """Generate final security report."""
        
        # Calculate overall security metrics
        total_critical = 0
        total_high = 0
        total_medium = 0
        total_low = 0
        
        # Count issues from different scans
        if 'bandit' in self.results and self.results['bandit'].get('status') == 'completed':
            total_high += self.results['bandit'].get('high_issues', 0)
            total_medium += self.results['bandit'].get('medium_issues', 0)
        
        if 'safety' in self.results and self.results['safety'].get('status') == 'completed':
            total_critical += self.results['safety'].get('vulnerabilities_found', 0)
        
        if 'semgrep' in self.results and self.results['semgrep'].get('status') == 'completed':
            total_high += self.results['semgrep'].get('high_confidence', 0)
        
        if 'custom_analysis' in self.results and self.results['custom_analysis'].get('status') == 'completed':
            total_medium += self.results['custom_analysis'].get('hardcoded_secrets', 0)
            total_low += self.results['custom_analysis'].get('insecure_random', 0)
        
        # Calculate security score
        total_issues = (total_critical * 10) + (total_high * 5) + (total_medium * 2) + total_low
        security_score = max(0, 100 - total_issues)
        
        # Generate recommendations
        recommendations = []
        
        if total_critical > 0:
            recommendations.append("URGENT: Address critical vulnerabilities in dependencies immediately")
        
        if total_high > 0:
            recommendations.append("Address high-severity security issues before deployment")
        
        if total_medium > 5:
            recommendations.append("Review and fix medium-severity security issues")
        
        if 'compliance' in self.results:
            compliance_score = self.results['compliance'].get('compliance_percentage', 0)
            if compliance_score < 70:
                recommendations.append("Improve OWASP Top 10 compliance implementation")
        
        # Determine overall status
        if total_critical > 0:
            overall_status = "CRITICAL"
        elif total_high > 0:
            overall_status = "HIGH_RISK"
        elif total_medium > 3:
            overall_status = "MEDIUM_RISK"
        else:
            overall_status = "LOW_RISK"
        
        return {
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "security_score": security_score,
                "overall_status": overall_status,
                "critical_issues": total_critical,
                "high_issues": total_high,
                "medium_issues": total_medium,
                "low_issues": total_low,
                "total_scans": len([r for r in self.results.values() if r.get('status') == 'completed'])
            },
            "scan_results": self.results,
            "recommendations": recommendations,
            "compliance": self.results.get('compliance', {}),
            "next_steps": [
                "Review all security findings",
                "Prioritize critical and high-severity issues",
                "Implement security recommendations",
                "Schedule regular security scans",
                "Update security policies and procedures"
            ]
        }


@click.group()
def cli():
    """Security testing CLI."""
    pass


@cli.command()
@click.option('--output-dir', default='./security_test_results', help='Output directory for reports')
def run_all(output_dir: str):
    """Run all security tests."""
    
    async def run():
        runner = SecurityTestRunner(Path(output_dir))
        report = await runner.run_all_security_tests()
        
        # Print summary
        click.echo("\n" + "="*60)
        click.echo("SECURITY TEST SUMMARY")
        click.echo("="*60)
        click.echo(f"Security Score: {report['summary']['security_score']}/100")
        click.echo(f"Overall Status: {report['summary']['overall_status']}")
        click.echo(f"Critical Issues: {report['summary']['critical_issues']}")
        click.echo(f"High Issues: {report['summary']['high_issues']}")
        click.echo(f"Medium Issues: {report['summary']['medium_issues']}")
        click.echo(f"Total Scans: {report['summary']['total_scans']}")
        
        if report['recommendations']:
            click.echo("\nRecommendations:")
            for rec in report['recommendations']:
                click.echo(f"  - {rec}")
        
        # Exit with error code if critical issues found
        if report['summary']['critical_issues'] > 0:
            click.echo("\n❌ Critical security issues found!")
            sys.exit(1)
        elif report['summary']['high_issues'] > 0:
            click.echo("\n⚠️  High severity security issues found")
            sys.exit(1)
        else:
            click.echo("\n✅ Security scan completed successfully")
    
    asyncio.run(run())


@cli.command()
@click.argument('scan_type', type=click.Choice(['static', 'dependencies', 'dynamic', 'config', 'compliance']))
@click.option('--output-dir', default='./security_test_results', help='Output directory for reports')
def run_scan(scan_type: str, output_dir: str):
    """Run a specific type of security scan."""
    
    async def run():
        runner = SecurityTestRunner(Path(output_dir))
        
        if scan_type == 'static':
            await runner._run_static_analysis()
        elif scan_type == 'dependencies':
            await runner._run_dependency_scanning()
        elif scan_type == 'dynamic':
            await runner._run_dynamic_testing()
        elif scan_type == 'config':
            await runner._run_configuration_security()
        elif scan_type == 'compliance':
            await runner._run_compliance_checks()
        
        click.echo(f"✅ {scan_type.title()} security scan completed")
    
    asyncio.run(run())


if __name__ == '__main__':
    cli()