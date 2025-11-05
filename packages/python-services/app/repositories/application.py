"""Application repository implementations."""

from typing import Dict, Any, List, Optional
from datetime import datetime

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from redis.asyncio import Redis

from app.models.database.application import ApplicationModel
from app.models.application import Application, ApplicationCreate, ApplicationUpdate
from .base import BaseRepository


class ApplicationRepository(BaseRepository[ApplicationModel, Application, ApplicationCreate, ApplicationUpdate]):
    """Application repository with async SQLAlchemy operations."""
    
    def __init__(self, db_session: AsyncSession, cache: Optional[Redis] = None):
        super().__init__(ApplicationModel, db_session, cache)
    
    def _to_schema(self, db_obj: ApplicationModel) -> Application:
        """Convert ApplicationModel to Application schema."""
        return Application(
            id=db_obj.id,
            user_id=db_obj.user_id,
            job_id=db_obj.job_id,
            status=db_obj.status,
            cover_letter=db_obj.cover_letter,
            resume_version=db_obj.resume_version,
            applied_date=db_obj.applied_date,
            response_date=db_obj.response_date,
            interview_date=db_obj.interview_date,
            match_score=db_obj.match_score,
            match_factors=db_obj.match_factors,
            notes=db_obj.notes,
            feedback=db_obj.feedback,
            external_application_id=db_obj.external_application_id,
            created_at=db_obj.created_at,
            updated_at=db_obj.updated_at
        )
    
    def _to_create_dict(self, schema: ApplicationCreate) -> Dict[str, Any]:
        """Convert ApplicationCreate to dictionary."""
        data = schema.model_dump()
        # Set applied_date to now if not provided
        if 'applied_date' not in data:
            data['applied_date'] = datetime.utcnow()
        return data
    
    def _to_update_dict(self, schema: ApplicationUpdate) -> Dict[str, Any]:
        """Convert ApplicationUpdate to dictionary."""
        return schema.model_dump(exclude_unset=True)
    
    async def find_by_user_id(self, user_id: str) -> List[Application]:
        """Find all applications for a user."""
        query = (
            select(ApplicationModel)
            .where(ApplicationModel.user_id == user_id)
            .order_by(ApplicationModel.applied_date.desc())
        )
        
        result = await self.db.execute(query)
        db_objs = result.scalars().all()
        
        return [self._to_schema(db_obj) for db_obj in db_objs]
    
    async def find_by_job_id(self, job_id: str) -> List[Application]:
        """Find all applications for a job."""
        query = (
            select(ApplicationModel)
            .where(ApplicationModel.job_id == job_id)
            .order_by(ApplicationModel.applied_date.desc())
        )
        
        result = await self.db.execute(query)
        db_objs = result.scalars().all()
        
        return [self._to_schema(db_obj) for db_obj in db_objs]
    
    async def find_by_user_and_job(self, user_id: str, job_id: str) -> Optional[Application]:
        """Find application by user and job."""
        query = (
            select(ApplicationModel)
            .where(ApplicationModel.user_id == user_id)
            .where(ApplicationModel.job_id == job_id)
        )
        
        result = await self.db.execute(query)
        db_obj = result.scalar_one_or_none()
        
        return self._to_schema(db_obj) if db_obj else None
    
    async def find_by_status(self, user_id: str, status: str) -> List[Application]:
        """Find applications by status for a user."""
        query = (
            select(ApplicationModel)
            .where(ApplicationModel.user_id == user_id)
            .where(ApplicationModel.status == status)
            .order_by(ApplicationModel.applied_date.desc())
        )
        
        result = await self.db.execute(query)
        db_objs = result.scalars().all()
        
        return [self._to_schema(db_obj) for db_obj in db_objs]
    
    async def get_application_stats(self, user_id: str) -> Dict[str, Any]:
        """Get application statistics for a user."""
        from sqlalchemy import func
        
        # Total applications
        total_query = (
            select(func.count(ApplicationModel.id))
            .where(ApplicationModel.user_id == user_id)
        )
        total_result = await self.db.execute(total_query)
        total_applications = total_result.scalar()
        
        # Applications by status
        status_query = (
            select(ApplicationModel.status, func.count(ApplicationModel.id))
            .where(ApplicationModel.user_id == user_id)
            .group_by(ApplicationModel.status)
        )
        status_result = await self.db.execute(status_query)
        status_counts = dict(status_result.fetchall())
        
        # Response rate (applications with response)
        response_query = (
            select(func.count(ApplicationModel.id))
            .where(ApplicationModel.user_id == user_id)
            .where(ApplicationModel.response_date.is_not(None))
        )
        response_result = await self.db.execute(response_query)
        responses = response_result.scalar()
        
        response_rate = (responses / total_applications * 100) if total_applications > 0 else 0
        
        # Interview rate
        interview_query = (
            select(func.count(ApplicationModel.id))
            .where(ApplicationModel.user_id == user_id)
            .where(ApplicationModel.interview_date.is_not(None))
        )
        interview_result = await self.db.execute(interview_query)
        interviews = interview_result.scalar()
        
        interview_rate = (interviews / total_applications * 100) if total_applications > 0 else 0
        
        # Average match score
        match_score_query = (
            select(func.avg(ApplicationModel.match_score))
            .where(ApplicationModel.user_id == user_id)
            .where(ApplicationModel.match_score.is_not(None))
        )
        match_score_result = await self.db.execute(match_score_query)
        avg_match_score = match_score_result.scalar()
        
        return {
            "total_applications": total_applications,
            "status_counts": status_counts,
            "response_rate": round(response_rate, 2),
            "interview_rate": round(interview_rate, 2),
            "avg_match_score": round(avg_match_score, 2) if avg_match_score else None
        }