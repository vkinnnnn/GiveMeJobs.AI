"""
Integration tests for external API integrations with mock servers.
"""

import pytest
from httpx import AsyncClient
import json
from unittest.mock import AsyncMock, patch


@pytest.mark.integration
@pytest.mark.asyncio
class TestOpenAIIntegration:
    """Integration tests for OpenAI API integration."""
    
    async def test_openai_chat_completion_integration(self, mock_external_apis):
        """Test OpenAI chat completion integration."""
        from app.core.openai_client import OpenAIService
        
        service = OpenAIService()
        
        # Test chat completion
        response = await service.create_chat_completion(
            messages=[{"role": "user", "content": "Generate a resume summary"}],
            model="gpt-4"
        )
        
        assert response is not None
        assert "choices" in response
        assert len(response["choices"]) > 0
        assert "message" in response["choices"][0]
        assert "content" in response["choices"][0]["message"]
    
    async def test_openai_embedding_generation(self, mock_external_apis):
        """Test OpenAI embedding generation."""
        from app.core.openai_client import OpenAIService
        
        service = OpenAIService()
        
        # Mock embedding response
        with patch.object(service.client.embeddings, 'create') as mock_create:
            mock_create.return_value = AsyncMock()
            mock_create.return_value.data = [
                AsyncMock(embedding=[0.1, 0.2, 0.3, 0.4, 0.5])
            ]
            
            embedding = await service.create_embedding(
                text="Python developer with machine learning experience"
            )
            
            assert embedding is not None
            assert isinstance(embedding, list)
            assert len(embedding) > 0
    
    async def test_openai_error_handling(self):
        """Test OpenAI API error handling."""
        from app.core.openai_client import OpenAIService
        from app.core.exceptions import ExternalServiceError
        
        service = OpenAIService()
        
        # Mock API error
        with patch.object(service.client.chat.completions, 'create') as mock_create:
            mock_create.side_effect = Exception("API Error")
            
            with pytest.raises(ExternalServiceError):
                await service.create_chat_completion(
                    messages=[{"role": "user", "content": "test"}]
                )


@pytest.mark.integration
@pytest.mark.asyncio
class TestPineconeIntegration:
    """Integration tests for Pinecone vector database integration."""
    
    async def test_pinecone_vector_operations(self, mock_external_apis):
        """Test Pinecone vector operations."""
        from app.services.semantic_search.service import SemanticSearchService
        
        service = SemanticSearchService()
        
        # Test vector upsert
        vectors = [
            {
                "id": "job1",
                "values": [0.1, 0.2, 0.3, 0.4, 0.5],
                "metadata": {"title": "Software Engineer", "company": "TechCorp"}
            }
        ]
        
        # Mock successful upsert
        with patch.object(service, '_upsert_vectors') as mock_upsert:
            mock_upsert.return_value = {"upserted_count": 1}
            
            result = await service._upsert_vectors(vectors)
            assert result["upserted_count"] == 1
    
    async def test_pinecone_similarity_search(self, mock_external_apis):
        """Test Pinecone similarity search."""
        from app.services.semantic_search.service import SemanticSearchService
        
        service = SemanticSearchService()
        
        # Test similarity search
        query_vector = [0.1, 0.2, 0.3, 0.4, 0.5]
        
        # Mock search response
        with patch.object(service, '_query_similar_vectors') as mock_query:
            mock_query.return_value = {
                "matches": [
                    {
                        "id": "job1",
                        "score": 0.85,
                        "metadata": {"title": "Software Engineer"}
                    }
                ]
            }
            
            results = await service._query_similar_vectors(query_vector, top_k=10)
            assert "matches" in results
            assert len(results["matches"]) > 0
            assert results["matches"][0]["score"] > 0.8


@pytest.mark.integration
@pytest.mark.asyncio
class TestJobBoardAPIIntegration:
    """Integration tests for job board API integrations."""
    
    async def test_linkedin_api_integration(self, mock_external_apis):
        """Test LinkedIn API integration."""
        from app.tasks.job_aggregation import JobAggregationService
        
        service = JobAggregationService()
        
        # Test LinkedIn job fetching
        with patch.object(service, '_fetch_linkedin_jobs') as mock_fetch:
            mock_fetch.return_value = [
                {
                    "id": "123456",
                    "title": "Senior Python Developer",
                    "company": "LinkedIn Corp",
                    "location": "San Francisco, CA",
                    "description": "Looking for experienced Python developer"
                }
            ]
            
            jobs = await service._fetch_linkedin_jobs(
                keywords="python developer",
                location="San Francisco"
            )
            
            assert len(jobs) > 0
            assert jobs[0]["title"] == "Senior Python Developer"
    
    async def test_indeed_api_integration(self, mock_external_apis):
        """Test Indeed API integration."""
        from app.tasks.job_aggregation import JobAggregationService
        
        service = JobAggregationService()
        
        # Test Indeed job fetching
        with patch.object(service, '_fetch_indeed_jobs') as mock_fetch:
            mock_fetch.return_value = [
                {
                    "jobkey": "abc123",
                    "jobtitle": "Python Engineer",
                    "company": "Indeed Inc",
                    "city": "Austin",
                    "state": "TX",
                    "snippet": "Python development experience required"
                }
            ]
            
            jobs = await service._fetch_indeed_jobs(
                query="python engineer",
                location="Austin, TX"
            )
            
            assert len(jobs) > 0
            assert jobs[0]["jobtitle"] == "Python Engineer"
    
    async def test_job_aggregation_error_handling(self):
        """Test job aggregation error handling."""
        from app.tasks.job_aggregation import JobAggregationService
        from app.core.exceptions import ExternalServiceError
        
        service = JobAggregationService()
        
        # Test API error handling
        with patch.object(service, '_fetch_linkedin_jobs') as mock_fetch:
            mock_fetch.side_effect = Exception("API Rate Limit Exceeded")
            
            with pytest.raises(ExternalServiceError):
                await service._fetch_linkedin_jobs("python", "SF")


@pytest.mark.integration
@pytest.mark.asyncio
class TestEmailServiceIntegration:
    """Integration tests for email service integration."""
    
    async def test_email_notification_integration(self, mock_external_apis):
        """Test email notification integration."""
        from app.services.notification import EmailService
        
        service = EmailService()
        
        # Test email sending
        with patch.object(service, 'send_email') as mock_send:
            mock_send.return_value = {"message_id": "msg_123", "status": "sent"}
            
            result = await service.send_email(
                to_email="user@example.com",
                subject="Job Application Update",
                template="job_application_status",
                context={"job_title": "Software Engineer", "status": "Interview Scheduled"}
            )
            
            assert result["status"] == "sent"
            assert "message_id" in result
    
    async def test_bulk_email_integration(self, mock_external_apis):
        """Test bulk email integration."""
        from app.services.notification import EmailService
        
        service = EmailService()
        
        # Test bulk email sending
        recipients = [
            {"email": "user1@example.com", "name": "User 1"},
            {"email": "user2@example.com", "name": "User 2"}
        ]
        
        with patch.object(service, 'send_bulk_email') as mock_send:
            mock_send.return_value = {
                "sent_count": 2,
                "failed_count": 0,
                "message_ids": ["msg_1", "msg_2"]
            }
            
            result = await service.send_bulk_email(
                recipients=recipients,
                subject="Weekly Job Digest",
                template="weekly_digest"
            )
            
            assert result["sent_count"] == 2
            assert result["failed_count"] == 0


@pytest.mark.integration
@pytest.mark.asyncio
class TestWebhookIntegration:
    """Integration tests for webhook integrations."""
    
    async def test_webhook_processing(self, async_test_client: AsyncClient):
        """Test webhook processing integration."""
        # Test job board webhook
        webhook_payload = {
            "event": "job_posted",
            "job": {
                "id": "ext_job_123",
                "title": "Senior Developer",
                "company": "External Corp",
                "posted_at": "2024-01-01T00:00:00Z"
            }
        }
        
        response = await async_test_client.post(
            "/api/v1/webhooks/job-boards",
            json=webhook_payload,
            headers={"X-Webhook-Secret": "test-secret"}
        )
        assert response.status_code == 200
        
        webhook_response = response.json()
        assert webhook_response["status"] == "processed"
    
    async def test_webhook_authentication(self, async_test_client: AsyncClient):
        """Test webhook authentication."""
        webhook_payload = {"event": "test"}
        
        # Test without authentication
        response = await async_test_client.post(
            "/api/v1/webhooks/job-boards",
            json=webhook_payload
        )
        assert response.status_code == 401
        
        # Test with invalid secret
        response = await async_test_client.post(
            "/api/v1/webhooks/job-boards",
            json=webhook_payload,
            headers={"X-Webhook-Secret": "invalid-secret"}
        )
        assert response.status_code == 401


@pytest.mark.integration
@pytest.mark.asyncio
class TestCircuitBreakerIntegration:
    """Integration tests for circuit breaker pattern."""
    
    async def test_circuit_breaker_functionality(self):
        """Test circuit breaker functionality with external services."""
        from app.core.circuit_breaker import CircuitBreaker
        from app.core.exceptions import CircuitBreakerOpenError
        
        # Create circuit breaker
        circuit_breaker = CircuitBreaker(
            failure_threshold=3,
            recovery_timeout=60,
            expected_exception=Exception
        )
        
        # Simulate failing service
        async def failing_service():
            raise Exception("Service unavailable")
        
        # Test circuit breaker opening after failures
        for _ in range(3):
            with pytest.raises(Exception):
                await circuit_breaker.call(failing_service)
        
        # Circuit should be open now
        with pytest.raises(CircuitBreakerOpenError):
            await circuit_breaker.call(failing_service)
    
    async def test_circuit_breaker_recovery(self):
        """Test circuit breaker recovery."""
        from app.core.circuit_breaker import CircuitBreaker
        
        circuit_breaker = CircuitBreaker(
            failure_threshold=2,
            recovery_timeout=1,  # 1 second for testing
            expected_exception=Exception
        )
        
        # Simulate service that recovers
        call_count = 0
        
        async def recovering_service():
            nonlocal call_count
            call_count += 1
            if call_count <= 2:
                raise Exception("Service temporarily unavailable")
            return "Service recovered"
        
        # Trigger circuit breaker
        for _ in range(2):
            with pytest.raises(Exception):
                await circuit_breaker.call(recovering_service)
        
        # Wait for recovery timeout
        import asyncio
        await asyncio.sleep(1.1)
        
        # Service should work now
        result = await circuit_breaker.call(recovering_service)
        assert result == "Service recovered"