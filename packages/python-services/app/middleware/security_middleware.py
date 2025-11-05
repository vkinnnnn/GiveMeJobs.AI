"""
Security Monitoring Middleware

FastAPI middleware for real-time security monitoring including:
- Request monitoring and logging
- Threat detection on incoming requests
- Automatic IP blocking for malicious requests
- Rate limiting enforcement
"""

import time
import re
from datetime import datetime
from typing import Callable, Dict, Any
from fastapi import Request, Response, HTTPException
from fastapi.responses import JSONResponse
import structlog
import redis.asyncio as redis

from ..services.security_monitoring import (
    SecurityMonitoringService,
    SecurityEvent,
    SecurityEventType,
    ThreatLevel,
    AuditLogEntry
)

logger = structlog.get_logger()


class SecurityMonitoringMiddleware:
    """Middleware for real-time security monitoring"""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.security_service = SecurityMonitoringService(redis_client)
        self.logger = structlog.get_logger("security_middleware")
        
        # SQL injection patterns
        self.sql_injection_patterns = [
            r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)",
            r"(\b(OR|AND)\s+\d+\s*=\s*\d+)",
            r"('|\"|`).*(OR|AND).*('|\"|`)",
            r"(--|#|/\*|\*/)",
            r"(\bUNION\b.*\bSELECT\b)",
            r"(\bDROP\b.*\bTABLE\b)"
        ]
        
        # XSS patterns
        self.xss_patterns = [
            r"<script[^>]*>.*?</script>",
            r"javascript:",
            r"on\w+\s*=",
            r"<iframe[^>]*>",
            r"<object[^>]*>",
            r"<embed[^>]*>"
        ]
        
        # Compile patterns for performance
        self.compiled_sql_patterns = [re.compile(pattern, re.IGNORECASE) for pattern in self.sql_injection_patterns]
        self.compiled_xss_patterns = [re.compile(pattern, re.IGNORECASE) for pattern in self.xss_patterns]
    
    async def __call__(self, request: Request, call_next: Callable) -> Response:
        """Process request through security monitoring"""
        start_time = time.time()
        
        try:
            # Extract client information
            client_ip = request.client.host if request.client else "unknown"
            user_agent = request.headers.get("user-agent", "")
            endpoint = str(request.url.path)
            method = request.method
            
            # Check if IP is blocked
            if await self.security_service.is_ip_blocked(client_ip):
                await self.logger.awarn("blocked_ip_request", ip_address=client_ip, endpoint=endpoint)
                return JSONResponse(
                    status_code=403,
                    content={"error": "Access denied", "code": "IP_BLOCKED"}
                )
            
            # Monitor request for threats
            threat_detected = await self._analyze_request_for_threats(request, client_ip, user_agent, endpoint)
            
            if threat_detected:
                return JSONResponse(
                    status_code=400,
                    content={"error": "Request blocked by security policy", "code": "THREAT_DETECTED"}
                )
            
            # Process request
            response = await call_next(request)
            
            # Log successful request
            processing_time = time.time() - start_time
            await self._log_request(request, response, client_ip, user_agent, processing_time)
            
            return response
            
        except Exception as e:
            # Log error and continue
            await self.logger.aerror("Security middleware error", error=str(e))
            response = await call_next(request)
            return response
    
    async def _analyze_request_for_threats(
        self, 
        request: Request, 
        client_ip: str, 
        user_agent: str, 
        endpoint: str
    ) -> bool:
        """Analyze incoming request for security threats"""
        try:
            # Get request body for analysis
            request_body = ""
            if request.method in ["POST", "PUT", "PATCH"]:
                try:
                    body = await request.body()
                    request_body = body.decode('utf-8', errors='ignore')
                except Exception:
                    pass
            
            # Get query parameters
            query_params = str(request.query_params)
            
            # Combine all request data for analysis
            request_data = f"{endpoint} {query_params} {request_body}".lower()
            
            # Check for SQL injection
            if await self._detect_sql_injection(request_data, client_ip, endpoint):
                return True
            
            # Check for XSS attempts
            if await self._detect_xss_attempt(request_data, client_ip, endpoint):
                return True
            
            # Check for suspicious patterns
            if await self._detect_suspicious_patterns(request_data, client_ip, endpoint, user_agent):
                return True
            
            return False
            
        except Exception as e:
            await self.logger.aerror("Threat analysis failed", error=str(e))
            return False
    
    async def _detect_sql_injection(self, request_data: str, client_ip: str, endpoint: str) -> bool:
        """Detect SQL injection attempts"""
        try:
            for pattern in self.compiled_sql_patterns:
                if pattern.search(request_data):
                    # Create security event
                    event = SecurityEvent(
                        event_id=f"sqli_{int(time.time())}_{hash(client_ip) % 10000}",
                        event_type=SecurityEventType.SQL_INJECTION,
                        threat_level=ThreatLevel.CRITICAL,
                        timestamp=datetime.utcnow(),
                        user_id=None,
                        ip_address=client_ip,
                        user_agent="",
                        endpoint=endpoint,
                        details={"pattern_matched": pattern.pattern, "request_data": request_data[:200]},
                        response_action="block_request_and_alert"
                    )
                    
                    await self.security_service._handle_security_event(event)
                    
                    await self.logger.acritical(
                        "sql_injection_detected",
                        ip_address=client_ip,
                        endpoint=endpoint,
                        pattern=pattern.pattern
                    )
                    
                    return True
            
            return False
            
        except Exception as e:
            await self.logger.aerror("SQL injection detection failed", error=str(e))
            return False
    
    async def _detect_xss_attempt(self, request_data: str, client_ip: str, endpoint: str) -> bool:
        """Detect XSS attempts"""
        try:
            for pattern in self.compiled_xss_patterns:
                if pattern.search(request_data):
                    # Create security event
                    event = SecurityEvent(
                        event_id=f"xss_{int(time.time())}_{hash(client_ip) % 10000}",
                        event_type=SecurityEventType.XSS_ATTEMPT,
                        threat_level=ThreatLevel.HIGH,
                        timestamp=datetime.utcnow(),
                        user_id=None,
                        ip_address=client_ip,
                        user_agent="",
                        endpoint=endpoint,
                        details={"pattern_matched": pattern.pattern, "request_data": request_data[:200]},
                        response_action="block_request_and_alert"
                    )
                    
                    await self.security_service._handle_security_event(event)
                    
                    await self.logger.aerror(
                        "xss_attempt_detected",
                        ip_address=client_ip,
                        endpoint=endpoint,
                        pattern=pattern.pattern
                    )
                    
                    return True
            
            return False
            
        except Exception as e:
            await self.logger.aerror("XSS detection failed", error=str(e))
            return False
    
    async def _detect_suspicious_patterns(
        self, 
        request_data: str, 
        client_ip: str, 
        endpoint: str, 
        user_agent: str
    ) -> bool:
        """Detect other suspicious patterns"""
        try:
            # Check for suspicious user agents
            suspicious_agents = [
                "sqlmap", "nikto", "nmap", "masscan", "zap", "burp",
                "wget", "curl", "python-requests", "bot", "crawler"
            ]
            
            if any(agent in user_agent.lower() for agent in suspicious_agents):
                event = SecurityEvent(
                    event_id=f"susp_{int(time.time())}_{hash(client_ip) % 10000}",
                    event_type=SecurityEventType.SUSPICIOUS_ACTIVITY,
                    threat_level=ThreatLevel.MEDIUM,
                    timestamp=datetime.utcnow(),
                    user_id=None,
                    ip_address=client_ip,
                    user_agent=user_agent,
                    endpoint=endpoint,
                    details={"reason": "suspicious_user_agent", "user_agent": user_agent},
                    response_action="alert_security_team"
                )
                
                await self.security_service._handle_security_event(event)
                
                await self.logger.awarn(
                    "suspicious_user_agent",
                    ip_address=client_ip,
                    user_agent=user_agent,
                    endpoint=endpoint
                )
            
            # Check for path traversal attempts
            if "../" in request_data or "..%2f" in request_data or "..%5c" in request_data:
                event = SecurityEvent(
                    event_id=f"path_{int(time.time())}_{hash(client_ip) % 10000}",
                    event_type=SecurityEventType.UNAUTHORIZED_ACCESS,
                    threat_level=ThreatLevel.HIGH,
                    timestamp=datetime.utcnow(),
                    user_id=None,
                    ip_address=client_ip,
                    user_agent=user_agent,
                    endpoint=endpoint,
                    details={"reason": "path_traversal_attempt"},
                    response_action="block_ip_temporary"
                )
                
                await self.security_service._handle_security_event(event)
                return True
            
            return False
            
        except Exception as e:
            await self.logger.aerror("Suspicious pattern detection failed", error=str(e))
            return False
    
    async def _log_request(
        self, 
        request: Request, 
        response: Response, 
        client_ip: str, 
        user_agent: str, 
        processing_time: float
    ):
        """Log request for monitoring purposes"""
        try:
            # Only log sensitive endpoints or failed requests
            sensitive_endpoints = ["/auth/", "/admin/", "/api/users/", "/api/security/"]
            is_sensitive = any(endpoint in str(request.url.path) for endpoint in sensitive_endpoints)
            is_failed = response.status_code >= 400
            
            if is_sensitive or is_failed:
                # Calculate risk score based on various factors
                risk_score = 0.0
                
                if response.status_code >= 500:
                    risk_score += 3.0
                elif response.status_code >= 400:
                    risk_score += 1.0
                
                if processing_time > 5.0:
                    risk_score += 2.0
                elif processing_time > 2.0:
                    risk_score += 1.0
                
                if is_sensitive:
                    risk_score += 2.0
                
                # Create audit log entry
                audit_entry = AuditLogEntry(
                    log_id=f"req_{int(datetime.utcnow().timestamp())}_{hash(str(request.url)) % 10000}",
                    user_id=getattr(request.state, 'user_id', None),
                    action=f"{request.method} {request.url.path}",
                    resource=str(request.url.path),
                    ip_address=client_ip,
                    user_agent=user_agent,
                    success=response.status_code < 400,
                    details={
                        "status_code": response.status_code,
                        "processing_time": processing_time,
                        "method": request.method,
                        "query_params": str(request.query_params)
                    },
                    risk_score=min(risk_score, 10.0)
                )
                
                await self.security_service.log_audit_event(audit_entry)
            
        except Exception as e:
            await self.logger.aerror("Request logging failed", error=str(e))