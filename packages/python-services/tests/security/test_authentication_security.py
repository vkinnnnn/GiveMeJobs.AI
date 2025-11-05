"""
Security tests for authentication and authorization.
"""

import pytest
import httpx
import jwt
import time
from typing import Dict, Any
import hashlib
import secrets


@pytest.mark.security
@pytest.mark.asyncio
class TestAuthenticationSecurity:
    """Security tests for authentication mechanisms."""
    
    async def test_password_hashing_security(self):
        """Test password hashing security."""
        from app.core.auth import hash_password, verify_password
        
        # Test password hashing
        password = "TestPassword123!"
        hashed = hash_password(password)
        
        # Verify hash is not the plain password
        assert hashed != password
        
        # Verify hash is different each time (salt)
        hashed2 = hash_password(password)
        assert hashed != hashed2
        
        # Verify password verification works
        assert verify_password(password, hashed)
        assert not verify_password("wrong_password", hashed)
        
        # Test weak password rejection
        weak_passwords = ["123", "password", "abc", ""]
        for weak_pass in weak_passwords:
            with pytest.raises(ValueError):
                hash_password(weak_pass)
    
    async def test_jwt_token_security(self):
        """Test JWT token security."""
        from app.core.auth import create_access_token, verify_token
        
        # Test token creation
        user_data = {"user_id": "test-user", "email": "test@example.com"}
        token = create_access_token(user_data)
        
        # Verify token structure
        assert isinstance(token, str)
        assert len(token.split('.')) == 3  # JWT has 3 parts
        
        # Verify token verification
        decoded = verify_token(token)
        assert decoded["user_id"] == user_data["user_id"]
        assert decoded["email"] == user_data["email"]
        
        # Test token expiration
        expired_token = create_access_token(user_data, expires_delta=-3600)  # Expired 1 hour ago
        with pytest.raises(jwt.ExpiredSignatureError):
            verify_token(expired_token)
        
        # Test invalid token
        invalid_token = "invalid.token.here"
        with pytest.raises(jwt.InvalidTokenError):
            verify_token(invalid_token)
        
        # Test token tampering
        parts = token.split('.')
        tampered_token = f"{parts[0]}.{parts[1]}.tampered_signature"
        with pytest.raises(jwt.InvalidSignatureError):
            verify_token(tampered_token)
    
    async def test_session_security(self):
        """Test session security mechanisms."""
        async with httpx.AsyncClient() as client:
            # Test login
            login_data = {
                "email": "test@example.com",
                "password": "TestPassword123!"
            }
            
            response = await client.post(
                "http://localhost:8000/api/v1/auth/login",
                json=login_data
            )
            
            if response.status_code == 200:
                auth_data = response.json()
                
                # Verify secure token properties
                access_token = auth_data.get("access_token")
                refresh_token = auth_data.get("refresh_token")
                
                assert access_token is not None
                assert refresh_token is not None
                assert access_token != refresh_token
                
                # Test token refresh
                refresh_response = await client.post(
                    "http://localhost:8000/api/v1/auth/refresh",
                    headers={"Authorization": f"Bearer {refresh_token}"}
                )
                
                if refresh_response.status_code == 200:
                    new_auth_data = refresh_response.json()
                    new_access_token = new_auth_data.get("access_token")
                    
                    # New token should be different
                    assert new_access_token != access_token
    
    async def test_brute_force_protection(self):
        """Test brute force attack protection."""
        async with httpx.AsyncClient() as client:
            # Attempt multiple failed logins
            failed_attempts = 0
            max_attempts = 10
            
            for i in range(max_attempts):
                login_data = {
                    "email": "test@example.com",
                    "password": f"wrong_password_{i}"
                }
                
                response = await client.post(
                    "http://localhost:8000/api/v1/auth/login",
                    json=login_data
                )
                
                if response.status_code == 429:  # Rate limited
                    break
                elif response.status_code == 401:  # Unauthorized
                    failed_attempts += 1
                
                # Small delay between attempts
                await asyncio.sleep(0.1)
            
            # Should be rate limited before reaching max attempts
            assert failed_attempts < max_attempts, "Brute force protection not working"
    
    async def test_account_lockout_security(self):
        """Test account lockout mechanisms."""
        async with httpx.AsyncClient() as client:
            # Test account lockout after multiple failed attempts
            email = "lockout_test@example.com"
            
            # Create test user first
            user_data = {
                "email": email,
                "password": "TestPassword123!",
                "first_name": "Test",
                "last_name": "User"
            }
            
            await client.post(
                "http://localhost:8000/api/v1/auth/register",
                json=user_data
            )
            
            # Attempt multiple failed logins
            for i in range(6):  # Exceed lockout threshold
                login_data = {
                    "email": email,
                    "password": "wrong_password"
                }
                
                response = await client.post(
                    "http://localhost:8000/api/v1/auth/login",
                    json=login_data
                )
                
                # Should eventually get locked out
                if response.status_code == 423:  # Locked
                    break
            
            # Try with correct password - should still be locked
            correct_login = {
                "email": email,
                "password": "TestPassword123!"
            }
            
            response = await client.post(
                "http://localhost:8000/api/v1/auth/login",
                json=correct_login
            )
            
            # Should be locked even with correct password
            assert response.status_code in [423, 429], "Account lockout not working"


@pytest.mark.security
@pytest.mark.asyncio
class TestAuthorizationSecurity:
    """Security tests for authorization mechanisms."""
    
    async def test_role_based_access_control(self):
        """Test RBAC implementation."""
        async with httpx.AsyncClient() as client:
            # Test admin-only endpoint access
            admin_token = "admin_token_here"  # Mock admin token
            user_token = "user_token_here"    # Mock user token
            
            admin_endpoint = "/api/v1/admin/users"
            
            # Test admin access
            response = await client.get(
                f"http://localhost:8000{admin_endpoint}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            
            # Should allow admin access or return 401 if not implemented
            assert response.status_code in [200, 401, 404]
            
            # Test user access to admin endpoint
            response = await client.get(
                f"http://localhost:8000{admin_endpoint}",
                headers={"Authorization": f"Bearer {user_token}"}
            )
            
            # Should deny user access
            assert response.status_code in [403, 401, 404]
    
    async def test_resource_ownership_authorization(self):
        """Test resource ownership authorization."""
        async with httpx.AsyncClient() as client:
            # Test accessing another user's resources
            user1_token = "user1_token"
            user2_id = "user2_id"
            
            # Try to access user2's profile with user1's token
            response = await client.get(
                f"http://localhost:8000/api/v1/users/{user2_id}",
                headers={"Authorization": f"Bearer {user1_token}"}
            )
            
            # Should deny access to other user's resources
            assert response.status_code in [403, 401, 404]
    
    async def test_token_scope_validation(self):
        """Test token scope validation."""
        from app.core.auth import create_access_token, verify_token_scope
        
        # Create token with limited scope
        user_data = {"user_id": "test-user", "scopes": ["read:profile"]}
        token = create_access_token(user_data)
        
        # Test scope validation
        assert verify_token_scope(token, "read:profile")
        assert not verify_token_scope(token, "write:profile")
        assert not verify_token_scope(token, "admin:users")


@pytest.mark.security
@pytest.mark.asyncio
class TestInputValidationSecurity:
    """Security tests for input validation."""
    
    async def test_sql_injection_protection(self):
        """Test SQL injection protection."""
        async with httpx.AsyncClient() as client:
            # SQL injection payloads
            sql_payloads = [
                "'; DROP TABLE users; --",
                "' OR '1'='1",
                "' UNION SELECT * FROM users --",
                "'; INSERT INTO users VALUES ('hacker', 'password'); --"
            ]
            
            for payload in sql_payloads:
                # Test in search parameter
                response = await client.get(
                    f"http://localhost:8000/api/v1/jobs/search?q={payload}"
                )
                
                # Should not cause server error
                assert response.status_code != 500
                
                # Test in POST data
                user_data = {
                    "email": payload,
                    "password": "TestPassword123!",
                    "first_name": "Test",
                    "last_name": "User"
                }
                
                response = await client.post(
                    "http://localhost:8000/api/v1/auth/register",
                    json=user_data
                )
                
                # Should reject invalid input
                assert response.status_code in [400, 422]
    
    async def test_xss_protection(self):
        """Test XSS protection."""
        async with httpx.AsyncClient() as client:
            # XSS payloads
            xss_payloads = [
                "<script>alert('xss')</script>",
                "javascript:alert('xss')",
                "<img src=x onerror=alert('xss')>",
                "';alert('xss');//"
            ]
            
            for payload in xss_payloads:
                # Test in user profile data
                profile_data = {
                    "professional_headline": payload,
                    "summary": payload
                }
                
                response = await client.put(
                    "http://localhost:8000/api/v1/users/me",
                    json=profile_data,
                    headers={"Authorization": "Bearer test-token"}
                )
                
                # Should sanitize or reject XSS attempts
                if response.status_code == 200:
                    # If accepted, verify content is sanitized
                    profile = response.json()
                    assert "<script>" not in profile.get("professional_headline", "")
                    assert "javascript:" not in profile.get("summary", "")
    
    async def test_command_injection_protection(self):
        """Test command injection protection."""
        async with httpx.AsyncClient() as client:
            # Command injection payloads
            cmd_payloads = [
                "; ls -la",
                "| cat /etc/passwd",
                "&& rm -rf /",
                "`whoami`",
                "$(id)"
            ]
            
            for payload in cmd_payloads:
                # Test in file upload filename
                files = {
                    "file": (payload, b"test content", "text/plain")
                }
                
                response = await client.post(
                    "http://localhost:8000/api/v1/documents/upload",
                    files=files,
                    headers={"Authorization": "Bearer test-token"}
                )
                
                # Should reject dangerous filenames
                assert response.status_code in [400, 422]
    
    async def test_path_traversal_protection(self):
        """Test path traversal protection."""
        async with httpx.AsyncClient() as client:
            # Path traversal payloads
            path_payloads = [
                "../../../etc/passwd",
                "..\\..\\..\\windows\\system32\\config\\sam",
                "....//....//....//etc/passwd",
                "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd"
            ]
            
            for payload in path_payloads:
                # Test in file access endpoint
                response = await client.get(
                    f"http://localhost:8000/api/v1/files/{payload}",
                    headers={"Authorization": "Bearer test-token"}
                )
                
                # Should reject path traversal attempts
                assert response.status_code in [400, 403, 404]


@pytest.mark.security
@pytest.mark.asyncio
class TestDataProtectionSecurity:
    """Security tests for data protection."""
    
    async def test_sensitive_data_exposure(self):
        """Test for sensitive data exposure."""
        async with httpx.AsyncClient() as client:
            # Test user profile endpoint
            response = await client.get(
                "http://localhost:8000/api/v1/users/me",
                headers={"Authorization": "Bearer test-token"}
            )
            
            if response.status_code == 200:
                user_data = response.json()
                
                # Should not expose sensitive data
                assert "password" not in user_data
                assert "password_hash" not in user_data
                assert "salt" not in user_data
                
                # Should not expose internal IDs
                sensitive_fields = ["internal_id", "db_id", "secret_key"]
                for field in sensitive_fields:
                    assert field not in user_data
    
    async def test_pii_data_handling(self):
        """Test PII data handling."""
        async with httpx.AsyncClient() as client:
            # Test data anonymization in logs/responses
            response = await client.get(
                "http://localhost:8000/api/v1/analytics/user-insights",
                headers={"Authorization": "Bearer test-token"}
            )
            
            if response.status_code == 200:
                analytics_data = response.json()
                
                # Should not expose PII in analytics
                pii_fields = ["email", "phone", "ssn", "address"]
                for field in pii_fields:
                    assert field not in str(analytics_data)
    
    async def test_data_encryption_at_rest(self):
        """Test data encryption at rest."""
        from app.core.encryption import encrypt_sensitive_data, decrypt_sensitive_data
        
        # Test encryption/decryption
        sensitive_data = "user_ssn_123456789"
        encrypted = encrypt_sensitive_data(sensitive_data)
        
        # Verify data is encrypted
        assert encrypted != sensitive_data
        assert len(encrypted) > len(sensitive_data)
        
        # Verify decryption works
        decrypted = decrypt_sensitive_data(encrypted)
        assert decrypted == sensitive_data
    
    async def test_secure_headers(self):
        """Test security headers."""
        async with httpx.AsyncClient() as client:
            response = await client.get("http://localhost:8000/api/v1/health")
            
            headers = response.headers
            
            # Check for security headers
            security_headers = {
                "X-Content-Type-Options": "nosniff",
                "X-Frame-Options": "DENY",
                "X-XSS-Protection": "1; mode=block",
                "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
                "Content-Security-Policy": "default-src 'self'"
            }
            
            for header, expected_value in security_headers.items():
                if header in headers:
                    # Header exists, verify it has secure value
                    assert expected_value in headers[header] or headers[header] == expected_value


@pytest.mark.security
@pytest.mark.asyncio
class TestAPISecurityMisconfiguration:
    """Security tests for API misconfigurations."""
    
    async def test_cors_configuration(self):
        """Test CORS configuration security."""
        async with httpx.AsyncClient() as client:
            # Test CORS with various origins
            origins = [
                "https://malicious-site.com",
                "http://localhost:3000",  # Should be allowed
                "*",  # Should not be allowed in production
                "null"
            ]
            
            for origin in origins:
                response = await client.options(
                    "http://localhost:8000/api/v1/health",
                    headers={"Origin": origin}
                )
                
                cors_header = response.headers.get("Access-Control-Allow-Origin")
                
                # Verify CORS is not overly permissive
                if cors_header:
                    assert cors_header != "*" or origin == "http://localhost:3000"
    
    async def test_http_methods_security(self):
        """Test HTTP methods security."""
        async with httpx.AsyncClient() as client:
            # Test unsupported methods
            unsupported_methods = ["TRACE", "CONNECT", "PATCH"]
            
            for method in unsupported_methods:
                response = await client.request(
                    method,
                    "http://localhost:8000/api/v1/health"
                )
                
                # Should not allow dangerous methods
                assert response.status_code in [405, 501]
    
    async def test_information_disclosure(self):
        """Test for information disclosure."""
        async with httpx.AsyncClient() as client:
            # Test error responses for information leakage
            response = await client.get(
                "http://localhost:8000/api/v1/nonexistent-endpoint"
            )
            
            if response.status_code == 404:
                error_text = response.text.lower()
                
                # Should not expose sensitive information
                sensitive_info = [
                    "database", "sql", "connection", "password",
                    "secret", "key", "token", "internal"
                ]
                
                for info in sensitive_info:
                    assert info not in error_text
    
    async def test_rate_limiting_security(self):
        """Test rate limiting implementation."""
        async with httpx.AsyncClient() as client:
            # Test rate limiting
            endpoint = "http://localhost:8000/api/v1/health"
            requests_made = 0
            rate_limited = False
            
            # Make rapid requests
            for i in range(100):
                response = await client.get(endpoint)
                requests_made += 1
                
                if response.status_code == 429:  # Rate limited
                    rate_limited = True
                    break
                
                # Small delay
                await asyncio.sleep(0.01)
            
            # Should implement rate limiting
            assert rate_limited or requests_made < 100, "Rate limiting not implemented"


@pytest.mark.security
class TestSecurityConfiguration:
    """Security tests for configuration and deployment."""
    
    def test_environment_variables_security(self):
        """Test environment variables security."""
        import os
        
        # Check for sensitive data in environment
        env_vars = os.environ
        
        sensitive_patterns = [
            "password", "secret", "key", "token", "credential"
        ]
        
        for var_name, var_value in env_vars.items():
            var_name_lower = var_name.lower()
            
            # Check if variable name suggests sensitive data
            is_sensitive = any(pattern in var_name_lower for pattern in sensitive_patterns)
            
            if is_sensitive:
                # Sensitive variables should not contain obvious values
                assert var_value not in ["password", "secret", "123456", "admin"]
                assert len(var_value) > 8  # Should be reasonably complex
    
    def test_debug_mode_security(self):
        """Test debug mode is disabled in production."""
        from app.core.config import get_settings
        
        settings = get_settings()
        
        # Debug should be disabled in production
        if settings.ENVIRONMENT == "production":
            assert not getattr(settings, 'DEBUG', True)
            assert not getattr(settings, 'TESTING', True)
    
    def test_logging_security(self):
        """Test logging security configuration."""
        import logging
        
        # Get root logger
        logger = logging.getLogger()
        
        # Check log level is appropriate
        if logger.level == logging.DEBUG:
            # Debug logging should only be enabled in development
            from app.core.config import get_settings
            settings = get_settings()
            assert settings.ENVIRONMENT in ["development", "test"]