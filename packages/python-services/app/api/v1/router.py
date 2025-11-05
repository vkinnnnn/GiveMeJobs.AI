"""Main API v1 router."""

from fastapi import APIRouter

from .endpoints import auth, users, jobs, applications, documents, analytics, health
from . import cdn, enhanced_auth

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["jobs"])
api_router.include_router(applications.router, prefix="/applications", tags=["applications"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(cdn.router, prefix="/cdn", tags=["cdn"])
api_router.include_router(enhanced_auth.router, tags=["enhanced-auth"])