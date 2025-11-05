"""
Example of integrating encryption with existing user models.

This example shows how to modify existing Pydantic models and
SQLAlchemy models to use the encryption functionality.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field
from sqlalchemy import Column, String, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.dialects.postgresql import UUID as PGUUID

# Import our encryption components
from app.core.database_encryption import (
    EncryptedString, 
    EncryptedPIIType, 
    DatabaseEncryptionMixin
)
from app.models.encrypted_fields import EncryptedPIIMixin
from app.services.encryption_service import get_app_encryption_service

Base = declarative_base()


# Example 1: Enhanced Pydantic User Model with Encryption
class EncryptedUserModel(BaseModel, EncryptedPIIMixin):
    """
    Enhanced user model with automatic PII encryption.
    
    This model automatically encrypts PII fields when serializing
    and decrypts them when deserializing.
    """
    
    id: UUID = Field(default_factory=uuid4, description="User ID")
    
    # PII fields that will be automatically encrypted
    email: str = Field(..., description="User email (encrypted)")
    first_name: str = Field(..., description="First name (encrypted)")
    last_name: str = Field(..., description="Last name (encrypted)")
    phone_number: Optional[str] = Field(None, description="Phone number (encrypted)")
    
    # Non-PII fields remain unencrypted
    professional_headline: Optional[str] = Field(None, description="Professional headline")
    is_active: bool = Field(default=True, description="Whether user is active")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    
    class Config:
        """Pydantic configuration."""
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            UUID: lambda v: str(v)
        }
    
    async def save_encrypted(self) -> dict:
        """Save user data with encrypted PII fields."""
        app_service = get_app_encryption_service()
        user_data = self.model_dump()
        return await app_service.encrypt_user_pii(user_data, self.id)
    
    @classmethod
    async def load_encrypted(cls, encrypted_data: dict) -> 'EncryptedUserModel':
        """Load user from encrypted data."""
        app_service = get_app_encryption_service()
        user_id = encrypted_data.get('id')
        decrypted_data = await app_service.decrypt_user_pii(encrypted_data, user_id)
        return cls(**decrypted_data)


# Example 2: SQLAlchemy Model with Encrypted Columns
class EncryptedUserTable(Base, DatabaseEncryptionMixin):
    """
    SQLAlchemy model with encrypted PII columns.
    
    This model uses custom encrypted column types that automatically
    handle encryption/decryption at the database layer.
    """
    
    __tablename__ = 'encrypted_users'
    
    # Primary key
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    
    # Encrypted PII columns using custom types
    email = Column(EncryptedPIIType(), nullable=False, comment="Encrypted email address")
    first_name = Column(EncryptedPIIType(), nullable=False, comment="Encrypted first name")
    last_name = Column(EncryptedPIIType(), nullable=False, comment="Encrypted last name")
    phone_number = Column(EncryptedPIIType(), nullable=True, comment="Encrypted phone number")
    
    # Regular columns (not encrypted)
    professional_headline = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f"<EncryptedUser(id={self.id}, email=[ENCRYPTED])>"


# Example 3: Application Service Integration
class UserService:
    """
    Service class showing how to integrate encryption in business logic.
    """
    
    def __init__(self):
        self.app_encryption_service = get_app_encryption_service()
    
    async def create_user(self, user_data: dict) -> EncryptedUserModel:
        """
        Create a new user with encrypted PII data.
        
        Args:
            user_data: Dictionary containing user information
            
        Returns:
            EncryptedUserModel instance
        """
        try:
            # Create user model
            user = EncryptedUserModel(**user_data)
            
            # The model will automatically handle encryption when needed
            encrypted_data = await user.save_encrypted()
            
            # In a real application, you would save encrypted_data to database
            print(f"User created with encrypted PII: {user.id}")
            
            return user
            
        except Exception as e:
            print(f"Failed to create user: {e}")
            raise
    
    async def get_user(self, user_id: UUID, encrypted_data: dict) -> EncryptedUserModel:
        """
        Retrieve and decrypt user data.
        
        Args:
            user_id: User ID
            encrypted_data: Encrypted user data from database
            
        Returns:
            EncryptedUserModel with decrypted data
        """
        try:
            # Load user from encrypted data
            user = await EncryptedUserModel.load_encrypted(encrypted_data)
            
            print(f"User loaded and decrypted: {user.id}")
            
            return user
            
        except Exception as e:
            print(f"Failed to load user: {e}")
            raise
    
    async def update_user_pii(self, user_id: UUID, pii_updates: dict) -> dict:
        """
        Update user PII data with proper encryption.
        
        Args:
            user_id: User ID
            pii_updates: Dictionary of PII fields to update
            
        Returns:
            Dictionary with encrypted updated data
        """
        try:
            # Encrypt the PII updates
            encrypted_updates = await self.app_encryption_service.encrypt_user_pii(
                pii_updates, 
                user_id
            )
            
            print(f"User PII updated with encryption: {user_id}")
            
            return encrypted_updates
            
        except Exception as e:
            print(f"Failed to update user PII: {e}")
            raise


# Example 4: Usage Demonstration
async def demonstrate_encryption_integration():
    """Demonstrate the encryption integration with user models."""
    
    print("=== Encryption Integration Demonstration ===\n")
    
    # Initialize service
    user_service = UserService()
    
    # 1. Create a new user
    print("1. Creating new user with PII data...")
    user_data = {
        "email": "john.doe@example.com",
        "first_name": "John",
        "last_name": "Doe",
        "phone_number": "+1-555-123-4567",
        "professional_headline": "Senior Software Engineer"
    }
    
    user = await user_service.create_user(user_data)
    print(f"   Created user: {user.id}")
    print(f"   Email: {user.email}")
    print(f"   Name: {user.first_name} {user.last_name}")
    
    # 2. Simulate saving to database (get encrypted data)
    print("\n2. Getting encrypted data for database storage...")
    encrypted_data = await user.save_encrypted()
    
    # Show what gets stored in database
    print("   Encrypted fields in database:")
    for field_name, field_value in encrypted_data.items():
        if hasattr(field_value, 'encrypted_data'):
            print(f"     {field_name}: [ENCRYPTED - {field_value.key_id}]")
        else:
            print(f"     {field_name}: {field_value}")
    
    # 3. Simulate loading from database
    print("\n3. Loading user from encrypted database data...")
    loaded_user = await user_service.get_user(user.id, encrypted_data)
    print(f"   Loaded user: {loaded_user.id}")
    print(f"   Decrypted email: {loaded_user.email}")
    print(f"   Decrypted name: {loaded_user.first_name} {loaded_user.last_name}")
    
    # 4. Update PII data
    print("\n4. Updating user PII data...")
    pii_updates = {
        "phone_number": "+1-555-999-8888",
        "email": "john.doe.updated@example.com"
    }
    
    encrypted_updates = await user_service.update_user_pii(user.id, pii_updates)
    print("   PII updates encrypted successfully")
    
    # 5. Show encryption status
    print("\n5. Checking encryption service status...")
    from app.services.encryption_service import get_encryption_health_check
    
    health_status = await get_encryption_health_check()
    print(f"   Encryption service status: {health_status['status']}")
    print(f"   Active keys: {health_status['active_keys']}")
    print(f"   TLS valid: {health_status['tls_valid']}")
    
    print("\n✅ Encryption integration demonstration completed successfully!")


# Example 5: Database Migration Helper
def create_encrypted_user_table_migration():
    """
    Example of how to create a database migration for encrypted columns.
    
    This would typically be used with Alembic for SQLAlchemy migrations.
    """
    
    migration_sql = """
    -- Migration to add encrypted user table
    CREATE TABLE encrypted_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL,  -- Will contain encrypted JSON
        first_name TEXT NOT NULL,  -- Will contain encrypted JSON
        last_name TEXT NOT NULL,  -- Will contain encrypted JSON
        phone_number TEXT,  -- Will contain encrypted JSON
        professional_headline VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
    
    -- Add comments to indicate encrypted columns
    COMMENT ON COLUMN encrypted_users.email IS 'Encrypted PII data';
    COMMENT ON COLUMN encrypted_users.first_name IS 'Encrypted PII data';
    COMMENT ON COLUMN encrypted_users.last_name IS 'Encrypted PII data';
    COMMENT ON COLUMN encrypted_users.phone_number IS 'Encrypted PII data';
    
    -- Create index on non-encrypted searchable fields
    CREATE INDEX idx_encrypted_users_active ON encrypted_users(is_active);
    CREATE INDEX idx_encrypted_users_created ON encrypted_users(created_at);
    """
    
    return migration_sql


if __name__ == "__main__":
    import asyncio
    asyncio.run(demonstrate_encryption_integration())