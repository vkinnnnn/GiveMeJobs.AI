"""
Integration tests for FastAPI service boundaries.
"""

import pytest
from httpx import AsyncClient
from fastapi.testclient import TestClient
import json


@pytest.mark.integration
@pytest.mark.asyncio
class TestUserServiceIntegration:
    """Integration tests for User service API endpoints."""
    
    async def test_user_registration_flow(
        self, 
        async_test_client: AsyncClient,
        test_db_session,
        test_redis_client
    ):
        """Test complete user registration flow."""
        # Test user registration
        user_data = {
            "email": "newuser@example.com",
            "password": "SecurePass123!",
            "first_name": "New",
            "last_name": "User",
            "professional_headline": "Software Developer"
        }
        
        response = await async_test_client.post("/api/v1/users/register", json=user_data)
        assert response.status_code == 201
        
        user_response = response.json()
        assert user_response["email"] == user_data["email"]
        assert user_response["first_name"] == user_data["first_name"]
        assert "id" in user_response
        
        user_id = user_response["id"]
        
        # Test user login
        login_data = {
            "email": user_data["email"],
            "password": user_data["password"]
        }
        
        response = await async_test_client.post("/api/v1/auth/login", json=login_data)
        assert response.status_code == 200
        
        auth_response = response.json()
        assert "access_token" in auth_response
        assert "refresh_token" in auth_response
        
        # Test authenticated user profile access
        headers = {"Authorization": f"Bearer {auth_response['access_token']}"}
        response = await async_test_client.get(f"/api/v1/users/{user_id}", headers=headers)
        assert response.status_code == 200
        
        profile_response = response.json()
        assert profile_response["id"] == user_id
        assert profile_response["email"] == user_data["email"]
    
    async def test_user_profile_update_flow(
        self,
        async_test_client: AsyncClient,
        sample_test_data,
        test_redis_client
    ):
        """Test user profile update with cache invalidation."""
        user = sample_test_data["user"]
        
        # Mock authentication token
        headers = {"Authorization": "Bearer mock-token"}
        
        # Update user profile
        update_data = {
            "professional_headline": "Senior Software Engineer",
            "skills": ["Python", "FastAPI", "PostgreSQL"]
        }
        
        response = await async_test_client.put(
            f"/api/v1/users/{user.id}",
            json=update_data,
            headers=headers
        )
        assert response.status_code == 200
        
        updated_user = response.json()
        assert updated_user["professional_headline"] == update_data["professional_headline"]
        
        # Verify cache was invalidated by checking Redis
        cache_key = f"user:{user.id}"
        cached_data = await test_redis_client.get(cache_key)
        
        if cached_data:
            cached_user = json.loads(cached_data)
            assert cached_user["professional_headline"] == update_data["professional_headline"]


@pytest.mark.integration
@pytest.mark.asyncio
class TestJobServiceIntegration:
    """Integration tests for Job service API endpoints."""
    
    async def test_job_search_with_filters(
        self,
        async_test_client: AsyncClient,
        sample_test_data,
        test_redis_client
    ):
        """Test job search with various filters."""
        # Test basic job search
        response = await async_test_client.get("/api/v1/jobs/search?q=python")
        assert response.status_code == 200
        
        search_results = response.json()
        assert "jobs" in search_results
        assert "total" in search_results
        assert isinstance(search_results["jobs"], list)
        
        # Test job search with location filter
        response = await async_test_client.get(
            "/api/v1/jobs/search?q=python&location=San Francisco"
        )
        assert response.status_code == 200
        
        # Test job search with salary filter
        response = await async_test_client.get(
            "/api/v1/jobs/search?q=python&salary_min=100000"
        )
        assert response.status_code == 200
        
        # Test job search with experience level filter
        response = await async_test_client.get(
            "/api/v1/jobs/search?q=python&experience_level=senior"
        )
        assert response.status_code == 200
    
    async def test_job_recommendation_flow(
        self,
        async_test_client: AsyncClient,
        sample_test_data,
        mock_external_apis
    ):
        """Test job recommendation based on user profile."""
        user = sample_test_data["user"]
        
        # Mock authentication
        headers = {"Authorization": "Bearer mock-token"}
        
        # Get job recommendations
        response = await async_test_client.get(
            f"/api/v1/jobs/recommendations/{user.id}",
            headers=headers
        )
        assert response.status_code == 200
        
        recommendations = response.json()
        assert "recommendations" in recommendations
        assert isinstance(recommendations["recommendations"], list)
        
        # Verify recommendation structure
        if recommendations["recommendations"]:
            rec = recommendations["recommendations"][0]
            assert "job_id" in rec
            assert "match_score" in rec
            assert "match_explanation" in rec


@pytest.mark.integration
@pytest.mark.asyncio
class TestApplicationServiceIntegration:
    """Integration tests for Application service API endpoints."""
    
    async def test_job_application_flow(
        self,
        async_test_client: AsyncClient,
        sample_test_data,
        test_redis_client
    ):
        """Test complete job application flow."""
        user = sample_test_data["user"]
        job = sample_test_data["job"]
        
        # Mock authentication
        headers = {"Authorization": "Bearer mock-token"}
        
        # Apply for job
        application_data = {
            "job_id": job.id,
            "cover_letter": "I am very interested in this position...",
            "resume_id": "resume-123"
        }
        
        response = await async_test_client.post(
            f"/api/v1/applications",
            json=application_data,
            headers=headers
        )
        assert response.status_code == 201
        
        application_response = response.json()
        assert application_response["job_id"] == job.id
        assert application_response["status"] == "applied"
        assert "id" in application_response
        
        application_id = application_response["id"]
        
        # Get application details
        response = await async_test_client.get(
            f"/api/v1/applications/{application_id}",
            headers=headers
        )
        assert response.status_code == 200
        
        # Update application status
        update_data = {"status": "interview_scheduled"}
        response = await async_test_client.put(
            f"/api/v1/applications/{application_id}",
            json=update_data,
            headers=headers
        )
        assert response.status_code == 200
        
        updated_application = response.json()
        assert updated_application["status"] == "interview_scheduled"
    
    async def test_application_analytics_integration(
        self,
        async_test_client: AsyncClient,
        sample_test_data
    ):
        """Test application analytics integration."""
        user = sample_test_data["user"]
        
        # Mock authentication
        headers = {"Authorization": "Bearer mock-token"}
        
        # Get user application analytics
        response = await async_test_client.get(
            f"/api/v1/analytics/applications/{user.id}",
            headers=headers
        )
        assert response.status_code == 200
        
        analytics = response.json()
        assert "total_applications" in analytics
        assert "response_rate" in analytics
        assert "interview_rate" in analytics


@pytest.mark.integration
@pytest.mark.asyncio
class TestDocumentProcessingIntegration:
    """Integration tests for Document Processing service."""
    
    async def test_resume_generation_integration(
        self,
        async_test_client: AsyncClient,
        sample_test_data,
        mock_external_apis,
        temp_directory
    ):
        """Test AI-powered resume generation integration."""
        user = sample_test_data["user"]
        job = sample_test_data["job"]
        
        # Mock authentication
        headers = {"Authorization": "Bearer mock-token"}
        
        # Generate resume
        generation_data = {
            "user_id": user.id,
            "job_id": job.id,
            "template_id": "modern"
        }
        
        response = await async_test_client.post(
            "/api/v1/documents/generate-resume",
            json=generation_data,
            headers=headers
        )
        assert response.status_code == 200
        
        resume_response = response.json()
        assert "content" in resume_response
        assert "metadata" in resume_response
        assert resume_response["metadata"]["template_id"] == "modern"
    
    async def test_document_upload_processing(
        self,
        async_test_client: AsyncClient,
        sample_test_data,
        temp_directory
    ):
        """Test document upload and processing."""
        user = sample_test_data["user"]
        
        # Mock authentication
        headers = {"Authorization": "Bearer mock-token"}
        
        # Create a test file
        test_file_content = b"Test resume content"
        
        # Upload document
        files = {"file": ("resume.pdf", test_file_content, "application/pdf")}
        data = {"user_id": user.id, "document_type": "resume"}
        
        response = await async_test_client.post(
            "/api/v1/documents/upload",
            files=files,
            data=data,
            headers=headers
        )
        assert response.status_code == 200
        
        upload_response = response.json()
        assert "document_id" in upload_response
        assert upload_response["status"] == "uploaded"


@pytest.mark.integration
@pytest.mark.asyncio
class TestSemanticSearchIntegration:
    """Integration tests for Semantic Search service."""
    
    async def test_semantic_job_matching(
        self,
        async_test_client: AsyncClient,
        sample_test_data,
        mock_external_apis
    ):
        """Test semantic job matching integration."""
        user = sample_test_data["user"]
        
        # Mock authentication
        headers = {"Authorization": "Bearer mock-token"}
        
        # Perform semantic search
        search_data = {
            "user_id": user.id,
            "query": "python developer with machine learning experience",
            "top_k": 10
        }
        
        response = await async_test_client.post(
            "/api/v1/search/semantic",
            json=search_data,
            headers=headers
        )
        assert response.status_code == 200
        
        search_results = response.json()
        assert "matches" in search_results
        assert isinstance(search_results["matches"], list)
        
        # Verify match structure
        if search_results["matches"]:
            match = search_results["matches"][0]
            assert "job_id" in match
            assert "semantic_score" in match
            assert "composite_score" in match
    
    async def test_embedding_generation_integration(
        self,
        async_test_client: AsyncClient,
        mock_external_apis
    ):
        """Test embedding generation for user profiles and jobs."""
        # Mock authentication
        headers = {"Authorization": "Bearer mock-token"}
        
        # Generate user profile embedding
        profile_data = {
            "text": "Experienced Python developer with 5 years in web development",
            "type": "user_profile"
        }
        
        response = await async_test_client.post(
            "/api/v1/search/embeddings/generate",
            json=profile_data,
            headers=headers
        )
        assert response.status_code == 200
        
        embedding_response = response.json()
        assert "embedding" in embedding_response
        assert isinstance(embedding_response["embedding"], list)
        assert len(embedding_response["embedding"]) > 0


@pytest.mark.integration
@pytest.mark.asyncio
class TestCacheIntegration:
    """Integration tests for caching layer."""
    
    async def test_redis_cache_integration(
        self,
        async_test_client: AsyncClient,
        test_redis_client,
        sample_test_data
    ):
        """Test Redis caching integration across services."""
        user = sample_test_data["user"]
        
        # Mock authentication
        headers = {"Authorization": "Bearer mock-token"}
        
        # First request - should hit database and cache result
        response1 = await async_test_client.get(
            f"/api/v1/users/{user.id}",
            headers=headers
        )
        assert response1.status_code == 200
        
        # Verify data was cached
        cache_key = f"user:{user.id}"
        cached_data = await test_redis_client.get(cache_key)
        assert cached_data is not None
        
        # Second request - should hit cache
        response2 = await async_test_client.get(
            f"/api/v1/users/{user.id}",
            headers=headers
        )
        assert response2.status_code == 200
        assert response1.json() == response2.json()
    
    async def test_cache_invalidation_integration(
        self,
        async_test_client: AsyncClient,
        test_redis_client,
        sample_test_data
    ):
        """Test cache invalidation on data updates."""
        user = sample_test_data["user"]
        
        # Mock authentication
        headers = {"Authorization": "Bearer mock-token"}
        
        # Cache user data
        cache_key = f"user:{user.id}"
        await test_redis_client.set(cache_key, '{"id": "test", "name": "old"}')
        
        # Update user data
        update_data = {"professional_headline": "Updated Headline"}
        response = await async_test_client.put(
            f"/api/v1/users/{user.id}",
            json=update_data,
            headers=headers
        )
        assert response.status_code == 200
        
        # Verify cache was invalidated/updated
        cached_data = await test_redis_client.get(cache_key)
        if cached_data:
            import json
            cached_user = json.loads(cached_data)
            assert cached_user.get("professional_headline") == "Updated Headline"