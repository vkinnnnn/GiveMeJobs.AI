"""
Enhanced authentication API endpoints.

This module provides endpoints for:
- User registration and login with MFA
- JWT refresh token rotation
- Role and permission management
- Session management
- Security monitoring
"""

from datetime import datetime, timedelta, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer
from pydantic import BaseModel
import structlog

from app.core.enhanced_auth import (
    EnhancedUserManager,
    MFAManager,
    RBACManager,
    RefreshTokenManager,
    UserCreate,
    UserRead,
    UserUpdate,
    MFASetupRequest,
    MFASetupResponse,
    MFAVerifyRequest,
    MFADisableRequest,
    TokenResponse,
    RefreshTokenRequest,
    SessionInfo,
    RoleCreate,
    RoleResponse,
    PermissionCreate,
    PermissionResponse,
    current_active_user,
    current_superuser,
    fastapi_users,
    jwt_authentication,
    require_permissions,
    require_roles
)
from app.models.database.auth import User
from app.core.dependencies import get_logger

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/auth", tags=["Enhanced Authentication"])
security = HTTPBearer()


# Authentication Models
class LoginRequest(BaseModel):
    """Login request model."""
    email: str
    password: str
    mfa_token: Optional[str] = None


class LoginResponse(BaseModel):
    """Login response model."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserRead
    mfa_required: bool = False


class PasswordChangeRequest(BaseModel):
    """Password change request model."""
    current_password: str
    new_password: str
    mfa_token: Optional[str] = None


class RoleAssignmentRequest(BaseModel):
    """Role assignment request model."""
    user_id: UUID
    role_id: UUID


class SessionListResponse(BaseModel):
    """Session list response model."""
    sessions: List[SessionInfo]
    total: int


# Include FastAPI-Users routers
router.include_router(
    fastapi_users.get_auth_router(jwt_authentication),
    prefix="/jwt",
    tags=["JWT Authentication"]
)

router.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    prefix="/register",
    tags=["Registration"]
)

router.include_router(
    fastapi_users.get_reset_password_router(),
    prefix="/reset",
    tags=["Password Reset"]
)

router.include_router(
    fastapi_users.get_verify_router(UserRead),
    prefix="/verify",
    tags=["Email Verification"]
)

router.include_router(
    fastapi_users.get_users_router(UserRead, UserUpdate),
    prefix="/users",
    tags=["User Management"]
)


# Enhanced Authentication Endpoints
@router.post("/login", response_model=LoginResponse)
async def enhanced_login(
    request: LoginRequest,
    http_request: Request,
    user_manager: EnhancedUserManager = Depends(),
    mfa_manager: MFAManager = Depends(),
    refresh_token_manager: RefreshTokenManager = Depends()
):
    """Enhanced login with MFA support."""
    
    try:
        # Authenticate user
        user = await user_manager.authenticate(
            credentials={"email": request.email, "password": request.password}
        )
        
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # Check if MFA is enabled
        if user.mfa_enabled:
            if not request.mfa_token:
                return LoginResponse(
                    access_token="",
                    refresh_token="",
                    expires_in=0,
                    user=UserRead.from_orm(user),
                    mfa_required=True
                )
            
            # Verify MFA token
            mfa_valid = await mfa_manager.verify_mfa_token(user.id, request.mfa_token)
            if not mfa_valid:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid MFA token"
                )
        
        # Generate tokens
        from app.core.auth import create_access_token
        
        access_token = create_access_token(
            data={"sub": str(user.id)},
            expires_delta=timedelta(minutes=30)
        )
        
        refresh_token = await refresh_token_manager.create_refresh_token(user.id)
        
        # Update last login and create session
        await user_manager.on_after_login(user, http_request)
        
        logger.info("User logged in successfully", user_id=str(user.id), email=user.email)
        
        return LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=1800,  # 30 minutes
            user=UserRead.from_orm(user),
            mfa_required=False
        )
        
    except Exception as e:
        logger.error("Login failed", email=request.email, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed"
        )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: RefreshTokenRequest,
    refresh_token_manager: RefreshTokenManager = Depends()
):
    """Refresh access token using refresh token."""
    
    try:
        # Rotate refresh token
        new_refresh_token = await refresh_token_manager.rotate_refresh_token(
            request.refresh_token
        )
        
        if not new_refresh_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        # Get user ID from new refresh token
        user_id = await refresh_token_manager.verify_refresh_token(new_refresh_token)
        
        # Generate new access token
        from app.core.auth import create_access_token
        
        access_token = create_access_token(
            data={"sub": str(user_id)},
            expires_delta=timedelta(minutes=30)
        )
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=new_refresh_token,
            expires_in=1800
        )
        
    except Exception as e:
        logger.error("Token refresh failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token refresh failed"
        )


@router.post("/logout")
async def logout(
    request: Request,
    user: User = Depends(current_active_user),
    user_manager: EnhancedUserManager = Depends(),
    refresh_token_manager: RefreshTokenManager = Depends()
):
    """Logout user and invalidate tokens."""
    
    try:
        # Get authorization header
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            
            # Invalidate session (if using session-based auth)
            # This would typically involve blacklisting the JWT token
            
        # Invalidate all refresh tokens for user
        await refresh_token_manager.invalidate_all_user_refresh_tokens(user.id)
        
        # Invalidate all sessions
        await user_manager.invalidate_all_user_sessions(user.id)
        
        logger.info("User logged out", user_id=str(user.id))
        
        return {"message": "Logged out successfully"}
        
    except Exception as e:
        logger.error("Logout failed", user_id=str(user.id), error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed"
        )


# MFA Endpoints
@router.post("/mfa/setup", response_model=MFASetupResponse)
async def setup_mfa(
    request: MFASetupRequest,
    user: User = Depends(current_active_user),
    user_manager: EnhancedUserManager = Depends(),
    mfa_manager: MFAManager = Depends()
):
    """Set up multi-factor authentication."""
    
    try:
        # Verify current password
        from app.core.auth import verify_password
        
        if not verify_password(request.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid password"
            )
        
        # Set up MFA
        mfa_setup = await mfa_manager.setup_mfa(user.id, user.email)
        
        logger.info("MFA setup initiated", user_id=str(user.id))
        
        return mfa_setup
        
    except Exception as e:
        logger.error("MFA setup failed", user_id=str(user.id), error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="MFA setup failed"
        )


@router.post("/mfa/verify")
async def verify_mfa_setup(
    request: MFAVerifyRequest,
    user: User = Depends(current_active_user),
    mfa_manager: MFAManager = Depends(),
    user_manager: EnhancedUserManager = Depends()
):
    """Verify and enable MFA."""
    
    try:
        # Verify MFA setup
        verified = await mfa_manager.verify_mfa_setup(user.id, request.token)
        
        if not verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid MFA token"
            )
        
        # Enable MFA for user
        user.mfa_enabled = True
        await user_manager.user_db.update(user)
        
        logger.info("MFA enabled for user", user_id=str(user.id))
        
        return {"message": "MFA enabled successfully"}
        
    except Exception as e:
        logger.error("MFA verification failed", user_id=str(user.id), error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA verification failed"
        )


@router.post("/mfa/disable")
async def disable_mfa(
    request: MFADisableRequest,
    user: User = Depends(current_active_user),
    mfa_manager: MFAManager = Depends(),
    user_manager: EnhancedUserManager = Depends()
):
    """Disable multi-factor authentication."""
    
    try:
        # Verify current password
        from app.core.auth import verify_password
        
        if not verify_password(request.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid password"
            )
        
        # Verify MFA token
        mfa_valid = await mfa_manager.verify_mfa_token(user.id, request.token)
        if not mfa_valid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid MFA token"
            )
        
        # Disable MFA
        await mfa_manager.disable_mfa(user.id)
        user.mfa_enabled = False
        await user_manager.user_db.update(user)
        
        logger.info("MFA disabled for user", user_id=str(user.id))
        
        return {"message": "MFA disabled successfully"}
        
    except Exception as e:
        logger.error("MFA disable failed", user_id=str(user.id), error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="MFA disable failed"
        )


# Password Management
@router.post("/password/change")
async def change_password(
    request: PasswordChangeRequest,
    user: User = Depends(current_active_user),
    user_manager: EnhancedUserManager = Depends(),
    mfa_manager: MFAManager = Depends()
):
    """Change user password."""
    
    try:
        # Verify current password
        from app.core.auth import verify_password, get_password_hash
        
        if not verify_password(request.current_password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid current password"
            )
        
        # Verify MFA if enabled
        if user.mfa_enabled:
            if not request.mfa_token:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="MFA token required"
                )
            
            mfa_valid = await mfa_manager.verify_mfa_token(user.id, request.mfa_token)
            if not mfa_valid:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid MFA token"
                )
        
        # Update password
        user.hashed_password = get_password_hash(request.new_password)
        user.password_changed_at = datetime.now(timezone.utc)
        await user_manager.user_db.update(user)
        
        logger.info("Password changed", user_id=str(user.id))
        
        return {"message": "Password changed successfully"}
        
    except Exception as e:
        logger.error("Password change failed", user_id=str(user.id), error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password change failed"
        )


# Session Management
@router.get("/sessions", response_model=SessionListResponse)
async def get_user_sessions(
    user: User = Depends(current_active_user),
    user_manager: EnhancedUserManager = Depends()
):
    """Get user's active sessions."""
    
    try:
        # This would typically query the database for user sessions
        # For now, return a simulated response
        sessions = [
            SessionInfo(
                session_id="session_1",
                user_id=user.id,
                ip_address="192.168.1.1",
                user_agent="Mozilla/5.0...",
                created_at=datetime.now(timezone.utc),
                last_activity=datetime.now(timezone.utc),
                expires_at=datetime.now(timezone.utc) + timedelta(days=7),
                is_active=True
            )
        ]
        
        return SessionListResponse(sessions=sessions, total=len(sessions))
        
    except Exception as e:
        logger.error("Failed to get sessions", user_id=str(user.id), error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get sessions"
        )


@router.delete("/sessions/{session_id}")
async def invalidate_session(
    session_id: str,
    user: User = Depends(current_active_user),
    user_manager: EnhancedUserManager = Depends()
):
    """Invalidate a specific session."""
    
    try:
        await user_manager.invalidate_session(session_id)
        
        logger.info("Session invalidated", user_id=str(user.id), session_id=session_id)
        
        return {"message": "Session invalidated successfully"}
        
    except Exception as e:
        logger.error("Session invalidation failed", user_id=str(user.id), error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Session invalidation failed"
        )


# Role and Permission Management (Admin only)
@router.post("/roles", response_model=RoleResponse)
@require_permissions("role:create")
async def create_role(
    role_data: RoleCreate,
    user: User = Depends(current_superuser),
    rbac_manager: RBACManager = Depends()
):
    """Create a new role (admin only)."""
    
    try:
        role = await rbac_manager.create_role(role_data)
        
        logger.info("Role created", role_id=str(role.id), name=role.name, created_by=str(user.id))
        
        return RoleResponse(
            id=role.id,
            name=role.name,
            description=role.description,
            permissions=[],  # Would be populated from database
            created_at=role.created_at,
            updated_at=role.updated_at
        )
        
    except Exception as e:
        logger.error("Role creation failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Role creation failed"
        )


@router.post("/permissions", response_model=PermissionResponse)
@require_permissions("permission:create")
async def create_permission(
    permission_data: PermissionCreate,
    user: User = Depends(current_superuser),
    rbac_manager: RBACManager = Depends()
):
    """Create a new permission (admin only)."""
    
    try:
        permission = await rbac_manager.create_permission(permission_data)
        
        logger.info(
            "Permission created", 
            permission_id=str(permission.id), 
            name=permission.name, 
            created_by=str(user.id)
        )
        
        return PermissionResponse(
            id=permission.id,
            name=permission.name,
            resource=permission.resource,
            action=permission.action,
            description=permission.description,
            created_at=permission.created_at,
            updated_at=permission.updated_at
        )
        
    except Exception as e:
        logger.error("Permission creation failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Permission creation failed"
        )


@router.post("/users/{user_id}/roles/{role_id}")
@require_permissions("user:manage_roles")
async def assign_role_to_user(
    user_id: UUID,
    role_id: UUID,
    admin_user: User = Depends(current_superuser),
    rbac_manager: RBACManager = Depends()
):
    """Assign role to user (admin only)."""
    
    try:
        await rbac_manager.assign_role_to_user(user_id, role_id)
        
        logger.info(
            "Role assigned to user", 
            user_id=str(user_id), 
            role_id=str(role_id), 
            assigned_by=str(admin_user.id)
        )
        
        return {"message": "Role assigned successfully"}
        
    except Exception as e:
        logger.error("Role assignment failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Role assignment failed"
        )


@router.delete("/users/{user_id}/roles/{role_id}")
@require_permissions("user:manage_roles")
async def remove_role_from_user(
    user_id: UUID,
    role_id: UUID,
    admin_user: User = Depends(current_superuser),
    rbac_manager: RBACManager = Depends()
):
    """Remove role from user (admin only)."""
    
    try:
        await rbac_manager.remove_role_from_user(user_id, role_id)
        
        logger.info(
            "Role removed from user", 
            user_id=str(user_id), 
            role_id=str(role_id), 
            removed_by=str(admin_user.id)
        )
        
        return {"message": "Role removed successfully"}
        
    except Exception as e:
        logger.error("Role removal failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Role removal failed"
        )


# Security Information
@router.get("/security/info")
async def get_security_info(user: User = Depends(current_active_user)):
    """Get user's security information."""
    
    return {
        "mfa_enabled": user.mfa_enabled,
        "email_verified": user.email_verified,
        "last_login": user.last_login,
        "password_changed_at": user.password_changed_at,
        "failed_login_attempts": user.failed_login_attempts,
        "account_locked": user.locked_until is not None and user.locked_until > datetime.now(timezone.utc)
    }