"""User service with business logic and validation."""

import bcrypt
from typing import Dict, List, Optional, Any
from uuid import UUID

from app.core.cache import CacheService
from app.core.logging import get_logger
from app.models.user import (
    User, UserCreate, UserUpdate,
    Skill, SkillCreate, SkillUpdate,
    Experience, ExperienceCreate, ExperienceUpdate,
    Education, EducationCreate, EducationUpdate,
    UserProfile, UserProfileUpdate
)
from app.models.base import Result
from app.repositories.user import (
    UserRepository, SkillRepository, ExperienceRepository, EducationRepository
)

logger = get_logger(__name__)


class UserService:
    """User service with comprehensive business logic."""
    
    def __init__(
        self,
        user_repo: UserRepository,
        skill_repo: SkillRepository,
        experience_repo: ExperienceRepository,
        education_repo: EducationRepository,
        cache: CacheService
    ):
        self.user_repo = user_repo
        self.skill_repo = skill_repo
        self.experience_repo = experience_repo
        self.education_repo = education_repo
        self.cache = cache
        self.logger = get_logger(f"{__name__}.UserService")
    
    # User Management
    async def create_user(self, user_data: UserCreate) -> Result[User, str]:
        """Create a new user with validation and password hashing."""
        try:
            # Check if user already exists
            existing_user = await self.user_repo.find_by_email(user_data.email)
            if existing_user:
                return Result.error("Email address already registered")
            
            # Hash password
            password_hash = bcrypt.hashpw(
                user_data.password.encode('utf-8'),
                bcrypt.gensalt()
            ).decode('utf-8')
            
            # Create user with hashed password
            create_data = user_data.model_copy()
            create_data.password = password_hash
            
            user = await self.user_repo.create(create_data)
            
            # Initialize user profile
            await self._initialize_user_profile(user.id)
            
            self.logger.info("User created successfully", user_id=user.id, email=user.email)
            return Result.success(user)
            
        except Exception as e:
            self.logger.error("Failed to create user", error=str(e), email=user_data.email)
            return Result.error(f"Failed to create user: {str(e)}")
    
    async def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID."""
        try:
            return await self.user_repo.find_by_id(user_id)
        except Exception as e:
            self.logger.error("Failed to get user by ID", user_id=user_id, error=str(e))
            return None
    
    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email address."""
        try:
            return await self.user_repo.find_by_email(email)
        except Exception as e:
            self.logger.error("Failed to get user by email", email=email, error=str(e))
            return None
    
    async def update_user(self, user_id: str, user_data: UserUpdate) -> Result[User, str]:
        """Update user information."""
        try:
            # Check if user exists
            existing_user = await self.user_repo.find_by_id(user_id)
            if not existing_user:
                return Result.error("User not found")
            
            # If email is being updated, check for conflicts
            if user_data.email and user_data.email != existing_user.email:
                email_conflict = await self.user_repo.find_by_email(user_data.email)
                if email_conflict:
                    return Result.error("Email address already in use")
            
            updated_user = await self.user_repo.update(user_id, user_data)
            if not updated_user:
                return Result.error("Failed to update user")
            
            # Invalidate user profile cache
            await self._invalidate_user_cache(user_id)
            
            self.logger.info("User updated successfully", user_id=user_id)
            return Result.success(updated_user)
            
        except Exception as e:
            self.logger.error("Failed to update user", user_id=user_id, error=str(e))
            return Result.error(f"Failed to update user: {str(e)}")
    
    async def delete_user(self, user_id: str) -> Result[bool, str]:
        """Soft delete user account."""
        try:
            success = await self.user_repo.delete(user_id, soft_delete=True)
            if success:
                await self._invalidate_user_cache(user_id)
                self.logger.info("User deleted successfully", user_id=user_id)
                return Result.success(True)
            else:
                return Result.error("User not found")
                
        except Exception as e:
            self.logger.error("Failed to delete user", user_id=user_id, error=str(e))
            return Result.error(f"Failed to delete user: {str(e)}")
    
    # User Profile Management
    async def get_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get complete user profile with skills, experience, and education."""
        try:
            # Try cache first
            cache_key = f"user_profile:{user_id}"
            cached_profile = await self.cache.get(cache_key)
            if cached_profile:
                return cached_profile
            
            # Get from database
            profile_data = await self.user_repo.find_with_profile(user_id)
            if profile_data:
                # Cache the result
                await self.cache.set(cache_key, profile_data, ttl=1800)  # 30 minutes
            
            return profile_data
            
        except Exception as e:
            self.logger.error("Failed to get user profile", user_id=user_id, error=str(e))
            return None
    
    # Skills Management
    async def get_user_skills(self, user_id: str) -> List[Skill]:
        """Get all skills for a user."""
        try:
            return await self.skill_repo.find_by_user_id(user_id)
        except Exception as e:
            self.logger.error("Failed to get user skills", user_id=user_id, error=str(e))
            return []
    
    async def create_skill(self, user_id: str, skill_data: SkillCreate) -> Result[Skill, str]:
        """Add a new skill to user profile."""
        try:
            # Add user_id to skill data
            skill_dict = skill_data.model_dump()
            skill_dict['user_id'] = user_id
            
            skill = await self.skill_repo.create(SkillCreate(**skill_dict))
            
            # Invalidate user profile cache
            await self._invalidate_user_cache(user_id)
            
            self.logger.info("Skill created successfully", 
                           user_id=user_id, skill_name=skill.name)
            return Result.success(skill)
            
        except Exception as e:
            self.logger.error("Failed to create skill", 
                            user_id=user_id, error=str(e))
            return Result.error(f"Failed to create skill: {str(e)}")
    
    async def update_skill(self, skill_id: str, skill_data: SkillUpdate) -> Result[Skill, str]:
        """Update a user skill."""
        try:
            updated_skill = await self.skill_repo.update(skill_id, skill_data)
            if not updated_skill:
                return Result.error("Skill not found")
            
            # Invalidate user profile cache
            await self._invalidate_user_cache(updated_skill.user_id)
            
            self.logger.info("Skill updated successfully", skill_id=skill_id)
            return Result.success(updated_skill)
            
        except Exception as e:
            self.logger.error("Failed to update skill", skill_id=skill_id, error=str(e))
            return Result.error(f"Failed to update skill: {str(e)}")
    
    async def delete_skill(self, skill_id: str) -> Result[bool, str]:
        """Delete a user skill."""
        try:
            # Get skill to get user_id for cache invalidation
            skill = await self.skill_repo.find_by_id(skill_id)
            if not skill:
                return Result.error("Skill not found")
            
            success = await self.skill_repo.delete(skill_id)
            if success:
                await self._invalidate_user_cache(skill.user_id)
                self.logger.info("Skill deleted successfully", skill_id=skill_id)
                return Result.success(True)
            else:
                return Result.error("Failed to delete skill")
                
        except Exception as e:
            self.logger.error("Failed to delete skill", skill_id=skill_id, error=str(e))
            return Result.error(f"Failed to delete skill: {str(e)}")
    
    # Experience Management
    async def get_user_experience(self, user_id: str) -> List[Experience]:
        """Get all work experience for a user."""
        try:
            return await self.experience_repo.find_by_user_id(user_id)
        except Exception as e:
            self.logger.error("Failed to get user experience", user_id=user_id, error=str(e))
            return []
    
    async def create_experience(self, user_id: str, exp_data: ExperienceCreate) -> Result[Experience, str]:
        """Add new work experience to user profile."""
        try:
            # Add user_id to experience data
            exp_dict = exp_data.model_dump()
            exp_dict['user_id'] = user_id
            
            experience = await self.experience_repo.create(ExperienceCreate(**exp_dict))
            
            # Invalidate user profile cache
            await self._invalidate_user_cache(user_id)
            
            self.logger.info("Experience created successfully", 
                           user_id=user_id, title=experience.title)
            return Result.success(experience)
            
        except Exception as e:
            self.logger.error("Failed to create experience", 
                            user_id=user_id, error=str(e))
            return Result.error(f"Failed to create experience: {str(e)}")
    
    async def update_experience(self, exp_id: str, exp_data: ExperienceUpdate) -> Result[Experience, str]:
        """Update work experience."""
        try:
            updated_exp = await self.experience_repo.update(exp_id, exp_data)
            if not updated_exp:
                return Result.error("Experience not found")
            
            # Invalidate user profile cache
            await self._invalidate_user_cache(updated_exp.user_id)
            
            self.logger.info("Experience updated successfully", experience_id=exp_id)
            return Result.success(updated_exp)
            
        except Exception as e:
            self.logger.error("Failed to update experience", experience_id=exp_id, error=str(e))
            return Result.error(f"Failed to update experience: {str(e)}")
    
    async def delete_experience(self, exp_id: str) -> Result[bool, str]:
        """Delete work experience."""
        try:
            # Get experience to get user_id for cache invalidation
            experience = await self.experience_repo.find_by_id(exp_id)
            if not experience:
                return Result.error("Experience not found")
            
            success = await self.experience_repo.delete(exp_id)
            if success:
                await self._invalidate_user_cache(experience.user_id)
                self.logger.info("Experience deleted successfully", experience_id=exp_id)
                return Result.success(True)
            else:
                return Result.error("Failed to delete experience")
                
        except Exception as e:
            self.logger.error("Failed to delete experience", experience_id=exp_id, error=str(e))
            return Result.error(f"Failed to delete experience: {str(e)}")
    
    # Education Management
    async def get_user_education(self, user_id: str) -> List[Education]:
        """Get all education for a user."""
        try:
            return await self.education_repo.find_by_user_id(user_id)
        except Exception as e:
            self.logger.error("Failed to get user education", user_id=user_id, error=str(e))
            return []
    
    async def create_education(self, user_id: str, edu_data: EducationCreate) -> Result[Education, str]:
        """Add new education to user profile."""
        try:
            # Add user_id to education data
            edu_dict = edu_data.model_dump()
            edu_dict['user_id'] = user_id
            
            education = await self.education_repo.create(EducationCreate(**edu_dict))
            
            # Invalidate user profile cache
            await self._invalidate_user_cache(user_id)
            
            self.logger.info("Education created successfully", 
                           user_id=user_id, degree=education.degree)
            return Result.success(education)
            
        except Exception as e:
            self.logger.error("Failed to create education", 
                            user_id=user_id, error=str(e))
            return Result.error(f"Failed to create education: {str(e)}")
    
    async def update_education(self, edu_id: str, edu_data: EducationUpdate) -> Result[Education, str]:
        """Update education."""
        try:
            updated_edu = await self.education_repo.update(edu_id, edu_data)
            if not updated_edu:
                return Result.error("Education not found")
            
            # Invalidate user profile cache
            await self._invalidate_user_cache(updated_edu.user_id)
            
            self.logger.info("Education updated successfully", education_id=edu_id)
            return Result.success(updated_edu)
            
        except Exception as e:
            self.logger.error("Failed to update education", education_id=edu_id, error=str(e))
            return Result.error(f"Failed to update education: {str(e)}")
    
    async def delete_education(self, edu_id: str) -> Result[bool, str]:
        """Delete education."""
        try:
            # Get education to get user_id for cache invalidation
            education = await self.education_repo.find_by_id(edu_id)
            if not education:
                return Result.error("Education not found")
            
            success = await self.education_repo.delete(edu_id)
            if success:
                await self._invalidate_user_cache(education.user_id)
                self.logger.info("Education deleted successfully", education_id=edu_id)
                return Result.success(True)
            else:
                return Result.error("Failed to delete education")
                
        except Exception as e:
            self.logger.error("Failed to delete education", education_id=edu_id, error=str(e))
            return Result.error(f"Failed to delete education: {str(e)}")
    
    # Profile Analytics
    async def calculate_profile_completeness(self, user_id: str) -> float:
        """Calculate user profile completeness percentage."""
        try:
            profile_data = await self.get_user_profile(user_id)
            if not profile_data:
                return 0.0
            
            score = 0.0
            max_score = 100.0
            
            user = profile_data.get('user')
            if user:
                # Basic info (30 points)
                if user.get('first_name'):
                    score += 5
                if user.get('last_name'):
                    score += 5
                if user.get('email'):
                    score += 5
                if user.get('professional_headline'):
                    score += 15
            
            # Skills (25 points)
            skills = profile_data.get('skills', [])
            if skills:
                score += min(25, len(skills) * 5)  # 5 points per skill, max 25
            
            # Experience (25 points)
            experience = profile_data.get('experience', [])
            if experience:
                score += min(25, len(experience) * 8)  # 8 points per experience, max 25
            
            # Education (20 points)
            education = profile_data.get('education', [])
            if education:
                score += min(20, len(education) * 10)  # 10 points per education, max 20
            
            return min(score, max_score)
            
        except Exception as e:
            self.logger.error("Failed to calculate profile completeness", 
                            user_id=user_id, error=str(e))
            return 0.0
    
    # Private helper methods
    async def _initialize_user_profile(self, user_id: str) -> None:
        """Initialize user profile with default values."""
        try:
            # TODO: Create initial user profile record
            # This would create a UserProfileModel with default preferences
            pass
        except Exception as e:
            self.logger.warning("Failed to initialize user profile", 
                              user_id=user_id, error=str(e))
    
    async def _invalidate_user_cache(self, user_id: str) -> None:
        """Invalidate all user-related cache entries."""
        try:
            await self.cache.delete_pattern(f"user*:{user_id}")
            await self.cache.delete_pattern(f"user_profile:{user_id}")
        except Exception as e:
            self.logger.warning("Failed to invalidate user cache", 
                              user_id=user_id, error=str(e))