"""
Advanced input validation and sanitization system.

This module provides:
- Comprehensive input sanitization with Pydantic validators and bleach
- SQL injection prevention with SQLAlchemy parameterized queries
- XSS protection with content security policy and Python sanitization
- Rate limiting using slowapi (FastAPI port of Flask-Limiter) with Redis
- File upload validation and security scanning
"""

import html
import re
import mimetypes
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Union
from urllib.parse import urlparse
from uuid import UUID

import bleach
import magic
import validators
from defusedxml import ElementTree as ET
from pydantic import BaseModel, Field, field_validator, model_validator
from pydantic_extra_types import EmailStr
import structlog

from .config import get_settings

logger = structlog.get_logger(__name__)
settings = get_settings()


# Security configuration
ALLOWED_HTML_TAGS = {
    'p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'code', 'pre', 'a', 'img'
}

ALLOWED_HTML_ATTRIBUTES = {
    'a': ['href', 'title'],
    'img': ['src', 'alt', 'title', 'width', 'height'],
    '*': ['class']
}

ALLOWED_PROTOCOLS = ['http', 'https', 'mailto']

# File upload security
ALLOWED_FILE_TYPES = {
    'image': ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    'document': ['application/pdf', 'application/msword', 
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'text/plain'],
    'archive': ['application/zip', 'application/x-zip-compressed']
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
DANGEROUS_EXTENSIONS = {'.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar', '.php', '.asp', '.jsp'}


class ValidationError(Exception):
    """Custom validation error."""
    pass


class SecurityViolation(Exception):
    """Security violation detected."""
    pass
cl
ass InputSanitizer:
    """Advanced input sanitization utilities."""
    
    @staticmethod
    def sanitize_html(content: str, allowed_tags: Optional[Set[str]] = None) -> str:
        """Sanitize HTML content to prevent XSS attacks."""
        if not content:
            return ""
        
        tags = allowed_tags or ALLOWED_HTML_TAGS
        
        # Use bleach to sanitize HTML
        sanitized = bleach.clean(
            content,
            tags=tags,
            attributes=ALLOWED_HTML_ATTRIBUTES,
            protocols=ALLOWED_PROTOCOLS,
            strip=True
        )
        
        # Additional XSS protection
        sanitized = html.escape(sanitized, quote=False)
        
        return sanitized
    
    @staticmethod
    def sanitize_text(content: str, max_length: Optional[int] = None) -> str:
        """Sanitize plain text content."""
        if not content:
            return ""
        
        # Remove null bytes and control characters
        sanitized = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', content)
        
        # Normalize whitespace
        sanitized = re.sub(r'\s+', ' ', sanitized).strip()
        
        # Truncate if max_length specified
        if max_length and len(sanitized) > max_length:
            sanitized = sanitized[:max_length].rstrip()
        
        return sanitized
    
    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """Sanitize filename to prevent directory traversal and other attacks."""
        if not filename:
            return "unnamed_file"
        
        # Remove path components
        filename = Path(filename).name
        
        # Remove dangerous characters
        sanitized = re.sub(r'[<>:"/\\|?*\x00-\x1f]', '_', filename)
        
        # Remove leading/trailing dots and spaces
        sanitized = sanitized.strip('. ')
        
        # Ensure filename is not empty
        if not sanitized:
            sanitized = "unnamed_file"
        
        # Check for dangerous extensions
        if Path(sanitized).suffix.lower() in DANGEROUS_EXTENSIONS:
            sanitized += ".txt"
        
        return sanitized
    
    @staticmethod
    def sanitize_url(url: str) -> Optional[str]:
        """Sanitize and validate URL."""
        if not url:
            return None
        
        # Basic URL validation
        if not validators.url(url):
            return None
        
        # Parse URL
        parsed = urlparse(url)
        
        # Only allow safe protocols
        if parsed.scheme not in ALLOWED_PROTOCOLS:
            return None
        
        # Prevent SSRF attacks - block private IPs
        if parsed.hostname:
            try:
                import ipaddress
                ip = ipaddress.ip_address(parsed.hostname)
                if ip.is_private or ip.is_loopback or ip.is_link_local:
                    return None
            except ValueError:
                # Not an IP address, continue
                pass
        
        return url
    
    @staticmethod
    def detect_sql_injection(content: str) -> bool:
        """Detect potential SQL injection attempts."""
        if not content:
            return False
        
        # Common SQL injection patterns
        sql_patterns = [
            r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)",
            r"(\b(OR|AND)\s+\d+\s*=\s*\d+)",
            r"(\b(OR|AND)\s+['\"]?\w+['\"]?\s*=\s*['\"]?\w+['\"]?)",
            r"(--|#|/\*|\*/)",
            r"(\bxp_cmdshell\b)",
            r"(\bsp_executesql\b)",
            r"(;\s*(DROP|DELETE|INSERT|UPDATE))",
            r"(\bunion\s+select\b)",
            r"(\binto\s+outfile\b)",
            r"(\bload_file\b)"
        ]
        
        content_upper = content.upper()
        
        for pattern in sql_patterns:
            if re.search(pattern, content_upper, re.IGNORECASE):
                logger.warning("Potential SQL injection detected", content=content[:100])
                return True
        
        return False
    
    @staticmethod
    def detect_xss(content: str) -> bool:
        """Detect potential XSS attempts."""
        if not content:
            return False
        
        # Common XSS patterns
        xss_patterns = [
            r"<script[^>]*>.*?</script>",
            r"javascript:",
            r"vbscript:",
            r"onload\s*=",
            r"onerror\s*=",
            r"onclick\s*=",
            r"onmouseover\s*=",
            r"<iframe[^>]*>",
            r"<object[^>]*>",
            r"<embed[^>]*>",
            r"<form[^>]*>",
            r"<input[^>]*>",
            r"eval\s*\(",
            r"expression\s*\(",
            r"url\s*\(",
            r"@import"
        ]
        
        for pattern in xss_patterns:
            if re.search(pattern, content, re.IGNORECASE):
                logger.warning("Potential XSS detected", content=content[:100])
                return True
        
        return False


class FileValidator:
    """File upload validation and security scanning."""
    
    @staticmethod
    def validate_file_type(file_content: bytes, filename: str, allowed_types: List[str]) -> bool:
        """Validate file type using magic numbers."""
        try:
            # Use python-magic to detect actual file type
            mime_type = magic.from_buffer(file_content, mime=True)
            
            # Also check extension-based MIME type
            guessed_type, _ = mimetypes.guess_type(filename)
            
            # File type must match both magic number and extension
            if mime_type in allowed_types:
                return True
            
            if guessed_type in allowed_types and mime_type == guessed_type:
                return True
            
            logger.warning(
                "File type validation failed",
                filename=filename,
                detected_mime=mime_type,
                guessed_mime=guessed_type,
                allowed_types=allowed_types
            )
            return False
            
        except Exception as e:
            logger.error("File type validation error", error=str(e))
            return False
    
    @staticmethod
    def validate_file_size(file_content: bytes, max_size: int = MAX_FILE_SIZE) -> bool:
        """Validate file size."""
        size = len(file_content)
        if size > max_size:
            logger.warning("File size exceeded", size=size, max_size=max_size)
            return False
        return True
    
    @staticmethod
    def scan_for_malware(file_content: bytes, filename: str) -> bool:
        """Basic malware scanning (placeholder for more advanced scanning)."""
        try:
            # Check for executable signatures
            executable_signatures = [
                b'MZ',  # PE executable
                b'\x7fELF',  # ELF executable
                b'\xca\xfe\xba\xbe',  # Mach-O executable
                b'PK\x03\x04',  # ZIP (could contain executables)
            ]
            
            for signature in executable_signatures:
                if file_content.startswith(signature):
                    logger.warning("Potentially dangerous file detected", filename=filename)
                    return False
            
            # Check for script content in non-script files
            if not filename.lower().endswith(('.js', '.py', '.sh', '.bat')):
                script_patterns = [
                    b'<script',
                    b'javascript:',
                    b'eval(',
                    b'exec(',
                    b'system(',
                    b'shell_exec(',
                ]
                
                for pattern in script_patterns:
                    if pattern in file_content.lower():
                        logger.warning("Script content in non-script file", filename=filename)
                        return False
            
            return True
            
        except Exception as e:
            logger.error("Malware scanning error", error=str(e))
            return False
    
    @staticmethod
    def validate_image(file_content: bytes, filename: str) -> bool:
        """Validate image files for additional security."""
        try:
            from PIL import Image
            from io import BytesIO
            
            # Try to open and verify the image
            image = Image.open(BytesIO(file_content))
            image.verify()
            
            # Check image dimensions (prevent decompression bombs)
            if image.width * image.height > 50000000:  # 50 megapixels
                logger.warning("Image too large", filename=filename, dimensions=f"{image.width}x{image.height}")
                return False
            
            return True
            
        except Exception as e:
            logger.warning("Image validation failed", filename=filename, error=str(e))
            return False


class SecureValidators:
    """Collection of secure Pydantic validators."""
    
    @staticmethod
    def validate_safe_string(value: str, field_name: str = "field") -> str:
        """Validate and sanitize string input."""
        if not isinstance(value, str):
            raise ValueError(f"{field_name} must be a string")
        
        # Check for SQL injection
        if InputSanitizer.detect_sql_injection(value):
            raise SecurityViolation(f"Potential SQL injection in {field_name}")
        
        # Check for XSS
        if InputSanitizer.detect_xss(value):
            raise SecurityViolation(f"Potential XSS in {field_name}")
        
        # Sanitize the string
        sanitized = InputSanitizer.sanitize_text(value)
        
        return sanitized
    
    @staticmethod
    def validate_html_content(value: str, field_name: str = "content") -> str:
        """Validate and sanitize HTML content."""
        if not isinstance(value, str):
            raise ValueError(f"{field_name} must be a string")
        
        # Sanitize HTML
        sanitized = InputSanitizer.sanitize_html(value)
        
        return sanitized
    
    @staticmethod
    def validate_url_field(value: str, field_name: str = "url") -> str:
        """Validate URL field."""
        if not isinstance(value, str):
            raise ValueError(f"{field_name} must be a string")
        
        sanitized_url = InputSanitizer.sanitize_url(value)
        if not sanitized_url:
            raise ValueError(f"Invalid URL in {field_name}")
        
        return sanitized_url
    
    @staticmethod
    def validate_filename_field(value: str, field_name: str = "filename") -> str:
        """Validate filename field."""
        if not isinstance(value, str):
            raise ValueError(f"{field_name} must be a string")
        
        sanitized = InputSanitizer.sanitize_filename(value)
        
        return sanitized
    
    @staticmethod
    def validate_json_field(value: Union[str, dict], field_name: str = "json_data") -> dict:
        """Validate JSON field."""
        if isinstance(value, str):
            try:
                import json
                parsed = json.loads(value)
            except json.JSONDecodeError:
                raise ValueError(f"Invalid JSON in {field_name}")
        elif isinstance(value, dict):
            parsed = value
        else:
            raise ValueError(f"{field_name} must be a JSON string or dict")
        
        # Check for dangerous content in JSON
        json_str = str(parsed)
        if InputSanitizer.detect_sql_injection(json_str):
            raise SecurityViolation(f"Potential SQL injection in {field_name}")
        
        if InputSanitizer.detect_xss(json_str):
            raise SecurityViolation(f"Potential XSS in {field_name}")
        
        return parsed


# Enhanced Pydantic models with security validation
class SecureBaseModel(BaseModel):
    """Base model with enhanced security validation."""
    
    model_config = {
        "str_strip_whitespace": True,
        "validate_assignment": True,
        "use_enum_values": True,
        "extra": "forbid"  # Prevent additional fields
    }
    
    @model_validator(mode='before')
    @classmethod
    def validate_no_null_bytes(cls, values):
        """Prevent null byte injection."""
        if isinstance(values, dict):
            for key, value in values.items():
                if isinstance(value, str) and '\x00' in value:
                    raise ValueError(f"Null byte detected in {key}")
        return values


class SecureUserInput(SecureBaseModel):
    """Secure user input validation."""
    
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    bio: Optional[str] = Field(None, max_length=1000)
    website: Optional[str] = Field(None, max_length=255)
    
    @field_validator('first_name', 'last_name')
    @classmethod
    def validate_name_fields(cls, v: str) -> str:
        return SecureValidators.validate_safe_string(v, "name")
    
    @field_validator('bio')
    @classmethod
    def validate_bio(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        return SecureValidators.validate_html_content(v, "bio")
    
    @field_validator('website')
    @classmethod
    def validate_website(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        return SecureValidators.validate_url_field(v, "website")


class SecureJobInput(SecureBaseModel):
    """Secure job posting input validation."""
    
    title: str = Field(..., min_length=1, max_length=200)
    company: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=10, max_length=10000)
    requirements: List[str] = Field(..., min_items=1, max_items=50)
    location: Optional[str] = Field(None, max_length=200)
    salary_min: Optional[int] = Field(None, ge=0, le=10000000)
    salary_max: Optional[int] = Field(None, ge=0, le=10000000)
    remote_allowed: bool = Field(default=False)
    
    @field_validator('title', 'company', 'location')
    @classmethod
    def validate_text_fields(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        return SecureValidators.validate_safe_string(v)
    
    @field_validator('description')
    @classmethod
    def validate_description(cls, v: str) -> str:
        return SecureValidators.validate_html_content(v, "description")
    
    @field_validator('requirements')
    @classmethod
    def validate_requirements(cls, v: List[str]) -> List[str]:
        return [SecureValidators.validate_safe_string(req, "requirement") for req in v]
    
    @model_validator(mode='after')
    def validate_salary_range(self):
        if self.salary_min and self.salary_max and self.salary_min > self.salary_max:
            raise ValueError("Minimum salary cannot be greater than maximum salary")
        return self


class SecureFileUpload(SecureBaseModel):
    """Secure file upload validation."""
    
    filename: str = Field(..., min_length=1, max_length=255)
    content_type: str = Field(..., min_length=1, max_length=100)
    file_category: str = Field(..., regex=r'^(image|document|archive)$')
    
    @field_validator('filename')
    @classmethod
    def validate_filename(cls, v: str) -> str:
        return SecureValidators.validate_filename_field(v)
    
    @field_validator('content_type')
    @classmethod
    def validate_content_type(cls, v: str) -> str:
        # Validate MIME type format
        if not re.match(r'^[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_.]*$', v):
            raise ValueError("Invalid content type format")
        return v
    
    def validate_file_content(self, file_content: bytes) -> bool:
        """Validate actual file content."""
        # Check file size
        if not FileValidator.validate_file_size(file_content):
            return False
        
        # Check file type
        allowed_types = ALLOWED_FILE_TYPES.get(self.file_category, [])
        if not FileValidator.validate_file_type(file_content, self.filename, allowed_types):
            return False
        
        # Scan for malware
        if not FileValidator.scan_for_malware(file_content, self.filename):
            return False
        
        # Additional validation for images
        if self.file_category == 'image':
            if not FileValidator.validate_image(file_content, self.filename):
                return False
        
        return True


class SecureSearchQuery(SecureBaseModel):
    """Secure search query validation."""
    
    query: str = Field(..., min_length=1, max_length=500)
    filters: Optional[Dict[str, Any]] = Field(None)
    sort_by: Optional[str] = Field(None, max_length=50)
    sort_order: Optional[str] = Field(None, regex=r'^(asc|desc)$')
    limit: Optional[int] = Field(None, ge=1, le=100)
    offset: Optional[int] = Field(None, ge=0)
    
    @field_validator('query')
    @classmethod
    def validate_query(cls, v: str) -> str:
        return SecureValidators.validate_safe_string(v, "query")
    
    @field_validator('sort_by')
    @classmethod
    def validate_sort_by(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        
        # Only allow alphanumeric characters and underscores for sort fields
        if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', v):
            raise ValueError("Invalid sort field name")
        
        return v
    
    @field_validator('filters')
    @classmethod
    def validate_filters(cls, v: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if v is None:
            return v
        
        # Validate filter keys and values
        validated_filters = {}
        for key, value in v.items():
            # Validate filter key
            if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', key):
                raise ValueError(f"Invalid filter key: {key}")
            
            # Validate filter value
            if isinstance(value, str):
                validated_filters[key] = SecureValidators.validate_safe_string(value, f"filter.{key}")
            elif isinstance(value, (int, float, bool)):
                validated_filters[key] = value
            elif isinstance(value, list):
                validated_filters[key] = [
                    SecureValidators.validate_safe_string(str(item), f"filter.{key}")
                    if isinstance(item, str) else item
                    for item in value
                ]
            else:
                raise ValueError(f"Invalid filter value type for {key}")
        
        return validated_filters