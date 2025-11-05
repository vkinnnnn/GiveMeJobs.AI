"""
Advanced threat detection and automated response system.

This module provides:
- Real-time threat detection using machine learning and rule-based systems
- Automated incident response and mitigation
- Behavioral analysis and anomaly detection
- Integration with external threat intelligence feeds
- Automated security orchestration and response (SOAR)
"""

import asyncio
import json
import time
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Tuple
from uuid import UUID, uuid4

import numpy as np
import redis.asyncio as redis
from pydantic import BaseModel, Field
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import structlog

from .config import get_settings
from .audit_logging import AuditLogger, AuditEventType, AuditSeverity

logger = structlog.get_logger(__name__)
settings = get_settings()


class ThreatLevel(str, Enum):
    """Threat severity levels."""
    
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ThreatCategory(str, Enum):
    """Threat categories for classification."""
    
    BRUTE_FORCE = "brute_force"
    ACCOUNT_TAKEOVER = "account_takeover"
    DATA_EXFILTRATION = "data_exfiltration"
    PRIVILEGE_ESCALATION = "privilege_escalation"
    MALWARE = "malware"
    PHISHING = "phishing"
    DDoS = "ddos"
    INSIDER_THREAT = "insider_threat"
    API_ABUSE = "api_abuse"
    ANOMALOUS_BEHAVIOR = "anomalous_behavior"


class ResponseAction(str, Enum):
    """Automated response actions."""
    
    ALERT_ONLY = "alert_only"
    BLOCK_IP = "block_ip"
    LOCK_ACCOUNT = "lock_account"
    REQUIRE_MFA = "require_mfa"
    RATE_LIMIT = "rate_limit"
    QUARANTINE = "quarantine"
    ESCALATE = "escalate"
    INVESTIGATE = "investigate"


class ThreatIndicator(BaseModel):
    """Threat indicator data model."""
    
    id: UUID = Field(default_factory=uuid4)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Threat classification
    category: ThreatCategory
    level: ThreatLevel
    confidence: float = Field(ge=0.0, le=1.0)
    
    # Source information
    source_ip: Optional[str] = None
    user_id: Optional[UUID] = None
    user_agent: Optional[str] = None
    session_id: Optional[str] = None
    
    # Threat details
    description: str
    indicators: List[str] = Field(default_factory=list)
    attack_vector: Optional[str] = None
    
    # Context
    affected_resources: List[str] = Field(default_factory=list)
    related_events: List[str] = Field(default_factory=list)
    
    # Response
    recommended_actions: List[ResponseAction] = Field(default_factory=list)
    automated_response: Optional[ResponseAction] = None
    
    # Metadata
    detection_rule: Optional[str] = None
    false_positive_probability: float = Field(default=0.0, ge=0.0, le=1.0)
    additional_data: Optional[Dict[str, Any]] = None


class ThreatDetectionRule(BaseModel):
    """Threat detection rule configuration."""
    
    id: str
    name: str
    description: str
    category: ThreatCategory
    enabled: bool = True
    
    # Rule conditions
    conditions: Dict[str, Any]
    threshold: float = 0.7
    time_window: int = 300  # seconds
    
    # Response configuration
    response_actions: List[ResponseAction]
    auto_respond: bool = False
    
    # Rule metadata
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    version: str = "1.0"


class BehavioralProfile(BaseModel):
    """User behavioral profile for anomaly detection."""
    
    user_id: UUID
    
    # Login patterns
    typical_login_hours: List[int] = Field(default_factory=list)
    typical_locations: List[str] = Field(default_factory=list)
    typical_devices: List[str] = Field(default_factory=list)
    
    # Activity patterns
    avg_session_duration: float = 0.0
    typical_endpoints: List[str] = Field(default_factory=list)
    avg_requests_per_session: float = 0.0
    
    # Data access patterns
    typical_data_access: List[str] = Field(default_factory=list)
    sensitive_data_access_frequency: float = 0.0
    
    # Baseline metrics
    baseline_established: bool = False
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    confidence_score: float = 0.0


class ThreatDetectionEngine:
    """Advanced threat detection engine with ML and rule-based detection."""
    
    def __init__(self, redis_client: redis.Redis, audit_logger: AuditLogger):
        self.redis_client = redis_client
        self.audit_logger = audit_logger
        
        # Detection rules
        self.detection_rules = self._load_detection_rules()
        
        # ML models
        self.anomaly_detector = IsolationForest(contamination=0.1, random_state=42)
        self.scaler = StandardScaler()
        self.model_trained = False
        
        # Behavioral profiles
        self.behavioral_profiles: Dict[UUID, BehavioralProfile] = {}
        
        # Threat intelligence
        self.threat_intel_feeds = []
        self.known_bad_ips: Set[str] = set()
        self.known_bad_domains: Set[str] = set()
        
        # Response handlers
        self.response_handlers = {
            ResponseAction.BLOCK_IP: self._block_ip,
            ResponseAction.LOCK_ACCOUNT: self._lock_account,
            ResponseAction.REQUIRE_MFA: self._require_mfa,
            ResponseAction.RATE_LIMIT: self._apply_rate_limit,
            ResponseAction.ALERT_ONLY: self._send_alert,
            ResponseAction.ESCALATE: self._escalate_incident
        }
    
    def _load_detection_rules(self) -> List[ThreatDetectionRule]:
        """Load threat detection rules."""
        
        return [
            # Brute force detection
            ThreatDetectionRule(
                id="brute_force_login",
                name="Brute Force Login Detection",
                description="Detect brute force login attempts",
                category=ThreatCategory.BRUTE_FORCE,
                conditions={
                    "failed_logins": {"threshold": 5, "window": 300},
                    "unique_usernames": {"threshold": 10, "window": 300}
                },
                response_actions=[ResponseAction.BLOCK_IP, ResponseAction.ALERT_ONLY],
                auto_respond=True
            ),
            
            # Account takeover detection
            ThreatDetectionRule(
                id="account_takeover",
                name="Account Takeover Detection",
                description="Detect potential account takeover",
                category=ThreatCategory.ACCOUNT_TAKEOVER,
                conditions={
                    "location_change": {"distance_km": 1000, "time_minutes": 60},
                    "device_change": True,
                    "password_change": True
                },
                response_actions=[ResponseAction.REQUIRE_MFA, ResponseAction.ALERT_ONLY],
                auto_respond=True
            ),
            
            # Data exfiltration detection
            ThreatDetectionRule(
                id="data_exfiltration",
                name="Data Exfiltration Detection",
                description="Detect unusual data access patterns",
                category=ThreatCategory.DATA_EXFILTRATION,
                conditions={
                    "data_volume": {"threshold_mb": 100, "window": 3600},
                    "export_frequency": {"threshold": 10, "window": 3600},
                    "off_hours_access": True
                },
                response_actions=[ResponseAction.QUARANTINE, ResponseAction.ESCALATE],
                auto_respond=False
            )
        ]
    
    async def analyze_event(self, event_data: Dict[str, Any]) -> Optional[ThreatIndicator]:
        """Analyze an event for potential threats."""
        
        try:
            threats = []
            
            # Rule-based detection
            rule_threats = await self._apply_detection_rules(event_data)
            threats.extend(rule_threats)
            
            # Behavioral analysis
            if event_data.get("user_id"):
                behavioral_threats = await self._analyze_behavioral_anomalies(event_data)
                threats.extend(behavioral_threats)
            
            # ML-based anomaly detection
            if self.model_trained:
                ml_threats = await self._detect_ml_anomalies(event_data)
                threats.extend(ml_threats)
            
            # Threat intelligence correlation
            intel_threats = await self._correlate_threat_intelligence(event_data)
            threats.extend(intel_threats)
            
            # Return highest severity threat
            if threats:
                highest_threat = max(threats, key=lambda t: self._threat_score(t))
                
                # Execute automated response if configured
                if highest_threat.automated_response:
                    await self._execute_response(highest_threat)
                
                return highest_threat
            
            return None
            
        except Exception as e:
            logger.error("Error analyzing event for threats", error=str(e))
            return None
    
    async def _apply_detection_rules(self, event_data: Dict[str, Any]) -> List[ThreatIndicator]:
        """Apply rule-based threat detection."""
        
        threats = []
        
        for rule in self.detection_rules:
            if not rule.enabled:
                continue
            
            try:
                threat = await self._evaluate_rule(rule, event_data)
                if threat:
                    threats.append(threat)
            except Exception as e:
                logger.error(f"Error evaluating rule {rule.id}", error=str(e))
        
        return threats
    
    async def _evaluate_rule(self, rule: ThreatDetectionRule, event_data: Dict[str, Any]) -> Optional[ThreatIndicator]:
        """Evaluate a specific detection rule."""
        
        if rule.category == ThreatCategory.BRUTE_FORCE:
            return await self._evaluate_brute_force_rule(rule, event_data)
        elif rule.category == ThreatCategory.ACCOUNT_TAKEOVER:
            return await self._evaluate_account_takeover_rule(rule, event_data)
        elif rule.category == ThreatCategory.DATA_EXFILTRATION:
            return await self._evaluate_data_exfiltration_rule(rule, event_data)
        
        return None
    
    async def _evaluate_brute_force_rule(self, rule: ThreatDetectionRule, event_data: Dict[str, Any]) -> Optional[ThreatIndicator]:
        """Evaluate brute force detection rule."""
        
        if event_data.get("event_type") != "login_failed":
            return None
        
        ip_address = event_data.get("ip_address")
        if not ip_address:
            return None
        
        # Check failed login count
        window = rule.conditions["failed_logins"]["window"]
        threshold = rule.conditions["failed_logins"]["threshold"]
        
        key = f"failed_logins:{ip_address}"
        count = await self.redis_client.get(key)
        count = int(count) if count else 0
        
        if count >= threshold:
            return ThreatIndicator(
                category=ThreatCategory.BRUTE_FORCE,
                level=ThreatLevel.HIGH,
                confidence=min(1.0, count / threshold),
                source_ip=ip_address,
                description=f"Brute force attack detected from {ip_address}",
                indicators=[f"Failed login attempts: {count}"],
                recommended_actions=[ResponseAction.BLOCK_IP],
                automated_response=ResponseAction.BLOCK_IP if rule.auto_respond else None,
                detection_rule=rule.id
            )
        
        return None 
   
    async def _evaluate_account_takeover_rule(self, rule: ThreatDetectionRule, event_data: Dict[str, Any]) -> Optional[ThreatIndicator]:
        """Evaluate account takeover detection rule."""
        
        if event_data.get("event_type") != "login_success":
            return None
        
        user_id = event_data.get("user_id")
        if not user_id:
            return None
        
        # Check for suspicious login patterns
        indicators = []
        confidence = 0.0
        
        # Check location change
        current_location = event_data.get("location")
        if current_location:
            last_location_key = f"last_location:{user_id}"
            last_location = await self.redis_client.get(last_location_key)
            
            if last_location and last_location != current_location:
                indicators.append(f"Location change: {last_location} -> {current_location}")
                confidence += 0.4
        
        # Check device change
        current_device = event_data.get("user_agent")
        if current_device:
            last_device_key = f"last_device:{user_id}"
            last_device = await self.redis_client.get(last_device_key)
            
            if last_device and last_device != current_device:
                indicators.append("New device detected")
                confidence += 0.3
        
        # Check for recent password change
        password_change_key = f"password_changed:{user_id}"
        password_changed = await self.redis_client.get(password_change_key)
        
        if password_changed:
            indicators.append("Recent password change detected")
            confidence += 0.3
        
        if confidence >= 0.5:  # Threshold for account takeover
            return ThreatIndicator(
                category=ThreatCategory.ACCOUNT_TAKEOVER,
                level=ThreatLevel.HIGH if confidence > 0.7 else ThreatLevel.MEDIUM,
                confidence=confidence,
                user_id=UUID(user_id),
                source_ip=event_data.get("ip_address"),
                description=f"Potential account takeover for user {user_id}",
                indicators=indicators,
                recommended_actions=[ResponseAction.REQUIRE_MFA, ResponseAction.ALERT_ONLY],
                automated_response=ResponseAction.REQUIRE_MFA if rule.auto_respond else None,
                detection_rule=rule.id
            )
        
        return None
    
    async def _evaluate_data_exfiltration_rule(self, rule: ThreatDetectionRule, event_data: Dict[str, Any]) -> Optional[ThreatIndicator]:
        """Evaluate data exfiltration detection rule."""
        
        if event_data.get("event_type") not in ["data_export", "data_download", "api_bulk_request"]:
            return None
        
        user_id = event_data.get("user_id")
        if not user_id:
            return None
        
        # Check data volume
        data_size = event_data.get("data_size_mb", 0)
        threshold_mb = rule.conditions["data_volume"]["threshold_mb"]
        
        if data_size > threshold_mb:
            return ThreatIndicator(
                category=ThreatCategory.DATA_EXFILTRATION,
                level=ThreatLevel.CRITICAL,
                confidence=min(1.0, data_size / threshold_mb),
                user_id=UUID(user_id),
                source_ip=event_data.get("ip_address"),
                description=f"Large data export detected: {data_size}MB",
                indicators=[f"Data volume: {data_size}MB (threshold: {threshold_mb}MB)"],
                recommended_actions=[ResponseAction.QUARANTINE, ResponseAction.ESCALATE],
                automated_response=None,  # Manual review required
                detection_rule=rule.id
            )
        
        return None
    
    async def _analyze_behavioral_anomalies(self, event_data: Dict[str, Any]) -> List[ThreatIndicator]:
        """Analyze behavioral anomalies using user profiles."""
        
        threats = []
        user_id = event_data.get("user_id")
        
        if not user_id:
            return threats
        
        try:
            user_uuid = UUID(user_id)
            profile = await self._get_behavioral_profile(user_uuid)
            
            if not profile or not profile.baseline_established:
                # Not enough data for behavioral analysis
                return threats
            
            # Analyze login time anomaly
            current_hour = datetime.now(timezone.utc).hour
            if profile.typical_login_hours and current_hour not in profile.typical_login_hours:
                threats.append(ThreatIndicator(
                    category=ThreatCategory.ANOMALOUS_BEHAVIOR,
                    level=ThreatLevel.MEDIUM,
                    confidence=0.6,
                    user_id=user_uuid,
                    description=f"Login at unusual hour: {current_hour}",
                    indicators=[f"Typical hours: {profile.typical_login_hours}"],
                    recommended_actions=[ResponseAction.ALERT_ONLY]
                ))
            
            # Analyze location anomaly
            current_location = event_data.get("location")
            if current_location and profile.typical_locations:
                if current_location not in profile.typical_locations:
                    threats.append(ThreatIndicator(
                        category=ThreatCategory.ANOMALOUS_BEHAVIOR,
                        level=ThreatLevel.MEDIUM,
                        confidence=0.7,
                        user_id=user_uuid,
                        description=f"Login from unusual location: {current_location}",
                        indicators=[f"Typical locations: {profile.typical_locations}"],
                        recommended_actions=[ResponseAction.REQUIRE_MFA]
                    ))
            
        except Exception as e:
            logger.error("Error analyzing behavioral anomalies", error=str(e))
        
        return threats
    
    async def _detect_ml_anomalies(self, event_data: Dict[str, Any]) -> List[ThreatIndicator]:
        """Detect anomalies using machine learning models."""
        
        threats = []
        
        try:
            # Extract features for ML analysis
            features = self._extract_ml_features(event_data)
            
            if features is None:
                return threats
            
            # Normalize features
            features_scaled = self.scaler.transform([features])
            
            # Predict anomaly
            anomaly_score = self.anomaly_detector.decision_function(features_scaled)[0]
            is_anomaly = self.anomaly_detector.predict(features_scaled)[0] == -1
            
            if is_anomaly:
                # Convert anomaly score to confidence (higher negative score = higher confidence)
                confidence = min(1.0, abs(anomaly_score) / 2.0)
                
                threats.append(ThreatIndicator(
                    category=ThreatCategory.ANOMALOUS_BEHAVIOR,
                    level=ThreatLevel.MEDIUM if confidence > 0.7 else ThreatLevel.LOW,
                    confidence=confidence,
                    user_id=UUID(event_data["user_id"]) if event_data.get("user_id") else None,
                    source_ip=event_data.get("ip_address"),
                    description="ML-detected anomalous behavior",
                    indicators=[f"Anomaly score: {anomaly_score:.3f}"],
                    recommended_actions=[ResponseAction.INVESTIGATE],
                    additional_data={"ml_features": features, "anomaly_score": anomaly_score}
                ))
        
        except Exception as e:
            logger.error("Error in ML anomaly detection", error=str(e))
        
        return threats
    
    async def _correlate_threat_intelligence(self, event_data: Dict[str, Any]) -> List[ThreatIndicator]:
        """Correlate event with threat intelligence feeds."""
        
        threats = []
        ip_address = event_data.get("ip_address")
        
        if not ip_address:
            return threats
        
        try:
            # Check against known bad IPs
            if ip_address in self.known_bad_ips:
                threats.append(ThreatIndicator(
                    category=ThreatCategory.MALWARE,
                    level=ThreatLevel.HIGH,
                    confidence=0.9,
                    source_ip=ip_address,
                    description=f"Request from known malicious IP: {ip_address}",
                    indicators=["IP in threat intelligence feed"],
                    recommended_actions=[ResponseAction.BLOCK_IP],
                    automated_response=ResponseAction.BLOCK_IP
                ))
            
            # Check against reputation services (placeholder)
            reputation_score = await self._check_ip_reputation(ip_address)
            if reputation_score < 0.3:  # Low reputation
                threats.append(ThreatIndicator(
                    category=ThreatCategory.MALWARE,
                    level=ThreatLevel.MEDIUM,
                    confidence=1.0 - reputation_score,
                    source_ip=ip_address,
                    description=f"Request from low-reputation IP: {ip_address}",
                    indicators=[f"Reputation score: {reputation_score}"],
                    recommended_actions=[ResponseAction.RATE_LIMIT]
                ))
        
        except Exception as e:
            logger.error("Error correlating threat intelligence", error=str(e))
        
        return threats
    
    async def _execute_response(self, threat: ThreatIndicator):
        """Execute automated response to threat."""
        
        if not threat.automated_response:
            return
        
        try:
            handler = self.response_handlers.get(threat.automated_response)
            if handler:
                await handler(threat)
                
                # Log the response action
                await self.audit_logger.log_security_event(
                    AuditEventType.SECURITY_VIOLATION,
                    f"Automated response executed: {threat.automated_response.value}",
                    user_id=threat.user_id,
                    ip_address=threat.source_ip,
                    severity=AuditSeverity.HIGH,
                    additional_data={
                        "threat_id": str(threat.id),
                        "threat_category": threat.category.value,
                        "response_action": threat.automated_response.value
                    }
                )
        
        except Exception as e:
            logger.error("Error executing automated response", error=str(e))
    
    def _extract_ml_features(self, event_data: Dict[str, Any]) -> Optional[List[float]]:
        """Extract features for ML analysis."""
        
        try:
            features = []
            
            # Time-based features
            current_time = datetime.now(timezone.utc)
            features.append(current_time.hour)  # Hour of day
            features.append(current_time.weekday())  # Day of week
            
            # Request features
            features.append(len(event_data.get("user_agent", "")))  # User agent length
            features.append(1 if event_data.get("success", True) else 0)  # Success flag
            
            # IP-based features (simplified)
            ip_address = event_data.get("ip_address", "")
            features.append(len(ip_address.split(".")))  # IP format check
            
            # Session features
            features.append(event_data.get("session_duration", 0))  # Session duration
            
            return features
        
        except Exception as e:
            logger.error("Error extracting ML features", error=str(e))
            return None
    
    async def _get_behavioral_profile(self, user_id: UUID) -> Optional[BehavioralProfile]:
        """Get or create behavioral profile for user."""
        
        if user_id in self.behavioral_profiles:
            return self.behavioral_profiles[user_id]
        
        # Load from Redis cache
        profile_key = f"behavioral_profile:{user_id}"
        profile_data = await self.redis_client.get(profile_key)
        
        if profile_data:
            try:
                profile = BehavioralProfile.model_validate_json(profile_data)
                self.behavioral_profiles[user_id] = profile
                return profile
            except Exception as e:
                logger.error("Error loading behavioral profile", error=str(e))
        
        # Create new profile
        profile = BehavioralProfile(user_id=user_id)
        self.behavioral_profiles[user_id] = profile
        
        return profile
    
    async def _check_ip_reputation(self, ip_address: str) -> float:
        """Check IP reputation (placeholder implementation)."""
        
        # In a real implementation, this would query reputation services
        # For now, return a random score based on IP characteristics
        
        try:
            # Simple heuristic: private IPs get higher reputation
            if ip_address.startswith(("192.168.", "10.", "172.")):
                return 0.8
            
            # Check if IP is in known good ranges (placeholder)
            if ip_address.startswith(("8.8.", "1.1.")):  # Google DNS, Cloudflare
                return 0.9
            
            # Default reputation for unknown IPs
            return 0.5
        
        except Exception:
            return 0.5
    
    def _threat_score(self, threat: ThreatIndicator) -> float:
        """Calculate threat score for prioritization."""
        
        severity_weights = {
            ThreatLevel.LOW: 1.0,
            ThreatLevel.MEDIUM: 2.0,
            ThreatLevel.HIGH: 3.0,
            ThreatLevel.CRITICAL: 4.0
        }
        
        base_score = severity_weights.get(threat.level, 1.0)
        confidence_multiplier = threat.confidence
        
        return base_score * confidence_multiplier
    
    # Response action implementations
    async def _block_ip(self, threat: ThreatIndicator):
        """Block IP address."""
        
        if threat.source_ip:
            await self.redis_client.setex(
                f"blocked_ip:{threat.source_ip}",
                3600,  # 1 hour
                json.dumps({
                    "threat_id": str(threat.id),
                    "reason": threat.description,
                    "blocked_at": datetime.now(timezone.utc).isoformat()
                })
            )
            
            logger.warning(
                "IP address blocked",
                ip_address=threat.source_ip,
                threat_id=str(threat.id)
            )
    
    async def _lock_account(self, threat: ThreatIndicator):
        """Lock user account."""
        
        if threat.user_id:
            await self.redis_client.setex(
                f"locked_account:{threat.user_id}",
                1800,  # 30 minutes
                json.dumps({
                    "threat_id": str(threat.id),
                    "reason": threat.description,
                    "locked_at": datetime.now(timezone.utc).isoformat()
                })
            )
            
            logger.warning(
                "Account locked",
                user_id=str(threat.user_id),
                threat_id=str(threat.id)
            )
    
    async def _require_mfa(self, threat: ThreatIndicator):
        """Require MFA for user."""
        
        if threat.user_id:
            await self.redis_client.setex(
                f"require_mfa:{threat.user_id}",
                86400,  # 24 hours
                json.dumps({
                    "threat_id": str(threat.id),
                    "reason": threat.description,
                    "required_at": datetime.now(timezone.utc).isoformat()
                })
            )
            
            logger.info(
                "MFA required",
                user_id=str(threat.user_id),
                threat_id=str(threat.id)
            )
    
    async def _apply_rate_limit(self, threat: ThreatIndicator):
        """Apply rate limiting."""
        
        if threat.source_ip:
            await self.redis_client.setex(
                f"rate_limit:{threat.source_ip}",
                300,  # 5 minutes
                "10"  # 10 requests per window
            )
            
            logger.info(
                "Rate limit applied",
                ip_address=threat.source_ip,
                threat_id=str(threat.id)
            )
    
    async def _send_alert(self, threat: ThreatIndicator):
        """Send security alert."""
        
        alert_data = {
            "threat_id": str(threat.id),
            "category": threat.category.value,
            "level": threat.level.value,
            "description": threat.description,
            "timestamp": threat.timestamp.isoformat()
        }
        
        await self.redis_client.lpush("security_alerts", json.dumps(alert_data))
        
        logger.warning(
            "Security alert sent",
            threat_id=str(threat.id),
            category=threat.category.value
        )
    
    async def _escalate_incident(self, threat: ThreatIndicator):
        """Escalate security incident."""
        
        incident_data = {
            "threat_id": str(threat.id),
            "category": threat.category.value,
            "level": threat.level.value,
            "description": threat.description,
            "escalated_at": datetime.now(timezone.utc).isoformat(),
            "requires_investigation": True
        }
        
        await self.redis_client.lpush("escalated_incidents", json.dumps(incident_data))
        
        logger.critical(
            "Security incident escalated",
            threat_id=str(threat.id),
            category=threat.category.value
        )


# Dependency functions
async def get_threat_detection_engine(
    redis_client: redis.Redis,
    audit_logger: AuditLogger
) -> ThreatDetectionEngine:
    """Get threat detection engine instance."""
    return ThreatDetectionEngine(redis_client, audit_logger)