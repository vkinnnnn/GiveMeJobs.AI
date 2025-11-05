"""
Comprehensive test suite for security monitoring with Python tools.

This test suite validates:
- Audit logging for sensitive operations
- Threat detection and automated response
- Security event monitoring and alerting
- Penetration testing automation
"""

import asyncio
import json
import pytest
from datetime import datetime, timezone
from uuid import uuid4
from unittest.mock import AsyncMock, MagicMock, patch

from app.core.audit_logging import (
    AuditLogger, AuditEvent, AuditEventType, AuditSeverity
)
from app.core.security_monitor import SecurityMonitor, SecurityAlert
from app.core.threat_detection import (
    ThreatDetectionEngine, ThreatIndicator, ThreatLevel, ThreatCategory
)
from app.core.security_alerting import SecurityAlertManager, AlertStatus
from app.core.pentest_automation import (
    SecurityScanner, ScanType, ScanResult, Vulnerability, VulnerabilitySeverity
)


class TestAuditLogging:
    """Test audit logging functionality."""
    
    @pytest.fixture
    async def audit_logger(self):
        """Create audit logger with mocked dependencies."""
        session_mock = AsyncMock()
        redis_mock = AsyncMock()
        return AuditLogger(session_mock, redis_mock)
    
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
        audit_logger.redis_client.xadd.assert_called()
    
    @pytest.mark.asyncio
    async def test_log_data_access_event(self, audit_logger):
        """Test logging data access events."""
        
        user_id = uuid4()
        old_values = {"name": "John Doe"}
        new_values = {"name": "Jane Doe"}
        
        event_id = await audit_logger.log_data_access_event(
            event_type=AuditEventType.DATA_UPDATE,
            user_id=user_id,
            resource_type="user",
            resource_id=str(user_id),
            action="update_profile",
            old_values=old_values,
            new_values=new_values,
            ip_address="192.168.1.100"
        )
        
        assert event_id is not None
        audit_logger.session.add.assert_called_once()
        audit_logger.session.commit.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_log_security_event(self, audit_logger):
        """Test logging security events."""
        
        event_id = await audit_logger.log_security_event(
            event_type=AuditEventType.SECURITY_VIOLATION,
            description="Suspicious login attempt detected",
            ip_address="192.168.1.100",
            severity=AuditSeverity.HIGH,
            additional_data={"attempts": 5}
        )
        
        assert event_id is not None
        audit_logger.session.add.assert_called_once()
        audit_logger.redis_client.lpush.assert_called_with(
            "security_alerts", 
            pytest.any(str)
        )
    
    @pytest.mark.asyncio
    async def test_audit_event_validation(self, audit_logger):
        """Test audit event validation."""
        
        # Test with compliance tags
        event = AuditEvent(
            event_type=AuditEventType.DATA_READ,
            user_id=uuid4(),
            action="read_sensitive_data",
            description="User accessed sensitive data",
            compliance_tags=["gdpr", "hipaa"]
        )
        
        # Should not raise validation error
        audit_logger._validate_compliance(event)
        
        # Test missing required field for compliance
        event_invalid = AuditEvent(
            event_type=AuditEventType.DATA_READ,
            action="read_sensitive_data",
            description="User accessed sensitive data",
            compliance_tags=["gdpr"]  # Requires user_id
        )
        
        with pytest.raises(ValueError, match="Missing required field"):
            audit_logger._validate_compliance(event_invalid)


class TestSecurityMonitoring:
    """Test security monitoring functionality."""
    
    @pytest.fixture
    async def security_monitor(self):
        """Create security monitor with mocked Redis."""
        redis_mock = AsyncMock()
        return SecurityMonitor(redis_mock)
    
    @pytest.mark.asyncio
    async def test_brute_force_detection(self, security_monitor):
        """Test brute force attack detection."""
        
        # Mock Redis to return high failure count
        security_monitor.redis_client.incr.return_value = 6
        
        # Log failed login events
        for i in range(6):
            await security_monitor.log_security_event(
                event_type="login_failed",
                ip_address="192.168.1.100",
                additional_data={"username": f"user{i}"}
            )
        
        # Verify events were logged
        assert security_monitor.redis_client.lpush.call_count == 6
        
        # Verify Redis operations
        security_monitor.redis_client.incr.assert_called()
        security_monitor.redis_client.expire.assert_called()
    
    @pytest.mark.asyncio
    async def test_ip_blocking(self, security_monitor):
        """Test IP address blocking functionality."""
        
        ip_address = "192.168.1.100"
        
        # Block IP
        await security_monitor._block_ip_address(ip_address)
        
        # Verify IP was blocked
        security_monitor.redis_client.setex.assert_called_with(
            f"blocked_ip:{ip_address}",
            3600,
            "blocked"
        )
        
        # Test IP blocking check
        security_monitor.redis_client.get.return_value = "blocked"
        is_blocked = await security_monitor.is_ip_blocked(ip_address)
        assert is_blocked is True
    
    @pytest.mark.asyncio
    async def test_account_locking(self, security_monitor):
        """Test account locking functionality."""
        
        user_id = uuid4()
        
        # Lock account
        await security_monitor._lock_user_account(user_id)
        
        # Verify account was locked
        security_monitor.redis_client.setex.assert_called()
        
        # Test account lock check
        security_monitor.redis_client.get.return_value = "2023-01-01T12:00:00"
        is_locked = await security_monitor.is_account_locked(user_id)
        assert is_locked is True
    
    @pytest.mark.asyncio
    async def test_security_statistics(self, security_monitor):
        """Test security statistics generation."""
        
        # Mock Redis responses
        security_monitor.redis_client.llen.return_value = 100
        security_monitor.redis_client.keys.return_value = ["blocked_ip:1", "blocked_ip:2"]
        
        stats = await security_monitor.get_security_stats()
        
        assert "recent_events" in stats
        assert "blocked_ips" in stats
        assert "detection_rules" in stats
        assert stats["blocked_ips"] == 2


class TestThreatDetection:
    """Test threat detection functionality."""
    
    @pytest.fixture
    async def threat_engine(self):
        """Create threat detection engine with mocked dependencies."""
        redis_mock = AsyncMock()
        audit_logger_mock = AsyncMock()
        return ThreatDetectionEngine(redis_mock, audit_logger_mock)
    
    @pytest.mark.asyncio
    async def test_brute_force_rule_evaluation(self, threat_engine):
        """Test brute force detection rule."""
        
        # Mock Redis to return high failure count
        threat_engine.redis_client.get.return_value = b"6"
        
        event_data = {
            "event_type": "login_failed",
            "ip_address": "192.168.1.100",
            "user_agent": "Mozilla/5.0"
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
            b"Chrome/Windows",  # last_device
            b"true"  # password_changed
        ]
        
        event_data = {
            "event_type": "login_success",
            "user_id": str(uuid4()),
            "ip_address": "192.168.1.100",
            "location": "London",
            "user_agent": "Firefox/Linux"
        }
        
        threat = await threat_engine.analyze_event(event_data)
        
        assert threat is not None
        assert threat.category == ThreatCategory.ACCOUNT_TAKEOVER
        assert threat.confidence >= 0.5
    
    @pytest.mark.asyncio
    async def test_ml_anomaly_detection(self, threat_engine):
        """Test ML-based anomaly detection."""
        
        # Mock trained model
        threat_engine.model_trained = True
        threat_engine.anomaly_detector.predict.return_value = [-1]  # Anomaly
        threat_engine.anomaly_detector.decision_function.return_value = [-2.5]
        threat_engine.scaler.transform.return_value = [[0.1, 0.2, 0.3, 0.4, 0.5, 0.6]]
        
        event_data = {
            "event_type": "api_request",
            "user_id": str(uuid4()),
            "ip_address": "192.168.1.100",
            "user_agent": "Mozilla/5.0",
            "success": True,
            "session_duration": 3600
        }
        
        threat = await threat_engine.analyze_event(event_data)
        
        assert threat is not None
        assert threat.category == ThreatCategory.ANOMALOUS_BEHAVIOR
    
    @pytest.mark.asyncio
    async def test_threat_intelligence_correlation(self, threat_engine):
        """Test threat intelligence correlation."""
        
        # Add IP to known bad IPs
        threat_engine.known_bad_ips.add("192.168.1.100")
        
        event_data = {
            "event_type": "api_request",
            "ip_address": "192.168.1.100"
        }
        
        threat = await threat_engine.analyze_event(event_data)
        
        assert threat is not None
        assert threat.category == ThreatCategory.MALWARE
        assert threat.level == ThreatLevel.HIGH
    
    @pytest.mark.asyncio
    async def test_automated_response_execution(self, threat_engine):
        """Test automated response execution."""
        
        threat = ThreatIndicator(
            category=ThreatCategory.BRUTE_FORCE,
            level=ThreatLevel.HIGH,
            confidence=0.9,
            source_ip="192.168.1.100",
            description="Brute force attack detected",
            indicators=["Multiple failed logins"],
            recommended_actions=[],
            automated_response=None  # Will be set by rule
        )
        
        # Mock response handler
        threat_engine.response_handlers = {
            "block_ip": AsyncMock()
        }
        
        threat.automated_response = "block_ip"
        await threat_engine._execute_response(threat)
        
        # Verify audit logging was called
        threat_engine.audit_logger.log_security_event.assert_called_once()


class TestSecurityAlerting:
    """Test security alerting functionality."""
    
    @pytest.fixture
    async def alert_manager(self):
        """Create alert manager with mocked Redis."""
        redis_mock = AsyncMock()
        return SecurityAlertManager(redis_mock)
    
    @pytest.mark.asyncio
    async def test_alert_generation(self, alert_manager):
        """Test security alert generation."""
        
        threat = ThreatIndicator(
            category=ThreatCategory.BRUTE_FORCE,
            level=ThreatLevel.HIGH,
            confidence=0.9,
            source_ip="192.168.1.100",
            description="Brute force attack detected",
            indicators=["Multiple failed logins"],
            recommended_actions=[]
        )
        
        alert = await alert_manager.process_threat_indicator(threat)
        
        assert alert is not None
        assert alert.severity == ThreatLevel.HIGH
        assert alert.category == ThreatCategory.BRUTE_FORCE.value
        assert alert.source_ip == "192.168.1.100"
    
    @pytest.mark.asyncio
    async def test_alert_correlation(self, alert_manager):
        """Test alert correlation functionality."""
        
        # Mock Redis for correlation
        alert_manager.redis_client.lrange.return_value = [
            json.dumps({"id": str(uuid4()), "timestamp": "2023-01-01T12:00:00Z"})
        ]
        
        alert = SecurityAlert(
            title="Test Alert",
            description="Test description",
            severity=ThreatLevel.HIGH,
            category="test",
            source_ip="192.168.1.100"
        )
        
        await alert_manager._correlate_alert(alert)
        
        assert alert.correlation_id is not None
        assert len(alert.related_alerts) > 0
    
    @pytest.mark.asyncio
    async def test_alert_throttling(self, alert_manager):
        """Test alert throttling functionality."""
        
        from app.core.security_alerting import AlertRule, AlertChannel, ThreatLevel
        
        rule = AlertRule(
            id="test_rule",
            name="Test Rule",
            description="Test rule",
            conditions={"severity": ThreatLevel.HIGH},
            channels=[AlertChannel.EMAIL],
            throttle_minutes=5,
            max_alerts_per_hour=10
        )
        
        alert = SecurityAlert(
            title="Test Alert",
            description="Test description",
            severity=ThreatLevel.HIGH,
            category="test"
        )
        
        # Mock Redis to simulate recent alert
        alert_manager.redis_client.get.return_value = datetime.now(timezone.utc).isoformat().encode()
        
        should_send = await alert_manager._should_send_alert(rule, alert)
        assert should_send is False
        
        # Mock Redis to simulate no recent alert
        alert_manager.redis_client.get.return_value = None
        
        should_send = await alert_manager._should_send_alert(rule, alert)
        assert should_send is True
    
    @pytest.mark.asyncio
    async def test_alert_status_update(self, alert_manager):
        """Test alert status updates."""
        
        alert_id = uuid4()
        alert_data = {
            "id": str(alert_id),
            "title": "Test Alert",
            "description": "Test description",
            "severity": "high",
            "category": "test",
            "status": "open",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        # Mock Redis to return alert data
        alert_manager.redis_client.hget.return_value = json.dumps(alert_data)
        
        await alert_manager.update_alert_status(
            alert_id=alert_id,
            status=AlertStatus.ACKNOWLEDGED,
            assigned_to="security_analyst"
        )
        
        # Verify Redis update was called
        alert_manager.redis_client.hset.assert_called()


class TestPenetrationTesting:
    """Test penetration testing automation."""
    
    @pytest.fixture
    def security_scanner(self):
        """Create security scanner instance."""
        return SecurityScanner()
    
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
                            "code": "assert True"
                        }
                    ]
                }).encode(),
                b""
            )
            mock_process.returncode = 1
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
                        "advisory": "Security vulnerability in requests",
                        "cve": "CVE-2023-12345"
                    }
                ]).encode(),
                b""
            )
            mock_process.returncode = 64
            mock_subprocess.return_value = mock_process
            
            result = await security_scanner.run_dependency_scan("/path/to/project")
            
            assert result.status.value == "completed"
            assert len(result.vulnerabilities) > 0
            assert "requests" in result.vulnerabilities[0].title
    
    @pytest.mark.asyncio
    async def test_web_application_scan(self, security_scanner):
        """Test web application security scanning."""
        
        with patch('httpx.AsyncClient') as mock_client:
            # Mock HTTP response
            mock_response = MagicMock()
            mock_response.headers = {
                'Server': 'Apache/2.4.41'
                # Missing security headers
            }
            
            mock_client_instance = AsyncMock()
            mock_client_instance.get.return_value = mock_response
            mock_client_instance.request.return_value = mock_response
            mock_client.return_value.__aenter__.return_value = mock_client_instance
            
            result = await security_scanner.run_web_app_scan("https://example.com")
            
            assert result.status.value == "completed"
            assert len(result.vulnerabilities) > 0
            
            # Should detect missing security headers
            header_vulns = [v for v in result.vulnerabilities if "Missing Security Header" in v.title]
            assert len(header_vulns) > 0
    
    @pytest.mark.asyncio
    async def test_comprehensive_scan(self, security_scanner):
        """Test comprehensive security scanning."""
        
        with patch.object(security_scanner, 'run_static_code_analysis') as mock_static, \
             patch.object(security_scanner, 'run_dependency_scan') as mock_deps:
            
            # Mock scan results
            mock_static_result = ScanResult(
                scan_type=ScanType.STATIC_CODE_ANALYSIS,
                status="completed",
                target="/path/to/code",
                vulnerabilities=[
                    Vulnerability(
                        id="test-1",
                        title="Test Vulnerability",
                        description="Test description",
                        severity=VulnerabilitySeverity.MEDIUM,
                        tool="bandit"
                    )
                ]
            )
            
            mock_deps_result = ScanResult(
                scan_type=ScanType.DEPENDENCY_SCAN,
                status="completed",
                target="/path/to/code",
                vulnerabilities=[]
            )
            
            mock_static.return_value = mock_static_result
            mock_deps.return_value = mock_deps_result
            
            result = await security_scanner.run_comprehensive_scan("/path/to/code")
            
            assert result.status.value == "completed"
            assert len(result.vulnerabilities) == 1
            assert len(result.tools_used) == 2
    
    def test_vulnerability_summary_generation(self, security_scanner):
        """Test vulnerability summary generation."""
        
        vulnerabilities = [
            Vulnerability(id="1", title="High Vuln", description="", severity=VulnerabilitySeverity.HIGH, tool="test"),
            Vulnerability(id="2", title="Medium Vuln", description="", severity=VulnerabilitySeverity.MEDIUM, tool="test"),
            Vulnerability(id="3", title="Low Vuln", description="", severity=VulnerabilitySeverity.LOW, tool="test"),
        ]
        
        summary = security_scanner._generate_vulnerability_summary(vulnerabilities)
        
        assert summary['total'] == 3
        assert summary['high'] == 1
        assert summary['medium'] == 1
        assert summary['low'] == 1
        assert summary['critical'] == 0


class TestSecurityIntegration:
    """Test integration between security components."""
    
    @pytest.mark.asyncio
    async def test_end_to_end_security_flow(self):
        """Test complete security monitoring flow."""
        
        # Mock dependencies
        redis_mock = AsyncMock()
        session_mock = AsyncMock()
        
        # Create components
        audit_logger = AuditLogger(session_mock, redis_mock)
        security_monitor = SecurityMonitor(redis_mock)
        threat_engine = ThreatDetectionEngine(redis_mock, audit_logger)
        alert_manager = SecurityAlertManager(redis_mock)
        
        # Simulate security event
        event_data = {
            "event_type": "login_failed",
            "user_id": str(uuid4()),
            "ip_address": "192.168.1.100",
            "user_agent": "Mozilla/5.0"
        }
        
        # Log security event
        await security_monitor.log_security_event(**event_data)
        
        # Mock threat detection
        redis_mock.get.return_value = b"6"  # High failure count
        
        # Analyze for threats
        threat = await threat_engine.analyze_event(event_data)
        
        # Generate alert if threat detected
        if threat:
            alert = await alert_manager.process_threat_indicator(threat)
            assert alert is not None
            assert alert.severity == ThreatLevel.HIGH
        
        # Verify all components were called
        redis_mock.lpush.assert_called()  # Security event logged
        session_mock.add.assert_called()  # Audit log created


if __name__ == "__main__":
    # Run the tests
    pytest.main([__file__, "-v", "--tb=short"])