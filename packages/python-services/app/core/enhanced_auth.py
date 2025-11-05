"""
Enhanced authentication and authorization system with FastAPI-Users.

This module provides:
- JWT refresh token rotation
- Role-based access control (RBAC)
- Multi-factor authentication (MFA)
- Session management with Redis
- Advanced security features
"""

import asyncio
import secrets
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Set, Union
from uuid import UUID, uuid4

import pyotp
import qrcode
import redis.asyncio as redis
from fastapi import Depends, HTTPException, Request, status
from fastapi_users import BaseUserManager, FastAPIUsers, UUIDIDMixin
from fastapi_users.authentication import (
    AuthenticationBackend,
    BearerTransport,
    JWTAuthentication,
    RedisStrategy
)
from fastapi_users.db import SQLAlchemyUserDatabase
from fastapi_users.schemas import BaseUser, BaseUserCreate, BaseUserUpdate
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from .config import get_settings
from .database import get_async_session
from ..models.database.user import User as UserTable, Role, Permission, UserRole

logger = structlog.get_logger(__name__)
settings = get_settings()


# Enhanced User Schemas
class UserRead(BaseUser[UUID]):
    """User read schema with additional fields."""
    first_name: str
    last_name: str
    professional_headline: Optional[str] = None
    email_verified: bool = False
    mfa_enabled: bool = False
    last_login: Optional[datetime] = None
    is_active: bool = True
    roles: List[str] = []
    permissions: List[str] = []


class UserCreate(BaseUserCreate):
    """User creation schema with additional fields."""
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    professional_headline: Optional[str] = Field(None, max_length=255)


class UserUpdate(BaseUserUpdate):
    """User update schema with additional fields."""
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    professional_headline: Optional[str] = Field(None, max_length=255)


# Role and Permission Models
class RoleCreate(BaseModel):
    """Role creation model."""
    name: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = Field(None, max_length=255)
    permissions: List[str] = Field(default_factory=list)


class RoleResponse(BaseModel):
    """Role response model."""
    id: UUID
    name: str
    description: Optional[str]
    permissions: List[str]
    created_at: datetime
    updated_at: datetime


class PermissionCreate(BaseModel):
    """Permission creation model."""
    name: str = Field(..., min_length=1, max_length=100)
    resource: str = Field(..., min_length=1, max_length=50)
    action: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = Field(None, max_length=255)


class PermissionResponse(BaseModel):
    """Permission response model."""
    id: UUID
    name: str
    resource: str
    action: str
    description: Optional[str]
    created_at: datetime
    updated_at: datetime


# MFA Models
class MFASetupRequest(BaseModel):
    """MFA setup request model."""
    password: str = Field(..., description="Current password for verification")


class MFASetupResponse(BaseModel):
    """MFA setup response model."""
    secret: str = Field(..., description="TOTP secret")
    qr_code_url: str = Field(..., description="QR code data URL")
    backup_codes: List[str] = Field(..., description="Backup codes")


class MFAVerifyRequest(BaseModel):
    """MFA verification request model."""
    token: str = Field(..., min_length=6, max_length=6, description="TOTP token")


class MFADisableRequest(BaseModel):
    """MFA disable request model."""
    password: str = Field(..., description="Current password for verification")
    token: str = Field(..., min_length=6, max_length=6, description="TOTP token")


# Session Models
class SessionInfo(BaseModel):
    """Session information model."""
    session_id: str
    user_id: UUID
    ip_address: str
    user_agent: str
    created_at: datetime
    last_activity: datetime
    expires_at: datetime
    is_active: bool


class RefreshTokenRequest(BaseModel):
    """Refresh token request model."""
    refresh_token: str = Field(..., description="Refresh token")


class TokenResponse(BaseModel):
    """Token response model."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


# Enhanced User Manager
class EnhancedUserManager(UUIDIDMixin, BaseUserManager[UserTable, UUID]):
    """Enhanced user manager with additional security features."""
    
    reset_password_token_secret = settings.security.secret_key
    verification_token_secret = settings.security.secret_key
    
    def __init__(self, user_db: SQLAlchemyUserDatabase, redis_client: redis.Redis):
        super().__init__(user_db)
        self.redis_client = redis_client
    
    async def on_after_register(self, user: UserTable, request: Optional[Request] = None):
        """Actions after user registration."""
        logger.info("User registered", user_id=str(user.id), email=user.email)
        
        # Assign default role
        await self.assign_default_role(user)
        
        # Send verification email (implement as needed)
        # await self.send_verification_email(user)
    
    async def on_after_login(
        self, 
        user: UserTable, 
        request: Optional[Request] = None,
        response = None
    ):
        """Actions after user login."""
        # Update last login
        user.last_login = datetime.now(timezone.utc)
        await self.user_db.update(user)
        
        # Create session
        if request:
            await self.create_session(user, request)
        
        logger.info("User logged in", user_id=str(user.id), email=user.email)
    
    async def on_after_forgot_password(
        self, 
        user: UserTable, 
        token: str, 
        request: Optional[Request] = None
    ):
        """Actions after forgot password request."""
        logger.info("Password reset requested", user_id=str(user.id), email=user.email)
        
        # Store reset token in Redis with expiration
        await self.redis_client.setex(
            f"password_reset:{user.id}",
            3600,  # 1 hour
            token
        )
    
    async def assign_default_role(self, user: UserTable):
        """Assign default role to new user."""
        try:
            # This would typically query the database for the default role
            # For now, we'll simulate assigning a "user" role
            logger.info("Assigning default role to user", user_id=str(user.id))
        except Exception as e:
            logger.error("Failed to assign default role", user_id=str(user.id), error=str(e))
    
    async def create_session(self, user: UserTable, request: Request) -> str:
        """Create user session."""
        session_id = str(uuid4())
        
        session_data = {
            "user_id": str(user.id),
            "ip_address": request.client.host if request.client else "unknown",
            "user_agent": request.headers.get("user-agent", "unknown"),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_activity": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        }
        
        # Store session in Redis
        await self.redis_client.setex(
            f"session:{session_id}",
            7 * 24 * 3600,  # 7 days
            str(session_data)
        )
        
        # Add to user's active sessions
        await self.redis_client.sadd(f"user_sessions:{user.id}", session_id)
        
        return session_id
    
    async def invalidate_session(self, session_id: str):
        """Invalidate a specific session."""
        session_data = await self.redis_client.get(f"session:{session_id}")
        if session_data:
            import json
            session_info = json.loads(session_data)
            user_id = session_info.get("user_id")
            
            # Remove from Redis
            await self.redis_client.delete(f"session:{session_id}")
            
            # Remove from user's active sessions
            if user_id:
                await self.redis_client.srem(f"user_sessions:{user_id}", session_id)
    
    async def invalidate_all_user_sessions(self, user_id: UUID):
        """Invalidate all sessions for a user."""
        session_ids = await self.redis_client.smembers(f"user_sessions:{user_id}")
        
        if session_ids:
            # Delete all sessions
            session_keys = [f"session:{sid.decode()}" for sid in session_ids]
            await self.redis_client.delete(*session_keys)
            
            # Clear user sessions set
            await self.redis_client.delete(f"user_sessions:{user_id}")


class MFAManager:
    """Multi-factor authentication manager."""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis_client = redis_client
    
    def generate_secret(self) -> str:
        """Generate TOTP secret."""
        return pyotp.random_base32()
    
    def generate_qr_code(self, user_email: str, secret: str) -> str:
        """Generate QR code for TOTP setup."""
        totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
            name=user_email,
            issuer_name="GiveMeJobs"
        )
        
        # Generate QR code
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(totp_uri)
        qr.make(fit=True)
        
        # Convert to base64 data URL
        from io import BytesIO
        import base64
        
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return f"data:image/png;base64,{img_str}"
    
    def generate_backup_codes(self, count: int = 10) -> List[str]:
        """Generate backup codes."""
        return [secrets.token_hex(4).upper() for _ in range(count)]
    
    def verify_totp(self, secret: str, token: str) -> bool:
        """Verify TOTP token."""
        totp = pyotp.TOTP(secret)
        return totp.verify(token, valid_window=1)
    
    async def setup_mfa(self, user_id: UUID, user_email: str) -> MFASetupResponse:
        """Set up MFA for user."""
        secret = self.generate_secret()
        qr_code_url = self.generate_qr_code(user_email, secret)
        backup_codes = self.generate_backup_codes()
        
        # Store temporary secret (will be confirmed later)
        await self.redis_client.setex(
            f"mfa_setup:{user_id}",
            600,  # 10 minutes
            secret
        )
        
        # Store backup codes
        await self.redis_client.setex(
            f"mfa_backup_codes:{user_id}",
            86400 * 30,  # 30 days
            ",".join(backup_codes)
        )
        
        return MFASetupResponse(
            secret=secret,
            qr_code_url=qr_code_url,
            backup_codes=backup_codes
        )
    
    async def verify_mfa_setup(self, user_id: UUID, token: str) -> bool:
        """Verify MFA setup with TOTP token."""
        secret = await self.redis_client.get(f"mfa_setup:{user_id}")
        if not secret:
            return False
        
        secret = secret.decode()
        if self.verify_totp(secret, token):
            # Move secret to permanent storage
            await self.redis_client.setex(
                f"mfa_secret:{user_id}",
                86400 * 365,  # 1 year
                secret
            )
            
            # Remove temporary setup data
            await self.redis_client.delete(f"mfa_setup:{user_id}")
            
            return True
        
        return False
    
    async def verify_mfa_token(self, user_id: UUID, token: str) -> bool:
        """Verify MFA token for login."""
        # Try TOTP first
        secret = await self.redis_client.get(f"mfa_secret:{user_id}")
        if secret and self.verify_totp(secret.decode(), token):
            return True
        
        # Try backup codes
        backup_codes = await self.redis_client.get(f"mfa_backup_codes:{user_id}")
        if backup_codes:
            codes = backup_codes.decode().split(",")
            if token.upper() in codes:
                # Remove used backup code
                codes.remove(token.upper())
                await self.redis_client.setex(
                    f"mfa_backup_codes:{user_id}",
                    86400 * 30,  # 30 days
                    ",".join(codes)
                )
                return True
        
        return False
    
    async def disable_mfa(self, user_id: UUID):
        """Disable MFA for user."""
        await self.redis_client.delete(f"mfa_secret:{user_id}")
        await self.redis_client.delete(f"mfa_backup_codes:{user_id}")
        await self.redis_client.delete(f"mfa_setup:{user_id}")


class RBACManager:
    """Role-based access control manager."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def create_permission(self, permission_data: PermissionCreate) -> Permission:
        """Create a new permission."""
        permission = Permission(
            id=uuid4(),
            name=permission_data.name,
            resource=permission_data.resource,
            action=permission_data.action,
            description=permission_data.description
        )
        
        self.session.add(permission)
        await self.session.commit()
        await self.session.refresh(permission)
        
        return permission
    
    async def create_role(self, role_data: RoleCreate) -> Role:
        """Create a new role with permissions."""
        role = Role(
            id=uuid4(),
            name=role_data.name,
            description=role_data.description
        )
        
        self.session.add(role)
        await self.session.flush()
        
        # Add permissions to role
        for perm_name in role_data.permissions:
            # This would typically query for existing permissions
            # For now, we'll simulate the relationship
            pass
        
        await self.session.commit()
        await self.session.refresh(role)
        
        return role
    
    async def assign_role_to_user(self, user_id: UUID, role_id: UUID):
        """Assign role to user."""
        user_role = UserRole(
            user_id=user_id,
            role_id=role_id
        )
        
        self.session.add(user_role)
        await self.session.commit()
    
    async def remove_role_from_user(self, user_id: UUID, role_id: UUID):
        """Remove role from user."""
        # This would typically query and delete the UserRole relationship
        pass
    
    async def get_user_permissions(self, user_id: UUID) -> Set[str]:
        """Get all permissions for a user."""
        # This would typically join User -> UserRole -> Role -> RolePermission -> Permission
        # For now, return a simulated set
        return {"user:read", "user:update", "job:read", "application:create"}
    
    async def check_permission(self, user_id: UUID, permission: str) -> bool:
        """Check if user has specific permission."""
        user_permissions = await self.get_user_permissions(user_id)
        return permission in user_permissions


class RefreshTokenManager:
    """Refresh token manager with rotation."""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis_client = redis_client
    
    async def create_refresh_token(self, user_id: UUID) -> str:
        """Create refresh token."""
        token = secrets.token_urlsafe(32)
        
        # Store in Redis with expiration
        await self.redis_client.setex(
            f"refresh_token:{token}",
            settings.security.refresh_token_expire_days * 24 * 3600,
            str(user_id)
        )
        
        # Add to user's active refresh tokens
        await self.redis_client.sadd(f"user_refresh_tokens:{user_id}", token)
        
        return token
    
    async def verify_refresh_token(self, token: str) -> Optional[UUID]:
        """Verify refresh token and return user ID."""
        user_id_str = await self.redis_client.get(f"refresh_token:{token}")
        if user_id_str:
            return UUID(user_id_str.decode())
        return None
    
    async def rotate_refresh_token(self, old_token: str) -> Optional[str]:
        """Rotate refresh token (invalidate old, create new)."""
        user_id = await self.verify_refresh_token(old_token)
        if not user_id:
            return None
        
        # Invalidate old token
        await self.invalidate_refresh_token(old_token)
        
        # Create new token
        return await self.create_refresh_token(user_id)
    
    async def invalidate_refresh_token(self, token: str):
        """Invalidate refresh token."""
        user_id_str = await self.redis_client.get(f"refresh_token:{token}")
        if user_id_str:
            user_id = user_id_str.decode()
            
            # Remove from Redis
            await self.redis_client.delete(f"refresh_token:{token}")
            
            # Remove from user's active tokens
            await self.redis_client.srem(f"user_refresh_tokens:{user_id}", token)
    
    async def invalidate_all_user_refresh_tokens(self, user_id: UUID):
        """Invalidate all refresh tokens for a user."""
        tokens = await self.redis_client.smembers(f"user_refresh_tokens:{user_id}")
        
        if tokens:
            # Delete all tokens
            token_keys = [f"refresh_token:{token.decode()}" for token in tokens]
            await self.redis_client.delete(*token_keys)
            
            # Clear user tokens set
            await self.redis_client.delete(f"user_refresh_tokens:{user_id}")


# Dependency functions
async def get_redis_client() -> redis.Redis:
    """Get Redis client for authentication."""
    return redis.from_url(settings.redis.url)


async def get_user_db(session: AsyncSession = Depends(get_async_session)):
    """Get user database."""
    yield SQLAlchemyUserDatabase(session, UserTable)


async def get_user_manager(
    user_db: SQLAlchemyUserDatabase = Depends(get_user_db),
    redis_client: redis.Redis = Depends(get_redis_client)
):
    """Get user manager."""
    yield EnhancedUserManager(user_db, redis_client)


async def get_mfa_manager(redis_client: redis.Redis = Depends(get_redis_client)):
    """Get MFA manager."""
    yield MFAManager(redis_client)


async def get_rbac_manager(session: AsyncSession = Depends(get_async_session)):
    """Get RBAC manager."""
    yield RBACManager(session)


async def get_refresh_token_manager(redis_client: redis.Redis = Depends(get_redis_client)):
    """Get refresh token manager."""
    yield RefreshTokenManager(redis_client)


# Authentication setup
bearer_transport = BearerTransport(tokenUrl="auth/jwt/login")

def get_jwt_strategy() -> JWTAuthentication:
    """Get JWT authentication strategy."""
    return JWTAuthentication(
        secret=settings.security.secret_key,
        lifetime_seconds=settings.security.access_token_expire_minutes * 60,
    )

def get_redis_strategy() -> RedisStrategy:
    """Get Redis authentication strategy."""
    return RedisStrategy(
        redis=redis.from_url(settings.redis.url),
        lifetime_seconds=settings.security.access_token_expire_minutes * 60,
    )

# Create authentication backends
jwt_authentication = AuthenticationBackend(
    name="jwt",
    transport=bearer_transport,
    get_strategy=get_jwt_strategy,
)

redis_authentication = AuthenticationBackend(
    name="redis",
    transport=bearer_transport,
    get_strategy=get_redis_strategy,
)

# FastAPI Users instance
fastapi_users = FastAPIUsers[UserTable, UUID](
    get_user_manager,
    [jwt_authentication, redis_authentication],
)

# Current user dependencies
current_active_user = fastapi_users.current_user(active=True)
current_superuser = fastapi_users.current_user(active=True, superuser=True)


# Permission decorators
def require_permissions(*permissions: str):
    """Decorator to require specific permissions."""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Extract user from kwargs
            user = None
            for key, value in kwargs.items():
                if isinstance(value, UserTable):
                    user = value
                    break
            
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            # Check permissions
            session = kwargs.get('session') or kwargs.get('db')
            if session:
                rbac_manager = RBACManager(session)
                
                for permission in permissions:
                    if not await rbac_manager.check_permission(user.id, permission):
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail=f"Missing required permission: {permission}"
                        )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def require_roles(*roles: str):
    """Decorator to require specific roles."""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Extract user from kwargs
            user = None
            for key, value in kwargs.items():
                if isinstance(value, UserTable):
                    user = value
                    break
            
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            # Check roles (simplified - would typically query database)
            user_roles = getattr(user, 'roles', [])
            if not any(role in user_roles for role in roles):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Missing required roles: {', '.join(roles)}"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator