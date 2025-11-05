"""
Test helper utilities for common testing operations.

This module provides utility functions and classes to simplify
testing operations and reduce code duplication in tests.
"""

import asyncio
import json
import time
from contextlib import asynccontextmanager, contextmanager
from typing import Any, AsyncGenerator, Dict, List, Optional, Union
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import status
from httpx import AsyncClient, Response
from sqlalchemy.ext.asyncio import AsyncSession


class APITestHelper:
    """Helper class for API testing operations."""
    
    def __init__(self, client: AsyncClient):
        self.client = client
        self.base_url = "/api/v1"
    
    async def post_json(
        self, 
        endpoint: str, 
        data: Dict[str, Any], 
        headers: Optional[Dict[str, str]] = None,
        expected_status: int = status.HTTP_201_CREATED
    ) -> Response:
        """POST JSON data to endpoint and assert status."""
        response = await self.client.post(
            f"{self.base_url}{endpoint}",
            json=data,
            headers=headers
        )
        assert response.status_code == expected_status, f"Expected {expected_status}, got {response.status_code}: {response.text}"
        return response
    
    async def get(
        self, 
        endpoint: str, 
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
        expected_status: int = status.HTTP_200_OK
    ) -> Response:
        """GET endpoint and assert status."""
        response = await self.client.get(
            f"{self.base_url}{endpoint}",
            params=params,
            headers=headers
        )
        assert response.status_code == expected_status, f"Expected {expected_status}, got {response.status_code}: {response.text}"
        return response
    
    async def put_json(
        self, 
        endpoint: str, 
        data: Dict[str, Any], 
        headers: Optional[Dict[str, str]] = None,
        expected_status: int = status.HTTP_200_OK
    ) -> Response:
        """PUT JSON data to endpoint and assert status."""
        response = await self.client.put(
            f"{self.base_url}{endpoint}",
            json=data,
            headers=headers
        )
        assert response.status_code == expected_status, f"Expected {expected_status}, got {response.status_code}: {response.text}"
        return response
    
    async def delete(
        self, 
        endpoint: str, 
        headers: Optional[Dict[str, str]] = None,
        expected_status: int = status.HTTP_204_NO_CONTENT
    ) -> Response:
        """DELETE endpoint and assert status."""
        response = await self.client.delete(
            f"{self.base_url}{endpoint}",
            headers=headers
        )
        assert response.status_code == expected_status, f"Expected {expected_status}, got {response.status_code}: {response.text}"
        return response
    
    async def login_user(self, email: str, password: str) -> str:
        """Login user and return access token."""
        response = await self.client.post(
            f"{self.base_url}/auth/login",
            data={"username": email, "password": password}
        )
        assert response.status_code == status.HTTP_200_OK
        return response.json()["access_token"]
    
    def get_auth_headers(self, token: str) -> Dict[str, str]:
        """Get authorization headers with token."""
        return {"Authorization": f"Bearer {token}"}


class DatabaseTestHelper:
    """Helper class for database testing operations."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def count_records(self, model_class) -> int:
        """Count total records in a table."""
        from sqlalchemy import select, func
        result = await self.session.execute(select(func.count(model_class.id)))
        return result.scalar()
    
    async def get_by_id(self, model_class, record_id: Union[str, int]):
        """Get record by ID."""
        from sqlalchemy import select
        result = await self.session.execute(select(model_class).where(model_class.id == record_id))
        return result.scalar_one_or_none()
    
    async def get_by_field(self, model_class, field_name: str, field_value: Any):
        """Get record by field value."""
        from sqlalchemy import select
        field = getattr(model_class, field_name)
        result = await self.session.execute(select(model_class).where(field == field_value))
        return result.scalar_one_or_none()
    
    async def create_record(self, model_class, **kwargs):
        """Create and save a record."""
        record = model_class(**kwargs)
        self.session.add(record)
        await self.session.commit()
        await self.session.refresh(record)
        return record
    
    async def delete_all_records(self, model_class):
        """Delete all records from a table."""
        from sqlalchemy import delete
        await self.session.execute(delete(model_class))
        await self.session.commit()
    
    async def execute_raw_sql(self, sql: str, params: Optional[Dict[str, Any]] = None):
        """Execute raw SQL query."""
        from sqlalchemy import text
        result = await self.session.execute(text(sql), params or {})
        await self.session.commit()
        return result


class MockServiceHelper:
    """Helper class for mocking external services."""
    
    @staticmethod
    def mock_openai_response(content: str = "Generated AI content") -> MagicMock:
        """Create mock OpenAI response."""
        mock_response = MagicMock()
        mock_response.choices = [
            MagicMock(message=MagicMock(content=content))
        ]
        return mock_response
    
    @staticmethod
    def mock_pinecone_query_response(matches: Optional[List[Dict[str, Any]]] = None) -> MagicMock:
        """Create mock Pinecone query response."""
        if matches is None:
            matches = [
                {
                    "id": "job_1",
                    "score": 0.95,
                    "metadata": {
                        "title": "Senior Python Developer",
                        "company": "Tech Corp"
                    }
                }
            ]
        
        mock_response = MagicMock()
        mock_response.matches = [MagicMock(**match) for match in matches]
        return mock_response
    
    @staticmethod
    def mock_redis_client() -> AsyncMock:
        """Create mock Redis client."""
        mock_redis = AsyncMock()
        mock_redis.get.return_value = None
        mock_redis.set.return_value = True
        mock_redis.delete.return_value = 1
        mock_redis.exists.return_value = False
        mock_redis.keys.return_value = []
        mock_redis.ping.return_value = True
        return mock_redis
    
    @staticmethod
    def mock_celery_task(task_id: str = "test-task-id", status: str = "SUCCESS") -> MagicMock:
        """Create mock Celery task result."""
        mock_task = MagicMock()
        mock_task.id = task_id
        mock_task.status = status
        mock_task.result = {"status": "completed"}
        return mock_task


class PerformanceTestHelper:
    """Helper class for performance testing."""
    
    def __init__(self):
        self.start_time = None
        self.end_time = None
        self.measurements = []
    
    def start_timer(self):
        """Start performance timer."""
        self.start_time = time.time()
    
    def stop_timer(self) -> float:
        """Stop timer and return duration."""
        self.end_time = time.time()
        duration = self.end_time - self.start_time
        self.measurements.append(duration)
        return duration
    
    def assert_duration_under(self, max_duration: float):
        """Assert last measurement is under threshold."""
        if not self.measurements:
            raise AssertionError("No measurements taken")
        
        last_duration = self.measurements[-1]
        assert last_duration < max_duration, f"Duration {last_duration:.3f}s exceeds limit {max_duration}s"
    
    def get_average_duration(self) -> float:
        """Get average duration of all measurements."""
        if not self.measurements:
            return 0.0
        return sum(self.measurements) / len(self.measurements)
    
    def get_max_duration(self) -> float:
        """Get maximum duration of all measurements."""
        return max(self.measurements) if self.measurements else 0.0
    
    @contextmanager
    def measure_time(self):
        """Context manager for measuring execution time."""
        self.start_timer()
        try:
            yield self
        finally:
            self.stop_timer()


class SecurityTestHelper:
    """Helper class for security testing."""
    
    SQL_INJECTION_PAYLOADS = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "1; DELETE FROM users WHERE 1=1; --",
        "' UNION SELECT * FROM users --",
        "admin'--",
        "admin'/*",
        "' OR 1=1#"
    ]
    
    XSS_PAYLOADS = [
        "<script>alert('xss')</script>",
        "javascript:alert('xss')",
        "<img src=x onerror=alert('xss')>",
        "';alert('xss');//",
        "<svg onload=alert('xss')>",
        "javascript:/*--></title></style></textarea></script></xmp><svg/onload='+/*/`/*\\x00*/alert(1)//'>"
    ]
    
    PATH_TRAVERSAL_PAYLOADS = [
        "../../../etc/passwd",
        "..\\..\\..\\windows\\system32\\drivers\\etc\\hosts",
        "....//....//....//etc/passwd",
        "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd"
    ]
    
    @classmethod
    async def test_sql_injection(cls, client: AsyncClient, endpoint: str, field: str):
        """Test SQL injection vulnerabilities."""
        for payload in cls.SQL_INJECTION_PAYLOADS:
            data = {field: payload}
            response = await client.post(endpoint, json=data)
            
            # Should not return 500 (server error) or 200 with suspicious content
            assert response.status_code != 500, f"SQL injection payload caused server error: {payload}"
            
            if response.status_code == 200:
                response_text = response.text.lower()
                suspicious_keywords = ["sql", "syntax error", "database", "mysql", "postgresql"]
                for keyword in suspicious_keywords:
                    assert keyword not in response_text, f"SQL injection payload leaked database info: {payload}"
    
    @classmethod
    async def test_xss_vulnerability(cls, client: AsyncClient, endpoint: str, field: str):
        """Test XSS vulnerabilities."""
        for payload in cls.XSS_PAYLOADS:
            data = {field: payload}
            response = await client.post(endpoint, json=data)
            
            # Payload should be sanitized in response
            if response.status_code == 200:
                response_text = response.text
                assert payload not in response_text, f"XSS payload not sanitized: {payload}"
    
    @classmethod
    async def test_authentication_bypass(cls, client: AsyncClient, protected_endpoint: str):
        """Test authentication bypass attempts."""
        # Test without token
        response = await client.get(protected_endpoint)
        assert response.status_code == 401, "Protected endpoint accessible without authentication"
        
        # Test with invalid token
        headers = {"Authorization": "Bearer invalid_token"}
        response = await client.get(protected_endpoint, headers=headers)
        assert response.status_code == 401, "Protected endpoint accessible with invalid token"
        
        # Test with malformed token
        headers = {"Authorization": "Bearer "}
        response = await client.get(protected_endpoint, headers=headers)
        assert response.status_code == 401, "Protected endpoint accessible with malformed token"


class ValidationTestHelper:
    """Helper class for validation testing."""
    
    @staticmethod
    async def test_required_fields(client: AsyncClient, endpoint: str, required_fields: List[str]):
        """Test that required fields are validated."""
        for field in required_fields:
            # Test with missing field
            data = {f: "test_value" for f in required_fields if f != field}
            response = await client.post(endpoint, json=data)
            assert response.status_code == 422, f"Missing required field '{field}' not validated"
            
            # Check error message mentions the field
            error_detail = response.json().get("detail", [])
            field_errors = [error for error in error_detail if error.get("loc", [])[-1] == field]
            assert field_errors, f"No validation error for missing field '{field}'"
    
    @staticmethod
    async def test_field_types(client: AsyncClient, endpoint: str, field_types: Dict[str, Any]):
        """Test field type validation."""
        for field, invalid_value in field_types.items():
            data = {"valid_field": "valid_value", field: invalid_value}
            response = await client.post(endpoint, json=data)
            assert response.status_code == 422, f"Invalid type for field '{field}' not validated"
    
    @staticmethod
    async def test_field_lengths(client: AsyncClient, endpoint: str, field_limits: Dict[str, int]):
        """Test field length validation."""
        for field, max_length in field_limits.items():
            # Test exceeding max length
            long_value = "x" * (max_length + 1)
            data = {"valid_field": "valid_value", field: long_value}
            response = await client.post(endpoint, json=data)
            assert response.status_code == 422, f"Field '{field}' length limit not enforced"


class CacheTestHelper:
    """Helper class for cache testing."""
    
    def __init__(self, cache_service):
        self.cache_service = cache_service
    
    async def assert_cached(self, key: str, expected_value: Any = None):
        """Assert that a key exists in cache."""
        exists = await self.cache_service.exists(key)
        assert exists, f"Key '{key}' not found in cache"
        
        if expected_value is not None:
            cached_value = await self.cache_service.get(key)
            assert cached_value == expected_value, f"Cached value mismatch for key '{key}'"
    
    async def assert_not_cached(self, key: str):
        """Assert that a key does not exist in cache."""
        exists = await self.cache_service.exists(key)
        assert not exists, f"Key '{key}' unexpectedly found in cache"
    
    async def clear_cache(self):
        """Clear all cache entries."""
        await self.cache_service.clear_all()


# Async context managers for testing
@asynccontextmanager
async def temporary_user(session: AsyncSession, user_data: Dict[str, Any]) -> AsyncGenerator[Any, None]:
    """Create temporary user for testing."""
    from app.services.user import UserService
    from app.models.user import UserCreate
    
    user_service = UserService(session)
    user_create = UserCreate(**user_data)
    user = await user_service.create_user(user_create)
    
    try:
        yield user
    finally:
        # Cleanup user
        await user_service.delete_user(user.id)


@asynccontextmanager
async def temporary_job(session: AsyncSession, job_data: Dict[str, Any]) -> AsyncGenerator[Any, None]:
    """Create temporary job for testing."""
    from app.services.job import JobService
    from app.models.job import JobCreate
    
    job_service = JobService(session)
    job_create = JobCreate(**job_data)
    job = await job_service.create_job(job_create)
    
    try:
        yield job
    finally:
        # Cleanup job
        await job_service.delete_job(job.id)


# Assertion helpers
def assert_valid_uuid(value: str):
    """Assert that value is a valid UUID."""
    import uuid
    try:
        uuid.UUID(value)
    except ValueError:
        pytest.fail(f"'{value}' is not a valid UUID")


def assert_valid_email(email: str):
    """Assert that email is valid format."""
    import re
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    assert re.match(email_pattern, email), f"'{email}' is not a valid email format"


def assert_valid_datetime(dt_string: str):
    """Assert that string is valid ISO datetime."""
    from datetime import datetime
    try:
        datetime.fromisoformat(dt_string.replace('Z', '+00:00'))
    except ValueError:
        pytest.fail(f"'{dt_string}' is not a valid ISO datetime")


def assert_response_time_under(response: Response, max_seconds: float):
    """Assert that response time is under threshold."""
    response_time = response.elapsed.total_seconds()
    assert response_time < max_seconds, f"Response time {response_time:.3f}s exceeds limit {max_seconds}s"


def assert_json_structure(data: Dict[str, Any], expected_structure: Dict[str, type]):
    """Assert that JSON data matches expected structure."""
    for key, expected_type in expected_structure.items():
        assert key in data, f"Missing key '{key}' in response"
        assert isinstance(data[key], expected_type), f"Key '{key}' should be {expected_type.__name__}, got {type(data[key]).__name__}"


# Parametrized test helpers
def parametrize_database_types():
    """Parametrize tests for different database types."""
    return pytest.mark.parametrize("database_type", ["sqlite", "postgresql"])


def parametrize_user_roles():
    """Parametrize tests for different user roles."""
    return pytest.mark.parametrize("user_role", ["user", "admin", "moderator"])


def parametrize_batch_sizes():
    """Parametrize tests for different batch sizes."""
    return pytest.mark.parametrize("batch_size", [1, 5, 10, 50])


# Test data validation helpers
def validate_user_response(user_data: Dict[str, Any]):
    """Validate user response structure."""
    required_fields = ["id", "email", "first_name", "last_name", "created_at"]
    for field in required_fields:
        assert field in user_data, f"Missing field '{field}' in user response"
    
    assert_valid_uuid(user_data["id"])
    assert_valid_email(user_data["email"])
    assert_valid_datetime(user_data["created_at"])


def validate_job_response(job_data: Dict[str, Any]):
    """Validate job response structure."""
    required_fields = ["id", "title", "company", "location", "created_at"]
    for field in required_fields:
        assert field in job_data, f"Missing field '{field}' in job response"
    
    assert_valid_uuid(job_data["id"])
    assert_valid_datetime(job_data["created_at"])


def validate_pagination_response(response_data: Dict[str, Any]):
    """Validate pagination response structure."""
    required_fields = ["items", "total", "page", "size", "pages"]
    for field in required_fields:
        assert field in response_data, f"Missing field '{field}' in pagination response"
    
    assert isinstance(response_data["items"], list)
    assert isinstance(response_data["total"], int)
    assert isinstance(response_data["page"], int)
    assert isinstance(response_data["size"], int)
    assert isinstance(response_data["pages"], int)