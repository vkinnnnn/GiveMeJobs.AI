"""Job repository implementations."""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

from sqlalchemy import select, and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from redis.asyncio import Redis

from app.models.database.job import JobModel, JobAnalyticsModel
from app.models.job import (
    Job, JobCreate, JobUpdate, JobAnalytics,
    JobSearchFilters, JobStatus, JobSource
)
from .base import BaseRepository, QueryCriteria


class JobRepository(BaseRepository[JobModel, Job, JobCreate, JobUpdate]):
    """Job repository with async SQLAlchemy operations."""
    
    def __init__(self, db_session: AsyncSession, cache: Optional[Redis] = None):
        super().__init__(JobModel, db_session, cache)
    
    def _to_schema(self, db_obj: JobModel) -> Job:
        """Convert JobModel to Job schema."""
        return Job(
            id=db_obj.id,
            title=db_obj.title,
            company=db_obj.company,
            description=db_obj.description,
            location=db_obj.location,
            remote_type=db_obj.remote_type,
            job_type=db_obj.job_type,
            industry=db_obj.industry,
            company_size=db_obj.company_size,
            requirements=db_obj.requirements,
            required_skills=db_obj.required_skills,
            preferred_skills=db_obj.preferred_skills,
            salary_min=db_obj.salary_min,
            salary_max=db_obj.salary_max,
            salary_type=db_obj.salary_type,
            benefits=db_obj.benefits,
            application_url=db_obj.application_url,
            application_email=db_obj.application_email,
            source=db_obj.source,
            external_id=db_obj.external_id,
            status=db_obj.status,
            posted_date=db_obj.posted_date,
            expires_date=db_obj.expires_date,
            view_count=db_obj.view_count,
            application_count=db_obj.application_count,
            created_at=db_obj.created_at,
            updated_at=db_obj.updated_at
        )
    
    def _to_create_dict(self, schema: JobCreate) -> Dict[str, Any]:
        """Convert JobCreate to dictionary."""
        return schema.model_dump()
    
    def _to_update_dict(self, schema: JobUpdate) -> Dict[str, Any]:
        """Convert JobUpdate to dictionary."""
        return schema.model_dump(exclude_unset=True)
    
    async def search_jobs(self, filters: JobSearchFilters) -> List[Job]:
        """Search jobs with advanced filtering."""
        query = select(JobModel)
        conditions = []
        
        # Only active jobs by default
        conditions.append(JobModel.status == JobStatus.ACTIVE)
        
        # Exclude expired jobs if requested
        if filters.exclude_expired:
            now = datetime.utcnow()
            conditions.append(
                or_(
                    JobModel.expires_date.is_(None),
                    JobModel.expires_date > now
                )
            )
        
        # Keyword search
        if filters.keywords:
            keyword_conditions = []
            keywords = filters.keywords.lower().split()
            for keyword in keywords:
                keyword_conditions.extend([
                    JobModel.title.ilike(f"%{keyword}%"),
                    JobModel.description.ilike(f"%{keyword}%"),
                    JobModel.company.ilike(f"%{keyword}%")
                ])
            if keyword_conditions:
                conditions.append(or_(*keyword_conditions))
        
        # Location filter
        if filters.location:
            conditions.append(JobModel.location.ilike(f"%{filters.location}%"))
        
        # Remote type filter
        if filters.remote_type:
            conditions.append(JobModel.remote_type.in_(filters.remote_type))
        
        # Job type filter
        if filters.job_types:
            conditions.append(JobModel.job_type.in_(filters.job_types))
        
        # Industry filter
        if filters.industries:
            conditions.append(JobModel.industry.in_(filters.industries))
        
        # Company size filter
        if filters.company_sizes:
            conditions.append(JobModel.company_size.in_(filters.company_sizes))
        
        # Salary range filter
        if filters.salary_min:
            conditions.append(
                or_(
                    JobModel.salary_max.is_(None),
                    JobModel.salary_max >= filters.salary_min
                )
            )
        
        if filters.salary_max:
            conditions.append(
                or_(
                    JobModel.salary_min.is_(None),
                    JobModel.salary_min <= filters.salary_max
                )
            )
        
        # Required skills filter
        if filters.required_skills:
            for skill in filters.required_skills:
                conditions.append(
                    or_(
                        JobModel.required_skills.any(skill),
                        JobModel.preferred_skills.any(skill)
                    )
                )
        
        # Posted within days filter
        if filters.posted_within_days:
            cutoff_date = datetime.utcnow() - timedelta(days=filters.posted_within_days)
            conditions.append(
                or_(
                    JobModel.posted_date.is_(None),
                    JobModel.posted_date >= cutoff_date
                )
            )
        
        # Apply all conditions
        if conditions:
            query = query.where(and_(*conditions))
        
        # Soft delete filter
        query = query.where(JobModel.deleted_at.is_(None))
        
        # Sorting
        if filters.sort_by == "posted_date":
            if filters.sort_order == "asc":
                query = query.order_by(JobModel.posted_date.asc())
            else:
                query = query.order_by(JobModel.posted_date.desc())
        elif filters.sort_by == "salary":
            if filters.sort_order == "asc":
                query = query.order_by(JobModel.salary_min.asc())
            else:
                query = query.order_by(JobModel.salary_max.desc())
        elif filters.sort_by == "title":
            if filters.sort_order == "asc":
                query = query.order_by(JobModel.title.asc())
            else:
                query = query.order_by(JobModel.title.desc())
        else:
            # Default relevance sorting (by posted date desc)
            query = query.order_by(JobModel.posted_date.desc())
        
        # Pagination
        offset = (filters.page - 1) * filters.size
        query = query.offset(offset).limit(filters.size)
        
        # Execute query
        result = await self.db.execute(query)
        db_objs = result.scalars().all()
        
        return [self._to_schema(db_obj) for db_obj in db_objs]
    
    async def find_by_external_id(self, source: JobSource, external_id: str) -> Optional[Job]:
        """Find job by external ID and source."""
        query = (
            select(JobModel)
            .where(JobModel.source == source)
            .where(JobModel.external_id == external_id)
            .where(JobModel.deleted_at.is_(None))
        )
        
        result = await self.db.execute(query)
        db_obj = result.scalar_one_or_none()
        
        return self._to_schema(db_obj) if db_obj else None
    
    async def find_by_company(self, company: str, limit: int = 10) -> List[Job]:
        """Find jobs by company name."""
        query = (
            select(JobModel)
            .where(JobModel.company.ilike(f"%{company}%"))
            .where(JobModel.status == JobStatus.ACTIVE)
            .where(JobModel.deleted_at.is_(None))
            .order_by(JobModel.posted_date.desc())
            .limit(limit)
        )
        
        result = await self.db.execute(query)
        db_objs = result.scalars().all()
        
        return [self._to_schema(db_obj) for db_obj in db_objs]
    
    async def find_similar_jobs(self, job_id: str, limit: int = 5) -> List[Job]:
        """Find similar jobs based on title, company, and skills."""
        # First get the reference job
        reference_job = await self.find_by_id(job_id)
        if not reference_job:
            return []
        
        query = (
            select(JobModel)
            .where(JobModel.id != job_id)
            .where(JobModel.status == JobStatus.ACTIVE)
            .where(JobModel.deleted_at.is_(None))
        )
        
        # Add similarity conditions
        similarity_conditions = []
        
        # Same industry
        if reference_job.industry:
            similarity_conditions.append(JobModel.industry == reference_job.industry)
        
        # Similar title keywords
        if reference_job.title:
            title_words = reference_job.title.lower().split()
            for word in title_words:
                if len(word) > 3:  # Only consider meaningful words
                    similarity_conditions.append(JobModel.title.ilike(f"%{word}%"))
        
        # Overlapping skills
        if reference_job.required_skills:
            for skill in reference_job.required_skills:
                similarity_conditions.append(
                    or_(
                        JobModel.required_skills.any(skill),
                        JobModel.preferred_skills.any(skill)
                    )
                )
        
        if similarity_conditions:
            query = query.where(or_(*similarity_conditions))
        
        query = query.order_by(JobModel.posted_date.desc()).limit(limit)
        
        result = await self.db.execute(query)
        db_objs = result.scalars().all()
        
        return [self._to_schema(db_obj) for db_obj in db_objs]
    
    async def increment_view_count(self, job_id: str) -> None:
        """Increment job view count."""
        from sqlalchemy import update
        
        query = (
            update(JobModel)
            .where(JobModel.id == job_id)
            .values(view_count=JobModel.view_count + 1)
        )
        
        await self.db.execute(query)
        await self.db.commit()
        
        # Invalidate cache
        cache_key = self._get_cache_key(job_id)
        await self._delete_cache(cache_key)
    
    async def increment_application_count(self, job_id: str) -> None:
        """Increment job application count."""
        from sqlalchemy import update
        
        query = (
            update(JobModel)
            .where(JobModel.id == job_id)
            .values(application_count=JobModel.application_count + 1)
        )
        
        await self.db.execute(query)
        await self.db.commit()
        
        # Invalidate cache
        cache_key = self._get_cache_key(job_id)
        await self._delete_cache(cache_key)


class JobAnalyticsRepository(BaseRepository[JobAnalyticsModel, JobAnalytics, JobAnalytics, JobAnalytics]):
    """Job analytics repository with async SQLAlchemy operations."""
    
    def __init__(self, db_session: AsyncSession, cache: Optional[Redis] = None):
        super().__init__(JobAnalyticsModel, db_session, cache)
    
    def _to_schema(self, db_obj: JobAnalyticsModel) -> JobAnalytics:
        """Convert JobAnalyticsModel to JobAnalytics schema."""
        return JobAnalytics(
            job_id=db_obj.job_id,
            views_today=db_obj.views_today,
            views_week=db_obj.views_week,
            views_month=db_obj.views_month,
            applications_today=db_obj.applications_today,
            applications_week=db_obj.applications_week,
            applications_month=db_obj.applications_month,
            conversion_rate=db_obj.conversion_rate,
            avg_match_score=db_obj.avg_match_score,
            top_matching_skills=db_obj.top_matching_skills,
            last_updated=db_obj.updated_at
        )
    
    def _to_create_dict(self, schema: JobAnalytics) -> Dict[str, Any]:
        """Convert JobAnalytics to dictionary."""
        return schema.model_dump()
    
    def _to_update_dict(self, schema: JobAnalytics) -> Dict[str, Any]:
        """Convert JobAnalytics to dictionary."""
        return schema.model_dump(exclude_unset=True)
    
    async def find_by_job_id(self, job_id: str) -> Optional[JobAnalytics]:
        """Find analytics by job ID."""
        query = select(JobAnalyticsModel).where(JobAnalyticsModel.job_id == job_id)
        result = await self.db.execute(query)
        db_obj = result.scalar_one_or_none()
        
        return self._to_schema(db_obj) if db_obj else None
    
    async def update_job_analytics(self, job_id: str, analytics_data: Dict[str, Any]) -> JobAnalytics:
        """Update or create job analytics."""
        from sqlalchemy import update
        from sqlalchemy.dialects.postgresql import insert
        
        # Use PostgreSQL UPSERT (INSERT ... ON CONFLICT)
        stmt = insert(JobAnalyticsModel).values(
            job_id=job_id,
            **analytics_data
        )
        
        # On conflict, update all fields except job_id
        update_dict = {k: v for k, v in analytics_data.items() if k != 'job_id'}
        stmt = stmt.on_conflict_do_update(
            index_elements=['job_id'],
            set_=update_dict
        ).returning(JobAnalyticsModel)
        
        result = await self.db.execute(stmt)
        await self.db.commit()
        
        db_obj = result.scalar_one()
        return self._to_schema(db_obj)