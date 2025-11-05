"""
Comprehensive tests for input validation and security systems.

This module tests:
- Input sanitization and validation
- SQL injection detection and prevention
- XSS protection
- File upload security
- Rate limiting functionality
"""

import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.core.input_validation import (
    InputSanitizer,
    FileValidator,
    SecureValidators,
    SecurityViolation,
    ValidationError,
    SecureUserInput,
    SecureJobInput,
    SecureFileUpload,
    SecureSearchQuery
)
from app.core.sql_security import (
    SQLInjectionDetector,
    SecureQueryBuilder,
    QueryValidator,
    SecureDatabaseSession
)
from app.core.rate_limiting import (
    EnhancedRateLimiter,
    FixedWindowStrategy,
    SlidingWindowStrategy,
    TokenBucketStrategy
)


class TestInputSanitizer:
    """Test input sanitization functionality."""
    
    def test_sanitize_html_basic(self):
        """Test basic HTML sanitization."""
        
        # Safe HTML
        safe_html = "<p>This is <strong>safe</strong> content.</p>"
        result = InputSanitizer.sanitize_html(safe_html)
        assert "<p>" in result
        assert "<strong>" in result
        
        # Dangerous HTML
        dangerous_html = "<script>alert('xss')</script><p>Content</p>"
        result = InputSanitizer.sanitize_html(dangerous_html)
        assert "<script>" not in result
        assert "alert" not in result
        assert "<p>" in result
    
    def test_sanitize_html_xss_prevention(self):
        """Test XSS prevention in HTML sanitization."""
        
        xss_attempts = [
            "<img src=x onerror=alert('xss')>",
            "<a href='javascript:alert(1)'>Click</a>",
            "<div onload='alert(1)'>Content</div>",
            "<iframe src='javascript:alert(1)'></iframe>"
        ]
        
        for xss in xss_attempts:
            result = InputSanitizer.sanitize_html(xss)
            assert "alert" not in result.lower()
            assert "javascript:" not in result.lower()
            assert "onerror" not in result.lower()
            assert "onload" not in result.lower()
    
    def test_sanitize_text(self):
        """Test text sanitization."""
        
        # Normal text
        normal_text = "This is normal text with spaces."
        result = InputSanitizer.sanitize_text(normal_text)
        assert result == normal_text
        
        # Text with control characters
        dirty_text = "Text\x00with\x01control\x02characters"
        result = InputSanitizer.sanitize_text(dirty_text)
        assert "\x00" not in result
        assert "\x01" not in result
        assert "\x02" not in result
        
        # Text with excessive whitespace
        whitespace_text = "Text   with    excessive     whitespace"
        result = InputSanitizer.sanitize_text(whitespace_text)
        assert "   " not in result
        
        # Text length limiting
        long_text = "a" * 1000
        result = InputSanitizer.sanitize_text(long_text, max_length=100)
        assert len(result) <= 100
    
    def test_sanitize_filename(self):
        """Test filename sanitization."""
        
        # Normal filename
        normal_filename = "document.pdf"
        result = InputSanitizer.sanitize_filename(normal_filename)
        assert result == normal_filename
        
        # Dangerous filename
        dangerous_filename = "../../../etc/passwd"
        result = InputSanitizer.sanitize_filename(dangerous_filename)
        assert "../" not in result
        assert result == "passwd"
        
        # Filename with dangerous characters
        bad_chars_filename = "file<>:\"/\\|?*.txt"
        result = InputSanitizer.sanitize_filename(bad_chars_filename)
        assert "<" not in result
        assert ">" not in result
        assert ":" not in result
        
        # Executable extension
        exe_filename = "malware.exe"
        result = InputSanitizer.sanitize_filename(exe_filename)
        assert result.endswith(".txt")
    
    def test_sanitize_url(self):
        """Test URL sanitization."""
        
        # Valid URLs
        valid_urls = [
            "https://example.com",
            "http://example.com/path",
            "mailto:user@example.com"
        ]
        
        for url in valid_urls:
            result = InputSanitizer.sanitize_url(url)
            assert result == url
        
        # Invalid URLs
        invalid_urls = [
            "javascript:alert(1)",
            "data:text/html,<script>alert(1)</script>",
            "ftp://example.com",
            "file:///etc/passwd"
        ]
        
        for url in invalid_urls:
            result = InputSanitizer.sanitize_url(url)
            assert result is None
        
        # Private IP URLs (SSRF prevention)
        private_urls = [
            "http://192.168.1.1",
            "http://10.0.0.1",
            "http://127.0.0.1",
            "http://localhost"
        ]
        
        for url in private_urls:
            result = InputSanitizer.sanitize_url(url)
            assert result is None
    
    def test_detect_sql_injection(self):
        """Test SQL injection detection."""
        
        # Safe inputs
        safe_inputs = [
            "normal text",
            "user@example.com",
            "Product Name 123"
        ]
        
        for safe_input in safe_inputs:
            result = InputSanitizer.detect_sql_injection(safe_input)
            assert result is False
        
        # SQL injection attempts
        sql_injections = [
            "1' OR '1'='1",
            "'; DROP TABLE users; --",
            "1 UNION SELECT * FROM users",
            "admin'/**/OR/**/1=1#",
            "1; EXEC xp_cmdshell('dir')"
        ]
        
        for injection in sql_injections:
            result = InputSanitizer.detect_sql_injection(injection)
            assert result is True
    
    def test_detect_xss(self):
        """Test XSS detection."""
        
        # Safe inputs
        safe_inputs = [
            "normal text",
            "<p>Safe HTML</p>",
            "user@example.com"
        ]
        
        for safe_input in safe_inputs:
            result = InputSanitizer.detect_xss(safe_input)
            assert result is False
        
        # XSS attempts
        xss_attempts = [
            "<script>alert('xss')</script>",
            "javascript:alert(1)",
            "<img onerror='alert(1)' src=x>",
            "<iframe src='javascript:alert(1)'></iframe>",
            "eval('alert(1)')"
        ]
        
        for xss in xss_attempts:
            result = InputSanitizer.detect_xss(xss)
            assert result is True


class TestFileValidator:
    """Test file validation functionality."""
    
    def test_validate_file_type(self):
        """Test file type validation."""
        
        # Mock file content (JPEG signature)
        jpeg_content = b'\xff\xd8\xff\xe0\x00\x10JFIF'
        
        with patch('magic.from_buffer') as mock_magic:
            mock_magic.return_value = 'image/jpeg'
            
            # Valid image file
            result = FileValidator.validate_file_type(
                jpeg_content, 
                "image.jpg", 
                ["image/jpeg", "image/png"]
            )
            assert result is True
            
            # Invalid file type
            result = FileValidator.validate_file_type(
                jpeg_content, 
                "image.jpg", 
                ["application/pdf"]
            )
            assert result is False
    
    def test_validate_file_size(self):
        """Test file size validation."""
        
        # Small file
        small_content = b"small file content"
        result = FileValidator.validate_file_size(small_content, max_size=1024)
        assert result is True
        
        # Large file
        large_content = b"x" * 2048
        result = FileValidator.validate_file_size(large_content, max_size=1024)
        assert result is False
    
    def test_scan_for_malware(self):
        """Test basic malware scanning."""
        
        # Safe file content
        safe_content = b"This is safe text content"
        result = FileValidator.scan_for_malware(safe_content, "document.txt")
        assert result is True
        
        # Executable signature
        exe_content = b"MZ\x90\x00\x03\x00\x00\x00"  # PE executable signature
        result = FileValidator.scan_for_malware(exe_content, "file.txt")
        assert result is False
        
        # Script content in non-script file
        script_content = b"<script>alert('xss')</script>"
        result = FileValidator.scan_for_malware(script_content, "document.txt")
        assert result is False
    
    def test_validate_image(self):
        """Test image validation."""
        
        with patch('PIL.Image.open') as mock_open:
            # Mock valid image
            mock_image = MagicMock()
            mock_image.width = 1024
            mock_image.height = 768
            mock_open.return_value = mock_image
            
            result = FileValidator.validate_image(b"fake_image_data", "image.jpg")
            assert result is True
            
            # Mock oversized image
            mock_image.width = 10000
            mock_image.height = 10000
            
            result = FileValidator.validate_image(b"fake_image_data", "large.jpg")
            assert result is False


class TestSecureValidators:
    """Test secure Pydantic validators."""
    
    def test_validate_safe_string(self):
        """Test safe string validation."""
        
        # Safe string
        safe_string = "This is a safe string"
        result = SecureValidators.validate_safe_string(safe_string)
        assert result == safe_string
        
        # String with SQL injection
        with pytest.raises(SecurityViolation):
            SecureValidators.validate_safe_string("1' OR '1'='1")
        
        # String with XSS
        with pytest.raises(SecurityViolation):
            SecureValidators.validate_safe_string("<script>alert('xss')</script>")
    
    def test_validate_html_content(self):
        """Test HTML content validation."""
        
        # Safe HTML
        safe_html = "<p>This is <strong>safe</strong> content.</p>"
        result = SecureValidators.validate_html_content(safe_html)
        assert "<p>" in result
        assert "<strong>" in result
        
        # HTML with dangerous content
        dangerous_html = "<script>alert('xss')</script><p>Content</p>"
        result = SecureValidators.validate_html_content(dangerous_html)
        assert "<script>" not in result
    
    def test_validate_url_field(self):
        """Test URL field validation."""
        
        # Valid URL
        valid_url = "https://example.com"
        result = SecureValidators.validate_url_field(valid_url)
        assert result == valid_url
        
        # Invalid URL
        with pytest.raises(ValueError):
            SecureValidators.validate_url_field("javascript:alert(1)")
    
    def test_validate_json_field(self):
        """Test JSON field validation."""
        
        # Valid JSON string
        json_string = '{"key": "value"}'
        result = SecureValidators.validate_json_field(json_string)
        assert result == {"key": "value"}
        
        # Valid JSON dict
        json_dict = {"key": "value"}
        result = SecureValidators.validate_json_field(json_dict)
        assert result == json_dict
        
        # JSON with SQL injection
        with pytest.raises(SecurityViolation):
            SecureValidators.validate_json_field('{"query": "1\' OR \'1\'=\'1"}')


class TestSecureModels:
    """Test secure Pydantic models."""
    
    def test_secure_user_input(self):
        """Test secure user input model."""
        
        # Valid user input
        valid_data = {
            "first_name": "John",
            "last_name": "Doe",
            "email": "john@example.com",
            "bio": "<p>Software engineer</p>",
            "website": "https://johndoe.com"
        }
        
        user_input = SecureUserInput(**valid_data)
        assert user_input.first_name == "John"
        assert user_input.email == "john@example.com"
        
        # Invalid user input with XSS
        with pytest.raises(SecurityViolation):
            SecureUserInput(
                first_name="<script>alert('xss')</script>",
                last_name="Doe",
                email="john@example.com"
            )
    
    def test_secure_job_input(self):
        """Test secure job input model."""
        
        # Valid job input
        valid_data = {
            "title": "Software Engineer",
            "company": "Tech Corp",
            "description": "<p>We are looking for a software engineer...</p>",
            "requirements": ["Python", "FastAPI", "PostgreSQL"],
            "location": "Remote",
            "salary_min": 80000,
            "salary_max": 120000,
            "remote_allowed": True
        }
        
        job_input = SecureJobInput(**valid_data)
        assert job_input.title == "Software Engineer"
        assert len(job_input.requirements) == 3
        
        # Invalid salary range
        with pytest.raises(ValueError):
            SecureJobInput(
                title="Engineer",
                company="Corp",
                description="Description",
                requirements=["Python"],
                salary_min=120000,
                salary_max=80000
            )
    
    def test_secure_search_query(self):
        """Test secure search query model."""
        
        # Valid search query
        valid_data = {
            "query": "python developer",
            "filters": {"location": "remote", "experience": "senior"},
            "sort_by": "created_at",
            "sort_order": "desc",
            "limit": 20,
            "offset": 0
        }
        
        search_query = SecureSearchQuery(**valid_data)
        assert search_query.query == "python developer"
        assert search_query.limit == 20
        
        # Invalid sort field
        with pytest.raises(ValueError):
            SecureSearchQuery(
                query="test",
                sort_by="'; DROP TABLE users; --"
            )


class TestSQLSecurity:
    """Test SQL security functionality."""
    
    def test_sql_injection_detector(self):
        """Test SQL injection detection."""
        
        # Safe queries
        safe_queries = [
            "SELECT * FROM users WHERE id = ?",
            "INSERT INTO jobs (title, company) VALUES (?, ?)",
            "UPDATE users SET name = ? WHERE id = ?"
        ]
        
        for query in safe_queries:
            is_suspicious, patterns = SQLInjectionDetector.detect_sql_injection(query)
            assert is_suspicious is False
        
        # Malicious queries
        malicious_queries = [
            "SELECT * FROM users WHERE id = 1 OR 1=1",
            "'; DROP TABLE users; --",
            "1 UNION SELECT password FROM users",
            "1; EXEC xp_cmdshell('dir')"
        ]
        
        for query in malicious_queries:
            is_suspicious, patterns = SQLInjectionDetector.detect_sql_injection(query)
            assert is_suspicious is True
            assert len(patterns) > 0
    
    def test_secure_query_builder(self):
        """Test secure query builder."""
        
        # SELECT query
        query, params = SecureQueryBuilder.build_select_query(
            table="users",
            columns=["id", "name", "email"],
            where_conditions={"active": True, "role": "user"},
            order_by="created_at DESC",
            limit=10,
            offset=0
        )
        
        assert "SELECT id, name, email FROM users" in query
        assert "WHERE" in query
        assert "ORDER BY created_at DESC" in query
        assert "LIMIT 10" in query
        assert len(params) == 2
        
        # INSERT query
        query, params = SecureQueryBuilder.build_insert_query(
            table="users",
            data={"name": "John Doe", "email": "john@example.com"}
        )
        
        assert "INSERT INTO users" in query
        assert "VALUES" in query
        assert len(params) == 2
        
        # Invalid table name
        with pytest.raises(ValueError):
            SecureQueryBuilder.build_select_query(
                table="users; DROP TABLE users; --",
                columns=["id"]
            )
    
    def test_query_validator(self):
        """Test query validation."""
        
        # Safe queries
        safe_queries = [
            "SELECT * FROM users WHERE id = ?",
            "INSERT INTO jobs (title) VALUES (?)",
            "UPDATE users SET name = ? WHERE id = ?"
        ]
        
        for query in safe_queries:
            result = QueryValidator.validate_query(query, ["SELECT", "INSERT", "UPDATE"])
            assert result is True
        
        # Dangerous queries
        dangerous_queries = [
            "DROP TABLE users",
            "DELETE FROM users WHERE 1=1",
            "EXEC xp_cmdshell('dir')"
        ]
        
        for query in dangerous_queries:
            result = QueryValidator.validate_query(query, ["SELECT", "INSERT", "UPDATE"])
            assert result is False


class TestRateLimiting:
    """Test rate limiting functionality."""
    
    @pytest.fixture
    def mock_redis(self):
        """Mock Redis client."""
        redis_mock = AsyncMock()
        redis_mock.get = AsyncMock()
        redis_mock.incr = AsyncMock()
        redis_mock.expire = AsyncMock()
        redis_mock.zremrangebyscore = AsyncMock()
        redis_mock.zcard = AsyncMock()
        redis_mock.zrange = AsyncMock()
        redis_mock.zadd = AsyncMock()
        redis_mock.hmget = AsyncMock()
        redis_mock.hmset = AsyncMock()
        redis_mock.pipeline = AsyncMock()
        return redis_mock
    
    @pytest.mark.asyncio
    async def test_fixed_window_strategy(self, mock_redis):
        """Test fixed window rate limiting strategy."""
        
        strategy = FixedWindowStrategy(mock_redis)
        
        # First request (allowed)
        mock_redis.get.return_value = None
        mock_redis.pipeline.return_value.execute = AsyncMock()
        
        allowed, info = await strategy.is_allowed("test_key", 5, 60)
        
        assert allowed is True
        assert info["limit"] == 5
        assert info["remaining"] == 4
        
        # Limit exceeded
        mock_redis.get.return_value = b"5"
        
        allowed, info = await strategy.is_allowed("test_key", 5, 60)
        
        assert allowed is False
        assert info["remaining"] == 0
    
    @pytest.mark.asyncio
    async def test_sliding_window_strategy(self, mock_redis):
        """Test sliding window rate limiting strategy."""
        
        strategy = SlidingWindowStrategy(mock_redis)
        
        # First request (allowed)
        mock_redis.zcard.return_value = 0
        
        allowed, info = await strategy.is_allowed("test_key", 5, 60)
        
        assert allowed is True
        assert info["limit"] == 5
        
        # Limit exceeded
        mock_redis.zcard.return_value = 5
        mock_redis.zrange.return_value = [(b"123456789", 123456789.0)]
        
        allowed, info = await strategy.is_allowed("test_key", 5, 60)
        
        assert allowed is False
        assert info["remaining"] == 0
    
    @pytest.mark.asyncio
    async def test_token_bucket_strategy(self, mock_redis):
        """Test token bucket rate limiting strategy."""
        
        strategy = TokenBucketStrategy(mock_redis)
        
        # First request (allowed)
        mock_redis.hmget.return_value = [None, None]
        
        allowed, info = await strategy.is_allowed("test_key", 5, 60)
        
        assert allowed is True
        assert info["limit"] == 5
        
        # No tokens available
        mock_redis.hmget.return_value = [b"0", b"123456789"]
        
        allowed, info = await strategy.is_allowed("test_key", 5, 60)
        
        assert allowed is False
        assert info["remaining"] == 0
    
    @pytest.mark.asyncio
    async def test_enhanced_rate_limiter(self, mock_redis):
        """Test enhanced rate limiter."""
        
        rate_limiter = EnhancedRateLimiter(mock_redis)
        
        # Mock request
        mock_request = MagicMock()
        mock_request.client.host = "192.168.1.1"
        
        # Mock strategy
        with patch.object(rate_limiter.strategies["sliding_window"], "is_allowed") as mock_strategy:
            mock_strategy.return_value = (True, {
                "limit": 100,
                "remaining": 99,
                "reset": 123456789,
                "retry_after": 0
            })
            
            allowed, info = await rate_limiter.check_rate_limit(mock_request)
            
            assert allowed is True
            assert info["remaining"] == 99
        
        # Test trusted IP
        await rate_limiter.add_trusted_ip("192.168.1.1")
        
        allowed, info = await rate_limiter.check_rate_limit(mock_request)
        
        assert allowed is True
        assert info["limit"] == float('inf')
        
        # Test blocked IP
        await rate_limiter.block_ip("192.168.1.1")
        
        with pytest.raises(HTTPException):
            await rate_limiter.check_rate_limit(mock_request)


class TestSecurityMiddleware:
    """Test security middleware functionality."""
    
    def test_security_validation_middleware(self):
        """Test security validation middleware."""
        
        from app.middleware.security_validation import SecurityValidationMiddleware
        from fastapi import FastAPI
        
        app = FastAPI()
        app.add_middleware(SecurityValidationMiddleware)
        
        client = TestClient(app)
        
        @app.get("/test")
        async def test_endpoint():
            return {"message": "success"}
        
        # Normal request
        response = client.get("/test")
        assert response.status_code == 200
        
        # Check security headers
        assert "X-Content-Type-Options" in response.headers
        assert "X-Frame-Options" in response.headers
        assert "X-XSS-Protection" in response.headers
    
    def test_request_size_validation(self):
        """Test request size validation."""
        
        from app.middleware.security_validation import SecurityValidationMiddleware
        from fastapi import FastAPI, Request
        
        app = FastAPI()
        app.add_middleware(SecurityValidationMiddleware, max_request_size=1024)
        
        client = TestClient(app)
        
        @app.post("/test")
        async def test_endpoint(request: Request):
            return {"message": "success"}
        
        # Small request (should pass)
        response = client.post("/test", json={"data": "small"})
        assert response.status_code == 200
        
        # Large request (should fail)
        large_data = {"data": "x" * 2000}
        response = client.post("/test", json=large_data)
        assert response.status_code == 413


if __name__ == "__main__":
    pytest.main([__file__])