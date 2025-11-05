"""
Security monitoring and threat detection system.

This module provides:
- Brute force attack detection
- Suspicious activity monitoring
- Automated security responses
- Security event logging and alerting
"""

import asyncio
import json
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Set
from uuid import UUID

import redis.asyncio as redis
from fastapi import Request
from pydantic import BaseModel
import structlog

from .config import get_settings
from ..models.database.auth import SecurityEvent, LoginAttempt, AuditLog

logger = structlog.get_logger(__name__)
settings = get_settings()


class SecurityAlert(BaseModel):
    """Security alert model."""
    event_type: str
    severity: str
    user_id: Optional[UUID] = None
    ip_address: Optional[str] = None
    description: str
    event_data: Dict = {}
    timestamp: datetime = datetime.now(timezone.utc)


class ThreatDetectionRule(BaseModel):
    """Threat detection rule model."""
    name: str
    description: str
    event_types: List[str]
    conditions: Dict
    severity: str
    response_actions: List[str]
    enabled: bool = True


class SecurityMonitor:
    """Security monitoring and threat detection system."""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis_client = redis_client
        self.detection_rules = self._load_detection_rules()
        self.blocked_ips: Set[str] = set()
        
    def _load_detection_rules(self) -> List[ThreatDetectionRule]:
        """Load threat detection rules."""
        return [
            ThreatDetectionRule(
                name="brute_force_login",
                description="Detect brute force login attempts",
                event_types=["login_failed"],
                conditions={
                    "max_attempts": 5,
                    "time_window": 300,  # 5 minutes
                    "per_ip": True
                },
                severity="high",
                response_actions=["block_ip", "alert_admin"]
            ),
            ThreatDetectionRule(
                name="suspicious_login_location",
                description="Detect login from unusual location",
                event_types=["login_success"],
                conditions={
                    "check_geolocation": True,
                    "max_distance_km": 1000
                },
                severity="medium",
                response_actions=["alert_user", "require_mfa"]
            ),
            ThreatDetectionRule(
                name="multiple_failed_mfa",
                description="Detect multiple failed MFA attempts",
                event_types=["mfa_failed"],
                conditions={
                    "max_attempts": 3,
                    "time_window": 600,  # 10 minutes
                    "per_user": True
                },
                severity="medium",
                response_actions=["lock_account", "alert_user"]
            ),
            ThreatDetectionRule(
                name="password_spray_attack",
                description="Detect password spray attacks",
                event_types=["login_failed"],
                conditions={
                    "unique_usernames": 10,
                    "time_window": 300,  # 5 minutes
                    "per_ip": True
                },
                severity="high",
                response_actions=["block_ip", "alert_admin"]
            ),
            ThreatDetectionRule(
                name="account_enumeration",
                description="Detect account enumeration attempts",
                event_types=["user_not_found"],
                conditions={
                    "max_attempts": 20,
                    "time_window": 300,  # 5 minutes
                    "per_ip": True
                },
                severity="medium",
                response_actions=["block_ip", "alert_admin"]
            ),
            ThreatDetectionRule(
                name="rapid_api_requests",
                description="Detect rapid API requests (potential DoS)",
                event_types=["api_request"],
                conditions={
                    "max_requests": 100,
                    "time_window": 60,  # 1 minute
                    "per_ip": True
                },
                severity="medium",
                response_actions=["rate_limit", "alert_admin"]
            )
        ]
    
    async def log_security_event(
        self,
        event_type: str,
        user_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        additional_data: Optional[Dict] = None,
        success: bool = True,
        error_message: Optional[str] = None
    ):
        """Log security event and check for threats."""
        
        event_data = {
            "event_type": event_type,
            "user_id": str(user_id) if user_id else None,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "additional_data": additional_data or {},
            "success": success,
            "error_message": error_message,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        # Store event in Redis for real-time analysis
        await self.redis_client.lpush(
            "security_events",
            json.dumps(event_data)
        )
        
        # Trim list to keep only recent events
        await self.redis_client.ltrim("security_events", 0, 9999)
        
        # Check for threats
        await self._analyze_event(event_data)
        
        logger.info("Security event logged", **event_data)
    
    async def _analyze_event(self, event_data: Dict):
        """Analyze event for potential threats."""
        
        for rule in self.detection_rules:
            if not rule.enabled:
                continue
                
            if event_data["event_type"] in rule.event_types:
                threat_detected = await self._check_rule_conditions(event_data, rule)
                
                if threat_detected:
                    await self._handle_threat_detection(event_data, rule)
    
    async def _check_rule_conditions(self, event_data: Dict, rule: ThreatDetectionRule) -> bool:
        """Check if event matches rule conditions."""
        
        conditions = rule.conditions
        event_type = event_data["event_type"]
        ip_address = event_data.get("ip_address")
        user_id = event_data.get("user_id")
        
        # Brute force detection
        if rule.name == "brute_force_login":
            if ip_address:
                key = f"failed_logins:{ip_address}"
                count = await self.redis_client.incr(key)
                await self.redis_client.expire(key, conditions["time_window"])
                
                return count >= conditions["max_attempts"]
        
        # Password spray detection
        elif rule.name == "password_spray_attack":
            if ip_address:
                key = f"spray_attempts:{ip_address}"
                
                # Add username to set
                username = event_data.get("additional_data", {}).get("username")
                if username:
                    await self.redis_client.sadd(key, username)
                    await self.redis_client.expire(key, conditions["time_window"])
                    
                    # Check unique username count
                    unique_count = await self.redis_client.scard(key)
                    return unique_count >= conditions["unique_usernames"]
        
        # MFA failure detection
        elif rule.name == "multiple_failed_mfa":
            if user_id:
                key = f"mfa_failures:{user_id}"
                count = await self.redis_client.incr(key)
                await self.redis_client.expire(key, conditions["time_window"])
                
                return count >= conditions["max_attempts"]
        
        # Account enumeration detection
        elif rule.name == "account_enumeration":
            if ip_address:
                key = f"enum_attempts:{ip_address}"
                count = await self.redis_client.incr(key)
                await self.redis_client.expire(key, conditions["time_window"])
                
                return count >= conditions["max_attempts"]
        
        # Rate limiting detection
        elif rule.name == "rapid_api_requests":
            if ip_address:
                key = f"api_requests:{ip_address}"
                count = await self.redis_client.incr(key)
                await self.redis_client.expire(key, conditions["time_window"])
                
                return count >= conditions["max_requests"]
        
        return False
    
    async def _handle_threat_detection(self, event_data: Dict, rule: ThreatDetectionRule):
        """Handle detected threat."""
        
        ip_address = event_data.get("ip_address")
        user_id = event_data.get("user_id")
        
        # Create security alert
        alert = SecurityAlert(
            event_type=rule.name,
            severity=rule.severity,
            user_id=UUID(user_id) if user_id else None,
            ip_address=ip_address,
            description=f"Threat detected: {rule.description}",
            event_data=event_data
        )
        
        # Execute response actions
        for action in rule.response_actions:
            await self._execute_response_action(action, alert)
        
        # Store security event
        await self._store_security_event(alert, rule)
        
        logger.warning(
            "Threat detected",
            rule_name=rule.name,
            severity=rule.severity,
            ip_address=ip_address,
            user_id=user_id
        )
    
    async def _execute_response_action(self, action: str, alert: SecurityAlert):
        """Execute security response action."""
        
        try:
            if action == "block_ip" and alert.ip_address:
                await self._block_ip_address(alert.ip_address)
                
            elif action == "rate_limit" and alert.ip_address:
                await self._apply_rate_limit(alert.ip_address)
                
            elif action == "lock_account" and alert.user_id:
                await self._lock_user_account(alert.user_id)
                
            elif action == "alert_admin":
                await self._send_admin_alert(alert)
                
            elif action == "alert_user" and alert.user_id:
                await self._send_user_alert(alert.user_id, alert)
                
            elif action == "require_mfa" and alert.user_id:
                await self._require_mfa_for_user(alert.user_id)
                
        except Exception as e:
            logger.error(
                "Failed to execute response action",
                action=action,
                alert=alert.dict(),
                error=str(e)
            )
    
    async def _block_ip_address(self, ip_address: str, duration: int = 3600):
        """Block IP address for specified duration."""
        
        self.blocked_ips.add(ip_address)
        
        # Store in Redis with expiration
        await self.redis_client.setex(
            f"blocked_ip:{ip_address}",
            duration,
            "blocked"
        )
        
        logger.info("IP address blocked", ip_address=ip_address, duration=duration)
    
    async def _apply_rate_limit(self, ip_address: str, limit: int = 10, window: int = 60):
        """Apply rate limiting to IP address."""
        
        await self.redis_client.setex(
            f"rate_limit:{ip_address}",
            window,
            str(limit)
        )
        
        logger.info("Rate limit applied", ip_address=ip_address, limit=limit, window=window)
    
    async def _lock_user_account(self, user_id: UUID, duration: int = 1800):
        """Lock user account for specified duration."""
        
        lock_until = datetime.now(timezone.utc) + timedelta(seconds=duration)
        
        await self.redis_client.setex(
            f"locked_account:{user_id}",
            duration,
            lock_until.isoformat()
        )
        
        logger.info("User account locked", user_id=str(user_id), duration=duration)
    
    async def _send_admin_alert(self, alert: SecurityAlert):
        """Send alert to administrators."""
        
        # Store alert for admin dashboard
        await self.redis_client.lpush(
            "admin_alerts",
            json.dumps(alert.dict(), default=str)
        )
        
        # Trim alerts list
        await self.redis_client.ltrim("admin_alerts", 0, 99)
        
        # In a real implementation, this would send email/SMS/Slack notifications
        logger.info("Admin alert sent", alert=alert.dict())
    
    async def _send_user_alert(self, user_id: UUID, alert: SecurityAlert):
        """Send security alert to user."""
        
        # Store alert for user
        await self.redis_client.lpush(
            f"user_alerts:{user_id}",
            json.dumps(alert.dict(), default=str)
        )
        
        # Trim user alerts
        await self.redis_client.ltrim(f"user_alerts:{user_id}", 0, 9)
        
        # In a real implementation, this would send email notifications
        logger.info("User alert sent", user_id=str(user_id), alert=alert.dict())
    
    async def _require_mfa_for_user(self, user_id: UUID):
        """Require MFA for user's next login."""
        
        await self.redis_client.setex(
            f"require_mfa:{user_id}",
            86400,  # 24 hours
            "required"
        )
        
        logger.info("MFA required for user", user_id=str(user_id))
    
    async def _store_security_event(self, alert: SecurityAlert, rule: ThreatDetectionRule):
        """Store security event in database."""
        
        # In a real implementation, this would store in the database
        # For now, we'll just log it
        logger.info(
            "Security event stored",
            event_type=alert.event_type,
            severity=alert.severity,
            rule_name=rule.name
        )
    
    async def is_ip_blocked(self, ip_address: str) -> bool:
        """Check if IP address is blocked."""
        
        if ip_address in self.blocked_ips:
            return True
            
        blocked = await self.redis_client.get(f"blocked_ip:{ip_address}")
        return blocked is not None
    
    async def is_account_locked(self, user_id: UUID) -> bool:
        """Check if user account is locked."""
        
        locked = await self.redis_client.get(f"locked_account:{user_id}")
        return locked is not None
    
    async def get_rate_limit(self, ip_address: str) -> Optional[int]:
        """Get current rate limit for IP address."""
        
        limit = await self.redis_client.get(f"rate_limit:{ip_address}")
        return int(limit.decode()) if limit else None
    
    async def is_mfa_required(self, user_id: UUID) -> bool:
        """Check if MFA is required for user."""
        
        required = await self.redis_client.get(f"require_mfa:{user_id}")
        return required is not None
    
    async def get_security_stats(self) -> Dict:
        """Get security monitoring statistics."""
        
        # Get recent events count
        events_count = await self.redis_client.llen("security_events")
        
        # Get blocked IPs count
        blocked_ips_keys = await self.redis_client.keys("blocked_ip:*")
        blocked_ips_count = len(blocked_ips_keys)
        
        # Get locked accounts count
        locked_accounts_keys = await self.redis_client.keys("locked_account:*")
        locked_accounts_count = len(locked_accounts_keys)
        
        # Get admin alerts count
        admin_alerts_count = await self.redis_client.llen("admin_alerts")
        
        return {
            "recent_events": events_count,
            "blocked_ips": blocked_ips_count,
            "locked_accounts": locked_accounts_count,
            "pending_alerts": admin_alerts_count,
            "detection_rules": len(self.detection_rules),
            "active_rules": len([r for r in self.detection_rules if r.enabled])
        }
    
    async def get_recent_alerts(self, limit: int = 10) -> List[Dict]:
        """Get recent security alerts."""
        
        alerts_data = await self.redis_client.lrange("admin_alerts", 0, limit - 1)
        alerts = []
        
        for alert_data in alerts_data:
            try:
                alert = json.loads(alert_data.decode())
                alerts.append(alert)
            except Exception as e:
                logger.error("Failed to parse alert data", error=str(e))
        
        return alerts
    
    async def export_security_events(self, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Export security events for compliance reporting."""
        
        try:
            # Get events from Redis within date range
            events_data = await self.redis_client.lrange("security_events", 0, -1)
            filtered_events = []
            
            for event_data in events_data:
                try:
                    event = json.loads(event_data.decode())
                    event_time = datetime.fromisoformat(event["timestamp"])
                    
                    if start_date <= event_time <= end_date:
                        filtered_events.append(event)
                except Exception as e:
                    logger.error("Failed to parse event data", error=str(e))
            
            # Generate export report
            export_report = {
                "export_id": f"export_{int(datetime.now(timezone.utc).timestamp())}",
                "period": {
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat()
                },
                "total_events": len(filtered_events),
                "events": filtered_events,
                "generated_at": datetime.now(timezone.utc).isoformat()
            }
            
            logger.info(
                "Security events exported",
                export_id=export_report["export_id"],
                event_count=len(filtered_events)
            )
            
            return export_report
            
        except Exception as e:
            logger.error("Failed to export security events", error=str(e))
            raise


class SecurityMiddleware:
    """Security middleware for request monitoring."""
    
    def __init__(self, security_monitor: SecurityMonitor):
        self.security_monitor = security_monitor
    
    async def __call__(self, request: Request, call_next):
        """Process request through security monitoring."""
        
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")
        
        # Check if IP is blocked
        if ip_address and await self.security_monitor.is_ip_blocked(ip_address):
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Check rate limiting
        if ip_address:
            rate_limit = await self.security_monitor.get_rate_limit(ip_address)
            if rate_limit is not None:
                # Apply rate limiting logic here
                pass
        
        # Log API request
        await self.security_monitor.log_security_event(
            event_type="api_request",
            ip_address=ip_address,
            user_agent=user_agent,
            additional_data={
                "method": request.method,
                "path": str(request.url.path),
                "query_params": str(request.query_params)
            }
        )
        
        # Process request
        response = await call_next(request)
        
        return response


# Dependency functions
async def get_security_monitor(redis_client: redis.Redis) -> SecurityMonitor:
    """Get security monitor instance."""
    return SecurityMonitor(redis_client)