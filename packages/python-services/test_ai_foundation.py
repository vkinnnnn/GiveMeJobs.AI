#!/usr/bin/env python3
"""Test script for AI/ML services foundation."""

import asyncio
import os
from unittest.mock import AsyncMock, patch

async def test_openai_client():
    """Test OpenAI client initialization and basic functionality."""
    print("Testing OpenAI client...")
    
    # Mock the OpenAI API key for testing
    os.environ["AI_OPENAI_API_KEY"] = "test-key"
    
    try:
        from app.core.openai_client import EnhancedOpenAIClient
        
        # Create client instance
        client = EnhancedOpenAIClient()
        print("✓ OpenAI client created successfully")
        
        # Test rate limiter
        await client.rate_limiter.acquire()
        print("✓ Rate limiter working")
        
        # Test usage stats
        stats = await client.get_usage_stats()
        print(f"✓ Usage stats: {stats}")
        
        print("OpenAI client test passed!")
        return True
        
    except Exception as e:
        print(f"✗ OpenAI client test failed: {e}")
        return False


async def test_dependencies():
    """Test dependency injection system."""
    print("\nTesting dependency injection...")
    
    try:
        from app.core.dependencies import ServiceDependencies, get_redis_client
        from app.core.config import get_settings
        from app.core.logging import get_logger
        
        # Test settings
        settings = get_settings()
        print("✓ Settings loaded successfully")
        
        # Test logger
        logger = get_logger(__name__)
        logger.info("Test log message")
        print("✓ Logger working")
        
        # Test Redis client (will fail without Redis, but should not crash)
        try:
            redis_client = await get_redis_client()
            await redis_client.ping()
            print("✓ Redis client connected")
        except Exception as e:
            print(f"⚠ Redis not available (expected in test): {e}")
        
        print("Dependency injection test passed!")
        return True
        
    except Exception as e:
        print(f"✗ Dependency injection test failed: {e}")
        return False


async def test_pydantic_models():
    """Test Pydantic models for AI/ML data structures."""
    print("\nTesting Pydantic models...")
    
    try:
        from app.models.ai_models import (
            EmbeddingRequest, EmbeddingResponse, ChatCompletionRequest,
            ChatMessage, TokenUsage, ProcessingStatus
        )
        
        # Test embedding request
        embedding_req = EmbeddingRequest(
            text="Test text for embedding",
            user_id="test-user"
        )
        print("✓ EmbeddingRequest model created")
        
        # Test chat message
        message = ChatMessage(
            role="user",
            content="Hello, world!"
        )
        print("✓ ChatMessage model created")
        
        # Test chat completion request
        chat_req = ChatCompletionRequest(
            messages=[message],
            user_id="test-user"
        )
        print("✓ ChatCompletionRequest model created")
        
        # Test token usage
        usage = TokenUsage(
            prompt_tokens=10,
            completion_tokens=20,
            total_tokens=30
        )
        print("✓ TokenUsage model created")
        
        # Test embedding response
        embedding_resp = EmbeddingResponse(
            request_id=embedding_req.request_id,
            status=ProcessingStatus.COMPLETED,
            processing_time=1.5,
            embedding=[0.1, 0.2, 0.3],
            dimension=3,
            model_used="text-embedding-ada-002"
        )
        print("✓ EmbeddingResponse model created")
        
        print("Pydantic models test passed!")
        return True
        
    except Exception as e:
        print(f"✗ Pydantic models test failed: {e}")
        return False


async def test_service_structure():
    """Test service structure and imports."""
    print("\nTesting service structure...")
    
    try:
        # Test document processing service
        from app.services.document_processing.models import (
            DocumentGenerationRequest, UserProfile, JobPosting
        )
        print("✓ Document processing models imported")
        
        # Test semantic search service
        from app.services.semantic_search.models import (
            SemanticSearchRequest, SearchResults, JobMatch
        )
        print("✓ Semantic search models imported")
        
        # Test analytics service
        from app.services.analytics.routes import router as analytics_router
        print("✓ Analytics service imported")
        
        print("Service structure test passed!")
        return True
        
    except Exception as e:
        print(f"✗ Service structure test failed: {e}")
        return False


async def main():
    """Run all tests."""
    print("=== AI/ML Services Foundation Test ===\n")
    
    tests = [
        test_openai_client,
        test_dependencies,
        test_pydantic_models,
        test_service_structure
    ]
    
    results = []
    for test in tests:
        try:
            result = await test()
            results.append(result)
        except Exception as e:
            print(f"✗ Test {test.__name__} crashed: {e}")
            results.append(False)
    
    print(f"\n=== Test Results ===")
    print(f"Passed: {sum(results)}/{len(results)}")
    
    if all(results):
        print("🎉 All tests passed! AI/ML services foundation is ready.")
        return 0
    else:
        print("❌ Some tests failed. Check the output above.")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)