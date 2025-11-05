#!/usr/bin/env python3
"""Test script for enhanced semantic search service."""

import asyncio
import os
from unittest.mock import AsyncMock, patch

async def test_semantic_search_service():
    """Test the enhanced semantic search service."""
    print("Testing Enhanced Semantic Search Service...")
    
    # Mock the API keys for testing
    os.environ["AI_OPENAI_API_KEY"] = "test-key"
    os.environ["AI_PINECONE_API_KEY"] = "test-key"
    
    try:
        from app.services.semantic_search.service import EnhancedSemanticSearchService
        from app.services.semantic_search.models import (
            UserProfile, JobPosting, SemanticSearchRequest, SearchType, SearchFilters
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
        service = EnhancedSemanticSearchService(dependencies)
        print("✓ Enhanced semantic search service initialized")
        
        # Test user profile creation
        user_profile = UserProfile(
            id="test-user-456",
            skills=["Python", "Machine Learning", "FastAPI", "Docker", "AWS"],
            experience=[
                {
                    "title": "Senior ML Engineer",
                    "company": "AI Corp",
                    "duration": "2021-2024",
                    "description": "Built ML pipelines and deployed models",
                    "achievements": "Improved model accuracy by 15%"
                }
            ],
            education=[
                {
                    "degree": "Master of Science",
                    "field": "Computer Science",
                    "institution": "Tech University",
                    "year": "2021"
                }
            ],
            career_goals="Seeking senior ML engineering role in AI/ML startup",
            years_experience=5,
            industry_preferences=["Technology", "AI/ML", "Fintech"],
            preferred_roles=["ML Engineer", "Data Scientist", "AI Engineer"],
            preferred_locations=["San Francisco", "New York", "Remote"],
            salary_expectation_min=150000,
            salary_expectation_max=200000
        )
        print("✓ Enhanced user profile created")
        
        # Test job posting creation
        job_posting = JobPosting(
            id="job-789",
            title="Senior Machine Learning Engineer",
            company="AI Startup Inc",
            description="""
            We are looking for a Senior ML Engineer with:
            - 5+ years of ML experience
            - Python, TensorFlow, PyTorch
            - AWS/GCP cloud platforms
            - FastAPI and microservices
            - Docker and Kubernetes
            
            You will:
            - Design and implement ML pipelines
            - Deploy models to production
            - Collaborate with data scientists
            - Optimize model performance
            """,
            location="San Francisco, CA",
            salary_min=160000,
            salary_max=220000,
            employment_type="Full-time",
            experience_level="senior",
            industry="Technology",
            remote_type="hybrid",
            required_skills=["Python", "Machine Learning", "TensorFlow", "AWS"],
            preferred_skills=["FastAPI", "Docker", "Kubernetes", "MLOps"],
            company_size="startup"
        )
        print("✓ Enhanced job posting created")
        
        # Test search filters
        search_filters = SearchFilters(
            locations=["San Francisco", "Remote"],
            salary_min=140000,
            employment_types=["Full-time"],
            experience_levels=["senior"],
            industries=["Technology"],
            remote_types=["remote", "hybrid"]
        )
        print("✓ Search filters created")
        
        # Test search request
        search_request = SemanticSearchRequest(
            user_profile=user_profile,
            filters=search_filters,
            search_type=SearchType.HYBRID,
            top_k=10,
            include_explanation=True,
            match_threshold=0.6
        )
        print("✓ Search request created")
        
        # Test enhanced profile text generation
        profile_text = service._create_enhanced_profile_text(user_profile)
        print(f"✓ Enhanced profile text generated: {len(profile_text)} characters")
        
        # Test skill matching
        matching_skills = service._find_matching_skills(user_profile, job_posting)
        print(f"✓ Skill matching: {matching_skills}")
        
        skill_gaps = service._find_skill_gaps(user_profile, job_posting)
        print(f"✓ Skill gaps identified: {skill_gaps}")
        
        # Test scoring methods
        traditional_score = await service._calculate_enhanced_traditional_match(
            user_profile, job_posting
        )
        print(f"✓ Enhanced traditional score: {traditional_score:.3f}")
        
        skill_score = await service._calculate_skill_match_score(user_profile, job_posting)
        print(f"✓ Skill match score: {skill_score:.3f}")
        
        exp_score = service._calculate_experience_match_score(user_profile, job_posting)
        print(f"✓ Experience match score: {exp_score:.3f}")
        
        location_score = service._calculate_location_match_score(user_profile, job_posting)
        print(f"✓ Location match score: {location_score:.3f}")
        
        salary_score = service._calculate_salary_match_score(user_profile, job_posting)
        print(f"✓ Salary match score: {salary_score:.3f}")
        
        industry_score = service._calculate_industry_match_score(user_profile, job_posting)
        print(f"✓ Industry match score: {industry_score:.3f}")
        
        # Test advanced composite scoring
        composite_score = await service._calculate_advanced_composite_score(
            0.85, traditional_score, user_profile, job_posting
        )
        print(f"✓ Advanced composite score: {composite_score:.3f}")
        
        # Test filter creation
        pinecone_filters = service._create_enhanced_pinecone_filters(search_filters)
        print(f"✓ Pinecone filters created: {len(pinecone_filters)} filters")
        
        elasticsearch_filters = service._create_elasticsearch_filters(search_filters)
        print(f"✓ Elasticsearch filters created: {len(elasticsearch_filters)} filters")
        
        # Test caching methods
        cache_key = service._generate_cache_key(search_request)
        print(f"✓ Cache key generated: {cache_key}")
        
        print("Enhanced Semantic Search Service test passed!")
        return True
        
    except Exception as e:
        print(f"✗ Enhanced Semantic Search Service test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_semantic_search_models():
    """Test semantic search Pydantic models."""
    print("\nTesting Semantic Search Models...")
    
    try:
        from app.services.semantic_search.models import (
            UserProfile, JobPosting, SemanticSearchRequest, SearchResults,
            JobMatch, SearchFilters, EmbeddingRequest, EmbeddingResponse,
            VectorSearchRequest, VectorSearchResponse, SearchType, MatchType
        )
        
        # Test enhanced UserProfile
        user_profile = UserProfile(
            id="user-456",
            skills=["Python", "React", "AWS"],
            experience=[{"title": "Engineer", "company": "Tech Co"}],
            education=[{"degree": "BS CS", "institution": "University"}],
            years_experience=3,
            industry_preferences=["Technology"],
            preferred_roles=["Software Engineer"],
            preferred_locations=["San Francisco"],
            salary_expectation_min=100000,
            salary_expectation_max=150000
        )
        print("✓ Enhanced UserProfile model created")
        
        # Test enhanced JobPosting
        job_posting = JobPosting(
            id="job-123",
            title="Software Engineer",
            company="Startup Inc",
            description="Looking for a software engineer with Python experience",
            location="San Francisco, CA",
            salary_min=120000,
            salary_max=160000,
            employment_type="Full-time",
            experience_level="mid",
            industry="Technology",
            remote_type="hybrid",
            required_skills=["Python", "React"],
            preferred_skills=["AWS", "Docker"],
            company_size="startup"
        )
        print("✓ Enhanced JobPosting model created")
        
        # Test SearchFilters
        search_filters = SearchFilters(
            locations=["San Francisco", "Remote"],
            salary_min=100000,
            salary_max=200000,
            employment_types=["Full-time"],
            experience_levels=["mid", "senior"],
            industries=["Technology"],
            remote_types=["remote", "hybrid"],
            required_skills=["Python"]
        )
        print("✓ SearchFilters model created")
        
        # Test SemanticSearchRequest
        search_request = SemanticSearchRequest(
            user_profile=user_profile,
            filters=search_filters,
            search_type=SearchType.HYBRID,
            top_k=20,
            include_explanation=True,
            match_threshold=0.7
        )
        print("✓ SemanticSearchRequest model created")
        
        # Test JobMatch
        job_match = JobMatch(
            job=job_posting,
            semantic_score=0.85,
            traditional_score=0.75,
            composite_score=0.81,
            matching_skills=["Python", "React"],
            skill_gaps=["Docker"],
            salary_match=True,
            location_match=True
        )
        print("✓ JobMatch model created")
        
        # Test SearchResults
        search_results = SearchResults(
            matches=[job_match],
            total_found=1,
            search_type=SearchType.HYBRID,
            processing_time=1.5,
            user_id=user_profile.id,
            filters_applied=search_filters,
            metadata={"enhanced": True}
        )
        print("✓ SearchResults model created")
        
        # Test EmbeddingRequest
        embedding_request = EmbeddingRequest(
            text="Software engineer with Python experience",
            embedding_type="job",
            metadata={"source": "job_description"}
        )
        print("✓ EmbeddingRequest model created")
        
        # Test EmbeddingResponse
        embedding_response = EmbeddingResponse(
            request_id=embedding_request.request_id,
            status="completed",
            processing_time=0.5,
            embedding=[0.1, 0.2, 0.3],
            dimension=3,
            model_used="text-embedding-ada-002"
        )
        print("✓ EmbeddingResponse model created")
        
        print("Semantic Search Models test passed!")
        return True
        
    except Exception as e:
        print(f"✗ Semantic Search Models test failed: {e}")
        return False


async def main():
    """Run all tests."""
    print("=== Enhanced Semantic Search Service Test ===\n")
    
    tests = [
        test_semantic_search_service,
        test_semantic_search_models
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
        print("🎉 All tests passed! Enhanced Semantic Search Service is ready.")
        return 0
    else:
        print("❌ Some tests failed. Check the output above.")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)