"""Data models for document processing service."""

from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Any

from pydantic import BaseModel, Field, validator


class DocumentFormat(str, Enum):
    """Supported document formats."""
    PDF = "pdf"
    DOCX = "docx"
    TXT = "txt"


class TemplateType(str, Enum):
    """Resume template types."""
    MODERN = "modern"
    CLASSIC = "classic"
    CREATIVE = "creative"
    MINIMAL = "minimal"
    PROFESSIONAL = "professional"


class UserProfile(BaseModel):
    """User profile data for document generation."""
    id: str
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    location: Optional[str] = None
    
    # Professional information
    skills: List[str] = Field(default_factory=list)
    experience: List[Dict[str, Any]] = Field(default_factory=list)
    education: List[Dict[str, Any]] = Field(default_factory=list)
    certifications: List[Dict[str, Any]] = Field(default_factory=list)
    achievements: List[str] = Field(default_factory=list)
    
    # Career preferences
    career_goals: Optional[str] = None
    preferred_roles: List[str] = Field(default_factory=list)
    salary_expectation_min: Optional[int] = None
    salary_expectation_max: Optional[int] = None
    
    # Additional information
    summary: Optional[str] = None
    languages: List[str] = Field(default_factory=list)
    interests: List[str] = Field(default_factory=list)


class JobPosting(BaseModel):
    """Job posting data for context-aware generation."""
    id: str
    title: str
    company: str
    description: str
    requirements: Optional[str] = None
    location: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    employment_type: Optional[str] = None
    experience_level: Optional[str] = None
    industry: Optional[str] = None
    posted_date: Optional[datetime] = None


class DocumentGenerationRequest(BaseModel):
    """Request model for document generation."""
    user_profile: UserProfile
    job_posting: Optional[JobPosting] = None
    template_id: TemplateType = TemplateType.PROFESSIONAL
    format: DocumentFormat = DocumentFormat.PDF
    custom_instructions: Optional[str] = None
    include_cover_letter: bool = False


class JobRequirementExtractionRequest(BaseModel):
    """Request model for job requirement extraction."""
    job_description: str
    company_name: Optional[str] = None
    job_title: Optional[str] = None


class ExtractedRequirements(BaseModel):
    """Extracted job requirements."""
    required_skills: List[str] = Field(default_factory=list)
    preferred_skills: List[str] = Field(default_factory=list)
    experience_years: Optional[int] = None
    education_level: Optional[str] = None
    certifications: List[str] = Field(default_factory=list)
    responsibilities: List[str] = Field(default_factory=list)
    qualifications: List[str] = Field(default_factory=list)
    company_culture: List[str] = Field(default_factory=list)
    benefits: List[str] = Field(default_factory=list)
    employment_type: Optional[str] = None
    location_requirements: Optional[str] = None
    salary_range: Optional[Dict[str, int]] = None


class GeneratedDocument(BaseModel):
    """Generated document response."""
    content: str
    format: DocumentFormat
    metadata: Dict[str, Any] = Field(default_factory=dict)
    generation_time: float
    word_count: int
    template_used: TemplateType
    
    @validator('generation_time')
    def validate_generation_time(cls, v):
        if v < 0:
            raise ValueError('Generation time must be positive')
        return v


class DocumentProcessingResponse(BaseModel):
    """Response model for document processing."""
    status: str = "completed"
    document: Optional[GeneratedDocument] = None
    requirements: Optional[ExtractedRequirements] = None
    error: Optional[str] = None
    correlation_id: Optional[str] = None
    processing_time: float
    
    @validator('status')
    def validate_status(cls, v):
        allowed_statuses = ['completed', 'failed', 'processing']
        if v not in allowed_statuses:
            raise ValueError(f'Status must be one of {allowed_statuses}')
        return v


class DocumentUploadRequest(BaseModel):
    """Request model for document upload and processing."""
    file_name: str
    file_content: bytes
    format: DocumentFormat
    processing_type: str = "extract_text"  # extract_text, analyze_structure, etc.


class ProcessedDocument(BaseModel):
    """Processed document response."""
    file_name: str
    format: DocumentFormat
    extracted_text: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    processing_time: float
    
    class Config:
        arbitrary_types_allowed = True