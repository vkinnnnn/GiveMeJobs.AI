"""
Test script to verify FastAPI foundation is working correctly.
This tests the basic FastAPI setup with Pydantic models and structured logging.
"""

import asyncio
import sys
import os

# Add the app directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

async def test_fastapi_foundation():
    """Test the FastAPI foundation setup."""
    print("🚀 Testing GiveMeJobs FastAPI Foundation...")
    
    try:
        # Test 1: Import core modules
        print("✅ Testing core module imports...")
        from app.core.config import get_settings
        from app.core.logging import configure_logging, get_logger
        from app.core.database import get_async_session
        
        # Test 2: Configuration loading
        print("✅ Testing configuration loading...")
        settings = get_settings()
        assert settings.service_name == "givemejobs-python-backend"
        assert settings.api_prefix == "/api/v1"
        print(f"   Service: {settings.service_name}")
        print(f"   Environment: {settings.environment}")
        
        # Test 3: Logging setup
        print("✅ Testing structured logging...")
        configure_logging()
        logger = get_logger("test")
        logger.info("Test log message", test_field="test_value")
        
        # Test 4: Pydantic models
        print("✅ Testing Pydantic models...")
        from app.models.user import UserCreate, UserResponse
        from app.models.base import ApiResponse
        
        # Create a test user model
        user_data = {
            "email": "test@example.com",
            "first_name": "Test",
            "last_name": "User",
            "password": "TestPass123!",
            "confirm_password": "TestPass123!"
        }
        user_create = UserCreate(**user_data)
        assert user_create.email == "test@example.com"
        print(f"   User model created: {user_create.first_name} {user_create.last_name}")
        
        # Test 5: FastAPI app creation
        print("✅ Testing FastAPI application creation...")
        from app.main import create_app
        
        app = create_app()
        assert app.title == settings.api_title
        print(f"   FastAPI app created: {app.title}")
        
        # Test 6: API endpoints structure
        print("✅ Testing API endpoints structure...")
        from app.api.v1.router import api_router
        
        # Check that router has routes
        assert len(api_router.routes) > 0
        print(f"   API router has {len(api_router.routes)} routes")
        
        # Test 7: Middleware
        print("✅ Testing middleware...")
        from app.middleware.correlation import CorrelationIDMiddleware
        from app.middleware.logging import LoggingMiddleware
        from app.middleware.rate_limiting import RateLimitMiddleware
        
        print("   All middleware classes imported successfully")
        
        print("\n🎉 FastAPI Foundation Test Completed Successfully!")
        print("✨ All core components are working correctly")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_fastapi_foundation())
    sys.exit(0 if success else 1)