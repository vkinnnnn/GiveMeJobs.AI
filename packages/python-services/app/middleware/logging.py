"""Enhanced logging middleware for comprehensive request/response logging."""

import time
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.logging import (
    get_logger, 
    get_correlation_id, 
    get_request_id,
    get_user_id
)

logger = get_logger(__name__)


class LoggingMiddleware(BaseHTTPMiddleware):
    """Enhanced middleware for comprehensive request/response logging."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request with enhanced logging."""
        start_time = time.time()
        
        # Extract request information
        method = request.method
        url = str(request.url)
        path = request.url.path
        query_params = str(request.query_params) if request.query_params else None
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")
        content_type = request.headers.get("content-type")
        content_length = request.headers.get("content-length")
        
        # Get tracking IDs from context
        correlation_id = get_correlation_id()
        request_id = get_request_id()
        user_id = get_user_id()
        
        # Log request start
        logger.info(
            "Request started",
            method=method,
            path=path,
            query_params=query_params,
            client_ip=client_ip,
            user_agent=user_agent,
            content_type=content_type,
            content_length=content_length,
            user_id=user_id
        )
        
        # Process request
        try:
            response = await call_next(request)
            
            # Calculate processing time
            process_time = time.time() - start_time
            
            # Log successful response
            logger.info(
                "Request completed successfully",
                method=method,
                path=path,
                status_code=response.status_code,
                process_time_ms=round(process_time * 1000, 2),
                response_size=len(response.body) if hasattr(response, 'body') else None
            )
            
            # Add performance headers
            response.headers["X-Process-Time"] = f"{process_time:.4f}"
            response.headers["X-Process-Time-Ms"] = f"{process_time * 1000:.2f}"
            
            return response
            
        except Exception as e:
            # Calculate processing time for failed requests
            process_time = time.time() - start_time
            
            # Log error
            logger.error(
                "Request failed",
                method=method,
                path=path,
                error=str(e),
                error_type=type(e).__name__,
                process_time_ms=round(process_time * 1000, 2),
                exc_info=True
            )
            
            # Re-raise the exception
            raise