"""
Metrics collection middleware for FastAPI.
"""

import time
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
import structlog

from app.core.metrics import get_metrics_collector

logger = structlog.get_logger(__name__)


class MetricsMiddleware(BaseHTTPMiddleware):
    """Middleware to collect HTTP request metrics."""
    
    def __init__(self, app, exclude_paths: list = None):
        super().__init__(app)
        self.exclude_paths = exclude_paths or ["/metrics", "/health", "/docs", "/redoc", "/openapi.json"]
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request and collect metrics."""
        
        # Skip metrics collection for excluded paths
        if any(request.url.path.startswith(path) for path in self.exclude_paths):
            return await call_next(request)
        
        # Record start time
        start_time = time.time()
        
        # Get metrics collector
        metrics_collector = get_metrics_collector()
        
        # Increment concurrent requests
        if metrics_collector:
            current_concurrent = metrics_collector.concurrent_requests._value._value
            metrics_collector.concurrent_requests.set(current_concurrent + 1)
        
        try:
            # Process request
            response = await call_next(request)
            
            # Calculate duration
            duration = time.time() - start_time
            
            # Record metrics
            if metrics_collector:
                # Clean endpoint path (remove path parameters)
                endpoint = self._clean_endpoint_path(request.url.path)
                
                metrics_collector.record_http_request(
                    method=request.method,
                    endpoint=endpoint,
                    status_code=response.status_code,
                    duration=duration
                )
                
                # Update response time percentiles (simplified)
                response_time_ms = duration * 1000
                metrics_collector.response_time_p95.set(response_time_ms)
            
            return response
            
        except Exception as e:
            # Record error metrics
            duration = time.time() - start_time
            
            if metrics_collector:
                endpoint = self._clean_endpoint_path(request.url.path)
                metrics_collector.record_http_request(
                    method=request.method,
                    endpoint=endpoint,
                    status_code=500,
                    duration=duration
                )
            
            raise
        
        finally:
            # Decrement concurrent requests
            if metrics_collector:
                current_concurrent = metrics_collector.concurrent_requests._value._value
                metrics_collector.concurrent_requests.set(max(0, current_concurrent - 1))
    
    def _clean_endpoint_path(self, path: str) -> str:
        """Clean endpoint path by removing IDs and parameters."""
        # Remove common ID patterns
        import re
        
        # Replace UUIDs
        path = re.sub(r'/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', '/{id}', path)
        
        # Replace numeric IDs
        path = re.sub(r'/\d+', '/{id}', path)
        
        # Replace other common patterns
        path = re.sub(r'/[a-zA-Z0-9_-]{20,}', '/{token}', path)
        
        return path


class RequestRateTracker:
    """Track request rate for auto-scaling metrics."""
    
    def __init__(self, window_size: int = 60):
        self.window_size = window_size
        self.requests = []
    
    def record_request(self):
        """Record a new request."""
        current_time = time.time()
        self.requests.append(current_time)
        
        # Clean old requests outside the window
        cutoff_time = current_time - self.window_size
        self.requests = [req_time for req_time in self.requests if req_time > cutoff_time]
    
    def get_rate(self) -> float:
        """Get current request rate per second."""
        if not self.requests:
            return 0.0
        
        current_time = time.time()
        cutoff_time = current_time - self.window_size
        
        # Count requests in the window
        recent_requests = [req_time for req_time in self.requests if req_time > cutoff_time]
        
        if not recent_requests:
            return 0.0
        
        # Calculate rate
        time_span = current_time - min(recent_requests)
        if time_span > 0:
            return len(recent_requests) / time_span
        
        return 0.0


# Global request rate tracker
_rate_tracker = RequestRateTracker()


class RateTrackingMiddleware(BaseHTTPMiddleware):
    """Middleware to track request rate."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request and track rate."""
        
        # Record request
        _rate_tracker.record_request()
        
        # Update metrics
        metrics_collector = get_metrics_collector()
        if metrics_collector:
            current_rate = _rate_tracker.get_rate()
            metrics_collector.http_requests_per_second.set(current_rate)
        
        # Process request
        response = await call_next(request)
        return response


def get_request_rate() -> float:
    """Get current request rate."""
    return _rate_tracker.get_rate()