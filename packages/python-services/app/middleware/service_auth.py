"""
Service Authentication Middleware for Python Services

Handles JWT-based authentication for service-to-service communication
between Node.js and Python services.
"""

import jwt
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from fastapi import Request, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)
security = HTTPBearer(auto_error=False)

class ServiceTokenPayload:
    """Service token payload structure"""
    
    def __init__(self, data: Dict[str, Any]):
        self.service_id: str = data.get('serviceId', '')
        self.service_name: str = data.get('serviceName', '')
        self.permissions: List[str] = data.get('permissions', [])
        self.iat: int = data.get('iat', 0)
        self.exp: int = data.get('exp', 0)
        self.jti: str = data.get('jti', '')

class ServiceAuthMiddleware(BaseHTTPMiddleware):
    """Middleware to authenticate service-to-service requests"""
    
    def __init__(self, app, require_auth: bool = True):
        super().__init__(app)
        self.require_auth = require_auth
        self.settings = get_settings()
        self.service_secret = self.settings.jwt_secret + "_service"
        self.token_blacklist: set = set()  # In production, use Redis
        
    async def dispatch(self, request: Request, call_next):
        # Skip authentication for health checks and docs
        if request.url.path in ['/health', '/docs', '/redoc', '/openapi.json']:
            return await call_next(request)
        
        # Extract and validate service token
        service_payload = await self._validate_service_token(request)
        
        if self.require_auth and not service_payload:
            return self._create_auth_error_response()
        
        # Add service context to request
        if service_payload:
            request.state.service = service_payload
            request.state.correlation_id = request.headers.get('x-correlation-id')
            
            logger.info("Service authenticated", extra={
                'service_id': service_payload.service_id,
                'service_name': service_payload.service_name,
                'correlation_id': request.state.correlation_id,
                'path': request.url.path,
                'method': request.method
            })
        
        response = await call_next(request)
        
        # Add correlation ID to response
        if hasattr(request.state, 'correlation_id') and request.state.correlation_id:
            response.headers['x-correlation-id'] = request.state.correlation_id
        
        return response
    
    async def _validate_service_token(self, request: Request) -> Optional[ServiceTokenPayload]:
        """Validate service token from request headers"""
        try:
            # Get authorization header
            auth_header = request.headers.get('authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                return None
            
            token = auth_header[7:]  # Remove 'Bearer ' prefix
            
            # Check if token is blacklisted
            if token in self.token_blacklist:
                logger.warning("Blacklisted token used", extra={
                    'correlation_id': request.headers.get('x-correlation-id')
                })
                return None
            
            # Decode and validate token
            payload = jwt.decode(
                token,
                self.service_secret,
                algorithms=['HS256']
            )
            
            # Validate token expiration
            if payload.get('exp', 0) < datetime.now(timezone.utc).timestamp():
                logger.warning("Expired token used", extra={
                    'correlation_id': request.headers.get('x-correlation-id')
                })
                return None
            
            return ServiceTokenPayload(payload)
            
        except jwt.ExpiredSignatureError:
            logger.warning("Expired JWT token", extra={
                'correlation_id': request.headers.get('x-correlation-id')
            })
            return None
        except jwt.InvalidTokenError as e:
            logger.warning("Invalid JWT token", extra={
                'error': str(e),
                'correlation_id': request.headers.get('x-correlation-id')
            })
            return None
        except Exception as e:
            logger.error("Token validation error", extra={
                'error': str(e),
                'correlation_id': request.headers.get('x-correlation-id')
            })
            return None
    
    def _create_auth_error_response(self) -> Response:
        """Create authentication error response"""
        return Response(
            content='{"success": false, "error": "Service authentication required", "code": "MISSING_SERVICE_TOKEN"}',
            status_code=status.HTTP_401_UNAUTHORIZED,
            headers={'content-type': 'application/json'}
        )

def get_current_service(request: Request) -> Optional[ServiceTokenPayload]:
    """Get current service from request state"""
    return getattr(request.state, 'service', None)

def require_service_permission(permission: str):
    """Decorator to require specific service permission"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Find request object in args
            request = None
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
            
            if not request:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Request object not found"
                )
            
            service = get_current_service(request)
            if not service:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Service authentication required"
                )
            
            if not has_permission(service, permission):
                logger.warning("Insufficient service permissions", extra={
                    'service_id': service.service_id,
                    'required_permission': permission,
                    'service_permissions': service.permissions,
                    'correlation_id': getattr(request.state, 'correlation_id', None)
                })
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Insufficient permissions. Required: {permission}"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

def has_permission(service: ServiceTokenPayload, permission: str) -> bool:
    """Check if service has specific permission"""
    if not service or not service.permissions:
        return False
    
    # Check for exact match
    if permission in service.permissions:
        return True
    
    # Check for wildcard permissions
    if '*' in service.permissions:
        return True
    
    # Check for prefix wildcards (e.g., 'read:*' matches 'read:users')
    for perm in service.permissions:
        if perm.endswith('*') and permission.startswith(perm[:-1]):
            return True
    
    return False

class ServiceAuthDependency:
    """FastAPI dependency for service authentication"""
    
    def __init__(self, required: bool = True):
        self.required = required
    
    async def __call__(self, request: Request) -> Optional[ServiceTokenPayload]:
        service = get_current_service(request)
        
        if self.required and not service:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Service authentication required"
            )
        
        return service

class ServicePermissionDependency:
    """FastAPI dependency for service permission checking"""
    
    def __init__(self, permission: str):
        self.permission = permission
    
    async def __call__(self, request: Request) -> ServiceTokenPayload:
        service = get_current_service(request)
        
        if not service:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Service authentication required"
            )
        
        if not has_permission(service, self.permission):
            logger.warning("Insufficient service permissions", extra={
                'service_id': service.service_id,
                'required_permission': self.permission,
                'service_permissions': service.permissions,
                'correlation_id': getattr(request.state, 'correlation_id', None)
            })
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required: {self.permission}"
            )
        
        return service

# Convenience instances
RequireServiceAuth = ServiceAuthDependency(required=True)
OptionalServiceAuth = ServiceAuthDependency(required=False)

def RequirePermission(permission: str):
    """Create a permission dependency"""
    return ServicePermissionDependency(permission)