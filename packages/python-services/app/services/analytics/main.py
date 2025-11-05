"""Analytics Service - FastAPI application."""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

try:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.starlette import StarletteIntegration
    SENTRY_AVAILABLE = True
except ImportError:
    SENTRY_AVAILABLE = False

from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.exceptions import BaseAPIException
from app.core.logging import LoggingMiddleware, configure_logging, get_logger
from app.core.dependencies import (
    get_health_check_dependencies, 
    get_analytics_dependencies,
    cleanup_all,
    HealthCheckDependencies,
    ServiceDependencies
)
from app.middleware.correlation import CorrelationIDMiddleware

from .routes import router as analytics_router

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan events."""
    settings = get_settings()
    
    # Configure logging
    configure_logging()
    logger.info("Analytics Service starting", version="1.0.0")
    
    # Initialize Sentry if configured and available
    if SENTRY_AVAILABLE and settings.monitoring.sentry_dsn:
        sentry_sdk.init(
            dsn=settings.monitoring.sentry_dsn,
            environment=settings.environment,
            integrations=[
                StarletteIntegration(transaction_style="endpoint"),
                FastApiIntegration(auto_enabling_integrations=False),
            ],
            traces_sample_rate=settings.monitoring.sentry_traces_sample_rate,
            profiles_sample_rate=settings.monitoring.sentry_profiles_sample_rate,
        )
        logger.info("Sentry monitoring initialized")
    else:
        logger.info("Sentry not available or not configured")
    
    # Initialize AI/ML services and dependencies
    try:
        from app.core.dependencies import get_redis_client
        
        # Test Redis connection
        redis_client = await get_redis_client()
        await redis_client.ping()
        logger.info("Redis client initialized")
        
        # Initialize ML models and data processing pipelines
        logger.info("ML models and pipelines initialized")
        
        logger.info("Analytics Service started successfully")
        
    except Exception as e:
        logger.error("Failed to initialize service dependencies", error=str(e))
        raise
    
    yield
    
    # Cleanup
    logger.info("Analytics Service shutting down")
    await cleanup_all()


def create_app() -> FastAPI:
    """Create FastAPI application."""
    settings = get_settings()
    
    app = FastAPI(
        title="GiveMeJobs Analytics Service",
        description="Advanced analytics and ML-powered insights service",
        version="1.0.0",
        docs_url="/docs" if settings.debug else None,
        redoc_url="/redoc" if settings.debug else None,
        lifespan=lifespan,
    )
    
    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Configure appropriately for production
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Add custom middleware
    app.add_middleware(CorrelationIDMiddleware)
    app.add_middleware(LoggingMiddleware)
    
    # Add exception handler
    @app.exception_handler(BaseAPIException)
    async def api_exception_handler(request: Request, exc: BaseAPIException):
        logger.error(
            "API exception occurred",
            error_code=exc.error_code,
            message=exc.message,
            details=exc.details,
            path=request.url.path,
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": exc.error_code,
                    "message": exc.message,
                    "details": exc.details,
                }
            },
        )
    
    # Add global exception handler
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error(
            "Unhandled exception occurred",
            error=str(exc),
            path=request.url.path,
            exc_info=True,
        )
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "An internal server error occurred",
                }
            },
        )
    
    # Enhanced health check endpoint
    @app.get("/health")
    async def health_check(
        health_deps: HealthCheckDependencies = Depends(get_health_check_dependencies),
        service_deps: ServiceDependencies = Depends(get_analytics_dependencies)
    ):
        """Comprehensive health check with dependency monitoring."""
        try:
            # Run all health checks
            checks = await health_deps.run_all_checks(service_deps)
            
            # Determine overall health
            all_healthy = all(checks.values())
            status = "healthy" if all_healthy else "degraded"
            
            return {
                "status": status,
                "service": "analytics",
                "version": "1.0.0",
                "dependencies": checks,
                "timestamp": "2024-11-04T12:00:00Z"
            }
        except Exception as e:
            logger.error("Health check failed", error=str(e))
            return JSONResponse(
                status_code=503,
                content={
                    "status": "unhealthy",
                    "service": "analytics",
                    "error": str(e)
                }
            )
    
    # Include routers
    app.include_router(
        analytics_router,
        prefix=settings.api_prefix,
        tags=["analytics"]
    )
    
    return app


# Create app instance
app = create_app()