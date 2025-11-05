#!/usr/bin/env python3
"""Test script for enhanced document processing service with LangChain."""

import asyncio
import os
from unittest.mock import AsyncMock, patch

async def test_document_processing_service():
    """Test the enhanced document processing service."""
    print("Testing Document Processing Service with LangChain...")
    
    # Mock the OpenAI API key for testing
    os.environ["AI_OPENAI_API_KEY"] = "test-key"
    
    try:
        from app.services.document_processing.service import DocumentProcessingService
        from app.services.document_processing.models import (
            UserProfile, JobPosting, TemplateType, DocumentFormat
        )
        from app.core.dependencies import ServiceDependencies
        from app.core.config import get_settings
        from app.core.logging import get_logger
        from app.core.openai_client import EnhancedOpenAIClient
        
        # Create mock dependencies
        settings = get_settings()
        logger = get_logger(__name__)
        
        # Mock Redis client
        class MockRedis:
            async def get(self, key): return None
            async def setex(self, key, ttl, value): pass
            async def ping(self): return True
        
        # Mock OpenAI client
        openai_client = EnhancedOpenAIClient()
        
        dependencies = ServiceDependencies(
            db_session=None,
            redis_client=MockRedis(),
            openai_client=openai_client,
            logger=logger,
            settings=settings
        )
        
        # Initialize service
        service = DocumentProcessingService(dependencies)
        print("✓ Document processing service initialized")
        
        # Test user profile creation
        user_profile = UserProfile(
            id="test-user-123",
            first_name="John",
            last_name="Doe",
            email="john.doe@example.com",
            phone="+1-555-0123",
            location="San Francisco, CA",
            skills=["Python", "FastAPI", "Machine Learning", "Docker"],
            experience=[
                {
                    "title": "Senior Software Engineer",
                    "company": "Tech Corp",
                    "duration": "2020-2024",
                    "description": "Led development of ML-powered applications"
                }
            ],
            education=[
                {
                    "degree": "Bachelor of Science in Computer Science",
                    "institution": "University of California",
                    "year": "2020"
                }
            ],
            career_goals="Seeking senior engineering role in AI/ML",
            summary="Experienced software engineer with expertise in Python and ML"
        )
        print("✓ User profile created")
        
        # Test job posting creation
        job_posting = JobPosting(
            id="job-456",
            title="Senior Python Developer",
            company="AI Startup Inc",
            description="""
            We are looking for a Senior Python Developer with experience in:
            - Python development (5+ years)
            - FastAPI and web frameworks
            - Machine learning and AI
            - Docker and containerization
            - Cloud platforms (AWS/GCP)
            
            Responsibilities:
            - Design and implement scalable Python applications
            - Work with ML models and data pipelines
            - Collaborate with cross-functional teams
            """,
            location="Remote",
            salary_min=120000,
            salary_max=180000,
            employment_type="Full-time"
        )
        print("✓ Job posting created")
        
        # Test LangChain components
        print("✓ LangChain components initialized")
        print(f"  - Text splitter: {type(service.text_splitter).__name__}")
        print(f"  - LangChain LLM: {type(service.langchain_llm).__name__}")
        print(f"  - Jinja2 environment: {type(service.jinja_env).__name__}")
        
        # Test helper methods
        cache_key = service._get_resume_cache_key(
            user_profile.id, job_posting, TemplateType.PROFESSIONAL
        )
        print(f"✓ Cache key generation: {cache_key}")
        
        # Test prompt formatting
        experience_formatted = service._format_experience_for_prompt(user_profile.experience)
        print("✓ Experience formatting working")
        
        education_formatted = service._format_education_for_prompt(user_profile.education)
        print("✓ Education formatting working")
        
        print("Document Processing Service test passed!")
        return True
        
    except Exception as e:
        print(f"✗ Document Processing Service test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_document_models():
    """Test document processing Pydantic models."""
    print("\nTesting Document Processing Models...")
    
    try:
        from app.services.document_processing.models import (
            UserProfile, JobPosting, DocumentGenerationRequest,
            ExtractedRequirements, GeneratedDocument, TemplateType,
            DocumentFormat, ProcessedDocument
        )
        
        # Test UserProfile
        user_profile = UserProfile(
            id="user-123",
            first_name="Jane",
            last_name="Smith",
            email="jane.smith@example.com",
            skills=["Python", "React", "PostgreSQL"],
            experience=[{"title": "Developer", "company": "Tech Co"}],
            education=[{"degree": "BS CS", "institution": "State University"}]
        )
        print("✓ UserProfile model created")
        
        # Test JobPosting
        job_posting = JobPosting(
            id="job-789",
            title="Full Stack Developer",
            company="Startup LLC",
            description="Looking for a full stack developer with Python and React experience"
        )
        print("✓ JobPosting model created")
        
        # Test DocumentGenerationRequest
        doc_request = DocumentGenerationRequest(
            user_profile=user_profile,
            job_posting=job_posting,
            template_id=TemplateType.MODERN,
            format=DocumentFormat.PDF,
            include_cover_letter=True
        )
        print("✓ DocumentGenerationRequest model created")
        
        # Test ExtractedRequirements
        requirements = ExtractedRequirements(
            required_skills=["Python", "React"],
            preferred_skills=["Docker", "AWS"],
            experience_years=3,
            education_level="Bachelor's degree"
        )
        print("✓ ExtractedRequirements model created")
        
        # Test GeneratedDocument
        generated_doc = GeneratedDocument(
            content="Sample resume content...",
            format=DocumentFormat.TXT,
            metadata={"template": "modern"},
            generation_time=2.5,
            word_count=250,
            template_used=TemplateType.MODERN
        )
        print("✓ GeneratedDocument model created")
        
        # Test ProcessedDocument
        processed_doc = ProcessedDocument(
            file_name="resume.pdf",
            format=DocumentFormat.PDF,
            extracted_text="Extracted text content...",
            metadata={"pages": 2},
            processing_time=1.2
        )
        print("✓ ProcessedDocument model created")
        
        print("Document Processing Models test passed!")
        return True
        
    except Exception as e:
        print(f"✗ Document Processing Models test failed: {e}")
        return False


async def test_celery_tasks():
    """Test Celery task imports and structure."""
    print("\nTesting Celery Tasks...")
    
    try:
        from app.services.document_processing.tasks import (
            generate_resume_langchain_task,
            process_document_langchain_task,
            extract_requirements_langchain_task,
            batch_document_processing_task,
            generate_multiple_formats_task
        )
        
        print("✓ LangChain resume generation task imported")
        print("✓ LangChain document processing task imported")
        print("✓ LangChain requirements extraction task imported")
        print("✓ Batch document processing task imported")
        print("✓ Multiple formats generation task imported")
        
        # Test task names
        assert generate_resume_langchain_task.name == "document_processing.generate_resume_langchain"
        assert process_document_langchain_task.name == "document_processing.process_document_langchain"
        print("✓ Task names are correct")
        
        print("Celery Tasks test passed!")
        return True
        
    except Exception as e:
        print(f"✗ Celery Tasks test failed: {e}")
        return False


async def main():
    """Run all tests."""
    print("=== Document Processing Service with LangChain Test ===\n")
    
    tests = [
        test_document_processing_service,
        test_document_models,
        test_celery_tasks
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
        print("🎉 All tests passed! Document Processing Service with LangChain is ready.")
        return 0
    else:
        print("❌ Some tests failed. Check the output above.")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)