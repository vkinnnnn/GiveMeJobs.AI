"""
Comprehensive tests for Security Monitoring Service

Tests cover:
- Audit logging functionality
- Threat detection and automated response
- Security event monitoring and alerting
- Penetration testing automation
"""

import pytest
import asyncio
import json
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
import redis.asyncio as redis
from fastapi.testclient import TestClient
from fastapi import FastAPI

from app.services.security_monitoring import (
    SecurityMonitoringService,
    AuditLogEntry,
    SecurityAlert,
    SecurityEvent,
    SecurityEventType,
    ThreatLevel,
    ThreatDetectionRule
)
from app.api.security_monitoring import router
from app.middleware.security_middleware import SecurityMonitoringMiddleware


@pytest.fixture
async def mock_redis():
    """Mock Redis client for testing"""
    mock_redis = AsyncMock(spec=redis.Redis)
    mock_redis.setex = AsyncMock()
    mock_redis.get = AsyncMock()
    mock_redis.exists = AsyncMock()
    mock_redis.delete = AsyncMock()
    mock_redis.scan_iter = AsyncMock()
    return mock_redis


@pytest.fixture
async def security_service(mock_redis):
    """Security monitoring service instance for testing"""
    with patch('app.services.security_monitoring.Path') as mock_path:
        mock_path.return_value.exists.return_value = False
        service = SecurityMonitoringService(mock_redis)
        return service


@pytest.fixture
def test_app():
    """FastAPI test application"""
    app = FastAPI()
    app.include_router(router)
    return app


class TestSecurityMonitoringService:
    """Test cases for SecurityMonitoringService"""
    
    @pytest.mark.asyncio
    async def test_audit_logging(self, security_service, mock_redis):
        """Test audit logging functionality"""
        # Create test audit entry
        audit_entry = AuditLogEntry(
            log_id="test_log_123",
            user_id="user_123",
            action="login",
            resource="/auth/login",
            ip_address="192.168.1.100",
            user_agent="Mozilla/5.0",
            success=True,
            details={"method": "POST"},
            risk_score=2.0
        )
        
        # Test logging
        log_id = await security_service.log_audit_event(audit_entry)
        
        # Verify Redis storage was called
        mock_redis.setex.assert_called()
        assert log_id == "test_log_123"
    
    @pytest.mark.asyncio
    async def test_brute_force_detection(self, security_service):
        """Test brute force attack detection"""
        ip_address = "192.168.1.100"
        
        # Simulate multiple failed login attempts
        for i in range(6):
            audit_entry = AuditLogEntry(
                log_id=f"test_log_{i}",
                user_id="user_123",
                action="login",
                resource="/auth/login",
                ip_address=ip_address,
                user_agent="Mozilla/5.0",
                success=False,
                details={"attempt": i + 1},
                risk_score=3.0
            )
            
            await security_service._analyze_for_threats(audit_entry)
        
        # Verify IP tracking
        assert len(security_service.ip_tracking[ip_address]) == 6
        
        # Verify brute force detection would trigger
        recent_failures = [
            event for event in security_service.ip_tracking[ip_address]
            if not event["success"] 
            and event["action"] == "login"
            and event["timestamp"] > datetime.utcnow() - timedelta(minutes=5)
        ]
        assert len(recent_failures) >= 5
    
    @pytest.mark.asyncio
    async def test_privilege_escalation_detection(self, security_service):
        """Test privilege escalation detection"""
        audit_entry = AuditLogEntry(
            log_id="test_log_priv",
            user_id="user_123",
            action="role_change",
            resource="/admin/users/role",
            ip_address="192.168.1.100",
            user_agent="Mozilla/5.0",
            success=True,
            details={"from_role": "user", "to_role": "admin"},
            risk_score=8.0
        )
        
        # Mock the event handling
        with patch.object(security_service, '_handle_security_event') as mock_handle:
            await security_service._analyze_for_threats(audit_entry)
            
            # Verify privilege escalation was detected
            mock_handle.assert_called_once()
            event_arg = mock_handle.call_args[0][0]
            assert event_arg.event_type == SecurityEventType.PRIVILEGE_ESCALATION
            assert event_arg.threat_level == ThreatLevel.CRITICAL
    
    @pytest.mark.asyncio
    async def test_suspicious_data_access_detection(self, security_service):
        """Test suspicious data access detection"""
        # Create audit entry for off-hours data access
        off_hours_time = datetime.utcnow().replace(hour=2, minute=30)  # 2:30 AM
        
        audit_entry = AuditLogEntry(
            log_id="test_log_data",
            user_id="user_123",
            action="bulk_export",
            resource="/api/data/export",
            ip_address="192.168.1.100",
            user_agent="Mozilla/5.0",
            success=True,
            details={"records_exported": 10000},
            risk_score=6.0,
            timestamp=off_hours_time
        )
        
        # Mock the event handling
        with patch.object(security_service, '_handle_security_event') as mock_handle:
            await security_service._analyze_for_threats(audit_entry)
            
            # Verify suspicious activity was detected
            mock_handle.assert_called_once()
            event_arg = mock_handle.call_args[0][0]
            assert event_arg.event_type == SecurityEventType.SUSPICIOUS_ACTIVITY
            assert event_arg.threat_level == ThreatLevel.MEDIUM
    
    @pytest.mark.asyncio
    async def test_ip_blocking(self, security_service, mock_redis):
        """Test IP blocking functionality"""
        ip_address = "192.168.1.100"
        
        # Test blocking IP
        await security_service._block_ip_temporarily(ip_address, duration_minutes=30)
        
        # Verify IP was added to blocked set
        assert ip_address in security_service.blocked_ips
        
        # Verify Redis storage was called
        mock_redis.setex.assert_called_with(f"blocked_ip:{ip_address}", 30 * 60, "blocked")
    
    @pytest.mark.asyncio
    async def test_security_alert_creation(self, security_service, mock_redis):
        """Test security alert creation"""
        alert = SecurityAlert(
            alert_id="alert_test_123",
            threat_level=ThreatLevel.HIGH,
            event_type=SecurityEventType.BRUTE_FORCE,
            source_ip="192.168.1.100",
            user_id="user_123",
            description="Brute force attack detected",
            details={"failed_attempts": 6}
        )
        
        await security_service._create_security_alert(alert)
        
        # Verify Redis storage was called
        mock_redis.setex.assert_called()
        call_args = mock_redis.setex.call_args
        assert call_args[0][0] == f"security_alert:{alert.alert_id}"
        assert call_args[0][1] == 30 * 24 * 3600  # 30 days
    
    @pytest.mark.asyncio
    async def test_security_scanning(self, security_service, mock_redis):
        """Test security scanning functionality"""
        # Test comprehensive scan
        results = await security_service.run_security_scan("comprehensive")
        
        # Verify scan results structure
        assert "scan_id" in results
        assert "scan_type" in results
        assert "timestamp" in results
        assert "results" in results
        
        # Verify different scan types are included
        assert "bandit" in results["results"]
        assert "safety" in results["results"]
        assert "network" in results["results"]
        assert "penetration" in results["results"]
        
        # Verify Redis storage was called
        mock_redis.setex.assert_called()
    
    @pytest.mark.asyncio
    async def test_security_report_generation(self, security_service, mock_redis):
        """Test security report generation"""
        # Mock get_security_alerts to return test data
        test_alerts = [
            SecurityAlert(
                alert_id=f"alert_{i}",
                threat_level=ThreatLevel.HIGH if i % 2 == 0 else ThreatLevel.MEDIUM,
                event_type=SecurityEventType.BRUTE_FORCE,
                source_ip=f"192.168.1.{100 + i}",
                description=f"Test alert {i}",
                timestamp=datetime.utcnow() - timedelta(hours=i)
            )
            for i in range(5)
        ]
        
        with patch.object(security_service, 'get_security_alerts', return_value=test_alerts):
            report = await security_service.generate_security_report(days=7)
        
        # Verify report structure
        assert "report_id" in report
        assert "period" in report
        assert "summary" in report
        assert "alerts" in report
        assert "recommendations" in report
        
        # Verify summary statistics
        assert report["summary"]["total_alerts"] == 5
        assert report["summary"]["high_alerts"] == 3  # Every other alert is high
        assert report["summary"]["medium_alerts"] == 2
        
        # Verify Redis storage was called
        mock_redis.setex.assert_called()


class TestSecurityMiddleware:
    """Test cases for SecurityMonitoringMiddleware"""
    
    @pytest.fixture
    async def security_middleware(self, mock_redis):
        """Security middleware instance for testing"""
        return SecurityMonitoringMiddleware(mock_redis)
    
    @pytest.mark.asyncio
    async def test_sql_injection_detection(self, security_middleware):
        """Test SQL injection detection in middleware"""
        # Test SQL injection patterns
        sql_payloads = [
            "' OR '1'='1",
            "'; DROP TABLE users; --",
            "' UNION SELECT * FROM users --"
        ]
        
        for payload in sql_payloads:
            detected = await security_middleware._detect_sql_injection(
                payload, "192.168.1.100", "/api/test"
            )
            assert detected is True
    
    @pytest.mark.asyncio
    async def test_xss_detection(self, security_middleware):
        """Test XSS detection in middleware"""
        # Test XSS patterns
        xss_payloads = [
            "<script>alert('xss')</script>",
            "javascript:alert('xss')",
            "<img src=x onerror=alert('xss')>"
        ]
        
        for payload in xss_payloads:
            detected = await security_middleware._detect_xss_attempt(
                payload, "192.168.1.100", "/api/test"
            )
            assert detected is True
    
    @pytest.mark.asyncio
    async def test_suspicious_user_agent_detection(self, security_middleware):
        """Test suspicious user agent detection"""
        suspicious_agents = [
            "sqlmap/1.0",
            "nikto/2.1",
            "python-requests/2.25"
        ]
        
        for agent in suspicious_agents:
            detected = await security_middleware._detect_suspicious_patterns(
                "test request", "192.168.1.100", "/api/test", agent
            )
            # Should detect but not block (returns False for blocking)
            assert detected is False  # Suspicious but not blocking
    
    @pytest.mark.asyncio
    async def test_path_traversal_detection(self, security_middleware):
        """Test path traversal detection"""
        path_traversal_payloads = [
            "../../../etc/passwd",
            "..%2f..%2f..%2fetc%2fpasswd",
            "..%5c..%5c..%5cwindows%5csystem32"
        ]
        
        for payload in path_traversal_payloads:
            detected = await security_middleware._detect_suspicious_patterns(
                payload, "192.168.1.100", "/api/test", "Mozilla/5.0"
            )
            assert detected is True


class TestSecurityAPI:
    """Test cases for Security Monitoring API endpoints"""
    
    @pytest.fixture
    def client(self, test_app):
        """Test client for API endpoints"""
        return TestClient(test_app)
    
    def test_health_check_endpoint(self, client):
        """Test security health check endpoint"""
        response = client.get("/security/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "security_monitoring"
        assert "features" in data
        assert "audit_logging" in data["features"]
    
    @pytest.mark.asyncio
    async def test_audit_logging_endpoint(self, client):
        """Test audit logging API endpoint"""
        audit_data = {
            "user_id": "user_123",
            "action": "login",
            "resource": "/auth/login",
            "success": True,
            "details": {"method": "POST"},
            "risk_score": 2.0
        }
        
        with patch('app.api.security_monitoring.get_security_service') as mock_service:
            mock_service.return_value.log_audit_event = AsyncMock(return_value="log_123")
            
            response = client.post("/security/audit/log", json=audit_data)
            assert response.status_code == 200
            
            data = response.json()
            assert data["log_id"] == "log_123"
            assert data["status"] == "logged"
    
    @pytest.mark.asyncio
    async def test_security_scan_endpoint(self, client):
        """Test security scan API endpoint"""
        scan_data = {"scan_type": "code"}
        
        mock_scan_results = {
            "scan_id": "scan_123",
            "scan_type": "code",
            "timestamp": datetime.utcnow().isoformat(),
            "results": {
                "bandit": {"status": "completed", "issues_found": 0},
                "safety": {"status": "completed", "vulnerabilities_found": 0}
            }
        }
        
        with patch('app.api.security_monitoring.get_security_service') as mock_service:
            mock_service.return_value.run_security_scan = AsyncMock(return_value=mock_scan_results)
            
            response = client.post("/security/scan", json=scan_data)
            assert response.status_code == 200
            
            data = response.json()
            assert data["scan_id"] == "scan_123"
            assert "results" in data
    
    @pytest.mark.asyncio
    async def test_security_report_endpoint(self, client):
        """Test security report generation endpoint"""
        report_data = {"days": 7}
        
        mock_report = {
            "report_id": "report_123",
            "period": {"days": 7},
            "summary": {"total_alerts": 5},
            "alerts": [],
            "recommendations": []
        }
        
        with patch('app.api.security_monitoring.get_security_service') as mock_service:
            mock_service.return_value.generate_security_report = AsyncMock(return_value=mock_report)
            
            response = client.post("/security/report", json=report_data)
            assert response.status_code == 200
            
            data = response.json()
            assert data["report_id"] == "report_123"
            assert "summary" in data
    
    @pytest.mark.asyncio
    async def test_ip_status_endpoint(self, client):
        """Test IP status check endpoint"""
        ip_address = "192.168.1.100"
        
        with patch('app.api.security_monitoring.get_security_service') as mock_service:
            mock_service.return_value.is_ip_blocked = AsyncMock(return_value=True)
            
            response = client.get(f"/security/ip/{ip_address}/status")
            assert response.status_code == 200
            
            data = response.json()
            assert data["ip_address"] == ip_address
            assert data["blocked"] is True
            assert data["status"] == "blocked"


class TestThreatDetectionRules:
    """Test cases for threat detection rules"""
    
    def test_threat_detection_rule_creation(self):
        """Test threat detection rule creation"""
        rule = ThreatDetectionRule(
            rule_id="test_rule",
            name="Test Rule",
            description="Test threat detection rule",
            pattern="test pattern",
            threat_level=ThreatLevel.HIGH,
            auto_response=True,
            response_action="block_ip_temporary"
        )
        
        assert rule.rule_id == "test_rule"
        assert rule.threat_level == ThreatLevel.HIGH
        assert rule.auto_response is True
        assert rule.response_action == "block_ip_temporary"
    
    def test_security_event_creation(self):
        """Test security event creation"""
        event = SecurityEvent(
            event_id="event_123",
            event_type=SecurityEventType.BRUTE_FORCE,
            threat_level=ThreatLevel.HIGH,
            timestamp=datetime.utcnow(),
            user_id="user_123",
            ip_address="192.168.1.100",
            user_agent="Mozilla/5.0",
            endpoint="/auth/login",
            details={"failed_attempts": 5},
            response_action="block_ip_temporary"
        )
        
        assert event.event_id == "event_123"
        assert event.event_type == SecurityEventType.BRUTE_FORCE
        assert event.threat_level == ThreatLevel.HIGH
        assert event.response_action == "block_ip_temporary"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])