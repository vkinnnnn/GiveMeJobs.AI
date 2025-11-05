"""
High-level encryption service for application integration.

This module provides a unified interface for all encryption operations
in the application, integrating field-level encryption, key management,
and TLS configuration.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional, Type, TypeVar, Union
from uuid import UUID

import structlog
from pydantic import BaseModel

from ..core.encryption import get_encryption_service, get_key_management_service
from ..core.database_encryption import get_key_rotation_service
from ..core.tls_config import get_tls_service
from ..models.encrypted_fields import (
    EncryptedField, 
    EncryptionAuditLog, 
    EncryptionMetrics,
    EncryptedPIIMixin
)

logger = structlog.get_logger()

T = TypeVar('T', bound=BaseModel)


class ApplicationEncryptionService:
    """
    High-level encryption service for application use.
    
    This service provides a unified interface for all encryption operations,
    including PII encryption, key management, and audit logging.
    """
    
    def __init__(self):
        self.logger = logger.bind(service="app_encryption")
        self.encryption_service = get_encryption_service()
        self.key_management_service = get_key_management_service()
        self.key_rotation_service = get_key_rotation_service()
        self.tls_service = get_tls_service()
        
        # Metrics tracking
        self.metrics = EncryptionMetrics()
        self.audit_logs: List[EncryptionAuditLog] = []
    
    async def encrypt_user_pii(
        self, 
        user_data: Dict[str, Any], 
        user_id: Optional[UUID] = None
    ) -> Dict[str, Any]:
        """
        Encrypt PII data for a user.
        
        Args:
            user_data: User data dictionary containing PII fields
            user_id: User ID for audit logging
            
        Returns:
            Dictionary with encrypted PII fields
        """
        try:
            # Define PII fields for users
            pii_fields = {
                'email', 'first_name', 'last_name', 'phone_number',
                'address', 'ssn', 'date_of_birth'
            }
            
            encrypted_data = {}
            encrypted_field_count = 0
            
            for field_name, field_value in user_data.items():
                if field_name in pii_fields and field_value is not None:
                    encrypted_field = self.encryption_service.encrypt_field(
                        field_value, 
                        key_id="pii_default_v1"
                    )
                    encrypted_data[field_name] = encrypted_field
                    encrypted_field_count += 1
                else:
                    encrypted_data[field_name] = field_value
            
            # Update metrics
            self.metrics.total_encrypted_fields += encrypted_field_count
            
            # Create audit log
            await self._create_audit_log(
                operation="encrypt",
                entity_type="user",
                entity_id=str(user_id) if user_id else "unknown",
                key_id="pii_default_v1",
                field_names=list(pii_fields.intersection(user_data.keys())),
                user_id=user_id,
                success=True
            )
            
            self.logger.info("Encrypted user PII data", 
                           user_id=user_id,
                           encrypted_fields=encrypted_field_count)
            
            return encrypted_data
            
        except Exception as e:
            # Create error audit log
            await self._create_audit_log(
                operation="encrypt",
                entity_type="user",
                entity_id=str(user_id) if user_id else "unknown",
                key_id="pii_default_v1",
                field_names=list(pii_fields.intersection(user_data.keys())),
                user_id=user_id,
                success=False,
                error_message=str(e)
            )
            
            self.metrics.encryption_errors += 1
            self.logger.error("Failed to encrypt user PII data", 
                            user_id=user_id, error=str(e))
            raise
    
    async def decrypt_user_pii(
        self, 
        encrypted_data: Dict[str, Any], 
        user_id: Optional[UUID] = None
    ) -> Dict[str, Any]:
        """
        Decrypt PII data for a user.
        
        Args:
            encrypted_data: Dictionary containing encrypted PII fields
            user_id: User ID for audit logging
            
        Returns:
            Dictionary with decrypted PII fields
        """
        try:
            decrypted_data = {}
            decrypted_field_count = 0
            field_names = []
            
            for field_name, field_value in encrypted_data.items():
                if isinstance(field_value, EncryptedField):
                    decrypted_value = self.encryption_service.decrypt_field(field_value)
                    decrypted_data[field_name] = decrypted_value
                    decrypted_field_count += 1
                    field_names.append(field_name)
                elif isinstance(field_value, dict) and 'encrypted_data' in field_value:
                    encrypted_field = EncryptedField(**field_value)
                    decrypted_value = self.encryption_service.decrypt_field(encrypted_field)
                    decrypted_data[field_name] = decrypted_value
                    decrypted_field_count += 1
                    field_names.append(field_name)
                else:
                    decrypted_data[field_name] = field_value
            
            # Update metrics
            self.metrics.total_decrypted_fields += decrypted_field_count
            
            # Create audit log
            await self._create_audit_log(
                operation="decrypt",
                entity_type="user",
                entity_id=str(user_id) if user_id else "unknown",
                key_id="pii_default_v1",
                field_names=field_names,
                user_id=user_id,
                success=True
            )
            
            self.logger.info("Decrypted user PII data", 
                           user_id=user_id,
                           decrypted_fields=decrypted_field_count)
            
            return decrypted_data
            
        except Exception as e:
            # Create error audit log
            await self._create_audit_log(
                operation="decrypt",
                entity_type="user",
                entity_id=str(user_id) if user_id else "unknown",
                key_id="pii_default_v1",
                field_names=[],
                user_id=user_id,
                success=False,
                error_message=str(e)
            )
            
            self.metrics.decryption_errors += 1
            self.logger.error("Failed to decrypt user PII data", 
                            user_id=user_id, error=str(e))
            raise
    
    async def encrypt_application_data(
        self, 
        application_data: Dict[str, Any], 
        application_id: UUID,
        user_id: Optional[UUID] = None
    ) -> Dict[str, Any]:
        """
        Encrypt sensitive application data.
        
        Args:
            application_data: Application data dictionary
            application_id: Application ID
            user_id: User ID for audit logging
            
        Returns:
            Dictionary with encrypted sensitive fields
        """
        try:
            # Define sensitive fields for applications
            sensitive_fields = {'cover_letter', 'salary_expectation', 'notes'}
            
            encrypted_data = {}
            encrypted_field_count = 0
            
            for field_name, field_value in application_data.items():
                if field_name in sensitive_fields and field_value is not None:
                    encrypted_field = self.encryption_service.encrypt_field(
                        field_value, 
                        key_id="session_default_v1"
                    )
                    encrypted_data[field_name] = encrypted_field
                    encrypted_field_count += 1
                else:
                    encrypted_data[field_name] = field_value
            
            # Update metrics
            self.metrics.total_encrypted_fields += encrypted_field_count
            
            # Create audit log
            await self._create_audit_log(
                operation="encrypt",
                entity_type="application",
                entity_id=str(application_id),
                key_id="session_default_v1",
                field_names=list(sensitive_fields.intersection(application_data.keys())),
                user_id=user_id,
                success=True
            )
            
            self.logger.info("Encrypted application data", 
                           application_id=application_id,
                           encrypted_fields=encrypted_field_count)
            
            return encrypted_data
            
        except Exception as e:
            self.metrics.encryption_errors += 1
            self.logger.error("Failed to encrypt application data", 
                            application_id=application_id, error=str(e))
            raise
    
    async def rotate_encryption_keys(self, key_ids: Optional[List[str]] = None) -> Dict[str, str]:
        """
        Rotate encryption keys.
        
        Args:
            key_ids: List of key IDs to rotate. If None, rotates expired keys.
            
        Returns:
            Dictionary mapping old key IDs to new key IDs
        """
        try:
            rotated_keys = {}
            
            if key_ids is None:
                # Get expired keys
                expired_keys = self.encryption_service.check_key_expiration()
                key_ids = expired_keys
            
            for key_id in key_ids:
                try:
                    new_key_id = self.encryption_service.rotate_key(key_id)
                    rotated_keys[key_id] = new_key_id
                    
                    # Update metrics
                    self.metrics.total_key_rotations += 1
                    self.metrics.last_key_rotation = datetime.utcnow()
                    
                    self.logger.info("Rotated encryption key", 
                                   old_key=key_id, 
                                   new_key=new_key_id)
                    
                except Exception as e:
                    self.logger.error("Failed to rotate key", 
                                    key_id=key_id, error=str(e))
            
            return rotated_keys
            
        except Exception as e:
            self.logger.error("Failed to rotate encryption keys", error=str(e))
            raise
    
    async def get_encryption_status(self) -> Dict[str, Any]:
        """
        Get current encryption status and metrics.
        
        Returns:
            Dictionary with encryption status information
        """
        try:
            active_keys = self.encryption_service.get_active_keys()
            expired_keys = self.encryption_service.check_key_expiration()
            
            # Update metrics
            self.metrics.active_keys_count = len(active_keys)
            self.metrics.expired_keys_count = len(expired_keys)
            self.metrics.last_updated = datetime.utcnow()
            
            # Get TLS status
            tls_validation = self.tls_service.validate_tls_configuration()
            cert_info = self.tls_service.get_certificate_info()
            
            status = {
                "encryption_metrics": self.metrics.model_dump(),
                "active_keys": [key.model_dump() for key in active_keys],
                "expired_keys": expired_keys,
                "tls_status": {
                    "valid": tls_validation["valid"],
                    "warnings": tls_validation["warnings"],
                    "errors": tls_validation["errors"]
                },
                "certificate_info": cert_info.model_dump() if cert_info else None,
                "audit_log_count": len(self.audit_logs)
            }
            
            return status
            
        except Exception as e:
            self.logger.error("Failed to get encryption status", error=str(e))
            raise
    
    async def _create_audit_log(
        self,
        operation: str,
        entity_type: str,
        entity_id: str,
        key_id: str,
        field_names: List[str],
        user_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        success: bool = True,
        error_message: Optional[str] = None
    ):
        """Create audit log entry for encryption operation."""
        try:
            audit_log = EncryptionAuditLog(
                operation=operation,
                entity_type=entity_type,
                entity_id=entity_id,
                key_id=key_id,
                field_names=field_names,
                user_id=user_id,
                ip_address=ip_address,
                success=success,
                error_message=error_message
            )
            
            self.audit_logs.append(audit_log)
            
            # Keep only last 1000 audit logs in memory
            if len(self.audit_logs) > 1000:
                self.audit_logs = self.audit_logs[-1000:]
            
        except Exception as e:
            self.logger.error("Failed to create audit log", error=str(e))
    
    async def get_audit_logs(
        self, 
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        limit: int = 100
    ) -> List[EncryptionAuditLog]:
        """
        Get audit logs with optional filtering.
        
        Args:
            entity_type: Filter by entity type
            entity_id: Filter by entity ID
            limit: Maximum number of logs to return
            
        Returns:
            List of audit log entries
        """
        try:
            filtered_logs = self.audit_logs
            
            if entity_type:
                filtered_logs = [log for log in filtered_logs if log.entity_type == entity_type]
            
            if entity_id:
                filtered_logs = [log for log in filtered_logs if log.entity_id == entity_id]
            
            # Sort by timestamp (newest first) and limit
            filtered_logs.sort(key=lambda x: x.timestamp, reverse=True)
            return filtered_logs[:limit]
            
        except Exception as e:
            self.logger.error("Failed to get audit logs", error=str(e))
            return []


# Global application encryption service instance
_app_encryption_service: Optional[ApplicationEncryptionService] = None


def get_app_encryption_service() -> ApplicationEncryptionService:
    """Get global application encryption service instance."""
    global _app_encryption_service
    if _app_encryption_service is None:
        _app_encryption_service = ApplicationEncryptionService()
    return _app_encryption_service


# Utility functions for easy integration

async def encrypt_user_data(user_data: Dict[str, Any], user_id: Optional[UUID] = None) -> Dict[str, Any]:
    """Convenience function to encrypt user PII data."""
    service = get_app_encryption_service()
    return await service.encrypt_user_pii(user_data, user_id)


async def decrypt_user_data(encrypted_data: Dict[str, Any], user_id: Optional[UUID] = None) -> Dict[str, Any]:
    """Convenience function to decrypt user PII data."""
    service = get_app_encryption_service()
    return await service.decrypt_user_pii(encrypted_data, user_id)


async def encrypt_application_data(
    application_data: Dict[str, Any], 
    application_id: UUID,
    user_id: Optional[UUID] = None
) -> Dict[str, Any]:
    """Convenience function to encrypt application data."""
    service = get_app_encryption_service()
    return await service.encrypt_application_data(application_data, application_id, user_id)


async def get_encryption_health_check() -> Dict[str, Any]:
    """Get encryption service health check information."""
    try:
        service = get_app_encryption_service()
        status = await service.get_encryption_status()
        
        # Determine overall health
        health = "healthy"
        if status["tls_status"]["errors"]:
            health = "unhealthy"
        elif status["tls_status"]["warnings"] or status["expired_keys"]:
            health = "warning"
        
        return {
            "status": health,
            "encryption_enabled": True,
            "active_keys": status["active_keys_count"],
            "expired_keys": len(status["expired_keys"]),
            "tls_valid": status["tls_status"]["valid"],
            "last_key_rotation": status["encryption_metrics"]["last_key_rotation"]
        }
        
    except Exception as e:
        logger.error("Encryption health check failed", error=str(e))
        return {
            "status": "unhealthy",
            "encryption_enabled": False,
            "error": str(e)
        }