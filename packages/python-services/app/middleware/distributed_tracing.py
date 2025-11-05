"""
Distributed Tracing Middleware for Python Services

Implements distributed tracing compatible with Node.js gateway
using OpenTelemetry standards for request correlation and performance monitoring.
"""

import time
import uuid
from typing import Optional, Dict, Any
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.logging import get_logger

logger = get_logger(__name__)

class TraceContext:
    """Trace context for distributed tracing"""
    
    def __init__(
        self,
        trace_id: str,
        span_id: str,
        parent_span_id: Optional[str] = None,
        correlation_id: str = "",
        start_time: float = 0,
        service: str = "",
        operation: str = "",
        tags: Optional[Dict[str, str]] = None
    ):
        self.trace_id = trace_id
        self.span_id = span_id
        self.parent_span_id = parent_span_id
        self.correlation_id = correlation_id
        self.start_time = start_time or time.time()
        self.service = service
        self.operation = operation
        self.tags = tags or {}

class DistributedTracingMiddleware(BaseHTTPMiddleware):
    """Middleware for distributed tracing across services"""
    
    def __init__(self, app, service_name: str = "python-service"):
        super().__init__(app)
        self.service_name = service_name
    
    async def dispatch(self, request: Request, call_next):
        # Extract trace context from headers
        trace_context = self._extract_trace_context(request)
        
        # Create new span if no context exists
        if not trace_context:
            trace_context = self._create_root_span(request)
        else:
            # Create child span
            trace_context = self._create_child_span(trace_context, request)
        
        # Add trace context to request state
        request.state.trace_context = trace_context
        
        # Log trace start
        logger.info("Trace span started", extra={
            "trace_id": trace_context.trace_id,
            "span_id": trace_context.span_id,
            "parent_span_id": trace_context.parent_span_id,
            "correlation_id": trace_context.correlation_id,
            "service": trace_context.service,
            "operation": trace_context.operation,
            "method": request.method,
            "path": request.url.path
        })
        
        # Record span start metric
        await self._record_span_metric("span_started", trace_context, 1)
        
        start_time = time.time()
        
        try:
            # Process request
            response = await call_next(request)
            
            # Calculate duration
            duration = (time.time() - start_time) * 1000  # Convert to milliseconds
            
            # Update trace context with response info
            trace_context.tags.update({
                "http.status_code": str(response.status_code),
                "response.duration_ms": str(duration),
                "trace.success": str(response.status_code < 400)
            })
            
            # Add trace headers to response
            response.headers["x-trace-id"] = trace_context.trace_id
            response.headers["x-span-id"] = trace_context.span_id
            response.headers["x-correlation-id"] = trace_context.correlation_id
            
            # Log trace completion
            success = response.status_code < 400
            logger.info("Trace span completed", extra={
                "trace_id": trace_context.trace_id,
                "span_id": trace_context.span_id,
                "correlation_id": trace_context.correlation_id,
                "service": trace_context.service,
                "operation": trace_context.operation,
                "duration_ms": duration,
                "status_code": response.status_code,
                "success": success
            })
            
            # Record completion metrics
            await self._record_span_metric("span_completed", trace_context, 1, {
                "status_code": str(response.status_code),
                "success": str(success)
            })
            
            await self._record_span_metric("span_duration_ms", trace_context, duration)
            
            return response
            
        except Exception as e:
            # Calculate duration for error case
            duration = (time.time() - start_time) * 1000
            
            # Update trace context with error info
            trace_context.tags.update({
                "error.message": str(e),
                "error.type": type(e).__name__,
                "trace.success": "false",
                "response.duration_ms": str(duration)
            })
            
            # Log trace error
            logger.error("Trace span failed", extra={
                "trace_id": trace_context.trace_id,
                "span_id": trace_context.span_id,
                "correlation_id": trace_context.correlation_id,
                "service": trace_context.service,
                "operation": trace_context.operation,
                "duration_ms": duration,
                "error": str(e),
                "error_type": type(e).__name__
            })
            
            # Record error metrics
            await self._record_span_metric("span_completed", trace_context, 1, {
                "success": "false",
                "error_type": type(e).__name__
            })
            
            await self._record_span_metric("span_duration_ms", trace_context, duration)
            
            # Re-raise the exception
            raise
    
    def _extract_trace_context(self, request: Request) -> Optional[TraceContext]:
        """Extract trace context from request headers"""
        
        # Try OpenTelemetry traceparent header first
        traceparent = request.headers.get("traceparent")
        if traceparent:
            try:
                # Parse traceparent: version-trace_id-parent_id-trace_flags
                parts = traceparent.split("-")
                if len(parts) >= 4:
                    trace_id = parts[1]
                    parent_span_id = parts[2]
                    correlation_id = request.headers.get("x-correlation-id", str(uuid.uuid4()))
                    
                    return TraceContext(
                        trace_id=trace_id,
                        span_id=str(uuid.uuid4()),
                        parent_span_id=parent_span_id,
                        correlation_id=correlation_id,
                        service=self.service_name,
                        operation=f"{request.method} {request.url.path}"
                    )
            except Exception as e:
                logger.warning("Failed to parse traceparent header", extra={
                    "traceparent": traceparent,
                    "error": str(e)
                })
        
        # Try custom headers
        trace_id = request.headers.get("x-trace-id")
        parent_span_id = request.headers.get("x-parent-span-id")
        correlation_id = request.headers.get("x-correlation-id")
        
        if trace_id and correlation_id:
            return TraceContext(
                trace_id=trace_id,
                span_id=str(uuid.uuid4()),
                parent_span_id=parent_span_id,
                correlation_id=correlation_id,
                service=self.service_name,
                operation=f"{request.method} {request.url.path}",
                tags={
                    "http.method": request.method,
                    "http.url": str(request.url),
                    "http.user_agent": request.headers.get("user-agent", ""),
                    "source.service": request.headers.get("x-source-service", "unknown")
                }
            )
        
        return None
    
    def _create_root_span(self, request: Request) -> TraceContext:
        """Create a root span for requests without trace context"""
        
        trace_id = str(uuid.uuid4())
        span_id = str(uuid.uuid4())
        correlation_id = str(uuid.uuid4())
        
        return TraceContext(
            trace_id=trace_id,
            span_id=span_id,
            correlation_id=correlation_id,
            service=self.service_name,
            operation=f"{request.method} {request.url.path}",
            tags={
                "http.method": request.method,
                "http.url": str(request.url),
                "http.user_agent": request.headers.get("user-agent", ""),
                "trace.root": "true"
            }
        )
    
    def _create_child_span(self, parent_context: TraceContext, request: Request) -> TraceContext:
        """Create a child span from parent context"""
        
        return TraceContext(
            trace_id=parent_context.trace_id,
            span_id=str(uuid.uuid4()),
            parent_span_id=parent_context.span_id,
            correlation_id=parent_context.correlation_id,
            service=self.service_name,
            operation=f"{request.method} {request.url.path}",
            tags={
                **parent_context.tags,
                "http.method": request.method,
                "http.url": str(request.url),
                "http.user_agent": request.headers.get("user-agent", ""),
                "parent.service": parent_context.service,
                "parent.operation": parent_context.operation
            }
        )
    
    async def _record_span_metric(
        self, 
        metric_name: str, 
        context: TraceContext, 
        value: float,
        additional_labels: Optional[Dict[str, str]] = None
    ):
        """Record span metric (placeholder - would integrate with metrics system)"""
        
        labels = {
            "service": context.service,
            "operation": context.operation,
            "trace_id": context.trace_id[:8],  # Shortened for cardinality
        }
        
        if additional_labels:
            labels.update(additional_labels)
        
        # In a real implementation, this would send metrics to a metrics system
        # For now, just log the metric
        logger.debug("Span metric recorded", extra={
            "metric_name": metric_name,
            "value": value,
            "labels": labels,
            "trace_id": context.trace_id,
            "span_id": context.span_id,
            "correlation_id": context.correlation_id
        })

def get_trace_context(request: Request) -> Optional[TraceContext]:
    """Get trace context from request state"""
    return getattr(request.state, 'trace_context', None)

def create_child_span(
    parent_context: TraceContext,
    service: str,
    operation: str,
    tags: Optional[Dict[str, str]] = None
) -> TraceContext:
    """Create a child span for service calls"""
    
    child_tags = {
        **parent_context.tags,
        "parent.service": parent_context.service,
        "parent.operation": parent_context.operation,
        "call.type": "internal"
    }
    
    if tags:
        child_tags.update(tags)
    
    return TraceContext(
        trace_id=parent_context.trace_id,
        span_id=str(uuid.uuid4()),
        parent_span_id=parent_context.span_id,
        correlation_id=parent_context.correlation_id,
        service=service,
        operation=operation,
        tags=child_tags
    )

def finish_span(context: TraceContext, success: bool = True, error: Optional[Exception] = None):
    """Finish a span and record completion"""
    
    duration = (time.time() - context.start_time) * 1000  # Convert to milliseconds
    
    # Update tags
    context.tags.update({
        "span.success": str(success),
        "span.duration_ms": str(duration)
    })
    
    if error:
        context.tags.update({
            "error.message": str(error),
            "error.type": type(error).__name__
        })
    
    # Log span completion
    logger.info("Span finished", extra={
        "trace_id": context.trace_id,
        "span_id": context.span_id,
        "parent_span_id": context.parent_span_id,
        "correlation_id": context.correlation_id,
        "service": context.service,
        "operation": context.operation,
        "duration_ms": duration,
        "success": success,
        "error": str(error) if error else None
    })

class TracingContextManager:
    """Context manager for manual span creation"""
    
    def __init__(
        self,
        parent_context: TraceContext,
        service: str,
        operation: str,
        tags: Optional[Dict[str, str]] = None
    ):
        self.context = create_child_span(parent_context, service, operation, tags)
        self.success = True
        self.error = None
    
    def __enter__(self) -> TraceContext:
        logger.debug("Manual span started", extra={
            "trace_id": self.context.trace_id,
            "span_id": self.context.span_id,
            "service": self.context.service,
            "operation": self.context.operation
        })
        return self.context
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            self.success = False
            self.error = exc_val
        
        finish_span(self.context, self.success, self.error)
        return False  # Don't suppress exceptions

def trace_operation(
    parent_context: TraceContext,
    service: str,
    operation: str,
    tags: Optional[Dict[str, str]] = None
) -> TracingContextManager:
    """Create a context manager for tracing operations"""
    return TracingContextManager(parent_context, service, operation, tags)