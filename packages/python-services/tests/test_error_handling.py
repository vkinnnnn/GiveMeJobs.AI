"""Test error handling and dependency injection scenarios."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException, status
from fastapi.testclient import TestClient

from app.core.exceptions import (
    BaseAPIException, ValidationException, AuthenticationException,
    AuthorizationException, NotFoundException, ConflictException,
    InternalServerException, ServiceUnavailableException
)
from app.core.error_handlers import (
    base_api_exception_handler, http_exception_handler,
    validation_exception_handler, general_exception_handler
)


class TestCustomExceptions:
    """Test custom exception classes."""
    
    def test_base_api_exception(self):
        """Test BaseAPIException creation."""
        exception = BaseAPIException(
            message="Test error",
            error_code="TEST_ERROR",
            status_code=400,
            details={"field": "value"}
        )
        
        assert exception.message == "Test error"
        assert exception.error_code == "TEST_ERROR"
        assert exception.status_code == 400
        assert exception.details == {"field": "value"}
    
    def test_validation_exception(self):
        """Test ValidationException creation."""
        field_errors = {"email": ["Invalid email format"]}
        exception = ValidationException(
            message="Validation failed",
            field_errors=field_errors
        )
        
        assert exception.error_code == "VALIDATION_ERROR"
        assert exception.status_code == 422
        assert exception.details["field_errors"] == field_errors
    
    def test_authentication_exception(self):
        """Test AuthenticationException creation."""
        exception = AuthenticationException()
        
        assert exception.error_code == "AUTHENTICATION_ERROR"
        assert exception.status_code == 401
        assert exception.message == "Authentication required"
    
    def test_authorization_exception(self):
        """Test AuthorizationException creation."""
        exception = AuthorizationException(
            message="Access denied",
            required_permission="admin"
        )
        
        assert exception.error_code == "AUTHORIZATION_ERROR"
        assert exception.status_code == 403
        assert exception.details["required_permission"] == "admin"
    
    def test_not_found_exception(self):
        """Test NotFoundException creation."""
        exception = NotFoundException(
            resource="User",
            identifier="123"
        )
        
        assert exception.error_code == "NOT_FOUND"
        assert exception.status_code == 404
        assert "User not found" in exception.message
        assert exception.details["identifier"] == "123"
    
    def test_conflict_exception(self):
        """Test ConflictException creation."""
        exception = ConflictException(
            message="Email already exists",
            conflicting_field="email",
            conflicting_value="test@example.com"
        )
        
        assert exception.error_code == "CONFLICT"
        assert exception.status_code == 409
        assert exception.details["conflicting_field"] == "email"
    
    def test_internal_server_exception(self):
        """Test InternalServerException creation."""
        exception = InternalServerException(
            error_id="error-123"
        )
        
        assert exception.error_code == "INTERNAL_SERVER_ERROR"
        assert exception.status_code == 500
        assert exception.details["error_id"] == "error-123"
    
    def test_service_unavailable_exception(self):
        """Test ServiceUnavailableException creation."""
        exception = ServiceUnavailableException(
            service_name="Redis",
            retry_after=60
        )
        
        assert exception.error_code == "SERVICE_UNAVAILABLE"
        assert exception.status_code == 503
        assert "Redis" in exception.message
        assert exception.details["retry_after"] == 60


class TestExceptionHandlers:
    """Test exception handler functions."""
    
    @pytest.fixture
    def mock_request(self):
        """Mock FastAPI request object."""
        request = MagicMock()
        request.url.path = "/api/v1/test"
        request.method = "GET"
        return request
    
    @pytest.mark.asyncio
    async def test_base_api_exception_handler(self, mock_request):
        """Test BaseAPIException handler."""
        exception = ValidationException(
            message="Test validation error",
            field_errors={"field": ["error"]}
        )
        
        with patch('app.core.error_handlers.get_correlation_id', return_value="test-id"):
            response = await base_api_exception_handler(mock_request, exception)
        
        assert response.status_code == 422
        response_data = response.body.decode()
        assert "VALIDATION_ERROR" in response_data
        assert "Test validation error" in response_data
    
    @pytest.mark.asyncio
    async def test_http_exception_handler(self, mock_request):
        """Test HTTPException handler."""
        exception = HTTPException(
            status_code=404,
            detail="Not found"
        )
        
        with patch('app.core.error_handlers.get_correlation_id', return_value="test-id"):
            response = await http_exception_handler(mock_request, exception)
        
        assert response.status_code == 404
        response_data = response.body.decode()
        assert "NOT_FOUND" in response_data
        assert "Not found" in response_data
    
    @pytest.mark.asyncio
    async def test_validation_exception_handler(self, mock_request):
        """Test Pydantic validation exception handler."""
        from pydantic import ValidationError
        
        # Create a mock validation error
        mock_error = MagicMock()
        mock_error.errors.return_value = [
            {
                "loc": ("email",),
                "msg": "field required",
                "type": "value_error.missing"
            }
        ]
        
        with patch('app.core.error_handlers.get_correlation_id', return_value="test-id"):
            response = await validation_exception_handler(mock_request, mock_error)
        
        assert response.status_code == 422
        response_data = response.body.decode()
        assert "VALIDATION_ERROR" in response_data
    
    @pytest.mark.asyncio
    async def test_general_exception_handler(self, mock_request):
        """Test general exception handler."""
        exception = Exception("Unexpected error")
        
        with patch('app.core.error_handlers.get_correlation_id', return_value="test-id"):
            response = await general_exception_handler(mock_request, exception)
        
        assert response.status_code == 500
        response_data = response.body.decode()
        assert "INTERNAL_SERVER_ERROR" in response_data
        assert "unexpected error occurred" in response_data.lower()


class TestErrorHandlingIntegration:
    """Test error handling integration with FastAPI."""
    
    def test_custom_exception_in_endpoint(self, test_client):
        """Test custom exception raised in endpoint."""
        from app.main import app
        from fastapi import APIRouter
        
        # Create a test router with an endpoint that raises an exception
        test_router = APIRouter()
        
        @test_router.get("/test-error")
        async def test_error_endpoint():
            raise ValidationException(
                message="Test validation error",
                field_errors={"test_field": ["Test error message"]}
            )
        
        # Add the test router to the app
        app.include_router(test_router, prefix="/test")
        
        # Make request to the error endpoint
        response = test_client.get("/test/test-error")
        
        assert response.status_code == 422
        data = response.json()
        assert data["success"] is False
        assert data["error"]["code"] == "VALIDATION_ERROR"
    
    def test_http_exception_in_endpoint(self, test_client):
        """Test HTTPException raised in endpoint."""
        from app.main import app
        from fastapi import APIRouter, HTTPException
        
        # Create a test router with an endpoint that raises HTTPException
        test_router = APIRouter()
        
        @test_router.get("/test-http-error")
        async def test_http_error_endpoint():
            raise HTTPException(
                status_code=404,
                detail="Resource not found"
            )
        
        # Add the test router to the app
        app.include_router(test_router, prefix="/test")
        
        # Make request to the error endpoint
        response = test_client.get("/test/test-http-error")
        
        assert response.status_code == 404
        data = response.json()
        assert data["success"] is False
        assert data["error"]["code"] == "NOT_FOUND"
    
    def test_unhandled_exception_in_endpoint(self, test_client):
        """Test unhandled exception in endpoint."""
        from app.main import app
        from fastapi import APIRouter
        
        # Create a test router with an endpoint that raises unhandled exception
        test_router = APIRouter()
        
        @test_router.get("/test-unhandled-error")
        async def test_unhandled_error_endpoint():
            raise ValueError("This is an unhandled error")
        
        # Add the test router to the app
        app.include_router(test_router, prefix="/test")
        
        # Make request to the error endpoint
        response = test_client.get("/test/test-unhandled-error")
        
        assert response.status_code == 500
        data = response.json()
        assert data["success"] is False
        assert data["error"]["code"] == "INTERNAL_SERVER_ERROR"


class TestDependencyInjectionErrors:
    """Test error scenarios in dependency injection."""
    
    @pytest.mark.asyncio
    async def test_database_connection_error(self, test_app):
        """Test database connection error in dependency."""
        from app.core.dependencies import get_db_session
        
        # Mock database session that raises an error
        async def mock_failing_db_session():
            raise Exception("Database connection failed")
        
        # Override the dependency
        test_app.dependency_overrides[get_db_session] = mock_failing_db_session
        
        # Create test client
        client = TestClient(test_app)
        
        # Make request that uses database dependency
        response = client.get("/api/v1/health/detailed")
        
        # Should handle the error gracefully
        assert response.status_code in [500, 503]  # Internal error or service unavailable
    
    @pytest.mark.asyncio
    async def test_cache_service_error(self, test_app):
        """Test cache service error in dependency."""
        from app.core.dependencies import get_cache
        
        # Mock cache service that raises an error
        async def mock_failing_cache():
            raise Exception("Cache service unavailable")
        
        # Override the dependency
        test_app.dependency_overrides[get_cache] = mock_failing_cache
        
        # Create test client
        client = TestClient(test_app)
        
        # Make request that uses cache dependency
        response = client.get("/api/v1/health/detailed")
        
        # Should handle the error gracefully
        assert response.status_code in [200, 503]  # May still work without cache
    
    def test_authentication_dependency_error(self, test_client):
        """Test authentication dependency error."""
        # This test would be more relevant once authentication is implemented
        # For now, we test that endpoints handle missing authentication gracefully
        
        response = test_client.get("/api/v1/users/me")
        
        # Should return appropriate error for missing authentication
        assert response.status_code in [401, 501]  # Unauthorized or not implemented


class TestErrorResponseFormat:
    """Test error response format consistency."""
    
    def test_error_response_structure(self, test_client):
        """Test that error responses have consistent structure."""
        # Make request to non-existent endpoint
        response = test_client.get("/api/v1/non-existent")
        
        assert response.status_code == 404
        data = response.json()
        
        # Check response structure
        assert "success" in data
        assert data["success"] is False
        assert "error" in data
        
        error = data["error"]
        assert "code" in error
        assert "message" in error
        assert "details" in error
        assert "correlation_id" in error
        assert "timestamp" in error
    
    def test_validation_error_response_structure(self, test_client):
        """Test validation error response structure."""
        from app.main import app
        from fastapi import APIRouter
        from pydantic import BaseModel
        
        # Create a test model for validation
        class TestModel(BaseModel):
            email: str
            age: int
        
        # Create a test router with validation
        test_router = APIRouter()
        
        @test_router.post("/test-validation")
        async def test_validation_endpoint(data: TestModel):
            return {"message": "Success"}
        
        # Add the test router to the app
        app.include_router(test_router, prefix="/test")
        
        # Send invalid data
        invalid_data = {
            "email": "invalid-email",
            "age": "not-a-number"
        }
        
        response = test_client.post("/test/test-validation", json=invalid_data)
        
        assert response.status_code == 422
        data = response.json()
        
        # Check validation error structure
        assert data["success"] is False
        assert data["error"]["code"] == "VALIDATION_ERROR"
        assert "field_errors" in data["error"]["details"]