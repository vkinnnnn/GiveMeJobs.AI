"""
Comprehensive audit logging system for security monitoring.

This module provides:
- Audit logging for sensitive operations using Python logging
- Structured audit events with correlation IDs
- Compliance-ready audit trails
- Real-time audit event streaming
- Audit log analysis and reporting
"""

import asyncio
import json
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional, Union
from uuid import UUID, uuid4

import redis.asyncio as redis
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from .config import get_settings
from ..models.database.auth import AuditLog, User

logger = structlog.get_logger(__name__)
settings = get_settings()


class AuditEventType(str, Enum):
    """Audit event types for categorization."""
    
    # Authentication events
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILED = "login_failed"
    LOGOUT = "logout"
    PASSWORD_CHANGE = "password_change"
    MFA_SETUP = "mfa_setup"
    MFA_DISABLE = "mfa_disable"
    
    # Authorization events
    PERMISSION_GRANTED = "permission_granted"
    PERMISSION_DENIED = "permission_denied"
    ROLE_ASSIGNED = "role_assigned"
    ROLE_REMOVED = "role_removed"
    
    # Data access events
    DATA_READ = "data_read"
    DATA_CREATE = "data_create"
    DATA_UPDATE = "data_update"
    DATA_DELETE = "data_delete"
    DATA_EXPORT = "data_export"
    
    # Administrative events
    USER_CREATE = "user_create"
    USER_UPDATE = "user_update"
    USER_DELETE = "user_delete"
    USER_SUSPEND = "user_suspend"
    USER_ACTIVATE = "user_activate"
    
    # Security events
    SECURITY_VIOLATION = "security_violation"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    IP_BLOCKED = "ip_blocked"
    ACCOUNT_LOCKED = "account_locked"
    
    # System events
    SYSTEM_START = "system_start"
    SYSTEM_STOP = "system_stop"
    CONFIG_CHANGE = "config_change"
    BACKUP_CREATE = "backup_create"
    BACKUP_RESTORE = "backup_restore"


class AuditSeverity(str, Enum):
    """Audit event severity levels."""
    
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AuditEvent(BaseModel):
    """Audit event data model."""
    
    id: UUID = Field(default_factory=uuid4)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    event_type: AuditEventType
    severity: AuditSeverity = AuditSeverity.MEDIUM
    
    # Actor information
    user_id: Optional[UUID] = None
    user_email: Optional[str] = None
    session_id: Optional[str] = None
    
    # Request context
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    correlation_id: Optional[str] = None
    
    # Resource information
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    
    # Event details
    action: str
    description: str
    success: bool = True
    error_message: Optional[str] = None
    
    # Data changes
    old_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None
    
    # Additional context
    additional_data: Optional[Dict[str, Any]] = None
    
    # Compliance fields
    compliance_tags: List[str] = Field(default_factory=list)
    retention_period_days: int = 2555  # 7 years default
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            UUID: str
        }


class AuditLogger:
    """Comprehensive audit logging system."""
    
    def __init__(self, session: AsyncSession, redis_client: redis.Redis):
        self.session = session
        self.redis_client = redis_client
        self.logger = structlog.get_logger("audit")
        
        # Compliance configurations
        self.compliance_configs = {
            "gdpr": {
                "required_fields": ["user_id", "action", "timestamp"],
                "retention_days": 2555,  # 7 years
                "anonymize_after_days": 1095  # 3 years
            },
            "sox": {
                "required_fields": ["user_id", "action", "timestamp", "resource_id"],
                "retention_days": 2555,  # 7 years
                "immutable": True
            },
            "hipaa": {
                "required_fields": ["user_id", "action", "timestamp", "resource_type"],
                "retention_days": 2190,  # 6 years
                "encryption_required": True
            }
        }
    
    async def log_event(self, event: AuditEvent) -> str:
        """Log an audit event."""
        
        try:
            # Validate compliance requirements
            self._validate_compliance(event)
            
            # Store in database
            audit_log = AuditLog(
                id=event.id,
                user_id=event.user_id,
                event_type=event.event_type.value,
                resource=event.resource_type,
                resource_id=event.resource_id,
                action=event.action,
                ip_address=event.ip_address,
                user_agent=event.user_agent,
                session_id=event.session_id,
                old_values=json.dumps(event.old_values) if event.old_values else None,
                new_values=json.dumps(event.new_values) if event.new_values else None,
                additional_data=json.dumps(event.additional_data) if event.additional_data else None,
                success=event.success,
                error_message=event.error_message,
                created_at=event.timestamp
            )
            
            self.session.add(audit_log)
            await self.session.commit()
            
            # Stream to Redis for real-time processing
            await self._stream_event(event)
            
            # Log to structured logger
            self.logger.info(
                "Audit event logged",
                event_id=str(event.id),
                event_type=event.event_type.value,
                user_id=str(event.user_id) if event.user_id else None,
                action=event.action,
                success=event.success,
                severity=event.severity.value
            )
            
            # Trigger real-time alerts for critical events
            if event.severity == AuditSeverity.CRITICAL:
                await self._trigger_alert(event)
            
            return str(event.id)
            
        except Exception as e:
            logger.error("Failed to log audit event", error=str(e), event=event.dict())
            raise
    
    async def log_authentication_event(
        self,
        event_type: AuditEventType,
        user_id: Optional[UUID] = None,
        user_email: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        success: bool = True,
        error_message: Optional[str] = None,
        additional_data: Optional[Dict[str, Any]] = None
    ) -> str:
        """Log authentication-related events."""
        
        severity = AuditSeverity.HIGH if not success else AuditSeverity.MEDIUM
        
        event = AuditEvent(
            event_type=event_type,
            severity=severity,
            user_id=user_id,
            user_email=user_email,
            ip_address=ip_address,
            user_agent=user_agent,
            action=event_type.value.replace("_", " ").title(),
            description=f"User authentication event: {event_type.value}",
            success=success,
            error_message=error_message,
            additional_data=additional_data,
            compliance_tags=["authentication", "security"]
        )
        
        return await self.log_event(event)
    
    async def log_data_access_event(
        self,
        event_type: AuditEventType,
        user_id: UUID,
        resource_type: str,
        resource_id: str,
        action: str,
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        success: bool = True,
        additional_data: Optional[Dict[str, Any]] = None
    ) -> str:
        """Log data access and modification events."""
        
        # Determine severity based on action
        severity_map = {
            AuditEventType.DATA_DELETE: AuditSeverity.HIGH,
            AuditEventType.DATA_EXPORT: AuditSeverity.HIGH,
            AuditEventType.DATA_UPDATE: AuditSeverity.MEDIUM,
            AuditEventType.DATA_CREATE: AuditSeverity.MEDIUM,
            AuditEventType.DATA_READ: AuditSeverity.LOW
        }
        
        severity = severity_map.get(event_type, AuditSeverity.MEDIUM)
        
        event = AuditEvent(
            event_type=event_type,
            severity=severity,
            user_id=user_id,
            resource_type=resource_type,
            resource_id=resource_id,
            action=action,
            description=f"Data access event: {action} on {resource_type}",
            old_values=old_values,
            new_values=new_values,
            ip_address=ip_address,
            success=success,
            additional_data=additional_data,
            compliance_tags=["data_access", "privacy"]
        )
        
        return await self.log_event(event)
    
    async def log_security_event(
        self,
        event_type: AuditEventType,
        description: str,
        user_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        severity: AuditSeverity = AuditSeverity.HIGH,
        additional_data: Optional[Dict[str, Any]] = None
    ) -> str:
        """Log security-related events."""
        
        event = AuditEvent(
            event_type=event_type,
            severity=severity,
            user_id=user_id,
            ip_address=ip_address,
            action=event_type.value.replace("_", " ").title(),
            description=description,
            success=False,  # Security events are typically failures
            additional_data=additional_data,
            compliance_tags=["security", "incident"]
        )
        
        return await self.log_event(event)
    
    async def log_administrative_event(
        self,
        event_type: AuditEventType,
        admin_user_id: UUID,
        target_user_id: Optional[UUID] = None,
        action: str = "",
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        additional_data: Optional[Dict[str, Any]] = None
    ) -> str:
        """Log administrative actions."""
        
        event = AuditEvent(
            event_type=event_type,
            severity=AuditSeverity.HIGH,
            user_id=admin_user_id,
            resource_type="user",
            resource_id=str(target_user_id) if target_user_id else None,
            action=action or event_type.value.replace("_", " ").title(),
            description=f"Administrative action: {action}",
            old_values=old_values,
            new_values=new_values,
            ip_address=ip_address,
            additional_data=additional_data,
            compliance_tags=["administration", "privileged_access"]
        )
        
        return await self.log_event(event)
    
    def _validate_compliance(self, event: AuditEvent):
        """Validate event against compliance requirements."""
        
        for tag in event.compliance_tags:
            if tag in self.compliance_configs:
                config = self.compliance_configs[tag]
                
                # Check required fields
                for field in config["required_fields"]:
                    if not getattr(event, field, None):
                        raise ValueError(f"Missing required field '{field}' for {tag} compliance")
                
                # Set retention period
                if "retention_days" in config:
                    event.retention_period_days = config["retention_days"]
    
    async def _stream_event(self, event: AuditEvent):
        """Stream audit event to Redis for real-time processing."""
        
        try:
            # Add to audit stream
            await self.redis_client.xadd(
                "audit_stream",
                event.dict(exclude_none=True),
                maxlen=10000  # Keep last 10k events
            )
            
            # Add to severity-specific streams
            await self.redis_client.xadd(
                f"audit_stream:{event.severity.value}",
                event.dict(exclude_none=True),
                maxlen=1000
            )
            
            # Add to type-specific streams
            await self.redis_client.xadd(
                f"audit_stream:{event.event_type.value}",
                event.dict(exclude_none=True),
                maxlen=1000
            )
            
        except Exception as e:
            logger.warning("Failed to stream audit event", error=str(e))
    
    async def _trigger_alert(self, event: AuditEvent):
        """Trigger real-time alert for critical events."""
        
        try:
            alert_data = {
                "event_id": str(event.id),
                "event_type": event.event_type.value,
                "severity": event.severity.value,
                "user_id": str(event.user_id) if event.user_id else None,
                "description": event.description,
                "timestamp": event.timestamp.isoformat(),
                "ip_address": event.ip_address
            }
            
            # Add to alerts queue
            await self.redis_client.lpush("security_alerts", json.dumps(alert_data))
            
            # Publish to alert channel
            await self.redis_client.publish("audit_alerts", json.dumps(alert_data))
            
            logger.critical(
                "Critical audit event triggered alert",
                event_id=str(event.id),
                event_type=event.event_type.value,
                user_id=str(event.user_id) if event.user_id else None
            )
            
        except Exception as e:
            logger.error("Failed to trigger audit alert", error=str(e))
    
    async def search_audit_logs(
        self,
        user_id: Optional[UUID] = None,
        event_types: Optional[List[AuditEventType]] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        resource_type: Optional[str] = None,
        ip_address: Optional[str] = None,
        success: Optional[bool] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[AuditLog]:
        """Search audit logs with filters."""
        
        try:
            from sqlalchemy import and_, or_
            
            query = self.session.query(AuditLog)
            
            # Apply filters
            conditions = []
            
            if user_id:
                conditions.append(AuditLog.user_id == user_id)
            
            if event_types:
                conditions.append(AuditLog.event_type.in_([et.value for et in event_types]))
            
            if start_date:
                conditions.append(AuditLog.created_at >= start_date)
            
            if end_date:
                conditions.append(AuditLog.created_at <= end_date)
            
            if resource_type:
                conditions.append(AuditLog.resource == resource_type)
            
            if ip_address:
                conditions.append(AuditLog.ip_address == ip_address)
            
            if success is not None:
                conditions.append(AuditLog.success == success)
            
            if conditions:
                query = query.filter(and_(*conditions))
            
            # Order by timestamp descending
            query = query.order_by(AuditLog.created_at.desc())
            
            # Apply pagination
            query = query.offset(offset).limit(limit)
            
            result = await query.all()
            return result
            
        except Exception as e:
            logger.error("Failed to search audit logs", error=str(e))
            return []
    
    async def get_audit_statistics(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get audit log statistics."""
        
        try:
            from sqlalchemy import func, and_
            
            query = self.session.query(AuditLog)
            
            # Apply date filters
            if start_date:
                query = query.filter(AuditLog.created_at >= start_date)
            if end_date:
                query = query.filter(AuditLog.created_at <= end_date)
            
            # Get total count
            total_events = await query.count()
            
            # Get events by type
            events_by_type = await self.session.query(
                AuditLog.event_type,
                func.count(AuditLog.id).label('count')
            ).group_by(AuditLog.event_type).all()
            
            # Get events by success/failure
            success_stats = await self.session.query(
                AuditLog.success,
                func.count(AuditLog.id).label('count')
            ).group_by(AuditLog.success).all()
            
            # Get top users by activity
            top_users = await self.session.query(
                AuditLog.user_id,
                func.count(AuditLog.id).label('count')
            ).filter(
                AuditLog.user_id.isnot(None)
            ).group_by(AuditLog.user_id).order_by(
                func.count(AuditLog.id).desc()
            ).limit(10).all()
            
            return {
                "total_events": total_events,
                "events_by_type": {row.event_type: row.count for row in events_by_type},
                "success_rate": {
                    "successful": next((row.count for row in success_stats if row.success), 0),
                    "failed": next((row.count for row in success_stats if not row.success), 0)
                },
                "top_users": [
                    {"user_id": str(row.user_id), "event_count": row.count}
                    for row in top_users
                ]
            }
            
        except Exception as e:
            logger.error("Failed to get audit statistics", error=str(e))
            return {}


# Audit logging decorators
def audit_log(
    event_type: AuditEventType,
    action: str = "",
    resource_type: str = "",
    severity: AuditSeverity = AuditSeverity.MEDIUM,
    compliance_tags: Optional[List[str]] = None
):
    """Decorator for automatic audit logging."""
    
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Extract context from function arguments
            user_id = None
            ip_address = None
            session_id = None
            
            # Look for common parameter names
            for key, value in kwargs.items():
                if key in ["user", "current_user"] and hasattr(value, "id"):
                    user_id = value.id
                elif key == "request" and hasattr(value, "client"):
                    ip_address = value.client.host if value.client else None
                elif key == "session_id":
                    session_id = value
            
            # Execute function
            try:
                result = await func(*args, **kwargs)
                success = True
                error_message = None
            except Exception as e:
                success = False
                error_message = str(e)
                result = None
                raise
            finally:
                # Log audit event
                try:
                    # Get audit logger from dependencies
                    from app.core.dependencies import get_audit_logger
                    audit_logger = await get_audit_logger()
                    
                    event = AuditEvent(
                        event_type=event_type,
                        severity=severity,
                        user_id=user_id,
                        ip_address=ip_address,
                        session_id=session_id,
                        resource_type=resource_type,
                        action=action or func.__name__,
                        description=f"Function {func.__name__} executed",
                        success=success,
                        error_message=error_message,
                        compliance_tags=compliance_tags or []
                    )
                    
                    await audit_logger.log_event(event)
                    
                except Exception as audit_error:
                    logger.error("Failed to log audit event in decorator", error=str(audit_error))
            
            return result
        
        return wrapper
    return decorator


# Dependency functions
async def get_audit_logger(
    session: AsyncSession,
    redis_client: redis.Redis
) -> AuditLogger:
    """Get audit logger instance."""
    return AuditLogger(session, redis_client)