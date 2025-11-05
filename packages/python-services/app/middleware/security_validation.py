"""
Security validation middleware for FastAPI.

This middleware provides:
- Automatic input validation and sanitization
- XSS protection with Content Security Policy
- SQL injection detection and prevention
- File upload security validation
- Request size limiting
- Security headers injection
"""

import json
from typing import Dict, List, Optional, Set
from urllib.parse import parse_qs, urlparse

from fastapi import HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import structlog

from app.core.input_validation import (
    InputSanitizer, 
    SecurityViolation, 
    ValidationError,
    FileValidator,
    ALLOWED_FILE_TYPES,
    MAX_FILE_SIZE
)
from app.core.sql_security import SQLInjectionDetector

logger = structlog.get_logger(__name__)


class SecurityValidationMiddleware(BaseHTTPMiddleware):
    """Comprehensive security validation middleware."""
    
    def __init__(
        self,
        app,
        max_request_size: int = 16 * 1024 * 1024,  # 16MB
        enable_csp: bool = True,
        strict_validation: bool = True,
        allowed_origins: Optional[List[str]] = None
    ):
        super().__init__(app)
        self.max_request_size = max_request_size
        self.enable_csp = enable_csp
        self.strict_validation = strict_validation
        self.allowed_origins = allowed_origins or []
        
        # Security headers
        self.security_headers = {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
        }
        
        if self.enable_csp:
            self.security_headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: https:; "
                "font-src 'self' data:; "
                "connect-src 'self'; "
                "frame-ancestors 'none'; "
                "base-uri 'self'; "
                "form-action 'self'"
            )
    
    async def dispatch(self, request: Request, call_next):
        """Process request through security validation."""
        
        try:
            # Check request size
            await self._check_request_size(request)
            
            # Validate request headers
            await self._validate_headers(request)
            
            # Validate request content
            await self._validate_request_content(request)
            
            # Process request
            response = await call_next(request)
            
            # Add security headers to response
            self._add_security_headers(response)
            
            return response
            
        except SecurityViolation as e:
            logger.warning("Security violation detected", error=str(e), path=request.url.path)
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"error": "Security validation failed", "detail": str(e)}
            )
        except ValidationError as e:
            logger.warning("Validation error", error=str(e), path=request.url.path)
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"error": "Input validation failed", "detail": str(e)}
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.error("Security middleware error", error=str(e), path=request.url.path)
            # Continue processing on unexpected errors
            response = await call_next(request)
            self._add_security_headers(response)
            return response
    
    async def _check_request_size(self, request: Request):
        """Check request size limits."""
        content_length = request.headers.get("content-length")
        
        if content_length:
            try:
                size = int(content_length)
                if size > self.max_request_size:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"Request size {size} exceeds maximum {self.max_request_size}"
                    )
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid Content-Length header"
                )
    
    async def _validate_headers(self, request: Request):
        """Validate request headers for security."""
        
        # Check for suspicious headers
        suspicious_headers = [
            "x-forwarded-host",
            "x-original-url", 
            "x-rewrite-url"
        ]
        
        for header in suspicious_headers:
            if header in request.headers:
                value = request.headers[header]
                if self._contains_suspicious_content(value):
                    raise SecurityViolation(f"Suspicious content in header {header}")
        
        # Validate User-Agent
        user_agent = request.headers.get("user-agent", "")
        if self._is_suspicious_user_agent(user_agent):
            logger.warning("Suspicious user agent detected", user_agent=user_agent)
        
        # Validate Referer
        referer = request.headers.get("referer")
        if referer and not self._is_valid_referer(referer):
            logger.warning("Suspicious referer detected", referer=referer)
    
    async def _validate_request_content(self, request: Request):
        """Validate request content for security issues."""
        
        # Skip validation for certain content types
        content_type = request.headers.get("content-type", "")
        
        if content_type.startswith("multipart/form-data"):
            # File upload validation will be handled separately
            return
        
        if content_type.startswith("application/json"):
            await self._validate_json_content(request)
        elif content_type.startswith("application/x-www-form-urlencoded"):
            await self._validate_form_content(request)
        
        # Validate query parameters
        await self._validate_query_parameters(request)
    
    async def _validate_json_content(self, request: Request):
        """Validate JSON request content."""
        try:
            # Read request body
            body = await request.body()
            if not body:
                return
            
            # Parse JSON
            try:
                json_data = json.loads(body.decode('utf-8'))
            except (json.JSONDecodeError, UnicodeDecodeError) as e:
                raise ValidationError(f"Invalid JSON content: {e}")
            
            # Validate JSON content recursively
            self._validate_json_data(json_data)
            
        except Exception as e:
            if isinstance(e, (SecurityViolation, ValidationError)):
                raise
            logger.error("JSON validation error", error=str(e))
    
    def _validate_json_data(self, data, path=""):
        """Recursively validate JSON data."""
        if isinstance(data, dict):
            for key, value in data.items():
                current_path = f"{path}.{key}" if path else key
                
                # Validate key
                if isinstance(key, str):
                    if self._contains_suspicious_content(key):
                        raise SecurityViolation(f"Suspicious content in JSON key: {current_path}")
                
                # Validate value recursively
                self._validate_json_data(value, current_path)
                
        elif isinstance(data, list):
            for i, item in enumerate(data):
                current_path = f"{path}[{i}]"
                self._validate_json_data(item, current_path)
                
        elif isinstance(data, str):
            if self._contains_suspicious_content(data):
                raise SecurityViolation(f"Suspicious content in JSON value: {path}")
    
    async def _validate_form_content(self, request: Request):
        """Validate form-encoded request content."""
        try:
            body = await request.body()
            if not body:
                return
            
            # Parse form data
            form_data = parse_qs(body.decode('utf-8'))
            
            # Validate form fields
            for key, values in form_data.items():
                if self._contains_suspicious_content(key):
                    raise SecurityViolation(f"Suspicious content in form field name: {key}")
                
                for value in values:
                    if self._contains_suspicious_content(value):
                        raise SecurityViolation(f"Suspicious content in form field value: {key}")
                        
        except Exception as e:
            if isinstance(e, (SecurityViolation, ValidationError)):
                raise
            logger.error("Form validation error", error=str(e))
    
    async def _validate_query_parameters(self, request: Request):
        """Validate query parameters."""
        for key, value in request.query_params.items():
            if self._contains_suspicious_content(key):
                raise SecurityViolation(f"Suspicious content in query parameter name: {key}")
            
            if self._contains_suspicious_content(value):
                raise SecurityViolation(f"Suspicious content in query parameter value: {key}")
    
    def _contains_suspicious_content(self, content: str) -> bool:
        """Check if content contains suspicious patterns."""
        if not isinstance(content, str):
            return False
        
        # Check for SQL injection
        is_sql_suspicious, _ = SQLInjectionDetector.detect_sql_injection(content)
        if is_sql_suspicious:
            return True
        
        # Check for XSS
        if InputSanitizer.detect_xss(content):
            return True
        
        # Check for path traversal
        if self._contains_path_traversal(content):
            return True
        
        # Check for command injection
        if self._contains_command_injection(content):
            return True
        
        return False
    
    def _contains_path_traversal(self, content: str) -> bool:
        """Check for path traversal attempts."""
        path_traversal_patterns = [
            "../", "..\\", "..%2f", "..%5c",
            "%2e%2e%2f", "%2e%2e%5c",
            "....//", "....\\\\",
        ]
        
        content_lower = content.lower()
        return any(pattern in content_lower for pattern in path_traversal_patterns)
    
    def _contains_command_injection(self, content: str) -> bool:
        """Check for command injection attempts."""
        command_patterns = [
            "|", "&", ";", "`", "$(",
            "$(", "${", "&&", "||",
            "cmd", "powershell", "bash", "sh",
            "eval", "exec", "system"
        ]
        
        content_lower = content.lower()
        return any(pattern in content_lower for pattern in command_patterns)
    
    def _is_suspicious_user_agent(self, user_agent: str) -> bool:
        """Check if User-Agent is suspicious."""
        if not user_agent:
            return True
        
        # Check for common attack tools
        suspicious_agents = [
            "sqlmap", "nikto", "nmap", "masscan",
            "burp", "zap", "w3af", "skipfish",
            "dirb", "dirbuster", "gobuster",
            "python-requests", "curl", "wget"
        ]
        
        user_agent_lower = user_agent.lower()
        return any(agent in user_agent_lower for agent in suspicious_agents)
    
    def _is_valid_referer(self, referer: str) -> bool:
        """Validate referer header."""
        try:
            parsed = urlparse(referer)
            
            # Check if referer is from allowed origins
            if self.allowed_origins:
                origin = f"{parsed.scheme}://{parsed.netloc}"
                return origin in self.allowed_origins
            
            return True
            
        except Exception:
            return False
    
    def _add_security_headers(self, response: Response):
        """Add security headers to response."""
        for header, value in self.security_headers.items():
            response.headers[header] = value


class FileUploadSecurityMiddleware(BaseHTTPMiddleware):
    """Specialized middleware for file upload security."""
    
    def __init__(
        self,
        app,
        max_file_size: int = MAX_FILE_SIZE,
        allowed_file_types: Optional[Dict[str, List[str]]] = None,
        scan_uploads: bool = True
    ):
        super().__init__(app)
        self.max_file_size = max_file_size
        self.allowed_file_types = allowed_file_types or ALLOWED_FILE_TYPES
        self.scan_uploads = scan_uploads
    
    async def dispatch(self, request: Request, call_next):
        """Process file uploads through security validation."""
        
        content_type = request.headers.get("content-type", "")
        
        # Only process multipart/form-data requests
        if not content_type.startswith("multipart/form-data"):
            return await call_next(request)
        
        try:
            # Validate file uploads
            await self._validate_file_uploads(request)
            
            # Process request
            response = await call_next(request)
            
            return response
            
        except SecurityViolation as e:
            logger.warning("File upload security violation", error=str(e))
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"error": "File upload security validation failed", "detail": str(e)}
            )
        except Exception as e:
            logger.error("File upload middleware error", error=str(e))
            return await call_next(request)
    
    async def _validate_file_uploads(self, request: Request):
        """Validate file uploads for security."""
        
        # This is a simplified validation - in practice, you'd need to
        # parse the multipart data properly
        
        # Check Content-Length
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                size = int(content_length)
                if size > self.max_file_size:
                    raise SecurityViolation(f"File size {size} exceeds maximum {self.max_file_size}")
            except ValueError:
                raise SecurityViolation("Invalid Content-Length for file upload")
        
        # Additional file validation would be done in the endpoint handler
        # using the FileValidator class


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for logging security-relevant requests."""
    
    def __init__(self, app, log_all_requests: bool = False):
        super().__init__(app)
        self.log_all_requests = log_all_requests
        
        # Paths that should always be logged
        self.always_log_paths = {
            "/auth/login",
            "/auth/register", 
            "/auth/password/reset",
            "/auth/mfa/setup",
            "/admin"
        }
        
        # Sensitive parameters to redact
        self.sensitive_params = {
            "password", "token", "secret", "key", 
            "authorization", "auth", "credential"
        }
    
    async def dispatch(self, request: Request, call_next):
        """Log security-relevant requests."""
        
        start_time = time.time()
        
        # Determine if request should be logged
        should_log = (
            self.log_all_requests or
            any(path in str(request.url.path) for path in self.always_log_paths) or
            request.method in ["POST", "PUT", "DELETE", "PATCH"]
        )
        
        if should_log:
            # Log request
            self._log_request(request)
        
        # Process request
        response = await call_next(request)
        
        if should_log:
            # Log response
            duration = time.time() - start_time
            self._log_response(request, response, duration)
        
        return response
    
    def _log_request(self, request: Request):
        """Log incoming request."""
        
        # Redact sensitive query parameters
        query_params = dict(request.query_params)
        for param in self.sensitive_params:
            if param in query_params:
                query_params[param] = "[REDACTED]"
        
        logger.info(
            "Security request",
            method=request.method,
            path=str(request.url.path),
            query_params=query_params,
            user_agent=request.headers.get("user-agent"),
            ip_address=request.client.host if request.client else None,
            content_type=request.headers.get("content-type")
        )
    
    def _log_response(self, request: Request, response: Response, duration: float):
        """Log response."""
        
        logger.info(
            "Security response",
            method=request.method,
            path=str(request.url.path),
            status_code=response.status_code,
            duration=duration,
            ip_address=request.client.host if request.client else None
        )