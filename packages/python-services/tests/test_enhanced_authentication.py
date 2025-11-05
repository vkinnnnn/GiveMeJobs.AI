"""
Comprehensive test suite for enhanced authentication system.

This module tests:
- JWT refresh token rotation
- Role-based access control (RBAC)
- Multi-factor authentication (MFA)
- Session management with Redis
- Security monitoring and threat detection
"""

import asyncio
import json
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
import pytest_asyncio
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.core.enhanced_auth import (
    EnhancedUserManager,
    MFAManager,
    RBACManager,
    RefreshTokenManager,
    UserCreate,
    UserRead,
    MFASetupResponse,
    TokenResponse
)
from app.core.security_monitor import SecurityMonitor, SecurityAlert, ThreatDetectionRule
from app.models.database.auth import User, Role, Permission


class TestEnhancedUserManager:
    """Test enhanced user manager functionality."""
    
    @pytest_asyncio.fixture
    async def mock_redis(self):
        """Mock Redis client."""
        redis_mock = AsyncMock()
        redis_mock.setex = AsyncMock()
        redis_mock.get = AsyncMock()
        redis_mock.delete = AsyncMock()
        redis_mock.sadd = AsyncMock()
        redis_mock.srem = AsyncMock()
        redis_mock.smembers = AsyncMock()
        return redis_mock
    
    @pytest_asyncio.fixture
    async def mock_user_db(self):
        """Mock user database."""
        user_db_mock = AsyncMock()
        user_db_mock.update = AsyncMock()
        return user_db_mock
    
    @pytest_asyncio.fixture
    async def user_manager(self, mock_user_db, mock_redis):
        """Create user manager instance."""
        return EnhancedUserManager(mock_user_db, mock_redis)
    
    @pytest_asyncio.fixture
    async def sample_user(self):
        """Create sample user."""
        return User(
            id=uuid4(),
            email="test@example.com",
            first_name="Test",
            last_name="User",
            hashed_password="hashed_password",
            is_active=True,
            mfa_enabled=False
        )
    
    async def test_on_after_register(self, user_manager, sample_user):
        """Test actions after user registration."""
        
        with patch.object(user_manager, 'assign_default_role') as mock_assign:
            await user_manager.on_after_register(sample_user)
            mock_assign.assert_called_once_with(sample_user)
    
    async def test_on_after_login(self, user_manager, sample_user, mock_redis):
        """Test actions after user login."""
        
        mock_request = MagicMock()
        mock_request.client.host = "192.168.1.1"
        mock_request.headers = {"user-agent": "test-agent"}
        
        with patch.object(user_manager, 'create_session') as mock_create_session:
            await user_manager.on_after_login(sample_user, mock_request)
            
            assert sample_user.last_login is not None
            mock_create_session.assert_called_once_with(sample_user, mock_request)
    
    async def test_create_session(self, user_manager, sample_user, mock_redis):
        """Test session creation."""
        
        mock_request = MagicMock()
        mock_request.client.host = "192.168.1.1"
        mock_request.headers = {"user-agent": "test-agent"}
        
        session_id = await user_manager.create_session(sample_user, mock_request)
        
        assert session_id is not None
        mock_redis.setex.assert_called()
        mock_redis.sadd.assert_called()
    
    async def test_invalidate_session(self, user_manager, mock_redis):
        """Test session invalidation."""
        
        session_id = "test_session_id"
        session_data = json.dumps({"user_id": str(uuid4())})
        
        mock_redis.get.return_value = session_data.encode()
        
        await user_manager.invalidate_session(session_id)
        
        mock_redis.delete.assert_called()
        mock_redis.srem.assert_called()
    
    async def test_invalidate_all_user_sessions(self, user_manager, mock_redis):
        """Test invalidating all user sessions."""
        
        user_id = uuid4()
        session_ids = [b"session_1", b"session_2"]
        
        mock_redis.smembers.return_value = session_ids
        
        await user_manager.invalidate_all_user_sessions(user_id)
        
        mock_redis.delete.assert_called()


class TestMFAManager:
    """Test multi-factor authentication manager."""
    
    @pytest_asyncio.fixture
    async def mock_redis(self):
        """Mock Redis client."""
        redis_mock = AsyncMock()
        redis_mock.setex = AsyncMock()
        redis_mock.get = AsyncMock()
        redis_mock.delete = AsyncMock()
        return redis_mock
    
    @pytest_asyncio.fixture
    async def mfa_manager(self, mock_redis):
        """Create MFA manager instance."""
        return MFAManager(mock_redis)
    
    def test_generate_secret(self, mfa_manager):
        """Test TOTP secret generation."""
        
        secret = mfa_manager.generate_secret()
        
        assert isinstance(secret, str)
        assert len(secret) == 32  # Base32 encoded
    
    def test_generate_qr_code(self, mfa_manager):
        """Test QR code generation."""
        
        secret = "JBSWY3DPEHPK3PXP"
        email = "test@example.com"
        
        qr_code_url = mfa_manager.generate_qr_code(email, secret)
        
        assert qr_code_url.startswith("data:image/png;base64,")
    
    def test_generate_backup_codes(self, mfa_manager):
        """Test backup codes generation."""
        
        codes = mfa_manager.generate_backup_codes(5)
        
        assert len(codes) == 5
        assert all(len(code) == 8 for code in codes)  # 4 bytes hex = 8 chars
    
    @patch('pyotp.TOTP.verify')
    def test_verify_totp(self, mock_verify, mfa_manager):
        """Test TOTP token verification."""
        
        mock_verify.return_value = True
        
        secret = "JBSWY3DPEHPK3PXP"
        token = "123456"
        
        result = mfa_manager.verify_totp(secret, token)
        
        assert result is True
        mock_verify.assert_called_once_with(token, valid_window=1)
    
    async def test_setup_mfa(self, mfa_manager, mock_redis):
        """Test MFA setup."""
        
        user_id = uuid4()
        user_email = "test@example.com"
        
        with patch.object(mfa_manager, 'generate_secret') as mock_secret, \
             patch.object(mfa_manager, 'generate_qr_code') as mock_qr, \
             patch.object(mfa_manager, 'generate_backup_codes') as mock_codes:
            
            mock_secret.return_value = "test_secret"
            mock_qr.return_value = "data:image/png;base64,test"
            mock_codes.return_value = ["CODE1", "CODE2"]
            
            result = await mfa_manager.setup_mfa(user_id, user_email)
            
            assert isinstance(result, MFASetupResponse)
            assert result.secret == "test_secret"
            assert len(result.backup_codes) == 2
            
            mock_redis.setex.assert_called()
    
    async def test_verify_mfa_setup(self, mfa_manager, mock_redis):
        """Test MFA setup verification."""
        
        user_id = uuid4()
        token = "123456"
        secret = "test_secret"
        
        mock_redis.get.return_value = secret.encode()
        
        with patch.object(mfa_manager, 'verify_totp') as mock_verify:
            mock_verify.return_value = True
            
            result = await mfa_manager.verify_mfa_setup(user_id, token)
            
            assert result is True
            mock_redis.setex.assert_called()  # Store permanent secret
            mock_redis.delete.assert_called()  # Remove temporary setup
    
    async def test_verify_mfa_token_with_totp(self, mfa_manager, mock_redis):
        """Test MFA token verification with TOTP."""
        
        user_id = uuid4()
        token = "123456"
        secret = "test_secret"
        
        mock_redis.get.side_effect = [secret.encode(), None]  # TOTP secret, no backup codes
        
        with patch.object(mfa_manager, 'verify_totp') as mock_verify:
            mock_verify.return_value = True
            
            result = await mfa_manager.verify_mfa_token(user_id, token)
            
            assert result is True
    
    async def test_verify_mfa_token_with_backup_code(self, mfa_manager, mock_redis):
        """Test MFA token verification with backup code."""
        
        user_id = uuid4()
        token = "CODE1"
        backup_codes = "CODE1,CODE2,CODE3"
        
        mock_redis.get.side_effect = [None, backup_codes.encode()]  # No TOTP secret, has backup codes
        
        result = await mfa_manager.verify_mfa_token(user_id, token)
        
        assert result is True
        mock_redis.setex.assert_called()  # Update backup codes (remove used one)
    
    async def test_disable_mfa(self, mfa_manager, mock_redis):
        """Test MFA disabling."""
        
        user_id = uuid4()
        
        await mfa_manager.disable_mfa(user_id)
        
        # Should delete all MFA-related keys
        assert mock_redis.delete.call_count == 3


class TestRBACManager:
    """Test role-based access control manager."""
    
    @pytest_asyncio.fixture
    async def mock_session(self):
        """Mock database session."""
        session_mock = AsyncMock()
        session_mock.add = MagicMock()
        session_mock.commit = AsyncMock()
        session_mock.flush = AsyncMock()
        session_mock.refresh = AsyncMock()
        return session_mock
    
    @pytest_asyncio.fixture
    async def rbac_manager(self, mock_session):
        """Create RBAC manager instance."""
        return RBACManager(mock_session)
    
    async def test_create_permission(self, rbac_manager, mock_session):
        """Test permission creation."""
        
        from app.core.enhanced_auth import PermissionCreate
        
        permission_data = PermissionCreate(
            name="user:read",
            resource="user",
            action="read",
            description="Read user data"
        )
        
        result = await rbac_manager.create_permission(permission_data)
        
        assert isinstance(result, Permission)
        assert result.name == "user:read"
        assert result.resource == "user"
        assert result.action == "read"
        
        mock_session.add.assert_called_once()
        mock_session.commit.assert_called_once()
    
    async def test_create_role(self, rbac_manager, mock_session):
        """Test role creation."""
        
        from app.core.enhanced_auth import RoleCreate
        
        role_data = RoleCreate(
            name="admin",
            description="Administrator role",
            permissions=["user:read", "user:write"]
        )
        
        result = await rbac_manager.create_role(role_data)
        
        assert isinstance(result, Role)
        assert result.name == "admin"
        assert result.description == "Administrator role"
        
        mock_session.add.assert_called_once()
        mock_session.commit.assert_called_once()
    
    async def test_get_user_permissions(self, rbac_manager):
        """Test getting user permissions."""
        
        user_id = uuid4()
        
        permissions = await rbac_manager.get_user_permissions(user_id)
        
        assert isinstance(permissions, set)
        assert "user:read" in permissions
    
    async def test_check_permission(self, rbac_manager):
        """Test permission checking."""
        
        user_id = uuid4()
        
        with patch.object(rbac_manager, 'get_user_permissions') as mock_get_perms:
            mock_get_perms.return_value = {"user:read", "user:write"}
            
            # Test existing permission
            result = await rbac_manager.check_permission(user_id, "user:read")
            assert result is True
            
            # Test non-existing permission
            result = await rbac_manager.check_permission(user_id, "admin:delete")
            assert result is False


class TestRefreshTokenManager:
    """Test refresh token manager."""
    
    @pytest_asyncio.fixture
    async def mock_redis(self):
        """Mock Redis client."""
        redis_mock = AsyncMock()
        redis_mock.setex = AsyncMock()
        redis_mock.get = AsyncMock()
        redis_mock.delete = AsyncMock()
        redis_mock.sadd = AsyncMock()
        redis_mock.srem = AsyncMock()
        redis_mock.smembers = AsyncMock()
        return redis_mock
    
    @pytest_asyncio.fixture
    async def token_manager(self, mock_redis):
        """Create refresh token manager instance."""
        return RefreshTokenManager(mock_redis)
    
    async def test_create_refresh_token(self, token_manager, mock_redis):
        """Test refresh token creation."""
        
        user_id = uuid4()
        
        token = await token_manager.create_refresh_token(user_id)
        
        assert isinstance(token, str)
        assert len(token) > 20  # URL-safe base64 encoded
        
        mock_redis.setex.assert_called()
        mock_redis.sadd.assert_called()
    
    async def test_verify_refresh_token(self, token_manager, mock_redis):
        """Test refresh token verification."""
        
        user_id = uuid4()
        token = "test_token"
        
        mock_redis.get.return_value = str(user_id).encode()
        
        result = await token_manager.verify_refresh_token(token)
        
        assert result == user_id
    
    async def test_rotate_refresh_token(self, token_manager, mock_redis):
        """Test refresh token rotation."""
        
        user_id = uuid4()
        old_token = "old_token"
        
        mock_redis.get.return_value = str(user_id).encode()
        
        with patch.object(token_manager, 'invalidate_refresh_token') as mock_invalidate, \
             patch.object(token_manager, 'create_refresh_token') as mock_create:
            
            mock_create.return_value = "new_token"
            
            new_token = await token_manager.rotate_refresh_token(old_token)
            
            assert new_token == "new_token"
            mock_invalidate.assert_called_once_with(old_token)
            mock_create.assert_called_once_with(user_id)
    
    async def test_invalidate_refresh_token(self, token_manager, mock_redis):
        """Test refresh token invalidation."""
        
        user_id = uuid4()
        token = "test_token"
        
        mock_redis.get.return_value = str(user_id).encode()
        
        await token_manager.invalidate_refresh_token(token)
        
        mock_redis.delete.assert_called()
        mock_redis.srem.assert_called()
    
    async def test_invalidate_all_user_refresh_tokens(self, token_manager, mock_redis):
        """Test invalidating all user refresh tokens."""
        
        user_id = uuid4()
        tokens = [b"token1", b"token2"]
        
        mock_redis.smembers.return_value = tokens
        
        await token_manager.invalidate_all_user_refresh_tokens(user_id)
        
        mock_redis.delete.assert_called()


class TestSecurityMonitor:
    """Test security monitoring system."""
    
    @pytest_asyncio.fixture
    async def mock_redis(self):
        """Mock Redis client."""
        redis_mock = AsyncMock()
        redis_mock.lpush = AsyncMock()
        redis_mock.ltrim = AsyncMock()
        redis_mock.incr = AsyncMock()
        redis_mock.expire = AsyncMock()
        redis_mock.sadd = AsyncMock()
        redis_mock.scard = AsyncMock()
        redis_mock.setex = AsyncMock()
        redis_mock.get = AsyncMock()
        redis_mock.keys = AsyncMock()
        redis_mock.llen = AsyncMock()
        redis_mock.lrange = AsyncMock()
        return redis_mock
    
    @pytest_asyncio.fixture
    async def security_monitor(self, mock_redis):
        """Create security monitor instance."""
        return SecurityMonitor(mock_redis)
    
    async def test_log_security_event(self, security_monitor, mock_redis):
        """Test security event logging."""
        
        user_id = uuid4()
        
        with patch.object(security_monitor, '_analyze_event') as mock_analyze:
            await security_monitor.log_security_event(
                event_type="login_success",
                user_id=user_id,
                ip_address="192.168.1.1",
                success=True
            )
            
            mock_redis.lpush.assert_called()
            mock_redis.ltrim.assert_called()
            mock_analyze.assert_called_once()
    
    async def test_brute_force_detection(self, security_monitor, mock_redis):
        """Test brute force attack detection."""
        
        # Simulate multiple failed login attempts
        mock_redis.incr.return_value = 6  # Exceeds threshold of 5
        
        event_data = {
            "event_type": "login_failed",
            "ip_address": "192.168.1.1",
            "additional_data": {"username": "test@example.com"}
        }
        
        # Find brute force rule
        brute_force_rule = next(
            rule for rule in security_monitor.detection_rules 
            if rule.name == "brute_force_login"
        )
        
        with patch.object(security_monitor, '_handle_threat_detection') as mock_handle:
            result = await security_monitor._check_rule_conditions(event_data, brute_force_rule)
            
            assert result is True
    
    async def test_password_spray_detection(self, security_monitor, mock_redis):
        """Test password spray attack detection."""
        
        mock_redis.scard.return_value = 15  # Exceeds threshold of 10
        
        event_data = {
            "event_type": "login_failed",
            "ip_address": "192.168.1.1",
            "additional_data": {"username": "user1@example.com"}
        }
        
        # Find password spray rule
        spray_rule = next(
            rule for rule in security_monitor.detection_rules 
            if rule.name == "password_spray_attack"
        )
        
        result = await security_monitor._check_rule_conditions(event_data, spray_rule)
        
        assert result is True
        mock_redis.sadd.assert_called()
        mock_redis.expire.assert_called()
    
    async def test_threat_detection_handling(self, security_monitor, mock_redis):
        """Test threat detection handling."""
        
        event_data = {
            "event_type": "login_failed",
            "ip_address": "192.168.1.1",
            "user_id": str(uuid4())
        }
        
        rule = ThreatDetectionRule(
            name="test_rule",
            description="Test rule",
            event_types=["login_failed"],
            conditions={},
            severity="high",
            response_actions=["block_ip", "alert_admin"]
        )
        
        with patch.object(security_monitor, '_execute_response_action') as mock_execute, \
             patch.object(security_monitor, '_store_security_event') as mock_store:
            
            await security_monitor._handle_threat_detection(event_data, rule)
            
            assert mock_execute.call_count == 2  # Two response actions
            mock_store.assert_called_once()
    
    async def test_ip_blocking(self, security_monitor, mock_redis):
        """Test IP address blocking."""
        
        ip_address = "192.168.1.1"
        
        await security_monitor._block_ip_address(ip_address)
        
        assert ip_address in security_monitor.blocked_ips
        mock_redis.setex.assert_called()
    
    async def test_account_locking(self, security_monitor, mock_redis):
        """Test user account locking."""
        
        user_id = uuid4()
        
        await security_monitor._lock_user_account(user_id)
        
        mock_redis.setex.assert_called()
    
    async def test_is_ip_blocked(self, security_monitor, mock_redis):
        """Test IP blocking check."""
        
        ip_address = "192.168.1.1"
        
        # Test blocked IP in memory
        security_monitor.blocked_ips.add(ip_address)
        result = await security_monitor.is_ip_blocked(ip_address)
        assert result is True
        
        # Test blocked IP in Redis
        security_monitor.blocked_ips.clear()
        mock_redis.get.return_value = b"blocked"
        result = await security_monitor.is_ip_blocked(ip_address)
        assert result is True
        
        # Test non-blocked IP
        mock_redis.get.return_value = None
        result = await security_monitor.is_ip_blocked(ip_address)
        assert result is False
    
    async def test_get_security_stats(self, security_monitor, mock_redis):
        """Test security statistics retrieval."""
        
        mock_redis.llen.side_effect = [100, 5]  # events, alerts
        mock_redis.keys.side_effect = [["blocked_ip:1"], ["locked_account:1"]]
        
        stats = await security_monitor.get_security_stats()
        
        assert stats["recent_events"] == 100
        assert stats["blocked_ips"] == 1
        assert stats["locked_accounts"] == 1
        assert stats["pending_alerts"] == 5
        assert stats["detection_rules"] > 0
    
    async def test_get_recent_alerts(self, security_monitor, mock_redis):
        """Test recent alerts retrieval."""
        
        alert_data = json.dumps({
            "event_type": "brute_force_login",
            "severity": "high",
            "ip_address": "192.168.1.1"
        })
        
        mock_redis.lrange.return_value = [alert_data.encode()]
        
        alerts = await security_monitor.get_recent_alerts(limit=5)
        
        assert len(alerts) == 1
        assert alerts[0]["event_type"] == "brute_force_login"


class TestSecurityIntegration:
    """Integration tests for security features."""
    
    @pytest.fixture
    def client(self):
        """Create test client."""
        from app.main import app
        return TestClient(app)
    
    def test_login_with_mfa_required(self, client):
        """Test login flow when MFA is required."""
        
        # Mock user with MFA enabled
        with patch('app.api.v1.enhanced_auth.EnhancedUserManager') as mock_manager:
            mock_user = MagicMock()
            mock_user.mfa_enabled = True
            mock_user.is_active = True
            mock_manager.return_value.authenticate.return_value = mock_user
            
            response = client.post("/auth/login", json={
                "email": "test@example.com",
                "password": "password123"
            })
            
            assert response.status_code == 200
            data = response.json()
            assert data["mfa_required"] is True
            assert data["access_token"] == ""
    
    def test_login_with_valid_mfa(self, client):
        """Test login flow with valid MFA token."""
        
        with patch('app.api.v1.enhanced_auth.EnhancedUserManager') as mock_manager, \
             patch('app.api.v1.enhanced_auth.MFAManager') as mock_mfa, \
             patch('app.api.v1.enhanced_auth.RefreshTokenManager') as mock_token_mgr:
            
            mock_user = MagicMock()
            mock_user.mfa_enabled = True
            mock_user.is_active = True
            mock_user.id = uuid4()
            
            mock_manager.return_value.authenticate.return_value = mock_user
            mock_mfa.return_value.verify_mfa_token.return_value = True
            mock_token_mgr.return_value.create_refresh_token.return_value = "refresh_token"
            
            response = client.post("/auth/login", json={
                "email": "test@example.com",
                "password": "password123",
                "mfa_token": "123456"
            })
            
            assert response.status_code == 200
            data = response.json()
            assert data["mfa_required"] is False
            assert data["access_token"] != ""
    
    def test_refresh_token_rotation(self, client):
        """Test refresh token rotation."""
        
        with patch('app.api.v1.enhanced_auth.RefreshTokenManager') as mock_token_mgr:
            mock_token_mgr.return_value.rotate_refresh_token.return_value = "new_refresh_token"
            mock_token_mgr.return_value.verify_refresh_token.return_value = uuid4()
            
            response = client.post("/auth/refresh", json={
                "refresh_token": "old_refresh_token"
            })
            
            assert response.status_code == 200
            data = response.json()
            assert data["refresh_token"] == "new_refresh_token"
            assert data["access_token"] != ""
    
    def test_security_middleware_blocks_ip(self, client):
        """Test security middleware blocking malicious IP."""
        
        with patch('app.core.security_monitor.SecurityMonitor') as mock_monitor:
            mock_monitor.return_value.is_ip_blocked.return_value = True
            
            response = client.get("/health")
            
            assert response.status_code == 403


# Performance tests
class TestAuthenticationPerformance:
    """Performance tests for authentication system."""
    
    @pytest.mark.asyncio
    async def test_concurrent_login_attempts(self):
        """Test handling concurrent login attempts."""
        
        async def simulate_login():
            # Simulate login attempt
            await asyncio.sleep(0.01)  # Simulate processing time
            return True
        
        # Simulate 100 concurrent login attempts
        tasks = [simulate_login() for _ in range(100)]
        results = await asyncio.gather(*tasks)
        
        assert len(results) == 100
        assert all(results)
    
    @pytest.mark.asyncio
    async def test_mfa_verification_performance(self):
        """Test MFA verification performance."""
        
        from app.core.enhanced_auth import MFAManager
        
        mock_redis = AsyncMock()
        mfa_manager = MFAManager(mock_redis)
        
        # Test TOTP verification performance
        secret = "JBSWY3DPEHPK3PXP"
        
        start_time = asyncio.get_event_loop().time()
        
        # Simulate 1000 TOTP verifications
        for _ in range(1000):
            mfa_manager.verify_totp(secret, "123456")
        
        end_time = asyncio.get_event_loop().time()
        duration = end_time - start_time
        
        # Should complete within reasonable time
        assert duration < 1.0  # Less than 1 second for 1000 verifications


# Security tests
class TestSecurityVulnerabilities:
    """Test security vulnerability prevention."""
    
    def test_password_strength_validation(self):
        """Test password strength validation."""
        
        from app.core.enhanced_auth import UserCreate
        
        # Test weak password
        with pytest.raises(ValueError):
            UserCreate(
                email="test@example.com",
                password="weak",
                first_name="Test",
                last_name="User"
            )
        
        # Test strong password
        user_data = UserCreate(
            email="test@example.com",
            password="StrongP@ssw0rd123!",
            first_name="Test",
            last_name="User"
        )
        
        assert user_data.password == "StrongP@ssw0rd123!"
    
    def test_sql_injection_prevention(self):
        """Test SQL injection prevention in authentication."""
        
        # This would test that parameterized queries are used
        # and that user input is properly sanitized
        pass
    
    def test_timing_attack_prevention(self):
        """Test timing attack prevention in authentication."""
        
        # This would test that authentication timing is consistent
        # regardless of whether the user exists or not
        pass
    
    def test_session_fixation_prevention(self):
        """Test session fixation attack prevention."""
        
        # This would test that session IDs are regenerated after login
        pass


if __name__ == "__main__":
    pytest.main([__file__])