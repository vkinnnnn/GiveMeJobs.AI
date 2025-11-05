"""
Database encryption service for transparent field-level encryption with SQLAlchemy.

This module provides SQLAlchemy custom types and utilities for automatic
encryption/decryption of sensitive data at the database layer.
"""

import json
from typing import Any, Optional, Type, TypeVar, Union

import structlog
from sqlalchemy import String, TypeDecorator, Text
from sqlalchemy.dialects import postgresql
from sqlalchemy.engine import Dialect
from sqlalchemy.sql.type_api import UserDefinedType

from .encryption import EncryptedField, get_encryption_service

logger = structlog.get_logger()

T = TypeVar('T')


class EncryptedType(TypeDecorator):
    """
    SQLAlchemy custom type for automatic field encryption/decryption.
    
    This type automatically encrypts data when storing to database
    and decrypts when loading from database.
    """
    
    impl = Text
    cache_ok = True
    
    def __init__(self, key_id: Optional[str] = None, *args, **kwargs):
        """
        Initialize encrypted type.
        
        Args:
            key_id: Encryption key ID to use. If None, uses default key.
        """
        super().__init__(*args, **kwargs)
        self.key_id = key_id
        self.encryption_service = get_encryption_service()
    
    def process_bind_param(self, value: Any, dialect: Dialect) -> Optional[str]:
        """
        Process value before storing to database (encrypt).
        
        Args:
            value: Raw value to encrypt
            dialect: SQLAlchemy dialect
            
        Returns:
            JSON string of encrypted field or None
        """
        if value is None:
            return None
        
        try:
            # If already encrypted, serialize it
            if isinstance(value, EncryptedField):
                return json.dumps(value.model_dump())
            
            # If it's a plain value, encrypt it
            if isinstance(value, (str, int, float)):
                encrypted_field = self.encryption_service.encrypt_field(value, self.key_id)
                return json.dumps(encrypted_field.model_dump())
            
            # For other types, convert to string first
            encrypted_field = self.encryption_service.encrypt_field(str(value), self.key_id)
            return json.dumps(encrypted_field.model_dump())
            
        except Exception as e:
            logger.error("Failed to encrypt value for database", 
                        key_id=self.key_id, error=str(e))
            raise
    
    def process_result_value(self, value: Optional[str], dialect: Dialect) -> Optional[str]:
        """
        Process value after loading from database (decrypt).
        
        Args:
            value: JSON string of encrypted field from database
            dialect: SQLAlchemy dialect
            
        Returns:
            Decrypted plain text value or None
        """
        if value is None:
            return None
        
        try:
            # Parse JSON to get encrypted field
            encrypted_data = json.loads(value)
            encrypted_field = EncryptedField(**encrypted_data)
            
            # Decrypt and return plain text
            return self.encryption_service.decrypt_field(encrypted_field)
            
        except Exception as e:
            logger.error("Failed to decrypt value from database", 
                        error=str(e))
            # Return None or raise based on configuration
            return None


class EncryptedString(EncryptedType):
    """Encrypted string type for VARCHAR/TEXT fields."""
    
    impl = String
    
    def __init__(self, length: Optional[int] = None, key_id: Optional[str] = None, **kwargs):
        """
        Initialize encrypted string type.
        
        Args:
            length: Maximum length for the underlying string column
            key_id: Encryption key ID to use
        """
        if length:
            self.impl = String(length)
        super().__init__(key_id=key_id, **kwargs)


class EncryptedText(EncryptedType):
    """Encrypted text type for TEXT fields."""
    
    impl = Text


class EncryptedJSON(TypeDecorator):
    """
    SQLAlchemy type for encrypting JSON data.
    
    This type encrypts the entire JSON object as a string.
    """
    
    impl = Text
    cache_ok = True
    
    def __init__(self, key_id: Optional[str] = None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.key_id = key_id
        self.encryption_service = get_encryption_service()
    
    def process_bind_param(self, value: Any, dialect: Dialect) -> Optional[str]:
        """Encrypt JSON data before storing."""
        if value is None:
            return None
        
        try:
            # Convert to JSON string
            json_str = json.dumps(value, default=str)
            
            # Encrypt the JSON string
            encrypted_field = self.encryption_service.encrypt_field(json_str, self.key_id)
            return json.dumps(encrypted_field.model_dump())
            
        except Exception as e:
            logger.error("Failed to encrypt JSON for database", 
                        key_id=self.key_id, error=str(e))
            raise
    
    def process_result_value(self, value: Optional[str], dialect: Dialect) -> Any:
        """Decrypt and parse JSON data after loading."""
        if value is None:
            return None
        
        try:
            # Parse encrypted field
            encrypted_data = json.loads(value)
            encrypted_field = EncryptedField(**encrypted_data)
            
            # Decrypt to get JSON string
            json_str = self.encryption_service.decrypt_field(encrypted_field)
            
            # Parse JSON and return object
            return json.loads(json_str)
            
        except Exception as e:
            logger.error("Failed to decrypt JSON from database", error=str(e))
            return None


class EncryptedPIIType(EncryptedType):
    """
    Specialized encrypted type for PII data with additional security measures.
    
    This type uses a dedicated PII encryption key and includes additional
    audit logging for compliance.
    """
    
    def __init__(self, *args, **kwargs):
        # Always use PII-specific key
        super().__init__(key_id="pii_default_v1", *args, **kwargs)
    
    def process_bind_param(self, value: Any, dialect: Dialect) -> Optional[str]:
        """Process PII data with audit logging."""
        if value is not None:
            logger.info("Encrypting PII data for database storage", 
                       data_type=type(value).__name__)
        
        return super().process_bind_param(value, dialect)
    
    def process_result_value(self, value: Optional[str], dialect: Dialect) -> Optional[str]:
        """Process PII data with audit logging."""
        if value is not None:
            logger.info("Decrypting PII data from database")
        
        return super().process_result_value(value, dialect)


class DatabaseEncryptionMixin:
    """
    Mixin for SQLAlchemy models that need encryption support.
    
    Provides utilities for handling encrypted fields in models.
    """
    
    @classmethod
    def get_encrypted_columns(cls) -> list[str]:
        """Get list of encrypted column names in the model."""
        encrypted_columns = []
        
        if hasattr(cls, '__table__'):
            for column in cls.__table__.columns:
                if isinstance(column.type, (EncryptedType, EncryptedJSON, EncryptedPIIType)):
                    encrypted_columns.append(column.name)
        
        return encrypted_columns
    
    def encrypt_sensitive_data(self) -> dict[str, Any]:
        """
        Encrypt sensitive data in the model instance.
        
        Returns:
            Dictionary with encrypted field data
        """
        encrypted_data = {}
        encrypted_columns = self.get_encrypted_columns()
        
        for column_name in encrypted_columns:
            if hasattr(self, column_name):
                value = getattr(self, column_name)
                if value is not None:
                    encryption_service = get_encryption_service()
                    encrypted_field = encryption_service.encrypt_field(value)
                    encrypted_data[column_name] = encrypted_field.model_dump()
        
        return encrypted_data
    
    def audit_encryption_access(self, operation: str, user_id: Optional[str] = None):
        """
        Audit encryption operations for compliance.
        
        Args:
            operation: Type of operation (read, write, update, delete)
            user_id: ID of user performing operation
        """
        encrypted_columns = self.get_encrypted_columns()
        
        if encrypted_columns:
            logger.info("Database encryption operation", 
                       operation=operation,
                       model=self.__class__.__name__,
                       encrypted_fields=encrypted_columns,
                       user_id=user_id,
                       record_id=getattr(self, 'id', None))


class EncryptionKeyRotationService:
    """Service for rotating encryption keys in database records."""
    
    def __init__(self):
        self.logger = logger.bind(service="key_rotation")
        self.encryption_service = get_encryption_service()
    
    async def rotate_key_for_table(
        self, 
        session, 
        model_class: Type[T], 
        old_key_id: str, 
        new_key_id: str,
        batch_size: int = 100
    ) -> int:
        """
        Rotate encryption key for all records in a table.
        
        Args:
            session: SQLAlchemy async session
            model_class: SQLAlchemy model class
            old_key_id: Old encryption key ID
            new_key_id: New encryption key ID
            batch_size: Number of records to process per batch
            
        Returns:
            Number of records updated
        """
        try:
            updated_count = 0
            encrypted_columns = []
            
            # Find encrypted columns
            if hasattr(model_class, '__table__'):
                for column in model_class.__table__.columns:
                    if isinstance(column.type, (EncryptedType, EncryptedJSON, EncryptedPIIType)):
                        encrypted_columns.append(column.name)
            
            if not encrypted_columns:
                self.logger.info("No encrypted columns found", 
                               model=model_class.__name__)
                return 0
            
            # Process records in batches
            offset = 0
            while True:
                # Fetch batch of records
                query = session.query(model_class).offset(offset).limit(batch_size)
                records = await query.all()
                
                if not records:
                    break
                
                # Process each record
                for record in records:
                    try:
                        record_updated = False
                        
                        for column_name in encrypted_columns:
                            if hasattr(record, column_name):
                                encrypted_value = getattr(record, column_name)
                                
                                if encrypted_value and self._needs_key_rotation(encrypted_value, old_key_id):
                                    # Decrypt with old key and re-encrypt with new key
                                    decrypted_value = self._decrypt_with_key(encrypted_value, old_key_id)
                                    new_encrypted_value = self._encrypt_with_key(decrypted_value, new_key_id)
                                    
                                    setattr(record, column_name, new_encrypted_value)
                                    record_updated = True
                        
                        if record_updated:
                            updated_count += 1
                    
                    except Exception as e:
                        self.logger.error("Failed to rotate key for record", 
                                        model=model_class.__name__,
                                        record_id=getattr(record, 'id', None),
                                        error=str(e))
                
                # Commit batch
                await session.commit()
                offset += batch_size
                
                self.logger.info("Processed batch for key rotation", 
                               model=model_class.__name__,
                               batch_size=len(records),
                               updated_in_batch=len([r for r in records if self._record_was_updated(r)]))
            
            self.logger.info("Completed key rotation for table", 
                           model=model_class.__name__,
                           total_updated=updated_count)
            
            return updated_count
            
        except Exception as e:
            self.logger.error("Failed to rotate keys for table", 
                            model=model_class.__name__,
                            error=str(e))
            await session.rollback()
            raise
    
    def _needs_key_rotation(self, encrypted_value: str, old_key_id: str) -> bool:
        """Check if encrypted value needs key rotation."""
        try:
            if isinstance(encrypted_value, str):
                encrypted_data = json.loads(encrypted_value)
                return encrypted_data.get('key_id') == old_key_id
            return False
        except:
            return False
    
    def _decrypt_with_key(self, encrypted_value: str, key_id: str) -> str:
        """Decrypt value with specific key."""
        encrypted_data = json.loads(encrypted_value)
        encrypted_field = EncryptedField(**encrypted_data)
        return self.encryption_service.decrypt_field(encrypted_field)
    
    def _encrypt_with_key(self, plain_value: str, key_id: str) -> str:
        """Encrypt value with specific key."""
        encrypted_field = self.encryption_service.encrypt_field(plain_value, key_id)
        return json.dumps(encrypted_field.model_dump())
    
    def _record_was_updated(self, record) -> bool:
        """Check if record was updated (simplified check)."""
        # This would need to be implemented based on your ORM change tracking
        return True


# Utility functions for database encryption

def create_encrypted_column(
    column_type: str = "string",
    key_id: Optional[str] = None,
    length: Optional[int] = None,
    **kwargs
) -> Union[EncryptedString, EncryptedText, EncryptedJSON, EncryptedPIIType]:
    """
    Create an encrypted column type.
    
    Args:
        column_type: Type of column ("string", "text", "json", "pii")
        key_id: Encryption key ID to use
        length: Maximum length for string columns
        **kwargs: Additional arguments for the column type
        
    Returns:
        Appropriate encrypted column type
    """
    if column_type == "string":
        return EncryptedString(length=length, key_id=key_id, **kwargs)
    elif column_type == "text":
        return EncryptedText(key_id=key_id, **kwargs)
    elif column_type == "json":
        return EncryptedJSON(key_id=key_id, **kwargs)
    elif column_type == "pii":
        return EncryptedPIIType(**kwargs)
    else:
        raise ValueError(f"Unknown encrypted column type: {column_type}")


def get_encryption_audit_query(session, model_class: Type[T], days: int = 30):
    """
    Get audit query for encryption operations on a model.
    
    Args:
        session: SQLAlchemy session
        model_class: Model class to audit
        days: Number of days to look back
        
    Returns:
        Query for encryption audit logs
    """
    from datetime import datetime, timedelta
    from ..models.encrypted_fields import EncryptionAuditLog
    
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    return session.query(EncryptionAuditLog).filter(
        EncryptionAuditLog.entity_type == model_class.__name__,
        EncryptionAuditLog.timestamp >= cutoff_date
    ).order_by(EncryptionAuditLog.timestamp.desc())


# Global key rotation service instance
_key_rotation_service: Optional[EncryptionKeyRotationService] = None


def get_key_rotation_service() -> EncryptionKeyRotationService:
    """Get global key rotation service instance."""
    global _key_rotation_service
    if _key_rotation_service is None:
        _key_rotation_service = EncryptionKeyRotationService()
    return _key_rotation_service