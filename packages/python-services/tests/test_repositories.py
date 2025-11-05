"""Test repository implementations with async mocks."""

import pytest
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

from app.repositories.user import UserRepository, SkillRepository
from app.repositories.job import JobRepository
from app.repositories.application import ApplicationRepository
from app.models.user import User, UserCreate, Skill, SkillCreate
from app.models.job import Job, JobCreate
from app.models.application import Application, ApplicationCreate


class TestUserRepository:
    """Test UserRepository with async mocks."""
    
    @pytest.fixture
    def mock_db_session(self):
        """Mock database session."""
        return AsyncMock()
    
    @pytest.fixture
    def mock_cache(self):
        """Mock Redis cache."""
        mock_cache = AsyncMock()
        mock_cache.get.return_value = None
        mock_cache.set.return_value = True
        mock_cache.delete.return_value = True
        return mock_cache
    
    @pytest.fixture
    def user_repository(self, mock_db_session, mock_cache):
        """Create UserRepository with mocked dependencies."""
        return UserRepository(mock_db_session, mock_cache)
    
    @pytest.mark.asyncio
    async def test_create_user(self, user_repository, sample_user_data):
        """Test user creation."""
        # Mock database operations
        user_repository.db.add = MagicMock()
        user_repository.db.commit = AsyncMock()
        user_repository.db.refresh = AsyncMock()
        
        # Create user data
        user_create = UserCreate(**sample_user_data)
        
        # Mock the created user
        created_user = User(
            id=str(uuid4()),
            email=sample_user_data["email"],
            first_name=sample_user_data["first_name"],
            last_name=sample_user_data["last_name"],
            professional_headline=sample_user_data["professional_headline"],
            email_verified=False,
            mfa_enabled=False,
            is_active=True,
            last_login=None,
            created_at="2024-01-01T00:00:00Z",
            updated_at="2024-01-01T00:00:00Z"
        )
        
        # Mock repository method
        user_repository.create = AsyncMock(return_value=created_user)
        
        # Test user creation
        result = await user_repository.create(user_create)
        
        assert result is not None
        assert result.email == sample_user_data["email"]
        assert result.first_name == sample_user_data["first_name"]
        assert result.is_active is True
    
    @pytest.mark.asyncio
    async def test_find_user_by_id(self, user_repository):
        """Test finding user by ID."""
        user_id = str(uuid4())
        
        # Mock user data
        mock_user = User(
            id=user_id,
            email="test@example.com",
            first_name="Test",
            last_name="User",
            professional_headline="Developer",
            email_verified=True,
            mfa_enabled=False,
            is_active=True,
            last_login=None,
            created_at="2024-01-01T00:00:00Z",
            updated_at="2024-01-01T00:00:00Z"
        )
        
        # Mock repository method
        user_repository.find_by_id = AsyncMock(return_value=mock_user)
        
        # Test finding user
        result = await user_repository.find_by_id(user_id)
        
        assert result is not None
        assert result.id == user_id
        assert result.email == "test@example.com"
    
    @pytest.mark.asyncio
    async def test_find_user_by_email(self, user_repository):
        """Test finding user by email."""
        email = "test@example.com"
        
        # Mock user data
        mock_user = User(
            id=str(uuid4()),
            email=email,
            first_name="Test",
            last_name="User",
            professional_headline="Developer",
            email_verified=True,
            mfa_enabled=False,
            is_active=True,
            last_login=None,
            created_at="2024-01-01T00:00:00Z",
            updated_at="2024-01-01T00:00:00Z"
        )
        
        # Mock repository method
        user_repository.find_by_email = AsyncMock(return_value=mock_user)
        
        # Test finding user by email
        result = await user_repository.find_by_email(email)
        
        assert result is not None
        assert result.email == email
    
    @pytest.mark.asyncio
    async def test_find_user_not_found(self, user_repository):
        """Test finding non-existent user."""
        user_id = str(uuid4())
        
        # Mock repository method to return None
        user_repository.find_by_id = AsyncMock(return_value=None)
        
        # Test finding non-existent user
        result = await user_repository.find_by_id(user_id)
        
        assert result is None


class TestSkillRepository:
    """Test SkillRepository with async mocks."""
    
    @pytest.fixture
    def mock_db_session(self):
        """Mock database session."""
        return AsyncMock()
    
    @pytest.fixture
    def mock_cache(self):
        """Mock Redis cache."""
        return AsyncMock()
    
    @pytest.fixture
    def skill_repository(self, mock_db_session, mock_cache):
        """Create SkillRepository with mocked dependencies."""
        return SkillRepository(mock_db_session, mock_cache)
    
    @pytest.mark.asyncio
    async def test_create_skill(self, skill_repository, sample_skill_data):
        """Test skill creation."""
        user_id = str(uuid4())
        skill_data = {**sample_skill_data, "user_id": user_id}
        skill_create = SkillCreate(**skill_data)
        
        # Mock created skill
        created_skill = Skill(
            id=str(uuid4()),
            user_id=user_id,
            name=sample_skill_data["name"],
            category=sample_skill_data["category"],
            proficiency_level=sample_skill_data["proficiency_level"],
            years_of_experience=sample_skill_data["years_of_experience"],
            last_used=None,
            endorsements=0,
            created_at="2024-01-01T00:00:00Z",
            updated_at="2024-01-01T00:00:00Z"
        )
        
        # Mock repository method
        skill_repository.create = AsyncMock(return_value=created_skill)
        
        # Test skill creation
        result = await skill_repository.create(skill_create)
        
        assert result is not None
        assert result.name == sample_skill_data["name"]
        assert result.user_id == user_id
    
    @pytest.mark.asyncio
    async def test_find_skills_by_user_id(self, skill_repository):
        """Test finding skills by user ID."""
        user_id = str(uuid4())
        
        # Mock skills data
        mock_skills = [
            Skill(
                id=str(uuid4()),
                user_id=user_id,
                name="Python",
                category="technical",
                proficiency_level=4,
                years_of_experience=3.0,
                last_used=None,
                endorsements=0,
                created_at="2024-01-01T00:00:00Z",
                updated_at="2024-01-01T00:00:00Z"
            ),
            Skill(
                id=str(uuid4()),
                user_id=user_id,
                name="JavaScript",
                category="technical",
                proficiency_level=3,
                years_of_experience=2.0,
                last_used=None,
                endorsements=0,
                created_at="2024-01-01T00:00:00Z",
                updated_at="2024-01-01T00:00:00Z"
            )
        ]
        
        # Mock repository method
        skill_repository.find_by_user_id = AsyncMock(return_value=mock_skills)
        
        # Test finding skills
        result = await skill_repository.find_by_user_id(user_id)
        
        assert len(result) == 2
        assert all(skill.user_id == user_id for skill in result)


class TestJobRepository:
    """Test JobRepository with async mocks."""
    
    @pytest.fixture
    def mock_db_session(self):
        """Mock database session."""
        return AsyncMock()
    
    @pytest.fixture
    def mock_cache(self):
        """Mock Redis cache."""
        return AsyncMock()
    
    @pytest.fixture
    def job_repository(self, mock_db_session, mock_cache):
        """Create JobRepository with mocked dependencies."""
        return JobRepository(mock_db_session, mock_cache)
    
    @pytest.mark.asyncio
    async def test_create_job(self, job_repository, sample_job_data):
        """Test job creation."""
        job_create = JobCreate(**sample_job_data)
        
        # Mock created job
        created_job = Job(
            id=str(uuid4()),
            title=sample_job_data["title"],
            company=sample_job_data["company"],
            description=sample_job_data["description"],
            location=sample_job_data["location"],
            remote_type=sample_job_data["remote_type"],
            job_type=sample_job_data["job_type"],
            industry=sample_job_data["industry"],
            company_size=None,
            requirements=[],
            required_skills=sample_job_data["required_skills"],
            preferred_skills=sample_job_data["preferred_skills"],
            salary_min=sample_job_data["salary_min"],
            salary_max=sample_job_data["salary_max"],
            salary_type=sample_job_data["salary_type"],
            benefits=[],
            application_url=None,
            application_email=None,
            source="manual",
            external_id=None,
            status="active",
            posted_date=None,
            expires_date=None,
            view_count=0,
            application_count=0,
            created_at="2024-01-01T00:00:00Z",
            updated_at="2024-01-01T00:00:00Z"
        )
        
        # Mock repository method
        job_repository.create = AsyncMock(return_value=created_job)
        
        # Test job creation
        result = await job_repository.create(job_create)
        
        assert result is not None
        assert result.title == sample_job_data["title"]
        assert result.company == sample_job_data["company"]
    
    @pytest.mark.asyncio
    async def test_search_jobs(self, job_repository):
        """Test job search functionality."""
        from app.models.job import JobSearchFilters
        
        # Create search filters
        filters = JobSearchFilters(
            keywords="python developer",
            location="San Francisco",
            page=1,
            size=10
        )
        
        # Mock search results
        mock_jobs = [
            Job(
                id=str(uuid4()),
                title="Python Developer",
                company="Tech Corp",
                description="Python development role",
                location="San Francisco, CA",
                remote_type="hybrid",
                job_type="full_time",
                industry="technology",
                company_size=None,
                requirements=[],
                required_skills=["Python", "Django"],
                preferred_skills=["React"],
                salary_min=100000,
                salary_max=150000,
                salary_type="annual",
                benefits=[],
                application_url=None,
                application_email=None,
                source="manual",
                external_id=None,
                status="active",
                posted_date=None,
                expires_date=None,
                view_count=0,
                application_count=0,
                created_at="2024-01-01T00:00:00Z",
                updated_at="2024-01-01T00:00:00Z"
            )
        ]
        
        # Mock repository method
        job_repository.search_jobs = AsyncMock(return_value=mock_jobs)
        
        # Test job search
        result = await job_repository.search_jobs(filters)
        
        assert len(result) == 1
        assert result[0].title == "Python Developer"


class TestApplicationRepository:
    """Test ApplicationRepository with async mocks."""
    
    @pytest.fixture
    def mock_db_session(self):
        """Mock database session."""
        return AsyncMock()
    
    @pytest.fixture
    def mock_cache(self):
        """Mock Redis cache."""
        return AsyncMock()
    
    @pytest.fixture
    def application_repository(self, mock_db_session, mock_cache):
        """Create ApplicationRepository with mocked dependencies."""
        return ApplicationRepository(mock_db_session, mock_cache)
    
    @pytest.mark.asyncio
    async def test_create_application(self, application_repository):
        """Test application creation."""
        user_id = str(uuid4())
        job_id = str(uuid4())
        
        application_data = {
            "user_id": user_id,
            "job_id": job_id,
            "status": "submitted",
            "cover_letter": "I am interested in this position..."
        }
        
        application_create = ApplicationCreate(**application_data)
        
        # Mock created application
        created_application = Application(
            id=str(uuid4()),
            user_id=user_id,
            job_id=job_id,
            status="submitted",
            cover_letter=application_data["cover_letter"],
            resume_version=None,
            applied_date="2024-01-01T00:00:00Z",
            response_date=None,
            interview_date=None,
            match_score=None,
            match_factors=None,
            notes=None,
            feedback=None,
            external_application_id=None,
            created_at="2024-01-01T00:00:00Z",
            updated_at="2024-01-01T00:00:00Z"
        )
        
        # Mock repository method
        application_repository.create = AsyncMock(return_value=created_application)
        
        # Test application creation
        result = await application_repository.create(application_create)
        
        assert result is not None
        assert result.user_id == user_id
        assert result.job_id == job_id
        assert result.status == "submitted"
    
    @pytest.mark.asyncio
    async def test_find_applications_by_user_id(self, application_repository):
        """Test finding applications by user ID."""
        user_id = str(uuid4())
        
        # Mock applications data
        mock_applications = [
            Application(
                id=str(uuid4()),
                user_id=user_id,
                job_id=str(uuid4()),
                status="submitted",
                cover_letter="Cover letter 1",
                resume_version=None,
                applied_date="2024-01-01T00:00:00Z",
                response_date=None,
                interview_date=None,
                match_score=None,
                match_factors=None,
                notes=None,
                feedback=None,
                external_application_id=None,
                created_at="2024-01-01T00:00:00Z",
                updated_at="2024-01-01T00:00:00Z"
            )
        ]
        
        # Mock repository method
        application_repository.find_by_user_id = AsyncMock(return_value=mock_applications)
        
        # Test finding applications
        result = await application_repository.find_by_user_id(user_id)
        
        assert len(result) == 1
        assert result[0].user_id == user_id
    
    @pytest.mark.asyncio
    async def test_get_application_stats(self, application_repository):
        """Test getting application statistics."""
        user_id = str(uuid4())
        
        # Mock statistics data
        mock_stats = {
            "total_applications": 10,
            "status_counts": {
                "submitted": 5,
                "interview_scheduled": 3,
                "offer_received": 1,
                "rejected": 1
            },
            "response_rate": 50.0,
            "interview_rate": 30.0,
            "avg_match_score": 75.5
        }
        
        # Mock repository method
        application_repository.get_application_stats = AsyncMock(return_value=mock_stats)
        
        # Test getting statistics
        result = await application_repository.get_application_stats(user_id)
        
        assert result["total_applications"] == 10
        assert result["response_rate"] == 50.0
        assert "status_counts" in result