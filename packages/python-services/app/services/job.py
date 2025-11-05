"""Job service with business logic and search functionality."""

from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta

from app.core.cache import CacheService
from app.core.logging import get_logger
from app.models.job import (
    Job, JobCreate, JobUpdate, JobSearchFilters, JobAnalytics,
    JobStatus, JobSource
)
from app.models.base import Result, PaginatedResponse
from app.repositories.job import JobRepository, JobAnalyticsRepository

logger = get_logger(__name__)


class JobService:
    """Job service with comprehensive business logic."""
    
    def __init__(
        self,
        job_repo: JobRepository,
        analytics_repo: JobAnalyticsRepository,
        cache: CacheService
    ):
        self.job_repo = job_repo
        self.analytics_repo = analytics_repo
        self.cache = cache
        self.logger = get_logger(f"{__name__}.JobService")
    
    # Job Management
    async def create_job(self, job_data: JobCreate) -> Result[Job, str]:
        """Create a new job posting with validation."""
        try:
            # Check for duplicate external jobs
            if job_data.external_id and job_data.source != JobSource.MANUAL:
                existing_job = await self.job_repo.find_by_external_id(
                    job_data.source, job_data.external_id
                )
                if existing_job:
                    return Result.error("Job with this external ID already exists")
            
            # Set default values
            if not job_data.posted_date:
                job_data.posted_date = datetime.utcnow()
            
            if not job_data.status:
                job_data.status = JobStatus.ACTIVE
            
            job = await self.job_repo.create(job_data)
            
            # Initialize analytics
            await self._initialize_job_analytics(job.id)
            
            self.logger.info("Job created successfully", 
                           job_id=job.id, title=job.title, company=job.company)
            return Result.success(job)
            
        except Exception as e:
            self.logger.error("Failed to create job", error=str(e))
            return Result.error(f"Failed to create job: {str(e)}")
    
    async def get_job_by_id(self, job_id: str, track_view: bool = True) -> Optional[Job]:
        """Get job by ID with optional view tracking."""
        try:
            job = await self.job_repo.find_by_id(job_id)
            
            # Track view if requested and job exists
            if job and track_view:
                await self.track_job_view(job_id)
            
            return job
            
        except Exception as e:
            self.logger.error("Failed to get job by ID", job_id=job_id, error=str(e))
            return None
    
    async def update_job(self, job_id: str, job_data: JobUpdate) -> Result[Job, str]:
        """Update job information."""
        try:
            # Check if job exists
            existing_job = await self.job_repo.find_by_id(job_id)
            if not existing_job:
                return Result.error("Job not found")
            
            updated_job = await self.job_repo.update(job_id, job_data)
            if not updated_job:
                return Result.error("Failed to update job")
            
            # Invalidate job cache
            await self._invalidate_job_cache(job_id)
            
            self.logger.info("Job updated successfully", job_id=job_id)
            return Result.success(updated_job)
            
        except Exception as e:
            self.logger.error("Failed to update job", job_id=job_id, error=str(e))
            return Result.error(f"Failed to update job: {str(e)}")
    
    async def delete_job(self, job_id: str) -> Result[bool, str]:
        """Soft delete job posting."""
        try:
            success = await self.job_repo.delete(job_id, soft_delete=True)
            if success:
                await self._invalidate_job_cache(job_id)
                self.logger.info("Job deleted successfully", job_id=job_id)
                return Result.success(True)
            else:
                return Result.error("Job not found")
                
        except Exception as e:
            self.logger.error("Failed to delete job", job_id=job_id, error=str(e))
            return Result.error(f"Failed to delete job: {str(e)}")
    
    # Job Search and Discovery
    async def search_jobs(self, filters: JobSearchFilters) -> Result[PaginatedResponse[Job], str]:
        """Search jobs with advanced filtering and pagination."""
        try:
            # Generate cache key for search results
            cache_key = self._generate_search_cache_key(filters)
            
            # Try cache first for non-personalized searches
            if not filters.keywords or len(filters.keywords) < 3:
                cached_results = await self.cache.get(cache_key)
                if cached_results:
                    return Result.success(PaginatedResponse[Job](**cached_results))
            
            # Perform search
            jobs = await self.job_repo.search_jobs(filters)
            
            # Get total count for pagination
            total_count = await self._count_search_results(filters)
            
            # Calculate pagination
            pages = (total_count + filters.size - 1) // filters.size if total_count > 0 else 0
            
            result = PaginatedResponse[Job](
                items=jobs,
                total=total_count,
                page=filters.page,
                size=filters.size,
                pages=pages,
                has_next=filters.page < pages,
                has_prev=filters.page > 1
            )
            
            # Cache results for 5 minutes
            await self.cache.set(cache_key, result.model_dump(), ttl=300)
            
            self.logger.info("Job search completed", 
                           total_results=total_count, page=filters.page)
            return Result.success(result)
            
        except Exception as e:
            self.logger.error("Failed to search jobs", error=str(e))
            return Result.error(f"Failed to search jobs: {str(e)}")
    
    async def get_similar_jobs(self, job_id: str, limit: int = 5) -> List[Job]:
        """Get jobs similar to the specified job."""
        try:
            # Try cache first
            cache_key = f"similar_jobs:{job_id}:{limit}"
            cached_jobs = await self.cache.get(cache_key)
            if cached_jobs:
                return [Job(**job_data) for job_data in cached_jobs]
            
            similar_jobs = await self.job_repo.find_similar_jobs(job_id, limit)
            
            # Cache results for 1 hour
            await self.cache.set(
                cache_key, 
                [job.model_dump() for job in similar_jobs], 
                ttl=3600
            )
            
            return similar_jobs
            
        except Exception as e:
            self.logger.error("Failed to get similar jobs", 
                            job_id=job_id, error=str(e))
            return []
    
    async def get_jobs_by_company(self, company: str, limit: int = 10) -> List[Job]:
        """Get jobs by company name."""
        try:
            return await self.job_repo.find_by_company(company, limit)
        except Exception as e:
            self.logger.error("Failed to get jobs by company", 
                            company=company, error=str(e))
            return []
    
    # Job Analytics and Tracking
    async def track_job_view(self, job_id: str) -> None:
        """Track job view for analytics."""
        try:
            # Increment view count in database
            await self.job_repo.increment_view_count(job_id)
            
            # Update analytics asynchronously
            await self._update_job_analytics_async(job_id, "view")
            
        except Exception as e:
            self.logger.warning("Failed to track job view", 
                              job_id=job_id, error=str(e))
    
    async def track_job_application(self, job_id: str) -> None:
        """Track job application for analytics."""
        try:
            # Increment application count in database
            await self.job_repo.increment_application_count(job_id)
            
            # Update analytics asynchronously
            await self._update_job_analytics_async(job_id, "application")
            
        except Exception as e:
            self.logger.warning("Failed to track job application", 
                              job_id=job_id, error=str(e))
    
    async def get_job_analytics(self, job_id: str) -> Optional[JobAnalytics]:
        """Get job analytics data."""
        try:
            return await self.analytics_repo.find_by_job_id(job_id)
        except Exception as e:
            self.logger.error("Failed to get job analytics", 
                            job_id=job_id, error=str(e))
            return None
    
    # Job Status Management
    async def activate_job(self, job_id: str) -> Result[Job, str]:
        """Activate a job posting."""
        return await self._update_job_status(job_id, JobStatus.ACTIVE)
    
    async def deactivate_job(self, job_id: str) -> Result[Job, str]:
        """Deactivate a job posting."""
        return await self._update_job_status(job_id, JobStatus.INACTIVE)
    
    async def expire_job(self, job_id: str) -> Result[Job, str]:
        """Mark job as expired."""
        return await self._update_job_status(job_id, JobStatus.EXPIRED)
    
    async def mark_job_filled(self, job_id: str) -> Result[Job, str]:
        """Mark job as filled."""
        return await self._update_job_status(job_id, JobStatus.FILLED)
    
    # Bulk Operations
    async def expire_old_jobs(self, days_old: int = 30) -> int:
        """Expire jobs older than specified days."""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days_old)
            
            # This would require a custom repository method
            # For now, return 0 as placeholder
            expired_count = 0
            
            self.logger.info("Expired old jobs", count=expired_count, days_old=days_old)
            return expired_count
            
        except Exception as e:
            self.logger.error("Failed to expire old jobs", error=str(e))
            return 0
    
    # Private helper methods
    async def _update_job_status(self, job_id: str, status: JobStatus) -> Result[Job, str]:
        """Update job status."""
        try:
            from app.models.job import JobUpdate
            
            job_update = JobUpdate(status=status)
            return await self.update_job(job_id, job_update)
            
        except Exception as e:
            self.logger.error("Failed to update job status", 
                            job_id=job_id, status=status, error=str(e))
            return Result.error(f"Failed to update job status: {str(e)}")
    
    async def _initialize_job_analytics(self, job_id: str) -> None:
        """Initialize analytics for a new job."""
        try:
            analytics_data = {
                "views_today": 0,
                "views_week": 0,
                "views_month": 0,
                "applications_today": 0,
                "applications_week": 0,
                "applications_month": 0,
                "conversion_rate": 0.0,
                "top_matching_skills": []
            }
            
            await self.analytics_repo.update_job_analytics(job_id, analytics_data)
            
        except Exception as e:
            self.logger.warning("Failed to initialize job analytics", 
                              job_id=job_id, error=str(e))
    
    async def _update_job_analytics_async(self, job_id: str, event_type: str) -> None:
        """Update job analytics asynchronously."""
        try:
            # This would typically be done via a background task
            # For now, we'll update synchronously
            
            current_analytics = await self.analytics_repo.find_by_job_id(job_id)
            if not current_analytics:
                await self._initialize_job_analytics(job_id)
                current_analytics = await self.analytics_repo.find_by_job_id(job_id)
            
            if current_analytics:
                updates = {}
                
                if event_type == "view":
                    updates["views_today"] = current_analytics.views_today + 1
                    updates["views_week"] = current_analytics.views_week + 1
                    updates["views_month"] = current_analytics.views_month + 1
                elif event_type == "application":
                    updates["applications_today"] = current_analytics.applications_today + 1
                    updates["applications_week"] = current_analytics.applications_week + 1
                    updates["applications_month"] = current_analytics.applications_month + 1
                    
                    # Recalculate conversion rate
                    total_views = current_analytics.views_month
                    total_apps = updates["applications_month"]
                    if total_views > 0:
                        updates["conversion_rate"] = total_apps / total_views
                
                if updates:
                    await self.analytics_repo.update_job_analytics(job_id, updates)
            
        except Exception as e:
            self.logger.warning("Failed to update job analytics", 
                              job_id=job_id, event_type=event_type, error=str(e))
    
    def _generate_search_cache_key(self, filters: JobSearchFilters) -> str:
        """Generate cache key for search results."""
        import hashlib
        
        # Create a hash of the search parameters
        search_params = filters.model_dump()
        search_string = str(sorted(search_params.items()))
        cache_hash = hashlib.md5(search_string.encode()).hexdigest()
        
        return f"job_search:{cache_hash}"
    
    async def _count_search_results(self, filters: JobSearchFilters) -> int:
        """Count total search results for pagination."""
        try:
            # This would require a custom repository method
            # For now, return a placeholder count
            return 100  # Placeholder
            
        except Exception as e:
            self.logger.error("Failed to count search results", error=str(e))
            return 0
    
    async def _invalidate_job_cache(self, job_id: str) -> None:
        """Invalidate all job-related cache entries."""
        try:
            await self.cache.delete_pattern(f"job*:{job_id}")
            await self.cache.delete_pattern(f"similar_jobs:{job_id}*")
            await self.cache.delete_pattern("job_search:*")
        except Exception as e:
            self.logger.warning("Failed to invalidate job cache", 
                              job_id=job_id, error=str(e))