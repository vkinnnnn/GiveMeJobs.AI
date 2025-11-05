"""Job-related SQLAlchemy models."""

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, TimestampedMixin, SoftDeleteMixin


class JobModel(Base, TimestampedMixin, SoftDeleteMixin):
    """Job SQLAlchemy model."""
    
    __tablename__ = "jobs"
    
    # Basic job information
    title: Mapped[str] = mapped_column(String(300), nullable=False, index=True)
    company: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    location: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    
    # Job details
    remote_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    job_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    industry: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    company_size: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    # Requirements and skills
    requirements: Mapped[list[str]] = mapped_column(ARRAY(String), default=[], nullable=False)
    required_skills: Mapped[list[str]] = mapped_column(ARRAY(String), default=[], nullable=False)
    preferred_skills: Mapped[list[str]] = mapped_column(ARRAY(String), default=[], nullable=False)
    
    # Salary information
    salary_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)
    salary_max: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)
    salary_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    # Additional information
    benefits: Mapped[list[str]] = mapped_column(ARRAY(String), default=[], nullable=False)
    application_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    application_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Source and status
    source: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    external_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    
    # Dates
    posted_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), 
        nullable=True,
        index=True
    )
    expires_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True
    )
    
    # Analytics
    view_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    application_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    
    # Vector embeddings for semantic search (stored as JSONB for flexibility)
    embeddings: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)


class JobAnalyticsModel(Base, TimestampedMixin):
    """Job analytics SQLAlchemy model."""
    
    __tablename__ = "job_analytics"
    
    job_id: Mapped[str] = mapped_column(
        String(36),  # UUID string
        nullable=False,
        unique=True,
        index=True
    )
    
    # Daily metrics
    views_today: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    views_week: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    views_month: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    
    applications_today: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    applications_week: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    applications_month: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    
    # Calculated metrics
    conversion_rate: Mapped[float] = mapped_column(Integer, default=0.0, nullable=False)
    avg_match_score: Mapped[Optional[float]] = mapped_column(Integer, nullable=True)
    
    # Top matching skills
    top_matching_skills: Mapped[list[str]] = mapped_column(
        ARRAY(String), 
        default=[], 
        nullable=False
    )