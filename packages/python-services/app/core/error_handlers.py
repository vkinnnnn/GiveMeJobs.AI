"""Global exception handlers for FastAPI application."""

import traceback
import uuid
from typing import Union

from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError, HTTPException
from pydantic import ValidationError
from sqlalchemy.exc import SQLAlchemyError
from redis.exceptions import RedisError

from .exceptions import BaseAPIException
from .logging import get_logger, get_correlation_id

logger = get_logger(__name__)


async def base_api_exception_handler(request: Request, exc: BaseAPIException) -> JSONResponse:
    """Handle custom API exceptions."""
    correlation_id = get_correlation_id()
    
    # Log the error
    logger.error(
        f"API Exception: {exc.error_code}",
        error_code=exc.error_code,
        message=exc.message,
        status_code=exc.status_code,
        details=exc.details,
        path=request.url.path,
        method=request.method
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": exc.error_code,
                "message": exc.message,
                "details": exc.details,
                "correlation_id": correlation_id,
                "timestamp": "2024-01-01T00:00:00Z"  # TODO: Use actual timestamp
            }
        }
    )


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Handle FastAPI HTTP exceptions."""
    correlation_id = get_correlation_id()
    
    # Map HTTP status codes to error codes
    error_code_map = {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        405: "METHOD_NOT_ALLOWED",
        409: "CONFLICT",
        422: "VALIDATION_ERROR",
        429: "RATE_LIMIT_EXCEEDED",
        500: "INTERNAL_SERVER_ERROR",
        502: "BAD_GATEWAY",
        503: "SERVICE_UNAVAILABLE",
        504: "GATEWAY_TIMEOUT"
    }
    
    error_code = error_code_map.get(exc.status_code, "HTTP_ERROR")
    
    # Log the error
    logger.warning(
        f"HTTP Exception: {error_code}",
        error_code=error_code,
        message=exc.detail,
        status_code=exc.status_code,
        path=request.url.path,
        method=request.method
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": error_code,
                "message": exc.detail,
                "details": {},
                "correlation_id": correlation_id,
                "timestamp": "2024-01-01T00:00:00Z"  # TODO: Use actual timestamp
            }
        }
    )


async def validation_exception_handler(
    request: Request, 
    exc: Union[RequestValidationError, ValidationError]
) -> JSONResponse:
    """Handle Pydantic validation errors."""
    correlation_id = get_correlation_id()
    
    # Extract field errors from Pydantic validation error
    field_errors = {}
    for error in exc.errors():
        field_path = ".".join(str(loc) for loc in error["loc"])
        error_message = error["msg"]
        
        if field_path not in field_errors:
            field_errors[field_path] = []
        field_errors[field_path].append(error_message)
    
    # Log the validation error
    logger.warning(
        "Validation Error",
        error_code="VALIDATION_ERROR",
        field_errors=field_errors,
        path=request.url.path,
        method=request.method
    )
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request validation failed",
                "details": {
                    "field_errors": field_errors
                },
                "correlation_id": correlation_id,
                "timestamp": "2024-01-01T00:00:00Z"  # TODO: Use actual timestamp
            }
        }
    )


async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
    """Handle SQLAlchemy database errors."""
    correlation_id = get_correlation_id()
    error_id = str(uuid.uuid4())
    
    # Log the database error with full details
    logger.error(
        "Database Error",
        error_code="DATABASE_ERROR",
        error_id=error_id,
        error_type=type(exc).__name__,
        error_message=str(exc),
        path=request.url.path,
        method=request.method,
        exc_info=True
    )
    
    # Don't expose internal database errors to clients
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": "DATABASE_ERROR",
                "message": "A database error occurred",
                "details": {
                    "error_id": error_id
                },
                "correlation_id": correlation_id,
                "timestamp": "2024-01-01T00:00:00Z"  # TODO: Use actual timestamp
            }
        }
    )


async def redis_exception_handler(request: Request, exc: RedisError) -> JSONResponse:
    """Handle Redis cache errors."""
    correlation_id = get_correlation_id()
    error_id = str(uuid.uuid4())
    
    # Log the Redis error
    logger.error(
        "Redis Error",
        error_code="CACHE_ERROR",
        error_id=error_id,
        error_type=type(exc).__name__,
        error_message=str(exc),
        path=request.url.path,
        method=request.method,
        exc_info=True
    )
    
    # Cache errors shouldn't break the application
    # This handler is mainly for logging purposes
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": "CACHE_ERROR",
                "message": "A cache error occurred",
                "details": {
                    "error_id": error_id
                },
                "correlation_id": correlation_id,
                "timestamp": "2024-01-01T00:00:00Z"  # TODO: Use actual timestamp
            }
        }
    )


async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected exceptions."""
    correlation_id = get_correlation_id()
    error_id = str(uuid.uuid4())
    
    # Log the unexpected error with full traceback
    logger.error(
        "Unexpected Error",
        error_code="INTERNAL_SERVER_ERROR",
        error_id=error_id,
        error_type=type(exc).__name__,
        error_message=str(exc),
        path=request.url.path,
        method=request.method,
        traceback=traceback.format_exc(),
        exc_info=True
    )
    
    # Don't expose internal errors to clients
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred",
                "details": {
                    "error_id": error_id
                },
                "correlation_id": correlation_id,
                "timestamp": "2024-01-01T00:00:00Z"  # TODO: Use actual timestamp
            }
        }
    )


# Error handler registration function
def register_error_handlers(app):
    """Register all error handlers with the FastAPI app."""
    
    # Custom API exceptions
    app.add_exception_handler(BaseAPIException, base_api_exception_handler)
    
    # FastAPI HTTP exceptions
    app.add_exception_handler(HTTPException, http_exception_handler)
    
    # Pydantic validation errors
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(ValidationError, validation_exception_handler)
    
    # Database errors
    app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)
    
    # Cache errors
    app.add_exception_handler(RedisError, redis_exception_handler)
    
    # Catch-all for unexpected errors
    app.add_exception_handler(Exception, general_exception_handler)