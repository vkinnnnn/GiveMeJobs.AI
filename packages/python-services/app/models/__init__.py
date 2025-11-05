"""
Pydantic models for the GiveMeJobs Python services.

This module contains all the data models used throughout the application,
including request/response models, database models, and domain models.
"""

from .base import *
from .user import *
from .job import *
from .application import *
from .document import *
from .analytics import *

__all__ = [
    # Base models
    "BaseModel",
    "TimestampedModel", 
    "ApiResponse",
    "ApiError",
    "ResponseMetadata",
    "PaginatedResponse",
    "Result",
    
    # User models
    "User",
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    "UserProfile",
    "Skill",
    "Experience",
    "Education",
    "UserPreferences",
    
    # Job models
    "Job",
    "JobCreate",
    "JobUpdate",
    "JobResponse",
    "JobSearchFilters",
    "JobMatch",
    
    # Application models
    "Application",
    "ApplicationCreate",
    "ApplicationUpdate",
    "ApplicationResponse",
    "ApplicationStatus",
    
    # Document models
    "Document",
    "DocumentCreate",
    "DocumentResponse",
    "DocumentTemplate",
    "GeneratedDocument",
    
    # Analytics models
    "AnalyticsInsights",
    "UserMetrics",
    "SuccessPrediction",
]