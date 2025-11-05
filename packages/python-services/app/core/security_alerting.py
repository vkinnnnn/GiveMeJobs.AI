"""
Security event monitoring and alerting system.

This module provides:
- Real-time security event monitoring
- Multi-channel alerting (email, SMS, Slack, webhook)
- Alert correlation and deduplication
- Escalation policies and on-call management
- Security dashboard and reporting
"""

import asyncio
import json
import smtplib
from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from enum import Enum
from typing import Any, Dict, List, Optional, Set
from uuid import UUID, uuid4

import httpx
import redis.asyncio as redis
from pydantic import BaseModel, Field
import structlog

from .config import get_settings
from .threat_detection import ThreatIndicator, ThreatLevel

logger = structlog.get_logger(__name__)
settings = get_settings()


class AlertChannel(str, Enum):
    """Alert delivery channels."""
    
    EMAIL = "email"
    SMS = "sms"
    SLACK = "slack"
    WEBHOOK = "webhook"
    DASHBOARD = "dashboard"
    SYSLOG = "syslog"


class AlertStatus(str, Enum):
    """Alert status states."""
    
    OPEN = "open"
    ACKNOWLEDGED = "acknowledged"
    INVESTIGATING = "investigating"
    RESOLVED = "resolved"
    CLOSED = "closed"
    FALSE_POSITIVE = "false_positive"


class EscalationLevel(str, Enum):
    """Alert escalation levels."""
    
    L1 = "l1"  # First responder
    L2 = "l2"  # Security analyst
    L3 = "l3"  # Security engineer
    L4 = "l4"  # Security manager
    EXECUTIVE = "executive"  # C-level


class SecurityAlert(BaseModel):
    """Security alert data model."""
    
    id: UUID = Field(default_factory=uuid4)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Alert classification
    title: str
    description: str
    severity: ThreatLevel
    category: str
    
    # Source information
    source: str = "threat_detection"
    source_ip: Optional[str] = None
    user_id: Optional[UUID] = None
    
    # Alert details
    indicators: List[str] = Field(default_factory=list)
    affected_resources: List[str] = Field(default_factory=list)
    recommended_actions: List[str] = Field(default_factory=list)
    
    # Status and handling
    status: AlertStatus = AlertStatus.OPEN
    assigned_to: Optional[str] = None
    escalation_level: EscalationLevel = EscalationLevel.L1
    
    # Correlation
    correlation_id: Optional[str] = None
    related_alerts: List[str] = Field(default_factory=list)
    
    # Metadata
    tags: List[str] = Field(default_factory=list)
    additional_data: Optional[Dict[str, Any]] = None
    
    # Timestamps
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None


class AlertRule(BaseModel):
    """Alert rule configuration."""
    
    id: str
    name: str
    description: str
    enabled: bool = True
    
    # Trigger conditions
    conditions: Dict[str, Any]
    severity_threshold: ThreatLevel = ThreatLevel.MEDIUM
    
    # Delivery configuration
    channels: List[AlertChannel]
    recipients: List[str] = Field(default_factory=list)
    
    # Throttling
    throttle_minutes: int = 5
    max_alerts_per_hour: int = 10
    
    # Escalation
    escalation_policy: Optional[str] = None
    auto_escalate_minutes: int = 30


class SecurityAlertManager:
    """Comprehensive security alerting system."""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis_client = redis_client
        self.http_client = httpx.AsyncClient(timeout=30.0)
        
        # Alert rules
        self.alert_rules = self._load_alert_rules()
        
        # Channel configurations
        self.channel_configs = {
            AlertChannel.EMAIL: {
                "smtp_server": settings.monitoring.get("smtp_server", "localhost"),
                "smtp_port": settings.monitoring.get("smtp_port", 587),
                "username": settings.monitoring.get("smtp_username"),
                "password": settings.monitoring.get("smtp_password"),
                "from_address": settings.monitoring.get("from_email", "security@givemejobs.ai")
            },
            AlertChannel.SLACK: {
                "webhook_url": settings.monitoring.get("slack_webhook_url"),
                "channel": settings.monitoring.get("slack_channel", "#security-alerts")
            },
            AlertChannel.WEBHOOK: {
                "url": settings.monitoring.get("webhook_url"),
                "headers": settings.monitoring.get("webhook_headers", {})
            }
        }
        
        # Escalation policies
        self.escalation_policies = self._load_escalation_policies()
        
        # Alert correlation
        self.correlation_window = 300  # 5 minutes
        self.correlation_cache: Dict[str, List[str]] = {}
    
    def _load_alert_rules(self) -> List[AlertRule]:
        """Load alert rules configuration."""
        
        return [
            AlertRule(
                id="critical_threats",
                name="Critical Threat Alerts",
                description="Immediate alerts for critical threats",
                conditions={"severity": ThreatLevel.CRITICAL},
                channels=[AlertChannel.EMAIL, AlertChannel.SLACK, AlertChannel.SMS],
                recipients=["security-team@givemejobs.ai", "+1234567890"],
                throttle_minutes=0,  # No throttling for critical
                escalation_policy="critical_escalation"
            ),
            AlertRule(
                id="high_threats",
                name="High Severity Threat Alerts",
                description="Alerts for high severity threats",
                conditions={"severity": ThreatLevel.HIGH},
                channels=[AlertChannel.EMAIL, AlertChannel.SLACK],
                recipients=["security-team@givemejobs.ai"],
                throttle_minutes=5,
                escalation_policy="standard_escalation"
            ),
            AlertRule(
                id="authentication_failures",
                name="Authentication Failure Alerts",
                description="Alerts for authentication-related security events",
                conditions={"category": "authentication", "severity": ThreatLevel.MEDIUM},
                channels=[AlertChannel.SLACK, AlertChannel.DASHBOARD],
                recipients=["security-team@givemejobs.ai"],
                throttle_minutes=15
            )
        ]
    
    def _load_escalation_policies(self) -> Dict[str, Dict]:
        """Load escalation policies."""
        
        return {
            "critical_escalation": {
                "levels": [
                    {"level": EscalationLevel.L1, "timeout_minutes": 5, "contacts": ["oncall-l1@givemejobs.ai"]},
                    {"level": EscalationLevel.L2, "timeout_minutes": 10, "contacts": ["oncall-l2@givemejobs.ai"]},
                    {"level": EscalationLevel.L3, "timeout_minutes": 15, "contacts": ["security-manager@givemejobs.ai"]},
                    {"level": EscalationLevel.EXECUTIVE, "timeout_minutes": 30, "contacts": ["cto@givemejobs.ai"]}
                ]
            },
            "standard_escalation": {
                "levels": [
                    {"level": EscalationLevel.L1, "timeout_minutes": 15, "contacts": ["security-team@givemejobs.ai"]},
                    {"level": EscalationLevel.L2, "timeout_minutes": 30, "contacts": ["security-manager@givemejobs.ai"]},
                    {"level": EscalationLevel.L3, "timeout_minutes": 60, "contacts": ["cto@givemejobs.ai"]}
                ]
            }
        }
    
    async def process_threat_indicator(self, threat: ThreatIndicator) -> Optional[SecurityAlert]:
        """Process a threat indicator and generate alerts."""
        
        try:
            # Check if alert should be generated
            matching_rules = self._find_matching_rules(threat)
            if not matching_rules:
                return None
            
            # Create security alert
            alert = SecurityAlert(
                title=f"{threat.category.value.title()} Threat Detected",
                description=threat.description,
                severity=threat.level,
                category=threat.category.value,
                source_ip=threat.source_ip,
                user_id=threat.user_id,
                indicators=threat.indicators,
                affected_resources=threat.affected_resources,
                recommended_actions=[action.value for action in threat.recommended_actions],
                tags=[threat.category.value, threat.level.value]
            )
            
            # Correlate with existing alerts
            await self._correlate_alert(alert)
            
            # Store alert
            await self._store_alert(alert)
            
            # Send notifications
            for rule in matching_rules:
                if await self._should_send_alert(rule, alert):
                    await self._send_alert_notifications(rule, alert)
            
            # Schedule escalation if needed
            for rule in matching_rules:
                if rule.escalation_policy:
                    await self._schedule_escalation(rule, alert)
            
            logger.info(
                "Security alert generated",
                alert_id=str(alert.id),
                severity=alert.severity.value,
                category=alert.category
            )
            
            return alert
            
        except Exception as e:
            logger.error("Failed to process threat indicator", error=str(e))
            return None 
   
    def _find_matching_rules(self, threat: ThreatIndicator) -> List[AlertRule]:
        """Find alert rules that match the threat."""
        
        matching_rules = []
        
        for rule in self.alert_rules:
            if not rule.enabled:
                continue
            
            # Check severity threshold
            if self._compare_severity(threat.level, rule.severity_threshold) < 0:
                continue
            
            # Check conditions
            if self._evaluate_alert_conditions(rule.conditions, threat):
                matching_rules.append(rule)
        
        return matching_rules
    
    def _compare_severity(self, severity1: ThreatLevel, severity2: ThreatLevel) -> int:
        """Compare threat severity levels."""
        
        severity_order = {
            ThreatLevel.LOW: 1,
            ThreatLevel.MEDIUM: 2,
            ThreatLevel.HIGH: 3,
            ThreatLevel.CRITICAL: 4
        }
        
        return severity_order[severity1] - severity_order[severity2]
    
    def _evaluate_alert_conditions(self, conditions: Dict[str, Any], threat: ThreatIndicator) -> bool:
        """Evaluate if threat matches alert conditions."""
        
        for key, value in conditions.items():
            if key == "severity":
                if threat.level != value:
                    return False
            elif key == "category":
                if threat.category.value != value:
                    return False
            elif key == "confidence_threshold":
                if threat.confidence < value:
                    return False
        
        return True
    
    async def _correlate_alert(self, alert: SecurityAlert):
        """Correlate alert with existing alerts."""
        
        try:
            # Generate correlation key based on alert characteristics
            correlation_key = f"{alert.category}:{alert.source_ip or 'unknown'}"
            
            # Check for recent similar alerts
            recent_alerts = await self.redis_client.lrange(
                f"correlation:{correlation_key}",
                0, 9
            )
            
            if recent_alerts:
                # Found related alerts
                alert.correlation_id = correlation_key
                alert.related_alerts = [
                    json.loads(alert_data)["id"] 
                    for alert_data in recent_alerts
                ]
            
            # Add current alert to correlation cache
            await self.redis_client.lpush(
                f"correlation:{correlation_key}",
                json.dumps({"id": str(alert.id), "timestamp": alert.timestamp.isoformat()})
            )
            
            # Set expiration for correlation cache
            await self.redis_client.expire(
                f"correlation:{correlation_key}",
                self.correlation_window
            )
        
        except Exception as e:
            logger.error("Error correlating alert", error=str(e))
    
    async def _store_alert(self, alert: SecurityAlert):
        """Store alert in database and cache."""
        
        try:
            # Store in Redis for quick access
            await self.redis_client.hset(
                "security_alerts",
                str(alert.id),
                alert.model_dump_json()
            )
            
            # Add to time-ordered list
            await self.redis_client.zadd(
                "alerts_by_time",
                {str(alert.id): alert.timestamp.timestamp()}
            )
            
            # Add to severity-ordered list
            severity_score = self._get_severity_score(alert.severity)
            await self.redis_client.zadd(
                "alerts_by_severity",
                {str(alert.id): severity_score}
            )
            
            logger.info("Alert stored", alert_id=str(alert.id))
        
        except Exception as e:
            logger.error("Error storing alert", error=str(e))
    
    def _get_severity_score(self, severity: ThreatLevel) -> float:
        """Get numeric score for severity."""
        
        scores = {
            ThreatLevel.LOW: 1.0,
            ThreatLevel.MEDIUM: 2.0,
            ThreatLevel.HIGH: 3.0,
            ThreatLevel.CRITICAL: 4.0
        }
        
        return scores.get(severity, 1.0)
    
    async def _should_send_alert(self, rule: AlertRule, alert: SecurityAlert) -> bool:
        """Check if alert should be sent based on throttling rules."""
        
        try:
            # Check throttling
            throttle_key = f"alert_throttle:{rule.id}"
            last_sent = await self.redis_client.get(throttle_key)
            
            if last_sent:
                last_sent_time = datetime.fromisoformat(last_sent.decode())
                time_since_last = datetime.now(timezone.utc) - last_sent_time
                
                if time_since_last.total_seconds() < rule.throttle_minutes * 60:
                    return False
            
            # Check hourly limit
            hour_key = f"alert_count:{rule.id}:{datetime.now(timezone.utc).hour}"
            count = await self.redis_client.get(hour_key)
            count = int(count) if count else 0
            
            if count >= rule.max_alerts_per_hour:
                return False
            
            return True
        
        except Exception as e:
            logger.error("Error checking alert throttling", error=str(e))
            return True
    
    async def _send_alert_notifications(self, rule: AlertRule, alert: SecurityAlert):
        """Send alert notifications through configured channels."""
        
        try:
            # Update throttling counters
            throttle_key = f"alert_throttle:{rule.id}"
            await self.redis_client.setex(
                throttle_key,
                rule.throttle_minutes * 60,
                datetime.now(timezone.utc).isoformat()
            )
            
            hour_key = f"alert_count:{rule.id}:{datetime.now(timezone.utc).hour}"
            await self.redis_client.incr(hour_key)
            await self.redis_client.expire(hour_key, 3600)
            
            # Send through each configured channel
            for channel in rule.channels:
                try:
                    await self._send_channel_notification(channel, rule, alert)
                except Exception as e:
                    logger.error(f"Failed to send alert via {channel}", error=str(e))
        
        except Exception as e:
            logger.error("Error sending alert notifications", error=str(e))
    
    async def _send_channel_notification(self, channel: AlertChannel, rule: AlertRule, alert: SecurityAlert):
        """Send notification through specific channel."""
        
        if channel == AlertChannel.EMAIL:
            await self._send_email_alert(rule, alert)
        elif channel == AlertChannel.SLACK:
            await self._send_slack_alert(rule, alert)
        elif channel == AlertChannel.WEBHOOK:
            await self._send_webhook_alert(rule, alert)
        elif channel == AlertChannel.DASHBOARD:
            await self._send_dashboard_alert(rule, alert)
    
    async def _send_email_alert(self, rule: AlertRule, alert: SecurityAlert):
        """Send email alert."""
        
        try:
            config = self.channel_configs[AlertChannel.EMAIL]
            
            # Create email message
            msg = MIMEMultipart()
            msg['From'] = config['from_address']
            msg['To'] = ', '.join(rule.recipients)
            msg['Subject'] = f"Security Alert: {alert.title}"
            
            # Create email body
            body = f"""
Security Alert Generated

Alert ID: {alert.id}
Severity: {alert.severity.value.upper()}
Category: {alert.category}
Time: {alert.timestamp.isoformat()}

Description:
{alert.description}

Indicators:
{chr(10).join(f"- {indicator}" for indicator in alert.indicators)}

Recommended Actions:
{chr(10).join(f"- {action}" for action in alert.recommended_actions)}

Source IP: {alert.source_ip or 'Unknown'}
User ID: {alert.user_id or 'Unknown'}

This is an automated security alert from GiveMeJobs.AI platform.
"""
            
            msg.attach(MIMEText(body, 'plain'))
            
            # Send email
            server = smtplib.SMTP(config['smtp_server'], config['smtp_port'])
            server.starttls()
            
            if config.get('username') and config.get('password'):
                server.login(config['username'], config['password'])
            
            server.send_message(msg)
            server.quit()
            
            logger.info("Email alert sent", alert_id=str(alert.id))
        
        except Exception as e:
            logger.error("Failed to send email alert", error=str(e))
    
    async def _send_slack_alert(self, rule: AlertRule, alert: SecurityAlert):
        """Send Slack alert."""
        
        try:
            config = self.channel_configs[AlertChannel.SLACK]
            webhook_url = config.get('webhook_url')
            
            if not webhook_url:
                logger.warning("Slack webhook URL not configured")
                return
            
            # Create Slack message
            color_map = {
                ThreatLevel.LOW: "#36a64f",      # Green
                ThreatLevel.MEDIUM: "#ff9500",   # Orange
                ThreatLevel.HIGH: "#ff0000",     # Red
                ThreatLevel.CRITICAL: "#8B0000"  # Dark Red
            }
            
            message = {
                "channel": config.get('channel', '#security-alerts'),
                "username": "Security Bot",
                "icon_emoji": ":warning:",
                "attachments": [
                    {
                        "color": color_map.get(alert.severity, "#ff0000"),
                        "title": f"Security Alert: {alert.title}",
                        "text": alert.description,
                        "fields": [
                            {
                                "title": "Severity",
                                "value": alert.severity.value.upper(),
                                "short": True
                            },
                            {
                                "title": "Category",
                                "value": alert.category,
                                "short": True
                            },
                            {
                                "title": "Source IP",
                                "value": alert.source_ip or "Unknown",
                                "short": True
                            },
                            {
                                "title": "Time",
                                "value": alert.timestamp.strftime("%Y-%m-%d %H:%M:%S UTC"),
                                "short": True
                            }
                        ],
                        "footer": "GiveMeJobs.AI Security",
                        "ts": int(alert.timestamp.timestamp())
                    }
                ]
            }
            
            # Send to Slack
            response = await self.http_client.post(webhook_url, json=message)
            response.raise_for_status()
            
            logger.info("Slack alert sent", alert_id=str(alert.id))
        
        except Exception as e:
            logger.error("Failed to send Slack alert", error=str(e))
    
    async def _send_webhook_alert(self, rule: AlertRule, alert: SecurityAlert):
        """Send webhook alert."""
        
        try:
            config = self.channel_configs[AlertChannel.WEBHOOK]
            webhook_url = config.get('url')
            
            if not webhook_url:
                logger.warning("Webhook URL not configured")
                return
            
            # Create webhook payload
            payload = {
                "alert_id": str(alert.id),
                "title": alert.title,
                "description": alert.description,
                "severity": alert.severity.value,
                "category": alert.category,
                "timestamp": alert.timestamp.isoformat(),
                "source_ip": alert.source_ip,
                "user_id": str(alert.user_id) if alert.user_id else None,
                "indicators": alert.indicators,
                "recommended_actions": alert.recommended_actions,
                "status": alert.status.value
            }
            
            headers = config.get('headers', {})
            headers.setdefault('Content-Type', 'application/json')
            
            # Send webhook
            response = await self.http_client.post(
                webhook_url,
                json=payload,
                headers=headers
            )
            response.raise_for_status()
            
            logger.info("Webhook alert sent", alert_id=str(alert.id))
        
        except Exception as e:
            logger.error("Failed to send webhook alert", error=str(e))
    
    async def _send_dashboard_alert(self, rule: AlertRule, alert: SecurityAlert):
        """Send dashboard alert."""
        
        try:
            # Add to dashboard alerts queue
            await self.redis_client.lpush(
                "dashboard_alerts",
                alert.model_dump_json()
            )
            
            # Trim to keep only recent alerts
            await self.redis_client.ltrim("dashboard_alerts", 0, 99)
            
            logger.info("Dashboard alert sent", alert_id=str(alert.id))
        
        except Exception as e:
            logger.error("Failed to send dashboard alert", error=str(e))
    
    async def _schedule_escalation(self, rule: AlertRule, alert: SecurityAlert):
        """Schedule alert escalation."""
        
        try:
            policy = self.escalation_policies.get(rule.escalation_policy)
            if not policy:
                return
            
            # Schedule escalation task
            escalation_data = {
                "alert_id": str(alert.id),
                "rule_id": rule.id,
                "policy": policy,
                "current_level": 0,
                "scheduled_at": datetime.now(timezone.utc).isoformat()
            }
            
            await self.redis_client.lpush(
                "escalation_queue",
                json.dumps(escalation_data)
            )
            
            logger.info("Escalation scheduled", alert_id=str(alert.id))
        
        except Exception as e:
            logger.error("Failed to schedule escalation", error=str(e))
    
    async def get_alert_statistics(self) -> Dict[str, Any]:
        """Get alert statistics."""
        
        try:
            # Get total alerts
            total_alerts = await self.redis_client.hlen("security_alerts")
            
            # Get alerts by severity
            severity_counts = {}
            for severity in ThreatLevel:
                count = await self.redis_client.zcount(
                    "alerts_by_severity",
                    self._get_severity_score(severity),
                    self._get_severity_score(severity)
                )
                severity_counts[severity.value] = count
            
            # Get recent alerts (last 24 hours)
            yesterday = datetime.now(timezone.utc) - timedelta(days=1)
            recent_count = await self.redis_client.zcount(
                "alerts_by_time",
                yesterday.timestamp(),
                datetime.now(timezone.utc).timestamp()
            )
            
            return {
                "total_alerts": total_alerts,
                "alerts_by_severity": severity_counts,
                "recent_alerts_24h": recent_count,
                "active_rules": len([r for r in self.alert_rules if r.enabled])
            }
        
        except Exception as e:
            logger.error("Error getting alert statistics", error=str(e))
            return {}
    
    async def get_recent_alerts(self, limit: int = 20) -> List[SecurityAlert]:
        """Get recent security alerts."""
        
        try:
            # Get recent alert IDs
            alert_ids = await self.redis_client.zrevrange(
                "alerts_by_time",
                0, limit - 1
            )
            
            alerts = []
            for alert_id in alert_ids:
                alert_data = await self.redis_client.hget("security_alerts", alert_id)
                if alert_data:
                    alert = SecurityAlert.model_validate_json(alert_data)
                    alerts.append(alert)
            
            return alerts
        
        except Exception as e:
            logger.error("Error getting recent alerts", error=str(e))
            return []
    
    async def update_alert_status(self, alert_id: UUID, status: AlertStatus, assigned_to: Optional[str] = None):
        """Update alert status."""
        
        try:
            alert_data = await self.redis_client.hget("security_alerts", str(alert_id))
            if not alert_data:
                raise ValueError(f"Alert {alert_id} not found")
            
            alert = SecurityAlert.model_validate_json(alert_data)
            alert.status = status
            
            if assigned_to:
                alert.assigned_to = assigned_to
            
            # Update timestamps
            now = datetime.now(timezone.utc)
            if status == AlertStatus.ACKNOWLEDGED:
                alert.acknowledged_at = now
            elif status in [AlertStatus.RESOLVED, AlertStatus.CLOSED]:
                alert.resolved_at = now
            
            # Store updated alert
            await self.redis_client.hset(
                "security_alerts",
                str(alert_id),
                alert.model_dump_json()
            )
            
            logger.info("Alert status updated", alert_id=str(alert_id), status=status.value)
        
        except Exception as e:
            logger.error("Error updating alert status", error=str(e))


# Dependency functions
async def get_security_alert_manager(redis_client: redis.Redis) -> SecurityAlertManager:
    """Get security alert manager instance."""
    return SecurityAlertManager(redis_client)