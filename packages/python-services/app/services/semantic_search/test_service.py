"""Tests for semantic search service."""

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch
from typing import List, Dict, Any

from .service import SemanticSearchService
from .models import (
    UserProfile, JobPosting, SemanticSearchRequest, SearchType,
    SearchFilters, EmbeddingRequest, BatchEmbeddingRequest
)
from .utils import TextProcessor, VectorUtils, JobMatchingUtils


class TestSemanticSearchService:
    """Test cases for SemanticSearchService."""
    
    @pytest.fixture
    def service(self):
        """Create a service instance for testing."""
        return SemanticSearchService()
        
    @pytest.fixture
    def sample_user_profile(self):
        """Sample user profile for testing."""
        return UserProfile(
            id="user123",
            skills=["Python", "JavaScript", "React", "SQL"],
            experience=[
                {
                    "title": "Software Engineer",
                    "company": "Tech Corp",
                    "description": "Developed web applications using React and Python"
                }
            ],
            education=[
                {
                    "degree": "Bachelor's",
                    "field": "Computer Science",
                    "institution": "University"
                }
            ],
            career_goals="Looking for senior software engineer roles",
            preferred_locations=["San Francisco", "New York"],
            salary_expectation_min=100000,
            salary_expectation_max=150000,
            years_experience=5,
            industry_preferences=["Technology", "Fintech"]
        )
        
    @pytest.fixture
    def sample_job_posting(self):
        """Sample job posting for testing."""
        return JobPosting(
            id="job123",
            title="Senior Software Engineer",
            company="TechStart Inc",
            description="We are looking for a senior software engineer with experience in Python and React",
            location="San Francisco, CA",
            salary_min=120000,
            salary_max=160000,
            employment_type="full-time",
            experience_level="senior",
            industry="Technology",
            remote_type="hybrid",
            required_skills=["Python", "React", "SQL"],
            preferred_skills=["AWS", "Docker"]
        )
        
    @pytest.fixture
    def sample_search_request(self, sample_user_profile):
        """Sample search request for testing."""
        return SemanticSearchRequest(
            user_profile=sample_user_profile,
            search_type=SearchType.HYBRID,
            top_k=10,
            include_explanation=True,
            match_threshold=0.7
        )
        
    def test_create_profile_text(self, service, sample_user_profile):
        """Test profile text creation."""
        profile_text = service._create_profile_text(sample_user_profile)
        
        assert "Python" in profile_text
        assert "JavaScript" in profile_text
        assert "Software Engineer" in profile_text
        assert "Computer Science" in profile_text
        assert "senior software engineer roles" in profile_text
        
    def test_calculate_traditional_match(self, service, sample_user_profile, sample_job_posting):
        """Test traditional matching score calculation."""
        score = service._calculate_traditional_match(sample_user_profile, sample_job_posting)
        
        assert 0.0 <= score <= 1.0
        assert score > 0.5  # Should be a good match
        
    def test_find_matching_skills(self, service, sample_user_profile, sample_job_posting):
        """Test skill matching."""
        matching_skills = service._find_matching_skills(sample_user_profile, sample_job_posting)
        
        expected_matches = {"python", "react", "sql"}
        actual_matches = set(skill.lower() for skill in matching_skills)
        
        assert expected_matches.issubset(actual_matches)
        
    def test_find_skill_gaps(self, service, sample_user_profile, sample_job_posting):
        """Test skill gap identification."""
        skill_gaps = service._find_skill_gaps(sample_user_profile, sample_job_posting)
        
        # Should be empty since user has all required skills
        assert len(skill_gaps) == 0
        
    def test_check_salary_match(self, service, sample_user_profile, sample_job_posting):
        """Test salary matching."""
        salary_match = service._check_salary_match(sample_user_profile, sample_job_posting)
        
        assert salary_match is True  # Job max (160k) >= user min (100k)
        
    def test_check_location_match(self, service, sample_user_profile, sample_job_posting):
        """Test location matching."""
        location_match = service._check_location_match(sample_user_profile, sample_job_posting)
        
        assert location_match is True  # San Francisco is in user preferences
        
    def test_generate_match_explanation(self, service, sample_user_profile, sample_job_posting):
        """Test match explanation generation."""
        explanation = service._generate_match_explanation(
            sample_user_profile, sample_job_posting, 0.85, 0.75
        )
        
        assert "semantic_score" in explanation
        assert "traditional_score" in explanation
        assert "matching_factors" in explanation
        assert explanation["semantic_score"] == 0.85
        assert explanation["traditional_score"] == 0.75
        
    def test_extract_keywords(self, service, sample_user_profile):
        """Test keyword extraction."""
        keywords = service._extract_keywords(sample_user_profile)
        
        assert len(keywords) > 0
        assert any("python" in keyword.lower() for keyword in keywords)
        
    def test_calculate_keyword_similarity(self, service):
        """Test keyword similarity calculation."""
        keywords1 = ["python", "javascript", "react"]
        keywords2 = ["python", "react", "node"]
        
        similarity = service._calculate_keyword_similarity(keywords1, keywords2)
        
        assert 0.0 <= similarity <= 1.0
        assert similarity > 0.0  # Should have some similarity
        
    @pytest.mark.asyncio
    async def test_generate_embedding_request(self, service):
        """Test embedding generation request."""
        request = EmbeddingRequest(
            text="Python developer with React experience",
            embedding_type="profile"
        )
        
        # Mock the embeddings service
        with patch.object(service, 'embeddings') as mock_embeddings:
            mock_embeddings.aembed_query = AsyncMock(return_value=[0.1, 0.2, 0.3])
            service._initialized = True
            
            response = await service.generate_embedding(request)
            
            assert response.embedding == [0.1, 0.2, 0.3]
            assert response.dimension == 3
            assert response.model_used == "text-embedding-ada-002"
            
    @pytest.mark.asyncio
    async def test_batch_generate_embeddings(self, service):
        """Test batch embedding generation."""
        request = BatchEmbeddingRequest(
            texts=["Python developer", "JavaScript engineer", "React specialist"],
            embedding_type="job",
            batch_size=2
        )
        
        # Mock the embeddings service
        with patch.object(service, 'embeddings') as mock_embeddings:
            mock_embeddings.aembed_documents = AsyncMock(
                side_effect=[
                    [[0.1, 0.2], [0.3, 0.4]],  # First batch
                    [[0.5, 0.6]]  # Second batch
                ]
            )
            service._initialized = True
            
            response = await service.batch_generate_embeddings(request)
            
            assert response.successful_count == 3
            assert response.failed_count == 0
            assert len(response.embeddings) == 3
            
    def test_apply_filters(self, service, sample_job_posting):
        """Test filter application."""
        from .models import JobMatch
        
        job_match = JobMatch(
            job=sample_job_posting,
            semantic_score=0.8,
            traditional_score=0.7,
            composite_score=0.75
        )
        
        # Test location filter
        filters = SearchFilters(locations=["San Francisco"])
        filtered_matches = service._apply_filters([job_match], filters)
        assert len(filtered_matches) == 1
        
        # Test location filter that doesn't match
        filters = SearchFilters(locations=["Seattle"])
        filtered_matches = service._apply_filters([job_match], filters)
        assert len(filtered_matches) == 0
        
        # Test salary filter
        filters = SearchFilters(salary_min=100000)
        filtered_matches = service._apply_filters([job_match], filters)
        assert len(filtered_matches) == 1
        
        # Test salary filter that doesn't match
        filters = SearchFilters(salary_min=200000)
        filtered_matches = service._apply_filters([job_match], filters)
        assert len(filtered_matches) == 0
        
    def test_combine_search_results(self, service, sample_job_posting):
        """Test combining search results from different methods."""
        from .models import JobMatch
        
        # Create duplicate job matches with different scores
        semantic_match = JobMatch(
            job=sample_job_posting,
            semantic_score=0.9,
            traditional_score=0.6,
            composite_score=0.78
        )
        
        keyword_match = JobMatch(
            job=sample_job_posting,
            semantic_score=0.7,
            traditional_score=0.8,
            composite_score=0.74
        )
        
        combined = service._combine_search_results([semantic_match], [keyword_match])
        
        assert len(combined) == 1  # Should deduplicate
        assert combined[0].semantic_score == 0.8  # Average of 0.9 and 0.7
        assert combined[0].traditional_score == 0.7  # Average of 0.6 and 0.8
        
    def test_generate_cache_key(self, service, sample_search_request):
        """Test cache key generation."""
        cache_key = service._generate_cache_key(sample_search_request)
        
        assert cache_key.startswith("search:user123")
        assert "hybrid" in cache_key
        assert "10" in cache_key  # top_k
        
        # Same request should generate same key
        cache_key2 = service._generate_cache_key(sample_search_request)
        assert cache_key == cache_key2


class TestTextProcessor:
    """Test cases for TextProcessor utility."""
    
    @pytest.fixture
    def processor(self):
        """Create a TextProcessor instance."""
        return TextProcessor()
        
    def test_clean_text(self, processor):
        """Test text cleaning."""
        dirty_text = "  Hello <b>World</b>! Visit https://example.com or email test@example.com  "
        clean_text = processor.clean_text(dirty_text)
        
        assert "<b>" not in clean_text
        assert "https://example.com" not in clean_text
        assert "test@example.com" not in clean_text
        assert clean_text.strip() == "hello world visit or email"
        
    def test_extract_keywords(self, processor):
        """Test keyword extraction."""
        text = "Python developer with experience in React and JavaScript frameworks"
        keywords = processor.extract_keywords(text)
        
        assert "python" in keywords
        assert "developer" in keywords
        assert "react" in keywords
        assert "javascript" in keywords
        assert "frameworks" in keywords
        
        # Stop words should be filtered out
        assert "with" not in keywords
        assert "in" not in keywords
        
    def test_extract_skills(self, processor):
        """Test skill extraction."""
        text = "Looking for Python developer with React.js and Node.js experience, SQL knowledge required"
        skills = processor.extract_skills(text)
        
        assert "python" in skills
        assert "react" in skills or "react.js" in skills
        assert "node.js" in skills or "nodejs" in skills
        assert "sql" in skills
        
    def test_calculate_text_similarity(self, processor):
        """Test text similarity calculation."""
        text1 = "Python developer with React experience"
        text2 = "React developer with Python knowledge"
        
        similarity = processor.calculate_text_similarity(text1, text2)
        
        assert 0.0 <= similarity <= 1.0
        assert similarity > 0.5  # Should be quite similar


class TestVectorUtils:
    """Test cases for VectorUtils."""
    
    def test_cosine_similarity(self):
        """Test cosine similarity calculation."""
        vec1 = [1.0, 0.0, 0.0]
        vec2 = [0.0, 1.0, 0.0]
        vec3 = [1.0, 0.0, 0.0]
        
        # Orthogonal vectors
        similarity = VectorUtils.cosine_similarity(vec1, vec2)
        assert abs(similarity - 0.0) < 1e-6
        
        # Identical vectors
        similarity = VectorUtils.cosine_similarity(vec1, vec3)
        assert abs(similarity - 1.0) < 1e-6
        
    def test_euclidean_distance(self):
        """Test Euclidean distance calculation."""
        vec1 = [0.0, 0.0]
        vec2 = [3.0, 4.0]
        
        distance = VectorUtils.euclidean_distance(vec1, vec2)
        assert abs(distance - 5.0) < 1e-6  # 3-4-5 triangle
        
    def test_normalize_vector(self):
        """Test vector normalization."""
        vector = [3.0, 4.0]
        normalized = VectorUtils.normalize_vector(vector)
        
        # Length should be 1
        length = sum(x**2 for x in normalized) ** 0.5
        assert abs(length - 1.0) < 1e-6
        
    def test_average_vectors(self):
        """Test vector averaging."""
        vectors = [
            [1.0, 2.0, 3.0],
            [2.0, 4.0, 6.0],
            [3.0, 6.0, 9.0]
        ]
        
        average = VectorUtils.average_vectors(vectors)
        expected = [2.0, 4.0, 6.0]
        
        for i, val in enumerate(average):
            assert abs(val - expected[i]) < 1e-6


class TestJobMatchingUtils:
    """Test cases for JobMatchingUtils."""
    
    def test_calculate_skill_match_score(self):
        """Test skill matching score calculation."""
        user_skills = ["Python", "JavaScript", "React", "SQL"]
        job_skills = ["Python", "React", "AWS"]
        
        result = JobMatchingUtils.calculate_skill_match_score(user_skills, job_skills)
        
        assert result["score"] == 2/3  # 2 out of 3 required skills match
        assert "python" in result["matching_skills"]
        assert "react" in result["matching_skills"]
        assert "aws" in result["missing_skills"]
        assert "javascript" in result["extra_skills"]
        
    def test_calculate_experience_match_score(self):
        """Test experience matching score calculation."""
        # Perfect match
        result = JobMatchingUtils.calculate_experience_match_score(5, "senior")
        assert result["score"] == 1.0
        assert result["match_type"] == "perfect_match"
        
        # Under-qualified
        result = JobMatchingUtils.calculate_experience_match_score(2, "senior")
        assert result["score"] < 1.0
        assert result["match_type"] == "under_qualified"
        
        # Over-qualified
        result = JobMatchingUtils.calculate_experience_match_score(15, "senior")
        assert result["score"] == 0.9
        assert result["match_type"] == "over_qualified"
        
    def test_calculate_location_match_score(self):
        """Test location matching score calculation."""
        user_locations = ["San Francisco", "New York"]
        
        # Exact match
        result = JobMatchingUtils.calculate_location_match_score(
            user_locations, "San Francisco"
        )
        assert result["score"] == 1.0
        assert result["match_type"] == "exact_match"
        
        # Partial match
        result = JobMatchingUtils.calculate_location_match_score(
            user_locations, "San Francisco, CA"
        )
        assert result["score"] == 0.8
        assert result["match_type"] == "partial_match"
        
        # Remote work
        result = JobMatchingUtils.calculate_location_match_score(
            user_locations, "Anywhere", "remote"
        )
        assert result["score"] == 1.0
        assert result["match_type"] == "remote_work"
        
        # No match
        result = JobMatchingUtils.calculate_location_match_score(
            user_locations, "Seattle"
        )
        assert result["score"] == 0.2
        assert result["match_type"] == "no_match"
        
    def test_calculate_salary_match_score(self):
        """Test salary matching score calculation."""
        # Perfect overlap
        result = JobMatchingUtils.calculate_salary_match_score(
            100000, 150000, 120000, 160000
        )
        assert result["score"] > 0.5
        assert result["match_type"] == "overlap"
        
        # Below expectation
        result = JobMatchingUtils.calculate_salary_match_score(
            100000, 150000, 50000, 80000
        )
        assert result["score"] == 0.1
        assert result["match_type"] == "below_expectation"
        
        # No requirement
        result = JobMatchingUtils.calculate_salary_match_score(
            None, None, 100000, 150000
        )
        assert result["score"] == 1.0
        assert result["match_type"] == "no_requirement"


if __name__ == "__main__":
    pytest.main([__file__])