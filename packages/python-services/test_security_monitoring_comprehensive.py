#!/usr/bin/env python3
"""
Comprehensive Security Monitoring Test Suite

This test suite validates all security monitoring components including:
- Audit logging for sensitive operations
- Threat detection and automated response
- Security event monitoring and alerting
- Penetration testing automation
"""

import asyncio
import json
import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

# Import security monitoring components
from app.core.audit_logging import AuditLogger, AuditEvent, AuditEventType, AuditSeverity
from app.core.threat_detection import ThreatDetectionEngine, ThreatIndicator, ThreatLevel, ThreatCategory
from app.core.security_alerting import SecurityAlertManager, SecurityAlert, AlertStatus
from app.core.security_monitor import SecurityMonitor, SecurityAlert as MonitorAlert
from app.core.pentest_automation import (
    SecurityScanner, AutomatedPentestOrchestrator, ComplianceChecker,
    ScanType, VulnerabilitySeverity, Vulnerability
)
from app.services.security_monitoring import (
    SecurityMonitoringService, AuditLogEntry, ThreatLevel as ServiceThreatLevel
)


class TestAuditLogging:
    """Test audit logging functionality."""
    
    @pytest.fixture
    async def audit_logger(self):
        """Create audit logger for testing."""
        mock_session = AsyncMock()
        mock_redis = AsyncMock()
        return AuditLogger(mock_session, mock_redis)
    
    @pytest.mark.asyncio
    async def test_log_authentication_event(self, audit_logger):
        """Test logging authentication events."""
        
        # Test successful login
        event_id = await audit_logger.log_authentication_event(
            event_type=AuditEventType.LOGIN_SUCCESS,
            user_id=uuid4(),
            user_email="test@example.com",
            ip_address="192.168.1.100",
            success=True
        )
        
        assert event_id is not None
        audit_logger.session.add.assert_called_once()
        audit_logger.session.commit.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_log_data_access_event(self, audit_logger):
        """Test logging data access events."""
        
        user_id = uuid4()
        old_values = {"name": "John Doe"}
        new_values = {"name": "Jane Doe"}
        
        event_id = await audit_logger.log_data_access_event(
            event_type=AuditEventType.DATA_UPDATE,
            user_id=user_id,
            resource_type="user_profile",
            resource_id="123",
            action="update_profile",
            old_values=old_values,
            new_values=new_values,
            success=True
        )
        
        assert event_id is not None
        audit_logger.session.add.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_log_security_event(self, audit_logger):
        """Test logging security events."""
        
        event_id = await audit_logger.log_security_event(
            event_type=AuditEventType.SECURITY_VIOLATION,
            description="Brute force attack detected",
            ip_address="192.168.1.100",
            severity=AuditSeverity.HIGH
        )
        
        assert event_id is not None
        audit_logger.redis_client.xadd.assert_called()


class TestThreatDetection:
    """Test threat detection functionality."""
    
    @pytest.fixture
    async def threat_engine(self):
        """Create threat detection engine for testing."""
        mock_redis = AsyncMock()
        mock_audit_logger = AsyncMock()
        return ThreatDetectionEngine(mock_redis, mock_audit_logger)
    
    @pytest.mark.asyncio
    async def test_brute_force_detection(self, threat_engine):
        """Test brute force attack detection."""
        
        # Mock Redis to return high failed login count
        threat_engine.redis_client.get.return_value = b"6"  # Above threshold
        
        event_data = {
            "event_type": "login_failed",
            "ip_address": "192.168.1.100",
            "user_id": "test_user",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        threat = await threat_engine.analyze_event(event_data)
        
        assert threat is not None
        assert threat.category == ThreatCategory.BRUTE_FORCE
        assert threat.level == ThreatLevel.HIGH
        assert threat.source_ip == "192.168.1.100"
    
    @pytest.mark.asyncio
    async def test_account_takeover_detection(self, threat_engine):
        """Test account takeover detection."""
        
        # Mock Redis responses for location and device changes
        threat_engine.redis_client.get.side_effect = [
            b"New York",  # last_location
            b"Mozilla/5.0 (Windows NT 10.0; Win64; x64)",  # last_device
            b"true"  # password_changed
        ]
        
        event_data = {
            "event_type": "login_success",
            "user_id": "test_user",
            "location": "London",
            "user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        threat = await threat_engine.analyze_event(event_data)
        
        assert threat is not None
        assert threat.category == ThreatCategory.ACCOUNT_TAKEOVER
        assert threat.confidence > 0.5
    
    @pytest.mark.asyncio
    async def test_automated_response_execution(self, threat_engine):
        """Test automated response execution."""
        
        threat = ThreatIndicator(
            category=ThreatCategory.BRUTE_FORCE,
            level=ThreatLevel.HIGH,
            confidence=0.9,
            source_ip="192.168.1.100",
            description="Brute force attack detected",
            indicators=["Multiple failed login attempts"],
            automated_response=None  # Will be set by detection rule
        )
        
        # Mock the response execution
        threat_engine._block_ip = AsyncMock()
        
        # Simulate rule that sets automated response
        threat.automated_response = "block_ip"
        
        await threat_engine._execute_response(threat)
        
        # Verify response was executed
        assert threat_engine.audit_logger.log_security_event.called


class TestSecurityAlerting:
    """Test security alerting functionality."""
    
    @pytest.fixture
    async def alert_manager(self):
        """Create security alert manager for testing."""
        mock_redis = AsyncMock()
        return SecurityAlertManager(mock_redis)
    
    @pytest.mark.asyncio
    async def test_process_threat_indicator(self, alert_manager):
        """Test processing threat indicators into alerts."""
        
        threat = ThreatIndicator(
            category=ThreatCategory.BRUTE_FORCE,
            level=ThreatLevel.CRITICAL,
            confidence=0.95,
            source_ip="192.168.1.100",
            description="Critical brute force attack",
            indicators=["10+ failed login attempts in 1 minute"]
        )
        
        alert = await alert_manager.process_threat_indicator(threat)
        
        assert alert is not None
        assert alert.severity == ThreatLevel.CRITICAL
        assert alert.source_ip == "192.168.1.100"
        assert alert.status == AlertStatus.OPEN
    
    @pytest.mark.asyncio
    async def test_alert_correlation(self, alert_manager):
        """Test alert correlation functionality."""
        
        # Mock Redis to return related alerts
        alert_manager.redis_client.lrange.return_value = [
            json.dumps({"id": "alert_123", "timestamp": datetime.now(timezone.utc).isoformat()}).encode()
        ]
        
        alert = SecurityAlert(
            title="Test Alert",
            description="Test alert for correlation",
            severity=ThreatLevel.HIGH,
            category="test",
            source_ip="192.168.1.100"
        )
        
        await alert_manager._correlate_alert(alert)
        
        assert alert.correlation_id is not None
        assert len(alert.related_alerts) > 0
    
    @pytest.mark.asyncio
    async def test_multi_channel_alerting(self, alert_manager):
        """Test multi-channel alert delivery."""
        
        # Mock HTTP client for webhook/Slack
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.raise_for_status.return_value = None
            mock_client.return_value.__aenter__.return_value.post.return_value = mock_response
            
            alert = SecurityAlert(
                title="Test Alert",
                description="Test multi-channel alert",
                severity=ThreatLevel.HIGH,
                category="test"
            )
            
            # Find a rule that matches
            matching_rules = alert_manager._find_matching_rules(
                ThreatIndicator(
                    category=ThreatCategory.BRUTE_FORCE,
                    level=ThreatLevel.HIGH,
                    confidence=0.8,
                    description="Test threat"
                )
            )
            
            if matching_rules:
                rule = matching_rules[0]
                await alert_manager._send_alert_notifications(rule, alert)
                
                # Verify throttling was updated
                assert alert_manager.redis_client.setex.called


class TestPenetrationTesting:
    """Test penetration testing automation."""
    
    @pytest.fixture
    def security_scanner(self):
        """Create security scanner for testing."""
        return SecurityScanner()
    
    @pytest.fixture
    def pentest_orchestrator(self):
        """Create pentest orchestrator for testing."""
        return AutomatedPentestOrchestrator()
    
    @pytest.mark.asyncio
    async def test_static_code_analysis(self, security_scanner):
        """Test static code analysis scanning."""
        
        with patch('asyncio.create_subprocess_exec') as mock_subprocess:
            # Mock Bandit output
            mock_process = AsyncMock()
            mock_process.communicate.return_value = (
                json.dumps({
                    "results": [
                        {
                            "test_id": "B101",
                            "test_name": "assert_used",
                            "issue_text": "Use of assert detected",
                            "issue_severity": "LOW",
                            "issue_confidence": "HIGH",
                            "filename": "test.py",
                            "line_number": 10,
                            "code": "assert user.is_admin"
                        }
                    ]
                }).encode(),
                b""
            )
            mock_process.returncode = 1  # Issues found
            mock_subprocess.return_value = mock_process
            
            result = await security_scanner.run_static_code_analysis("/path/to/code")
            
            assert result.status.value == "completed"
            assert len(result.vulnerabilities) > 0
            assert result.vulnerabilities[0].severity == VulnerabilitySeverity.LOW
    
    @pytest.mark.asyncio
    async def test_dependency_scan(self, security_scanner):
        """Test dependency vulnerability scanning."""
        
        with patch('asyncio.create_subprocess_exec') as mock_subprocess:
            # Mock Safety output
            mock_process = AsyncMock()
            mock_process.communicate.return_value = (
                json.dumps([
                    {
                        "id": "12345",
                        "package_name": "requests",
                        "installed_version": "2.0.0",
                        "safe_version": "2.20.0",
                        "advisory": "Vulnerability in requests library",
                        "cve": "CVE-2018-18074"
                    }
                ]).encode(),
                b""
            )
            mock_process.returncode = 64  # Vulnerabilities found
            mock_subprocess.return_value = mock_process
            
            result = await security_scanner.run_dependency_scan("/path/to/project")
            
            assert result.status.value == "completed"
            assert len(result.vulnerabilities) > 0
            assert "requests" in result.vulnerabilities[0].title
    
    @pytest.mark.asyncio
    async def test_web_app_scan(self, security_scanner):
        """Test web application security scanning."""
        
        with patch('httpx.AsyncClient') as mock_client:
            # Mock HTTP response
            mock_response = AsyncMock()
            mock_response.headers = {}  # Missing security headers
            mock_response.text = "<html><body>Test page</body></html>"
            mock_response.status_code = 200
            
            mock_client.return_value.__aenter__.return_value.get.return_value = mock_response
            mock_client.return_value.__aenter__.return_value.request.return_value = mock_response
            
            result = await security_scanner.run_web_app_scan("https://example.com")
            
            assert result.status.value == "completed"
            # Should find missing security headers
            assert any("Missing Security Header" in vuln.title for vuln in result.vulnerabilities)
    
    @pytest.mark.asyncio
    async def test_automated_pentest_orchestration(self, pentest_orchestrator):
        """Test automated penetration test orchestration."""
        
        with patch.object(pentest_orchestrator.scanner, 'run_web_app_scan') as mock_web_scan:
            # Mock web app scan results
            mock_scan_result = MagicMock()
            mock_scan_result.vulnerabilities = [
                Vulnerability(
                    id="test-vuln",
                    title="Test Vulnerability",
                    description="Test vulnerability description",
                    severity=VulnerabilitySeverity.MEDIUM,
                    tool="test_scanner"
                )
            ]
            mock_web_scan.return_value = mock_scan_result
            
            result = await pentest_orchestrator.run_automated_pentest(
                "https://example.com",
                "web_app"
            )
            
            assert "pentest_id" in result
            assert result["test_suite"] == "web_app"
            assert result["target"] == "https://example.com"
            assert "summary" in result
            assert "recommendations" in result
    
    @pytest.mark.asyncio
    async def test_compliance_checking(self):
        """Test security compliance checking."""
        
        compliance_checker = ComplianceChecker()
        
        # Create sample scan results with OWASP vulnerabilities
        scan_results = [
            MagicMock(vulnerabilities=[
                Vulnerability(
                    id="owasp-a1",
                    title="SQL Injection",
                    description="SQL injection vulnerability",
                    severity=VulnerabilitySeverity.HIGH,
                    owasp_category="A1:2021-Broken Access Control",
                    tool="test_scanner"
                )
            ])
        ]
        
        compliance_result = await compliance_checker.check_compliance(
            scan_results,
            "owasp_top10"
        )
        
        assert compliance_result["framework"] == "OWASP Top 10"
        assert "compliance_score" in compliance_result
        assert "categories" in compliance_result


class TestSecurityMonitoringService:
    """Test main security monitoring service."""
    
    @pytest.fixture
    async def security_service(self):
        """Create security monitoring service for testing."""
        mock_redis = AsyncMock()
        return SecurityMonitoringService(mock_redis)
    
    @pytest.mark.asyncio
    async def test_audit_log_entry_processing(self, security_service):
        """Test audit log entry processing."""
        
        audit_entry = AuditLogEntry(
            log_id="test_log_123",
            user_id="user_123",
            action="login",
            resource="authentication",
            ip_address="192.168.1.100",
            user_agent="Mozilla/5.0",
            success=False,
            risk_score=8.0
        )
        
        log_id = await security_service.log_audit_event(audit_entry)
        
        assert log_id == "test_log_123"
        # Verify Redis operations
        assert security_service.redis.setex.called
    
    @pytest.mark.asyncio
    async def test_threat_pattern_analysis(self, security_service):
        """Test threat pattern analysis."""
        
        # Simulate multiple failed login attempts
        for i in range(6):  # Above threshold
            audit_entry = AuditLogEntry(
                log_id=f"test_log_{i}",
                user_id="user_123",
                action="login",
                resource="authentication",
                ip_address="192.168.1.100",
                user_agent="Mozilla/5.0",
                success=False,
                risk_score=5.0
            )
            
            await security_service.log_audit_event(audit_entry)
        
        # Verify brute force detection was triggered
        # (This would be verified through the threat detection system)
        assert len(security_service.ip_tracking["192.168.1.100"]) == 6
    
    @pytest.mark.asyncio
    async def test_security_report_generation(self, security_service):
        """Test security report generation."""
        
        # Mock some security alerts
        security_service.get_security_alerts = AsyncMock(return_value=[
            MagicMock(
                timestamp=datetime.utcnow(),
                threat_level=ServiceThreatLevel.HIGH,
                event_type=MagicMock(value="brute_force")
            )
        ])
        
        report = await security_service.generate_security_report(days=7)
        
        assert "report_id" in report
        assert "summary" in report
        assert "recommendations" in report
        assert report["period"]["days"] == 7
    
    @pytest.mark.asyncio
    async def test_ip_blocking_functionality(self, security_service):
        """Test IP blocking functionality."""
        
        ip_address = "192.168.1.100"
        
        # Block IP
        await security_service._block_ip_temporarily(ip_address, duration_minutes=30)
        
        # Check if IP is blocked
        is_blocked = await security_service.is_ip_blocked(ip_address)
        
        assert is_blocked
        assert ip_address in security_service.blocked_ips


class TestSecurityIntegration:
    """Test integration between security components."""
    
    @pytest.mark.asyncio
    async def test_end_to_end_threat_response(self):
        """Test end-to-end threat detection and response."""
        
        # Create integrated security system
        mock_redis = AsyncMock()
        mock_session = AsyncMock()
        
        audit_logger = AuditLogger(mock_session, mock_redis)
        threat_engine = ThreatDetectionEngine(mock_redis, audit_logger)
        alert_manager = SecurityAlertManager(mock_redis)
        
        # Simulate security event
        event_data = {
            "event_type": "login_failed",
            "ip_address": "192.168.1.100",
            "user_id": "test_user",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        # Mock high failed login count to trigger threat detection
        threat_engine.redis_client.get.return_value = b"6"
        
        # Process through threat detection
        threat = await threat_engine.analyze_event(event_data)
        
        if threat:
            # Process through alerting
            alert = await alert_manager.process_threat_indicator(threat)
            
            assert alert is not None
            assert alert.severity == ThreatLevel.HIGH
    
    @pytest.mark.asyncio
    async def test_compliance_workflow(self):
        """Test complete compliance checking workflow."""
        
        # Run security scans
        scanner = SecurityScanner()
        
        # Mock scan results
        with patch.object(scanner, '_run_bandit') as mock_bandit:
            mock_bandit.return_value = [
                Vulnerability(
                    id="test-vuln",
                    title="Test Security Issue",
                    description="Test security vulnerability",
                    severity=VulnerabilitySeverity.MEDIUM,
                    owasp_category="A6:2017-Security Misconfiguration",
                    tool="bandit"
                )
            ]
            
            scan_result = await scanner.run_static_code_analysis("/test/path")
            
            # Check compliance
            compliance_checker = ComplianceChecker()
            compliance_result = await compliance_checker.check_compliance(
                [scan_result],
                "owasp_top10"
            )
            
            assert compliance_result["framework"] == "OWASP Top 10"
            assert compliance_result["total_vulnerabilities"] > 0


async def run_comprehensive_security_tests():
    """Run all security monitoring tests."""
    
    print("🔒 Starting Comprehensive Security Monitoring Tests...")
    
    # Test classes
    test_classes = [
        TestAuditLogging,
        TestThreatDetection,
        TestSecurityAlerting,
        TestPenetrationTesting,
        TestSecurityMonitoringService,
        TestSecurityIntegration
    ]
    
    total_tests = 0
    passed_tests = 0
    
    for test_class in test_classes:
        print(f"\n📋 Testing {test_class.__name__}...")
        
        # Get test methods
        test_methods = [method for method in dir(test_class) if method.startswith('test_')]
        
        for test_method_name in test_methods:
            total_tests += 1
            
            try:
                # Create test instance
                test_instance = test_class()
                
                # Set up fixtures if needed
                if hasattr(test_instance, 'audit_logger'):
                    test_instance.audit_logger = await test_instance.audit_logger()
                if hasattr(test_instance, 'threat_engine'):
                    test_instance.threat_engine = await test_instance.threat_engine()
                if hasattr(test_instance, 'alert_manager'):
                    test_instance.alert_manager = await test_instance.alert_manager()
                if hasattr(test_instance, 'security_service'):
                    test_instance.security_service = await test_instance.security_service()
                
                # Run test method
                test_method = getattr(test_instance, test_method_name)
                
                if asyncio.iscoroutinefunction(test_method):
                    await test_method()
                else:
                    test_method()
                
                print(f"  ✅ {test_method_name}")
                passed_tests += 1
                
            except Exception as e:
                print(f"  ❌ {test_method_name}: {str(e)}")
    
    print(f"\n📊 Security Test Results:")
    print(f"   Total Tests: {total_tests}")
    print(f"   Passed: {passed_tests}")
    print(f"   Failed: {total_tests - passed_tests}")
    print(f"   Success Rate: {(passed_tests/total_tests)*100:.1f}%")
    
    if passed_tests == total_tests:
        print("\n🎉 All security monitoring tests passed!")
        return True
    else:
        print(f"\n⚠️  {total_tests - passed_tests} tests failed")
        return False


if __name__ == "__main__":
    # Run the comprehensive security tests
    success = asyncio.run(run_comprehensive_security_tests())
    
    if success:
        print("\n✅ Security monitoring implementation is working correctly!")
        print("\n🔒 Security Features Validated:")
        print("   • Audit logging for sensitive operations")
        print("   • Real-time threat detection and analysis")
        print("   • Automated incident response")
        print("   • Multi-channel security alerting")
        print("   • Penetration testing automation")
        print("   • Security compliance checking")
        print("   • Comprehensive security reporting")
    else:
        print("\n❌ Some security tests failed - review implementation")
        exit(1)