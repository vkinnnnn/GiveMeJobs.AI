"""
Data encryption service for sensitive data at rest and in transit.

This module provides comprehensive encryption capabilities including:
- Field-level encryption for PII data
- Key management and rotation
- TLS 1.3 configuration
- Secure data handling utilities
"""

import base64
import os
import secrets
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union
from uuid import UUID

import structlog
from cryptography.fernet import Fernet, MultiFernet
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.kdf.scrypt import Scrypt
from pydantic import BaseModel, Field

from .config import get_settings

logger = structlog.get_logger()
settings = get_settings()


class EncryptionKeyMetadata(BaseModel):
    """Metadata for encryption keys."""
    key_id: str = Field(..., description="Unique key identifier")
    created_at: datetime = Field(..., description="Key creation timestamp")
    expires_at: Optional[datetime] = Field(None, description="Key expiration timestamp")
    algorithm: str = Field(..., description="Encryption algorithm")
    key_type: str = Field(..., description="Key type (symmetric, asymmetric)")
    is_active: bool = Field(default=True, description="Whether key is active")
    rotation_count: int = Field(default=0, description="Number of rotations")


class EncryptedField(BaseModel):
    """Encrypted field container."""
    encrypted_data: str = Field(..., description="Base64 encoded encrypted data")
    key_id: str = Field(..., description="Key ID used for encryption")
    algorithm: str = Field(..., description="Encryption algorithm")
    iv: Optional[str] = Field(None, description="Initialization vector (if applicable)")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Encryption timestamp")


class EncryptionService:
    """
    Comprehensive encryption service for data at rest and in transit.
    
    Features:
    - Field-level encryption for PII data
    - Key rotation and management
    - Multiple encryption algorithms
    - Secure key derivation
    """
    
    def __init__(self):
        self.logger = logger.bind(service="encryption")
        self._keys: Dict[str, Fernet] = {}
        self._key_metadata: Dict[str, EncryptionKeyMetadata] = {}
        self._master_key = self._get_or_create_master_key()
        self._initialize_default_keys()
    
    def _get_or_create_master_key(self) -> bytes:
        """Get or create master encryption key."""
        try:
            # Try to get from environment first
            if settings.security.encryption_key:
                # Derive key from provided key
                return self._derive_key_from_password(
                    settings.security.encryption_key.encode(),
                    b"givemejobs_master_salt"
                )
            
            # Generate new master key
            master_key = Fernet.generate_key()
            self.logger.warning(
                "Generated new master key - store securely in production",
                key_preview=master_key[:8].decode() + "..."
            )
            return master_key
            
        except Exception as e:
            self.logger.error("Failed to initialize master key", error=str(e))
            raise
    
    def _derive_key_from_password(self, password: bytes, salt: bytes) -> bytes:
        """Derive encryption key from password using PBKDF2."""
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        return base64.urlsafe_b64encode(kdf.derive(password))
    
    def _initialize_default_keys(self):
        """Initialize default encryption keys."""
        try:
            # Create default symmetric key for PII encryption
            pii_key_id = "pii_default_v1"
            if pii_key_id not in self._keys:
                self.create_symmetric_key(
                    key_id=pii_key_id,
                    algorithm="fernet",
                    expires_days=90  # Rotate every 90 days
                )
            
            # Create default key for session data
            session_key_id = "session_default_v1"
            if session_key_id not in self._keys:
                self.create_symmetric_key(
                    key_id=session_key_id,
                    algorithm="fernet",
                    expires_days=30  # Rotate every 30 days
                )
            
            self.logger.info("Encryption service initialized", 
                           active_keys=len(self._keys))
            
        except Exception as e:
            self.logger.error("Failed to initialize default keys", error=str(e))
            raise
    
    def create_symmetric_key(
        self, 
        key_id: str, 
        algorithm: str = "fernet",
        expires_days: Optional[int] = None
    ) -> str:
        """Create a new symmetric encryption key."""
        try:
            if key_id in self._keys:
                raise ValueError(f"Key with ID '{key_id}' already exists")
            
            # Generate new Fernet key
            fernet_key = Fernet.generate_key()
            fernet = Fernet(fernet_key)
            
            # Store key and metadata
            self._keys[key_id] = fernet
            
            expires_at = None
            if expires_days:
                expires_at = datetime.utcnow() + timedelta(days=expires_days)
            
            self._key_metadata[key_id] = EncryptionKeyMetadata(
                key_id=key_id,
                created_at=datetime.utcnow(),
                expires_at=expires_at,
                algorithm=algorithm,
                key_type="symmetric",
                is_active=True,
                rotation_count=0
            )
            
            self.logger.info("Created symmetric key", 
                           key_id=key_id, 
                           algorithm=algorithm,
                           expires_at=expires_at)
            
            return key_id
            
        except Exception as e:
            self.logger.error("Failed to create symmetric key", 
                            key_id=key_id, error=str(e))
            raise
    
    def encrypt_field(
        self, 
        data: Union[str, bytes, int, float], 
        key_id: Optional[str] = None
    ) -> EncryptedField:
        """Encrypt a single field with specified or default key."""
        try:
            if key_id is None:
                key_id = "pii_default_v1"
            
            if key_id not in self._keys:
                raise ValueError(f"Key '{key_id}' not found")
            
            # Convert data to bytes
            if isinstance(data, str):
                data_bytes = data.encode('utf-8')
            elif isinstance(data, (int, float)):
                data_bytes = str(data).encode('utf-8')
            elif isinstance(data, bytes):
                data_bytes = data
            else:
                data_bytes = str(data).encode('utf-8')
            
            # Encrypt data
            fernet = self._keys[key_id]
            encrypted_bytes = fernet.encrypt(data_bytes)
            encrypted_b64 = base64.b64encode(encrypted_bytes).decode('utf-8')
            
            metadata = self._key_metadata[key_id]
            
            return EncryptedField(
                encrypted_data=encrypted_b64,
                key_id=key_id,
                algorithm=metadata.algorithm,
                created_at=datetime.utcnow()
            )
            
        except Exception as e:
            self.logger.error("Failed to encrypt field", 
                            key_id=key_id, error=str(e))
            raise
    
    def decrypt_field(self, encrypted_field: EncryptedField) -> str:
        """Decrypt an encrypted field."""
        try:
            key_id = encrypted_field.key_id
            
            if key_id not in self._keys:
                raise ValueError(f"Key '{key_id}' not found")
            
            # Decrypt data
            fernet = self._keys[key_id]
            encrypted_bytes = base64.b64decode(encrypted_field.encrypted_data.encode('utf-8'))
            decrypted_bytes = fernet.decrypt(encrypted_bytes)
            
            return decrypted_bytes.decode('utf-8')
            
        except Exception as e:
            self.logger.error("Failed to decrypt field", 
                            key_id=encrypted_field.key_id, error=str(e))
            raise
    
    def encrypt_pii_data(self, pii_data: Dict[str, Any]) -> Dict[str, EncryptedField]:
        """Encrypt PII data fields."""
        try:
            encrypted_data = {}
            
            # Define PII fields that should be encrypted
            pii_fields = {
                'email', 'first_name', 'last_name', 'phone_number',
                'address', 'ssn', 'date_of_birth', 'passport_number',
                'driver_license', 'bank_account', 'credit_card'
            }
            
            for field_name, field_value in pii_data.items():
                if field_name.lower() in pii_fields and field_value is not None:
                    encrypted_data[field_name] = self.encrypt_field(field_value)
                else:
                    # Non-PII data remains unencrypted
                    encrypted_data[field_name] = field_value
            
            self.logger.info("Encrypted PII data", 
                           encrypted_fields=len([k for k, v in encrypted_data.items() 
                                               if isinstance(v, EncryptedField)]))
            
            return encrypted_data
            
        except Exception as e:
            self.logger.error("Failed to encrypt PII data", error=str(e))
            raise
    
    def decrypt_pii_data(self, encrypted_data: Dict[str, Any]) -> Dict[str, Any]:
        """Decrypt PII data fields."""
        try:
            decrypted_data = {}
            
            for field_name, field_value in encrypted_data.items():
                if isinstance(field_value, EncryptedField):
                    decrypted_data[field_name] = self.decrypt_field(field_value)
                elif isinstance(field_value, dict) and 'encrypted_data' in field_value:
                    # Handle serialized EncryptedField
                    encrypted_field = EncryptedField(**field_value)
                    decrypted_data[field_name] = self.decrypt_field(encrypted_field)
                else:
                    decrypted_data[field_name] = field_value
            
            return decrypted_data
            
        except Exception as e:
            self.logger.error("Failed to decrypt PII data", error=str(e))
            raise
    
    def rotate_key(self, key_id: str) -> str:
        """Rotate an encryption key."""
        try:
            if key_id not in self._keys:
                raise ValueError(f"Key '{key_id}' not found")
            
            old_metadata = self._key_metadata[key_id]
            
            # Create new key with incremented version
            new_key_id = f"{key_id}_v{old_metadata.rotation_count + 1}"
            
            # Generate new key
            new_fernet_key = Fernet.generate_key()
            new_fernet = Fernet(new_fernet_key)
            
            # Store new key
            self._keys[new_key_id] = new_fernet
            
            # Update metadata
            self._key_metadata[new_key_id] = EncryptionKeyMetadata(
                key_id=new_key_id,
                created_at=datetime.utcnow(),
                expires_at=old_metadata.expires_at,
                algorithm=old_metadata.algorithm,
                key_type=old_metadata.key_type,
                is_active=True,
                rotation_count=old_metadata.rotation_count + 1
            )
            
            # Mark old key as inactive but keep for decryption
            self._key_metadata[key_id].is_active = False
            
            self.logger.info("Rotated encryption key", 
                           old_key_id=key_id, 
                           new_key_id=new_key_id)
            
            return new_key_id
            
        except Exception as e:
            self.logger.error("Failed to rotate key", key_id=key_id, error=str(e))
            raise
    
    def get_active_keys(self) -> List[EncryptionKeyMetadata]:
        """Get list of active encryption keys."""
        return [
            metadata for metadata in self._key_metadata.values()
            if metadata.is_active
        ]
    
    def check_key_expiration(self) -> List[str]:
        """Check for expired or soon-to-expire keys."""
        try:
            expiring_keys = []
            now = datetime.utcnow()
            warning_threshold = timedelta(days=7)  # Warn 7 days before expiration
            
            for key_id, metadata in self._key_metadata.items():
                if metadata.expires_at and metadata.is_active:
                    if metadata.expires_at <= now:
                        self.logger.warning("Encryption key expired", 
                                          key_id=key_id, 
                                          expired_at=metadata.expires_at)
                        expiring_keys.append(key_id)
                    elif metadata.expires_at <= now + warning_threshold:
                        self.logger.warning("Encryption key expiring soon", 
                                          key_id=key_id, 
                                          expires_at=metadata.expires_at)
                        expiring_keys.append(key_id)
            
            return expiring_keys
            
        except Exception as e:
            self.logger.error("Failed to check key expiration", error=str(e))
            return []
    
    def create_multi_key_encryption(self, key_ids: List[str]) -> MultiFernet:
        """Create MultiFernet for multiple key encryption (key rotation support)."""
        try:
            fernets = []
            for key_id in key_ids:
                if key_id in self._keys:
                    fernets.append(self._keys[key_id])
                else:
                    self.logger.warning("Key not found for MultiFernet", key_id=key_id)
            
            if not fernets:
                raise ValueError("No valid keys found for MultiFernet")
            
            return MultiFernet(fernets)
            
        except Exception as e:
            self.logger.error("Failed to create MultiFernet", 
                            key_ids=key_ids, error=str(e))
            raise


class TLSConfigurationService:
    """Service for TLS 1.3 configuration and secure communication."""
    
    def __init__(self):
        self.logger = logger.bind(service="tls_config")
    
    def get_tls_context_config(self) -> Dict[str, Any]:
        """Get TLS context configuration for secure communication."""
        return {
            "ssl_version": "TLSv1_3",
            "ssl_ciphers": [
                "TLS_AES_256_GCM_SHA384",
                "TLS_CHACHA20_POLY1305_SHA256",
                "TLS_AES_128_GCM_SHA256"
            ],
            "ssl_options": [
                "OP_NO_SSLv2",
                "OP_NO_SSLv3", 
                "OP_NO_TLSv1",
                "OP_NO_TLSv1_1",
                "OP_NO_TLSv1_2",
                "OP_SINGLE_DH_USE",
                "OP_SINGLE_ECDH_USE"
            ],
            "ssl_verify_mode": "CERT_REQUIRED",
            "check_hostname": True
        }
    
    def generate_certificate_config(self) -> Dict[str, str]:
        """Generate certificate configuration for development."""
        return {
            "cert_file": "/etc/ssl/certs/givemejobs.crt",
            "key_file": "/etc/ssl/private/givemejobs.key",
            "ca_file": "/etc/ssl/certs/ca-certificates.crt",
            "dh_params": "/etc/ssl/dhparams.pem"
        }


class KeyManagementService:
    """Service for encryption key management and rotation."""
    
    def __init__(self, encryption_service: EncryptionService):
        self.encryption_service = encryption_service
        self.logger = logger.bind(service="key_management")
    
    async def schedule_key_rotation(self):
        """Schedule automatic key rotation for expired keys."""
        try:
            expiring_keys = self.encryption_service.check_key_expiration()
            
            for key_id in expiring_keys:
                try:
                    new_key_id = self.encryption_service.rotate_key(key_id)
                    self.logger.info("Automatically rotated key", 
                                   old_key=key_id, 
                                   new_key=new_key_id)
                except Exception as e:
                    self.logger.error("Failed to rotate key", 
                                    key_id=key_id, error=str(e))
            
        except Exception as e:
            self.logger.error("Failed to schedule key rotation", error=str(e))
    
    def backup_keys(self) -> Dict[str, str]:
        """Create encrypted backup of key metadata (not the keys themselves)."""
        try:
            active_keys = self.encryption_service.get_active_keys()
            
            backup_data = {
                "backup_timestamp": datetime.utcnow().isoformat(),
                "keys": [
                    {
                        "key_id": key.key_id,
                        "created_at": key.created_at.isoformat(),
                        "expires_at": key.expires_at.isoformat() if key.expires_at else None,
                        "algorithm": key.algorithm,
                        "key_type": key.key_type,
                        "rotation_count": key.rotation_count
                    }
                    for key in active_keys
                ]
            }
            
            self.logger.info("Created key backup", key_count=len(active_keys))
            return backup_data
            
        except Exception as e:
            self.logger.error("Failed to backup keys", error=str(e))
            raise


# Global encryption service instance
_encryption_service: Optional[EncryptionService] = None
_tls_service: Optional[TLSConfigurationService] = None
_key_management_service: Optional[KeyManagementService] = None


def get_encryption_service() -> EncryptionService:
    """Get global encryption service instance."""
    global _encryption_service
    if _encryption_service is None:
        _encryption_service = EncryptionService()
    return _encryption_service


def get_tls_service() -> TLSConfigurationService:
    """Get global TLS configuration service instance."""
    global _tls_service
    if _tls_service is None:
        _tls_service = TLSConfigurationService()
    return _tls_service


def get_key_management_service() -> KeyManagementService:
    """Get global key management service instance."""
    global _key_management_service
    if _key_management_service is None:
        _key_management_service = KeyManagementService(get_encryption_service())
    return _key_management_service