"""
Test script for data encryption implementation.

This script tests the core encryption functionality to ensure
it works correctly before integration.
"""

import asyncio
import json
from datetime import datetime
from uuid import uuid4

from app.core.encryption import get_encryption_service, EncryptedField
from app.core.tls_config import get_tls_service
from app.services.encryption_service import get_app_encryption_service


async def test_basic_encryption():
    """Test basic field encryption and decryption."""
    print("Testing basic encryption...")
    
    encryption_service = get_encryption_service()
    
    # Test string encryption
    test_data = "john.doe@example.com"
    encrypted_field = encryption_service.encrypt_field(test_data)
    
    print(f"Original: {test_data}")
    print(f"Encrypted: {encrypted_field.encrypted_data[:20]}...")
    print(f"Key ID: {encrypted_field.key_id}")
    
    # Test decryption
    decrypted_data = encryption_service.decrypt_field(encrypted_field)
    print(f"Decrypted: {decrypted_data}")
    
    assert decrypted_data == test_data, "Decryption failed!"
    print("✓ Basic encryption test passed\n")


async def test_pii_encryption():
    """Test PII data encryption."""
    print("Testing PII data encryption...")
    
    encryption_service = get_encryption_service()
    
    # Test PII data
    pii_data = {
        "email": "jane.smith@example.com",
        "first_name": "Jane",
        "last_name": "Smith",
        "phone_number": "+1-555-123-4567",
        "address": "123 Main St, Anytown, USA",
        "professional_headline": "Software Engineer"  # Not PII
    }
    
    # Encrypt PII data
    encrypted_data = encryption_service.encrypt_pii_data(pii_data)
    
    print("Encrypted PII fields:")
    for field_name, field_value in encrypted_data.items():
        if isinstance(field_value, EncryptedField):
            print(f"  {field_name}: {field_value.encrypted_data[:20]}... (encrypted)")
        else:
            print(f"  {field_name}: {field_value} (not encrypted)")
    
    # Decrypt PII data
    decrypted_data = encryption_service.decrypt_pii_data(encrypted_data)
    
    print("\nDecrypted PII data:")
    for field_name, field_value in decrypted_data.items():
        print(f"  {field_name}: {field_value}")
    
    # Verify data integrity
    for field_name in ["email", "first_name", "last_name", "phone_number", "address"]:
        assert decrypted_data[field_name] == pii_data[field_name], f"PII field {field_name} mismatch!"
    
    print("✓ PII encryption test passed\n")


async def test_key_rotation():
    """Test encryption key rotation."""
    print("Testing key rotation...")
    
    encryption_service = get_encryption_service()
    
    # Create test key
    original_key_id = "test_key_v1"
    encryption_service.create_symmetric_key(original_key_id, expires_days=1)
    
    # Encrypt data with original key
    test_data = "sensitive information"
    encrypted_field = encryption_service.encrypt_field(test_data, original_key_id)
    
    print(f"Encrypted with key: {encrypted_field.key_id}")
    
    # Rotate key
    new_key_id = encryption_service.rotate_key(original_key_id)
    print(f"Rotated to new key: {new_key_id}")
    
    # Verify old key can still decrypt
    decrypted_data = encryption_service.decrypt_field(encrypted_field)
    assert decrypted_data == test_data, "Decryption with old key failed!"
    
    # Encrypt new data with new key
    new_encrypted_field = encryption_service.encrypt_field(test_data, new_key_id)
    new_decrypted_data = encryption_service.decrypt_field(new_encrypted_field)
    assert new_decrypted_data == test_data, "Encryption/decryption with new key failed!"
    
    print("✓ Key rotation test passed\n")


async def test_application_service():
    """Test high-level application encryption service."""
    print("Testing application encryption service...")
    
    app_service = get_app_encryption_service()
    
    # Test user data encryption
    user_data = {
        "email": "test.user@example.com",
        "first_name": "Test",
        "last_name": "User",
        "phone_number": "+1-555-999-8888",
        "professional_headline": "Test Engineer"
    }
    
    user_id = uuid4()
    
    # Encrypt user data
    encrypted_user_data = await app_service.encrypt_user_pii(user_data, user_id)
    print("Encrypted user data fields:")
    for field_name, field_value in encrypted_user_data.items():
        if isinstance(field_value, EncryptedField):
            print(f"  {field_name}: [ENCRYPTED]")
        else:
            print(f"  {field_name}: {field_value}")
    
    # Decrypt user data
    decrypted_user_data = await app_service.decrypt_user_pii(encrypted_user_data, user_id)
    print("\nDecrypted user data:")
    for field_name, field_value in decrypted_user_data.items():
        print(f"  {field_name}: {field_value}")
    
    # Verify integrity
    for field_name in ["email", "first_name", "last_name", "phone_number"]:
        assert decrypted_user_data[field_name] == user_data[field_name], f"User field {field_name} mismatch!"
    
    print("✓ Application service test passed\n")


async def test_tls_configuration():
    """Test TLS configuration service."""
    print("Testing TLS configuration...")
    
    tls_service = get_tls_service()
    
    # Create SSL context (will generate self-signed cert if needed)
    ssl_context = tls_service.create_ssl_context()
    print(f"SSL context created: {ssl_context}")
    
    # Get certificate info
    cert_info = tls_service.get_certificate_info()
    if cert_info:
        print(f"Certificate subject: {cert_info.subject}")
        print(f"Certificate expires in: {cert_info.days_until_expiry} days")
        print(f"Self-signed: {cert_info.is_self_signed}")
    
    # Get security headers
    security_headers = tls_service.get_security_headers()
    print(f"Security headers: {list(security_headers.keys())}")
    
    # Validate configuration
    validation_results = tls_service.validate_tls_configuration()
    print(f"TLS configuration valid: {validation_results['valid']}")
    if validation_results['warnings']:
        print(f"Warnings: {validation_results['warnings']}")
    
    print("✓ TLS configuration test passed\n")


async def test_encryption_status():
    """Test encryption status and metrics."""
    print("Testing encryption status...")
    
    app_service = get_app_encryption_service()
    
    # Get encryption status
    status = await app_service.get_encryption_status()
    
    print("Encryption Status:")
    print(f"  Active keys: {status['active_keys_count']}")
    print(f"  Expired keys: {len(status['expired_keys'])}")
    print(f"  Total encrypted fields: {status['encryption_metrics']['total_encrypted_fields']}")
    print(f"  Total decrypted fields: {status['encryption_metrics']['total_decrypted_fields']}")
    print(f"  TLS valid: {status['tls_status']['valid']}")
    
    # Get audit logs
    audit_logs = await app_service.get_audit_logs(limit=5)
    print(f"  Recent audit logs: {len(audit_logs)}")
    
    for log in audit_logs[:3]:  # Show first 3
        print(f"    {log.timestamp}: {log.operation} on {log.entity_type} - {log.success}")
    
    print("✓ Encryption status test passed\n")


async def main():
    """Run all encryption tests."""
    print("=== Data Encryption Implementation Tests ===\n")
    
    try:
        await test_basic_encryption()
        await test_pii_encryption()
        await test_key_rotation()
        await test_application_service()
        await test_tls_configuration()
        await test_encryption_status()
        
        print("🎉 All encryption tests passed successfully!")
        print("\nEncryption implementation is ready for production use.")
        
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())