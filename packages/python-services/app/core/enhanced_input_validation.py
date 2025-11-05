"""
Enhanced input validation and sanitization for Python services.

This module provides comprehensive input validation, sanitization,
and security features including XSS prevention, SQL injection protection,
and rate limiting.
"""

import re
import html
import bleach
import validators
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field, validator, root_validator
from fastapi import HTTPException, Request, status
from fastapi.security.utils import get_authorization_scheme_param
import redis.asyncio as redis
from datetime import datetime, timedelta
import structlog

logger = structlog.get_logger(__name__)


class SecurityConfig:
    """Security configuration constants."""
    
    # Maximum string lengths
    MAX_STRING_LENGTH = 10000
    MAX_NAME_LENGTH = 100
    MAX_EMAIL_LENGTH = 254
    MAX_PASSWORD_LENGTH = 128
    MAX_DESCRIPTION_LENGTH = 5000
    
    # Rate limiting
    DEFAULT_RATE_LIMIT = 100  # requests per minute
    AUTH_RATE_LIMIT = 10      # auth attempts per 15 minutes
    UPLOAD_RATE_LIMIT = 50    # uploads per hour
    
    # File upload limits
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    MAX_FILES_PER_REQUEST = 10
    
    # Allowed file types
    ALLOWED_DOCUMENT_TYPES = {
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
    }
    
    ALLOWED_IMAGE_TYPES = {
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
    }


class InputSanitizer:
    """Comprehensive input sanitization utilities."""
    
    # Dangerous patterns for XSS detection
    XSS_PATTERNS = [
        re.compile(r'<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>', re.IGNORECASE),
        re.compile(r'<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>', re.IGNORECASE),
        re.compile(r'javascript:', re.IGNORECASE),
        re.compile(r'on\w+\s*=', re.IGNORECASE),
        re.compile(r'<img[^>]+src[\\s]*=[\\s]*["\']javascript:', re.IGNORECASE),
        re.compile(r'<[^>]*\s(onerror|onload|onclick|onmouseover)\s*=', re.IGNORECASE),
    ]
    
    # SQL injection patterns
    SQL_PATTERNS = [
        re.compile(r'\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b', re.IGNORECASE),
        re.compile(r"('|(\\')|(;)|(--)|(\|)|(\*)|(%)|(\+)|(\?)|(\[)|(\])|(\{)|(\}))", re.IGNORECASE),
        re.compile(r"((\%3D)|(=))[^\n]*((\%27)|(\')|(\\-\\-)|(\%3B)|(;))", re.IGNORECASE),
        re.compile(r"\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))", re.IGNORECASE),
    ]
    
    @classmethod
    def sanitize_string(cls, value: str) -> str:
        """Sanitize a string value."""
        if not isinstance(value, str):
            return value
        
        # Remove null bytes
        value = value.replace('\x00', '')
        
        # HTML escape
        value = html.escape(value)
        
        # Use bleach for additional sanitization
        value = bleach.clean(value, tags=[], attributes={}, strip=True)
        
        # Trim whitespace
        value = value.strip()
        
        # Limit length
        if len(value) > SecurityConfig.MAX_STRING_LENGTH:
            value = value[:SecurityConfig.MAX_STRING_LENGTH]
        
        return value
    
    @classmethod
    def sanitize_dict(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        """Recursively sanitize dictionary values."""
        if not isinstance(data, dict):
            return data
        
        sanitized = {}
        for key, value in data.items():
            # Sanitize key
            clean_key = cls.sanitize_string(str(key))
            
            # Sanitize value
            if isinstance(value, str):
                sanitized[clean_key] = cls.sanitize_string(value)
            elif isinstance(value, dict):
                sanitized[clean_key] = cls.sanitize_dict(value)
            elif isinstance(value, list):
                sanitized[clean_key] = cls.sanitize_list(value)
            else:
                sanitized[clean_key] = value
        
        return sanitized
    
    @classmethod
    def sanitize_list(cls, data: List[Any]) -> List[Any]:
        """Sanitize list values."""
        if not isinstance(data, list):
            return data
        
        sanitized = []
        for item in data:
            if isinstance(item, str):
                sanitized.append(cls.sanitize_string(item))
            elif isinstance(item, dict):
                sanitized.append(cls.sanitize_dict(item))
            elif isinstance(item, list):
                sanitized.append(cls.sanitize_list(item))
            else:
                sanitized.append(item)
        
        return sanitized
    
    @classmethod
    def check_xss(cls, value: str) -> bool:
        """Check if string contains XSS patterns."""
        if not isinstance(value, str):
            return False
        
        return any(pattern.search(value) for pattern in cls.XSS_PATTERNS)
    
    @classmethod
    def check_sql_injection(cls, value: str) -> bool:
        """Check if string contains SQL injection patterns."""
        if not isinstance(value, str):
            return False
        
        return any(pattern.search(value) for pattern in cls.SQL_PATTERNS)
    
    @classmethod
    def validate_security(cls, data: Any) -> None:
        """Validate data for security threats."""
        def _check_value(value: Any) -> None:
            if isinstance(value, str):
                if cls.check_xss(value):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Potentially dangerous content detected (XSS)"
                    )
                if cls.check_sql_injection(value):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Potentially dangerous content detected (SQL injection)"
                    )
            elif isinstance(value, dict):
                for v in value.values():
                    _check_value(v)
            elif isinstance(value, list):
                for item in value:
                    _check_value(item)
        
        _check_value(data)


class EnhancedBaseModel(BaseModel):
    """Base model with enhanced validation and sanitization."""
    
    class Config:
        # Validate assignment
        validate_assignment = True
        # Use enum values
        use_enum_values = True
        # Allow population by field name
        allow_population_by_field_name = True
        # Validate all fields
        validate_all = True
    
    @root_validator(pre=True)
    def sanitize_inputs(cls, values):
        """Sanitize all input values."""
        if isinstance(values, dict):
            return InputSanitizer.sanitize_dict(values)
        return values
    
    @root_validator
    def validate_security(cls, values):
        """Validate inputs for security threats."""
        InputSanitizer.validate_security(values)
        return values


# Enhanced field validators
def safe_string(
    min_length: int = 0,
    max_length: int = SecurityConfig.MAX_STRING_LENGTH,
    pattern: Optional[str] = None
) -> Field:
    """Create a safe string field with validation."""
    return Field(
        ...,
        min_length=min_length,
        max_length=max_length,
        regex=pattern,
        description=f"Safe string field ({min_length}-{max_length} characters)"
    )


def safe_optional_string(
    min_length: int = 0,
    max_length: int = SecurityConfig.MAX_STRING_LENGTH,
    pattern: Optional[str] = None
) -> Field:
    """Create an optional safe string field."""
    return Field(
        None,
        min_length=min_length,
        max_length=max_length,
        regex=pattern,
        description=f"Optional safe string field ({min_length}-{max_length} characters)"
    )


def email_field() -> Field:
    """Create an email field with validation."""
    return Field(
        ...,
        max_length=SecurityConfig.MAX_EMAIL_LENGTH,
        description="Valid email address"
    )


def password_field() -> Field:
    """Create a password field with validation."""
    return Field(
        ...,
        min_length=8,
        max_length=SecurityConfig.MAX_PASSWORD_LENGTH,
        description="Strong password (8+ characters with uppercase, lowercase, number, and special character)"
    )


def name_field() -> Field:
    """Create a name field with validation."""
    return Field(
        ...,
        min_length=1,
        max_length=SecurityConfig.MAX_NAME_LENGTH,
        regex=r"^[a-zA-Z\s\-']+$",
        description="Valid name (letters, spaces, hyphens, apostrophes only)"
    )


# Enhanced validation models
class EnhancedUserCreate(EnhancedBaseModel):
    """Enhanced user creation model with comprehensive validation."""
    
    email: str = email_field()
    password: str = password_field()
    first_name: str = name_field()
    last_name: str = name_field()
    professional_headline: Optional[str] = safe_optional_string(max_length=255)
    
    @validator('email')
    def validate_email(cls, v):
        if not validators.email(v):
            raise ValueError('Invalid email format')
        return v.lower().strip()
    
    @validator('password')
    def validate_password(cls, v):
        if not re.match(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]', v):
            raise ValueError('Password must contain uppercase, lowercase, number, and special character')
        return v
    
    @validator('first_name', 'last_name')
    def validate_names(cls, v):
        if not re.match(r'^[a-zA-Z\s\-\']+$', v):
            raise ValueError('Name contains invalid characters')
        return v.strip()


class EnhancedUserLogin(EnhancedBaseModel):
    """Enhanced user login model."""
    
    email: str = email_field()
    password: str = Field(..., min_length=1, description="User password")
    mfa_token: Optional[str] = Field(None, regex=r'^\d{6}$', description="6-digit MFA token")
    remember_me: Optional[bool] = Field(False, description="Remember login session")
    
    @validator('email')
    def validate_email(cls, v):
        if not validators.email(v):
            raise ValueError('Invalid email format')
        return v.lower().strip()


class EnhancedJobSearch(EnhancedBaseModel):
    """Enhanced job search model."""
    
    query: Optional[str] = safe_optional_string(max_length=200)
    location: Optional[str] = safe_optional_string(max_length=100)
    remote: Optional[bool] = None
    job_type: Optional[str] = Field(None, regex=r'^(full-time|part-time|contract|temporary|internship)$')
    experience_level: Optional[str] = Field(None, regex=r'^(entry|mid|senior|executive)$')
    salary_min: Optional[int] = Field(None, ge=0, le=10000000)
    salary_max: Optional[int] = Field(None, ge=0, le=10000000)
    industry: Optional[str] = safe_optional_string(max_length=100)
    company_size: Optional[str] = Field(None, regex=r'^(startup|small|medium|large|enterprise)$')
    date_posted: Optional[str] = Field(None, regex=r'^(today|week|month|all)$')
    page: Optional[int] = Field(1, ge=1, le=1000)
    limit: Optional[int] = Field(20, ge=1, le=100)
    
    @root_validator
    def validate_salary_range(cls, values):
        salary_min = values.get('salary_min')
        salary_max = values.get('salary_max')
        
        if salary_min and salary_max and salary_min > salary_max:
            raise ValueError('Minimum salary cannot be greater than maximum salary')
        
        return values


class EnhancedFileUpload(EnhancedBaseModel):
    """Enhanced file upload validation."""
    
    filename: str = safe_string(min_length=1, max_length=255)
    content_type: str = Field(..., description="File MIME type")
    size: int = Field(..., ge=1, le=SecurityConfig.MAX_FILE_SIZE, description="File size in bytes")
    file_type: str = Field(..., regex=r'^(resume|cover_letter|portfolio|profile_image|document)$')
    description: Optional[str] = safe_optional_string(max_length=500)
    
    @validator('content_type')
    def validate_content_type(cls, v, values):
        file_type = values.get('file_type')
        
        if file_type in ['resume', 'cover_letter', 'document']:
            if v not in SecurityConfig.ALLOWED_DOCUMENT_TYPES:
                raise ValueError(f'Invalid document type: {v}')
        elif file_type == 'profile_image':
            if v not in SecurityConfig.ALLOWED_IMAGE_TYPES:
                raise ValueError(f'Invalid image type: {v}')
        
        return v
    
    @validator('filename')
    def validate_filename(cls, v):
        # Check for dangerous extensions
        dangerous_extensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.jar']
        file_extension = '.' + v.lower().split('.')[-1] if '.' in v else ''
        
        if file_extension in dangerous_extensions:
            raise ValueError('Dangerous file type detected')
        
        # Remove path traversal attempts
        if '..' in v or '/' in v or '\\' in v:
            raise ValueError('Invalid filename')
        
        return v


class RateLimitManager:
    """Redis-based distributed rate limiting."""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
    
    async def check_rate_limit(
        self,
        key: str,
        limit: int,
        window_seconds: int,
        identifier: str = "request"
    ) -> Dict[str, Any]:
        """Check if request is within rate limit."""
        try:
            # Use sliding window log approach
            now = datetime.utcnow().timestamp()
            window_start = now - window_seconds
            
            # Remove old entries
            await self.redis.zremrangebyscore(key, 0, window_start)
            
            # Count current requests
            current_count = await self.redis.zcard(key)
            
            if current_count >= limit:
                # Get oldest entry to calculate reset time
                oldest_entries = await self.redis.zrange(key, 0, 0, withscores=True)
                if oldest_entries:
                    reset_time = oldest_entries[0][1] + window_seconds
                else:
                    reset_time = now + window_seconds
                
                return {
                    'allowed': False,
                    'limit': limit,
                    'remaining': 0,
                    'reset_time': reset_time,
                    'retry_after': int(reset_time - now),
                }
            
            # Add current request
            await self.redis.zadd(key, {str(now): now})
            await self.redis.expire(key, window_seconds)
            
            return {
                'allowed': True,
                'limit': limit,
                'remaining': limit - current_count - 1,
                'reset_time': now + window_seconds,
                'retry_after': 0,
            }
            
        except Exception as e:
            logger.error("Rate limiting error", error=str(e))
            # Fail open - allow request if rate limiting fails
            return {
                'allowed': True,
                'limit': limit,
                'remaining': limit,
                'reset_time': now + window_seconds,
                'retry_after': 0,
            }
    
    async def create_rate_limit_key(self, request: Request, endpoint: str = None) -> str:
        """Create rate limit key based on request."""
        # Try to get user ID from JWT token
        auth_header = request.headers.get('authorization', '')
        scheme, token = get_authorization_scheme_param(auth_header)
        
        if scheme.lower() == 'bearer' and token:
            # Extract user ID from token (simplified)
            try:
                import jwt
                from ..core.config import get_settings
                settings = get_settings()
                payload = jwt.decode(token, settings.security.secret_key, algorithms=['HS256'])
                user_id = payload.get('sub')
                if user_id:
                    return f"rate_limit:user:{user_id}:{endpoint or 'api'}"
            except:
                pass
        
        # Fall back to IP address
        client_ip = request.client.host if request.client else 'unknown'
        return f"rate_limit:ip:{client_ip}:{endpoint or 'api'}"


def create_rate_limit_middleware(
    limit: int,
    window_seconds: int,
    endpoint: str = None
):
    """Create rate limiting middleware."""
    
    async def rate_limit_middleware(request: Request, call_next):
        # Get Redis client
        from ..core.dependencies import get_redis_client
        redis_client = await get_redis_client()
        
        rate_limiter = RateLimitManager(redis_client)
        
        # Create rate limit key
        key = await rate_limiter.create_rate_limit_key(request, endpoint)
        
        # Check rate limit
        result = await rate_limiter.check_rate_limit(key, limit, window_seconds)
        
        if not result['allowed']:
            logger.warning("Rate limit exceeded", 
                         key=key, 
                         limit=limit, 
                         window=window_seconds)
            
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded",
                headers={
                    'X-RateLimit-Limit': str(result['limit']),
                    'X-RateLimit-Remaining': str(result['remaining']),
                    'X-RateLimit-Reset': str(int(result['reset_time'])),
                    'Retry-After': str(result['retry_after']),
                }
            )
        
        # Add rate limit headers to response
        response = await call_next(request)
        response.headers['X-RateLimit-Limit'] = str(result['limit'])
        response.headers['X-RateLimit-Remaining'] = str(result['remaining'])
        response.headers['X-RateLimit-Reset'] = str(int(result['reset_time']))
        
        return response
    
    return rate_limit_middleware


# Pre-configured rate limiters
def global_rate_limit():
    """Global rate limit: 1000 requests per 15 minutes."""
    return create_rate_limit_middleware(1000, 15 * 60, 'global')


def auth_rate_limit():
    """Auth rate limit: 10 attempts per 15 minutes."""
    return create_rate_limit_middleware(10, 15 * 60, 'auth')


def api_rate_limit():
    """API rate limit: 100 requests per minute."""
    return create_rate_limit_middleware(100, 60, 'api')


def upload_rate_limit():
    """Upload rate limit: 50 uploads per hour."""
    return create_rate_limit_middleware(50, 60 * 60, 'upload')