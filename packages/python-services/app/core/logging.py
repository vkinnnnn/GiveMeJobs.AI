"""Enhanced structured logging configuration with correlation ID support."""

import logging
import sys
import uuid
import time
from contextvars import ContextVar
from typing import Any, Dict, Optional

import structlog
from structlog.types import EventDict, Processor

from .config import get_settings

# Context variables for request tracking
correlation_id_var: ContextVar[Optional[str]] = ContextVar(
    "correlation_id", default=None
)
request_id_var: ContextVar[Optional[str]] = ContextVar(
    "request_id", default=None
)
user_id_var: ContextVar[Optional[str]] = ContextVar(
    "user_id", default=None
)
request_start_time_var: ContextVar[Optional[float]] = ContextVar(
    "request_start_time", default=None
)


def get_correlation_id() -> str:
    """Get or generate correlation ID."""
    correlation_id = correlation_id_var.get()
    if not correlation_id:
        correlation_id = str(uuid.uuid4())
        correlation_id_var.set(correlation_id)
    return correlation_id


def set_correlation_id(correlation_id: str) -> None:
    """Set correlation ID for current context."""
    correlation_id_var.set(correlation_id)


def get_request_id() -> Optional[str]:
    """Get request ID from context."""
    return request_id_var.get()


def set_request_id(request_id: str) -> None:
    """Set request ID for current context."""
    request_id_var.set(request_id)


def get_user_id() -> Optional[str]:
    """Get user ID from context."""
    return user_id_var.get()


def set_user_id(user_id: str) -> None:
    """Set user ID for current context."""
    user_id_var.set(user_id)


def set_request_start_time(start_time: float) -> None:
    """Set request start time for performance tracking."""
    request_start_time_var.set(start_time)


def get_request_duration() -> Optional[float]:
    """Get request duration in milliseconds."""
    start_time = request_start_time_var.get()
    if start_time:
        return (time.time() - start_time) * 1000
    return None


def add_request_context(logger: Any, method_name: str, event_dict: EventDict) -> EventDict:
    """Add request context to log events."""
    # Add correlation ID
    correlation_id = correlation_id_var.get()
    if correlation_id:
        event_dict["correlation_id"] = correlation_id
    
    # Add request ID
    request_id = request_id_var.get()
    if request_id:
        event_dict["request_id"] = request_id
    
    # Add user ID
    user_id = user_id_var.get()
    if user_id:
        event_dict["user_id"] = user_id
    
    # Add request duration if available
    duration = get_request_duration()
    if duration is not None:
        event_dict["request_duration_ms"] = round(duration, 2)
    
    return event_dict


def add_service_info(logger: Any, method_name: str, event_dict: EventDict) -> EventDict:
    """Add service information to log events."""
    settings = get_settings()
    event_dict["service"] = settings.service_name
    event_dict["environment"] = settings.environment
    return event_dict


def configure_logging() -> None:
    """Configure structured logging."""
    settings = get_settings()
    
    # Configure standard library logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, settings.monitoring.log_level.upper()),
    )
    
    # Configure structlog processors
    processors: list[Processor] = [
        structlog.contextvars.merge_contextvars,
        add_request_context,
        add_service_info,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
    ]
    
    if settings.monitoring.log_format == "json":
        processors.extend([
            structlog.processors.dict_tracebacks,
            structlog.processors.JSONRenderer(),
        ])
    else:
        processors.extend([
            structlog.processors.StackInfoRenderer(),
            structlog.dev.set_exc_info,
            structlog.dev.ConsoleRenderer(colors=True),
        ])
    
    # Configure structlog
    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, settings.monitoring.log_level.upper())
        ),
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str = __name__) -> structlog.BoundLogger:
    """Get a structured logger instance."""
    return structlog.get_logger(name)


class LoggingMiddleware:
    """Enhanced FastAPI middleware for request logging with performance tracking."""
    
    def __init__(self, app):
        self.app = app
        self.logger = get_logger("middleware.logging")
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        # Start timing
        start_time = time.time()
        set_request_start_time(start_time)
        
        # Extract or generate IDs
        headers = dict(scope.get("headers", []))
        
        # Correlation ID
        correlation_id = headers.get(b"x-correlation-id")
        if correlation_id:
            correlation_id = correlation_id.decode()
        else:
            correlation_id = str(uuid.uuid4())
        set_correlation_id(correlation_id)
        
        # Request ID
        request_id = headers.get(b"x-request-id")
        if request_id:
            request_id = request_id.decode()
        else:
            request_id = str(uuid.uuid4())
        set_request_id(request_id)
        
        # User ID from authorization header (if present)
        auth_header = headers.get(b"authorization")
        if auth_header:
            # TODO: Extract user ID from JWT token
            pass
        
        # Log request start
        self.logger.info(
            "Request started",
            method=scope["method"],
            path=scope["path"],
            query_string=scope.get("query_string", b"").decode(),
            user_agent=headers.get(b"user-agent", b"").decode(),
            remote_addr=scope.get("client", ["unknown"])[0],
        )
        
        status_code = 500
        response_size = 0
        
        # Add tracking headers to response
        async def send_wrapper(message):
            nonlocal status_code, response_size
            
            if message["type"] == "http.response.start":
                status_code = message["status"]
                headers_list = list(message.get("headers", []))
                headers_list.extend([
                    [b"x-correlation-id", correlation_id.encode()],
                    [b"x-request-id", request_id.encode()],
                ])
                message["headers"] = headers_list
            elif message["type"] == "http.response.body":
                body = message.get("body", b"")
                response_size += len(body)
            
            await send(message)
        
        try:
            await self.app(scope, receive, send_wrapper)
            
            # Log successful completion
            duration = get_request_duration()
            self.logger.info(
                "Request completed",
                status_code=status_code,
                response_size_bytes=response_size,
                duration_ms=duration,
            )
            
        except Exception as e:
            # Log error
            duration = get_request_duration()
            self.logger.error(
                "Request failed",
                error=str(e),
                error_type=type(e).__name__,
                status_code=status_code,
                duration_ms=duration,
                exc_info=True
            )
            raise