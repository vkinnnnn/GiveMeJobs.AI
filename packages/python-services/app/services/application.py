"""Application service with business logic and tracking."""

from typing import Dict, List, Optional, Any
from datetime import datetime

from app.core.cache import CacheService
from app.core.logging import get_logger
from app.models.application import Application, ApplicationCreate, ApplicationUpdate
from app.models.base import Result
from app.repositories.application import ApplicationRepository
from app.repositories.job import JobRepository
from app.repositories.user import UserRepository

logger = get_logger(__name__)


class ApplicationService:
    """Application service with comprehensive business logic."""
    
    def __init__(
        self,
        app_repo: ApplicationRepository,
        job_repo: JobRepository,
        user_repo: UserRepository,
        cache: CacheService
    ):
        self.app_repo = app_repo
        self.job_repo = job_repo
        self.user_repo = user_repo
        self.cache = cache
        self.logger = get_logger(f"{__name__}.ApplicationService")
    
    # Application Management
    async def create_application(
        self, 
        user_id: str, 
        app_data: ApplicationCreate
    ) -> Result[Application, str]:
        """Create a new job application with validation."""
        try:
            # Check if user exists
            user = await self.user_repo.find_by_id(user_id)
            if not user:
                return Result.error("User not found")
            
            # Check if job exists and is active
            job = await self.job_repo.find_by_id(app_data.job_id)
            if not job:
                return Result.error("Job not found")
            
            if job.status != "active":
                return Result.error("Job is not active")
            
            # Check if user has already applied to this job
            existing_app = await self.app_repo.find_by_user_and_job(
                user_id, app_data.job_id
            )
            if existing_app:
                return Result.error("You have already applied to this job")
            
            # Add user_id to application data
            app_dict = app_data.model_dump()
            app_dict['user_id'] = user_id
            app_dict['applied_date'] = datetime.utcnow()
            
            # Set default status if not provided
            if 'status' not in app_dict or not app_dict['status']:
                app_dict['status'] = 'submitted'
            
            application = await self.app_repo.create(ApplicationCreate(**app_dict))
            
            # Track application in job analytics
            await self._track_job_application(app_data.job_id)
            
            # Invalidate user applications cache
            await self._invalidate_user_applications_cache(user_id)
            
            self.logger.info("Application created successfully", 
                           user_id=user_id, job_id=app_data.job_id, 
                           application_id=application.id)
            return Result.success(application)
            
        except Exception as e:
            self.logger.error("Failed to create application", 
                            user_id=user_id, error=str(e))
            return Result.error(f"Failed to create application: {str(e)}")
    
    async def get_application_by_id(self, app_id: str) -> Optional[Application]:
        """Get application by ID."""
        try:
            return await self.app_repo.find_by_id(app_id)
        except Exception as e:
            self.logger.error("Failed to get application by ID", 
                            application_id=app_id, error=str(e))
            return None
    
    async def update_application(
        self, 
        app_id: str, 
        app_data: ApplicationUpdate
    ) -> Result[Application, str]:
        """Update application information."""
        try:
            # Check if application exists
            existing_app = await self.app_repo.find_by_id(app_id)
            if not existing_app:
                return Result.error("Application not found")
            
            updated_app = await self.app_repo.update(app_id, app_data)
            if not updated_app:
                return Result.error("Failed to update application")
            
            # Invalidate user applications cache
            await self._invalidate_user_applications_cache(updated_app.user_id)
            
            self.logger.info("Application updated successfully", application_id=app_id)
            return Result.success(updated_app)
            
        except Exception as e:
            self.logger.error("Failed to update application", 
                            application_id=app_id, error=str(e))
            return Result.error(f"Failed to update application: {str(e)}")
    
    async def delete_application(self, app_id: str) -> Result[bool, str]:
        """Delete application (withdraw)."""
        try:
            # Get application to get user_id for cache invalidation
            application = await self.app_repo.find_by_id(app_id)
            if not application:
                return Result.error("Application not found")
            
            success = await self.app_repo.delete(app_id, soft_delete=False)
            if success:
                await self._invalidate_user_applications_cache(application.user_id)
                self.logger.info("Application deleted successfully", application_id=app_id)
                return Result.success(True)
            else:
                return Result.error("Failed to delete application")
                
        except Exception as e:
            self.logger.error("Failed to delete application", 
                            application_id=app_id, error=str(e))
            return Result.error(f"Failed to delete application: {str(e)}")
    
    # User Application Management
    async def get_user_applications(self, user_id: str) -> List[Application]:
        """Get all applications for a user."""
        try:
            # Try cache first
            cache_key = f"user_applications:{user_id}"
            cached_apps = await self.cache.get(cache_key)
            if cached_apps:
                return [Application(**app_data) for app_data in cached_apps]
            
            applications = await self.app_repo.find_by_user_id(user_id)
            
            # Cache results for 10 minutes
            await self.cache.set(
                cache_key,
                [app.model_dump() for app in applications],
                ttl=600
            )
            
            return applications
            
        except Exception as e:
            self.logger.error("Failed to get user applications", 
                            user_id=user_id, error=str(e))
            return []
    
    async def get_user_applications_by_status(
        self, 
        user_id: str, 
        status: str
    ) -> List[Application]:
        """Get user applications filtered by status."""
        try:
            return await self.app_repo.find_by_status(user_id, status)
        except Exception as e:
            self.logger.error("Failed to get user applications by status", 
                            user_id=user_id, status=status, error=str(e))
            return []
    
    async def get_application_stats(self, user_id: str) -> Dict[str, Any]:
        """Get application statistics for a user."""
        try:
            # Try cache first
            cache_key = f"user_app_stats:{user_id}"
            cached_stats = await self.cache.get(cache_key)
            if cached_stats:
                return cached_stats
            
            stats = await self.app_repo.get_application_stats(user_id)
            
            # Cache results for 30 minutes
            await self.cache.set(cache_key, stats, ttl=1800)
            
            return stats
            
        except Exception as e:
            self.logger.error("Failed to get application stats", 
                            user_id=user_id, error=str(e))
            return {}
    
    # Job Application Management
    async def get_job_applications(self, job_id: str) -> List[Application]:
        """Get all applications for a job."""
        try:
            return await self.app_repo.find_by_job_id(job_id)
        except Exception as e:
            self.logger.error("Failed to get job applications", 
                            job_id=job_id, error=str(e))
            return []
    
    # Application Status Management
    async def update_application_status(
        self, 
        app_id: str, 
        status: str,
        notes: Optional[str] = None
    ) -> Result[Application, str]:
        """Update application status with optional notes."""
        try:
            update_data = {"status": status}
            
            # Add timestamp based on status
            if status in ["interview_scheduled", "interview_completed"]:
                update_data["interview_date"] = datetime.utcnow()
            elif status in ["offer_received", "accepted", "rejected"]:
                update_data["response_date"] = datetime.utcnow()
            
            if notes:
                update_data["notes"] = notes
            
            from app.models.application import ApplicationUpdate
            app_update = ApplicationUpdate(**update_data)
            
            return await self.update_application(app_id, app_update)
            
        except Exception as e:
            self.logger.error("Failed to update application status", 
                            application_id=app_id, status=status, error=str(e))
            return Result.error(f"Failed to update application status: {str(e)}")
    
    async def schedule_interview(
        self, 
        app_id: str, 
        interview_date: datetime,
        notes: Optional[str] = None
    ) -> Result[Application, str]:
        """Schedule interview for application."""
        try:
            update_data = {
                "status": "interview_scheduled",
                "interview_date": interview_date
            }
            
            if notes:
                update_data["notes"] = notes
            
            from app.models.application import ApplicationUpdate
            app_update = ApplicationUpdate(**update_data)
            
            return await self.update_application(app_id, app_update)
            
        except Exception as e:
            self.logger.error("Failed to schedule interview", 
                            application_id=app_id, error=str(e))
            return Result.error(f"Failed to schedule interview: {str(e)}")
    
    async def add_application_feedback(
        self, 
        app_id: str, 
        feedback: str
    ) -> Result[Application, str]:
        """Add feedback to application."""
        try:
            from app.models.application import ApplicationUpdate
            app_update = ApplicationUpdate(feedback=feedback)
            
            return await self.update_application(app_id, app_update)
            
        except Exception as e:
            self.logger.error("Failed to add application feedback", 
                            application_id=app_id, error=str(e))
            return Result.error(f"Failed to add feedback: {str(e)}")
    
    # Application Analytics
    async def calculate_application_success_rate(self, user_id: str) -> float:
        """Calculate user's application success rate."""
        try:
            stats = await self.get_application_stats(user_id)
            
            total_apps = stats.get("total_applications", 0)
            if total_apps == 0:
                return 0.0
            
            # Count successful applications (offers received or accepted)
            status_counts = stats.get("status_counts", {})
            successful_apps = (
                status_counts.get("offer_received", 0) + 
                status_counts.get("accepted", 0)
            )
            
            return (successful_apps / total_apps) * 100
            
        except Exception as e:
            self.logger.error("Failed to calculate success rate", 
                            user_id=user_id, error=str(e))
            return 0.0
    
    async def get_application_timeline(self, app_id: str) -> List[Dict[str, Any]]:
        """Get application timeline/history."""
        try:
            application = await self.app_repo.find_by_id(app_id)
            if not application:
                return []
            
            timeline = []
            
            # Application submitted
            timeline.append({
                "event": "Application Submitted",
                "date": application.applied_date,
                "status": "submitted",
                "description": "Application was submitted"
            })
            
            # Response received
            if application.response_date:
                timeline.append({
                    "event": "Response Received",
                    "date": application.response_date,
                    "status": application.status,
                    "description": f"Status updated to {application.status}"
                })
            
            # Interview scheduled/completed
            if application.interview_date:
                timeline.append({
                    "event": "Interview",
                    "date": application.interview_date,
                    "status": application.status,
                    "description": "Interview scheduled or completed"
                })
            
            # Sort by date
            timeline.sort(key=lambda x: x["date"])
            
            return timeline
            
        except Exception as e:
            self.logger.error("Failed to get application timeline", 
                            application_id=app_id, error=str(e))
            return []
    
    # Private helper methods
    async def _track_job_application(self, job_id: str) -> None:
        """Track job application for analytics."""
        try:
            # This would typically call the job service
            # For now, just increment the counter directly
            await self.job_repo.increment_application_count(job_id)
            
        except Exception as e:
            self.logger.warning("Failed to track job application", 
                              job_id=job_id, error=str(e))
    
    async def _invalidate_user_applications_cache(self, user_id: str) -> None:
        """Invalidate user applications cache."""
        try:
            await self.cache.delete_pattern(f"user_app*:{user_id}")
        except Exception as e:
            self.logger.warning("Failed to invalidate applications cache", 
                              user_id=user_id, error=str(e))