"""
Contract testing between Python services using pact-python.
"""

import pytest
from pact import Consumer, Provider, Like, EachLike, Term
import json
from httpx import AsyncClient


@pytest.mark.integration
@pytest.mark.contract
class TestDocumentProcessingContract:
    """Contract tests for Document Processing service."""
    
    @pytest.fixture(scope="class")
    def pact(self):
        """Create Pact consumer for Document Processing service."""
        pact = Consumer('analytics-service').has_pact_with(
            Provider('document-processing-service'),
            host_name='localhost',
            port=1234
        )
        pact.start()
        yield pact
        pact.stop()
    
    def test_generate_resume_contract(self, pact):
        """Test contract for resume generation endpoint."""
        # Define expected interaction
        expected_request = {
            "user_id": "user-123",
            "job_id": "job-456",
            "template_id": "modern"
        }
        
        expected_response = {
            "content": Like("Generated resume content..."),
            "metadata": {
                "word_count": Like(500),
                "generation_time": Like(2.5),
                "template_id": Like("modern")
            }
        }
        
        (pact
         .given('User and job exist')
         .upon_receiving('a request to generate resume')
         .with_request('POST', '/api/v1/documents/generate-resume')
         .will_respond_with(200, body=expected_response))
        
        with pact:
            # Make actual request to mock service
            import requests
            response = requests.post(
                'http://localhost:1234/api/v1/documents/generate-resume',
                json=expected_request,
                headers={'Content-Type': 'application/json'}
            )
            
            assert response.status_code == 200
            response_data = response.json()
            assert "content" in response_data
            assert "metadata" in response_data
            assert response_data["metadata"]["template_id"] == "modern"
    
    def test_document_upload_contract(self, pact):
        """Test contract for document upload endpoint."""
        expected_response = {
            "document_id": Like("doc-123"),
            "status": Like("uploaded"),
            "file_size": Like(1024),
            "file_type": Like("application/pdf")
        }
        
        (pact
         .given('User is authenticated')
         .upon_receiving('a request to upload document')
         .with_request('POST', '/api/v1/documents/upload')
         .will_respond_with(200, body=expected_response))
        
        with pact:
            import requests
            response = requests.post(
                'http://localhost:1234/api/v1/documents/upload',
                files={'file': ('test.pdf', b'test content', 'application/pdf')},
                data={'user_id': 'user-123', 'document_type': 'resume'}
            )
            
            assert response.status_code == 200
            response_data = response.json()
            assert "document_id" in response_data
            assert response_data["status"] == "uploaded"


@pytest.mark.integration
@pytest.mark.contract
class TestSemanticSearchContract:
    """Contract tests for Semantic Search service."""
    
    @pytest.fixture(scope="class")
    def pact(self):
        """Create Pact consumer for Semantic Search service."""
        pact = Consumer('job-service').has_pact_with(
            Provider('semantic-search-service'),
            host_name='localhost',
            port=1235
        )
        pact.start()
        yield pact
        pact.stop()
    
    def test_semantic_search_contract(self, pact):
        """Test contract for semantic job search."""
        expected_request = {
            "user_id": "user-123",
            "query": "python developer machine learning",
            "top_k": 10,
            "filters": {
                "location": "San Francisco",
                "salary_min": 100000
            }
        }
        
        expected_response = {
            "matches": EachLike({
                "job_id": Like("job-123"),
                "semantic_score": Like(0.85),
                "traditional_score": Like(0.75),
                "composite_score": Like(0.80),
                "match_explanation": Like("Strong match based on Python and ML skills")
            }),
            "total_matches": Like(25),
            "search_time_ms": Like(150)
        }
        
        (pact
         .given('Jobs exist in vector database')
         .upon_receiving('a semantic search request')
         .with_request('POST', '/api/v1/search/semantic')
         .will_respond_with(200, body=expected_response))
        
        with pact:
            import requests
            response = requests.post(
                'http://localhost:1235/api/v1/search/semantic',
                json=expected_request,
                headers={'Content-Type': 'application/json'}
            )
            
            assert response.status_code == 200
            response_data = response.json()
            assert "matches" in response_data
            assert isinstance(response_data["matches"], list)
            if response_data["matches"]:
                match = response_data["matches"][0]
                assert "job_id" in match
                assert "semantic_score" in match
                assert "composite_score" in match
    
    def test_embedding_generation_contract(self, pact):
        """Test contract for embedding generation."""
        expected_request = {
            "text": "Experienced Python developer with machine learning background",
            "type": "user_profile"
        }
        
        expected_response = {
            "embedding": EachLike(Like(0.123456)),
            "dimensions": Like(1536),
            "model": Like("text-embedding-ada-002")
        }
        
        (pact
         .given('OpenAI service is available')
         .upon_receiving('a request to generate embedding')
         .with_request('POST', '/api/v1/search/embeddings/generate')
         .will_respond_with(200, body=expected_response))
        
        with pact:
            import requests
            response = requests.post(
                'http://localhost:1235/api/v1/search/embeddings/generate',
                json=expected_request,
                headers={'Content-Type': 'application/json'}
            )
            
            assert response.status_code == 200
            response_data = response.json()
            assert "embedding" in response_data
            assert isinstance(response_data["embedding"], list)
            assert len(response_data["embedding"]) > 0


@pytest.mark.integration
@pytest.mark.contract
class TestAnalyticsServiceContract:
    """Contract tests for Analytics service."""
    
    @pytest.fixture(scope="class")
    def pact(self):
        """Create Pact consumer for Analytics service."""
        pact = Consumer('user-service').has_pact_with(
            Provider('analytics-service'),
            host_name='localhost',
            port=1236
        )
        pact.start()
        yield pact
        pact.stop()
    
    def test_application_analytics_contract(self, pact):
        """Test contract for application analytics."""
        expected_request = {
            "user_id": "user-123",
            "time_period": "3m"
        }
        
        expected_response = {
            "metrics": {
                "total_applications": Like(25),
                "response_rate": Like(32.5),
                "interview_rate": Like(12.0),
                "offer_rate": Like(4.0),
                "average_response_time_days": Like(7.2)
            },
            "insights": EachLike({
                "type": Like("trend"),
                "message": Like("Your response rate has improved by 15% this month"),
                "confidence": Like(0.85)
            }),
            "success_prediction": {
                "success_probability": Like(68.5),
                "confidence": Like(0.78),
                "factors": EachLike({
                    "factor": Like("skill_match"),
                    "impact": Like(0.25),
                    "description": Like("Strong technical skill alignment")
                })
            }
        }
        
        (pact
         .given('User has application history')
         .upon_receiving('a request for application analytics')
         .with_request('POST', '/api/v1/analytics/applications')
         .will_respond_with(200, body=expected_response))
        
        with pact:
            import requests
            response = requests.post(
                'http://localhost:1236/api/v1/analytics/applications',
                json=expected_request,
                headers={'Content-Type': 'application/json'}
            )
            
            assert response.status_code == 200
            response_data = response.json()
            assert "metrics" in response_data
            assert "insights" in response_data
            assert "success_prediction" in response_data
    
    def test_skill_scoring_contract(self, pact):
        """Test contract for skill scoring analytics."""
        expected_request = {
            "user_id": "user-123",
            "skills": ["Python", "Machine Learning", "FastAPI"]
        }
        
        expected_response = {
            "skill_scores": EachLike({
                "skill": Like("Python"),
                "score": Like(85.5),
                "market_demand": Like(92.0),
                "proficiency_level": Like("advanced"),
                "recommendations": EachLike(Like("Consider learning async programming"))
            }),
            "overall_score": Like(78.3),
            "market_position": Like("top_25_percent"),
            "improvement_areas": EachLike({
                "skill": Like("Docker"),
                "priority": Like("high"),
                "impact": Like(12.5)
            })
        }
        
        (pact
         .given('User profile exists with skills')
         .upon_receiving('a request for skill scoring')
         .with_request('POST', '/api/v1/analytics/skills/score')
         .will_respond_with(200, body=expected_response))
        
        with pact:
            import requests
            response = requests.post(
                'http://localhost:1236/api/v1/analytics/skills/score',
                json=expected_request,
                headers={'Content-Type': 'application/json'}
            )
            
            assert response.status_code == 200
            response_data = response.json()
            assert "skill_scores" in response_data
            assert "overall_score" in response_data
            assert isinstance(response_data["skill_scores"], list)


@pytest.mark.integration
@pytest.mark.contract
class TestBackgroundTaskContract:
    """Contract tests for background task services."""
    
    @pytest.fixture(scope="class")
    def pact(self):
        """Create Pact consumer for background task service."""
        pact = Consumer('job-aggregation-service').has_pact_with(
            Provider('notification-service'),
            host_name='localhost',
            port=1237
        )
        pact.start()
        yield pact
        pact.stop()
    
    def test_job_alert_notification_contract(self, pact):
        """Test contract for job alert notifications."""
        expected_request = {
            "user_id": "user-123",
            "jobs": EachLike({
                "job_id": Like("job-456"),
                "title": Like("Senior Python Developer"),
                "company": Like("TechCorp"),
                "match_score": Like(0.85)
            }),
            "alert_type": "daily_digest"
        }
        
        expected_response = {
            "notification_id": Like("notif-789"),
            "status": Like("sent"),
            "delivery_method": Like("email"),
            "sent_at": Term(
                r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z',
                '2024-01-01T12:00:00Z'
            )
        }
        
        (pact
         .given('User has active job alerts')
         .upon_receiving('a request to send job alert notification')
         .with_request('POST', '/api/v1/notifications/job-alerts')
         .will_respond_with(200, body=expected_response))
        
        with pact:
            import requests
            response = requests.post(
                'http://localhost:1237/api/v1/notifications/job-alerts',
                json=expected_request,
                headers={'Content-Type': 'application/json'}
            )
            
            assert response.status_code == 200
            response_data = response.json()
            assert "notification_id" in response_data
            assert response_data["status"] == "sent"


@pytest.mark.integration
@pytest.mark.contract
class TestErrorHandlingContract:
    """Contract tests for error handling across services."""
    
    @pytest.fixture(scope="class")
    def pact(self):
        """Create Pact consumer for error handling tests."""
        pact = Consumer('api-gateway').has_pact_with(
            Provider('python-services'),
            host_name='localhost',
            port=1238
        )
        pact.start()
        yield pact
        pact.stop()
    
    def test_validation_error_contract(self, pact):
        """Test contract for validation errors."""
        invalid_request = {
            "email": "invalid-email",  # Invalid email format
            "password": "123"  # Too short
        }
        
        expected_error_response = {
            "error": {
                "code": Like("VALIDATION_ERROR"),
                "message": Like("Validation failed"),
                "details": EachLike({
                    "field": Like("email"),
                    "message": Like("Invalid email format"),
                    "code": Like("invalid_format")
                }),
                "correlation_id": Term(
                    r'[a-f0-9-]{36}',
                    '123e4567-e89b-12d3-a456-426614174000'
                )
            }
        }
        
        (pact
         .given('Invalid user data provided')
         .upon_receiving('a request with validation errors')
         .with_request('POST', '/api/v1/users/register', body=invalid_request)
         .will_respond_with(400, body=expected_error_response))
        
        with pact:
            import requests
            response = requests.post(
                'http://localhost:1238/api/v1/users/register',
                json=invalid_request,
                headers={'Content-Type': 'application/json'}
            )
            
            assert response.status_code == 400
            error_data = response.json()
            assert "error" in error_data
            assert error_data["error"]["code"] == "VALIDATION_ERROR"
            assert "details" in error_data["error"]
    
    def test_not_found_error_contract(self, pact):
        """Test contract for not found errors."""
        expected_error_response = {
            "error": {
                "code": Like("NOT_FOUND"),
                "message": Like("User not found"),
                "correlation_id": Term(
                    r'[a-f0-9-]{36}',
                    '123e4567-e89b-12d3-a456-426614174000'
                )
            }
        }
        
        (pact
         .given('User does not exist')
         .upon_receiving('a request for non-existent user')
         .with_request('GET', '/api/v1/users/non-existent-id')
         .will_respond_with(404, body=expected_error_response))
        
        with pact:
            import requests
            response = requests.get(
                'http://localhost:1238/api/v1/users/non-existent-id'
            )
            
            assert response.status_code == 404
            error_data = response.json()
            assert error_data["error"]["code"] == "NOT_FOUND"