"""Application-related SQLAlchemy models."""

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String, Text, Float
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampedMixin


class ApplicationModel(Base, TimestampedMixin):
    """Job application SQLAlchemy model."""
    
    __tablename__ = "applications"
    
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    job_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("jobs.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    # Application details
    status: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    cover_letter: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resume_version: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Application tracking
    applied_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True
    )
    response_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    interview_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    
    # Matching information
    match_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    match_factors: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    
    # Notes and feedback
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # External tracking
    external_application_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)