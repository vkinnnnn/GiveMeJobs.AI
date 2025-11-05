"""
Security Monitoring API Endpoints

FastAPI endpoints for security monitoring functionality including:
- Audit logging endpoints
- Security alert management
- Threat detection configuration
- Security scanning automation
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel, Field
import structlog
import redis.asyncio as redis

from ..core.dependencies import get_redis_client
from ..services.security_monitoring import (
    SecurityMonitoringService,
    AuditLogEntry,
    SecurityAlert,
    ThreatLevel,
    SecurityEventType,
    ThreatDetectionRule
)

logger = structlog.get_logger()
router = APIRouter(prefix="/security", tags=["security"])


class AuditLogRequest(BaseModel):
    """Request model for audit logging"""
    user_id: Optional[str] = None
    action: str = Field(..., description="Action performed")
    resource: str = Field(..., description="Resource accessed")
    success: bool = Field(..., description="Whether action was successful")
    details: Dict[str, Any] = Field(default_factory=dict)
    risk_score: float = Field(default=0.0, ge=0.0, le=10.0)


class SecurityScanRequest(BaseModel):
    """Request model for security scanning"""
    scan_type: str = Field(default="comprehensive", description="Type of scan to run")


class SecurityReportRequest(BaseModel):
    """Request model for security report generation"""
    days: int = Field(default=7, ge=1, le=90, description="Number of days to include in report")


async def get_security_service(redis_client: redis.Redis = Depends(get_redis_client)) -> SecurityMonitoringService:
    """Dependency to get security monitoring service"""
    return SecurityMonitoringService(redis_client)


@router.post("/audit/log", response_model=Dict[str, str])
async def log_audit_event(
    request: Request,
    audit_request: AuditLogRequest,
    security_service: SecurityMonitoringService = Depends(get_security_service)
):
    """Log a sensitive operation for audit purposes"""
    try:
        # Extract client information
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")
        
        # Create audit log entry
        audit_entry = AuditLogEntry(
            log_id=f"audit_{int(datetime.utcnow().timestamp())}_{hash(audit_request.action) % 10000}",
            user_id=audit_request.user_id,
            action=audit_request.action,
            resource=audit_request.resource,
            ip_address=client_ip,
            user_agent=user_agent,
            success=audit_request.success,
            details=audit_request.details,
            risk_score=audit_request.risk_score
        )
        
        # Log the audit event
        log_id = await security_service.log_audit_event(audit_entry)
        
        return {"log_id": log_id, "status": "logged"}
        
    except Exception as e:
        logger.error("Failed to log audit event", error=str(e))
        raise HTTPException(status_code=500, detail="Audit logging failed")


@router.get("/alerts", response_model=List[SecurityAlert])
async def get_security_alerts(
    limit: int = 50,
    threat_level: Optional[ThreatLevel] = None,
    security_service: SecurityMonitoringService = Depends(get_security_service)
):
    """Get recent security alerts"""
    try:
        alerts = await security_service.get_security_alerts(limit=limit, threat_level=threat_level)
        return alerts
        
    except Exception as e:
        logger.error("Failed to get security alerts", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve security alerts")


@router.post("/scan", response_model=Dict[str, Any])
async def run_security_scan(
    scan_request: SecurityScanRequest,
    background_tasks: BackgroundTasks,
    security_service: SecurityMonitoringService = Depends(get_security_service)
):
    """Run automated security scanning"""
    try:
        # Run scan in background for comprehensive scans
        if scan_request.scan_type == "comprehensive":
            background_tasks.add_task(security_service.run_security_scan, scan_request.scan_type)
            return {
                "status": "started",
                "message": "Comprehensive security scan started in background",
                "scan_type": scan_request.scan_type
            }
        else:
            # Run quick scans synchronously
            results = await security_service.run_security_scan(scan_request.scan_type)
            return results
            
    except Exception as e:
        logger.error("Failed to run security scan", error=str(e))
        raise HTTPException(status_code=500, detail="Security scan failed")


@router.post("/report", response_model=Dict[str, Any])
async def generate_security_report(
    report_request: SecurityReportRequest,
    security_service: SecurityMonitoringService = Depends(get_security_service)
):
    """Generate comprehensive security report"""
    try:
        report = await security_service.generate_security_report(days=report_request.days)
        return report
        
    except Exception as e:
        logger.error("Failed to generate security report", error=str(e))
        raise HTTPException(status_code=500, detail="Security report generation failed")


@router.get("/ip/{ip_address}/status")
async def check_ip_status(
    ip_address: str,
    security_service: SecurityMonitoringService = Depends(get_security_service)
):
    """Check if an IP address is blocked"""
    try:
        is_blocked = await security_service.is_ip_blocked(ip_address)
        return {
            "ip_address": ip_address,
            "blocked": is_blocked,
            "status": "blocked" if is_blocked else "allowed"
        }
        
    except Exception as e:
        logger.error("Failed to check IP status", ip_address=ip_address, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to check IP status")


@router.get("/health")
async def security_health_check():
    """Health check endpoint for security monitoring service"""
    return {
        "status": "healthy",
        "service": "security_monitoring",
        "timestamp": datetime.utcnow().isoformat(),
        "features": [
            "audit_logging",
            "threat_detection",
            "automated_response",
            "security_scanning",
            "penetration_testing"
        ]
    }


@router.get("/metrics")
async def get_security_metrics(
    security_service: SecurityMonitoringService = Depends(get_security_service)
):
    """Get security monitoring metrics"""
    try:
        # Get recent alerts for metrics
        alerts = await security_service.get_security_alerts(limit=100)
        
        # Calculate metrics
        now = datetime.utcnow()
        last_24h = now - timedelta(hours=24)
        last_7d = now - timedelta(days=7)
        
        alerts_24h = [a for a in alerts if a.timestamp >= last_24h]
        alerts_7d = [a for a in alerts if a.timestamp >= last_7d]
        
        metrics = {
            "alerts_last_24h": len(alerts_24h),
            "alerts_last_7d": len(alerts_7d),
            "critical_alerts_24h": len([a for a in alerts_24h if a.threat_level == ThreatLevel.CRITICAL]),
            "high_alerts_24h": len([a for a in alerts_24h if a.threat_level == ThreatLevel.HIGH]),
            "blocked_ips": len(security_service.blocked_ips),
            "threat_types_24h": {},
            "timestamp": now.isoformat()
        }
        
        # Count threat types in last 24h
        for alert in alerts_24h:
            threat_type = alert.event_type.value
            metrics["threat_types_24h"][threat_type] = \
                metrics["threat_types_24h"].get(threat_type, 0) + 1
        
        return metrics
        
    except Exception as e:
        logger.error("Failed to get security metrics", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve security metrics")


class PentestRequest(BaseModel):
    """Request model for penetration testing"""
    target: str = Field(..., description="Target URL or path for testing")
    test_suite: str = Field(default="web_app", description="Type of pentest suite to run")


@router.post("/pentest", response_model=Dict[str, Any])
async def run_penetration_test(
    pentest_request: PentestRequest,
    background_tasks: BackgroundTasks
):
    """Run automated penetration testing"""
    try:
        from ..core.pentest_automation import AutomatedPentestOrchestrator
        
        orchestrator = AutomatedPentestOrchestrator()
        
        # Run comprehensive pentests in background
        if pentest_request.test_suite in ["comprehensive", "infrastructure"]:
            background_tasks.add_task(
                orchestrator.run_automated_pentest,
                pentest_request.target,
                pentest_request.test_suite
            )
            return {
                "status": "started",
                "message": f"Penetration test '{pentest_request.test_suite}' started in background",
                "target": pentest_request.target
            }
        else:
            # Run lighter tests synchronously
            results = await orchestrator.run_automated_pentest(
                pentest_request.target,
                pentest_request.test_suite
            )
            return results
            
    except Exception as e:
        logger.error("Failed to run penetration test", error=str(e))
        raise HTTPException(status_code=500, detail="Penetration test failed")


@router.post("/export", response_model=Dict[str, Any])
async def export_security_events(
    start_date: datetime,
    end_date: datetime,
    security_service: SecurityMonitoringService = Depends(get_security_service)
):
    """Export security events for compliance reporting"""
    try:
        from ..core.security_monitor import get_security_monitor
        
        # Get security monitor (assuming we have Redis client)
        redis_client = await get_redis_client()
        security_monitor = await get_security_monitor(redis_client)
        
        export_data = await security_monitor.export_security_events(start_date, end_date)
        return export_data
        
    except Exception as e:
        logger.error("Failed to export security events", error=str(e))
        raise HTTPException(status_code=500, detail="Security event export failed")


@router.get("/compliance/{framework}")
async def check_compliance(
    framework: str,
    security_service: SecurityMonitoringService = Depends(get_security_service)
):
    """Check compliance against security frameworks"""
    try:
        from ..core.pentest_automation import ComplianceChecker, SecurityScanner
        
        # Get recent scan results for compliance check
        scanner = SecurityScanner()
        compliance_checker = ComplianceChecker()
        
        # For demo purposes, create a sample scan result
        # In production, this would use actual scan results from database
        sample_scan_results = []
        
        compliance_result = await compliance_checker.check_compliance(
            sample_scan_results, 
            framework
        )
        
        return compliance_result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Failed to check compliance", framework=framework, error=str(e))
        raise HTTPException(status_code=500, detail="Compliance check failed")


@router.get("/tools/status")
async def get_security_tools_status():
    """Get status of security monitoring tools"""
    try:
        from ..core.pentest_automation import SecurityScanner
        
        scanner = SecurityScanner()
        stats = scanner.get_scan_statistics()
        
        tools_status = {
            "scanner_statistics": stats,
            "available_tools": [
                {
                    "name": "bandit",
                    "description": "Python static code analysis for security issues",
                    "status": "available"
                },
                {
                    "name": "safety",
                    "description": "Python dependency vulnerability scanner", 
                    "status": "available"
                },
                {
                    "name": "semgrep",
                    "description": "Static analysis for multiple languages",
                    "status": "available"
                },
                {
                    "name": "custom_web_scanner",
                    "description": "Custom web application security scanner",
                    "status": "available"
                }
            ],
            "monitoring_features": [
                "Real-time threat detection",
                "Automated incident response", 
                "Audit logging with encryption",
                "Multi-channel alerting",
                "Compliance reporting",
                "Penetration testing automation"
            ]
        }
        
        return tools_status
        
    except Exception as e:
        logger.error("Failed to get tools status", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve tools status")