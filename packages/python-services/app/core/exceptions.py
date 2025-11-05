"""Comprehensive error handling with custom exception hierarchy."""

from typing import Any, Dict, List, Optional, Union
from fastapi import HTTPException, status


class BaseAPIException(Exception):
    """Base exception for all API errors."""
    
    def __init__(
        self,
        message: str,
        error_code: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


# Client Error Exceptions (4xx)
class ValidationException(BaseAPIException):
    """Exception for validation errors."""
    
    def __init__(
        self,
        message: str = "Validation failed",
        field_errors: Optional[Dict[str, List[str]]] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code="VALIDATION_ERROR",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details={
                "field_errors": field_errors or {},
                **(details or {})
            }
        )


class AuthenticationException(BaseAPIException):
    """Exception for authentication errors."""
    
    def __init__(
        self,
        message: str = "Authentication required",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code="AUTHENTICATION_ERROR",
            status_code=status.HTTP_401_UNAUTHORIZED,
            details=details
        )


class AuthorizationException(BaseAPIException):
    """Exception for authorization errors."""
    
    def __init__(
        self,
        message: str = "Access denied",
        required_permission: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code="AUTHORIZATION_ERROR",
            status_code=status.HTTP_403_FORBIDDEN,
            details={
                "required_permission": required_permission,
                **(details or {})
            }
        )


class NotFoundException(BaseAPIException):
    """Exception for resource not found errors."""
    
    def __init__(
        self,
        resource: str,
        identifier: Optional[str] = None,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        if not message:
            message = f"{resource} not found"
            if identifier:
                message += f" with identifier: {identifier}"
        
        super().__init__(
            message=message,
            error_code="NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
            details={
                "resource": resource,
                "identifier": identifier,
                **(details or {})
            }
        )


class ConflictException(BaseAPIException):
    """Exception for resource conflict errors."""
    
    def __init__(
        self,
        message: str,
        conflicting_field: Optional[str] = None,
        conflicting_value: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code="CONFLICT",
            status_code=status.HTTP_409_CONFLICT,
            details={
                "conflicting_field": conflicting_field,
                "conflicting_value": conflicting_value,
                **(details or {})
            }
        )


class RateLimitException(BaseAPIException):
    """Exception for rate limit exceeded errors."""
    
    def __init__(
        self,
        message: str = "Rate limit exceeded",
        retry_after: Optional[int] = None,
        limit: Optional[int] = None,
        window: Optional[int] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code="RATE_LIMIT_EXCEEDED",
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            details={
                "retry_after": retry_after,
                "limit": limit,
                "window": window,
                **(details or {})
            }
        )


class BadRequestException(BaseAPIException):
    """Exception for bad request errors."""
    
    def __init__(
        self,
        message: str,
        invalid_field: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code="BAD_REQUEST",
            status_code=status.HTTP_400_BAD_REQUEST,
            details={
                "invalid_field": invalid_field,
                **(details or {})
            }
        )


# Server Error Exceptions (5xx)
class InternalServerException(BaseAPIException):
    """Exception for internal server errors."""
    
    def __init__(
        self,
        message: str = "Internal server error",
        error_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code="INTERNAL_SERVER_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            details={
                "error_id": error_id,
                **(details or {})
            }
        )


class ServiceUnavailableException(BaseAPIException):
    """Exception for service unavailable errors."""
    
    def __init__(
        self,
        service_name: str,
        message: Optional[str] = None,
        retry_after: Optional[int] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        if not message:
            message = f"{service_name} service is currently unavailable"
        
        super().__init__(
            message=message,
            error_code="SERVICE_UNAVAILABLE",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            details={
                "service_name": service_name,
                "retry_after": retry_after,
                **(details or {})
            }
        )


class DatabaseException(BaseAPIException):
    """Exception for database-related errors."""
    
    def __init__(
        self,
        message: str = "Database operation failed",
        operation: Optional[str] = None,
        table: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code="DATABASE_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            details={
                "operation": operation,
                "table": table,
                **(details or {})
            }
        )


class ExternalServiceException(BaseAPIException):
    """Exception for external service errors."""
    
    def __init__(
        self,
        service_name: str,
        message: Optional[str] = None,
        status_code: int = status.HTTP_502_BAD_GATEWAY,
        upstream_status: Optional[int] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        if not message:
            message = f"External service {service_name} error"
        
        super().__init__(
            message=message,
            error_code="EXTERNAL_SERVICE_ERROR",
            status_code=status_code,
            details={
                "service_name": service_name,
                "upstream_status": upstream_status,
                **(details or {})
            }
        )


# Business Logic Exceptions
class BusinessLogicException(BaseAPIException):
    """Exception for business logic violations."""
    
    def __init__(
        self,
        message: str,
        rule: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code="BUSINESS_LOGIC_ERROR",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details={
                "violated_rule": rule,
                **(details or {})
            }
        )


class InsufficientDataException(BaseAPIException):
    """Exception for insufficient data errors."""
    
    def __init__(
        self,
        message: str,
        required_fields: Optional[List[str]] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code="INSUFFICIENT_DATA",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details={
                "required_fields": required_fields or [],
                **(details or {})
            }
        )


# AI/ML Specific Exceptions
class ProcessingException(BaseAPIException):
    """Exception for AI/ML processing errors."""
    
    def __init__(
        self,
        message: str,
        processing_type: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code="PROCESSING_ERROR",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details={
                "processing_type": processing_type,
                **(details or {})
            }
        )


class ModelException(BaseAPIException):
    """Exception for ML model errors."""
    
    def __init__(
        self,
        message: str,
        model_name: Optional[str] = None,
        model_version: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code="MODEL_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            details={
                "model_name": model_name,
                "model_version": model_version,
                **(details or {})
            }
        )


class EmbeddingException(BaseAPIException):
    """Exception for vector embedding errors."""
    
    def __init__(
        self,
        message: str,
        embedding_type: Optional[str] = None,
        dimension_mismatch: Optional[bool] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code="EMBEDDING_ERROR",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details={
                "embedding_type": embedding_type,
                "dimension_mismatch": dimension_mismatch,
                **(details or {})
            }
        )


class VectorSearchException(BaseAPIException):
    """Exception for vector search errors."""
    
    def __init__(
        self,
        message: str,
        index_name: Optional[str] = None,
        query_dimension: Optional[int] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code="VECTOR_SEARCH_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            details={
                "index_name": index_name,
                "query_dimension": query_dimension,
                **(details or {})
            }
        )


# Utility functions for common exceptions
def not_found(resource: str, identifier: Optional[str] = None) -> NotFoundException:
    """Create a not found exception."""
    return NotFoundException(resource=resource, identifier=identifier)


def validation_error(
    message: str = "Validation failed",
    field_errors: Optional[Dict[str, List[str]]] = None
) -> ValidationException:
    """Create a validation exception."""
    return ValidationException(message=message, field_errors=field_errors)


def unauthorized(message: str = "Authentication required") -> AuthenticationException:
    """Create an authentication exception."""
    return AuthenticationException(message=message)


def forbidden(
    message: str = "Access denied",
    required_permission: Optional[str] = None
) -> AuthorizationException:
    """Create an authorization exception."""
    return AuthorizationException(message=message, required_permission=required_permission)


def conflict(
    message: str,
    conflicting_field: Optional[str] = None,
    conflicting_value: Optional[str] = None
) -> ConflictException:
    """Create a conflict exception."""
    return ConflictException(
        message=message,
        conflicting_field=conflicting_field,
        conflicting_value=conflicting_value
    )


def bad_request(
    message: str,
    invalid_field: Optional[str] = None
) -> BadRequestException:
    """Create a bad request exception."""
    return BadRequestException(message=message, invalid_field=invalid_field)


def internal_error(
    message: str = "Internal server error",
    error_id: Optional[str] = None
) -> InternalServerException:
    """Create an internal server exception."""
    return InternalServerException(message=message, error_id=error_id)


def service_unavailable(
    service_name: str,
    retry_after: Optional[int] = None
) -> ServiceUnavailableException:
    """Create a service unavailable exception."""
    return ServiceUnavailableException(service_name=service_name, retry_after=retry_after)


def business_error(message: str, rule: Optional[str] = None) -> BusinessLogicException:
    """Create a business logic exception."""
    return BusinessLogicException(message=message, rule=rule)