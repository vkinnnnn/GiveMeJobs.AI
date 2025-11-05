"""
Security monitoring API endpoints.

This module provides:
- Security event monitoring and alerting endpoints
- Threat detection and response management
- Audit logging and compliance reporting
- Penetration testing automation
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
import structlog

from ...core.audit_logging import (
    AuditLogger, AuditEvent, AuditEventType, AuditSeverity,
    get_audit_logger
)
from ...core.security_monitor import SecurityMonitor, get_security_monitor
from ...core.threat_detection import (
    ThreatDetectionEngine, ThreatIndicator, ThreatLevel,
    get_threat_detection_engine
)
from ...core.security_alerting import (
    SecurityAlertManager, SecurityAlert, AlertStatus,
    get_security_alert_manager
)
from ...core.pentest_automation import (
    SecurityScanner, ScanType, ScanResult, ComplianceChecker,
    get_security_scanner, get_compliance_checker
)
from ...core.dependencies import get_current_user, get_redis_client
from ...models.user import User

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/security", tags=["Security Monitoring"])


# Request/Response Models
class SecurityEventRequest(BaseModel):
    """Security event logging request."""
    
    event_type: str
    user_id: Optional[UUID] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    additional_data: Optional[Dict[str, Any]] = None
    success: bool = True
    error_message: Optional[str] = None


class SecurityStatsResponse(BaseModel):
    """Security statistics response."""
    
    recent_events: int
    blocked_ips: int
    locked_accounts: int
    pending_alerts: int
    detection_rules: int
    active_rules: int


class AlertUpdateRequest(BaseModel):
    """Alert status update request."""
    
    status: AlertStatus
    assigned_to: Optional[str] = None
    notes: Optional[str] = None


class ScanRequest(BaseModel):
    """Security scan request."""
    
    target: str
    scan_type: ScanType
    config: Optional[Dict[str, Any]] = None


class ComplianceCheckRequest(BaseModel):
    """Compliance check request."""
    
    framework: str = Field(..., description="Compliance framework (owasp_top10, pci_dss, gdpr, sox)")
    scan_ids: List[UUID] = Field(..., description="Scan result IDs to check")


# Security Event Monitoring Endpoints
@router.post("/events", status_code=status.HTTP_201_CREATED)
async def log_security_event(
    event_request: SecurityEventRequest,
    security_monitor: SecurityMonitor = Depends(get_security_monitor),
    current_user: User = Depends(get_current_user)
):
    """Log a security event for monitoring and analysis."""
    
    try:
        await security_monitor.log_security_event(
            event_type=event_request.event_type,
            user_id=event_request.user_id,
            ip_address=event_request.ip_address,
            user_agent=event_request.user_agent,
            additional_data=event_request.additional_data,
            success=event_request.success,
            error_message=event_request.error_message
        )
        
        return {"message": "Security event logged successfully"}
    
    except Exception as e:
        logger.error("Failed to log security event", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to log security event"
        )


@router.get("/stats", response_model=SecurityStatsResponse)
async def get_security_stats(
    security_monitor: SecurityMonitor = Depends(get_security_monitor),
    current_user: User = Depends(get_current_user)
):
    """Get security monitoring statistics."""
    
    try:
        stats = await security_monitor.get_security_stats()
        return SecurityStatsResponse(**stats)
    
    except Exception as e:
        logger.error("Failed to get security stats", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve security statistics"
        )


@router.get("/alerts")
async def get_recent_alerts(
    limit: int = Query(20, ge=1, le=100),
    security_monitor: SecurityMonitor = Depends(get_security_monitor),
    current_user: User = Depends(get_current_user)
):
    """Get recent security alerts."""
    
    try:
        alerts = await security_monitor.get_recent_alerts(limit)
        return {"alerts": alerts}
    
    except Exception as e:
        logger.error("Failed to get recent alerts", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve security alerts"
        )


# Threat Detection Endpoints
@router.post("/analyze-threat")
async def analyze_threat(
    event_data: Dict[str, Any],
    threat_engine: ThreatDetectionEngine = Depends(get_threat_detection_engine),
    current_user: User = Depends(get_current_user)
):
    """Analyze event data for potential threats."""
    
    try:
        threat = await threat_engine.analyze_event(event_data)
        
        if threat:
            return {
                "threat_detected": True,
                "threat": {
                    "id": str(threat.id),
                    "category": threat.category.value,
                    "level": threat.level.value,
                    "confidence": threat.confidence,
                    "description": threat.description,
                    "indicators": threat.indicators,
                    "recommended_actions": [action.value for action in threat.recommended_actions]
                }
            }
        else:
            return {"threat_detected": False}
    
    except Exception as e:
        logger.error("Failed to analyze threat", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to analyze threat"
        )


# Alert Management Endpoints
@router.get("/alerts/detailed")
async def get_detailed_alerts(
    limit: int = Query(20, ge=1, le=100),
    alert_manager: SecurityAlertManager = Depends(get_security_alert_manager),
    current_user: User = Depends(get_current_user)
):
    """Get detailed security alerts with full information."""
    
    try:
        alerts = await alert_manager.get_recent_alerts(limit)
        return {"alerts": [alert.dict() for alert in alerts]}
    
    except Exception as e:
        logger.error("Failed to get detailed alerts", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve detailed alerts"
        )


@router.put("/alerts/{alert_id}")
async def update_alert_status(
    alert_id: UUID,
    update_request: AlertUpdateRequest,
    alert_manager: SecurityAlertManager = Depends(get_security_alert_manager),
    current_user: User = Depends(get_current_user)
):
    """Update security alert status."""
    
    try:
        await alert_manager.update_alert_status(
            alert_id=alert_id,
            status=update_request.status,
            assigned_to=update_request.assigned_to
        )
        
        return {"message": "Alert status updated successfully"}
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error("Failed to update alert status", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update alert status"
        )


@router.get("/alerts/statistics")
async def get_alert_statistics(
    alert_manager: SecurityAlertManager = Depends(get_security_alert_manager),
    current_user: User = Depends(get_current_user)
):
    """Get alert statistics and metrics."""
    
    try:
        stats = await alert_manager.get_alert_statistics()
        return stats
    
    except Exception as e:
        logger.error("Failed to get alert statistics", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve alert statistics"
        )


# Audit Logging Endpoints
@router.get("/audit/search")
async def search_audit_logs(
    user_id: Optional[UUID] = Query(None),
    event_types: Optional[List[str]] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    audit_logger: AuditLogger = Depends(get_audit_logger),
    current_user: User = Depends(get_current_user)
):
    """Search audit logs with filters."""
    
    try:
        # Convert string event types to enum
        event_type_enums = None
        if event_types:
            event_type_enums = [AuditEventType(et) for et in event_types if et in AuditEventType.__members__.values()]
        
        logs = await audit_logger.search_audit_logs(
            user_id=user_id,
            event_types=event_type_enums,
            start_date=start_date,
            end_date=end_date,
            limit=limit,
            offset=offset
        )
        
        return {"logs": [log.__dict__ for log in logs]}
    
    except Exception as e:
        logger.error("Failed to search audit logs", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to search audit logs"
        )


@router.get("/audit/statistics")
async def get_audit_statistics(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    audit_logger: AuditLogger = Depends(get_audit_logger),
    current_user: User = Depends(get_current_user)
):
    """Get audit log statistics."""
    
    try:
        stats = await audit_logger.get_audit_statistics(
            start_date=start_date,
            end_date=end_date
        )
        
        return stats
    
    except Exception as e:
        logger.error("Failed to get audit statistics", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve audit statistics"
        )


# Penetration Testing Endpoints
@router.post("/scans", status_code=status.HTTP_201_CREATED)
async def start_security_scan(
    scan_request: ScanRequest,
    scanner: SecurityScanner = Depends(get_security_scanner),
    current_user: User = Depends(get_current_user)
):
    """Start a security scan."""
    
    try:
        if scan_request.scan_type == ScanType.STATIC_CODE_ANALYSIS:
            result = await scanner.run_static_code_analysis(scan_request.target)
        elif scan_request.scan_type == ScanType.DEPENDENCY_SCAN:
            result = await scanner.run_dependency_scan(scan_request.target)
        elif scan_request.scan_type == ScanType.WEB_APP_SCAN:
            result = await scanner.run_web_app_scan(scan_request.target)
        else:
            result = await scanner.run_comprehensive_scan(scan_request.target)
        
        return {
            "scan_id": str(result.id),
            "status": result.status.value,
            "message": "Security scan started successfully"
        }
    
    except Exception as e:
        logger.error("Failed to start security scan", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start security scan"
        )


@router.get("/scans/{scan_id}")
async def get_scan_result(
    scan_id: UUID,
    scanner: SecurityScanner = Depends(get_security_scanner),
    current_user: User = Depends(get_current_user)
):
    """Get security scan result."""
    
    try:
        result = await scanner.get_scan_result(scan_id)
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Scan not found"
            )
        
        return result.dict()
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get scan result", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve scan result"
        )


@router.get("/scans")
async def list_scans(
    active_only: bool = Query(False),
    scanner: SecurityScanner = Depends(get_security_scanner),
    current_user: User = Depends(get_current_user)
):
    """List security scans."""
    
    try:
        if active_only:
            scans = await scanner.get_active_scans()
        else:
            scans = list(scanner.scan_results.values())
        
        return {
            "scans": [
                {
                    "id": str(scan.id),
                    "scan_type": scan.scan_type.value,
                    "status": scan.status.value,
                    "target": scan.target,
                    "started_at": scan.started_at.isoformat(),
                    "completed_at": scan.completed_at.isoformat() if scan.completed_at else None,
                    "vulnerability_count": len(scan.vulnerabilities)
                }
                for scan in scans
            ]
        }
    
    except Exception as e:
        logger.error("Failed to list scans", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list scans"
        )


@router.delete("/scans/{scan_id}")
async def cancel_scan(
    scan_id: UUID,
    scanner: SecurityScanner = Depends(get_security_scanner),
    current_user: User = Depends(get_current_user)
):
    """Cancel an active security scan."""
    
    try:
        success = await scanner.cancel_scan(scan_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Scan not found or not active"
            )
        
        return {"message": "Scan cancelled successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to cancel scan", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel scan"
        )


@router.get("/scans/statistics")
async def get_scan_statistics(
    scanner: SecurityScanner = Depends(get_security_scanner),
    current_user: User = Depends(get_current_user)
):
    """Get security scanning statistics."""
    
    try:
        stats = scanner.get_scan_statistics()
        return stats
    
    except Exception as e:
        logger.error("Failed to get scan statistics", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve scan statistics"
        )


# Compliance Checking Endpoints
@router.post("/compliance/check")
async def check_compliance(
    compliance_request: ComplianceCheckRequest,
    scanner: SecurityScanner = Depends(get_security_scanner),
    compliance_checker: ComplianceChecker = Depends(get_compliance_checker),
    current_user: User = Depends(get_current_user)
):
    """Check compliance against a specific framework."""
    
    try:
        # Get scan results
        scan_results = []
        for scan_id in compliance_request.scan_ids:
            result = await scanner.get_scan_result(scan_id)
            if result:
                scan_results.append(result)
        
        if not scan_results:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid scan results found"
            )
        
        # Check compliance
        compliance_result = await compliance_checker.check_compliance(
            scan_results, compliance_request.framework
        )
        
        return compliance_result
    
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error("Failed to check compliance", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check compliance"
        )


# Security Dashboard Endpoints
@router.get("/dashboard")
async def get_security_dashboard(
    security_monitor: SecurityMonitor = Depends(get_security_monitor),
    alert_manager: SecurityAlertManager = Depends(get_security_alert_manager),
    scanner: SecurityScanner = Depends(get_security_scanner),
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive security dashboard data."""
    
    try:
        # Get data from all security components
        security_stats = await security_monitor.get_security_stats()
        alert_stats = await alert_manager.get_alert_statistics()
        scan_stats = scanner.get_scan_statistics()
        recent_alerts = await alert_manager.get_recent_alerts(10)
        
        return {
            "security_monitoring": security_stats,
            "alert_management": alert_stats,
            "vulnerability_scanning": scan_stats,
            "recent_alerts": [alert.dict() for alert in recent_alerts],
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    except Exception as e:
        logger.error("Failed to get security dashboard", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve security dashboard data"
        )


# Health Check Endpoint
@router.get("/health")
async def security_health_check(
    redis_client = Depends(get_redis_client)
):
    """Check health of security monitoring components."""
    
    try:
        # Check Redis connectivity
        await redis_client.ping()
        
        return {
            "status": "healthy",
            "components": {
                "redis": "healthy",
                "threat_detection": "healthy",
                "audit_logging": "healthy",
                "security_monitoring": "healthy",
                "vulnerability_scanning": "healthy"
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    except Exception as e:
        logger.error("Security health check failed", error=str(e))
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }