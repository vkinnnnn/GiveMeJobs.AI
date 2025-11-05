"""
Test to verify pytest framework is working correctly.

This is a simple test to ensure the pytest setup is functional
and can run basic unit tests.
"""

import pytest
import asyncio
from datetime import datetime
from typing import List, Dict, Any


@pytest.mark.unit
class TestPytestFramework:
    """Test cases to verify pytest framework functionality."""
    
    def test_basic_assertion(self):
        """Test basic assertion functionality."""
        assert True
        assert 1 + 1 == 2
        assert "hello" == "hello"
    
    def test_string_operations(self):
        """Test string operations."""
        text = "Hello, World!"
        assert len(text) == 13
        assert text.lower() == "hello, world!"
        assert "World" in text
    
    def test_list_operations(self):
        """Test list operations."""
        numbers = [1, 2, 3, 4, 5]
        assert len(numbers) == 5
        assert sum(numbers) == 15
        assert max(numbers) == 5
        assert min(numbers) == 1
    
    def test_dictionary_operations(self):
        """Test dictionary operations."""
        data = {"name": "Test", "age": 25, "active": True}
        assert data["name"] == "Test"
        assert data.get("age") == 25
        assert "active" in data
        assert len(data) == 3
    
    def test_exception_handling(self):
        """Test exception handling."""
        with pytest.raises(ValueError):
            int("not_a_number")
        
        with pytest.raises(KeyError):
            data = {"key": "value"}
            _ = data["missing_key"]
        
        with pytest.raises(ZeroDivisionError):
            _ = 1 / 0
    
    @pytest.mark.parametrize("input_value,expected", [
        (1, 2),
        (2, 4),
        (3, 6),
        (4, 8),
        (5, 10)
    ])
    def test_parametrized_test(self, input_value: int, expected: int):
        """Test parametrized test functionality."""
        result = input_value * 2
        assert result == expected
    
    def test_fixtures_basic(self):
        """Test basic fixture functionality."""
        # This test doesn't use fixtures but verifies the test structure
        test_data = {"id": 1, "name": "Test Item"}
        assert test_data["id"] == 1
        assert test_data["name"] == "Test Item"
    
    @pytest.mark.slow
    def test_slow_operation(self):
        """Test marked as slow (for testing marker functionality)."""
        import time
        start_time = time.time()
        time.sleep(0.1)  # Simulate slow operation
        duration = time.time() - start_time
        assert duration >= 0.1
    
    def test_datetime_operations(self):
        """Test datetime operations."""
        now = datetime.now()
        assert isinstance(now, datetime)
        assert now.year >= 2024
    
    def test_type_checking(self):
        """Test type checking functionality."""
        def add_numbers(a: int, b: int) -> int:
            return a + b
        
        result = add_numbers(5, 3)
        assert result == 8
        assert isinstance(result, int)


@pytest.mark.unit
@pytest.mark.asyncio
class TestAsyncPytestFramework:
    """Test cases for async pytest functionality."""
    
    async def test_async_basic(self):
        """Test basic async functionality."""
        async def async_operation():
            await asyncio.sleep(0.01)
            return "async_result"
        
        result = await async_operation()
        assert result == "async_result"
    
    async def test_async_with_exception(self):
        """Test async exception handling."""
        async def failing_async_operation():
            await asyncio.sleep(0.01)
            raise ValueError("Async error")
        
        with pytest.raises(ValueError, match="Async error"):
            await failing_async_operation()
    
    async def test_async_concurrent_operations(self):
        """Test concurrent async operations."""
        async def async_task(delay: float, value: str) -> str:
            await asyncio.sleep(delay)
            return f"task_{value}"
        
        # Run tasks concurrently
        tasks = [
            async_task(0.01, "1"),
            async_task(0.01, "2"),
            async_task(0.01, "3")
        ]
        
        results = await asyncio.gather(*tasks)
        
        assert len(results) == 3
        assert "task_1" in results
        assert "task_2" in results
        assert "task_3" in results


@pytest.mark.unit
class TestPytestUtilities:
    """Test pytest utility functions."""
    
    def test_fixture_simulation(self):
        """Simulate fixture behavior without actual fixtures."""
        # Simulate database fixture
        mock_db = {"users": [], "jobs": []}
        
        # Add test data
        mock_db["users"].append({"id": 1, "name": "Test User"})
        mock_db["jobs"].append({"id": 1, "title": "Test Job"})
        
        assert len(mock_db["users"]) == 1
        assert len(mock_db["jobs"]) == 1
        assert mock_db["users"][0]["name"] == "Test User"
    
    def test_mock_behavior_simulation(self):
        """Simulate mock behavior without actual mocks."""
        # Simulate external service response
        def mock_external_service(request_data: Dict[str, Any]) -> Dict[str, Any]:
            return {
                "status": "success",
                "data": f"processed_{request_data.get('input', 'default')}",
                "timestamp": datetime.now().isoformat()
            }
        
        response = mock_external_service({"input": "test_data"})
        
        assert response["status"] == "success"
        assert response["data"] == "processed_test_data"
        assert "timestamp" in response
    
    def test_data_validation_patterns(self):
        """Test common data validation patterns."""
        def validate_user_data(user_data: Dict[str, Any]) -> bool:
            required_fields = ["name", "email", "age"]
            
            # Check required fields
            for field in required_fields:
                if field not in user_data:
                    return False
            
            # Validate email format (simple check)
            email = user_data["email"]
            if "@" not in email or "." not in email:
                return False
            
            # Validate age
            age = user_data["age"]
            if not isinstance(age, int) or age < 0 or age > 150:
                return False
            
            return True
        
        # Valid user data
        valid_user = {
            "name": "John Doe",
            "email": "john@example.com",
            "age": 30
        }
        assert validate_user_data(valid_user) is True
        
        # Invalid user data (missing field)
        invalid_user1 = {
            "name": "Jane Doe",
            "email": "jane@example.com"
            # Missing age
        }
        assert validate_user_data(invalid_user1) is False
        
        # Invalid user data (bad email)
        invalid_user2 = {
            "name": "Bob Smith",
            "email": "invalid_email",
            "age": 25
        }
        assert validate_user_data(invalid_user2) is False
    
    def test_performance_measurement_pattern(self):
        """Test performance measurement pattern."""
        import time
        
        def measure_execution_time(func, *args, **kwargs):
            start_time = time.time()
            result = func(*args, **kwargs)
            end_time = time.time()
            duration = end_time - start_time
            return result, duration
        
        def sample_operation(n: int) -> int:
            return sum(range(n))
        
        result, duration = measure_execution_time(sample_operation, 1000)
        
        assert result == sum(range(1000))
        assert duration >= 0
        assert isinstance(duration, float)


# Test configuration verification
def test_pytest_markers():
    """Test that pytest markers are working."""
    # This test itself uses the @pytest.mark.unit marker
    # If markers are configured correctly, this should work
    assert True


def test_pytest_configuration():
    """Test pytest configuration is loaded correctly."""
    # Test that we can access pytest configuration
    import pytest
    
    # Basic pytest functionality should be available
    assert hasattr(pytest, 'mark')
    assert hasattr(pytest, 'raises')
    assert hasattr(pytest, 'fixture')


if __name__ == "__main__":
    # Allow running this test file directly
    pytest.main([__file__, "-v"])