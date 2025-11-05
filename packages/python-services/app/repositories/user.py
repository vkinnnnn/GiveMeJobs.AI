"""User repository implementations."""

from typing import Dict, Any, List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from redis.asyncio import Redis

from app.models.database.user import (
    UserModel, SkillModel, ExperienceModel, EducationModel, UserProfileModel
)
from app.models.user import (
    User, UserCreate, UserUpdate,
    Skill, SkillCreate, SkillUpdate,
    Experience, ExperienceCreate, ExperienceUpdate,
    Education, EducationCreate, EducationUpdate,
    UserProfile, UserProfileUpdate
)
from .base import BaseRepository


class UserRepository(BaseRepository[UserModel, User, UserCreate, UserUpdate]):
    """User repository with async SQLAlchemy operations."""
    
    def __init__(self, db_session: AsyncSession, cache: Optional[Redis] = None):
        super().__init__(UserModel, db_session, cache)
    
    def _to_schema(self, db_obj: UserModel) -> User:
        """Convert UserModel to User schema."""
        return User(
            id=db_obj.id,
            email=db_obj.email,
            first_name=db_obj.first_name,
            last_name=db_obj.last_name,
            professional_headline=db_obj.professional_headline,
            email_verified=db_obj.email_verified,
            mfa_enabled=db_obj.mfa_enabled,
            is_active=db_obj.is_active,
            last_login=db_obj.last_login,
            created_at=db_obj.created_at,
            updated_at=db_obj.updated_at
        )
    
    def _to_create_dict(self, schema: UserCreate) -> Dict[str, Any]:
        """Convert UserCreate to dictionary."""
        return {
            "email": schema.email,
            "first_name": schema.first_name,
            "last_name": schema.last_name,
            "professional_headline": schema.professional_headline,
            "password_hash": schema.password,  # This should be hashed before calling
        }
    
    def _to_update_dict(self, schema: UserUpdate) -> Dict[str, Any]:
        """Convert UserUpdate to dictionary."""
        return schema.model_dump(exclude_unset=True)
    
    async def find_by_email(self, email: str) -> Optional[User]:
        """Find user by email address."""
        # Try cache first
        cache_key = self._get_cache_key(f"email:{email}")
        cached_data = await self._get_from_cache(cache_key)
        if cached_data:
            return User(**cached_data)
        
        # Query database
        query = select(UserModel).where(UserModel.email == email)
        result = await self.db.execute(query)
        db_obj = result.scalar_one_or_none()
        
        if db_obj:
            user = self._to_schema(db_obj)
            # Cache the result
            await self._set_cache(cache_key, user.model_dump())
            return user
        
        return None
    
    async def find_with_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Find user with complete profile including skills, experience, and education."""
        query = (
            select(UserModel)
            .where(UserModel.id == user_id)
            .options(
                selectinload(UserModel.skills),
                selectinload(UserModel.experience),
                selectinload(UserModel.education),
                selectinload(UserModel.profile)
            )
        )
        
        result = await self.db.execute(query)
        db_obj = result.scalar_one_or_none()
        
        if not db_obj:
            return None
        
        # Convert to comprehensive profile
        user = self._to_schema(db_obj)
        
        # Convert related objects
        skills = [SkillRepository._to_schema_static(skill) for skill in db_obj.skills]
        experience = [ExperienceRepository._to_schema_static(exp) for exp in db_obj.experience]
        education = [EducationRepository._to_schema_static(edu) for edu in db_obj.education]
        
        profile_data = {
            "user": user,
            "skills": skills,
            "experience": experience,
            "education": education,
            "profile": None
        }
        
        if db_obj.profile:
            profile_data["profile"] = {
                "preferences": db_obj.profile.preferences,
                "skill_score": db_obj.profile.skill_score,
                "profile_completeness": db_obj.profile.profile_completeness,
                "last_calculated": db_obj.profile.last_calculated
            }
        
        return profile_data


class SkillRepository(BaseRepository[SkillModel, Skill, SkillCreate, SkillUpdate]):
    """Skill repository with async SQLAlchemy operations."""
    
    def __init__(self, db_session: AsyncSession, cache: Optional[Redis] = None):
        super().__init__(SkillModel, db_session, cache)
    
    def _to_schema(self, db_obj: SkillModel) -> Skill:
        """Convert SkillModel to Skill schema."""
        return self._to_schema_static(db_obj)
    
    @staticmethod
    def _to_schema_static(db_obj: SkillModel) -> Skill:
        """Static method to convert SkillModel to Skill schema."""
        return Skill(
            id=db_obj.id,
            user_id=db_obj.user_id,
            name=db_obj.name,
            category=db_obj.category,
            proficiency_level=db_obj.proficiency_level,
            years_of_experience=db_obj.years_of_experience,
            last_used=db_obj.last_used,
            endorsements=db_obj.endorsements,
            created_at=db_obj.created_at,
            updated_at=db_obj.updated_at
        )
    
    def _to_create_dict(self, schema: SkillCreate) -> Dict[str, Any]:
        """Convert SkillCreate to dictionary."""
        return schema.model_dump()
    
    def _to_update_dict(self, schema: SkillUpdate) -> Dict[str, Any]:
        """Convert SkillUpdate to dictionary."""
        return schema.model_dump(exclude_unset=True)
    
    async def find_by_user_id(self, user_id: str) -> List[Skill]:
        """Find all skills for a user."""
        query = (
            select(SkillModel)
            .where(SkillModel.user_id == user_id)
            .where(SkillModel.deleted_at.is_(None))
            .order_by(SkillModel.proficiency_level.desc(), SkillModel.name)
        )
        
        result = await self.db.execute(query)
        db_objs = result.scalars().all()
        
        return [self._to_schema(db_obj) for db_obj in db_objs]
    
    async def find_by_category(self, user_id: str, category: str) -> List[Skill]:
        """Find skills by category for a user."""
        query = (
            select(SkillModel)
            .where(SkillModel.user_id == user_id)
            .where(SkillModel.category == category)
            .where(SkillModel.deleted_at.is_(None))
            .order_by(SkillModel.proficiency_level.desc())
        )
        
        result = await self.db.execute(query)
        db_objs = result.scalars().all()
        
        return [self._to_schema(db_obj) for db_obj in db_objs]


class ExperienceRepository(BaseRepository[ExperienceModel, Experience, ExperienceCreate, ExperienceUpdate]):
    """Experience repository with async SQLAlchemy operations."""
    
    def __init__(self, db_session: AsyncSession, cache: Optional[Redis] = None):
        super().__init__(ExperienceModel, db_session, cache)
    
    def _to_schema(self, db_obj: ExperienceModel) -> Experience:
        """Convert ExperienceModel to Experience schema."""
        return self._to_schema_static(db_obj)
    
    @staticmethod
    def _to_schema_static(db_obj: ExperienceModel) -> Experience:
        """Static method to convert ExperienceModel to Experience schema."""
        return Experience(
            id=db_obj.id,
            user_id=db_obj.user_id,
            title=db_obj.title,
            company=db_obj.company,
            location=db_obj.location,
            start_date=db_obj.start_date,
            end_date=db_obj.end_date,
            description=db_obj.description,
            is_current=db_obj.is_current,
            skills=db_obj.skills,
            created_at=db_obj.created_at,
            updated_at=db_obj.updated_at
        )
    
    def _to_create_dict(self, schema: ExperienceCreate) -> Dict[str, Any]:
        """Convert ExperienceCreate to dictionary."""
        return schema.model_dump()
    
    def _to_update_dict(self, schema: ExperienceUpdate) -> Dict[str, Any]:
        """Convert ExperienceUpdate to dictionary."""
        return schema.model_dump(exclude_unset=True)
    
    async def find_by_user_id(self, user_id: str) -> List[Experience]:
        """Find all experience for a user, ordered by date."""
        query = (
            select(ExperienceModel)
            .where(ExperienceModel.user_id == user_id)
            .where(ExperienceModel.deleted_at.is_(None))
            .order_by(ExperienceModel.is_current.desc(), ExperienceModel.start_date.desc())
        )
        
        result = await self.db.execute(query)
        db_objs = result.scalars().all()
        
        return [self._to_schema(db_obj) for db_obj in db_objs]
    
    async def find_current_position(self, user_id: str) -> Optional[Experience]:
        """Find user's current position."""
        query = (
            select(ExperienceModel)
            .where(ExperienceModel.user_id == user_id)
            .where(ExperienceModel.is_current == True)
            .where(ExperienceModel.deleted_at.is_(None))
        )
        
        result = await self.db.execute(query)
        db_obj = result.scalar_one_or_none()
        
        return self._to_schema(db_obj) if db_obj else None


class EducationRepository(BaseRepository[EducationModel, Education, EducationCreate, EducationUpdate]):
    """Education repository with async SQLAlchemy operations."""
    
    def __init__(self, db_session: AsyncSession, cache: Optional[Redis] = None):
        super().__init__(EducationModel, db_session, cache)
    
    def _to_schema(self, db_obj: EducationModel) -> Education:
        """Convert EducationModel to Education schema."""
        return self._to_schema_static(db_obj)
    
    @staticmethod
    def _to_schema_static(db_obj: EducationModel) -> Education:
        """Static method to convert EducationModel to Education schema."""
        return Education(
            id=db_obj.id,
            user_id=db_obj.user_id,
            degree=db_obj.degree,
            institution=db_obj.institution,
            field_of_study=db_obj.field_of_study,
            start_year=db_obj.start_year,
            end_year=db_obj.end_year,
            gpa=db_obj.gpa,
            is_current=db_obj.is_current,
            created_at=db_obj.created_at,
            updated_at=db_obj.updated_at
        )
    
    def _to_create_dict(self, schema: EducationCreate) -> Dict[str, Any]:
        """Convert EducationCreate to dictionary."""
        return schema.model_dump()
    
    def _to_update_dict(self, schema: EducationUpdate) -> Dict[str, Any]:
        """Convert EducationUpdate to dictionary."""
        return schema.model_dump(exclude_unset=True)
    
    async def find_by_user_id(self, user_id: str) -> List[Education]:
        """Find all education for a user, ordered by date."""
        query = (
            select(EducationModel)
            .where(EducationModel.user_id == user_id)
            .where(EducationModel.deleted_at.is_(None))
            .order_by(EducationModel.is_current.desc(), EducationModel.end_year.desc())
        )
        
        result = await self.db.execute(query)
        db_objs = result.scalars().all()
        
        return [self._to_schema(db_obj) for db_obj in db_objs]