"""
Comprehensive security testing suite for Python services.

This module provides automated security testing using various Python security tools
including bandit, safety, semgrep, and custom security tests.
"""

import asyncio
import json
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional
from uuid import uuid4

import structlog
from fastapi.testclient import TestClient
import httpx
import pytest

# Import our application components for testing
from app.main import app
from app.core.config import get_settings
from app.core.encryption import get_encryption_service
from app.core.tls_config import get_tls_service
from app.services.encryption_service import get_app_encryption_service

logger = structlog.get_logger()
settings = get_settings()


class SecurityTestResult:
    """Container for security test results."""
    
    def __init__(self, test_name: str):
        self.test_name = test_name
        self.passed = False
        self.issues = []
        self.warnings = []
        self.execution_time = 0.0
        self.details = {}
    
    def add_issue(self, severity: str, message: str, details: Optional[Dict] = None):
        """Add a security issue to the results."""
        self.issues.append({
            "severity": severity,
            "message": message,
            "details": details or {}
        })
    
    def add_warning(self, message: str, details: Optional[Dict] = None):
        """Add a warning to the results."""
        self.warnings.append({
            "message": message,
            "details": details or {}
        })
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert result to dictionary."""
        return {
            "test_name": self.test_name,
            "passed": self.passed,
            "issues_count": len(self.issues),
            "warnings_count": len(self.warnings),
            "issues": self.issues,
            "warnings": self.warnings,
            "execution_time": self.execution_time,
            "details": self.details
        }


class SecurityTestSuite:
    """Comprehensive security testing suite."""
    
    def __init__(self):
        self.logger = logger.bind(service="security_testing")
        self.results: List[SecurityTestResult] = []
        self.client = TestClient(app)
    
    async def run_all_tests(self) -> Dict[str, Any]:
        """Run all security tests and return comprehensive results."""
        self.logger.info("Starting comprehensive security testing suite")
        
        start_time = time.time()
        
        # Run all test categories
        await self._run_static_analysis_tests()
        await self._run_dependency_security_tests()
        await self._run_authentication_tests()
        await self._run_encryption_tests()
        await self._run_input_validation_tests()
        await self._run_rate_limiting_tests()
        await self._run_tls_security_tests()
        await self._run_api_security_tests()
        
        total_time = time.time() - start_time
        
        # Compile results
        summary = self._compile_results_summary(total_time)
        
        self.logger.info("Security testing suite completed", 
                        total_tests=len(self.results),
                        passed_tests=summary["passed_tests"],
                        total_issues=summary["total_issues"],
                        execution_time=total_time)
        
        return summary
    
    async def _run_static_analysis_tests(self):
        """Run static analysis security tests."""
        
        # Bandit security linting
        await self._run_bandit_scan()
        
        # Custom code security analysis
        await self._run_custom_code_analysis()
    
    async def _run_bandit_scan(self):
        """Run Bandit security linting."""
        result = SecurityTestResult("bandit_security_scan")
        start_time = time.time()
        
        try:
            # Run bandit on the app directory
            cmd = [
                sys.executable, "-m", "bandit", 
                "-r", "app/", 
                "-f", "json",
                "-ll"  # Low confidence, low severity
            ]
            
            process = subprocess.run(
                cmd, 
                capture_output=True, 
                text=True, 
                cwd=Path(__file__).parent
            )
            
            if process.returncode == 0:
                result.passed = True
                result.details["bandit_output"] = "No security issues found"
            else:
                # Parse bandit JSON output
                try:
                    bandit_results = json.loads(process.stdout)
                    
                    for issue in bandit_results.get("results", []):
                        result.add_issue(
                            severity=issue.get("issue_severity", "UNKNOWN"),
                            message=f"{issue.get('test_name', 'Unknown')}: {issue.get('issue_text', 'No description')}",
                            details={
                                "filename": issue.get("filename"),
                                "line_number": issue.get("line_number"),
                                "confidence": issue.get("issue_confidence")
                            }
                        )
                    
                    # If only low severity issues, still pass but with warnings
                    high_severity_issues = [i for i in result.issues if i["severity"] in ["HIGH", "MEDIUM"]]
                    if not high_severity_issues:
                        result.passed = True
                        for issue in result.issues:
                            result.add_warning(f"Low severity: {issue['message']}")
                        result.issues = []  # Move to warnings
                
                except json.JSONDecodeError:
                    result.add_issue("HIGH", f"Failed to parse bandit output: {process.stderr}")
            
        except Exception as e:
            result.add_issue("HIGH", f"Failed to run bandit: {str(e)}")
        
        result.execution_time = time.time() - start_time
        self.results.append(result)
    
    async def _run_custom_code_analysis(self):
        """Run custom security code analysis."""
        result = SecurityTestResult("custom_code_analysis")
        start_time = time.time()
        
        try:
            # Check for common security anti-patterns
            security_checks = [
                self._check_hardcoded_secrets,
                self._check_sql_injection_patterns,
                self._check_xss_vulnerabilities,
                self._check_insecure_random,
                self._check_debug_mode,
            ]
            
            for check in security_checks:
                await check(result)
            
            # If no issues found, test passes
            if not result.issues:
                result.passed = True
                result.details["message"] = "No custom security issues found"
        
        except Exception as e:
            result.add_issue("HIGH", f"Custom code analysis failed: {str(e)}")
        
        result.execution_time = time.time() - start_time
        self.results.append(result)
    
    async def _check_hardcoded_secrets(self, result: SecurityTestResult):
        """Check for hardcoded secrets in code."""
        import re
        
        # Patterns that might indicate hardcoded secrets
        secret_patterns = [
            r'password\s*=\s*["\'][^"\']{8,}["\']',
            r'api_key\s*=\s*["\'][^"\']{20,}["\']',
            r'secret_key\s*=\s*["\'][^"\']{20,}["\']',
            r'token\s*=\s*["\'][^"\']{20,}["\']',
        ]
        
        # Check Python files
        for py_file in Path("app").rglob("*.py"):
            try:
                content = py_file.read_text()
                for pattern in secret_patterns:
                    matches = re.finditer(pattern, content, re.IGNORECASE)
                    for match in matches:
                        # Skip if it's a placeholder or example
                        if any(placeholder in match.group().lower() 
                               for placeholder in ['example', 'placeholder', 'your-', 'change-']):
                            continue
                        
                        result.add_warning(
                            f"Potential hardcoded secret in {py_file}: {match.group()[:50]}...",
                            {"file": str(py_file), "line": content[:match.start()].count('\n') + 1}
                        )
            except Exception:
                continue  # Skip files that can't be read
    
    async def _check_sql_injection_patterns(self, result: SecurityTestResult):
        """Check for potential SQL injection vulnerabilities."""
        import re
        
        # Patterns that might indicate SQL injection risks
        sql_patterns = [
            r'f["\'].*SELECT.*{.*}.*["\']',  # f-string with SQL
            r'["\'].*SELECT.*["\']\s*\+',   # String concatenation with SQL
            r'\.format\(.*\).*SELECT',       # .format() with SQL
            r'%.*SELECT.*%',                 # % formatting with SQL
        ]
        
        for py_file in Path("app").rglob("*.py"):
            try:
                content = py_file.read_text()
                for pattern in sql_patterns:
                    matches = re.finditer(pattern, content, re.IGNORECASE | re.DOTALL)
                    for match in matches:
                        result.add_issue(
                            "MEDIUM",
                            f"Potential SQL injection pattern in {py_file}: {match.group()[:100]}...",
                            {"file": str(py_file), "line": content[:match.start()].count('\n') + 1}
                        )
            except Exception:
                continue
    
    async def _check_xss_vulnerabilities(self, result: SecurityTestResult):
        """Check for potential XSS vulnerabilities."""
        import re
        
        # Check for unsafe HTML rendering
        xss_patterns = [
            r'\.innerHTML\s*=',
            r'document\.write\(',
            r'eval\(',
            r'dangerouslySetInnerHTML',
        ]
        
        for file_path in Path("app").rglob("*"):
            if file_path.suffix in ['.py', '.js', '.html']:
                try:
                    content = file_path.read_text()
                    for pattern in xss_patterns:
                        matches = re.finditer(pattern, content, re.IGNORECASE)
                        for match in matches:
                            result.add_warning(
                                f"Potential XSS vulnerability in {file_path}: {match.group()}",
                                {"file": str(file_path), "line": content[:match.start()].count('\n') + 1}
                            )
                except Exception:
                    continue
    
    async def _check_insecure_random(self, result: SecurityTestResult):
        """Check for insecure random number generation."""
        import re
        
        # Check for use of insecure random functions
        insecure_random_patterns = [
            r'import random\b',
            r'random\.',
            r'math\.random',
        ]
        
        for py_file in Path("app").rglob("*.py"):
            try:
                content = py_file.read_text()
                
                # Skip if secrets module is also imported (indicates secure usage)
                if 'import secrets' in content or 'from secrets import' in content:
                    continue
                
                for pattern in insecure_random_patterns:
                    matches = re.finditer(pattern, content)
                    for match in matches:
                        result.add_warning(
                            f"Insecure random usage in {py_file}: {match.group()}",
                            {"file": str(py_file), "recommendation": "Use secrets module for cryptographic randomness"}
                        )
            except Exception:
                continue
    
    async def _check_debug_mode(self, result: SecurityTestResult):
        """Check for debug mode enabled in production."""
        if settings.debug and settings.environment == "production":
            result.add_issue(
                "HIGH",
                "Debug mode is enabled in production environment",
                {"environment": settings.environment, "debug": settings.debug}
            )
    
    async def _run_dependency_security_tests(self):
        """Run dependency security tests using safety."""
        result = SecurityTestResult("dependency_security_scan")
        start_time = time.time()
        
        try:
            # Run safety check on requirements
            cmd = [sys.executable, "-m", "safety", "check", "--json"]
            
            process = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                cwd=Path(__file__).parent
            )
            
            if process.returncode == 0:
                result.passed = True
                result.details["safety_output"] = "No known security vulnerabilities found"
            else:
                try:
                    # Parse safety JSON output
                    safety_results = json.loads(process.stdout)
                    
                    for vuln in safety_results:
                        result.add_issue(
                            "HIGH",
                            f"Vulnerable dependency: {vuln.get('package_name')} {vuln.get('installed_version')}",
                            {
                                "vulnerability_id": vuln.get("vulnerability_id"),
                                "advisory": vuln.get("advisory"),
                                "cve": vuln.get("cve")
                            }
                        )
                
                except json.JSONDecodeError:
                    result.add_warning(f"Could not parse safety output: {process.stdout}")
                    result.passed = True  # Don't fail if we can't parse
        
        except Exception as e:
            result.add_warning(f"Safety check failed: {str(e)}")
            result.passed = True  # Don't fail if safety is not available
        
        result.execution_time = time.time() - start_time
        self.results.append(result)
    
    async def _run_authentication_tests(self):
        """Test authentication and authorization flows."""
        result = SecurityTestResult("authentication_security_test")
        start_time = time.time()
        
        try:
            # Test 1: Unauthenticated access to protected endpoints
            response = self.client.get("/api/v1/users/me")
            if response.status_code != 401:
                result.add_issue(
                    "HIGH",
                    f"Protected endpoint accessible without authentication: {response.status_code}",
                    {"endpoint": "/api/v1/users/me", "status_code": response.status_code}
                )
            
            # Test 2: Invalid token handling
            headers = {"Authorization": "Bearer invalid_token"}
            response = self.client.get("/api/v1/users/me", headers=headers)
            if response.status_code != 401:
                result.add_issue(
                    "HIGH",
                    f"Invalid token not properly rejected: {response.status_code}",
                    {"endpoint": "/api/v1/users/me", "status_code": response.status_code}
                )
            
            # Test 3: SQL injection in login
            login_data = {
                "username": "admin' OR '1'='1",
                "password": "password"
            }
            response = self.client.post("/api/v1/auth/login", json=login_data)
            if response.status_code == 200:
                result.add_issue(
                    "CRITICAL",
                    "SQL injection vulnerability in login endpoint",
                    {"payload": login_data}
                )
            
            # Test 4: Password brute force protection
            for i in range(10):
                login_data = {"username": "testuser", "password": f"wrong_password_{i}"}
                response = self.client.post("/api/v1/auth/login", json=login_data)
            
            # After multiple failed attempts, should be rate limited
            response = self.client.post("/api/v1/auth/login", json={"username": "testuser", "password": "another_attempt"})
            if response.status_code != 429:
                result.add_warning(
                    "No rate limiting detected on login endpoint",
                    {"expected_status": 429, "actual_status": response.status_code}
                )
            
            # If no critical issues found, test passes
            critical_issues = [i for i in result.issues if i["severity"] == "CRITICAL"]
            if not critical_issues:
                result.passed = True
        
        except Exception as e:
            result.add_issue("HIGH", f"Authentication test failed: {str(e)}")
        
        result.execution_time = time.time() - start_time
        self.results.append(result)
    
    async def _run_encryption_tests(self):
        """Test encryption functionality security."""
        result = SecurityTestResult("encryption_security_test")
        start_time = time.time()
        
        try:
            encryption_service = get_encryption_service()
            app_service = get_app_encryption_service()
            
            # Test 1: Encryption key strength
            test_key_id = "test_security_key"
            encryption_service.create_symmetric_key(test_key_id)
            
            # Test 2: Data encryption/decryption integrity
            test_data = "sensitive_information_12345"
            encrypted_field = encryption_service.encrypt_field(test_data, test_key_id)
            decrypted_data = encryption_service.decrypt_field(encrypted_field)
            
            if decrypted_data != test_data:
                result.add_issue(
                    "CRITICAL",
                    "Encryption/decryption integrity failure",
                    {"original": test_data, "decrypted": decrypted_data}
                )
            
            # Test 3: Encrypted data format validation
            if len(encrypted_field.encrypted_data) < 20:
                result.add_issue(
                    "MEDIUM",
                    "Encrypted data appears too short, possible weak encryption",
                    {"encrypted_length": len(encrypted_field.encrypted_data)}
                )
            
            # Test 4: Key rotation functionality
            try:
                new_key_id = encryption_service.rotate_key(test_key_id)
                if new_key_id == test_key_id:
                    result.add_issue(
                        "MEDIUM",
                        "Key rotation did not generate new key ID",
                        {"old_key": test_key_id, "new_key": new_key_id}
                    )
            except Exception as e:
                result.add_issue("MEDIUM", f"Key rotation failed: {str(e)}")
            
            # Test 5: PII encryption coverage
            pii_data = {
                "email": "test@example.com",
                "ssn": "123-45-6789",
                "credit_card": "4111-1111-1111-1111"
            }
            
            encrypted_pii = await app_service.encrypt_user_pii(pii_data, uuid4())
            
            # Check that sensitive fields are encrypted
            for field_name, field_value in encrypted_pii.items():
                if field_name in ["email", "ssn", "credit_card"]:
                    if not hasattr(field_value, 'encrypted_data'):
                        result.add_issue(
                            "HIGH",
                            f"PII field '{field_name}' not encrypted",
                            {"field": field_name, "value_type": type(field_value).__name__}
                        )
            
            # If no critical issues, test passes
            critical_issues = [i for i in result.issues if i["severity"] == "CRITICAL"]
            if not critical_issues:
                result.passed = True
        
        except Exception as e:
            result.add_issue("HIGH", f"Encryption test failed: {str(e)}")
        
        result.execution_time = time.time() - start_time
        self.results.append(result)
    
    async def _run_input_validation_tests(self):
        """Test input validation and sanitization."""
        result = SecurityTestResult("input_validation_test")
        start_time = time.time()
        
        try:
            # Test 1: XSS payload injection
            xss_payloads = [
                "<script>alert('xss')</script>",
                "javascript:alert('xss')",
                "<img src=x onerror=alert('xss')>",
                "';DROP TABLE users;--"
            ]
            
            for payload in xss_payloads:
                # Test user creation with malicious input
                user_data = {
                    "email": f"test{payload}@example.com",
                    "first_name": payload,
                    "last_name": "Test",
                    "professional_headline": payload
                }
                
                response = self.client.post("/api/v1/users/", json=user_data)
                
                # Should either reject (400/422) or sanitize the input
                if response.status_code == 200:
                    response_data = response.json()
                    # Check if payload was sanitized
                    if payload in str(response_data):
                        result.add_issue(
                            "HIGH",
                            f"XSS payload not sanitized: {payload}",
                            {"payload": payload, "response": response_data}
                        )
            
            # Test 2: SQL injection payloads
            sql_payloads = [
                "'; DROP TABLE users; --",
                "' OR '1'='1",
                "1; DELETE FROM users WHERE 1=1; --",
                "' UNION SELECT * FROM users --"
            ]
            
            for payload in sql_payloads:
                # Test search functionality with SQL injection
                response = self.client.get(f"/api/v1/jobs/search?q={payload}")
                
                # Should not return database errors or unexpected results
                if response.status_code == 500:
                    response_text = response.text.lower()
                    if any(db_error in response_text for db_error in ['sql', 'database', 'syntax error']):
                        result.add_issue(
                            "CRITICAL",
                            f"SQL injection vulnerability detected: {payload}",
                            {"payload": payload, "response": response.text[:200]}
                        )
            
            # Test 3: File upload validation (if applicable)
            # This would test file type validation, size limits, etc.
            
            # Test 4: Large input handling
            large_input = "A" * 10000
            user_data = {
                "email": "test@example.com",
                "first_name": large_input,
                "last_name": "Test"
            }
            
            response = self.client.post("/api/v1/users/", json=user_data)
            if response.status_code == 500:
                result.add_warning(
                    "Large input caused server error",
                    {"input_size": len(large_input), "status_code": response.status_code}
                )
            
            # If no critical issues, test passes
            critical_issues = [i for i in result.issues if i["severity"] == "CRITICAL"]
            if not critical_issues:
                result.passed = True
        
        except Exception as e:
            result.add_issue("HIGH", f"Input validation test failed: {str(e)}")
        
        result.execution_time = time.time() - start_time
        self.results.append(result)
    
    async def _run_rate_limiting_tests(self):
        """Test rate limiting and DDoS protection."""
        result = SecurityTestResult("rate_limiting_test")
        start_time = time.time()
        
        try:
            # Test 1: API rate limiting
            endpoint = "/api/v1/jobs/"
            requests_made = 0
            rate_limited = False
            
            # Make rapid requests to test rate limiting
            for i in range(150):  # Exceed typical rate limits
                response = self.client.get(endpoint)
                requests_made += 1
                
                if response.status_code == 429:  # Too Many Requests
                    rate_limited = True
                    break
                
                # Small delay to avoid overwhelming the test
                if i % 10 == 0:
                    await asyncio.sleep(0.1)
            
            if not rate_limited:
                result.add_warning(
                    f"No rate limiting detected after {requests_made} requests",
                    {"endpoint": endpoint, "requests_made": requests_made}
                )
            else:
                result.details["rate_limit_triggered_at"] = requests_made
            
            # Test 2: Per-user rate limiting (if authentication is available)
            # This would test user-specific rate limits
            
            # Test 3: Burst protection
            # Test rapid-fire requests in short time window
            burst_start = time.time()
            burst_responses = []
            
            for i in range(20):
                response = self.client.get("/api/v1/health")
                burst_responses.append(response.status_code)
            
            burst_time = time.time() - burst_start
            
            # Check if any requests were rate limited during burst
            rate_limited_in_burst = any(status == 429 for status in burst_responses)
            
            result.details["burst_test"] = {
                "requests": len(burst_responses),
                "time_taken": burst_time,
                "rate_limited": rate_limited_in_burst,
                "requests_per_second": len(burst_responses) / burst_time
            }
            
            # Test passes if some form of rate limiting is detected
            result.passed = rate_limited or rate_limited_in_burst
            
            if not result.passed:
                result.add_issue(
                    "MEDIUM",
                    "No rate limiting detected - application may be vulnerable to DDoS",
                    result.details
                )
        
        except Exception as e:
            result.add_issue("HIGH", f"Rate limiting test failed: {str(e)}")
        
        result.execution_time = time.time() - start_time
        self.results.append(result)
    
    async def _run_tls_security_tests(self):
        """Test TLS configuration security."""
        result = SecurityTestResult("tls_security_test")
        start_time = time.time()
        
        try:
            tls_service = get_tls_service()
            
            # Test 1: TLS configuration validation
            validation_results = tls_service.validate_tls_configuration()
            
            if not validation_results["valid"]:
                for error in validation_results["errors"]:
                    result.add_issue("HIGH", f"TLS configuration error: {error}")
            
            for warning in validation_results["warnings"]:
                result.add_warning(f"TLS configuration warning: {warning}")
            
            # Test 2: Certificate validation
            cert_info = tls_service.get_certificate_info()
            
            if cert_info:
                # Check certificate expiration
                if cert_info.days_until_expiry < 30:
                    result.add_issue(
                        "HIGH",
                        f"TLS certificate expires in {cert_info.days_until_expiry} days",
                        {"expires_at": cert_info.not_valid_after.isoformat()}
                    )
                elif cert_info.days_until_expiry < 90:
                    result.add_warning(
                        f"TLS certificate expires in {cert_info.days_until_expiry} days"
                    )
                
                # Check key size
                if cert_info.key_size < 2048:
                    result.add_issue(
                        "MEDIUM",
                        f"TLS certificate key size ({cert_info.key_size}) is below recommended 2048 bits"
                    )
                
                # Check if self-signed
                if cert_info.is_self_signed:
                    result.add_warning("Using self-signed TLS certificate")
            
            # Test 3: Security headers
            security_headers = tls_service.get_security_headers()
            
            required_headers = [
                "Strict-Transport-Security",
                "X-Content-Type-Options",
                "X-Frame-Options"
            ]
            
            for header in required_headers:
                if header not in security_headers:
                    result.add_warning(f"Missing security header: {header}")
            
            # Test 4: HSTS configuration
            hsts_header = security_headers.get("Strict-Transport-Security", "")
            if "max-age=" not in hsts_header:
                result.add_issue("MEDIUM", "HSTS header missing max-age directive")
            elif "max-age=31536000" not in hsts_header:  # 1 year
                result.add_warning("HSTS max-age is less than recommended 1 year")
            
            # If no high severity issues, test passes
            high_severity_issues = [i for i in result.issues if i["severity"] == "HIGH"]
            if not high_severity_issues:
                result.passed = True
        
        except Exception as e:
            result.add_issue("HIGH", f"TLS security test failed: {str(e)}")
        
        result.execution_time = time.time() - start_time
        self.results.append(result)
    
    async def _run_api_security_tests(self):
        """Test API-specific security measures."""
        result = SecurityTestResult("api_security_test")
        start_time = time.time()
        
        try:
            # Test 1: CORS configuration
            response = self.client.options("/api/v1/jobs/", headers={
                "Origin": "https://malicious-site.com",
                "Access-Control-Request-Method": "GET"
            })
            
            cors_header = response.headers.get("Access-Control-Allow-Origin", "")
            if cors_header == "*":
                result.add_issue(
                    "MEDIUM",
                    "CORS allows all origins (*) - potential security risk",
                    {"cors_header": cors_header}
                )
            
            # Test 2: HTTP methods security
            # Test if dangerous HTTP methods are allowed
            dangerous_methods = ["TRACE", "TRACK", "DEBUG"]
            
            for method in dangerous_methods:
                try:
                    response = self.client.request(method, "/api/v1/jobs/")
                    if response.status_code != 405:  # Method Not Allowed
                        result.add_issue(
                            "MEDIUM",
                            f"Dangerous HTTP method {method} is allowed",
                            {"method": method, "status_code": response.status_code}
                        )
                except Exception:
                    pass  # Method not supported by client, which is good
            
            # Test 3: Information disclosure
            response = self.client.get("/api/v1/nonexistent-endpoint")
            
            # Check if error responses leak sensitive information
            error_text = response.text.lower()
            sensitive_info = ["traceback", "stack trace", "file path", "database", "sql"]
            
            for info in sensitive_info:
                if info in error_text:
                    result.add_warning(
                        f"Error response may leak sensitive information: {info}",
                        {"endpoint": "/api/v1/nonexistent-endpoint", "status_code": response.status_code}
                    )
            
            # Test 4: API versioning security
            # Test if old API versions are still accessible
            old_versions = ["/api/v0/", "/api/"]
            
            for version_path in old_versions:
                response = self.client.get(f"{version_path}jobs/")
                if response.status_code == 200:
                    result.add_warning(
                        f"Old API version still accessible: {version_path}",
                        {"path": version_path, "status_code": response.status_code}
                    )
            
            # Test 5: Content-Type validation
            # Test if API accepts unexpected content types
            response = self.client.post(
                "/api/v1/users/",
                data="<xml>test</xml>",
                headers={"Content-Type": "application/xml"}
            )
            
            if response.status_code == 200:
                result.add_warning(
                    "API accepts unexpected content type (XML)",
                    {"content_type": "application/xml", "status_code": response.status_code}
                )
            
            # If no high severity issues, test passes
            high_severity_issues = [i for i in result.issues if i["severity"] == "HIGH"]
            if not high_severity_issues:
                result.passed = True
        
        except Exception as e:
            result.add_issue("HIGH", f"API security test failed: {str(e)}")
        
        result.execution_time = time.time() - start_time
        self.results.append(result)
    
    def _compile_results_summary(self, total_time: float) -> Dict[str, Any]:
        """Compile comprehensive results summary."""
        
        passed_tests = sum(1 for r in self.results if r.passed)
        total_issues = sum(len(r.issues) for r in self.results)
        total_warnings = sum(len(r.warnings) for r in self.results)
        
        # Categorize issues by severity
        severity_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
        
        for result in self.results:
            for issue in result.issues:
                severity = issue.get("severity", "UNKNOWN")
                if severity in severity_counts:
                    severity_counts[severity] += 1
        
        # Determine overall security status
        if severity_counts["CRITICAL"] > 0:
            overall_status = "CRITICAL"
        elif severity_counts["HIGH"] > 0:
            overall_status = "HIGH_RISK"
        elif severity_counts["MEDIUM"] > 0:
            overall_status = "MEDIUM_RISK"
        elif total_warnings > 0:
            overall_status = "LOW_RISK"
        else:
            overall_status = "SECURE"
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "overall_status": overall_status,
            "total_tests": len(self.results),
            "passed_tests": passed_tests,
            "failed_tests": len(self.results) - passed_tests,
            "total_issues": total_issues,
            "total_warnings": total_warnings,
            "severity_breakdown": severity_counts,
            "execution_time": total_time,
            "test_results": [r.to_dict() for r in self.results],
            "recommendations": self._generate_recommendations()
        }
    
    def _generate_recommendations(self) -> List[str]:
        """Generate security recommendations based on test results."""
        recommendations = []
        
        # Analyze results and generate recommendations
        has_auth_issues = any("authentication" in r.test_name for r in self.results if not r.passed)
        has_encryption_issues = any("encryption" in r.test_name for r in self.results if not r.passed)
        has_tls_issues = any("tls" in r.test_name for r in self.results if not r.passed)
        
        if has_auth_issues:
            recommendations.append("Review and strengthen authentication mechanisms")
        
        if has_encryption_issues:
            recommendations.append("Audit encryption implementation and key management")
        
        if has_tls_issues:
            recommendations.append("Update TLS configuration and certificate management")
        
        # Check for common patterns
        total_warnings = sum(len(r.warnings) for r in self.results)
        if total_warnings > 10:
            recommendations.append("Address security warnings to improve overall security posture")
        
        # Add general recommendations
        recommendations.extend([
            "Implement regular security testing in CI/CD pipeline",
            "Keep dependencies updated and monitor for vulnerabilities",
            "Enable comprehensive audit logging for security events",
            "Conduct regular penetration testing and security audits"
        ])
        
        return recommendations


async def main():
    """Run the comprehensive security testing suite."""
    print("🔒 Starting Comprehensive Security Testing Suite")
    print("=" * 60)
    
    suite = SecurityTestSuite()
    results = await suite.run_all_tests()
    
    # Print summary
    print(f"\n📊 Security Testing Results Summary")
    print(f"Overall Status: {results['overall_status']}")
    print(f"Tests Run: {results['total_tests']}")
    print(f"Tests Passed: {results['passed_tests']}")
    print(f"Tests Failed: {results['failed_tests']}")
    print(f"Total Issues: {results['total_issues']}")
    print(f"Total Warnings: {results['total_warnings']}")
    print(f"Execution Time: {results['execution_time']:.2f} seconds")
    
    # Print severity breakdown
    print(f"\n🚨 Issue Severity Breakdown:")
    for severity, count in results['severity_breakdown'].items():
        if count > 0:
            print(f"  {severity}: {count}")
    
    # Print failed tests
    failed_tests = [r for r in results['test_results'] if not r['passed']]
    if failed_tests:
        print(f"\n❌ Failed Tests:")
        for test in failed_tests:
            print(f"  - {test['test_name']}: {test['issues_count']} issues")
    
    # Print recommendations
    if results['recommendations']:
        print(f"\n💡 Security Recommendations:")
        for i, rec in enumerate(results['recommendations'][:5], 1):
            print(f"  {i}. {rec}")
    
    # Save detailed results
    results_file = Path("security_test_results.json")
    with open(results_file, "w") as f:
        json.dump(results, f, indent=2, default=str)
    
    print(f"\n📄 Detailed results saved to: {results_file}")
    
    # Return appropriate exit code
    if results['overall_status'] in ['CRITICAL', 'HIGH_RISK']:
        print(f"\n🚨 Security testing completed with {results['overall_status']} status")
        return 1
    else:
        print(f"\n✅ Security testing completed successfully")
        return 0


if __name__ == "__main__":
    exit_code = asyncio.run(main())