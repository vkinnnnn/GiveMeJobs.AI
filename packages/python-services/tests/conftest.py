"""
Simple pytest configuration for basic testing.

This is a minimal conftest.py that provides basic fixtures
without complex application dependencies.
"""

import asyncio
import pytest
import pytest_asyncio
from typing import AsyncGenerator, Generator
from unittest.mock import AsyncMock, MagicMock


# Basic event loop fixture
@pytest.fixture(scope="session")
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


# Mock fixtures for testing
@pytest.fixture
def mock_database():
    """Mock database for testing."""
    return {
        "users": [],
        "jobs": [],
        "applications": []
    }


@pytest.fixture
def mock_redis():
    """Mock Redis client."""
    mock_redis = AsyncMock()
    mock_redis.get.return_value = None
    mock_redis.set.return_value = True
    mock_redis.delete.return_value = 1
    mock_redis.exists.return_value = False
    mock_redis.keys.return_value = []
    mock_redis.ping.return_value = True
    return mock_redis


@pytest.fixture
def sample_user_data():
    """Sample user data for testing."""
    return {
        "id": "user_123",
        "email": "test@example.com",
        "first_name": "Test",
        "last_name": "User",
        "is_active": True
    }


@pytest.fixture
def sample_job_data():
    """Sample job data for testing."""
    return {
        "id": "job_123",
        "title": "Software Engineer",
        "company": "Tech Corp",
        "location": "San Francisco, CA",
        "remote_type": "hybrid",
        "status": "active"
    }


# Performance testing fixture
@pytest.fixture
def performance_threshold():
    """Performance thresholds for testing."""
    return {
        "api_response_time": 2.0,
        "database_query_time": 0.5,
        "cache_operation_time": 0.1
    }


# Test data factory
class TestDataFactory:
    """Factory for creating test data."""
    
    @staticmethod
    def create_user(override=None):
        """Create user test data."""
        data = {
            "email": "factory@example.com",
            "first_name": "Factory",
            "last_name": "User",
            "password": "TestPassword123!"
        }
        if override:
            data.update(override)
        return data
    
    @staticmethod
    def create_job(override=None):
        """Create job test data."""
        data = {
            "title": "Test Job",
            "company": "Test Company",
            "location": "Test City",
            "description": "Test job description"
        }
        if override:
            data.update(override)
        return data


@pytest.fixture
def test_data_factory():
    """Test data factory fixture."""
    return TestDataFactory()


# Cleanup fixture
@pytest.fixture(autouse=True)
def cleanup_after_test():
    """Cleanup after each test."""
    yield
    # Cleanup code would go here
    pass