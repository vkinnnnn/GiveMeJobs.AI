"""
Comprehensive tests for Document Processing Service.
Tests cover document generation, requirement extraction, error handling, and service resilience.
"""

import pytest
import json
import asyncio
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from datetime import datetime

# Mock langchain imports before importing the service
with patch.dict('sys.modules', {
    'langchain': MagicMock(),
    'langchain.document_loaders': MagicMock(),
    'langchain.text_splitter': MagicMock(),
    'openai': MagicMock()
}):
    from .service import DocumentProcessingService

from .models import (
    UserProfile, JobPosting, ExtractedRequirements, GeneratedDocument,
    DocumentFormat, TemplateType, ProcessedDocument
)
from app.core.exceptions import ProcessingException, ExternalServiceException


class TestDocumentProcessingService:
    """Test suite for DocumentProcessingService."""
    
    @pytest.fixture
    def service(self):
        """Create service instance for testing."""
        with patch('app.services.document_processing.service.get_settings') as mock_settings, \
             patch('app.services.document_processing.service.AsyncOpenAI') as mock_openai, \
             patch('app.services.document_processing.service.RecursiveCharacterTextSplitter') as mock_splitter:
            
            mock_settings.return_value = Mock(
                openai_api_key="test-key",
                openai_model="gpt-4",
                openai_temperature=0.7,
                openai_max_tokens=2000
            )
            
            # Mock OpenAI client
            mock_client = AsyncMock()
            mock_openai.return_value = mock_client
            
            # Mock text splitter
            mock_splitter.return_value = Mock()
            
            service = DocumentProcessingService()
            service.openai_client = mock_client
            return service
    
    @pytest.fixture
    def sample_user_profile(self):
        """Sample user profile for testing."""
        return UserProfile(
            id="user123",
            first_name="John",
            last_name="Doe",
            email="john.doe@example.com",
            phone="+1234567890",
            location="San Francisco, CA",
            skills=["Python", "JavaScript", "React", "SQL", "AWS"],
            experience=[
                {
                    "title": "Senior Software Engineer",
                    "company": "Tech Corp",
                    "duration": "2020-2023",
                    "description": "Led development of microservices architecture"
                },
                {
                    "title": "Software Engineer",
                    "company": "StartupXYZ",
                    "duration": "2018-2020",
                    "description": "Developed full-stack web applications"
                }
            ],
            education=[
                {
                    "degree": "Bachelor of Science in Computer Science",
                    "institution": "University of California",
                    "year": "2018"
                }
            ],
            career_goals="Seeking senior engineering roles in AI/ML",
            summary="Experienced software engineer with 5+ years in full-stack development"
        )
    
    @pytest.fixture
    def sample_job_posting(self):
        """Sample job posting for testing."""
        return JobPosting(
            id="job123",
            title="Senior Software Engineer",
            company="TechStart Inc",
            description="""
            We are looking for a Senior Software Engineer with strong Python and React experience.
            
            Requirements:
            - 5+ years of software development experience
            - Strong proficiency in Python and JavaScript
            - Experience with React and modern web frameworks
            - Knowledge of cloud platforms (AWS, Azure, or GCP)
            - Bachelor's degree in Computer Science or related field
            
            Responsibilities:
            - Design and implement scalable microservices
            - Lead technical discussions and code reviews
            - Mentor junior developers
            - Collaborate with product team on feature development
            """,
            location="San Francisco, CA",
            salary_min=120000,
            salary_max=160000,
            employment_type="full-time",
            experience_level="senior",
            industry="Technology"
        )
    
    @pytest.mark.asyncio
    async def test_generate_resume_success(self, service, sample_user_profile, sample_job_posting):
        """Test successful resume generation with mocked OpenAI response."""
        # Mock OpenAI response
        mock_response = Mock()
        mock_response.choices = [Mock(message=Mock(content="# John Doe\n\nExperienced software engineer..."))]
        mock_response.usage = Mock(total_tokens=500)
        
        service.openai_client.chat.completions.create = AsyncMock(return_value=mock_response)
        
        # Generate resume
        result = await service.generate_resume(
            user_profile=sample_user_profile,
            job_posting=sample_job_posting,
            template_id=TemplateType.PROFESSIONAL
        )
        
        # Assertions
        assert result is not None
        assert hasattr(result, 'content')
        assert result.content is not None
        assert len(result.content) > 0
        assert result.format == DocumentFormat.TXT
        assert result.template_used == TemplateType.PROFESSIONAL
        assert result.generation_time > 0
        assert result.word_count > 0
        assert result.metadata["job_id"] == "job123"
        assert result.metadata["tokens_used"] == 500
    
    @pytest.mark.asyncio
    async def test_generate_resume_without_job_posting(self, service, sample_user_profile):
        """Test resume generation without job posting context."""
        mock_response = Mock()
        mock_response.choices = [Mock(message=Mock(content="# John Doe\n\nSoftware Engineer"))]
        mock_response.usage = Mock(total_tokens=300)
        
        service.openai_client.chat.completions.create = AsyncMock(return_value=mock_response)
        
        result = await service.generate_resume(
            user_profile=sample_user_profile,
            template_id=TemplateType.MODERN
        )
        
        assert result is not None
        assert hasattr(result, 'content')
        assert result.metadata["job_id"] is None
        assert result.template_used == TemplateType.MODERN
    
    @pytest.mark.asyncio
    async def test_generate_resume_with_custom_instructions(self, service, sample_user_profile):
        """Test resume generation with custom instructions."""
        mock_response = Mock()
        mock_response.choices = [Mock(message=Mock(content="Custom resume content"))]
        mock_response.usage = Mock(total_tokens=400)
        
        service.openai_client.chat.completions.create = AsyncMock(return_value=mock_response)
        
        custom_instructions = "Focus on leadership experience and technical architecture"
        
        result = await service.generate_resume(
            user_profile=sample_user_profile,
            custom_instructions=custom_instructions
        )
        
        assert result.metadata["custom_instructions"] is True
    
    @pytest.mark.asyncio
    async def test_generate_resume_openai_failure(self, service, sample_user_profile):
        """Test resume generation when OpenAI API fails."""
        service.openai_client.chat.completions.create = AsyncMock(
            side_effect=Exception("OpenAI API error")
        )
        
        with pytest.raises(ProcessingException) as exc_info:
            await service.generate_resume(user_profile=sample_user_profile)
        
        assert "Resume generation failed" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_extract_job_requirements_success(self, service):
        """Test successful job requirement extraction with mocked OpenAI response."""
        job_description = """
        Senior Python Developer needed. 
        Requirements: 5+ years Python, React, AWS experience.
        Bachelor's degree required.
        """
        
        mock_requirements = {
            "required_skills": ["Python", "React", "AWS"],
            "preferred_skills": ["Docker", "Kubernetes"],
            "experience_years": 5,
            "education_level": "Bachelor's degree",
            "certifications": [],
            "responsibilities": ["Develop backend services", "Code reviews"],
            "qualifications": ["5+ years experience"],
            "company_culture": ["Collaborative", "Fast-paced"],
            "benefits": ["Health insurance", "401k"],
            "employment_type": "Full-time",
            "location_requirements": "Remote",
            "salary_range": {"min": 100000, "max": 150000}
        }
        
        mock_response = Mock()
        mock_response.choices = [Mock(message=Mock(content=json.dumps(mock_requirements)))]
        
        service.openai_client.chat.completions.create = AsyncMock(return_value=mock_response)
        
        result = await service.extract_job_requirements(job_description)
        
        assert isinstance(result, ExtractedRequirements)
        assert "Python" in result.required_skills
        assert "React" in result.required_skills
        assert result.experience_years == 5
        assert result.education_level == "Bachelor's degree"
    
    @pytest.mark.asyncio
    async def test_extract_job_requirements_invalid_json(self, service):
        """Test job requirement extraction with invalid JSON response."""
        mock_response = Mock()
        mock_response.choices = [Mock(message=Mock(content="Invalid JSON {not valid}"))]
        
        service.openai_client.chat.completions.create = AsyncMock(return_value=mock_response)
        
        # Should return empty requirements instead of failing
        result = await service.extract_job_requirements("Some job description")
        
        assert isinstance(result, ExtractedRequirements)
        assert len(result.required_skills) == 0
    
    @pytest.mark.asyncio
    async def test_extract_job_requirements_api_failure(self, service):
        """Test job requirement extraction when OpenAI API fails."""
        service.openai_client.chat.completions.create = AsyncMock(
            side_effect=Exception("API connection error")
        )
        
        with pytest.raises(ExternalServiceException):
            await service.extract_job_requirements("Job description")
    
    def test_build_resume_prompt(self, service, sample_user_profile, sample_job_posting):
        """Test resume prompt building."""
        job_requirements = ExtractedRequirements(
            required_skills=["Python", "React"],
            experience_years=5
        )
        
        prompt = service._build_resume_prompt(
            sample_user_profile,
            job_requirements,
            TemplateType.PROFESSIONAL,
            None
        )
        
        assert "John" in prompt
        assert "Doe" in prompt
        assert "Python" in prompt
        assert "React" in prompt
        assert "5 years" in prompt or "5" in prompt
        assert "professional" in prompt.lower()
    
    def test_build_resume_prompt_without_job_requirements(self, service, sample_user_profile):
        """Test resume prompt building without job requirements."""
        prompt = service._build_resume_prompt(
            sample_user_profile,
            None,
            TemplateType.MODERN,
            None
        )
        
        assert "John Doe" in prompt
        assert "Python" in prompt
        assert "modern" in prompt.lower()
    
    def test_get_template_instructions(self, service):
        """Test template instruction retrieval."""
        modern_instructions = service._get_template_instructions(TemplateType.MODERN)
        assert "modern" in modern_instructions.lower()
        
        classic_instructions = service._get_template_instructions(TemplateType.CLASSIC)
        assert "traditional" in classic_instructions.lower() or "classic" in classic_instructions.lower()
        
        professional_instructions = service._get_template_instructions(TemplateType.PROFESSIONAL)
        assert "professional" in professional_instructions.lower()
    
    def test_apply_template_formatting(self, service):
        """Test template formatting application."""
        content = "Resume content here"
        
        formatted = service._apply_template_formatting(content, TemplateType.MODERN)
        
        assert content in formatted
        assert "modern" in formatted.lower()
    
    @pytest.mark.asyncio
    async def test_generate_cover_letter_success(self, service, sample_user_profile, sample_job_posting):
        """Test successful cover letter generation."""
        mock_response = Mock()
        mock_response.choices = [Mock(message=Mock(content="Dear Hiring Manager,\n\nI am writing to apply..."))]
        mock_response.usage = Mock(total_tokens=350)
        
        service.openai_client.chat.completions.create = AsyncMock(return_value=mock_response)
        
        result = await service.generate_cover_letter(
            user_profile=sample_user_profile,
            job_posting=sample_job_posting
        )
        
        assert isinstance(result, GeneratedDocument)
        assert result.content is not None
        assert len(result.content) > 0
        assert result.metadata["job_id"] == "job123"
        assert result.metadata["company"] == "TechStart Inc"
        assert result.metadata["position"] == "Senior Software Engineer"
    
    @pytest.mark.asyncio
    async def test_generate_cover_letter_with_custom_instructions(self, service, sample_user_profile, sample_job_posting):
        """Test cover letter generation with custom instructions."""
        mock_response = Mock()
        mock_response.choices = [Mock(message=Mock(content="Custom cover letter"))]
        mock_response.usage = Mock(total_tokens=300)
        
        service.openai_client.chat.completions.create = AsyncMock(return_value=mock_response)
        
        result = await service.generate_cover_letter(
            user_profile=sample_user_profile,
            job_posting=sample_job_posting,
            custom_instructions="Emphasize remote work experience"
        )
        
        assert isinstance(result, GeneratedDocument)
    
    @pytest.mark.asyncio
    async def test_generate_cover_letter_failure(self, service, sample_user_profile, sample_job_posting):
        """Test cover letter generation failure."""
        service.openai_client.chat.completions.create = AsyncMock(
            side_effect=Exception("API error")
        )
        
        with pytest.raises(ProcessingException) as exc_info:
            await service.generate_cover_letter(
                user_profile=sample_user_profile,
                job_posting=sample_job_posting
            )
        
        assert "Cover letter generation failed" in str(exc_info.value)


class TestDocumentProcessing:
    """Test document processing functionality."""
    
    @pytest.fixture
    def service(self):
        """Create service instance for testing."""
        with patch('app.services.document_processing.service.get_settings') as mock_settings, \
             patch('app.services.document_processing.service.AsyncOpenAI') as mock_openai, \
             patch('app.services.document_processing.service.RecursiveCharacterTextSplitter') as mock_splitter:
            
            mock_settings.return_value = Mock(
                openai_api_key="test-key",
                openai_model="gpt-4",
                openai_temperature=0.7,
                openai_max_tokens=2000
            )
            
            mock_client = AsyncMock()
            mock_openai.return_value = mock_client
            mock_splitter.return_value = Mock()
            
            service = DocumentProcessingService()
            service.openai_client = mock_client
            return service
    
    @pytest.mark.asyncio
    async def test_process_txt_document(self, service):
        """Test processing TXT document."""
        file_content = b"This is a test document with some content."
        file_name = "test.txt"
        
        with patch('builtins.open', create=True) as mock_open:
            mock_open.return_value.__enter__.return_value.read.return_value = file_content.decode()
            
            with patch('os.remove'):
                result = await service.process_document(
                    file_content=file_content,
                    file_name=file_name,
                    format=DocumentFormat.TXT
                )
        
        assert isinstance(result, ProcessedDocument)
        assert result.file_name == file_name
        assert result.format == DocumentFormat.TXT
        assert result.processing_time > 0
    
    @pytest.mark.asyncio
    async def test_process_pdf_document(self, service):
        """Test processing PDF document."""
        file_content = b"%PDF-1.4 fake pdf content"
        file_name = "test.pdf"
        
        # Mock PDF loader
        mock_doc = Mock()
        mock_doc.page_content = "Extracted PDF content"
        
        with patch('app.services.document_processing.service.PyPDFLoader') as mock_loader:
            mock_loader.return_value.load.return_value = [mock_doc, mock_doc]
            
            with patch('builtins.open', create=True):
                with patch('os.remove'):
                    result = await service.process_document(
                        file_content=file_content,
                        file_name=file_name,
                        format=DocumentFormat.PDF
                    )
        
        assert isinstance(result, ProcessedDocument)
        assert result.format == DocumentFormat.PDF
        assert "pages" in result.metadata
        assert result.metadata["pages"] == 2
    
    @pytest.mark.asyncio
    async def test_process_docx_document(self, service):
        """Test processing DOCX document."""
        file_content = b"PK fake docx content"
        file_name = "test.docx"
        
        # Mock DOCX loader
        mock_doc = Mock()
        mock_doc.page_content = "Extracted DOCX content"
        
        with patch('app.services.document_processing.service.UnstructuredWordDocumentLoader') as mock_loader:
            mock_loader.return_value.load.return_value = [mock_doc]
            
            with patch('builtins.open', create=True):
                with patch('os.remove'):
                    result = await service.process_document(
                        file_content=file_content,
                        file_name=file_name,
                        format=DocumentFormat.DOCX
                    )
        
        assert isinstance(result, ProcessedDocument)
        assert result.format == DocumentFormat.DOCX
    
    @pytest.mark.asyncio
    async def test_process_document_failure(self, service):
        """Test document processing failure."""
        with patch('builtins.open', side_effect=Exception("File error")):
            with pytest.raises(ProcessingException) as exc_info:
                await service.process_document(
                    file_content=b"content",
                    file_name="test.txt",
                    format=DocumentFormat.TXT
                )
        
        assert "Document processing failed" in str(exc_info.value)


class TestServiceResilience:
    """Test service resilience and error handling."""
    
    @pytest.fixture
    def service(self):
        """Create service instance for testing."""
        with patch('app.services.document_processing.service.get_settings') as mock_settings, \
             patch('app.services.document_processing.service.AsyncOpenAI') as mock_openai, \
             patch('app.services.document_processing.service.RecursiveCharacterTextSplitter') as mock_splitter:
            
            mock_settings.return_value = Mock(
                openai_api_key="test-key",
                openai_model="gpt-4",
                openai_temperature=0.7,
                openai_max_tokens=2000
            )
            
            mock_client = AsyncMock()
            mock_openai.return_value = mock_client
            mock_splitter.return_value = Mock()
            
            service = DocumentProcessingService()
            service.openai_client = mock_client
            return service
    
    @pytest.fixture
    def sample_user_profile(self):
        """Minimal user profile for testing."""
        return UserProfile(
            id="user123",
            first_name="Test",
            last_name="User",
            email="test@example.com",
            skills=["Python"]
        )
    
    @pytest.mark.asyncio
    async def test_concurrent_resume_generation(self, service, sample_user_profile):
        """Test concurrent resume generation requests."""
        mock_response = Mock()
        mock_response.choices = [Mock(message=Mock(content="Resume content"))]
        mock_response.usage = Mock(total_tokens=300)
        
        service.openai_client.chat.completions.create = AsyncMock(return_value=mock_response)
        
        # Generate multiple resumes concurrently
        tasks = [
            service.generate_resume(user_profile=sample_user_profile)
            for _ in range(5)
        ]
        
        results = await asyncio.gather(*tasks)
        
        assert len(results) == 5
        assert all(isinstance(r, GeneratedDocument) for r in results)
    
    @pytest.mark.asyncio
    async def test_timeout_handling(self, service, sample_user_profile):
        """Test handling of timeout errors."""
        async def slow_response(*args, **kwargs):
            await asyncio.sleep(10)
            return Mock()
        
        service.openai_client.chat.completions.create = slow_response
        
        with pytest.raises(ProcessingException):
            # This should timeout or fail
            await asyncio.wait_for(
                service.generate_resume(user_profile=sample_user_profile),
                timeout=1.0
            )
    
    @pytest.mark.asyncio
    async def test_retry_on_transient_failure(self, service, sample_user_profile):
        """Test retry behavior on transient failures."""
        call_count = 0
        
        async def failing_then_success(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count < 2:
                raise Exception("Transient error")
            
            mock_response = Mock()
            mock_response.choices = [Mock(message=Mock(content="Success"))]
            mock_response.usage = Mock(total_tokens=300)
            return mock_response
        
        service.openai_client.chat.completions.create = failing_then_success
        
        # First call should fail
        with pytest.raises(ProcessingException):
            await service.generate_resume(user_profile=sample_user_profile)
        
        # Second call should succeed
        result = await service.generate_resume(user_profile=sample_user_profile)
        assert isinstance(result, GeneratedDocument)
    
    @pytest.mark.asyncio
    async def test_empty_user_profile_handling(self, service):
        """Test handling of minimal/empty user profile."""
        minimal_profile = UserProfile(
            id="user123",
            first_name="",
            last_name="",
            email="test@example.com"
        )
        
        mock_response = Mock()
        mock_response.choices = [Mock(message=Mock(content="Minimal resume"))]
        mock_response.usage = Mock(total_tokens=200)
        
        service.openai_client.chat.completions.create = AsyncMock(return_value=mock_response)
        
        result = await service.generate_resume(user_profile=minimal_profile)
        
        assert isinstance(result, GeneratedDocument)
    
    @pytest.mark.asyncio
    async def test_large_document_generation(self, service, sample_user_profile):
        """Test generation of large documents."""
        # Simulate large response
        large_content = "Resume content. " * 1000  # ~15000 characters
        
        mock_response = Mock()
        mock_response.choices = [Mock(message=Mock(content=large_content))]
        mock_response.usage = Mock(total_tokens=3000)
        
        service.openai_client.chat.completions.create = AsyncMock(return_value=mock_response)
        
        result = await service.generate_resume(user_profile=sample_user_profile)
        
        assert isinstance(result, GeneratedDocument)
        assert len(result.content) > 10000
        assert result.word_count > 1000


class TestPerformanceRequirements:
    """Test performance requirements."""
    
    @pytest.fixture
    def service(self):
        """Create service instance for testing."""
        with patch('app.services.document_processing.service.get_settings') as mock_settings, \
             patch('app.services.document_processing.service.AsyncOpenAI') as mock_openai, \
             patch('app.services.document_processing.service.RecursiveCharacterTextSplitter') as mock_splitter:
            
            mock_settings.return_value = Mock(
                openai_api_key="test-key",
                openai_model="gpt-4",
                openai_temperature=0.7,
                openai_max_tokens=2000
            )
            
            mock_client = AsyncMock()
            mock_openai.return_value = mock_client
            mock_splitter.return_value = Mock()
            
            service = DocumentProcessingService()
            service.openai_client = mock_client
            return service
    
    @pytest.fixture
    def sample_user_profile(self):
        """Sample user profile for testing."""
        return UserProfile(
            id="user123",
            first_name="John",
            last_name="Doe",
            email="john@example.com",
            skills=["Python", "JavaScript"]
        )
    
    @pytest.mark.asyncio
    async def test_resume_generation_performance(self, service, sample_user_profile):
        """Test that resume generation meets performance requirements (<10s)."""
        mock_response = Mock()
        mock_response.choices = [Mock(message=Mock(content="Resume content"))]
        mock_response.usage = Mock(total_tokens=500)
        
        service.openai_client.chat.completions.create = AsyncMock(return_value=mock_response)
        
        result = await service.generate_resume(user_profile=sample_user_profile)
        
        # Should complete within 10 seconds (requirement from design doc)
        assert result.generation_time < 10.0
    
    @pytest.mark.asyncio
    async def test_requirement_extraction_performance(self, service):
        """Test that requirement extraction is fast."""
        mock_requirements = {
            "required_skills": ["Python"],
            "preferred_skills": [],
            "experience_years": 3
        }
        
        mock_response = Mock()
        mock_response.choices = [Mock(message=Mock(content=json.dumps(mock_requirements)))]
        
        service.openai_client.chat.completions.create = AsyncMock(return_value=mock_response)
        
        import time
        start = time.time()
        await service.extract_job_requirements("Job description")
        duration = time.time() - start
        
        # Should be fast with mocked response
        assert duration < 1.0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
