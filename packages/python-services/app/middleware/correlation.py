"""Enhanced correlation ID middleware for request tracing."""

import time
import uuid
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.logging import (
    set_correlation_id, 
    set_request_id, 
    set_request_start_time,
    get_logger
)

logger = get_logger(__name__)


class CorrelationIDMiddleware(BaseHTTPMiddleware):
    """Enhanced middleware to add correlation and request IDs for comprehensive tracing."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request with correlation and request IDs."""
        # Start timing
        start_time = time.time()
        set_request_start_time(start_time)
        
        # Get or generate correlation ID
        correlation_id = request.headers.get("X-Correlation-ID")
        if not correlation_id:
            correlation_id = str(uuid.uuid4())
        set_correlation_id(correlation_id)
        
        # Get or generate request ID
        request_id = request.headers.get("X-Request-ID")
        if not request_id:
            request_id = str(uuid.uuid4())
        set_request_id(request_id)
        
        # Add IDs to request state for access in endpoints
        request.state.correlation_id = correlation_id
        request.state.request_id = request_id
        request.state.start_time = start_time
        
        # Process request
        try:
            response = await call_next(request)
            
            # Add tracking headers to response
            response.headers["X-Correlation-ID"] = correlation_id
            response.headers["X-Request-ID"] = request_id
            
            # Add performance header
            duration = (time.time() - start_time) * 1000
            response.headers["X-Response-Time"] = f"{duration:.2f}ms"
            
            return response
            
        except Exception as e:
            # Log error with context
            duration = (time.time() - start_time) * 1000
            logger.error(
                "Request processing failed",
                error=str(e),
                error_type=type(e).__name__,
                duration_ms=duration,
                path=request.url.path,
                method=request.method,
                exc_info=True
            )
            raise