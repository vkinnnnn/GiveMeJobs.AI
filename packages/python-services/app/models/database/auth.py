"""
Database models for enhanced authentication system.

This module contains SQLAlchemy models for users, roles, permissions,
and authentication-related entities.
"""

from datetime import datetime
from typing import List
from uuid import UUID, uuid4

from fastapi_users.db import SQLAlchemyBaseUserTableUUID
from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, Integer, String, Text, Table
)
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from .base import Base


# Association tables for many-to-many relationships
user_roles = Table(
    'user_roles',
    Base.metadata,
    Column('user_id', PostgresUUID(as_uuid=True), ForeignKey('users.id'), primary_key=True),
    Column('role_id', PostgresUUID(as_uuid=True), ForeignKey('roles.id'), primary_key=True),
    Column('assigned_at', DateTime(timezone=True), server_default=func.now()),
    Column('assigned_by', PostgresUUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
)

role_permissions = Table(
    'role_permissions',
    Base.metadata,
    Column('role_id', PostgresUUID(as_uuid=True), ForeignKey('roles.id'), primary_key=True),
    Column('permission_id', PostgresUUID(as_uuid=True), ForeignKey('permissions.id'), primary_key=True),
    Column('granted_at', DateTime(timezone=True), server_default=func.now()),
    Column('granted_by', PostgresUUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
)


class User(SQLAlchemyBaseUserTableUUID, Base):
    """Enhanced user model with additional fields."""
    
    __tablename__ = "users"
    
    # Additional user fields
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    professional_headline: Mapped[str] = mapped_column(String(255), nullable=True)
    
    # Authentication fields
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    mfa_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    mfa_secret: Mapped[str] = mapped_column(String(32), nullable=True)
    backup_codes: Mapped[str] = mapped_column(Text, nullable=True)  # JSON string
    
    # Session and security
    last_login: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    failed_login_attempts: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    password_changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now()
    )
    
    # Profile fields
    phone_number: Mapped[str] = mapped_column(String(20), nullable=True)
    timezone: Mapped[str] = mapped_column(String(50), default="UTC")
    language: Mapped[str] = mapped_column(String(10), default="en")
    
    # Audit fields
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        onupdate=func.now()
    )
    created_by: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True), 
        ForeignKey('users.id'), 
        nullable=True
    )
    updated_by: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True), 
        ForeignKey('users.id'), 
        nullable=True
    )
    
    # Relationships
    roles: Mapped[List["Role"]] = relationship(
        "Role", 
        secondary=user_roles, 
        back_populates="users",
        lazy="selectin"
    )
    
    # Self-referential relationships for audit
    creator: Mapped["User"] = relationship(
        "User", 
        foreign_keys=[created_by], 
        remote_side="User.id",
        lazy="select"
    )
    updater: Mapped["User"] = relationship(
        "User", 
        foreign_keys=[updated_by], 
        remote_side="User.id",
        lazy="select"
    )
    
    # Sessions and tokens
    sessions: Mapped[List["UserSession"]] = relationship(
        "UserSession", 
        back_populates="user",
        cascade="all, delete-orphan"
    )
    
    refresh_tokens: Mapped[List["RefreshToken"]] = relationship(
        "RefreshToken", 
        back_populates="user",
        cascade="all, delete-orphan"
    )
    
    # Audit logs
    audit_logs: Mapped[List["AuditLog"]] = relationship(
        "AuditLog", 
        back_populates="user",
        cascade="all, delete-orphan"
    )
    
    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email})>"


class Role(Base):
    """Role model for RBAC."""
    
    __tablename__ = "roles"
    
    id: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True), 
        primary_key=True, 
        default=uuid4
    )
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=True)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False)  # System roles can't be deleted
    
    # Audit fields
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        onupdate=func.now()
    )
    created_by: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True), 
        ForeignKey('users.id'), 
        nullable=True
    )
    updated_by: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True), 
        ForeignKey('users.id'), 
        nullable=True
    )
    
    # Relationships
    users: Mapped[List[User]] = relationship(
        User, 
        secondary=user_roles, 
        back_populates="roles"
    )
    
    permissions: Mapped[List["Permission"]] = relationship(
        "Permission", 
        secondary=role_permissions, 
        back_populates="roles",
        lazy="selectin"
    )
    
    def __repr__(self) -> str:
        return f"<Role(id={self.id}, name={self.name})>"


class Permission(Base):
    """Permission model for RBAC."""
    
    __tablename__ = "permissions"
    
    id: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True), 
        primary_key=True, 
        default=uuid4
    )
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    resource: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g., 'user', 'job', 'application'
    action: Mapped[str] = mapped_column(String(50), nullable=False)    # e.g., 'read', 'write', 'delete'
    description: Mapped[str] = mapped_column(String(255), nullable=True)
    
    # Audit fields
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        onupdate=func.now()
    )
    created_by: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True), 
        ForeignKey('users.id'), 
        nullable=True
    )
    
    # Relationships
    roles: Mapped[List[Role]] = relationship(
        Role, 
        secondary=role_permissions, 
        back_populates="permissions"
    )
    
    def __repr__(self) -> str:
        return f"<Permission(id={self.id}, name={self.name})>"


class UserSession(Base):
    """User session model for session management."""
    
    __tablename__ = "user_sessions"
    
    id: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True), 
        primary_key=True, 
        default=uuid4
    )
    session_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    user_id: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True), 
        ForeignKey('users.id'), 
        nullable=False
    )
    
    # Session metadata
    ip_address: Mapped[str] = mapped_column(String(45), nullable=True)  # IPv6 support
    user_agent: Mapped[str] = mapped_column(Text, nullable=True)
    device_fingerprint: Mapped[str] = mapped_column(String(255), nullable=True)
    
    # Session lifecycle
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now()
    )
    last_activity: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now()
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    invalidated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Session flags
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_suspicious: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Relationships
    user: Mapped[User] = relationship(User, back_populates="sessions")
    
    def __repr__(self) -> str:
        return f"<UserSession(id={self.id}, user_id={self.user_id})>"


class RefreshToken(Base):
    """Refresh token model for JWT token rotation."""
    
    __tablename__ = "refresh_tokens"
    
    id: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True), 
        primary_key=True, 
        default=uuid4
    )
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    user_id: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True), 
        ForeignKey('users.id'), 
        nullable=False
    )
    
    # Token metadata
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now()
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Token flags
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Device/session info
    ip_address: Mapped[str] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str] = mapped_column(Text, nullable=True)
    
    # Relationships
    user: Mapped[User] = relationship(User, back_populates="refresh_tokens")
    
    def __repr__(self) -> str:
        return f"<RefreshToken(id={self.id}, user_id={self.user_id})>"


class AuditLog(Base):
    """Audit log model for security monitoring."""
    
    __tablename__ = "audit_logs"
    
    id: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True), 
        primary_key=True, 
        default=uuid4
    )
    user_id: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True), 
        ForeignKey('users.id'), 
        nullable=True
    )
    
    # Event details
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)  # login, logout, password_change, etc.
    resource: Mapped[str] = mapped_column(String(50), nullable=True)     # user, job, application, etc.
    resource_id: Mapped[str] = mapped_column(String(255), nullable=True)
    action: Mapped[str] = mapped_column(String(50), nullable=False)      # create, read, update, delete
    
    # Event metadata
    ip_address: Mapped[str] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str] = mapped_column(Text, nullable=True)
    session_id: Mapped[str] = mapped_column(String(255), nullable=True)
    
    # Event data
    old_values: Mapped[str] = mapped_column(Text, nullable=True)  # JSON string
    new_values: Mapped[str] = mapped_column(Text, nullable=True)  # JSON string
    additional_data: Mapped[str] = mapped_column(Text, nullable=True)  # JSON string
    
    # Event outcome
    success: Mapped[bool] = mapped_column(Boolean, nullable=False)
    error_message: Mapped[str] = mapped_column(Text, nullable=True)
    
    # Timestamp
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now()
    )
    
    # Relationships
    user: Mapped[User] = relationship(User, back_populates="audit_logs")
    
    def __repr__(self) -> str:
        return f"<AuditLog(id={self.id}, event_type={self.event_type})>"


class SecurityEvent(Base):
    """Security event model for threat detection."""
    
    __tablename__ = "security_events"
    
    id: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True), 
        primary_key=True, 
        default=uuid4
    )
    user_id: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True), 
        ForeignKey('users.id'), 
        nullable=True
    )
    
    # Event classification
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)  # suspicious_login, brute_force, etc.
    severity: Mapped[str] = mapped_column(String(20), nullable=False)    # low, medium, high, critical
    status: Mapped[str] = mapped_column(String(20), default="open")      # open, investigating, resolved, false_positive
    
    # Event details
    description: Mapped[str] = mapped_column(Text, nullable=False)
    ip_address: Mapped[str] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str] = mapped_column(Text, nullable=True)
    
    # Detection metadata
    detection_rule: Mapped[str] = mapped_column(String(100), nullable=True)
    confidence_score: Mapped[int] = mapped_column(Integer, nullable=True)  # 0-100
    
    # Event data
    event_data: Mapped[str] = mapped_column(Text, nullable=True)  # JSON string
    
    # Response
    response_action: Mapped[str] = mapped_column(String(50), nullable=True)  # block, alert, monitor
    resolved_by: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True), 
        ForeignKey('users.id'), 
        nullable=True
    )
    resolved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    resolution_notes: Mapped[str] = mapped_column(Text, nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        onupdate=func.now()
    )
    
    # Relationships
    user: Mapped[User] = relationship(User, foreign_keys=[user_id])
    resolver: Mapped[User] = relationship(User, foreign_keys=[resolved_by])
    
    def __repr__(self) -> str:
        return f"<SecurityEvent(id={self.id}, event_type={self.event_type})>"


class LoginAttempt(Base):
    """Login attempt model for brute force protection."""
    
    __tablename__ = "login_attempts"
    
    id: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True), 
        primary_key=True, 
        default=uuid4
    )
    
    # Attempt details
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    ip_address: Mapped[str] = mapped_column(String(45), nullable=False)
    user_agent: Mapped[str] = mapped_column(Text, nullable=True)
    
    # Attempt outcome
    success: Mapped[bool] = mapped_column(Boolean, nullable=False)
    failure_reason: Mapped[str] = mapped_column(String(100), nullable=True)  # invalid_password, account_locked, etc.
    
    # MFA details
    mfa_required: Mapped[bool] = mapped_column(Boolean, default=False)
    mfa_success: Mapped[bool] = mapped_column(Boolean, nullable=True)
    
    # Timestamp
    attempted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now()
    )
    
    def __repr__(self) -> str:
        return f"<LoginAttempt(id={self.id}, email={self.email}, success={self.success})>"