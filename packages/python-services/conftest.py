"""
Pytest configuration and shared fixtures for all tests.
"""

import pytest
import asyncio
from typing import Generator


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(autouse=True)
def reset_environment():
    """Reset environment variables before each test."""
    import os
    
    # Store original environment
    original_env = os.environ.copy()
    
    # Set test environment variables
    os.environ["ENVIRONMENT"] = "test"
    os.environ["OPENAI_API_KEY"] = "test-key"
    os.environ["PINECONE_API_KEY"] = "test-key"
    os.environ["PINECONE_ENVIRONMENT"] = "test"
    os.environ["REDIS_URL"] = "redis://localhost:6379/0"
    
    yield
    
    # Restore original environment
    os.environ.clear()
    os.environ.update(original_env)


@pytest.fixture
def mock_openai_response():
    """Create a mock OpenAI API response."""
    from unittest.mock import Mock
    
    def create_response(content: str, tokens: int = 500):
        response = Mock()
        response.choices = [Mock(message=Mock(content=content))]
        response.usage = Mock(total_tokens=tokens)
        return response
    
    return create_response


@pytest.fixture
def mock_pinecone_index():
    """Create a mock Pinecone index."""
    from unittest.mock import Mock
    
    index = Mock()
    index.query.return_value = Mock(
        matches=[
            Mock(
                id="job1",
                score=0.85,
                metadata={"title": "Software Engineer", "company": "TechCorp"}
            ),
            Mock(
                id="job2",
                score=0.75,
                metadata={"title": "Senior Developer", "company": "StartupXYZ"}
            )
        ]
    )
    
    return index


@pytest.fixture
def sample_user_profile():
    """Create a sample user profile for testing."""
    from app.services.document_processing.models import UserProfile
    
    return UserProfile(
        id="test_user_123",
        first_name="John",
        last_name="Doe",
        email="john.doe@example.com",
        phone="+1234567890",
        location="San Francisco, CA",
        skills=["Python", "JavaScript", "React", "SQL", "AWS"],
        experience=[
            {
                "title": "Senior Software Engineer",
                "company": "Tech Corp",
                "duration": "2020-2023",
                "description": "Led development of microservices"
            }
        ],
        education=[
            {
                "degree": "BS Computer Science",
                "institution": "University",
                "year": "2020"
            }
        ],
        career_goals="Seeking senior engineering roles",
        summary="Experienced software engineer"
    )


@pytest.fixture
def sample_job_posting():
    """Create a sample job posting for testing."""
    from app.services.document_processing.models import JobPosting
    
    return JobPosting(
        id="test_job_123",
        title="Senior Software Engineer",
        company="TechStart Inc",
        description="Looking for experienced Python developer",
        location="San Francisco, CA",
        salary_min=120000,
        salary_max=160000,
        employment_type="full-time",
        experience_level="senior",
        industry="Technology"
    )


# Configure pytest-asyncio
def pytest_configure(config):
    """Configure pytest with custom markers."""
    config.addinivalue_line(
        "markers", "slow: marks tests as slow (deselect with '-m \"not slow\"')"
    )
    config.addinivalue_line(
        "markers", "integration: marks tests as integration tests"
    )
    config.addinivalue_line(
        "markers", "unit: marks tests as unit tests"
    )
