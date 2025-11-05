"""
User-related Pydantic models.

This module contains all user-related data models including user profiles,
skills, experience, education, and preferences.
"""

from datetime import datetime
from enum import Enum
from typing import List, Optional
from uuid import UUID

from pydantic import EmailStr, Field, field_validator

from .base import BaseModel, TimestampedModel


class SkillCategory(str, Enum):
    """Skill category enumeration."""
    TECHNICAL = "technical"
    SOFT = "soft"
    LANGUAGE = "language"
    CERTIFICATION = "certification"
    INDUSTRY = "industry"


class ExperienceLevel(str, Enum):
    """Experience level enumeration."""
    ENTRY = "entry"
    JUNIOR = "junior"
    MID = "mid"
    SENIOR = "senior"
    LEAD = "lead"
    EXECUTIVE = "executive"


class RemotePreference(str, Enum):
    """Remote work preference enumeration."""
    REMOTE = "remote"
    HYBRID = "hybrid"
    ONSITE = "onsite"
    NO_PREFERENCE = "no_preference"


class JobType(str, Enum):
    """Job type enumeration."""
    FULL_TIME = "full_time"
    PART_TIME = "part_time"
    CONTRACT = "contract"
    FREELANCE = "freelance"
    INTERNSHIP = "internship"


# User Models
class UserBase(BaseModel):
    """Base user model with common fields."""
    email: EmailStr = Field(..., description="User email address")
    first_name: str = Field(..., min_length=1, max_length=100, description="First name")
    last_name: str = Field(..., min_length=1, max_length=100, description="Last name")
    professional_headline: Optional[str] = Field(None, max_length=255, description="Professional headline")
    
    @field_validator('first_name', 'last_name')
    @classmethod
    def validate_names(cls, v: str) -> str:
        """Validate and clean name fields."""
        return v.strip()


class UserCreate(UserBase):
    """User creation model."""
    password: str = Field(
        ..., 
        min_length=8, 
        max_length=128, 
        description="User password"
    )
    
    @field_validator('password')
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """Validate password strength."""
        import re
        if not re.match(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])', v):
            raise ValueError(
                'Password must contain at least one lowercase letter, '
                'one uppercase letter, one digit, and one special character'
            )
        return v


class UserUpdate(BaseModel):
    """User update model."""
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    professional_headline: Optional[str] = Field(None, max_length=255)
    
    @field_validator('first_name', 'last_name')
    @classmethod
    def validate_names(cls, v: Optional[str]) -> Optional[str]:
        """Validate and clean name fields."""
        return v.strip() if v else v


class User(UserBase, TimestampedModel):
    """Complete user model."""
    email_verified: bool = Field(default=False, description="Whether email is verified")
    mfa_enabled: bool = Field(default=False, description="Whether MFA is enabled")
    last_login: Optional[datetime] = Field(None, description="Last login timestamp")
    is_active: bool = Field(default=True, description="Whether user is active")
    
    model_config = BaseModel.model_config.copy()
    model_config.update({"from_attributes": True})


class UserResponse(UserBase):
    """User response model (excludes sensitive data)."""
    id: UUID = Field(..., description="User ID")
    email_verified: bool = Field(..., description="Whether email is verified")
    mfa_enabled: bool = Field(..., description="Whether MFA is enabled")
    created_at: datetime = Field(..., description="Account creation date")
    last_login: Optional[datetime] = Field(None, description="Last login timestamp")
    is_active: bool = Field(..., description="Whether user is active")


# Skill Models
class SkillBase(BaseModel):
    """Base skill model."""
    name: str = Field(..., min_length=1, max_length=100, description="Skill name")
    category: SkillCategory = Field(..., description="Skill category")
    proficiency_level: int = Field(..., ge=1, le=5, description="Proficiency level (1-5)")
    years_of_experience: float = Field(..., ge=0, le=50, description="Years of experience")
    last_used: Optional[datetime] = Field(None, description="When skill was last used")


class SkillCreate(SkillBase):
    """Skill creation model."""
    pass


class SkillUpdate(BaseModel):
    """Skill update model."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    category: Optional[SkillCategory] = None
    proficiency_level: Optional[int] = Field(None, ge=1, le=5)
    years_of_experience: Optional[float] = Field(None, ge=0, le=50)
    last_used: Optional[datetime] = None


class Skill(SkillBase, TimestampedModel):
    """Complete skill model."""
    user_id: UUID = Field(..., description="User ID")
    endorsements: int = Field(default=0, ge=0, description="Number of endorsements")
    
    model_config = BaseModel.model_config.copy()
    model_config.update({"from_attributes": True})


# Experience Models
class ExperienceBase(BaseModel):
    """Base experience model."""
    title: str = Field(..., min_length=1, max_length=200, description="Job title")
    company: str = Field(..., min_length=1, max_length=200, description="Company name")
    location: Optional[str] = Field(None, max_length=200, description="Job location")
    start_date: datetime = Field(..., description="Start date")
    end_date: Optional[datetime] = Field(None, description="End date (None if current)")
    description: Optional[str] = Field(None, max_length=2000, description="Job description")
    is_current: bool = Field(default=False, description="Whether this is current position")
    
    @field_validator('end_date')
    @classmethod
    def validate_end_date(cls, v: Optional[datetime], info) -> Optional[datetime]:
        """Validate end date is after start date."""
        if v and hasattr(info, 'data') and info.data:
            start_date = info.data.get('start_date')
            if start_date and v <= start_date:
                raise ValueError('End date must be after start date')
        return v


class ExperienceCreate(ExperienceBase):
    """Experience creation model."""
    skills: List[str] = Field(default_factory=list, description="Skills used in this role")


class ExperienceUpdate(BaseModel):
    """Experience update model."""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    company: Optional[str] = Field(None, min_length=1, max_length=200)
    location: Optional[str] = Field(None, max_length=200)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    description: Optional[str] = Field(None, max_length=2000)
    is_current: Optional[bool] = None
    skills: Optional[List[str]] = None


class Experience(ExperienceBase, TimestampedModel):
    """Complete experience model."""
    user_id: UUID = Field(..., description="User ID")
    skills: List[str] = Field(default_factory=list, description="Skills used in this role")
    
    model_config = BaseModel.model_config.copy()
    model_config.update({"from_attributes": True})


# Education Models
class EducationBase(BaseModel):
    """Base education model."""
    degree: str = Field(..., min_length=1, max_length=200, description="Degree name")
    institution: str = Field(..., min_length=1, max_length=200, description="Institution name")
    field_of_study: Optional[str] = Field(None, max_length=200, description="Field of study")
    start_year: int = Field(..., ge=1950, le=2030, description="Start year")
    end_year: Optional[int] = Field(None, ge=1950, le=2030, description="End year")
    gpa: Optional[float] = Field(None, ge=0.0, le=4.0, description="GPA")
    is_current: bool = Field(default=False, description="Whether currently studying")
    
    @field_validator('end_year')
    @classmethod
    def validate_end_year(cls, v: Optional[int], info) -> Optional[int]:
        """Validate end year is after start year."""
        if v and hasattr(info, 'data') and info.data:
            start_year = info.data.get('start_year')
            if start_year and v <= start_year:
                raise ValueError('End year must be after start year')
        return v


class EducationCreate(EducationBase):
    """Education creation model."""
    pass


class EducationUpdate(BaseModel):
    """Education update model."""
    degree: Optional[str] = Field(None, min_length=1, max_length=200)
    institution: Optional[str] = Field(None, min_length=1, max_length=200)
    field_of_study: Optional[str] = Field(None, max_length=200)
    start_year: Optional[int] = Field(None, ge=1950, le=2030)
    end_year: Optional[int] = Field(None, ge=1950, le=2030)
    gpa: Optional[float] = Field(None, ge=0.0, le=4.0)
    is_current: Optional[bool] = None


class Education(EducationBase, TimestampedModel):
    """Complete education model."""
    user_id: UUID = Field(..., description="User ID")
    
    model_config = BaseModel.model_config.copy()
    model_config.update({"from_attributes": True})


# User Preferences Models
class UserPreferences(BaseModel):
    """User job preferences model."""
    remote_preference: RemotePreference = Field(
        default=RemotePreference.NO_PREFERENCE,
        description="Remote work preference"
    )
    salary_min: Optional[int] = Field(None, ge=0, description="Minimum salary expectation")
    salary_max: Optional[int] = Field(None, ge=0, description="Maximum salary expectation")
    preferred_locations: List[str] = Field(
        default_factory=list,
        description="Preferred job locations"
    )
    job_types: List[JobType] = Field(
        default_factory=lambda: [JobType.FULL_TIME],
        description="Preferred job types"
    )
    industries: List[str] = Field(
        default_factory=list,
        description="Preferred industries"
    )
    company_sizes: List[str] = Field(
        default_factory=list,
        description="Preferred company sizes"
    )
    willing_to_relocate: bool = Field(default=False, description="Willing to relocate")
    
    @field_validator('salary_max')
    @classmethod
    def validate_salary_range(cls, v: Optional[int], info) -> Optional[int]:
        """Validate salary max is greater than min."""
        if v and hasattr(info, 'data') and info.data:
            salary_min = info.data.get('salary_min')
            if salary_min and v <= salary_min:
                raise ValueError('Maximum salary must be greater than minimum salary')
        return v


# User Profile Models
class UserProfile(TimestampedModel):
    """Complete user profile model."""
    user_id: UUID = Field(..., description="User ID")
    skills: List[Skill] = Field(default_factory=list, description="User skills")
    experience: List[Experience] = Field(default_factory=list, description="Work experience")
    education: List[Education] = Field(default_factory=list, description="Education history")
    preferences: UserPreferences = Field(
        default_factory=UserPreferences,
        description="Job preferences"
    )
    skill_score: float = Field(default=0.0, ge=0, le=100, description="Overall skill score")
    profile_completeness: float = Field(
        default=0.0, 
        ge=0, 
        le=100, 
        description="Profile completeness percentage"
    )
    last_calculated: Optional[datetime] = Field(
        None,
        description="When scores were last calculated"
    )
    
    model_config = BaseModel.model_config.copy()
    model_config.update({"from_attributes": True})


class UserProfileUpdate(BaseModel):
    """User profile update model."""
    preferences: Optional[UserPreferences] = None
    
    
class UserProfileResponse(BaseModel):
    """User profile response model."""
    user_id: UUID = Field(..., description="User ID")
    skills: List[Skill] = Field(..., description="User skills")
    experience: List[Experience] = Field(..., description="Work experience")
    education: List[Education] = Field(..., description="Education history")
    preferences: UserPreferences = Field(..., description="Job preferences")
    skill_score: float = Field(..., description="Overall skill score")
    profile_completeness: float = Field(..., description="Profile completeness percentage")
    last_calculated: Optional[datetime] = Field(None, description="When scores were last calculated")
    created_at: datetime = Field(..., description="Profile creation date")
    updated_at: datetime = Field(..., description="Profile last update date")