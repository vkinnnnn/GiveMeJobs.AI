"""
Base Pydantic models and utilities.

This module contains base models and common utilities used throughout
the application for consistent data validation and serialization.
"""

from datetime import datetime
from typing import Any, Dict, Generic, List, Optional, TypeVar, Union
from uuid import UUID, uuid4

from pydantic import BaseModel as PydanticBaseModel
from pydantic import ConfigDict, Field, field_validator


class BaseModel(PydanticBaseModel):
    """Base model with common configuration."""
    
    model_config = ConfigDict(
        # Enable validation on assignment
        validate_assignment=True,
        # Use enum values instead of names
        use_enum_values=True,
        # Validate default values
        validate_default=True,
        # Allow population by field name or alias
        populate_by_name=True,
        # Serialize by alias
        by_alias=True,
        # Extra fields are forbidden
        extra="forbid",
        # Enable JSON schema generation
        json_schema_serialization_defaults_required=True,
    )


class TimestampedModel(BaseModel):
    """Base model with timestamp fields."""
    
    id: UUID = Field(default_factory=uuid4, description="Unique identifier")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Last update timestamp")
    
    def update_timestamp(self) -> None:
        """Update the updated_at timestamp."""
        self.updated_at = datetime.utcnow()


class ApiError(BaseModel):
    """Standard API error response."""
    
    code: str = Field(..., description="Error code")
    message: str = Field(..., description="Human-readable error message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")
    correlation_id: Optional[str] = Field(None, description="Request correlation ID")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Error timestamp")


class ResponseMetadata(BaseModel):
    """Response metadata for API responses."""
    
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Response timestamp")
    version: str = Field(default="1.0.0", description="API version")
    request_id: Optional[str] = Field(None, description="Request ID")
    processing_time_ms: Optional[float] = Field(None, description="Processing time in milliseconds")


T = TypeVar('T')


class ApiResponse(BaseModel, Generic[T]):
    """Generic API response wrapper."""
    
    success: bool = Field(..., description="Whether the request was successful")
    data: Optional[T] = Field(None, description="Response data")
    error: Optional[ApiError] = Field(None, description="Error information if request failed")
    metadata: ResponseMetadata = Field(default_factory=ResponseMetadata, description="Response metadata")
    
    @field_validator('error')
    @classmethod
    def error_only_when_not_success(cls, v: Optional[ApiError], info) -> Optional[ApiError]:
        """Ensure error is only present when success is False."""
        if hasattr(info, 'data') and info.data:
            success = info.data.get('success', True)
            if not success and v is None:
                raise ValueError('Error must be provided when success is False')
            if success and v is not None:
                raise ValueError('Error must not be provided when success is True')
        return v
    
    @classmethod
    def success_response(cls, data: T, metadata: Optional[ResponseMetadata] = None) -> 'ApiResponse[T]':
        """Create a successful response."""
        return cls(
            success=True,
            data=data,
            metadata=metadata or ResponseMetadata()
        )
    
    @classmethod
    def error_response(
        cls, 
        error: ApiError, 
        metadata: Optional[ResponseMetadata] = None
    ) -> 'ApiResponse[None]':
        """Create an error response."""
        return cls(
            success=False,
            error=error,
            metadata=metadata or ResponseMetadata()
        )


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated response wrapper."""
    
    items: List[T] = Field(..., description="List of items")
    total: int = Field(..., ge=0, description="Total number of items")
    page: int = Field(..., ge=1, description="Current page number")
    size: int = Field(..., ge=1, le=100, description="Page size")
    pages: int = Field(..., ge=0, description="Total number of pages")
    has_next: bool = Field(..., description="Whether there is a next page")
    has_prev: bool = Field(..., description="Whether there is a previous page")
    
    @field_validator('pages')
    @classmethod
    def calculate_pages(cls, v: int, info) -> int:
        """Calculate total pages based on total and size."""
        if hasattr(info, 'data') and info.data:
            total = info.data.get('total', 0)
            size = info.data.get('size', 1)
            return (total + size - 1) // size if total > 0 else 0
        return v
    
    @field_validator('has_next')
    @classmethod
    def calculate_has_next(cls, v: bool, info) -> bool:
        """Calculate if there is a next page."""
        if hasattr(info, 'data') and info.data:
            page = info.data.get('page', 1)
            pages = info.data.get('pages', 0)
            return page < pages
        return v
    
    @field_validator('has_prev')
    @classmethod
    def calculate_has_prev(cls, v: bool, info) -> bool:
        """Calculate if there is a previous page."""
        if hasattr(info, 'data') and info.data:
            page = info.data.get('page', 1)
            return page > 1
        return v


E = TypeVar('E', bound=Exception)


class Result(BaseModel, Generic[T, E]):
    """Result type for explicit error handling."""
    
    success: bool = Field(..., description="Whether the operation was successful")
    data: Optional[T] = Field(None, description="Result data if successful")
    error: Optional[str] = Field(None, description="Error message if failed")
    error_type: Optional[str] = Field(None, description="Error type if failed")
    
    @field_validator('data')
    @classmethod
    def data_only_when_success(cls, v: Optional[T], info) -> Optional[T]:
        """Ensure data is only present when success is True."""
        if hasattr(info, 'data') and info.data:
            success = info.data.get('success', False)
            if success and v is None:
                raise ValueError('Data must be provided when success is True')
            if not success and v is not None:
                raise ValueError('Data must not be provided when success is False')
        return v
    
    @field_validator('error')
    @classmethod
    def error_only_when_not_success(cls, v: Optional[str], info) -> Optional[str]:
        """Ensure error is only present when success is False."""
        if hasattr(info, 'data') and info.data:
            success = info.data.get('success', True)
            if not success and v is None:
                raise ValueError('Error must be provided when success is False')
            if success and v is not None:
                raise ValueError('Error must not be provided when success is True')
        return v
    
    @classmethod
    def success(cls, data: T) -> 'Result[T, E]':
        """Create a successful result."""
        return cls(success=True, data=data)
    
    @classmethod
    def error(cls, error: Union[str, Exception]) -> 'Result[T, E]':
        """Create an error result."""
        if isinstance(error, Exception):
            return cls(
                success=False,
                error=str(error),
                error_type=type(error).__name__
            )
        return cls(success=False, error=error)
    
    def map(self, func: callable) -> 'Result[Any, E]':
        """Map the data if successful."""
        if self.success and self.data is not None:
            try:
                return Result.success(func(self.data))
            except Exception as e:
                return Result.error(e)
        return Result.error(self.error or "No data to map")
    
    def map_error(self, func: callable) -> 'Result[T, Any]':
        """Map the error if failed."""
        if not self.success and self.error is not None:
            try:
                return Result.error(func(self.error))
            except Exception as e:
                return Result.error(e)
        return Result.success(self.data)


class HealthCheck(BaseModel):
    """Health check response model."""
    
    status: str = Field(..., description="Service status")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Health check timestamp")
    version: str = Field(default="1.0.0", description="Service version")
    dependencies: Dict[str, str] = Field(default_factory=dict, description="Dependency statuses")
    uptime_seconds: Optional[float] = Field(None, description="Service uptime in seconds")
    
    @classmethod
    def healthy(
        cls, 
        dependencies: Optional[Dict[str, str]] = None,
        uptime_seconds: Optional[float] = None
    ) -> 'HealthCheck':
        """Create a healthy status response."""
        return cls(
            status="healthy",
            dependencies=dependencies or {},
            uptime_seconds=uptime_seconds
        )
    
    @classmethod
    def unhealthy(
        cls, 
        dependencies: Optional[Dict[str, str]] = None,
        uptime_seconds: Optional[float] = None
    ) -> 'HealthCheck':
        """Create an unhealthy status response."""
        return cls(
            status="unhealthy",
            dependencies=dependencies or {},
            uptime_seconds=uptime_seconds
        )