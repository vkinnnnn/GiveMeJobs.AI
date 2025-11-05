"""
Unit tests for User Service.

This module contains comprehensive unit tests for the UserService class,
testing all CRUD operations, validation, and business logic.
"""

import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from app.services.user import UserService
from app.models.user import User, UserCreate, UserUpdate
from app.core.exceptions import NotFoundError, ValidationError, DuplicateError
from tests.utils.test_factories import UserFactory
from tests.utils.test_helpers import DatabaseTestHelper, PerformanceTestHelper


@pytest.mark.unit
class TestUserService:
    """Test cases for UserService."""
    
    @pytest_asyncio.fixture
    async def user_service(self, test_session):
        """Create UserService instance for testing."""
        return UserService(test_session)
    
    @pytest_asyncio.fixture
    async def sample_user_data(self):
        """Sample user data for testing."""
        return UserFactory.build()
    
    @pytest_asyncio.fixture
    async def db_helper(self, test_session):
        """Database helper for testing."""
        return DatabaseTestHelper(test_session)
    
    async def test_create_user_success(self, user_service, sample_user_data):
        """Test successful user creation."""
        user_create = UserCreate(**sample_user_data)
        
        user = await user_service.create_user(user_create)
        
        assert user is not None
        assert user.email == sample_user_data["email"]
        assert user.first_name == sample_user_data["first_name"]
        assert user.last_name == sample_user_data["last_name"]
        assert user.id is not None
        assert user.created_at is not None
        assert user.is_active is True
        assert user.email_verified is False
    
    async def test_create_user_duplicate_email(self, user_service, sample_user_data):
        """Test user creation with duplicate email."""
        user_create = UserCreate(**sample_user_data)
        
        # Create first user
        await user_service.create_user(user_create)
        
        # Try to create second user with same email
        with pytest.raises(DuplicateError) as exc_info:
            await user_service.create_user(user_create)
        
        assert "email" in str(exc_info.value).lower()
    
    async def test_create_user_invalid_email(self, user_service, sample_user_data):
        """Test user creation with invalid email."""
        sample_user_data["email"] = "invalid-email"
        user_create = UserCreate(**sample_user_data)
        
        with pytest.raises(ValidationError):
            await user_service.create_user(user_create)
    
    async def test_create_user_weak_password(self, user_service, sample_user_data):
        """Test user creation with weak password."""
        sample_user_data["password"] = "weak"
        user_create = UserCreate(**sample_user_data)
        
        with pytest.raises(ValidationError) as exc_info:
            await user_service.create_user(user_create)
        
        assert "password" in str(exc_info.value).lower()
    
    async def test_get_user_by_id_success(self, user_service, sample_user_data):
        """Test successful user retrieval by ID."""
        user_create = UserCreate(**sample_user_data)
        created_user = await user_service.create_user(user_create)
        
        retrieved_user = await user_service.get_user_by_id(created_user.id)
        
        assert retrieved_user is not None
        assert retrieved_user.id == created_user.id
        assert retrieved_user.email == created_user.email
    
    async def test_get_user_by_id_not_found(self, user_service):
        """Test user retrieval with non-existent ID."""
        non_existent_id = uuid4()
        
        with pytest.raises(NotFoundError):
            await user_service.get_user_by_id(non_existent_id)
    
    async def test_get_user_by_email_success(self, user_service, sample_user_data):
        """Test successful user retrieval by email."""
        user_create = UserCreate(**sample_user_data)
        created_user = await user_service.create_user(user_create)
        
        retrieved_user = await user_service.get_user_by_email(created_user.email)
        
        assert retrieved_user is not None
        assert retrieved_user.email == created_user.email
        assert retrieved_user.id == created_user.id
    
    async def test_get_user_by_email_not_found(self, user_service):
        """Test user retrieval with non-existent email."""
        retrieved_user = await user_service.get_user_by_email("nonexistent@example.com")
        assert retrieved_user is None
    
    async def test_update_user_success(self, user_service, sample_user_data):
        """Test successful user update."""
        user_create = UserCreate(**sample_user_data)
        created_user = await user_service.create_user(user_create)
        
        update_data = UserUpdate(
            first_name="Updated",
            professional_headline="Senior Developer"
        )
        
        updated_user = await user_service.update_user(created_user.id, update_data)
        
        assert updated_user.first_name == "Updated"
        assert updated_user.professional_headline == "Senior Developer"
        assert updated_user.last_name == sample_user_data["last_name"]  # Unchanged
        assert updated_user.updated_at > created_user.created_at
    
    async def test_update_user_not_found(self, user_service):
        """Test user update with non-existent ID."""
        non_existent_id = uuid4()
        update_data = UserUpdate(first_name="Updated")
        
        with pytest.raises(NotFoundError):
            await user_service.update_user(non_existent_id, update_data)
    
    async def test_delete_user_success(self, user_service, sample_user_data, db_helper):
        """Test successful user deletion."""
        user_create = UserCreate(**sample_user_data)
        created_user = await user_service.create_user(user_create)
        
        # Verify user exists
        user_count_before = await db_helper.count_records(User)
        assert user_count_before == 1
        
        # Delete user
        await user_service.delete_user(created_user.id)
        
        # Verify user is deleted
        user_count_after = await db_helper.count_records(User)
        assert user_count_after == 0
        
        # Verify user cannot be retrieved
        with pytest.raises(NotFoundError):
            await user_service.get_user_by_id(created_user.id)
    
    async def test_delete_user_not_found(self, user_service):
        """Test user deletion with non-existent ID."""
        non_existent_id = uuid4()
        
        with pytest.raises(NotFoundError):
            await user_service.delete_user(non_existent_id)
    
    async def test_list_users_empty(self, user_service):
        """Test listing users when none exist."""
        users = await user_service.list_users()
        
        assert users.items == []
        assert users.total == 0
        assert users.page == 1
        assert users.size == 50
        assert users.pages == 0
    
    async def test_list_users_with_data(self, user_service):
        """Test listing users with data."""
        # Create multiple users
        user_data_list = UserFactory.build_batch(5)
        for user_data in user_data_list:
            user_create = UserCreate(**user_data)
            await user_service.create_user(user_create)
        
        users = await user_service.list_users()
        
        assert len(users.items) == 5
        assert users.total == 5
        assert users.page == 1
        assert users.size == 50
        assert users.pages == 1
    
    async def test_list_users_pagination(self, user_service):
        """Test user listing with pagination."""
        # Create multiple users
        user_data_list = UserFactory.build_batch(15)
        for user_data in user_data_list:
            user_create = UserCreate(**user_data)
            await user_service.create_user(user_create)
        
        # Test first page
        page1 = await user_service.list_users(page=1, size=10)
        assert len(page1.items) == 10
        assert page1.total == 15
        assert page1.page == 1
        assert page1.size == 10
        assert page1.pages == 2
        
        # Test second page
        page2 = await user_service.list_users(page=2, size=10)
        assert len(page2.items) == 5
        assert page2.total == 15
        assert page2.page == 2
        assert page2.size == 10
        assert page2.pages == 2
    
    async def test_search_users_by_name(self, user_service):
        """Test searching users by name."""
        # Create users with specific names
        user_data1 = UserFactory.build({"first_name": "John", "last_name": "Doe"})
        user_data2 = UserFactory.build({"first_name": "Jane", "last_name": "Smith"})
        user_data3 = UserFactory.build({"first_name": "John", "last_name": "Smith"})
        
        for user_data in [user_data1, user_data2, user_data3]:
            user_create = UserCreate(**user_data)
            await user_service.create_user(user_create)
        
        # Search by first name
        john_users = await user_service.search_users(query="John")
        assert len(john_users.items) == 2
        
        # Search by last name
        smith_users = await user_service.search_users(query="Smith")
        assert len(smith_users.items) == 2
    
    async def test_verify_email_success(self, user_service, sample_user_data):
        """Test successful email verification."""
        user_create = UserCreate(**sample_user_data)
        created_user = await user_service.create_user(user_create)
        
        assert created_user.email_verified is False
        
        verified_user = await user_service.verify_email(created_user.id)
        
        assert verified_user.email_verified is True
        assert verified_user.updated_at > created_user.created_at
    
    async def test_deactivate_user_success(self, user_service, sample_user_data):
        """Test successful user deactivation."""
        user_create = UserCreate(**sample_user_data)
        created_user = await user_service.create_user(user_create)
        
        assert created_user.is_active is True
        
        deactivated_user = await user_service.deactivate_user(created_user.id)
        
        assert deactivated_user.is_active is False
        assert deactivated_user.updated_at > created_user.created_at
    
    async def test_activate_user_success(self, user_service, sample_user_data):
        """Test successful user activation."""
        user_create = UserCreate(**sample_user_data)
        created_user = await user_service.create_user(user_create)
        
        # First deactivate
        await user_service.deactivate_user(created_user.id)
        
        # Then activate
        activated_user = await user_service.activate_user(created_user.id)
        
        assert activated_user.is_active is True
    
    @pytest.mark.performance
    async def test_create_user_performance(self, user_service, sample_user_data):
        """Test user creation performance."""
        performance_helper = PerformanceTestHelper()
        user_create = UserCreate(**sample_user_data)
        
        with performance_helper.measure_time():
            await user_service.create_user(user_create)
        
        performance_helper.assert_duration_under(1.0)  # Should complete in under 1 second
    
    @pytest.mark.performance
    async def test_bulk_user_creation_performance(self, user_service):
        """Test bulk user creation performance."""
        performance_helper = PerformanceTestHelper()
        user_data_list = UserFactory.build_batch(100)
        
        with performance_helper.measure_time():
            for user_data in user_data_list:
                user_create = UserCreate(**user_data)
                await user_service.create_user(user_create)
        
        # Should create 100 users in under 10 seconds
        performance_helper.assert_duration_under(10.0)
    
    async def test_password_hashing(self, user_service, sample_user_data):
        """Test that passwords are properly hashed."""
        user_create = UserCreate(**sample_user_data)
        created_user = await user_service.create_user(user_create)
        
        # Password should be hashed, not stored in plain text
        assert hasattr(created_user, 'password_hash')
        assert created_user.password_hash != sample_user_data["password"]
        assert len(created_user.password_hash) > 20  # Hashed passwords are longer
    
    async def test_user_profile_completeness(self, user_service, sample_user_data):
        """Test user profile completeness calculation."""
        user_create = UserCreate(**sample_user_data)
        created_user = await user_service.create_user(user_create)
        
        completeness = await user_service.calculate_profile_completeness(created_user.id)
        
        assert isinstance(completeness, float)
        assert 0.0 <= completeness <= 100.0
    
    @patch('app.services.user.send_welcome_email')
    async def test_create_user_sends_welcome_email(self, mock_send_email, user_service, sample_user_data):
        """Test that welcome email is sent on user creation."""
        user_create = UserCreate(**sample_user_data)
        
        await user_service.create_user(user_create)
        
        mock_send_email.assert_called_once()
        call_args = mock_send_email.call_args[0]
        assert call_args[0] == sample_user_data["email"]
    
    async def test_user_statistics(self, user_service):
        """Test user statistics calculation."""
        # Create users with different statuses
        active_users = UserFactory.build_batch(5, {"is_active": True})
        inactive_users = UserFactory.build_batch(3, {"is_active": False})
        verified_users = UserFactory.build_batch(4, {"email_verified": True})
        
        all_users = active_users + inactive_users + verified_users
        for user_data in all_users:
            user_create = UserCreate(**user_data)
            await user_service.create_user(user_create)
        
        stats = await user_service.get_user_statistics()
        
        assert stats["total_users"] == len(all_users)
        assert stats["active_users"] >= 5  # At least the explicitly active ones
        assert stats["verified_users"] >= 4  # At least the explicitly verified ones
    
    async def test_concurrent_user_creation(self, user_service):
        """Test concurrent user creation doesn't cause issues."""
        import asyncio
        
        user_data_list = UserFactory.build_batch(10)
        
        async def create_user(user_data):
            user_create = UserCreate(**user_data)
            return await user_service.create_user(user_create)
        
        # Create users concurrently
        tasks = [create_user(user_data) for user_data in user_data_list]
        users = await asyncio.gather(*tasks)
        
        assert len(users) == 10
        assert all(user.id is not None for user in users)
        
        # All users should have unique IDs
        user_ids = [user.id for user in users]
        assert len(set(user_ids)) == 10
    
    async def test_user_data_validation_edge_cases(self, user_service):
        """Test user data validation edge cases."""
        # Test empty strings
        with pytest.raises(ValidationError):
            user_create = UserCreate(
                email="test@example.com",
                first_name="",
                last_name="Test",
                password="TestPassword123!"
            )
            await user_service.create_user(user_create)
        
        # Test very long names
        with pytest.raises(ValidationError):
            user_create = UserCreate(
                email="test@example.com",
                first_name="x" * 101,  # Assuming 100 char limit
                last_name="Test",
                password="TestPassword123!"
            )
            await user_service.create_user(user_create)
        
        # Test special characters in names
        user_create = UserCreate(
            email="test@example.com",
            first_name="José",
            last_name="O'Connor",
            password="TestPassword123!"
        )
        user = await user_service.create_user(user_create)
        assert user.first_name == "José"
        assert user.last_name == "O'Connor"