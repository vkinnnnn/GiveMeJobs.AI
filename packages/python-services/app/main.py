"""
Main FastAPI application entry point.

This is the primary FastAPI application that serves as the main backend API.
It includes all core functionality and can route to specialized services.
"""

import asyncio
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import sentry_sdk
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration

from app.core.config import get_settings
from app.core.database import startup_database, shutdown_database
from app.core.logging import configure_logging, get_logger
from app.core.exceptions import BaseAPIException
from app.core.error_handlers import register_error_handlers
from app.api.v1.router import api_router
from app.middleware.correlation import CorrelationIDMiddleware
from app.middleware.logging import LoggingMiddleware
from app.middleware.rate_limiting import RateLimitMiddleware
from app.middleware.metrics import MetricsMiddleware, RateTrackingMiddleware
from app.middleware.security_validation import (
    SecurityValidationMiddleware, 
    FileUploadSecurityMiddleware,
    RequestLoggingMiddleware
)
from app.middleware.service_auth import ServiceAuthMiddleware
from app.middleware.distributed_tracing import DistributedTracingMiddleware
from app.core.metrics import init_metrics_collector, setup_metrics_endpoint


# Setup logging first
configure_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan events."""
    settings = get_settings()
    
    # Startup
    logger.info("Starting GiveMeJobs Python Backend API")
    
    # Initialize Sentry if configured
    if settings.monitoring.sentry_dsn:
        sentry_sdk.init(
            dsn=settings.monitoring.sentry_dsn,
            environment=settings.environment,
            integrations=[
                StarletteIntegration(transaction_style="endpoint"),
                FastApiIntegration(auto_enabling_integrations=False),
                SqlalchemyIntegration(),
            ],
            traces_sample_rate=settings.monitoring.sentry_traces_sample_rate,
            profiles_sample_rate=settings.monitoring.sentry_profiles_sample_rate,
        )
        logger.info("Sentry monitoring initialized")
    
    # Initialize database
    await startup_database()
    
    # Initialize metrics collector
    from app.core.dependencies import get_redis
    redis_client = await get_redis()
    metrics_collector = init_metrics_collector(redis_client)
    await metrics_collector.start_collection()
    logger.info("Metrics collector initialized")
    
    # Additional startup tasks
    logger.info("Application startup completed")
    
    yield
    
    # Shutdown
    logger.info("Shutting down GiveMeJobs Python Backend API")
    
    # Stop metrics collection
    from app.core.metrics import get_metrics_collector
    metrics_collector = get_metrics_collector()
    if metrics_collector:
        await metrics_collector.stop_collection()
    
    await shutdown_database()
    logger.info("Application shutdown completed")


def create_app() -> FastAPI:
    """Create FastAPI application."""
    settings = get_settings()
    
    app = FastAPI(
        title=settings.api_title,
        description=settings.api_description,
        version=settings.service_version,
        openapi_url=f"{settings.api_prefix}/openapi.json",
        docs_url=f"{settings.api_prefix}/docs",
        redoc_url=f"{settings.api_prefix}/redoc",
        lifespan=lifespan,
    )
    
    # Add security middleware
    if not settings.is_development:
        app.add_middleware(
            TrustedHostMiddleware,
            allowed_hosts=["*"]  # Configure properly in production
        )
    
    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.security.cors_origins,
        allow_credentials=settings.security.cors_allow_credentials,
        allow_methods=settings.security.cors_allow_methods,
        allow_headers=settings.security.cors_allow_headers,
    )
    
    # Add custom middleware (order matters - security first)
    app.add_middleware(SecurityValidationMiddleware, 
                      max_request_size=settings.max_request_size,
                      enable_csp=not settings.is_development,
                      strict_validation=not settings.is_development)
    app.add_middleware(FileUploadSecurityMiddleware)
    app.add_middleware(RequestLoggingMiddleware, log_all_requests=settings.is_development)
    app.add_middleware(ServiceAuthMiddleware, require_auth=not settings.is_development)
    app.add_middleware(DistributedTracingMiddleware, service_name=settings.service_name)
    app.add_middleware(CorrelationIDMiddleware)
    app.add_middleware(LoggingMiddleware)
    app.add_middleware(RateLimitMiddleware)
    app.add_middleware(MetricsMiddleware)
    app.add_middleware(RateTrackingMiddleware)
    
    # Include API routes
    app.include_router(api_router, prefix=settings.api_prefix)
    
    # Setup metrics endpoint
    setup_metrics_endpoint(app)
    
    # Register comprehensive error handlers
    register_error_handlers(app)
    
    # Health check endpoint
    @app.get("/health")
    async def health_check():
        """Health check endpoint."""
        from app.core.database import DatabaseHealthCheck
        
        db_healthy = await DatabaseHealthCheck.check_async_connection()
        
        return {
            "status": "healthy" if db_healthy else "unhealthy",
            "service": settings.service_name,
            "version": settings.service_version,
            "environment": settings.environment,
            "database": "healthy" if db_healthy else "unhealthy"
        }
    
    # Root endpoint
    @app.get("/")
    async def root():
        """Root endpoint."""
        return {
            "message": "GiveMeJobs Python Backend API",
            "version": settings.service_version,
            "docs": f"{settings.api_prefix}/docs",
            "health": "/health"
        }
    
    return app


# Create the application instance
app = create_app()


if __name__ == "__main__":
    import uvicorn
    
    settings = get_settings()
    
    uvicorn.run(
        "app.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.is_development,
        log_level=settings.monitoring.log_level.lower(),
        access_log=True,
    )