"""Semantic Search Service - FastAPI application."""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

import sentry_sdk
from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration

from app.core.config import get_settings
from app.core.exceptions import BaseAPIException
from app.core.logging import LoggingMiddleware, configure_logging, get_logger
from app.core.dependencies import (
    get_health_check_dependencies, 
    get_semantic_search_dependencies,
    cleanup_all,
    HealthCheckDependencies,
    ServiceDependencies
)
from app.middleware.correlation import CorrelationIDMiddleware

from .routes import router as search_router

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan events."""
    settings = get_settings()
    
    # Configure logging
    configure_logging()
    logger.info("Semantic Search Service starting", version="1.0.0")
    
    # Initialize Sentry if configured
    if settings.monitoring.sentry_dsn:
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
    
    # Initialize AI/ML services and dependencies
    try:
        from app.core.openai_client import get_openai_client
        from app.core.dependencies import get_redis_client
        
        # Test OpenAI connection
        openai_client = await get_openai_client()
        openai_healthy = await openai_client.health_check()
        logger.info("OpenAI client initialized", healthy=openai_healthy)
        
        # Test Redis connection
        redis_client = await get_redis_client()
        await redis_client.ping()
        logger.info("Redis client initialized")
        
        # Initialize Pinecone if configured
        if settings.ai.pinecone_api_key:
            import pinecone
            pinecone.init(
                api_key=settings.ai.pinecone_api_key,
                environment=settings.ai.pinecone_environment
            )
            logger.info("Pinecone client initialized")
        
        logger.info("Semantic Search Service started successfully")
        
    except Exception as e:
        logger.error("Failed to initialize service dependencies", error=str(e))
        raise
    
    yield
    
    # Cleanup
    logger.info("Semantic Search Service shutting down")
    await cleanup_all()


def create_app() -> FastAPI:
    """Create FastAPI application."""
    settings = get_settings()
    
    app = FastAPI(
        title="GiveMeJobs Semantic Search Service",
        description="AI-powered semantic search and job matching service",
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
        service_deps: ServiceDependencies = Depends(get_semantic_search_dependencies)
    ):
        """Comprehensive health check with dependency monitoring."""
        try:
            # Run all health checks
            checks = await health_deps.run_all_checks(service_deps)
            
            # Check Pinecone if configured
            pinecone_healthy = True
            if service_deps.settings.ai.pinecone_api_key:
                try:
                    import pinecone
                    # Simple index list check
                    pinecone.list_indexes()
                    pinecone_healthy = True
                except Exception as e:
                    logger.warning("Pinecone health check failed", error=str(e))
                    pinecone_healthy = False
            
            checks["pinecone"] = pinecone_healthy
            
            # Determine overall health
            all_healthy = all(checks.values())
            status = "healthy" if all_healthy else "degraded"
            
            # Get OpenAI usage stats
            openai_stats = await service_deps.openai.get_usage_stats()
            
            return {
                "status": status,
                "service": "semantic-search",
                "version": "1.0.0",
                "dependencies": checks,
                "openai_stats": openai_stats,
                "timestamp": "2024-11-04T12:00:00Z"
            }
        except Exception as e:
            logger.error("Health check failed", error=str(e))
            return JSONResponse(
                status_code=503,
                content={
                    "status": "unhealthy",
                    "service": "semantic-search",
                    "error": str(e)
                }
            )
    
    # Include routers
    app.include_router(
        search_router,
        prefix=settings.api_prefix,
        tags=["semantic-search"]
    )
    
    return app


# Create app instance
app = create_app()