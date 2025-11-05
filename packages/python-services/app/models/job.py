"""
Job-related Pydantic models.

This module contains all job-related data models including job postings,
job search filters, and job matching results.
"""

from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional
from uuid import UUID

from pydantic import Field, HttpUrl, field_validator

from .base import BaseModel, TimestampedModel
from .user import JobType, RemotePreference


class JobStatus(str, Enum):
    """Job posting status enumeration."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    EXPIRED = "expired"
    FILLED = "filled"
    DRAFT = "draft"


class JobSource(str, Enum):
    """Job source enumeration."""
    LINKEDIN = "linkedin"
    INDEED = "indeed"
    GLASSDOOR = "glassdoor"
    COMPANY_WEBSITE = "company_website"
    MANUAL = "manual"
    API = "api"


class CompanySize(str, Enum):
    """Company size enumeration."""
    STARTUP = "startup"  # 1-10
    SMALL = "small"      # 11-50
    MEDIUM = "medium"    # 51-200
    LARGE = "large"      # 201-1000
    ENTERPRISE = "enterprise"  # 1000+


class SalaryType(str, Enum):
    """Salary type enumeration."""
    HOURLY = "hourly"
    ANNUAL = "annual"
    CONTRACT = "contract"
    COMMISSION = "commission"


# Job Models
class JobBase(BaseModel):
    """Base job model with common fields."""
    title: str = Field(..., min_length=1, max_length=300, description="Job title")
    company: str = Field(..., min_length=1, max_length=200, description="Company name")
    description: str = Field(..., min_length=10, description="Job description")
    location: str = Field(..., min_length=1, max_length=200, description="Job location")
    remote_type: RemotePreference = Field(
        default=RemotePreference.NO_PREFERENCE,
        description="Remote work type"
    )
    job_type: JobType = Field(default=JobType.FULL_TIME, description="Job type")
    industry: Optional[str] = Field(None, max_length=100, description="Industry")
    company_size: Optional[CompanySize] = Field(None, description="Company size")
    
    @field_validator('title', 'company')
    @classmethod
    def validate_text_fields(cls, v: str) -> str:
        """Validate and clean text fields."""
        return v.strip()


class JobCreate(JobBase):
    """Job creation model."""
    requirements: List[str] = Field(default_factory=list, description="Job requirements")
    required_skills: List[str] = Field(default_factory=list, description="Required skills")
    preferred_skills: List[str] = Field(default_factory=list, description="Preferred skills")
    salary_min: Optional[int] = Field(None, ge=0, description="Minimum salary")
    salary_max: Optional[int] = Field(None, ge=0, description="Maximum salary")
    salary_type: Optional[SalaryType] = Field(None, description="Salary type")
    benefits: List[str] = Field(default_factory=list, description="Job benefits")
    application_url: Optional[HttpUrl] = Field(None, description="Application URL")
    application_email: Optional[str] = Field(None, description="Application email")
    source: JobSource = Field(default=JobSource.MANUAL, description="Job source")
    external_id: Optional[str] = Field(None, description="External job ID")
    posted_date: Optional[datetime] = Field(None, description="Job posting date")
    expires_date: Optional[datetime] = Field(None, description="Job expiration date")
    
    @field_validator('salary_max')
    @classmethod
    def validate_salary_range(cls, v: Optional[int], info) -> Optional[int]:
        """Validate salary max is greater than min."""
        if v and hasattr(info, 'data') and info.data:
            salary_min = info.data.get('salary_min')
            if salary_min and v <= salary_min:
                raise ValueError('Maximum salary must be greater than minimum salary')
        return v
    
    @field_validator('expires_date')
    @classmethod
    def validate_expires_date(cls, v: Optional[datetime], info) -> Optional[datetime]:
        """Validate expiration date is in the future."""
        if v and hasattr(info, 'data') and info.data:
            posted_date = info.data.get('posted_date')
            if posted_date and v <= posted_date:
                raise ValueError('Expiration date must be after posting date')
        return v


class JobUpdate(BaseModel):
    """Job update model."""
    title: Optional[str] = Field(None, min_length=1, max_length=300)
    company: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, min_length=10)
    location: Optional[str] = Field(None, min_length=1, max_length=200)
    remote_type: Optional[RemotePreference] = None
    job_type: Optional[JobType] = None
    industry: Optional[str] = Field(None, max_length=100)
    company_size: Optional[CompanySize] = None
    requirements: Optional[List[str]] = None
    required_skills: Optional[List[str]] = None
    preferred_skills: Optional[List[str]] = None
    salary_min: Optional[int] = Field(None, ge=0)
    salary_max: Optional[int] = Field(None, ge=0)
    salary_type: Optional[SalaryType] = None
    benefits: Optional[List[str]] = None
    application_url: Optional[HttpUrl] = None
    application_email: Optional[str] = None
    status: Optional[JobStatus] = None
    expires_date: Optional[datetime] = None


class Job(JobBase, TimestampedModel):
    """Complete job model."""
    requirements: List[str] = Field(default_factory=list, description="Job requirements")
    required_skills: List[str] = Field(default_factory=list, description="Required skills")
    preferred_skills: List[str] = Field(default_factory=list, description="Preferred skills")
    salary_min: Optional[int] = Field(None, ge=0, description="Minimum salary")
    salary_max: Optional[int] = Field(None, ge=0, description="Maximum salary")
    salary_type: Optional[SalaryType] = Field(None, description="Salary type")
    benefits: List[str] = Field(default_factory=list, description="Job benefits")
    application_url: Optional[HttpUrl] = Field(None, description="Application URL")
    application_email: Optional[str] = Field(None, description="Application email")
    source: JobSource = Field(default=JobSource.MANUAL, description="Job source")
    external_id: Optional[str] = Field(None, description="External job ID")
    status: JobStatus = Field(default=JobStatus.ACTIVE, description="Job status")
    posted_date: Optional[datetime] = Field(None, description="Job posting date")
    expires_date: Optional[datetime] = Field(None, description="Job expiration date")
    view_count: int = Field(default=0, ge=0, description="Number of views")
    application_count: int = Field(default=0, ge=0, description="Number of applications")
    
    model_config = BaseModel.model_config.copy()
    model_config.update({"from_attributes": True})


class JobResponse(JobBase):
    """Job response model."""
    id: UUID = Field(..., description="Job ID")
    requirements: List[str] = Field(..., description="Job requirements")
    required_skills: List[str] = Field(..., description="Required skills")
    preferred_skills: List[str] = Field(..., description="Preferred skills")
    salary_min: Optional[int] = Field(None, description="Minimum salary")
    salary_max: Optional[int] = Field(None, description="Maximum salary")
    salary_type: Optional[SalaryType] = Field(None, description="Salary type")
    benefits: List[str] = Field(..., description="Job benefits")
    application_url: Optional[HttpUrl] = Field(None, description="Application URL")
    application_email: Optional[str] = Field(None, description="Application email")
    source: JobSource = Field(..., description="Job source")
    status: JobStatus = Field(..., description="Job status")
    posted_date: Optional[datetime] = Field(None, description="Job posting date")
    expires_date: Optional[datetime] = Field(None, description="Job expiration date")
    view_count: int = Field(..., description="Number of views")
    application_count: int = Field(..., description="Number of applications")
    created_at: datetime = Field(..., description="Job creation date")
    updated_at: datetime = Field(..., description="Job last update date")


# Job Search Models
class JobSearchFilters(BaseModel):
    """Job search filters model."""
    keywords: Optional[str] = Field(None, description="Search keywords")
    location: Optional[str] = Field(None, description="Job location")
    remote_type: Optional[List[RemotePreference]] = Field(None, description="Remote work types")
    job_types: Optional[List[JobType]] = Field(None, description="Job types")
    industries: Optional[List[str]] = Field(None, description="Industries")
    company_sizes: Optional[List[CompanySize]] = Field(None, description="Company sizes")
    salary_min: Optional[int] = Field(None, ge=0, description="Minimum salary")
    salary_max: Optional[int] = Field(None, ge=0, description="Maximum salary")
    required_skills: Optional[List[str]] = Field(None, description="Required skills")
    posted_within_days: Optional[int] = Field(None, ge=1, le=365, description="Posted within days")
    exclude_expired: bool = Field(default=True, description="Exclude expired jobs")
    
    # Pagination
    page: int = Field(default=1, ge=1, description="Page number")
    size: int = Field(default=20, ge=1, le=100, description="Page size")
    
    # Sorting
    sort_by: Optional[str] = Field(
        default="relevance",
        description="Sort field (relevance, posted_date, salary, title)"
    )
    sort_order: Optional[str] = Field(
        default="desc",
        description="Sort order (asc, desc)"
    )


class JobSearchResult(BaseModel):
    """Job search result model."""
    jobs: List[JobResponse] = Field(..., description="List of jobs")
    total: int = Field(..., ge=0, description="Total number of jobs")
    page: int = Field(..., ge=1, description="Current page")
    size: int = Field(..., ge=1, description="Page size")
    pages: int = Field(..., ge=0, description="Total pages")
    filters_applied: JobSearchFilters = Field(..., description="Applied filters")
    search_time_ms: Optional[float] = Field(None, description="Search time in milliseconds")


# Job Matching Models
class JobMatch(BaseModel):
    """Job matching result model."""
    job_id: UUID = Field(..., description="Job ID")
    job: JobResponse = Field(..., description="Job details")
    semantic_score: float = Field(..., ge=0, le=1, description="Semantic similarity score")
    traditional_score: float = Field(..., ge=0, le=1, description="Traditional matching score")
    composite_score: float = Field(..., ge=0, le=1, description="Composite matching score")
    match_factors: Dict[str, float] = Field(
        default_factory=dict,
        description="Individual matching factors"
    )
    match_explanation: str = Field(..., description="Human-readable match explanation")
    missing_skills: List[str] = Field(
        default_factory=list,
        description="Skills required by job but not in user profile"
    )
    matching_skills: List[str] = Field(
        default_factory=list,
        description="Skills that match between user and job"
    )
    salary_match: Optional[bool] = Field(None, description="Whether salary expectations match")
    location_match: Optional[bool] = Field(None, description="Whether location preferences match")


class JobMatchRequest(BaseModel):
    """Job matching request model."""
    user_id: UUID = Field(..., description="User ID")
    filters: Optional[JobSearchFilters] = Field(None, description="Additional filters")
    top_k: int = Field(default=20, ge=1, le=100, description="Number of top matches to return")
    include_explanation: bool = Field(default=True, description="Include match explanations")
    min_score: float = Field(default=0.0, ge=0, le=1, description="Minimum composite score")


class JobMatchResponse(BaseModel):
    """Job matching response model."""
    user_id: UUID = Field(..., description="User ID")
    matches: List[JobMatch] = Field(..., description="Job matches")
    total_jobs_considered: int = Field(..., ge=0, description="Total jobs considered")
    matching_time_ms: Optional[float] = Field(None, description="Matching time in milliseconds")
    filters_applied: Optional[JobSearchFilters] = Field(None, description="Applied filters")


# Job Analytics Models
class JobAnalytics(BaseModel):
    """Job analytics model."""
    job_id: UUID = Field(..., description="Job ID")
    views_today: int = Field(default=0, ge=0, description="Views today")
    views_week: int = Field(default=0, ge=0, description="Views this week")
    views_month: int = Field(default=0, ge=0, description="Views this month")
    applications_today: int = Field(default=0, ge=0, description="Applications today")
    applications_week: int = Field(default=0, ge=0, description="Applications this week")
    applications_month: int = Field(default=0, ge=0, description="Applications this month")
    conversion_rate: float = Field(default=0.0, ge=0, le=1, description="Application conversion rate")
    avg_match_score: Optional[float] = Field(None, ge=0, le=1, description="Average match score")
    top_matching_skills: List[str] = Field(
        default_factory=list,
        description="Top skills that match this job"
    )
    last_updated: datetime = Field(
        default_factory=datetime.utcnow,
        description="Last analytics update"
    )


class JobTrends(BaseModel):
    """Job market trends model."""
    industry: str = Field(..., description="Industry name")
    total_jobs: int = Field(..., ge=0, description="Total active jobs")
    new_jobs_week: int = Field(..., ge=0, description="New jobs this week")
    avg_salary_min: Optional[float] = Field(None, ge=0, description="Average minimum salary")
    avg_salary_max: Optional[float] = Field(None, ge=0, description="Average maximum salary")
    top_skills: List[str] = Field(..., description="Most in-demand skills")
    top_locations: List[str] = Field(..., description="Top job locations")
    remote_percentage: float = Field(..., ge=0, le=100, description="Percentage of remote jobs")
    growth_rate: float = Field(..., description="Job growth rate (percentage)")
    competition_level: str = Field(..., description="Competition level (low/medium/high)")
    last_calculated: datetime = Field(
        default_factory=datetime.utcnow,
        description="When trends were last calculated"
    )