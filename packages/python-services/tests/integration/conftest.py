"""
Integration test configuration and fixtures.
"""

import pytest
import asyncio
import asyncpg
from typing import AsyncGenerator, Generator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import text
import redis.asyncio as redis
from fastapi.testclient import TestClient
from httpx import AsyncClient
import os
import tempfile
import shutil

from app.main import app
from app.core.database import Base
from app.core.config import get_settings


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def postgresql_proc(postgresql_proc):
    """PostgreSQL process fixture from pytest-postgresql."""
    yield postgresql_proc


@pytest.fixture(scope="session")
async def redis_proc(redis_proc):
    """Redis process fixture from pytest-redis."""
    yield redis_proc


@pytest.fixture(scope="session")
async def test_database_url(postgresql_proc) -> str:
    """Create test database URL."""
    return f"postgresql+asyncpg://postgres@{postgresql_proc.host}:{postgresql_proc.port}/test"


@pytest.fixture(scope="session")
async def test_redis_url(redis_proc) -> str:
    """Create test Redis URL."""
    return f"redis://{redis_proc.host}:{redis_proc.port}/0"


@pytest.fixture(scope="session")
async def test_engine(test_database_url):
    """Create test database engine."""
    engine = create_async_engine(test_database_url, echo=False)
    
    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    # Cleanup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await engine.dispose()


@pytest.fixture
async def test_db_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create test database session."""
    async_session = async_sessionmaker(test_engine, expire_on_commit=False)
    
    async with async_session() as session:
        # Start a transaction
        await session.begin()
        
        yield session
        
        # Rollback the transaction
        await session.rollback()


@pytest.fixture
async def test_redis_client(test_redis_url) -> AsyncGenerator[redis.Redis, None]:
    """Create test Redis client."""
    client = redis.from_url(test_redis_url, decode_responses=True)
    
    yield client
    
    # Cleanup
    await client.flushdb()
    await client.close()


@pytest.fixture
def test_client() -> TestClient:
    """Create FastAPI test client."""
    return TestClient(app)


@pytest.fixture
async def async_test_client() -> AsyncGenerator[AsyncClient, None]:
    """Create async FastAPI test client."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client


@pytest.fixture
def temp_directory():
    """Create temporary directory for file operations."""
    temp_dir = tempfile.mkdtemp()
    yield temp_dir
    shutil.rmtree(temp_dir)


@pytest.fixture
def mock_external_apis(httpx_mock):
    """Mock external API responses."""
    # Mock OpenAI API
    httpx_mock.add_response(
        method="POST",
        url="https://api.openai.com/v1/chat/completions",
        json={
            "choices": [
                {
                    "message": {
                        "content": "Mocked AI response"
                    }
                }
            ],
            "usage": {
                "total_tokens": 100
            }
        }
    )
    
    # Mock Pinecone API
    httpx_mock.add_response(
        method="POST",
        url="https://test-index.svc.pinecone.io/query",
        json={
            "matches": [
                {
                    "id": "job1",
                    "score": 0.85,
                    "metadata": {
                        "title": "Software Engineer",
                        "company": "TechCorp"
                    }
                }
            ]
        }
    )
    
    # Mock LinkedIn API
    httpx_mock.add_response(
        method="GET",
        url="https://api.linkedin.com/v2/jobs",
        json={
            "elements": [
                {
                    "id": "123456",
                    "title": "Senior Developer",
                    "company": "LinkedIn Corp"
                }
            ]
        }
    )
    
    return httpx_mock


@pytest.fixture
async def sample_test_data(test_db_session):
    """Create sample test data in database."""
    from app.models.database.user import User as UserModel
    from app.models.database.job import Job as JobModel
    from app.models.database.application import Application as ApplicationModel
    
    # Create test user
    user = UserModel(
        id="test-user-123",
        email="test@example.com",
        password_hash="hashed_password",
        first_name="Test",
        last_name="User",
        professional_headline="Software Engineer"
    )
    test_db_session.add(user)
    
    # Create test job
    job = JobModel(
        id="test-job-123",
        title="Senior Python Developer",
        company="TechStart Inc",
        description="Looking for experienced Python developer",
        location="San Francisco, CA",
        salary_min=120000,
        salary_max=160000,
        employment_type="full-time",
        experience_level="senior"
    )
    test_db_session.add(job)
    
    # Create test application
    application = ApplicationModel(
        id="test-app-123",
        user_id="test-user-123",
        job_id="test-job-123",
        status="applied",
        applied_at="2024-01-01T00:00:00Z"
    )
    test_db_session.add(application)
    
    await test_db_session.commit()
    
    return {
        "user": user,
        "job": job,
        "application": application
    }


@pytest.fixture
def integration_test_settings():
    """Override settings for integration tests."""
    settings = get_settings()
    settings.ENVIRONMENT = "test"
    settings.TESTING = True
    settings.OPENAI_API_KEY = "test-key"
    settings.PINECONE_API_KEY = "test-key"
    settings.PINECONE_ENVIRONMENT = "test"
    return settings