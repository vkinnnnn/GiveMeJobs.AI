"""
Health Check Endpoints for Python Services

Provides comprehensive health checks for load balancer integration,
service discovery, and monitoring systems.
"""

from datetime import datetime, timezone
from typing import Dict, Any, Optional
import asyncio
import psutil
import sys

from fastapi import APIRouter, Request, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.config import get_settings
from app.core.database import DatabaseHealthCheck
from app.core.logging import get_logger
from app.middleware.service_auth import OptionalServiceAuth, ServiceTokenPayload

logger = get_logger(__name__)
router = APIRouter()

class HealthStatus(BaseModel):
    """Health status response model"""
    status: str  # healthy, unhealthy, degraded
    service: str
    version: str
    environment: str
    timestamp: str
    uptime_seconds: float
    checks: Dict[str, Any]

class DetailedHealthStatus(BaseModel):
    """Detailed health status with system metrics"""
    status: str
    service: str
    version: str
    environment: str
    timestamp: str
    uptime_seconds: float
    system: Dict[str, Any]
    database: Dict[str, Any]
    dependencies: Dict[str, Any]
    performance: Dict[str, Any]

# Track service start time for uptime calculation
SERVICE_START_TIME = datetime.now(timezone.utc)

@router.get("/", response_model=HealthStatus)
async def basic_health_check(
    request: Request,
    service: Optional[ServiceTokenPayload] = Depends(OptionalServiceAuth)
):
    """
    Basic health check endpoint for load balancers and monitoring systems.
    
    This endpoint provides a quick health status check with minimal overhead.
    """
    settings = get_settings()
    
    try:
        # Quick database connectivity check
        db_healthy = await DatabaseHealthCheck.check_async_connection()
        
        # Determine overall health status
        overall_status = "healthy" if db_healthy else "degraded"
        
        # Calculate uptime
        uptime = (datetime.now(timezone.utc) - SERVICE_START_TIME).total_seconds()
        
        health_data = HealthStatus(
            status=overall_status,
            service=settings.service_name,
            version=settings.service_version,
            environment=settings.environment,
            timestamp=datetime.now(timezone.utc).isoformat(),
            uptime_seconds=uptime,
            checks={
                "database": "healthy" if db_healthy else "unhealthy"
            }
        )
        
        # Log health check if requested by service
        if service:
            logger.debug("Health check requested by service", extra={
                "requesting_service": service.service_id,
                "correlation_id": getattr(request.state, 'correlation_id', None),
                "health_status": overall_status
            })
        
        return health_data
        
    except Exception as e:
        logger.error("Health check failed", extra={
            "error": str(e),
            "correlation_id": getattr(request.state, 'correlation_id', None)
        })
        
        # Return unhealthy status but still return 200 for load balancer compatibility
        return HealthStatus(
            status="unhealthy",
            service=settings.service_name,
            version=settings.service_version,
            environment=settings.environment,
            timestamp=datetime.now(timezone.utc).isoformat(),
            uptime_seconds=(datetime.now(timezone.utc) - SERVICE_START_TIME).total_seconds(),
            checks={
                "database": "unknown",
                "error": str(e)
            }
        )

@router.get("/detailed", response_model=DetailedHealthStatus)
async def detailed_health_check(
    request: Request,
    service: Optional[ServiceTokenPayload] = Depends(OptionalServiceAuth)
):
    """
    Detailed health check with system metrics and dependency status.
    
    This endpoint provides comprehensive health information including
    system resources, database status, and performance metrics.
    """
    settings = get_settings()
    
    try:
        # Perform comprehensive health checks
        health_checks = await perform_comprehensive_health_checks()
        
        # Get system metrics
        system_metrics = get_system_metrics()
        
        # Get performance metrics
        performance_metrics = get_performance_metrics()
        
        # Determine overall health status
        overall_status = determine_overall_health(health_checks, system_metrics)
        
        # Calculate uptime
        uptime = (datetime.now(timezone.utc) - SERVICE_START_TIME).total_seconds()
        
        health_data = DetailedHealthStatus(
            status=overall_status,
            service=settings.service_name,
            version=settings.service_version,
            environment=settings.environment,
            timestamp=datetime.now(timezone.utc).isoformat(),
            uptime_seconds=uptime,
            system=system_metrics,
            database=health_checks["database"],
            dependencies=health_checks["dependencies"],
            performance=performance_metrics
        )
        
        # Log detailed health check
        logger.info("Detailed health check completed", extra={
            "requesting_service": service.service_id if service else "anonymous",
            "correlation_id": getattr(request.state, 'correlation_id', None),
            "health_status": overall_status,
            "cpu_percent": system_metrics.get("cpu_percent"),
            "memory_percent": system_metrics.get("memory_percent")
        })
        
        return health_data
        
    except Exception as e:
        logger.error("Detailed health check failed", extra={
            "error": str(e),
            "correlation_id": getattr(request.state, 'correlation_id', None)
        })
        
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Health check failed"
        )

@router.get("/readiness")
async def readiness_check(
    request: Request,
    service: Optional[ServiceTokenPayload] = Depends(OptionalServiceAuth)
):
    """
    Kubernetes readiness probe endpoint.
    
    Checks if the service is ready to receive traffic.
    """
    try:
        # Check critical dependencies
        db_healthy = await DatabaseHealthCheck.check_async_connection()
        
        if not db_healthy:
            logger.warning("Readiness check failed - database not ready", extra={
                "correlation_id": getattr(request.state, 'correlation_id', None)
            })
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Service not ready - database unavailable"
            )
        
        return {
            "ready": True,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Readiness check failed", extra={
            "error": str(e),
            "correlation_id": getattr(request.state, 'correlation_id', None)
        })
        
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Readiness check failed"
        )

@router.get("/liveness")
async def liveness_check(
    request: Request,
    service: Optional[ServiceTokenPayload] = Depends(OptionalServiceAuth)
):
    """
    Kubernetes liveness probe endpoint.
    
    Checks if the service is alive and should not be restarted.
    """
    try:
        # Basic liveness check - just ensure the service is responding
        uptime = (datetime.now(timezone.utc) - SERVICE_START_TIME).total_seconds()
        
        return {
            "alive": True,
            "uptime_seconds": uptime,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error("Liveness check failed", extra={
            "error": str(e),
            "correlation_id": getattr(request.state, 'correlation_id', None)
        })
        
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Liveness check failed"
        )

async def perform_comprehensive_health_checks() -> Dict[str, Any]:
    """Perform comprehensive health checks for all dependencies"""
    
    # Database health check
    db_health = await check_database_health()
    
    # External dependencies health check
    dependencies_health = await check_dependencies_health()
    
    return {
        "database": db_health,
        "dependencies": dependencies_health
    }

async def check_database_health() -> Dict[str, Any]:
    """Check database connectivity and performance"""
    try:
        # Test async connection
        is_connected = await DatabaseHealthCheck.check_async_connection()
        
        if not is_connected:
            return {
                "status": "unhealthy",
                "error": "Database connection failed"
            }
        
        # Test query performance
        start_time = datetime.now()
        query_successful = await DatabaseHealthCheck.test_query_performance()
        query_time = (datetime.now() - start_time).total_seconds() * 1000
        
        return {
            "status": "healthy" if query_successful else "degraded",
            "connection": "established",
            "query_time_ms": round(query_time, 2),
            "last_check": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "last_check": datetime.now(timezone.utc).isoformat()
        }

async def check_dependencies_health() -> Dict[str, Any]:
    """Check external dependencies health"""
    dependencies = {}
    
    # Check Redis if configured
    try:
        from app.core.dependencies import get_redis
        redis_client = await get_redis()
        await redis_client.ping()
        dependencies["redis"] = {
            "status": "healthy",
            "last_check": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        dependencies["redis"] = {
            "status": "unhealthy",
            "error": str(e),
            "last_check": datetime.now(timezone.utc).isoformat()
        }
    
    # Add other dependency checks here (OpenAI, external APIs, etc.)
    
    return dependencies

def get_system_metrics() -> Dict[str, Any]:
    """Get system resource metrics"""
    try:
        # CPU metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_count = psutil.cpu_count()
        
        # Memory metrics
        memory = psutil.virtual_memory()
        
        # Disk metrics
        disk = psutil.disk_usage('/')
        
        # Process metrics
        process = psutil.Process()
        process_memory = process.memory_info()
        
        return {
            "cpu_percent": cpu_percent,
            "cpu_count": cpu_count,
            "memory_total_gb": round(memory.total / (1024**3), 2),
            "memory_available_gb": round(memory.available / (1024**3), 2),
            "memory_percent": memory.percent,
            "disk_total_gb": round(disk.total / (1024**3), 2),
            "disk_free_gb": round(disk.free / (1024**3), 2),
            "disk_percent": round((disk.used / disk.total) * 100, 2),
            "process_memory_mb": round(process_memory.rss / (1024**2), 2),
            "python_version": sys.version,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error("Failed to get system metrics", extra={"error": str(e)})
        return {
            "error": str(e),
            "last_updated": datetime.now(timezone.utc).isoformat()
        }

def get_performance_metrics() -> Dict[str, Any]:
    """Get performance metrics"""
    try:
        # This would typically come from a metrics collector
        # For now, return basic metrics
        
        uptime = (datetime.now(timezone.utc) - SERVICE_START_TIME).total_seconds()
        
        return {
            "uptime_seconds": uptime,
            "uptime_human": format_uptime(uptime),
            "requests_per_second": 0,  # Would be tracked by metrics middleware
            "average_response_time_ms": 0,  # Would be tracked by metrics middleware
            "error_rate_percent": 0,  # Would be tracked by metrics middleware
            "last_updated": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error("Failed to get performance metrics", extra={"error": str(e)})
        return {
            "error": str(e),
            "last_updated": datetime.now(timezone.utc).isoformat()
        }

def determine_overall_health(health_checks: Dict[str, Any], system_metrics: Dict[str, Any]) -> str:
    """Determine overall health status based on checks and metrics"""
    
    # Check database health
    if health_checks["database"]["status"] == "unhealthy":
        return "unhealthy"
    
    # Check system resources
    if "memory_percent" in system_metrics:
        if system_metrics["memory_percent"] > 90:
            return "degraded"
        if system_metrics["cpu_percent"] > 90:
            return "degraded"
    
    # Check dependencies
    redis_status = health_checks["dependencies"].get("redis", {}).get("status")
    if redis_status == "unhealthy":
        return "degraded"
    
    return "healthy"

def format_uptime(seconds: float) -> str:
    """Format uptime in human-readable format"""
    days = int(seconds // 86400)
    hours = int((seconds % 86400) // 3600)
    minutes = int((seconds % 3600) // 60)
    
    if days > 0:
        return f"{days}d {hours}h {minutes}m"
    elif hours > 0:
        return f"{hours}h {minutes}m"
    else:
        return f"{minutes}m"