"""
Unit tests for Encryption Service.

This module contains comprehensive unit tests for the encryption services,
testing field-level encryption, key management, and security features.
"""

import pytest
import pytest_asyncio
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock
from uuid import uuid4

from app.core.encryption import EncryptionService, EncryptedField, get_encryption_service
from app.services.encryption_service import ApplicationEncryptionService, get_app_encryption_service
from app.models.encrypted_fields import EncryptedPIIMixin, EncryptionAuditLog
from tests.utils.test_helpers import PerformanceTestHelper, SecurityTestHelper


@pytest.mark.unit
@pytest.mark.security
class TestEncryptionService:
    """Test cases for EncryptionService."""
    
    @pytest.fixture
    def encryption_service(self):
        """Create EncryptionService instance for testing."""
        return EncryptionService()
    
    def test_encryption_service_initialization(self, encryption_service):
        """Test encryption service initializes correctly."""
        assert encryption_service is not None
        assert hasattr(encryption_service, '_keys')
        assert hasattr(encryption_service, '_key_metadata')
        assert len(encryption_service._keys) > 0  # Should have default keys
    
    def test_create_symmetric_key(self, encryption_service):
        """Test symmetric key creation."""
        key_id = "test_key_v1"
        
        created_key_id = encryption_service.create_symmetric_key(key_id)
        
        assert created_key_id == key_id
        assert key_id in encryption_service._keys
        assert key_id in encryption_service._key_metadata
        
        metadata = encryption_service._key_metadata[key_id]
        assert metadata.key_id == key_id
        assert metadata.algorithm == "fernet"
        assert metadata.key_type == "symmetric"
        assert metadata.is_active is True
    
    def test_create_duplicate_key_fails(self, encryption_service):
        """Test that creating duplicate key fails."""
        key_id = "duplicate_key"
        
        # Create first key
        encryption_service.create_symmetric_key(key_id)
        
        # Try to create duplicate
        with pytest.raises(ValueError, match="already exists"):
            encryption_service.create_symmetric_key(key_id)
    
    def test_encrypt_decrypt_string(self, encryption_service):
        """Test string encryption and decryption."""
        test_data = "sensitive information"
        key_id = "test_key"
        
        encryption_service.create_symmetric_key(key_id)
        
        # Encrypt
        encrypted_field = encryption_service.encrypt_field(test_data, key_id)
        
        assert isinstance(encrypted_field, EncryptedField)
        assert encrypted_field.key_id == key_id
        assert encrypted_field.algorithm == "fernet"
        assert encrypted_field.encrypted_data != test_data
        assert len(encrypted_field.encrypted_data) > 0
        
        # Decrypt
        decrypted_data = encryption_service.decrypt_field(encrypted_field)
        assert decrypted_data == test_data
    
    def test_encrypt_decrypt_different_data_types(self, encryption_service):
        """Test encryption of different data types."""
        key_id = "test_key"
        encryption_service.create_symmetric_key(key_id)
        
        test_cases = [
            ("string data", str),
            (12345, int),
            (123.45, float),
            (b"bytes data", bytes)
        ]
        
        for original_data, data_type in test_cases:
            encrypted_field = encryption_service.encrypt_field(original_data, key_id)
            decrypted_data = encryption_service.decrypt_field(encrypted_field)
            
            if data_type == bytes:
                # Bytes are converted to string during encryption
                assert decrypted_data == original_data.decode('utf-8')
            else:
                assert decrypted_data == str(original_data)
    
    def test_encrypt_pii_data(self, encryption_service):
        """Test PII data encryption."""
        pii_data = {
            "email": "john.doe@example.com",
            "first_name": "John",
            "last_name": "Doe",
            "phone_number": "+1-555-123-4567",
            "address": "123 Main St, Anytown, USA",
            "professional_headline": "Software Engineer"  # Not PII
        }
        
        encrypted_data = encryption_service.encrypt_pii_data(pii_data)
        
        # PII fields should be encrypted
        pii_fields = {"email", "first_name", "last_name", "phone_number", "address"}
        for field_name, field_value in encrypted_data.items():
            if field_name in pii_fields:
                assert isinstance(field_value, EncryptedField)
                assert field_value.encrypted_data != pii_data[field_name]
            else:
                # Non-PII fields should remain unchanged
                assert field_value == pii_data[field_name]
    
    def test_decrypt_pii_data(self, encryption_service):
        """Test PII data decryption."""
        pii_data = {
            "email": "jane.smith@example.com",
            "first_name": "Jane",
            "last_name": "Smith",
            "professional_headline": "Data Scientist"
        }
        
        # Encrypt first
        encrypted_data = encryption_service.encrypt_pii_data(pii_data)
        
        # Then decrypt
        decrypted_data = encryption_service.decrypt_pii_data(encrypted_data)
        
        # Should match original data
        for field_name, original_value in pii_data.items():
            assert decrypted_data[field_name] == original_value
    
    def test_key_rotation(self, encryption_service):
        """Test encryption key rotation."""
        original_key_id = "rotation_test_key"
        encryption_service.create_symmetric_key(original_key_id, expires_days=1)
        
        # Encrypt data with original key
        test_data = "data to be re-encrypted"
        encrypted_field = encryption_service.encrypt_field(test_data, original_key_id)
        
        # Rotate key
        new_key_id = encryption_service.rotate_key(original_key_id)
        
        assert new_key_id != original_key_id
        assert new_key_id in encryption_service._keys
        assert new_key_id in encryption_service._key_metadata
        
        # Original key should be inactive
        original_metadata = encryption_service._key_metadata[original_key_id]
        assert original_metadata.is_active is False
        
        # New key should be active
        new_metadata = encryption_service._key_metadata[new_key_id]
        assert new_metadata.is_active is True
        assert new_metadata.rotation_count == original_metadata.rotation_count + 1
        
        # Should still be able to decrypt with old key
        decrypted_data = encryption_service.decrypt_field(encrypted_field)
        assert decrypted_data == test_data
    
    def test_key_expiration_check(self, encryption_service):
        """Test key expiration checking."""
        # Create key that expires soon
        soon_expire_key = "soon_expire_key"
        encryption_service.create_symmetric_key(soon_expire_key, expires_days=1)
        
        # Create key that expires later
        later_expire_key = "later_expire_key"
        encryption_service.create_symmetric_key(later_expire_key, expires_days=90)
        
        # Manually set expiration to past for testing
        encryption_service._key_metadata[soon_expire_key].expires_at = datetime.utcnow() - timedelta(days=1)
        
        expiring_keys = encryption_service.check_key_expiration()
        
        assert soon_expire_key in expiring_keys
        assert later_expire_key not in expiring_keys
    
    def test_get_active_keys(self, encryption_service):
        """Test getting active keys."""
        # Create some keys
        key1 = "active_key_1"
        key2 = "active_key_2"
        key3 = "inactive_key"
        
        encryption_service.create_symmetric_key(key1)
        encryption_service.create_symmetric_key(key2)
        encryption_service.create_symmetric_key(key3)
        
        # Deactivate one key
        encryption_service._key_metadata[key3].is_active = False
        
        active_keys = encryption_service.get_active_keys()
        active_key_ids = [key.key_id for key in active_keys]
        
        assert key1 in active_key_ids
        assert key2 in active_key_ids
        assert key3 not in active_key_ids
    
    @pytest.mark.performance
    def test_encryption_performance(self, encryption_service):
        """Test encryption performance."""
        performance_helper = PerformanceTestHelper()
        key_id = "performance_test_key"
        encryption_service.create_symmetric_key(key_id)
        
        test_data = "Performance test data " * 100  # Larger data
        
        # Test encryption performance
        with performance_helper.measure_time():
            encrypted_field = encryption_service.encrypt_field(test_data, key_id)
        
        performance_helper.assert_duration_under(0.1)  # Should encrypt in under 100ms
        
        # Test decryption performance
        with performance_helper.measure_time():
            decrypted_data = encryption_service.decrypt_field(encrypted_field)
        
        performance_helper.assert_duration_under(0.1)  # Should decrypt in under 100ms
        assert decrypted_data == test_data
    
    def test_encryption_with_default_key(self, encryption_service):
        """Test encryption using default key."""
        test_data = "data with default key"
        
        # Encrypt without specifying key (should use default)
        encrypted_field = encryption_service.encrypt_field(test_data)
        
        assert encrypted_field.key_id == "pii_default_v1"  # Default PII key
        
        # Should be able to decrypt
        decrypted_data = encryption_service.decrypt_field(encrypted_field)
        assert decrypted_data == test_data
    
    def test_encrypt_empty_and_none_values(self, encryption_service):
        """Test encryption of edge case values."""
        key_id = "edge_case_key"
        encryption_service.create_symmetric_key(key_id)
        
        # Test empty string
        encrypted_empty = encryption_service.encrypt_field("", key_id)
        decrypted_empty = encryption_service.decrypt_field(encrypted_empty)
        assert decrypted_empty == ""
        
        # Test None value should raise error or handle gracefully
        with pytest.raises((ValueError, TypeError)):
            encryption_service.encrypt_field(None, key_id)


@pytest.mark.unit
@pytest.mark.security
class TestApplicationEncryptionService:
    """Test cases for ApplicationEncryptionService."""
    
    @pytest_asyncio.fixture
    async def app_encryption_service(self):
        """Create ApplicationEncryptionService instance for testing."""
        return ApplicationEncryptionService()
    
    async def test_encrypt_user_pii(self, app_encryption_service):
        """Test user PII encryption."""
        user_data = {
            "email": "test@example.com",
            "first_name": "Test",
            "last_name": "User",
            "phone_number": "+1-555-123-4567",
            "professional_headline": "Developer"
        }
        user_id = uuid4()
        
        encrypted_data = await app_encryption_service.encrypt_user_pii(user_data, user_id)
        
        # PII fields should be encrypted
        pii_fields = {"email", "first_name", "last_name", "phone_number"}
        for field_name, field_value in encrypted_data.items():
            if field_name in pii_fields:
                assert isinstance(field_value, EncryptedField)
            else:
                assert field_value == user_data[field_name]
    
    async def test_decrypt_user_pii(self, app_encryption_service):
        """Test user PII decryption."""
        user_data = {
            "email": "decrypt@example.com",
            "first_name": "Decrypt",
            "last_name": "Test",
            "professional_headline": "Tester"
        }
        user_id = uuid4()
        
        # Encrypt first
        encrypted_data = await app_encryption_service.encrypt_user_pii(user_data, user_id)
        
        # Then decrypt
        decrypted_data = await app_encryption_service.decrypt_user_pii(encrypted_data, user_id)
        
        # Should match original
        for field_name, original_value in user_data.items():
            assert decrypted_data[field_name] == original_value
    
    async def test_encrypt_application_data(self, app_encryption_service):
        """Test application data encryption."""
        application_data = {
            "cover_letter": "I am very interested in this position...",
            "salary_expectation": 120000,
            "notes": "Private notes about the application",
            "status": "submitted"  # Not sensitive
        }
        application_id = uuid4()
        user_id = uuid4()
        
        encrypted_data = await app_encryption_service.encrypt_application_data(
            application_data, application_id, user_id
        )
        
        # Sensitive fields should be encrypted
        sensitive_fields = {"cover_letter", "salary_expectation", "notes"}
        for field_name, field_value in encrypted_data.items():
            if field_name in sensitive_fields:
                assert isinstance(field_value, EncryptedField)
            else:
                assert field_value == application_data[field_name]
    
    async def test_rotate_encryption_keys(self, app_encryption_service):
        """Test key rotation through application service."""
        # Create a test key first
        encryption_service = app_encryption_service.encryption_service
        test_key_id = "app_test_key"
        encryption_service.create_symmetric_key(test_key_id, expires_days=1)
        
        # Rotate the key
        rotated_keys = await app_encryption_service.rotate_encryption_keys([test_key_id])
        
        assert test_key_id in rotated_keys
        assert rotated_keys[test_key_id] != test_key_id
        assert rotated_keys[test_key_id] in encryption_service._keys
    
    async def test_get_encryption_status(self, app_encryption_service):
        """Test getting encryption status."""
        status = await app_encryption_service.get_encryption_status()
        
        assert "encryption_metrics" in status
        assert "active_keys" in status
        assert "expired_keys" in status
        assert "tls_status" in status
        assert "audit_log_count" in status
        
        assert isinstance(status["active_keys_count"], int)
        assert isinstance(status["expired_keys"], list)
    
    async def test_audit_logging(self, app_encryption_service):
        """Test audit logging for encryption operations."""
        user_data = {"email": "audit@example.com", "first_name": "Audit"}
        user_id = uuid4()
        
        # Perform encryption (should create audit log)
        await app_encryption_service.encrypt_user_pii(user_data, user_id)
        
        # Check audit logs
        audit_logs = await app_encryption_service.get_audit_logs(limit=5)
        
        assert len(audit_logs) > 0
        
        latest_log = audit_logs[0]
        assert latest_log.operation == "encrypt"
        assert latest_log.entity_type == "user"
        assert latest_log.entity_id == str(user_id)
        assert latest_log.success is True
    
    async def test_encryption_metrics_tracking(self, app_encryption_service):
        """Test encryption metrics are tracked correctly."""
        initial_status = await app_encryption_service.get_encryption_status()
        initial_encrypted = initial_status["encryption_metrics"]["total_encrypted_fields"]
        
        # Perform some encryption operations
        user_data = {"email": "metrics@example.com", "first_name": "Metrics"}
        user_id = uuid4()
        
        await app_encryption_service.encrypt_user_pii(user_data, user_id)
        
        # Check metrics updated
        updated_status = await app_encryption_service.get_encryption_status()
        updated_encrypted = updated_status["encryption_metrics"]["total_encrypted_fields"]
        
        assert updated_encrypted > initial_encrypted


@pytest.mark.unit
class TestEncryptedPIIMixin:
    """Test cases for EncryptedPIIMixin."""
    
    def test_pii_field_detection(self):
        """Test PII field detection."""
        
        class TestModel(EncryptedPIIMixin):
            def __init__(self):
                self.email = "test@example.com"
                self.first_name = "Test"
                self.last_name = "User"
                self.professional_headline = "Developer"
            
            def model_dump(self):
                return {
                    "email": self.email,
                    "first_name": self.first_name,
                    "last_name": self.last_name,
                    "professional_headline": self.professional_headline
                }
        
        model = TestModel()
        pii_fields = model._get_pii_fields()
        
        assert "email" in pii_fields
        assert "first_name" in pii_fields
        assert "last_name" in pii_fields
        assert "professional_headline" not in pii_fields
    
    async def test_encrypt_pii_fields(self):
        """Test PII field encryption through mixin."""
        
        class TestModel(EncryptedPIIMixin):
            def __init__(self):
                self.email = "mixin@example.com"
                self.first_name = "Mixin"
                self.last_name = "Test"
                self.professional_headline = "Tester"
            
            def model_dump(self):
                return {
                    "email": self.email,
                    "first_name": self.first_name,
                    "last_name": self.last_name,
                    "professional_headline": self.professional_headline
                }
        
        model = TestModel()
        encrypted_data = model.encrypt_pii_fields()
        
        # PII fields should be encrypted
        assert isinstance(encrypted_data["email"], EncryptedField)
        assert isinstance(encrypted_data["first_name"], EncryptedField)
        assert isinstance(encrypted_data["last_name"], EncryptedField)
        
        # Non-PII should remain unchanged
        assert encrypted_data["professional_headline"] == "Tester"


@pytest.mark.unit
@pytest.mark.security
class TestEncryptionSecurity:
    """Security-focused tests for encryption."""
    
    def test_encrypted_data_format(self, encryption_service=None):
        """Test that encrypted data format is secure."""
        if encryption_service is None:
            encryption_service = EncryptionService()
        
        key_id = "security_test_key"
        encryption_service.create_symmetric_key(key_id)
        
        test_data = "sensitive data"
        encrypted_field = encryption_service.encrypt_field(test_data, key_id)
        
        # Encrypted data should not contain original data
        assert test_data not in encrypted_field.encrypted_data
        
        # Encrypted data should be base64 encoded
        import base64
        try:
            base64.b64decode(encrypted_field.encrypted_data)
        except Exception:
            pytest.fail("Encrypted data is not valid base64")
        
        # Should have proper metadata
        assert encrypted_field.key_id == key_id
        assert encrypted_field.algorithm == "fernet"
        assert isinstance(encrypted_field.created_at, datetime)
    
    def test_key_isolation(self):
        """Test that different keys produce different encrypted data."""
        encryption_service = EncryptionService()
        
        key1 = "isolation_key_1"
        key2 = "isolation_key_2"
        
        encryption_service.create_symmetric_key(key1)
        encryption_service.create_symmetric_key(key2)
        
        test_data = "same data"
        
        encrypted1 = encryption_service.encrypt_field(test_data, key1)
        encrypted2 = encryption_service.encrypt_field(test_data, key2)
        
        # Same data encrypted with different keys should produce different results
        assert encrypted1.encrypted_data != encrypted2.encrypted_data
        assert encrypted1.key_id != encrypted2.key_id
        
        # But both should decrypt to the same original data
        decrypted1 = encryption_service.decrypt_field(encrypted1)
        decrypted2 = encryption_service.decrypt_field(encrypted2)
        
        assert decrypted1 == test_data
        assert decrypted2 == test_data
    
    def test_encryption_randomness(self):
        """Test that encryption produces different results for same input."""
        encryption_service = EncryptionService()
        key_id = "randomness_test_key"
        encryption_service.create_symmetric_key(key_id)
        
        test_data = "same input data"
        
        # Encrypt same data multiple times
        encrypted1 = encryption_service.encrypt_field(test_data, key_id)
        encrypted2 = encryption_service.encrypt_field(test_data, key_id)
        encrypted3 = encryption_service.encrypt_field(test_data, key_id)
        
        # Should produce different encrypted results (due to random IV)
        encrypted_values = [
            encrypted1.encrypted_data,
            encrypted2.encrypted_data,
            encrypted3.encrypted_data
        ]
        
        assert len(set(encrypted_values)) == 3, "Encryption should produce different results each time"
        
        # But all should decrypt to same original data
        for encrypted_field in [encrypted1, encrypted2, encrypted3]:
            decrypted = encryption_service.decrypt_field(encrypted_field)
            assert decrypted == test_data
    
    def test_tampered_data_detection(self):
        """Test that tampered encrypted data is detected."""
        encryption_service = EncryptionService()
        key_id = "tamper_test_key"
        encryption_service.create_symmetric_key(key_id)
        
        test_data = "original data"
        encrypted_field = encryption_service.encrypt_field(test_data, key_id)
        
        # Tamper with encrypted data
        tampered_data = encrypted_field.encrypted_data[:-5] + "XXXXX"
        tampered_field = EncryptedField(
            encrypted_data=tampered_data,
            key_id=encrypted_field.key_id,
            algorithm=encrypted_field.algorithm,
            created_at=encrypted_field.created_at
        )
        
        # Decryption should fail
        with pytest.raises(Exception):  # Should raise cryptographic error
            encryption_service.decrypt_field(tampered_field)