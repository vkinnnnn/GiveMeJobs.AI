"""
FastAPI endpoints demonstrating encryption functionality.

This module provides API endpoints to demonstrate and test
the encryption capabilities of the system.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
import structlog

from ..services.encryption_service import (
    get_app_encryption_service,
    encrypt_user_data,
    decrypt_user_data,
    get_encryption_health_check
)
from ..core.tls_config import get_tls_service
from ..models.encrypted_fields import EncryptionAuditLog, EncryptionMetrics

logger = structlog.get_logger()
router = APIRouter(prefix="/encryption", tags=["encryption"])


# Request/Response Models
class UserDataRequest(BaseModel):
    """Request model for user data encryption."""
    email: str = Field(..., description="User email")
    first_name: str = Field(..., description="First name")
    last_name: str = Field(..., description="Last name")
    phone_number: Optional[str] = Field(None, description="Phone number")
    address: Optional[str] = Field(None, description="Address")
    professional_headline: Optional[str] = Field(None, description="Professional headline")


class EncryptionResponse(BaseModel):
    """Response model for encryption operations."""
    success: bool = Field(..., description="Whether operation succeeded")
    message: str = Field(..., description="Response message")
    encrypted_fields: List[str] = Field(default_factory=list, description="List of encrypted field names")
    data: Optional[Dict[str, Any]] = Field(None, description="Response data")


class EncryptionStatusResponse(BaseModel):
    """Response model for encryption status."""
    status: str = Field(..., description="Overall encryption status")
    encryption_enabled: bool = Field(..., description="Whether encryption is enabled")
    active_keys: int = Field(..., description="Number of active encryption keys")
    expired_keys: int = Field(..., description="Number of expired keys")
    tls_valid: bool = Field(..., description="Whether TLS configuration is valid")
    metrics: EncryptionMetrics = Field(..., description="Encryption metrics")
    certificate_info: Optional[Dict[str, Any]] = Field(None, description="TLS certificate information")


@router.post("/encrypt-user-data", response_model=EncryptionResponse)
async def encrypt_user_data_endpoint(
    request: UserDataRequest,
    user_id: Optional[UUID] = None
):
    """
    Encrypt user PII data.
    
    This endpoint demonstrates how to encrypt sensitive user data
    using the application's encryption service.
    """
    try:
        # Convert request to dictionary
        user_data = request.model_dump()
        
        # Use provided user_id or generate one
        if user_id is None:
            user_id = uuid4()
        
        # Encrypt the data
        encrypted_data = await encrypt_user_data(user_data, user_id)
        
        # Identify which fields were encrypted
        encrypted_fields = []
        for field_name, field_value in encrypted_data.items():
            if hasattr(field_value, 'encrypted_data'):
                encrypted_fields.append(field_name)
        
        logger.info("User data encrypted via API", 
                   user_id=user_id, 
                   encrypted_fields=encrypted_fields)
        
        return EncryptionResponse(
            success=True,
            message=f"Successfully encrypted {len(encrypted_fields)} PII fields",
            encrypted_fields=encrypted_fields,
            data={
                "user_id": str(user_id),
                "encrypted_field_count": len(encrypted_fields),
                "timestamp": datetime.utcnow().isoformat()
            }
        )
        
    except Exception as e:
        logger.error("Failed to encrypt user data via API", error=str(e))
        raise HTTPException(status_code=500, detail=f"Encryption failed: {str(e)}")


@router.post("/decrypt-user-data", response_model=EncryptionResponse)
async def decrypt_user_data_endpoint(
    encrypted_data: Dict[str, Any],
    user_id: Optional[UUID] = None
):
    """
    Decrypt user PII data.
    
    This endpoint demonstrates how to decrypt previously encrypted
    user data using the application's encryption service.
    """
    try:
        # Use provided user_id or generate one
        if user_id is None:
            user_id = uuid4()
        
        # Decrypt the data
        decrypted_data = await decrypt_user_data(encrypted_data, user_id)
        
        # Identify which fields were decrypted
        decrypted_fields = []
        for field_name in decrypted_data.keys():
            if field_name in encrypted_data and hasattr(encrypted_data[field_name], 'encrypted_data'):
                decrypted_fields.append(field_name)
        
        logger.info("User data decrypted via API", 
                   user_id=user_id, 
                   decrypted_fields=decrypted_fields)
        
        return EncryptionResponse(
            success=True,
            message=f"Successfully decrypted {len(decrypted_fields)} PII fields",
            encrypted_fields=decrypted_fields,
            data={
                "user_id": str(user_id),
                "decrypted_data": decrypted_data,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
        
    except Exception as e:
        logger.error("Failed to decrypt user data via API", error=str(e))
        raise HTTPException(status_code=500, detail=f"Decryption failed: {str(e)}")


@router.get("/status", response_model=EncryptionStatusResponse)
async def get_encryption_status():
    """
    Get encryption service status and metrics.
    
    This endpoint provides comprehensive information about the
    encryption service status, including key metrics and TLS configuration.
    """
    try:
        app_service = get_app_encryption_service()
        
        # Get comprehensive status
        status = await app_service.get_encryption_status()
        
        # Get health check info
        health_check = await get_encryption_health_check()
        
        return EncryptionStatusResponse(
            status=health_check["status"],
            encryption_enabled=health_check["encryption_enabled"],
            active_keys=status["active_keys_count"],
            expired_keys=len(status["expired_keys"]),
            tls_valid=status["tls_status"]["valid"],
            metrics=EncryptionMetrics(**status["encryption_metrics"]),
            certificate_info=status["certificate_info"]
        )
        
    except Exception as e:
        logger.error("Failed to get encryption status", error=str(e))
        raise HTTPException(status_code=500, detail=f"Status check failed: {str(e)}")


@router.get("/audit-logs", response_model=List[EncryptionAuditLog])
async def get_encryption_audit_logs(
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    limit: int = 50
):
    """
    Get encryption audit logs.
    
    This endpoint provides access to encryption operation audit logs
    for compliance and monitoring purposes.
    """
    try:
        app_service = get_app_encryption_service()
        
        # Get audit logs with optional filtering
        audit_logs = await app_service.get_audit_logs(
            entity_type=entity_type,
            entity_id=entity_id,
            limit=limit
        )
        
        logger.info("Retrieved encryption audit logs", 
                   count=len(audit_logs),
                   entity_type=entity_type,
                   entity_id=entity_id)
        
        return audit_logs
        
    except Exception as e:
        logger.error("Failed to get audit logs", error=str(e))
        raise HTTPException(status_code=500, detail=f"Audit log retrieval failed: {str(e)}")


@router.post("/rotate-keys", response_model=EncryptionResponse)
async def rotate_encryption_keys(
    key_ids: Optional[List[str]] = None
):
    """
    Rotate encryption keys.
    
    This endpoint allows manual rotation of encryption keys.
    If no key_ids are provided, it rotates all expired keys.
    """
    try:
        app_service = get_app_encryption_service()
        
        # Rotate keys
        rotated_keys = await app_service.rotate_encryption_keys(key_ids)
        
        logger.info("Rotated encryption keys via API", 
                   rotated_keys=rotated_keys)
        
        return EncryptionResponse(
            success=True,
            message=f"Successfully rotated {len(rotated_keys)} encryption keys",
            encrypted_fields=list(rotated_keys.keys()),
            data={
                "rotated_keys": rotated_keys,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
        
    except Exception as e:
        logger.error("Failed to rotate keys via API", error=str(e))
        raise HTTPException(status_code=500, detail=f"Key rotation failed: {str(e)}")


@router.get("/tls-info")
async def get_tls_information():
    """
    Get TLS configuration information.
    
    This endpoint provides information about the current TLS
    configuration and certificate status.
    """
    try:
        tls_service = get_tls_service()
        
        # Get certificate info
        cert_info = tls_service.get_certificate_info()
        
        # Validate TLS configuration
        validation_results = tls_service.validate_tls_configuration()
        
        # Get security headers
        security_headers = tls_service.get_security_headers()
        
        return {
            "certificate_info": cert_info.model_dump() if cert_info else None,
            "validation_results": validation_results,
            "security_headers": security_headers,
            "tls_configuration": {
                "min_version": "TLSv1.3",
                "ciphers": [
                    "TLS_AES_256_GCM_SHA384",
                    "TLS_CHACHA20_POLY1305_SHA256",
                    "TLS_AES_128_GCM_SHA256"
                ]
            }
        }
        
    except Exception as e:
        logger.error("Failed to get TLS information", error=str(e))
        raise HTTPException(status_code=500, detail=f"TLS info retrieval failed: {str(e)}")


@router.get("/health")
async def encryption_health_check():
    """
    Health check endpoint for encryption services.
    
    This endpoint provides a quick health check for all
    encryption-related services and components.
    """
    try:
        health_info = await get_encryption_health_check()
        
        # Return appropriate HTTP status based on health
        if health_info["status"] == "unhealthy":
            raise HTTPException(status_code=503, detail=health_info)
        elif health_info["status"] == "warning":
            # Return 200 but with warning information
            return {
                **health_info,
                "message": "Encryption service is operational but has warnings"
            }
        else:
            return {
                **health_info,
                "message": "Encryption service is healthy"
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Encryption health check failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")


# Middleware for request encryption audit logging
async def log_encryption_request(request: Request):
    """Log encryption-related API requests for audit purposes."""
    try:
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")
        
        logger.info("Encryption API request", 
                   path=request.url.path,
                   method=request.method,
                   client_ip=client_ip,
                   user_agent=user_agent)
        
    except Exception as e:
        logger.error("Failed to log encryption request", error=str(e))


# Add the middleware to all routes
for route in router.routes:
    if hasattr(route, 'dependencies'):
        route.dependencies.append(Depends(log_encryption_request))