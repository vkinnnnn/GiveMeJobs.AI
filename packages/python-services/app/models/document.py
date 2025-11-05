"""
Document-related Pydantic models.

This module contains all document-related data models including document
templates, generated documents, and document processing results.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import Field, HttpUrl, validator

from .base import BaseModel, TimestampedModel


class DocumentType(str, Enum):
    """Document type enumeration."""
    RESUME = "resume"
    COVER_LETTER = "cover_letter"
    PORTFOLIO = "portfolio"
    REFERENCE_LETTER = "reference_letter"
    THANK_YOU_LETTER = "thank_you_letter"


class DocumentFormat(str, Enum):
    """Document format enumeration."""
    PDF = "pdf"
    DOCX = "docx"
    HTML = "html"
    TXT = "txt"
    MARKDOWN = "markdown"


class DocumentStatus(str, Enum):
    """Document status enumeration."""
    DRAFT = "draft"
    GENERATING = "generating"
    GENERATED = "generated"
    PROCESSING = "processing"
    READY = "ready"
    ERROR = "error"


class TemplateCategory(str, Enum):
    """Template category enumeration."""
    MODERN = "modern"
    CLASSIC = "classic"
    CREATIVE = "creative"
    ATS_FRIENDLY = "ats_friendly"
    EXECUTIVE = "executive"
    MINIMALIST = "minimalist"
    PROFESSIONAL = "professional"


# Document Template Models
class DocumentTemplateBase(BaseModel):
    """Base document template model."""
    name: str = Field(..., min_length=1, max_length=200, description="Template name")
    description: Optional[str] = Field(None, max_length=1000, description="Template description")
    category: TemplateCategory = Field(..., description="Template category")
    document_type: DocumentType = Field(..., description="Document type")
    is_public: bool = Field(default=False, description="Whether template is public")
    is_premium: bool = Field(default=False, description="Whether template is premium")


class DocumentTemplateCreate(DocumentTemplateBase):
    """Document template creation model."""
    template_content: str = Field(..., description="Template content (Jinja2)")
    css_styles: Optional[str] = Field(None, description="CSS styles for the template")
    preview_image_url: Optional[HttpUrl] = Field(None, description="Template preview image")
    tags: List[str] = Field(default_factory=list, description="Template tags")


class DocumentTemplateUpdate(BaseModel):
    """Document template update model."""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    category: Optional[TemplateCategory] = None
    is_public: Optional[bool] = None
    is_premium: Optional[bool] = None
    template_content: Optional[str] = None
    css_styles: Optional[str] = None
    preview_image_url: Optional[HttpUrl] = None
    tags: Optional[List[str]] = None


class DocumentTemplate(DocumentTemplateBase, TimestampedModel):
    """Complete document template model."""
    template_content: str = Field(..., description="Template content (Jinja2)")
    css_styles: Optional[str] = Field(None, description="CSS styles for the template")
    preview_image_url: Optional[HttpUrl] = Field(None, description="Template preview image")
    tags: List[str] = Field(default_factory=list, description="Template tags")
    usage_count: int = Field(default=0, ge=0, description="Number of times used")
    rating_average: float = Field(default=0.0, ge=0, le=5, description="Average rating")
    rating_count: int = Field(default=0, ge=0, description="Number of ratings")
    created_by: Optional[UUID] = Field(None, description="Creator user ID")
    
    model_config = BaseModel.model_config.copy()
    model_config.update({"from_attributes": True})


class DocumentTemplateResponse(DocumentTemplateBase):
    """Document template response model."""
    id: UUID = Field(..., description="Template ID")
    preview_image_url: Optional[HttpUrl] = Field(None, description="Template preview image")
    tags: List[str] = Field(..., description="Template tags")
    usage_count: int = Field(..., description="Number of times used")
    rating_average: float = Field(..., description="Average rating")
    rating_count: int = Field(..., description="Number of ratings")
    created_by: Optional[UUID] = Field(None, description="Creator user ID")
    created_at: datetime = Field(..., description="Template creation date")
    updated_at: datetime = Field(..., description="Template last update date")


# Document Models
class DocumentBase(BaseModel):
    """Base document model."""
    title: str = Field(..., min_length=1, max_length=300, description="Document title")
    document_type: DocumentType = Field(..., description="Document type")
    user_id: UUID = Field(..., description="User ID")
    job_id: Optional[UUID] = Field(None, description="Associated job ID")
    template_id: Optional[UUID] = Field(None, description="Template ID used")


class DocumentCreate(DocumentBase):
    """Document creation model."""
    content: Optional[str] = Field(None, description="Document content")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Document metadata")
    generation_params: Dict[str, Any] = Field(
        default_factory=dict,
        description="Parameters used for generation"
    )


class DocumentUpdate(BaseModel):
    """Document update model."""
    title: Optional[str] = Field(None, min_length=1, max_length=300)
    content: Optional[str] = None
    status: Optional[DocumentStatus] = None
    metadata: Optional[Dict[str, Any]] = None


class Document(DocumentBase, TimestampedModel):
    """Complete document model."""
    content: Optional[str] = Field(None, description="Document content")
    status: DocumentStatus = Field(default=DocumentStatus.DRAFT, description="Document status")
    file_url: Optional[HttpUrl] = Field(None, description="Generated file URL")
    file_size: Optional[int] = Field(None, ge=0, description="File size in bytes")
    word_count: Optional[int] = Field(None, ge=0, description="Word count")
    generation_time_ms: Optional[float] = Field(None, ge=0, description="Generation time in ms")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Document metadata")
    generation_params: Dict[str, Any] = Field(
        default_factory=dict,
        description="Parameters used for generation"
    )
    version: int = Field(default=1, ge=1, description="Document version")
    parent_document_id: Optional[UUID] = Field(None, description="Parent document ID for versions")
    
    model_config = BaseModel.model_config.copy()
    model_config.update({"from_attributes": True})


class DocumentResponse(DocumentBase):
    """Document response model."""
    id: UUID = Field(..., description="Document ID")
    status: DocumentStatus = Field(..., description="Document status")
    file_url: Optional[HttpUrl] = Field(None, description="Generated file URL")
    file_size: Optional[int] = Field(None, description="File size in bytes")
    word_count: Optional[int] = Field(None, description="Word count")
    generation_time_ms: Optional[float] = Field(None, description="Generation time in ms")
    metadata: Dict[str, Any] = Field(..., description="Document metadata")
    version: int = Field(..., description="Document version")
    parent_document_id: Optional[UUID] = Field(None, description="Parent document ID")
    created_at: datetime = Field(..., description="Document creation date")
    updated_at: datetime = Field(..., description="Document last update date")


# Document Generation Models
class DocumentGenerationRequest(BaseModel):
    """Document generation request model."""
    user_id: UUID = Field(..., description="User ID")
    job_id: Optional[UUID] = Field(None, description="Job ID for tailored generation")
    document_type: DocumentType = Field(..., description="Document type to generate")
    template_id: Optional[UUID] = Field(None, description="Template ID to use")
    custom_instructions: Optional[str] = Field(
        None,
        max_length=2000,
        description="Custom generation instructions"
    )
    format: DocumentFormat = Field(default=DocumentFormat.PDF, description="Output format")
    include_contact_info: bool = Field(default=True, description="Include contact information")
    include_summary: bool = Field(default=True, description="Include professional summary")
    max_pages: Optional[int] = Field(None, ge=1, le=10, description="Maximum pages")
    
    # AI generation parameters
    creativity_level: float = Field(
        default=0.7,
        ge=0.0,
        le=1.0,
        description="AI creativity level (0=conservative, 1=creative)"
    )
    tone: str = Field(
        default="professional",
        description="Document tone (professional, casual, formal, friendly)"
    )
    focus_areas: List[str] = Field(
        default_factory=list,
        description="Areas to emphasize in the document"
    )


class DocumentGenerationResponse(BaseModel):
    """Document generation response model."""
    document_id: UUID = Field(..., description="Generated document ID")
    status: DocumentStatus = Field(..., description="Generation status")
    content: Optional[str] = Field(None, description="Generated content")
    file_url: Optional[HttpUrl] = Field(None, description="Generated file URL")
    generation_time_ms: float = Field(..., description="Generation time in milliseconds")
    word_count: int = Field(..., description="Word count")
    metadata: Dict[str, Any] = Field(..., description="Generation metadata")
    suggestions: List[str] = Field(
        default_factory=list,
        description="Improvement suggestions"
    )


class GeneratedDocument(BaseModel):
    """Generated document result model."""
    content: str = Field(..., description="Generated document content")
    metadata: Dict[str, Any] = Field(..., description="Generation metadata")
    
    @validator('metadata')
    def validate_metadata(cls, v: Dict[str, Any]) -> Dict[str, Any]:
        """Ensure required metadata fields are present."""
        required_fields = ['word_count', 'generation_time_ms']
        for field in required_fields:
            if field not in v:
                raise ValueError(f'Missing required metadata field: {field}')
        return v


# Document Processing Models
class DocumentProcessingJob(BaseModel):
    """Document processing job model."""
    job_id: str = Field(..., description="Processing job ID")
    document_id: UUID = Field(..., description="Document ID")
    operation: str = Field(..., description="Processing operation")
    status: str = Field(..., description="Processing status")
    progress: float = Field(default=0.0, ge=0, le=100, description="Processing progress")
    started_at: datetime = Field(..., description="Processing start time")
    completed_at: Optional[datetime] = Field(None, description="Processing completion time")
    error_message: Optional[str] = Field(None, description="Error message if failed")
    result_url: Optional[HttpUrl] = Field(None, description="Result file URL")


class DocumentExportRequest(BaseModel):
    """Document export request model."""
    document_id: UUID = Field(..., description="Document ID")
    format: DocumentFormat = Field(..., description="Export format")
    options: Dict[str, Any] = Field(
        default_factory=dict,
        description="Format-specific export options"
    )


class DocumentExportResponse(BaseModel):
    """Document export response model."""
    export_id: str = Field(..., description="Export job ID")
    document_id: UUID = Field(..., description="Document ID")
    format: DocumentFormat = Field(..., description="Export format")
    status: str = Field(..., description="Export status")
    file_url: Optional[HttpUrl] = Field(None, description="Exported file URL")
    file_size: Optional[int] = Field(None, description="File size in bytes")
    expires_at: Optional[datetime] = Field(None, description="File expiration time")


# Document Analytics Models
class DocumentAnalytics(BaseModel):
    """Document analytics model."""
    document_id: UUID = Field(..., description="Document ID")
    views: int = Field(default=0, ge=0, description="Number of views")
    downloads: int = Field(default=0, ge=0, description="Number of downloads")
    shares: int = Field(default=0, ge=0, description="Number of shares")
    applications_sent: int = Field(default=0, ge=0, description="Applications sent with this document")
    response_rate: Optional[float] = Field(None, ge=0, le=100, description="Response rate percentage")
    last_used: Optional[datetime] = Field(None, description="Last time document was used")
    performance_score: Optional[float] = Field(
        None,
        ge=0,
        le=100,
        description="Document performance score"
    )


class DocumentInsights(BaseModel):
    """Document insights model."""
    user_id: UUID = Field(..., description="User ID")
    total_documents: int = Field(..., ge=0, description="Total documents created")
    documents_by_type: Dict[DocumentType, int] = Field(
        default_factory=dict,
        description="Documents by type"
    )
    avg_generation_time: float = Field(..., ge=0, description="Average generation time")
    most_used_templates: List[str] = Field(
        default_factory=list,
        description="Most used template names"
    )
    best_performing_documents: List[UUID] = Field(
        default_factory=list,
        description="Best performing document IDs"
    )
    recommendations: List[str] = Field(
        default_factory=list,
        description="Document improvement recommendations"
    )
    last_calculated: datetime = Field(
        default_factory=datetime.utcnow,
        description="When insights were last calculated"
    )