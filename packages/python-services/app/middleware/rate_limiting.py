"""Rate limiting middleware using Redis."""

import time
from typing import Callable

from fastapi import Request, Response, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
import redis.asyncio as redis

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Middleware for rate limiting requests."""
    
    def __init__(self, app, redis_client=None):
        super().__init__(app)
        self.redis_client = redis_client or redis.from_url(
            settings.redis.url,
            decode_responses=True
        )
        self.requests_per_window = settings.security.rate_limit_requests
        self.window_seconds = settings.security.rate_limit_window
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request with rate limiting."""
        # Skip rate limiting for health checks
        if request.url.path in ["/health", "/", f"{settings.api_prefix}/docs"]:
            return await call_next(request)
        
        # Get client identifier (IP address)
        client_ip = request.client.host if request.client else "unknown"
        
        # Create rate limit key
        current_window = int(time.time()) // self.window_seconds
        rate_limit_key = f"rate_limit:{client_ip}:{current_window}"
        
        try:
            # Check current request count
            current_requests = await self.redis_client.get(rate_limit_key)
            current_requests = int(current_requests) if current_requests else 0
            
            # Check if rate limit exceeded
            if current_requests >= self.requests_per_window:
                logger.warning(
                    "Rate limit exceeded",
                    extra={
                        "client_ip": client_ip,
                        "current_requests": current_requests,
                        "limit": self.requests_per_window
                    }
                )
                raise HTTPException(
                    status_code=429,
                    detail="Rate limit exceeded. Please try again later."
                )
            
            # Increment request count
            pipe = self.redis_client.pipeline()
            pipe.incr(rate_limit_key)
            pipe.expire(rate_limit_key, self.window_seconds)
            await pipe.execute()
            
            # Process request
            response = await call_next(request)
            
            # Add rate limit headers
            response.headers["X-RateLimit-Limit"] = str(self.requests_per_window)
            response.headers["X-RateLimit-Remaining"] = str(
                max(0, self.requests_per_window - current_requests - 1)
            )
            response.headers["X-RateLimit-Reset"] = str(
                (current_window + 1) * self.window_seconds
            )
            
            return response
            
        except redis.RedisError as e:
            logger.error(f"Redis error in rate limiting: {str(e)}")
            # Continue without rate limiting if Redis is unavailable
            return await call_next(request)
        except HTTPException:
            # Re-raise HTTP exceptions (like rate limit exceeded)
            raise
        except Exception as e:
            logger.error(f"Unexpected error in rate limiting: {str(e)}")
            # Continue without rate limiting on unexpected errors
            return await call_next(request)