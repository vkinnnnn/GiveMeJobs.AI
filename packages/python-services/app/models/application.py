"""
Application-related Pydantic models.

This module contains all job application-related data models including
application status, tracking, and analytics.
"""

from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional
from uuid import UUID

from pydantic import Field, HttpUrl, validator

from .base import BaseModel, TimestampedModel


class ApplicationStatus(str, Enum):
    """Application status enumeration."""
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    INTERVIEW_SCHEDULED = "interview_scheduled"
    INTERVIEW_COMPLETED = "interview_completed"
    OFFER_RECEIVED = "offer_received"
    OFFER_ACCEPTED = "offer_accepted"
    OFFER_DECLINED = "offer_declined"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"


class ApplicationSource(str, Enum):
    """Application source enumeration."""
    PLATFORM = "platform"
    DIRECT = "direct"
    REFERRAL = "referral"
    RECRUITER = "recruiter"
    JOB_BOARD = "job_board"


class InterviewType(str, Enum):
    """Interview type enumeration."""
    PHONE = "phone"
    VIDEO = "video"
    IN_PERSON = "in_person"
    TECHNICAL = "technical"
    BEHAVIORAL = "behavioral"
    PANEL = "panel"
    FINAL = "final"


# Application Models
class ApplicationBase(BaseModel):
    """Base application model with common fields."""
    job_id: UUID = Field(..., description="Job ID")
    user_id: UUID = Field(..., description="User ID")
    cover_letter: Optional[str] = Field(None, description="Cover letter content")
    resume_url: Optional[HttpUrl] = Field(None, description="Resume URL")
    portfolio_url: Optional[HttpUrl] = Field(None, description="Portfolio URL")
    source: ApplicationSource = Field(default=ApplicationSource.PLATFORM, description="Application source")
    notes: Optional[str] = Field(None, max_length=2000, description="Application notes")


class ApplicationCreate(ApplicationBase):
    """Application creation model."""
    custom_fields: Dict[str, str] = Field(
        default_factory=dict,
        description="Custom application fields"
    )


class ApplicationUpdate(BaseModel):
    """Application update model."""
    status: Optional[ApplicationStatus] = None
    cover_letter: Optional[str] = None
    resume_url: Optional[HttpUrl] = None
    portfolio_url: Optional[HttpUrl] = None
    notes: Optional[str] = Field(None, max_length=2000)
    custom_fields: Optional[Dict[str, str]] = None


class Application(ApplicationBase, TimestampedModel):
    """Complete application model."""
    status: ApplicationStatus = Field(default=ApplicationStatus.DRAFT, description="Application status")
    submitted_at: Optional[datetime] = Field(None, description="Submission timestamp")
    response_received_at: Optional[datetime] = Field(None, description="Response received timestamp")
    response_time_days: Optional[int] = Field(None, ge=0, description="Response time in days")
    custom_fields: Dict[str, str] = Field(
        default_factory=dict,
        description="Custom application fields"
    )
    
    # Tracking fields
    viewed_by_employer: bool = Field(default=False, description="Whether viewed by employer")
    employer_feedback: Optional[str] = Field(None, description="Employer feedback")
    rejection_reason: Optional[str] = Field(None, description="Rejection reason")
    
    model_config = BaseModel.model_config.copy()
    model_config.update({"from_attributes": True})
    
    @validator('response_time_days', always=True)
    def calculate_response_time(cls, v: Optional[int], values: dict) -> Optional[int]:
        """Calculate response time if both dates are available."""
        if v is not None:
            return v
        
        submitted_at = values.get('submitted_at')
        response_received_at = values.get('response_received_at')
        
        if submitted_at and response_received_at:
            delta = response_received_at - submitted_at
            return delta.days
        
        return None


class ApplicationResponse(ApplicationBase):
    """Application response model."""
    id: UUID = Field(..., description="Application ID")
    status: ApplicationStatus = Field(..., description="Application status")
    submitted_at: Optional[datetime] = Field(None, description="Submission timestamp")
    response_received_at: Optional[datetime] = Field(None, description="Response received timestamp")
    response_time_days: Optional[int] = Field(None, description="Response time in days")
    custom_fields: Dict[str, str] = Field(..., description="Custom application fields")
    viewed_by_employer: bool = Field(..., description="Whether viewed by employer")
    employer_feedback: Optional[str] = Field(None, description="Employer feedback")
    rejection_reason: Optional[str] = Field(None, description="Rejection reason")
    created_at: datetime = Field(..., description="Application creation date")
    updated_at: datetime = Field(..., description="Application last update date")


# Interview Models
class InterviewBase(BaseModel):
    """Base interview model."""
    application_id: UUID = Field(..., description="Application ID")
    interview_type: InterviewType = Field(..., description="Interview type")
    scheduled_at: datetime = Field(..., description="Interview scheduled time")
    duration_minutes: Optional[int] = Field(None, ge=15, le=480, description="Interview duration")
    location: Optional[str] = Field(None, description="Interview location")
    meeting_url: Optional[HttpUrl] = Field(None, description="Video meeting URL")
    interviewer_name: Optional[str] = Field(None, description="Interviewer name")
    interviewer_email: Optional[str] = Field(None, description="Interviewer email")
    notes: Optional[str] = Field(None, description="Interview notes")


class InterviewCreate(InterviewBase):
    """Interview creation model."""
    pass


class InterviewUpdate(BaseModel):
    """Interview update model."""
    interview_type: Optional[InterviewType] = None
    scheduled_at: Optional[datetime] = None
    duration_minutes: Optional[int] = Field(None, ge=15, le=480)
    location: Optional[str] = None
    meeting_url: Optional[HttpUrl] = None
    interviewer_name: Optional[str] = None
    interviewer_email: Optional[str] = None
    notes: Optional[str] = None
    completed: Optional[bool] = None
    feedback: Optional[str] = None
    rating: Optional[int] = Field(None, ge=1, le=5)


class Interview(InterviewBase, TimestampedModel):
    """Complete interview model."""
    completed: bool = Field(default=False, description="Whether interview is completed")
    completed_at: Optional[datetime] = Field(None, description="Interview completion time")
    feedback: Optional[str] = Field(None, description="Interview feedback")
    rating: Optional[int] = Field(None, ge=1, le=5, description="Interview rating (1-5)")
    
    model_config = BaseModel.model_config.copy()
    model_config.update({"from_attributes": True})


class InterviewResponse(InterviewBase):
    """Interview response model."""
    id: UUID = Field(..., description="Interview ID")
    completed: bool = Field(..., description="Whether interview is completed")
    completed_at: Optional[datetime] = Field(None, description="Interview completion time")
    feedback: Optional[str] = Field(None, description="Interview feedback")
    rating: Optional[int] = Field(None, description="Interview rating (1-5)")
    created_at: datetime = Field(..., description="Interview creation date")
    updated_at: datetime = Field(..., description="Interview last update date")


# Application Analytics Models
class ApplicationMetrics(BaseModel):
    """Application metrics model."""
    user_id: UUID = Field(..., description="User ID")
    total_applications: int = Field(default=0, ge=0, description="Total applications")
    applications_this_month: int = Field(default=0, ge=0, description="Applications this month")
    applications_this_week: int = Field(default=0, ge=0, description="Applications this week")
    
    # Response metrics
    responses_received: int = Field(default=0, ge=0, description="Responses received")
    response_rate: float = Field(default=0.0, ge=0, le=100, description="Response rate percentage")
    avg_response_time_days: Optional[float] = Field(None, ge=0, description="Average response time")
    
    # Interview metrics
    interviews_scheduled: int = Field(default=0, ge=0, description="Interviews scheduled")
    interviews_completed: int = Field(default=0, ge=0, description="Interviews completed")
    interview_rate: float = Field(default=0.0, ge=0, le=100, description="Interview rate percentage")
    
    # Offer metrics
    offers_received: int = Field(default=0, ge=0, description="Offers received")
    offers_accepted: int = Field(default=0, ge=0, description="Offers accepted")
    offer_rate: float = Field(default=0.0, ge=0, le=100, description="Offer rate percentage")
    
    # Status breakdown
    status_breakdown: Dict[ApplicationStatus, int] = Field(
        default_factory=dict,
        description="Breakdown by application status"
    )
    
    # Top performing categories
    top_industries: List[str] = Field(
        default_factory=list,
        description="Industries with highest response rates"
    )
    top_job_types: List[str] = Field(
        default_factory=list,
        description="Job types with highest response rates"
    )
    top_locations: List[str] = Field(
        default_factory=list,
        description="Locations with highest response rates"
    )
    
    last_calculated: datetime = Field(
        default_factory=datetime.utcnow,
        description="When metrics were last calculated"
    )


class ApplicationTrend(BaseModel):
    """Application trend data model."""
    date: datetime = Field(..., description="Date")
    applications_count: int = Field(..., ge=0, description="Number of applications")
    responses_count: int = Field(..., ge=0, description="Number of responses")
    interviews_count: int = Field(..., ge=0, description="Number of interviews")
    offers_count: int = Field(..., ge=0, description="Number of offers")


class ApplicationInsights(BaseModel):
    """Application insights model."""
    user_id: UUID = Field(..., description="User ID")
    metrics: ApplicationMetrics = Field(..., description="Application metrics")
    trends: List[ApplicationTrend] = Field(..., description="Application trends over time")
    
    # Insights and recommendations
    insights: List[str] = Field(
        default_factory=list,
        description="Generated insights"
    )
    recommendations: List[str] = Field(
        default_factory=list,
        description="Actionable recommendations"
    )
    
    # Benchmarking
    industry_benchmark: Optional[Dict[str, float]] = Field(
        None,
        description="Industry benchmark metrics"
    )
    platform_benchmark: Optional[Dict[str, float]] = Field(
        None,
        description="Platform benchmark metrics"
    )
    
    generated_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="When insights were generated"
    )


# Application Search and Filtering
class ApplicationFilters(BaseModel):
    """Application filtering model."""
    user_id: Optional[UUID] = None
    job_ids: Optional[List[UUID]] = None
    statuses: Optional[List[ApplicationStatus]] = None
    sources: Optional[List[ApplicationSource]] = None
    submitted_after: Optional[datetime] = None
    submitted_before: Optional[datetime] = None
    has_response: Optional[bool] = None
    has_interview: Optional[bool] = None
    has_offer: Optional[bool] = None
    
    # Pagination
    page: int = Field(default=1, ge=1, description="Page number")
    size: int = Field(default=20, ge=1, le=100, description="Page size")
    
    # Sorting
    sort_by: str = Field(default="created_at", description="Sort field")
    sort_order: str = Field(default="desc", description="Sort order (asc, desc)")


class ApplicationSearchResult(BaseModel):
    """Application search result model."""
    applications: List[ApplicationResponse] = Field(..., description="List of applications")
    total: int = Field(..., ge=0, description="Total number of applications")
    page: int = Field(..., ge=1, description="Current page")
    size: int = Field(..., ge=1, description="Page size")
    pages: int = Field(..., ge=0, description="Total pages")
    filters_applied: ApplicationFilters = Field(..., description="Applied filters")