"""
Encrypted field models and mixins for PII data protection.

This module provides Pydantic models and mixins for handling encrypted fields
in a transparent way, allowing automatic encryption/decryption of sensitive data.
"""

from datetime import datetime
from typing import Any, Dict, Optional, Type, TypeVar, Union
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator
import structlog

from ..core.encryption import EncryptedField, get_encryption_service

logger = structlog.get_logger()

T = TypeVar('T', bound=BaseModel)


class EncryptedString(BaseModel):
    """Encrypted string field that handles automatic encryption/decryption."""
    
    _encrypted_field: Optional[EncryptedField] = None
    _decrypted_value: Optional[str] = None
    _key_id: Optional[str] = None
    
    def __init__(self, value: Union[str, EncryptedField, Dict], key_id: Optional[str] = None, **kwargs):
        super().__init__(**kwargs)
        self._key_id = key_id
        
        if isinstance(value, str):
            # Plain text - encrypt it
            self._decrypted_value = value
            self._encrypted_field = None
        elif isinstance(value, EncryptedField):
            # Already encrypted
            self._encrypted_field = value
            self._decrypted_value = None
        elif isinstance(value, dict) and 'encrypted_data' in value:
            # Serialized encrypted field
            self._encrypted_field = EncryptedField(**value)
            self._decrypted_value = None
        else:
            raise ValueError(f"Invalid value type for EncryptedString: {type(value)}")
    
    def get_encrypted(self) -> EncryptedField:
        """Get the encrypted representation."""
        if self._encrypted_field is None:
            if self._decrypted_value is not None:
                encryption_service = get_encryption_service()
                self._encrypted_field = encryption_service.encrypt_field(
                    self._decrypted_value, 
                    self._key_id
                )
            else:
                raise ValueError("No data to encrypt")
        
        return self._encrypted_field
    
    def get_decrypted(self) -> str:
        """Get the decrypted representation."""
        if self._decrypted_value is None:
            if self._encrypted_field is not None:
                encryption_service = get_encryption_service()
                self._decrypted_value = encryption_service.decrypt_field(self._encrypted_field)
            else:
                raise ValueError("No encrypted data to decrypt")
        
        return self._decrypted_value
    
    def __str__(self) -> str:
        """String representation (decrypted)."""
        return self.get_decrypted()
    
    def __repr__(self) -> str:
        """Representation showing encrypted status."""
        return f"EncryptedString(encrypted={self._encrypted_field is not None})"
    
    def model_dump(self, **kwargs) -> Dict[str, Any]:
        """Serialize to dictionary (encrypted form)."""
        return self.get_encrypted().model_dump(**kwargs)
    
    @classmethod
    def model_validate(cls, value: Any, **kwargs) -> 'EncryptedString':
        """Validate and create EncryptedString from various inputs."""
        if isinstance(value, cls):
            return value
        return cls(value, **kwargs)


class EncryptedPIIMixin:
    """Mixin for models that contain PII data requiring encryption."""
    
    def encrypt_pii_fields(self, pii_fields: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """
        Encrypt specified PII fields.
        
        Args:
            pii_fields: Dict mapping field names to values to encrypt.
                       If None, uses predefined PII field list.
        
        Returns:
            Dict with encrypted PII fields.
        """
        try:
            encryption_service = get_encryption_service()
            
            if pii_fields is None:
                # Auto-detect PII fields from model
                pii_fields = self._get_pii_fields()
            
            encrypted_data = {}
            model_data = self.model_dump() if hasattr(self, 'model_dump') else self.__dict__
            
            for field_name, field_value in model_data.items():
                if field_name in pii_fields and field_value is not None:
                    encrypted_data[field_name] = encryption_service.encrypt_field(field_value)
                else:
                    encrypted_data[field_name] = field_value
            
            logger.info("Encrypted PII fields", 
                       model=self.__class__.__name__,
                       encrypted_count=len(pii_fields))
            
            return encrypted_data
            
        except Exception as e:
            logger.error("Failed to encrypt PII fields", 
                        model=self.__class__.__name__, 
                        error=str(e))
            raise
    
    def decrypt_pii_fields(self, encrypted_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Decrypt PII fields from encrypted data.
        
        Args:
            encrypted_data: Dict containing encrypted PII fields.
        
        Returns:
            Dict with decrypted PII fields.
        """
        try:
            encryption_service = get_encryption_service()
            decrypted_data = {}
            
            for field_name, field_value in encrypted_data.items():
                if isinstance(field_value, EncryptedField):
                    decrypted_data[field_name] = encryption_service.decrypt_field(field_value)
                elif isinstance(field_value, dict) and 'encrypted_data' in field_value:
                    encrypted_field = EncryptedField(**field_value)
                    decrypted_data[field_name] = encryption_service.decrypt_field(encrypted_field)
                else:
                    decrypted_data[field_name] = field_value
            
            return decrypted_data
            
        except Exception as e:
            logger.error("Failed to decrypt PII fields", 
                        model=self.__class__.__name__, 
                        error=str(e))
            raise
    
    def _get_pii_fields(self) -> Dict[str, Any]:
        """Get PII fields from the model."""
        pii_field_names = {
            'email', 'first_name', 'last_name', 'phone_number',
            'address', 'ssn', 'date_of_birth', 'passport_number',
            'driver_license', 'bank_account', 'credit_card_number'
        }
        
        model_data = self.model_dump() if hasattr(self, 'model_dump') else self.__dict__
        
        return {
            field_name: field_value 
            for field_name, field_value in model_data.items()
            if field_name.lower() in pii_field_names and field_value is not None
        }


class EncryptedUserProfile(BaseModel, EncryptedPIIMixin):
    """User profile model with encrypted PII fields."""
    
    user_id: UUID = Field(..., description="User ID")
    
    # PII fields that will be encrypted
    email: Optional[str] = Field(None, description="User email (encrypted)")
    first_name: Optional[str] = Field(None, description="First name (encrypted)")
    last_name: Optional[str] = Field(None, description="Last name (encrypted)")
    phone_number: Optional[str] = Field(None, description="Phone number (encrypted)")
    address: Optional[str] = Field(None, description="Address (encrypted)")
    
    # Non-PII fields remain unencrypted
    professional_headline: Optional[str] = Field(None, description="Professional headline")
    is_active: bool = Field(default=True, description="Whether user is active")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Update timestamp")
    
    # Encryption metadata
    encryption_key_id: Optional[str] = Field(None, description="Encryption key ID used")
    encrypted_at: Optional[datetime] = Field(None, description="When PII was encrypted")
    
    @model_validator(mode='before')
    @classmethod
    def handle_encrypted_fields(cls, values):
        """Handle encrypted fields during model validation."""
        if isinstance(values, dict):
            # Check if we have encrypted fields to decrypt
            encrypted_fields = {}
            regular_fields = {}
            
            for key, value in values.items():
                if isinstance(value, (EncryptedField, dict)) and key in ['email', 'first_name', 'last_name', 'phone_number', 'address']:
                    encrypted_fields[key] = value
                else:
                    regular_fields[key] = value
            
            # If we have encrypted fields, decrypt them
            if encrypted_fields:
                try:
                    encryption_service = get_encryption_service()
                    for field_name, encrypted_value in encrypted_fields.items():
                        if isinstance(encrypted_value, dict) and 'encrypted_data' in encrypted_value:
                            encrypted_field = EncryptedField(**encrypted_value)
                            regular_fields[field_name] = encryption_service.decrypt_field(encrypted_field)
                        elif isinstance(encrypted_value, EncryptedField):
                            regular_fields[field_name] = encryption_service.decrypt_field(encrypted_value)
                except Exception as e:
                    logger.error("Failed to decrypt fields during validation", error=str(e))
                    # Keep encrypted fields as-is if decryption fails
                    regular_fields.update(encrypted_fields)
            
            return regular_fields
        
        return values
    
    def to_encrypted_dict(self) -> Dict[str, Any]:
        """Convert model to dictionary with encrypted PII fields."""
        return self.encrypt_pii_fields()
    
    @classmethod
    def from_encrypted_dict(cls, encrypted_data: Dict[str, Any]) -> 'EncryptedUserProfile':
        """Create model instance from encrypted data."""
        # The model_validator will handle decryption automatically
        return cls(**encrypted_data)


class EncryptedApplicationData(BaseModel, EncryptedPIIMixin):
    """Application data model with encrypted sensitive fields."""
    
    application_id: UUID = Field(..., description="Application ID")
    user_id: UUID = Field(..., description="User ID")
    job_id: UUID = Field(..., description="Job ID")
    
    # Potentially sensitive fields that may be encrypted
    cover_letter: Optional[str] = Field(None, description="Cover letter content (may be encrypted)")
    salary_expectation: Optional[int] = Field(None, description="Salary expectation (may be encrypted)")
    notes: Optional[str] = Field(None, description="Private notes (may be encrypted)")
    
    # Non-sensitive fields
    status: str = Field(..., description="Application status")
    applied_at: datetime = Field(default_factory=datetime.utcnow, description="Application timestamp")
    
    def _get_pii_fields(self) -> Dict[str, Any]:
        """Override to define application-specific sensitive fields."""
        sensitive_fields = {'cover_letter', 'salary_expectation', 'notes'}
        model_data = self.model_dump()
        
        return {
            field_name: field_value 
            for field_name, field_value in model_data.items()
            if field_name in sensitive_fields and field_value is not None
        }


class EncryptionAuditLog(BaseModel):
    """Audit log for encryption operations."""
    
    log_id: UUID = Field(default_factory=lambda: UUID(int=0), description="Log entry ID")
    operation: str = Field(..., description="Operation type (encrypt/decrypt/rotate)")
    entity_type: str = Field(..., description="Type of entity (user, application, etc.)")
    entity_id: str = Field(..., description="Entity identifier")
    key_id: str = Field(..., description="Encryption key ID used")
    field_names: list[str] = Field(..., description="Names of fields operated on")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Operation timestamp")
    user_id: Optional[UUID] = Field(None, description="User who performed operation")
    ip_address: Optional[str] = Field(None, description="IP address of operation")
    success: bool = Field(..., description="Whether operation succeeded")
    error_message: Optional[str] = Field(None, description="Error message if failed")
    
    model_config = {"from_attributes": True}


class EncryptionMetrics(BaseModel):
    """Metrics for encryption operations."""
    
    total_encrypted_fields: int = Field(default=0, description="Total encrypted fields")
    total_decrypted_fields: int = Field(default=0, description="Total decrypted fields")
    total_key_rotations: int = Field(default=0, description="Total key rotations")
    active_keys_count: int = Field(default=0, description="Number of active keys")
    expired_keys_count: int = Field(default=0, description="Number of expired keys")
    encryption_errors: int = Field(default=0, description="Number of encryption errors")
    decryption_errors: int = Field(default=0, description="Number of decryption errors")
    last_key_rotation: Optional[datetime] = Field(None, description="Last key rotation timestamp")
    last_updated: datetime = Field(default_factory=datetime.utcnow, description="Metrics update timestamp")
    
    model_config = {"from_attributes": True}


# Utility functions for encrypted field handling

def create_encrypted_field_validator(field_name: str, key_id: Optional[str] = None):
    """Create a field validator for automatic encryption."""
    
    def validator(cls, v):
        if v is not None and isinstance(v, str):
            # Auto-encrypt string values
            encryption_service = get_encryption_service()
            return encryption_service.encrypt_field(v, key_id)
        return v
    
    return field_validator(field_name)(validator)


def create_encrypted_field_serializer(field_name: str):
    """Create a field serializer for encrypted fields."""
    
    def serializer(value, _info):
        if isinstance(value, EncryptedField):
            return value.model_dump()
        elif isinstance(value, str):
            # If it's a plain string, encrypt it first
            encryption_service = get_encryption_service()
            encrypted = encryption_service.encrypt_field(value)
            return encrypted.model_dump()
        return value
    
    return serializer