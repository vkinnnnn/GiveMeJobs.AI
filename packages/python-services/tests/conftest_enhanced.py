"""
Enhanced pytest configuration and fixtures for comprehensive testing.

This module provides advanced fixtures for testing FastAPI applications,
including database fixtures, mock services, authentication helpers,
and performance testing utilities.
"""

import asyncio
import json
import os
import tempfile
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, AsyncGenerator, Dict, Generator, List, Optional
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
import pytest_asyncio
from fastapi import FastAPI
from fastapi.testclient import TestClient
from httpx import AsyncClient
from redis.asyncio import Redis
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import get_settings
from app.core.database import Base, get_async_session
from app.core.cache import CacheService, get_cache_service
from app.core.dependencies import get_db_session, get_cache
from app.core.encryption import get_encryption_service
from app.core.auth import get_current_user, create_access_token
from app.main import create_app
from app.models.user import User, UserCreate
from app.models.job import Job, JobCreate
from app.models.application import Application, ApplicationCreate


# Test configuration
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
TEST_REDIS_URL = "redis://localhost:6379/15"  # Use DB 15 for tests


class TestConfig:
    """Test configuration settings."""
    
    def __init__(self):
        self.database_url = TEST_DATABASE_URL
        self.redis_url = TEST_REDIS_URL
        self.environment = "testing"
        self.debug = True
        self.testing = True
        
        # AI/ML test settings
        self.openai_api_key = "test-openai-key"
        self.pinecone_api_key = "test-pinecone-key"
        
        # Security test settings
        self.secret_key = "test-secret-key-for-testing-only"
        self.algorithm = "HS256"
        self.access_token_expire_minutes = 30


@pytest.fixture(scope="session")
def test_config():
    """Test configuration fixture."""
    return TestConfig()


# Event loop fixture
@pytest.fixture(scope="session")
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    """Create event loop for async tests."""
    policy = asyncio.get_event_loop_policy()
    loop = policy.new_event_loop()
    yield loop
    loop.close()


# Database fixtures
@pytest_asyncio.fixture(scope="session")
async def test_engine(test_config):
    """Create test database engine with query logging."""
    engine = create_async_engine(
        test_config.database_url,
        echo=False,  # Set to True for SQL debugging
        poolclass=StaticPool,
        connect_args={"check_same_thread": False}
    )
    
    # Track query performance
    query_times = []
    
    @event.listens_for(engine.sync_engine, "before_cursor_execute")
    def receive_before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        context._query_start_time = time.time()
    
    @event.listens_for(engine.sync_engine, "after_cursor_execute")
    def receive_after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        total = time.time() - context._query_start_time
        query_times.append(total)
    
    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    # Cleanup and report query performance
    if query_times:
        avg_time = sum(query_times) / len(query_times)
        max_time = max(query_times)
        print(f"\nQuery Performance: {len(query_times)} queries, avg: {avg_time:.3f}s, max: {max_time:.3f}s")
    
    await engine.dispose()


@pytest_asyncio.fixture
async def test_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create test database session with transaction rollback."""
    TestSessionLocal = async_sessionmaker(
        bind=test_engine,
        class_=AsyncSession,
        expire_on_commit=False
    )
    
    async with TestSessionLocal() as session:
        # Start a transaction
        transaction = await session.begin()
        
        try:
            yield session
        finally:
            # Always rollback to ensure clean state
            await transaction.rollback()


@pytest_asyncio.fixture
async def isolated_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create isolated session for tests that need to commit."""
    TestSessionLocal = async_sessionmaker(
        bind=test_engine,
        class_=AsyncSession,
        expire_on_commit=False
    )
    
    async with TestSessionLocal() as session:
        yield session
        
        # Clean up all data after test
        for table in reversed(Base.metadata.sorted_tables):
            await session.execute(f"DELETE FROM {table.name}")
        await session.commit()


# Redis fixtures
@pytest_asyncio.fixture
async def test_redis():
    """Create test Redis client."""
    try:
        redis_client = Redis.from_url(TEST_REDIS_URL, decode_responses=True)
        await redis_client.ping()
        
        # Clear test database
        await redis_client.flushdb()
        
        yield redis_client
        
        # Cleanup
        await redis_client.flushdb()
        await redis_client.close()
        
    except Exception:
        # Fall back to mock if Redis not available
        mock_redis = AsyncMock(spec=Redis)
        mock_redis.ping.return_value = True
        mock_redis.get.return_value = None
        mock_redis.set.return_value = True
        mock_redis.delete.return_value = 1
        mock_redis.exists.return_value = False
        mock_redis.keys.return_value = []
        yield mock_redis


@pytest_asyncio.fixture
async def test_cache_service(test_redis):
    """Create test cache service."""
    cache_service = CacheService()
    cache_service.redis_client = test_redis
    return cache_service


# FastAPI application fixtures
@pytest.fixture
def test_app(test_session, test_cache_service, test_config) -> FastAPI:
    """Create test FastAPI application with overridden dependencies."""
    app = create_app()
    
    # Override dependencies
    app.dependency_overrides[get_db_session] = lambda: test_session
    app.dependency_overrides[get_async_session] = lambda: test_session
    app.dependency_overrides[get_cache_service] = lambda: test_cache_service
    app.dependency_overrides[get_cache] = lambda: test_cache_service
    
    # Override settings
    with patch('app.core.config.get_settings', return_value=test_config):
        yield app
    
    # Clear overrides
    app.dependency_overrides.clear()


@pytest.fixture
def test_client(test_app) -> TestClient:
    """Create synchronous test client."""
    return TestClient(test_app)


@pytest_asyncio.fixture
async def async_test_client(test_app) -> AsyncGenerator[AsyncClient, None]:
    """Create asynchronous test client."""
    async with AsyncClient(app=test_app, base_url="http://test") as client:
        yield client


# Authentication fixtures
@pytest.fixture
def test_user_data():
    """Test user data."""
    return {
        "email": "test@example.com",
        "first_name": "Test",
        "last_name": "User",
        "password": "TestPassword123!",
        "professional_headline": "Software Developer"
    }


@pytest_asyncio.fixture
async def test_user(test_session, test_user_data) -> User:
    """Create test user in database."""
    from app.services.user import UserService
    
    user_service = UserService(test_session)
    user_create = UserCreate(**test_user_data)
    user = await user_service.create_user(user_create)
    
    return user


@pytest.fixture
def test_access_token(test_user) -> str:
    """Create test access token."""
    return create_access_token(data={"sub": str(test_user.id)})


@pytest.fixture
def auth_headers(test_access_token) -> Dict[str, str]:
    """Authentication headers for testing."""
    return {"Authorization": f"Bearer {test_access_token}"}


@pytest_asyncio.fixture
async def authenticated_client(async_test_client, auth_headers) -> AsyncClient:
    """Authenticated async test client."""
    async_test_client.headers.update(auth_headers)
    return async_test_client


# Mock external services
@pytest.fixture
def mock_openai():
    """Mock OpenAI client."""
    with patch('app.core.openai_client.get_openai_client') as mock:
        mock_client = MagicMock()
        
        # Mock chat completions
        mock_client.chat.completions.create.return_value = MagicMock(
            choices=[
                MagicMock(
                    message=MagicMock(
                        content="Generated AI content for testing"
                    )
                )
            ]
        )
        
        # Mock embeddings
        mock_client.embeddings.create.return_value = MagicMock(
            data=[
                MagicMock(embedding=[0.1] * 1536)  # Mock embedding vector
            ]
        )
        
        mock.return_value = mock_client
        yield mock_client


@pytest.fixture
def mock_pinecone():
    """Mock Pinecone client."""
    with patch('app.services.semantic_search.get_pinecone_client') as mock:
        mock_client = MagicMock()
        
        # Mock query results
        mock_client.query.return_value = MagicMock(
            matches=[
                MagicMock(
                    id="job_1",
                    score=0.95,
                    metadata={
                        "title": "Senior Python Developer",
                        "company": "Tech Corp",
                        "location": "San Francisco, CA"
                    }
                ),
                MagicMock(
                    id="job_2", 
                    score=0.87,
                    metadata={
                        "title": "FastAPI Developer",
                        "company": "Startup Inc",
                        "location": "Remote"
                    }
                )
            ]
        )
        
        # Mock upsert
        mock_client.upsert.return_value = MagicMock(upserted_count=1)
        
        mock.return_value = mock_client
        yield mock_client


@pytest.fixture
def mock_celery():
    """Mock Celery tasks."""
    with patch('app.tasks.celery_app') as mock_celery:
        # Mock task results
        mock_task = MagicMock()
        mock_task.delay.return_value = MagicMock(
            id="test-task-id",
            status="SUCCESS",
            result={"status": "completed"}
        )
        
        mock_celery.send_task.return_value = mock_task
        yield mock_celery


# Data factory fixtures
class TestDataFactory:
    """Factory for creating test data."""
    
    @staticmethod
    def create_user_data(override: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Create user test data."""
        data = {
            "email": f"user_{uuid4().hex[:8]}@example.com",
            "first_name": "Test",
            "last_name": "User",
            "password": "TestPassword123!",
            "professional_headline": "Software Developer"
        }
        if override:
            data.update(override)
        return data
    
    @staticmethod
    def create_job_data(override: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Create job test data."""
        data = {
            "title": "Senior Python Developer",
            "company": "Tech Corp",
            "description": "We are looking for a senior Python developer with FastAPI experience.",
            "location": "San Francisco, CA",
            "remote_type": "hybrid",
            "job_type": "full_time",
            "industry": "technology",
            "required_skills": ["Python", "FastAPI", "PostgreSQL"],
            "preferred_skills": ["Docker", "Kubernetes"],
            "salary_min": 120000,
            "salary_max": 180000,
            "salary_type": "annual",
            "status": "active"
        }
        if override:
            data.update(override)
        return data
    
    @staticmethod
    def create_application_data(user_id: str, job_id: str, override: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Create application test data."""
        data = {
            "user_id": user_id,
            "job_id": job_id,
            "cover_letter": "I am very interested in this position...",
            "status": "submitted",
            "applied_at": datetime.utcnow()
        }
        if override:
            data.update(override)
        return data


@pytest.fixture
def test_data_factory():
    """Test data factory fixture."""
    return TestDataFactory()


# Performance testing fixtures
@pytest.fixture
def performance_monitor():
    """Performance monitoring fixture."""
    class PerformanceMonitor:
        def __init__(self):
            self.start_time = None
            self.end_time = None
            self.duration = None
        
        def start(self):
            self.start_time = time.time()
        
        def stop(self):
            self.end_time = time.time()
            if self.start_time:
                self.duration = self.end_time - self.start_time
        
        def assert_duration_under(self, max_duration: float):
            assert self.duration is not None, "Performance monitor not stopped"
            assert self.duration < max_duration, f"Duration {self.duration:.3f}s exceeds limit {max_duration}s"
    
    return PerformanceMonitor()


@pytest.fixture
def performance_thresholds():
    """Performance thresholds for testing."""
    return {
        "api_response_time": 2.0,  # seconds
        "database_query_time": 0.5,  # seconds
        "cache_operation_time": 0.1,  # seconds
        "ai_generation_time": 10.0,  # seconds
        "search_response_time": 3.0  # seconds
    }


# File system fixtures
@pytest.fixture
def temp_directory():
    """Create temporary directory for testing."""
    with tempfile.TemporaryDirectory() as temp_dir:
        yield Path(temp_dir)


@pytest.fixture
def temp_file():
    """Create temporary file for testing."""
    with tempfile.NamedTemporaryFile(mode='w+', delete=False) as temp_file:
        yield Path(temp_file.name)
    
    # Cleanup
    try:
        os.unlink(temp_file.name)
    except FileNotFoundError:
        pass


# Security testing fixtures
@pytest.fixture
def security_test_payloads():
    """Security test payloads for injection testing."""
    return {
        "sql_injection": [
            "'; DROP TABLE users; --",
            "' OR '1'='1",
            "1; DELETE FROM users WHERE 1=1; --",
            "' UNION SELECT * FROM users --"
        ],
        "xss_payloads": [
            "<script>alert('xss')</script>",
            "javascript:alert('xss')",
            "<img src=x onerror=alert('xss')>",
            "';alert('xss');//"
        ],
        "path_traversal": [
            "../../../etc/passwd",
            "..\\..\\..\\windows\\system32\\drivers\\etc\\hosts",
            "....//....//....//etc/passwd"
        ]
    }


# Encryption testing fixtures
@pytest.fixture
def test_encryption_service():
    """Test encryption service with test keys."""
    encryption_service = get_encryption_service()
    
    # Create test-specific keys
    test_key_id = "test_key_v1"
    encryption_service.create_symmetric_key(test_key_id, expires_days=1)
    
    return encryption_service


# API testing utilities
class APITestHelper:
    """Helper class for API testing."""
    
    def __init__(self, client: AsyncClient):
        self.client = client
    
    async def create_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create user via API."""
        response = await self.client.post("/api/v1/users/", json=user_data)
        assert response.status_code == 201
        return response.json()
    
    async def create_job(self, job_data: Dict[str, Any], headers: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """Create job via API."""
        response = await self.client.post("/api/v1/jobs/", json=job_data, headers=headers)
        assert response.status_code == 201
        return response.json()
    
    async def login_user(self, email: str, password: str) -> str:
        """Login user and return access token."""
        response = await self.client.post(
            "/api/v1/auth/login",
            data={"username": email, "password": password}
        )
        assert response.status_code == 200
        return response.json()["access_token"]


@pytest_asyncio.fixture
async def api_helper(async_test_client):
    """API test helper fixture."""
    return APITestHelper(async_test_client)


# Database testing utilities
class DatabaseTestHelper:
    """Helper class for database testing."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def count_records(self, model_class) -> int:
        """Count records in a table."""
        from sqlalchemy import select, func
        result = await self.session.execute(select(func.count(model_class.id)))
        return result.scalar()
    
    async def get_record_by_id(self, model_class, record_id: str):
        """Get record by ID."""
        from sqlalchemy import select
        result = await self.session.execute(select(model_class).where(model_class.id == record_id))
        return result.scalar_one_or_none()


@pytest_asyncio.fixture
async def db_helper(test_session):
    """Database test helper fixture."""
    return DatabaseTestHelper(test_session)


# Cleanup fixtures
@pytest_asyncio.fixture(autouse=True)
async def cleanup_test_data():
    """Cleanup test data after each test."""
    yield
    
    # Additional cleanup can be added here
    # For example, clearing specific caches or temporary files


# Parametrized fixtures for testing multiple scenarios
@pytest.fixture(params=["sqlite", "postgresql"])
def database_type(request):
    """Parametrized database type for testing."""
    return request.param


@pytest.fixture(params=[1, 5, 10])
def batch_size(request):
    """Parametrized batch sizes for testing."""
    return request.param


# Custom markers for test organization
def pytest_configure(config):
    """Configure custom pytest markers."""
    config.addinivalue_line("markers", "unit: Unit tests")
    config.addinivalue_line("markers", "integration: Integration tests")
    config.addinivalue_line("markers", "e2e: End-to-end tests")
    config.addinivalue_line("markers", "slow: Slow running tests")
    config.addinivalue_line("markers", "security: Security tests")
    config.addinivalue_line("markers", "performance: Performance tests")


# Test result collection
@pytest.fixture(autouse=True)
def test_metrics(request):
    """Collect test metrics."""
    start_time = time.time()
    
    yield
    
    duration = time.time() - start_time
    
    # Store test metrics (could be sent to monitoring system)
    test_name = request.node.name
    test_file = request.node.fspath.basename
    
    # Add to test report if needed
    if hasattr(request.config, '_test_metrics'):
        request.config._test_metrics.append({
            'name': test_name,
            'file': test_file,
            'duration': duration,
            'timestamp': datetime.utcnow().isoformat()
        })


# Error handling fixtures
@pytest.fixture
def capture_logs():
    """Capture logs during testing."""
    import logging
    from io import StringIO
    
    log_capture = StringIO()
    handler = logging.StreamHandler(log_capture)
    logger = logging.getLogger("app")
    logger.addHandler(handler)
    logger.setLevel(logging.DEBUG)
    
    yield log_capture
    
    logger.removeHandler(handler)


# Environment variable fixtures
@pytest.fixture
def mock_env_vars():
    """Mock environment variables for testing."""
    env_vars = {
        "ENVIRONMENT": "testing",
        "DATABASE_URL": TEST_DATABASE_URL,
        "REDIS_URL": TEST_REDIS_URL,
        "SECRET_KEY": "test-secret-key",
        "OPENAI_API_KEY": "test-openai-key",
        "PINECONE_API_KEY": "test-pinecone-key"
    }
    
    with patch.dict(os.environ, env_vars):
        yield env_vars