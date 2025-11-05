"""Authentication and authorization utilities."""

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

from .config import get_settings
from .logging import get_logger

logger = get_logger(__name__)
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class TokenData(BaseModel):
    """Token payload data."""
    user_id: Optional[str] = None
    service_name: Optional[str] = None
    scopes: list[str] = []


class ServiceAuth(BaseModel):
    """Service authentication data."""
    service_name: str
    user_id: Optional[str] = None
    scopes: list[str] = []


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Generate password hash."""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token."""
    settings = get_settings()
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.access_token_expire_minutes
        )
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode, settings.secret_key, algorithm=settings.algorithm
    )
    return encoded_jwt


def verify_token(token: str) -> TokenData:
    """Verify and decode JWT token."""
    settings = get_settings()
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(
            token, settings.secret_key, algorithms=[settings.algorithm]
        )
        user_id: str = payload.get("sub")
        service_name: str = payload.get("service")
        scopes: list[str] = payload.get("scopes", [])
        
        if user_id is None and service_name is None:
            raise credentials_exception
            
        token_data = TokenData(
            user_id=user_id,
            service_name=service_name,
            scopes=scopes
        )
        return token_data
    except JWTError as e:
        logger.error("JWT verification failed", error=str(e))
        raise credentials_exception


async def get_current_auth(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> ServiceAuth:
    """Get current authentication context."""
    token_data = verify_token(credentials.credentials)
    
    return ServiceAuth(
        service_name=token_data.service_name or "unknown",
        user_id=token_data.user_id,
        scopes=token_data.scopes
    )


def require_scopes(*required_scopes: str):
    """Decorator to require specific scopes."""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Extract auth from kwargs (injected by FastAPI)
            auth = None
            for key, value in kwargs.items():
                if isinstance(value, ServiceAuth):
                    auth = value
                    break
            
            if not auth:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            # Check if user has required scopes
            missing_scopes = set(required_scopes) - set(auth.scopes)
            if missing_scopes:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Missing required scopes: {', '.join(missing_scopes)}"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


class ServiceTokenGenerator:
    """Generate tokens for service-to-service communication."""
    
    @staticmethod
    def create_service_token(
        service_name: str,
        scopes: list[str],
        user_id: Optional[str] = None,
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create a service authentication token."""
        data = {
            "service": service_name,
            "scopes": scopes
        }
        
        if user_id:
            data["sub"] = user_id
        
        return create_access_token(data, expires_delta)
    
    @staticmethod
    def create_nodejs_service_token() -> str:
        """Create token for Node.js backend service."""
        return ServiceTokenGenerator.create_service_token(
            service_name="nodejs-backend",
            scopes=[
                "document:generate",
                "search:semantic",
                "analytics:calculate",
                "user:read",
                "job:read"
            ],
            expires_delta=timedelta(hours=24)
        )