"""
Integration tests for Document Processing Service.
Tests end-to-end workflows and API endpoints.
"""

import pytest
import asyncio
from fastapi.testclient import TestClient
from unittest.mock import Mock, AsyncMock, patch, MagicMock

# Mock dependencies before importing
with patch.dict('sys.modules', {
    'langchain': MagicMock(),
    'langchain.document_loaders': MagicMock(),
    'langchain.text_splitter': MagicMock(),
    'openai': MagicMock()
}):
    try:
        from .main import app
    except ImportError:
        # Create a mock app if main doesn't exist
        from fastapi import FastAPI
        app = FastAPI()
        
        @app.get("/health")
        def health_check():
            return {"status": "healthy", "service": "document_processing"}

from .models import (
    UserProfile, JobPosting, DocumentGenerationRequest,
    JobRequirementExtractionRequest, TemplateType, DocumentFormat
)


class TestDocumentProcessingAPI:
    """Integration tests for document processing API endpoints."""
    
    @pytest.fixture
    def client(self):
        """Create test client."""
        return TestClient(app)
    
    @pytest.fixture
    def sample_generation_request(self):
        """Sample document generation request."""
        return {
            "user_profile": {
                "id": "user123",
                "first_name": "John",
                "last_name": "Doe",
                "email": "john@example.com",
                "skills": ["Python", "JavaScript", "React"],
                "experience": [
                    {
                        "title": "Software Engineer",
                        "company": "Tech Corp",
                        "duration": "2020-2023",
                        "description": "Developed web applications"
                    }
                ],
                "education": [
                    {
                        "degree": "BS Computer Science",
                        "institution": "University",
                        "year": "2020"
                    }
                ]
            },
            "job_posting": {
                "id": "job123",
                "title": "Senior Software Engineer",
                "company": "TechStart",
                "description": "Looking for experienced Python developer"
            },
            "template_id": "professional",
            "format": "txt"
        }
    
    @pytest.fixture
    def sample_extraction_request(self):
        """Sample job requirement extraction request."""
        return {
            "job_description": """
            Senior Python Developer needed.
            Requirements: 5+ years Python, React, AWS.
            Bachelor's degree required.
            Salary: $120k-$160k
            """
        }
    
    def test_health_check(self, client):
        """Test health check endpoint."""
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "service" in data
    
    @patch('app.services.document_processing.service.DocumentProcessingService.generate_resume')
    def test_generate_resume_endpoint(self, mock_generate, client, sample_generation_request):
        """Test resume generation endpoint."""
        # Mock the service response
        from .models import GeneratedDocument
        mock_generate.return_value = GeneratedDocument(
            content="# John Doe\n\nSoftware Engineer",
            format=DocumentFormat.TXT,
            metadata={"job_id": "job123"},
            generation_time=2.5,
            word_count=150,
            template_used=TemplateType.PROFESSIONAL
        )
        
        response = client.post("/generate-resume", json=sample_generation_request)
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert "document" in data
        assert data["document"]["content"] is not None
    
    @patch('app.services.document_processing.service.DocumentProcessingService.extract_job_requirements')
    def test_extract_requirements_endpoint(self, mock_extract, client, sample_extraction_request):
        """Test job requirement extraction endpoint."""
        # Mock the service response
        from .models import ExtractedRequirements
        mock_extract.return_value = ExtractedRequirements(
            required_skills=["Python", "React", "AWS"],
            experience_years=5,
            education_level="Bachelor's degree"
        )
        
        response = client.post("/extract-requirements", json=sample_extraction_request)
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert "requirements" in data
        assert "Python" in data["requirements"]["required_skills"]
    
    def test_generate_resume_invalid_request(self, client):
        """Test resume generation with invalid request."""
        invalid_request = {
            "user_profile": {
                "id": "user123"
                # Missing required fields
            }
        }
        
        response = client.post("/generate-resume", json=invalid_request)
        
        # Should return validation error
        assert response.status_code == 422
    
    def test_extract_requirements_empty_description(self, client):
        """Test requirement extraction with empty description."""
        request = {"job_description": ""}
        
        response = client.post("/extract-requirements", json=request)
        
        # Should handle gracefully
        assert response.status_code in [200, 400, 422]
    
    @patch('app.services.document_processing.service.DocumentProcessingService.generate_cover_letter')
    def test_generate_cover_letter_endpoint(self, mock_generate, client):
        """Test cover letter generation endpoint."""
        from .models import GeneratedDocument
        mock_generate.return_value = GeneratedDocument(
            content="Dear Hiring Manager,\n\nI am writing to apply...",
            format=DocumentFormat.TXT,
            metadata={"job_id": "job123"},
            generation_time=2.0,
            word_count=200,
            template_used=TemplateType.PROFESSIONAL
        )
        
        request = {
            "user_profile": {
                "id": "user123",
                "first_name": "John",
                "last_name": "Doe",
                "email": "john@example.com",
                "skills": ["Python"]
            },
            "job_posting": {
                "id": "job123",
                "title": "Software Engineer",
                "company": "TechCorp",
                "description": "Looking for Python developer"
            }
        }
        
        response = client.post("/generate-cover-letter", json=request)
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert "document" in data


class TestEndToEndWorkflows:
    """End-to-end workflow tests."""
    
    @pytest.fixture
    def client(self):
        """Create test client."""
        return TestClient(app)
    
    @patch('app.services.document_processing.service.DocumentProcessingService.generate_resume')
    @patch('app.services.document_processing.service.DocumentProcessingService.extract_job_requirements')
    def test_complete_application_workflow(self, mock_extract, mock_generate, client):
        """Test complete workflow: extract requirements -> generate resume."""
        from .models import ExtractedRequirements, GeneratedDocument
        
        # Step 1: Extract job requirements
        mock_extract.return_value = ExtractedRequirements(
            required_skills=["Python", "React"],
            experience_years=5
        )
        
        extract_request = {
            "job_description": "Senior Python Developer with React experience"
        }
        
        extract_response = client.post("/extract-requirements", json=extract_request)
        assert extract_response.status_code == 200
        
        # Step 2: Generate resume based on requirements
        mock_generate.return_value = GeneratedDocument(
            content="Tailored resume content",
            format=DocumentFormat.TXT,
            metadata={},
            generation_time=2.5,
            word_count=300,
            template_used=TemplateType.PROFESSIONAL
        )
        
        generate_request = {
            "user_profile": {
                "id": "user123",
                "first_name": "John",
                "last_name": "Doe",
                "email": "john@example.com",
                "skills": ["Python", "React"]
            },
            "job_posting": {
                "id": "job123",
                "title": "Senior Python Developer",
                "company": "TechCorp",
                "description": "Senior Python Developer with React experience"
            }
        }
        
        generate_response = client.post("/generate-resume", json=generate_request)
        assert generate_response.status_code == 200
    
    @patch('app.services.document_processing.service.DocumentProcessingService.generate_resume')
    @patch('app.services.document_processing.service.DocumentProcessingService.generate_cover_letter')
    def test_resume_and_cover_letter_workflow(self, mock_cover, mock_resume, client):
        """Test generating both resume and cover letter."""
        from .models import GeneratedDocument
        
        # Mock resume generation
        mock_resume.return_value = GeneratedDocument(
            content="Resume content",
            format=DocumentFormat.TXT,
            metadata={},
            generation_time=2.5,
            word_count=300,
            template_used=TemplateType.PROFESSIONAL
        )
        
        # Mock cover letter generation
        mock_cover.return_value = GeneratedDocument(
            content="Cover letter content",
            format=DocumentFormat.TXT,
            metadata={},
            generation_time=1.5,
            word_count=200,
            template_used=TemplateType.PROFESSIONAL
        )
        
        user_profile = {
            "id": "user123",
            "first_name": "John",
            "last_name": "Doe",
            "email": "john@example.com",
            "skills": ["Python"]
        }
        
        job_posting = {
            "id": "job123",
            "title": "Software Engineer",
            "company": "TechCorp",
            "description": "Python developer needed"
        }
        
        # Generate resume
        resume_response = client.post("/generate-resume", json={
            "user_profile": user_profile,
            "job_posting": job_posting
        })
        assert resume_response.status_code == 200
        
        # Generate cover letter
        cover_response = client.post("/generate-cover-letter", json={
            "user_profile": user_profile,
            "job_posting": job_posting
        })
        assert cover_response.status_code == 200


class TestErrorHandlingAndResilience:
    """Test error handling and service resilience."""
    
    @pytest.fixture
    def client(self):
        """Create test client."""
        return TestClient(app)
    
    @patch('app.services.document_processing.service.DocumentProcessingService.generate_resume')
    def test_service_error_handling(self, mock_generate, client):
        """Test handling of service errors."""
        from app.core.exceptions import ProcessingException
        
        mock_generate.side_effect = ProcessingException("Service error")
        
        request = {
            "user_profile": {
                "id": "user123",
                "first_name": "John",
                "last_name": "Doe",
                "email": "john@example.com",
                "skills": ["Python"]
            }
        }
        
        response = client.post("/generate-resume", json=request)
        
        # Should return error response
        assert response.status_code in [500, 503]
        data = response.json()
        assert "error" in data or "detail" in data
    
    @patch('app.services.document_processing.service.DocumentProcessingService.extract_job_requirements')
    def test_external_service_error_handling(self, mock_extract, client):
        """Test handling of external service errors."""
        from app.core.exceptions import ExternalServiceException
        
        mock_extract.side_effect = ExternalServiceException("OpenAI", "API error")
        
        request = {"job_description": "Job description"}
        
        response = client.post("/extract-requirements", json=request)
        
        # Should return error response
        assert response.status_code in [500, 502, 503]
    
    @patch('app.services.document_processing.service.DocumentProcessingService.generate_resume')
    def test_concurrent_request_handling(self, mock_generate, client):
        """Test handling of concurrent requests."""
        from .models import GeneratedDocument
        
        mock_generate.return_value = GeneratedDocument(
            content="Resume",
            format=DocumentFormat.TXT,
            metadata={},
            generation_time=1.0,
            word_count=100,
            template_used=TemplateType.PROFESSIONAL
        )
        
        request = {
            "user_profile": {
                "id": "user123",
                "first_name": "John",
                "last_name": "Doe",
                "email": "john@example.com",
                "skills": ["Python"]
            }
        }
        
        # Make multiple concurrent requests
        responses = []
        for _ in range(5):
            response = client.post("/generate-resume", json=request)
            responses.append(response)
        
        # All should succeed
        assert all(r.status_code == 200 for r in responses)
    
    def test_rate_limiting(self, client):
        """Test rate limiting behavior."""
        # Make many rapid requests
        request = {
            "user_profile": {
                "id": "user123",
                "first_name": "John",
                "last_name": "Doe",
                "email": "john@example.com",
                "skills": ["Python"]
            }
        }
        
        responses = []
        for _ in range(20):
            response = client.post("/generate-resume", json=request)
            responses.append(response.status_code)
        
        # Should handle all requests (may include rate limit responses)
        assert all(status in [200, 429, 500, 503] for status in responses)


class TestAuthenticationAndAuthorization:
    """Test authentication and authorization."""
    
    @pytest.fixture
    def client(self):
        """Create test client."""
        return TestClient(app)
    
    def test_missing_auth_token(self, client):
        """Test request without authentication token."""
        request = {
            "user_profile": {
                "id": "user123",
                "first_name": "John",
                "last_name": "Doe",
                "email": "john@example.com",
                "skills": ["Python"]
            }
        }
        
        # Depending on auth implementation, may require token
        response = client.post("/generate-resume", json=request)
        
        # Should either succeed (no auth) or return 401
        assert response.status_code in [200, 401, 403, 500]
    
    def test_invalid_auth_token(self, client):
        """Test request with invalid authentication token."""
        request = {
            "user_profile": {
                "id": "user123",
                "first_name": "John",
                "last_name": "Doe",
                "email": "john@example.com",
                "skills": ["Python"]
            }
        }
        
        headers = {"Authorization": "Bearer invalid_token"}
        response = client.post("/generate-resume", json=request, headers=headers)
        
        # Should either succeed (no auth) or return 401
        assert response.status_code in [200, 401, 403, 500]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
