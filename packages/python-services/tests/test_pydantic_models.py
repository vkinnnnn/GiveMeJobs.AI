"""Test Pydantic model validation and serialization."""

import pytest
from datetime import datetime
from pydantic import ValidationError

from app.models.user import (
    User, UserCreate, UserUpdate, 
    Skill, SkillCreate, SkillUpdate,
    Experience, ExperienceCreate, ExperienceUpdate,
    Education, EducationCreate, EducationUpdate,
    UserPreferences
)
from app.models.job import (
    Job, JobCreate, JobUpdate,
    JobSearchFilters, JobMatch
)
from app.models.application import (
    Application, ApplicationCreate, ApplicationUpdate
)
from app.models.base import (
    ApiResponse, PaginatedResponse, Result, HealthCheck
)


class TestUserModels:
    """Test user-related Pydantic models."""
    
    def test_user_create_valid(self, sample_user_data):
        """Test valid user creation data."""
        user_create = UserCreate(**sample_user_data)
        
        assert user_create.email == sample_user_data["email"]
        assert user_create.first_name == sample_user_data["first_name"]
        assert user_create.last_name == sample_user_data["last_name"]
        assert user_create.password == sample_user_data["password"]
    
    def test_user_create_invalid_email(self, sample_user_data):
        """Test user creation with invalid email."""
        sample_user_data["email"] = "invalid-email"
        
        with pytest.raises(ValidationError) as exc_info:
            UserCreate(**sample_user_data)
        
        assert "email" in str(exc_info.value)
    
    def test_user_create_weak_password(self, sample_user_data):
        """Test user creation with weak password."""
        sample_user_data["password"] = "weak"
        
        with pytest.raises(ValidationError) as exc_info:
            UserCreate(**sample_user_data)
        
        assert "password" in str(exc_info.value)
    
    def test_user_create_empty_name(self, sample_user_data):
        """Test user creation with empty name."""
        sample_user_data["first_name"] = ""
        
        with pytest.raises(ValidationError) as exc_info:
            UserCreate(**sample_user_data)
        
        assert "first_name" in str(exc_info.value)
    
    def test_user_update_partial(self):
        """Test partial user update."""
        update_data = {
            "first_name": "Updated",
            "professional_headline": "Senior Developer"
        }
        
        user_update = UserUpdate(**update_data)
        
        assert user_update.first_name == "Updated"
        assert user_update.professional_headline == "Senior Developer"
        assert user_update.last_name is None  # Not provided
    
    def test_skill_create_valid(self, sample_skill_data):
        """Test valid skill creation."""
        skill_create = SkillCreate(**sample_skill_data)
        
        assert skill_create.name == sample_skill_data["name"]
        assert skill_create.category == sample_skill_data["category"]
        assert skill_create.proficiency_level == sample_skill_data["proficiency_level"]
    
    def test_skill_create_invalid_proficiency(self, sample_skill_data):
        """Test skill creation with invalid proficiency level."""
        sample_skill_data["proficiency_level"] = 6  # Out of range (1-5)
        
        with pytest.raises(ValidationError) as exc_info:
            SkillCreate(**sample_skill_data)
        
        assert "proficiency_level" in str(exc_info.value)
    
    def test_experience_create_valid(self):
        """Test valid experience creation."""
        experience_data = {
            "title": "Software Engineer",
            "company": "Tech Corp",
            "start_date": datetime(2020, 1, 1),
            "end_date": datetime(2023, 1, 1),
            "description": "Developed web applications",
            "skills": ["Python", "JavaScript"]
        }
        
        experience_create = ExperienceCreate(**experience_data)
        
        assert experience_create.title == "Software Engineer"
        assert experience_create.company == "Tech Corp"
        assert len(experience_create.skills) == 2
    
    def test_experience_invalid_date_range(self):
        """Test experience with invalid date range."""
        experience_data = {
            "title": "Software Engineer",
            "company": "Tech Corp",
            "start_date": datetime(2023, 1, 1),
            "end_date": datetime(2020, 1, 1),  # Before start date
        }
        
        with pytest.raises(ValidationError) as exc_info:
            ExperienceCreate(**experience_data)
        
        assert "end_date" in str(exc_info.value)
    
    def test_education_create_valid(self):
        """Test valid education creation."""
        education_data = {
            "degree": "Bachelor of Science",
            "institution": "University of Technology",
            "field_of_study": "Computer Science",
            "start_year": 2016,
            "end_year": 2020,
            "gpa": 3.8
        }
        
        education_create = EducationCreate(**education_data)
        
        assert education_create.degree == "Bachelor of Science"
        assert education_create.gpa == 3.8
    
    def test_education_invalid_year_range(self):
        """Test education with invalid year range."""
        education_data = {
            "degree": "Bachelor of Science",
            "institution": "University of Technology",
            "start_year": 2020,
            "end_year": 2016,  # Before start year
        }
        
        with pytest.raises(ValidationError) as exc_info:
            EducationCreate(**education_data)
        
        assert "end_year" in str(exc_info.value)
    
    def test_user_preferences_valid(self):
        """Test valid user preferences."""
        preferences_data = {
            "remote_preference": "hybrid",
            "salary_min": 80000,
            "salary_max": 120000,
            "preferred_locations": ["San Francisco", "New York"],
            "job_types": ["full_time"],
            "willing_to_relocate": True
        }
        
        preferences = UserPreferences(**preferences_data)
        
        assert preferences.remote_preference == "hybrid"
        assert preferences.salary_min == 80000
        assert preferences.salary_max == 120000
    
    def test_user_preferences_invalid_salary_range(self):
        """Test user preferences with invalid salary range."""
        preferences_data = {
            "salary_min": 120000,
            "salary_max": 80000,  # Less than minimum
        }
        
        with pytest.raises(ValidationError) as exc_info:
            UserPreferences(**preferences_data)
        
        assert "salary_max" in str(exc_info.value)


class TestJobModels:
    """Test job-related Pydantic models."""
    
    def test_job_create_valid(self, sample_job_data):
        """Test valid job creation."""
        job_create = JobCreate(**sample_job_data)
        
        assert job_create.title == sample_job_data["title"]
        assert job_create.company == sample_job_data["company"]
        assert job_create.salary_min == sample_job_data["salary_min"]
        assert job_create.salary_max == sample_job_data["salary_max"]
    
    def test_job_create_invalid_salary_range(self, sample_job_data):
        """Test job creation with invalid salary range."""
        sample_job_data["salary_min"] = 180000
        sample_job_data["salary_max"] = 120000  # Less than minimum
        
        with pytest.raises(ValidationError) as exc_info:
            JobCreate(**sample_job_data)
        
        assert "salary_max" in str(exc_info.value)
    
    def test_job_create_minimal_data(self):
        """Test job creation with minimal required data."""
        minimal_data = {
            "title": "Developer",
            "company": "Tech Corp",
            "description": "A great opportunity",
            "location": "Remote"
        }
        
        job_create = JobCreate(**minimal_data)
        
        assert job_create.title == "Developer"
        assert job_create.remote_type == "no_preference"  # Default value
        assert job_create.job_type == "full_time"  # Default value
    
    def test_job_search_filters_valid(self):
        """Test valid job search filters."""
        filters_data = {
            "keywords": "python developer",
            "location": "San Francisco",
            "remote_type": ["remote", "hybrid"],
            "salary_min": 100000,
            "page": 1,
            "size": 20
        }
        
        filters = JobSearchFilters(**filters_data)
        
        assert filters.keywords == "python developer"
        assert len(filters.remote_type) == 2
        assert filters.page == 1
        assert filters.size == 20
    
    def test_job_search_filters_invalid_pagination(self):
        """Test job search filters with invalid pagination."""
        filters_data = {
            "page": 0,  # Invalid page number
            "size": 150  # Exceeds maximum
        }
        
        with pytest.raises(ValidationError) as exc_info:
            JobSearchFilters(**filters_data)
        
        errors = str(exc_info.value)
        assert "page" in errors or "size" in errors


class TestApplicationModels:
    """Test application-related Pydantic models."""
    
    def test_application_create_valid(self):
        """Test valid application creation."""
        application_data = {
            "job_id": "job-123",
            "cover_letter": "I am very interested in this position...",
            "status": "submitted"
        }
        
        application_create = ApplicationCreate(**application_data)
        
        assert application_create.job_id == "job-123"
        assert application_create.status == "submitted"
        assert len(application_create.cover_letter) > 10
    
    def test_application_update_partial(self):
        """Test partial application update."""
        update_data = {
            "status": "interview_scheduled",
            "notes": "Interview scheduled for next week"
        }
        
        application_update = ApplicationUpdate(**update_data)
        
        assert application_update.status == "interview_scheduled"
        assert application_update.notes == "Interview scheduled for next week"
        assert application_update.cover_letter is None  # Not provided


class TestBaseModels:
    """Test base Pydantic models."""
    
    def test_api_response_success(self):
        """Test successful API response."""
        data = {"message": "Success"}
        response = ApiResponse.success_response(data)
        
        assert response.success is True
        assert response.data == data
        assert response.error is None
        assert response.metadata is not None
    
    def test_api_response_error(self):
        """Test error API response."""
        from app.models.base import ApiError
        
        error = ApiError(
            code="VALIDATION_ERROR",
            message="Validation failed"
        )
        response = ApiResponse.error_response(error)
        
        assert response.success is False
        assert response.data is None
        assert response.error == error
    
    def test_paginated_response_valid(self):
        """Test valid paginated response."""
        items = [{"id": 1}, {"id": 2}, {"id": 3}]
        
        paginated = PaginatedResponse[dict](
            items=items,
            total=100,
            page=1,
            size=3,
            pages=34,
            has_next=True,
            has_prev=False
        )
        
        assert len(paginated.items) == 3
        assert paginated.total == 100
        assert paginated.has_next is True
        assert paginated.has_prev is False
    
    def test_result_success(self):
        """Test successful Result type."""
        data = {"value": 42}
        result = Result.success(data)
        
        assert result.success is True
        assert result.data == data
        assert result.error is None
    
    def test_result_error(self):
        """Test error Result type."""
        error_message = "Something went wrong"
        result = Result.error(error_message)
        
        assert result.success is False
        assert result.data is None
        assert result.error == error_message
    
    def test_result_map_success(self):
        """Test Result map operation on success."""
        result = Result.success(5)
        mapped_result = result.map(lambda x: x * 2)
        
        assert mapped_result.success is True
        assert mapped_result.data == 10
    
    def test_result_map_error(self):
        """Test Result map operation on error."""
        result = Result.error("Error occurred")
        mapped_result = result.map(lambda x: x * 2)
        
        assert mapped_result.success is False
        assert "Error occurred" in mapped_result.error
    
    def test_health_check_healthy(self):
        """Test healthy status."""
        health = HealthCheck.healthy(
            dependencies={"database": "healthy", "redis": "healthy"},
            uptime_seconds=3600.0
        )
        
        assert health.status == "healthy"
        assert health.dependencies["database"] == "healthy"
        assert health.uptime_seconds == 3600.0
    
    def test_health_check_unhealthy(self):
        """Test unhealthy status."""
        health = HealthCheck.unhealthy(
            dependencies={"database": "unhealthy", "redis": "healthy"}
        )
        
        assert health.status == "unhealthy"
        assert health.dependencies["database"] == "unhealthy"


class TestModelSerialization:
    """Test model serialization and deserialization."""
    
    def test_user_json_serialization(self, sample_user_data):
        """Test user model JSON serialization."""
        user_create = UserCreate(**sample_user_data)
        
        # Test serialization
        json_data = user_create.model_dump_json()
        assert isinstance(json_data, str)
        
        # Test deserialization
        parsed_data = UserCreate.model_validate_json(json_data)
        assert parsed_data.email == sample_user_data["email"]
    
    def test_job_json_serialization(self, sample_job_data):
        """Test job model JSON serialization."""
        job_create = JobCreate(**sample_job_data)
        
        # Test serialization
        json_data = job_create.model_dump_json()
        assert isinstance(json_data, str)
        
        # Test deserialization
        parsed_data = JobCreate.model_validate_json(json_data)
        assert parsed_data.title == sample_job_data["title"]
    
    def test_model_dict_conversion(self, sample_user_data):
        """Test model to dictionary conversion."""
        user_create = UserCreate(**sample_user_data)
        
        # Convert to dict
        user_dict = user_create.model_dump()
        
        assert isinstance(user_dict, dict)
        assert user_dict["email"] == sample_user_data["email"]
        assert "password" in user_dict
    
    def test_model_exclude_fields(self, sample_user_data):
        """Test excluding fields during serialization."""
        user_create = UserCreate(**sample_user_data)
        
        # Exclude password from serialization
        user_dict = user_create.model_dump(exclude={"password"})
        
        assert "password" not in user_dict
        assert "email" in user_dict