"""User-related SQLAlchemy models."""

from datetime import datetime
from typing import List, Optional

from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text, ForeignKey
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampedMixin, SoftDeleteMixin


class UserModel(Base, TimestampedMixin):
    """User SQLAlchemy model."""
    
    __tablename__ = "users"
    
    # Basic user information
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    professional_headline: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Account status
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    mfa_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    skills: Mapped[List["SkillModel"]] = relationship(
        "SkillModel", 
        back_populates="user",
        cascade="all, delete-orphan"
    )
    experience: Mapped[List["ExperienceModel"]] = relationship(
        "ExperienceModel",
        back_populates="user", 
        cascade="all, delete-orphan"
    )
    education: Mapped[List["EducationModel"]] = relationship(
        "EducationModel",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    profile: Mapped[Optional["UserProfileModel"]] = relationship(
        "UserProfileModel",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan"
    )


class SkillModel(Base, TimestampedMixin, SoftDeleteMixin):
    """Skill SQLAlchemy model."""
    
    __tablename__ = "skills"
    
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), 
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    proficiency_level: Mapped[int] = mapped_column(Integer, nullable=False)
    years_of_experience: Mapped[float] = mapped_column(Float, nullable=False)
    last_used: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    endorsements: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    
    # Relationships
    user: Mapped["UserModel"] = relationship("UserModel", back_populates="skills")


class ExperienceModel(Base, TimestampedMixin, SoftDeleteMixin):
    """Experience SQLAlchemy model."""
    
    __tablename__ = "experience"
    
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    company: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    location: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_current: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    skills: Mapped[List[str]] = mapped_column(ARRAY(String), default=[], nullable=False)
    
    # Relationships
    user: Mapped["UserModel"] = relationship("UserModel", back_populates="experience")


class EducationModel(Base, TimestampedMixin, SoftDeleteMixin):
    """Education SQLAlchemy model."""
    
    __tablename__ = "education"
    
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    degree: Mapped[str] = mapped_column(String(200), nullable=False)
    institution: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    field_of_study: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    start_year: Mapped[int] = mapped_column(Integer, nullable=False)
    end_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    gpa: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    is_current: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    # Relationships
    user: Mapped["UserModel"] = relationship("UserModel", back_populates="education")


class UserProfileModel(Base, TimestampedMixin):
    """User profile SQLAlchemy model."""
    
    __tablename__ = "user_profiles"
    
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True
    )
    
    # Job preferences stored as JSONB for flexibility
    preferences: Mapped[dict] = mapped_column(JSONB, default={}, nullable=False)
    
    # Calculated scores
    skill_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    profile_completeness: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    last_calculated: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), 
        nullable=True
    )
    
    # Relationships
    user: Mapped["UserModel"] = relationship("UserModel", back_populates="profile")