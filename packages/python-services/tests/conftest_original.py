"""Pytest configuration and fixtures for FastAPI backend tests."""

import asyncio
import pytest
import pytest_asyncio
from typing import AsyncGenerator, Generator
from unittest.mock import AsyncMock, MagicMock

from fastapi.testclient import TestClient
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool
from redis.asyncio import Redis

from app.main import create_app
from app.core.config import get_settings
from app.core.database import Base, get_async_session
from app.core.cache import CacheService, get_cache_service
from app.core.dependencies import get_db_session, get_cache
from app.models.database import UserModel, JobModel, SkillModel


# Test database URL (in-memory SQLite for testing)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

# Test settings
@pytest.fixture(scope="session")
def test_settings():
    """Override settings for testing."""
    settings = get_settings()
    settings.environment = "testing"
    settings.database.url = TEST_DATABASE_URL
    settings.database.echo = False
    return settings


# Database fixtures
@pytest.fixture(scope="session")
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def test_engine():
    """Create test database engine."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
        poolclass=StaticPool,
        connect_args={"check_same_thread": False}
    )
    
    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    # Cleanup
    await engine.dispose()


@pytest_asyncio.fixture
async def test_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create test database session."""
    TestSessionLocal = async_sessionmaker(
        bind=test_engine,
        class_=AsyncSession,
        expire_on_commit=False
    )
    
    async with TestSessionLocal() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def mock_redis():
    """Create mock Redis client."""
    mock_redis = AsyncMock(spec=Redis)
    
    # Mock Redis operations
    mock_redis.get.return_value = None
    mock_redis.set.return_value = True
    mock_redis.setex.return_value = True
    mock_redis.delete.return_value = 1
    mock_redis.keys.return_value = []
    mock_redis.exists.return_value = False
    mock_redis.ping.return_value = True
    mock_redis.info.return_value = {"used_memory_human": "1MB", "connected_clients": 1}
    
    return mock_redis


@pytest_asyncio.fixture
async def mock_cache_service(mock_redis):
    """Create mock cache service."""
    cache_service = CacheService()
    cache_service.redis_client = mock_redis
    return cache_service


# FastAPI fixtures
@pytest.fixture
def test_app(test_session, mock_cache_service):
    """Create test FastAPI application."""
    app = create_app()
    
    # Override dependencies
    app.dependency_overrides[get_db_session] = lambda: test_session
    app.dependency_overrides[get_async_session] = lambda: test_session
    app.dependency_overrides[get_cache_service] = lambda: mock_cache_service
    app.dependency_overrides[get_cache] = lambda: mock_cache_service
    
    return app


@pytest.fixture
def test_client(test_app) -> TestClient:
    """Create test client."""
    return TestClient(test_app)


@pytest_asyncio.fixture
async def async_test_client(test_app) -> AsyncGenerator[AsyncClient, None]:
    """Create async test client."""
    async with AsyncClient(app=test_app, base_url="http://test") as client:
        yield client


# Data fixtures
@pytest_asyncio.fixture
async def sample_user_data():
    """Sample user data for testing."""
    return {
        "email": "test@example.com",
        "first_name": "Test",
        "last_name": "User",
        "professional_headline": "Software Developer",
        "password": "TestPassword123!"
    }


@pytest_asyncio.fixture
async def sample_job_data():
    """Sample job data for testing."""
    return {
        "title": "Senior Python Developer",
        "company": "Tech Corp",
        "description": "We are looking for a senior Python developer...",
        "location": "San Francisco, CA",
        "remote_type": "hybrid",
        "job_type": "full_time",
        "industry": "technology",
        "required_skills": ["Python", "FastAPI", "PostgreSQL"],
        "preferred_skills": ["Docker", "Kubernetes"],
        "salary_min": 120000,
        "salary_max": 180000,
        "salary_type": "annual"
    }


@pytest_asyncio.fixture
async def sample_skill_data():
    """Sample skill data for testing."""
    return {
        "name": "Python",
        "category": "technical",
        "proficiency_level": 4,
        "years_of_experience": 5.0
    }


# Database model fixtures
@pytest_asyncio.fixture
async def created_user(test_session, sample_user_data):
    """Create a user in the test database."""
    user = UserModel(
        email=sample_user_data["email"],
        first_name=sample_user_data["first_name"],
        last_name=sample_user_data["last_name"],
        professional_headline=sample_user_data["professional_headline"],
        password_hash="hashed_password"  # Mock hashed password
    )
    
    test_session.add(user)
    await test_session.commit()
    await test_session.refresh(user)
    
    return user


@pytest_asyncio.fixture
async def created_job(test_session, sample_job_data):
    """Create a job in the test database."""
    job = JobModel(
        title=sample_job_data["title"],
        company=sample_job_data["company"],
        description=sample_job_data["description"],
        location=sample_job_data["location"],
        remote_type=sample_job_data["remote_type"],
        job_type=sample_job_data["job_type"],
        industry=sample_job_data["industry"],
        required_skills=sample_job_data["required_skills"],
        preferred_skills=sample_job_data["preferred_skills"],
        salary_min=sample_job_data["salary_min"],
        salary_max=sample_job_data["salary_max"],
        salary_type=sample_job_data["salary_type"],
        status="active"
    )
    
    test_session.add(job)
    await test_session.commit()
    await test_session.refresh(job)
    
    return job


@pytest_asyncio.fixture
async def created_skill(test_session, created_user, sample_skill_data):
    """Create a skill in the test database."""
    skill = SkillModel(
        user_id=created_user.id,
        name=sample_skill_data["name"],
        category=sample_skill_data["category"],
        proficiency_level=sample_skill_data["proficiency_level"],
        years_of_experience=sample_skill_data["years_of_experience"]
    )
    
    test_session.add(skill)
    await test_session.commit()
    await test_session.refresh(skill)
    
    return skill


# Mock external services
@pytest.fixture
def mock_openai_client():
    """Mock OpenAI client."""
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = MagicMock(
        choices=[MagicMock(message=MagicMock(content="Generated content"))]
    )
    return mock_client


@pytest.fixture
def mock_pinecone_client():
    """Mock Pinecone client."""
    mock_client = MagicMock()
    mock_client.query.return_value = MagicMock(
        matches=[
            MagicMock(
                id="job_1",
                score=0.95,
                metadata={"title": "Python Developer", "company": "Tech Corp"}
            )
        ]
    )
    return mock_client


# Authentication fixtures
@pytest.fixture
def mock_jwt_token():
    """Mock JWT token for authentication tests."""
    return "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoidGVzdF91c2VyIn0.mock_signature"


@pytest.fixture
def auth_headers(mock_jwt_token):
    """Authentication headers for testing."""
    return {"Authorization": f"Bearer {mock_jwt_token}"}


# Utility fixtures
@pytest.fixture
def mock_correlation_id():
    """Mock correlation ID for request tracking."""
    return "test-correlation-id-12345"


@pytest.fixture
def mock_request_id():
    """Mock request ID for request tracking."""
    return "test-request-id-67890"


# Performance testing fixtures
@pytest.fixture
def performance_threshold():
    """Performance thresholds for testing."""
    return {
        "api_response_time": 2.0,  # seconds
        "database_query_time": 0.5,  # seconds
        "cache_operation_time": 0.1  # seconds
    }


# Cleanup fixtures
@pytest_asyncio.fixture(autouse=True)
async def cleanup_database(test_session):
    """Cleanup database after each test."""
    yield
    
    # Clean up all tables
    for table in reversed(Base.metadata.sorted_tables):
        await test_session.execute(f"DELETE FROM {table.name}")
    await test_session.commit()


# Test data generators
class TestDataGenerator:
    """Generate test data for various scenarios."""
    
    @staticmethod
    def generate_users(count: int = 10):
        """Generate multiple test users."""
        return [
            {
                "email": f"user{i}@example.com",
                "first_name": f"User{i}",
                "last_name": f"Test{i}",
                "professional_headline": f"Professional {i}",
                "password": "TestPassword123!"
            }
            for i in range(count)
        ]
    
    @staticmethod
    def generate_jobs(count: int = 10):
        """Generate multiple test jobs."""
        return [
            {
                "title": f"Job Title {i}",
                "company": f"Company {i}",
                "description": f"Job description {i}",
                "location": f"City {i}",
                "remote_type": "remote" if i % 2 == 0 else "onsite",
                "job_type": "full_time",
                "industry": "technology",
                "required_skills": [f"skill{i}", f"skill{i+1}"],
                "salary_min": 50000 + (i * 10000),
                "salary_max": 80000 + (i * 10000)
            }
            for i in range(count)
        ]


@pytest.fixture
def test_data_generator():
    """Test data generator fixture."""
    return TestDataGenerator()