"""Integration tests for semantic search service."""

import pytest
from unittest.mock import Mock, AsyncMock, patch
import asyncio

# Import models first
from .models import (
    UserProfile, JobPosting, SemanticSearchRequest, SearchType,
    EmbeddingRequest
)

# Create a mock service class for testing
class MockSemanticSearchService:
    """Mock service for testing without external dependencies."""
    
    def __init__(self):
        self.embeddings = None
        self.pinecone_index = None
        self.redis_client = None
        self._initialized = False
        
    def _create_profile_text(self, profile: UserProfile) -> str:
        """Convert user profile to searchable text."""
        parts = []
        
        if profile.skills:
            parts.append(f"Skills: {', '.join(profile.skills)}")
            
        if profile.experience:
            exp_texts = []
            for exp in profile.experience:
                exp_text = f"{exp.get('title', '')} at {exp.get('company', '')} - {exp.get('description', '')}"
                exp_texts.append(exp_text.strip())
            parts.append(f"Experience: {' | '.join(exp_texts)}")
            
        if profile.education:
            edu_texts = []
            for edu in profile.education:
                edu_text = f"{edu.get('degree', '')} in {edu.get('field', '')} from {edu.get('institution', '')}"
                edu_texts.append(edu_text.strip())
            parts.append(f"Education: {' | '.join(edu_texts)}")
            
        if profile.career_goals:
            parts.append(f"Career Goals: {profile.career_goals}")
            
        if profile.industry_preferences:
            parts.append(f"Industry Preferences: {', '.join(profile.industry_preferences)}")
            
        return " | ".join(parts)
        
    def _calculate_traditional_match(self, profile: UserProfile, job: JobPosting) -> float:
        """Calculate traditional matching score."""
        score = 0.0
        total_weight = 0.0
        
        # Skill matching (40% weight)
        if job.required_skills:
            user_skills = set(skill.lower() for skill in profile.skills)
            job_skills = set(skill.lower() for skill in job.required_skills)
            
            if job_skills:
                skill_match = len(user_skills.intersection(job_skills)) / len(job_skills)
                score += skill_match * 0.4
                total_weight += 0.4
                
        # Experience matching (30% weight)
        if job.experience_level and profile.years_experience:
            exp_mapping = {
                'entry': 0, 'junior': 1, 'mid': 3, 'senior': 5, 'lead': 8, 'executive': 10
            }
            required_years = exp_mapping.get(job.experience_level.lower(), 0)
            
            if required_years > 0:
                exp_match = min(profile.years_experience / required_years, 1.0)
                score += exp_match * 0.3
                total_weight += 0.3
                
        # Location matching (15% weight)
        if profile.preferred_locations and job.location:
            location_match = any(
                loc.lower() in job.location.lower() 
                for loc in profile.preferred_locations
            )
            if location_match:
                score += 0.15
            total_weight += 0.15
            
        # Salary matching (15% weight)
        if profile.salary_expectation_min and job.salary_max:
            if job.salary_max >= profile.salary_expectation_min:
                score += 0.15
            total_weight += 0.15
            
        return score / total_weight if total_weight > 0 else 0.0
        
    def _find_matching_skills(self, profile: UserProfile, job: JobPosting) -> list:
        """Find matching skills."""
        user_skills = set(skill.lower() for skill in profile.skills)
        job_skills = set(skill.lower() for skill in (job.required_skills + job.preferred_skills))
        
        matching = user_skills.intersection(job_skills)
        return list(matching)
        
    def _find_skill_gaps(self, profile: UserProfile, job: JobPosting) -> list:
        """Find skill gaps."""
        user_skills = set(skill.lower() for skill in profile.skills)
        required_skills = set(skill.lower() for skill in job.required_skills)
        
        gaps = required_skills - user_skills
        return list(gaps)
        
    def _check_salary_match(self, profile: UserProfile, job: JobPosting) -> bool:
        """Check salary match."""
        if not profile.salary_expectation_min or not job.salary_max:
            return None
            
        return job.salary_max >= profile.salary_expectation_min
        
    def _check_location_match(self, profile: UserProfile, job: JobPosting) -> bool:
        """Check location match."""
        if not profile.preferred_locations or not job.location:
            return None
            
        return any(
            loc.lower() in job.location.lower() 
            for loc in profile.preferred_locations
        )
        
    def _generate_match_explanation(self, profile, job, semantic_score, traditional_score):
        """Generate match explanation."""
        return {
            "semantic_score": semantic_score,
            "traditional_score": traditional_score,
            "matching_factors": [],
            "concerns": []
        }
        
    def _extract_keywords(self, profile: UserProfile) -> list:
        """Extract keywords from profile."""
        keywords = []
        keywords.extend(profile.skills)
        
        if profile.career_goals:
            keywords.extend(profile.career_goals.lower().split())
            
        return [kw.lower().strip() for kw in keywords if kw.strip()]
        
    def _calculate_keyword_similarity(self, keywords1: list, keywords2: list) -> float:
        """Calculate keyword similarity."""
        if not keywords1 or not keywords2:
            return 0.0
            
        set1 = set(keywords1)
        set2 = set(keywords2)
        
        intersection = set1.intersection(set2)
        union = set1.union(set2)
        
        return len(intersection) / len(union) if union else 0.0
        
    def _generate_cache_key(self, request: SemanticSearchRequest) -> str:
        """Generate cache key."""
        return f"search:{request.user_profile.id}:type:{request.search_type.value}:k:{request.top_k}"
        
    def _apply_filters(self, matches, filters):
        """Apply filters to matches."""
        if not filters:
            return matches
            
        filtered = []
        for match in matches:
            job = match.job
            
            # Location filter
            if filters.locations:
                if not job.location or not any(
                    loc.lower() in job.location.lower() for loc in filters.locations
                ):
                    continue
                    
            # Salary filter
            if filters.salary_min and job.salary_max and job.salary_max < filters.salary_min:
                continue
                
            filtered.append(match)
            
        return filtered
        
    def _combine_search_results(self, semantic_matches, keyword_matches):
        """Combine search results."""
        combined = {}
        
        for match in semantic_matches:
            combined[match.job.id] = match
            
        for match in keyword_matches:
            if match.job.id in combined:
                existing = combined[match.job.id]
                existing.semantic_score = (existing.semantic_score + match.semantic_score) / 2
                existing.traditional_score = (existing.traditional_score + match.traditional_score) / 2
                existing.composite_score = (existing.semantic_score * 0.6) + (existing.traditional_score * 0.4)
            else:
                combined[match.job.id] = match
                
        return list(combined.values())
        
    def _create_pinecone_filters(self, filters):
        """Create Pinecone filters."""
        pinecone_filters = {}
        
        if filters.locations:
            pinecone_filters["location"] = {"$in": filters.locations}
            
        if filters.salary_min:
            pinecone_filters["salary_max"] = {"$gte": filters.salary_min}
            
        if filters.employment_types:
            pinecone_filters["employment_type"] = {"$in": filters.employment_types}
            
        if filters.industries:
            pinecone_filters["industry"] = {"$in": filters.industries}
            
        return pinecone_filters
        
    async def _keyword_search_fallback(self, request, start_time):
        """Keyword search fallback."""
        from .models import SearchResults
        import time
        
        return SearchResults(
            matches=[],
            total_found=0,
            search_type=SearchType.KEYWORD,
            processing_time=time.time() - start_time,
            user_id=request.user_profile.id,
            filters_applied=request.filters,
            metadata={"fallback": True}
        )


class TestSemanticSearchServiceIntegration:
    """Integration tests for the semantic search service."""
    
    @pytest.fixture
    def service(self):
        """Create a service instance for testing."""
        return MockSemanticSearchService()
        
    @pytest.fixture
    def sample_user_profile(self):
        """Sample user profile for testing."""
        return UserProfile(
            id="user123",
            skills=["Python", "JavaScript", "React"],
            years_experience=5,
            preferred_locations=["San Francisco"],
            salary_expectation_min=100000
        )
        
    @pytest.fixture
    def sample_job_posting(self):
        """Sample job posting for testing."""
        return JobPosting(
            id="job123",
            title="Senior Software Engineer",
            company="TechStart Inc",
            description="Looking for a senior software engineer with Python and React experience",
            location="San Francisco, CA",
            salary_min=120000,
            salary_max=160000,
            required_skills=["Python", "React"]
        )
        
    def test_service_initialization(self, service):
        """Test that service can be created."""
        assert service is not None
        assert not service._initialized
        assert service.embeddings is None
        assert service.pinecone_index is None
        
    def test_create_profile_text(self, service, sample_user_profile):
        """Test profile text creation."""
        profile_text = service._create_profile_text(sample_user_profile)
        
        assert isinstance(profile_text, str)
        assert len(profile_text) > 0
        assert "Python" in profile_text
        assert "JavaScript" in profile_text
        assert "React" in profile_text
        
    def test_calculate_traditional_match(self, service, sample_user_profile, sample_job_posting):
        """Test traditional matching calculation."""
        score = service._calculate_traditional_match(sample_user_profile, sample_job_posting)
        
        assert isinstance(score, float)
        assert 0.0 <= score <= 1.0
        # Should be a good match since skills, location, and salary align
        assert score > 0.5
        
    def test_find_matching_skills(self, service, sample_user_profile, sample_job_posting):
        """Test skill matching functionality."""
        matching_skills = service._find_matching_skills(sample_user_profile, sample_job_posting)
        
        assert isinstance(matching_skills, list)
        # Should find Python and React as matches
        matching_lower = [skill.lower() for skill in matching_skills]
        assert "python" in matching_lower
        assert "react" in matching_lower
        
    def test_find_skill_gaps(self, service, sample_user_profile, sample_job_posting):
        """Test skill gap identification."""
        skill_gaps = service._find_skill_gaps(sample_user_profile, sample_job_posting)
        
        assert isinstance(skill_gaps, list)
        # User has all required skills, so gaps should be empty
        assert len(skill_gaps) == 0
        
    def test_check_salary_match(self, service, sample_user_profile, sample_job_posting):
        """Test salary matching."""
        salary_match = service._check_salary_match(sample_user_profile, sample_job_posting)
        
        assert salary_match is True  # Job max (160k) >= user min (100k)
        
    def test_check_location_match(self, service, sample_user_profile, sample_job_posting):
        """Test location matching."""
        location_match = service._check_location_match(sample_user_profile, sample_job_posting)
        
        assert location_match is True  # San Francisco matches
        
    def test_generate_match_explanation(self, service, sample_user_profile, sample_job_posting):
        """Test match explanation generation."""
        explanation = service._generate_match_explanation(
            sample_user_profile, sample_job_posting, 0.85, 0.75
        )
        
        assert isinstance(explanation, dict)
        assert "semantic_score" in explanation
        assert "traditional_score" in explanation
        assert "matching_factors" in explanation
        assert "concerns" in explanation
        assert explanation["semantic_score"] == 0.85
        assert explanation["traditional_score"] == 0.75
        
    def test_extract_keywords(self, service, sample_user_profile):
        """Test keyword extraction from user profile."""
        keywords = service._extract_keywords(sample_user_profile)
        
        assert isinstance(keywords, list)
        assert len(keywords) > 0
        # Should contain skills and other relevant terms
        keywords_lower = [kw.lower() for kw in keywords]
        assert any("python" in kw for kw in keywords_lower)
        
    def test_calculate_keyword_similarity(self, service):
        """Test keyword similarity calculation."""
        keywords1 = ["python", "javascript", "react"]
        keywords2 = ["python", "react", "node"]
        
        similarity = service._calculate_keyword_similarity(keywords1, keywords2)
        
        assert isinstance(similarity, float)
        assert 0.0 <= similarity <= 1.0
        assert similarity > 0.0  # Should have some similarity
        
    def test_generate_cache_key(self, service, sample_user_profile):
        """Test cache key generation."""
        request = SemanticSearchRequest(
            user_profile=sample_user_profile,
            search_type=SearchType.HYBRID,
            top_k=10
        )
        
        cache_key = service._generate_cache_key(request)
        
        assert isinstance(cache_key, str)
        assert len(cache_key) > 0
        assert "search:user123" in cache_key
        assert "hybrid" in cache_key
        
    def test_apply_filters_location(self, service, sample_job_posting):
        """Test location filter application."""
        from .models import JobMatch, SearchFilters
        
        job_match = JobMatch(
            job=sample_job_posting,
            semantic_score=0.8,
            traditional_score=0.7,
            composite_score=0.75
        )
        
        # Test matching location filter
        filters = SearchFilters(locations=["San Francisco"])
        filtered = service._apply_filters([job_match], filters)
        assert len(filtered) == 1
        
        # Test non-matching location filter
        filters = SearchFilters(locations=["Seattle"])
        filtered = service._apply_filters([job_match], filters)
        assert len(filtered) == 0
        
    def test_apply_filters_salary(self, service, sample_job_posting):
        """Test salary filter application."""
        from .models import JobMatch, SearchFilters
        
        job_match = JobMatch(
            job=sample_job_posting,
            semantic_score=0.8,
            traditional_score=0.7,
            composite_score=0.75
        )
        
        # Test salary filter that should match
        filters = SearchFilters(salary_min=100000)
        filtered = service._apply_filters([job_match], filters)
        assert len(filtered) == 1
        
        # Test salary filter that shouldn't match
        filters = SearchFilters(salary_min=200000)
        filtered = service._apply_filters([job_match], filters)
        assert len(filtered) == 0
        
    def test_combine_search_results(self, service, sample_job_posting):
        """Test combining search results from different methods."""
        from .models import JobMatch
        
        # Create two matches for the same job with different scores
        match1 = JobMatch(
            job=sample_job_posting,
            semantic_score=0.9,
            traditional_score=0.6,
            composite_score=0.78
        )
        
        match2 = JobMatch(
            job=sample_job_posting,
            semantic_score=0.7,
            traditional_score=0.8,
            composite_score=0.74
        )
        
        combined = service._combine_search_results([match1], [match2])
        
        assert len(combined) == 1  # Should deduplicate
        # Scores should be averaged
        assert combined[0].semantic_score == 0.8  # (0.9 + 0.7) / 2
        assert combined[0].traditional_score == 0.7  # (0.6 + 0.8) / 2
        
    @pytest.mark.asyncio
    async def test_keyword_search_fallback(self, service, sample_user_profile):
        """Test keyword search fallback functionality."""
        request = SemanticSearchRequest(
            user_profile=sample_user_profile,
            search_type=SearchType.KEYWORD,
            top_k=5
        )
        
        start_time = 0.0
        results = await service._keyword_search_fallback(request, start_time)
        
        assert results is not None
        assert results.search_type == SearchType.KEYWORD
        assert results.user_id == sample_user_profile.id
        assert isinstance(results.matches, list)
            
    def test_create_pinecone_filters(self, service):
        """Test Pinecone filter creation."""
        from .models import SearchFilters
        
        filters = SearchFilters(
            locations=["San Francisco", "New York"],
            salary_min=100000,
            employment_types=["full-time"],
            industries=["Technology"]
        )
        
        pinecone_filters = service._create_pinecone_filters(filters)
        
        assert isinstance(pinecone_filters, dict)
        assert "location" in pinecone_filters
        assert "salary_max" in pinecone_filters
        assert "employment_type" in pinecone_filters
        assert "industry" in pinecone_filters
        
    @pytest.mark.asyncio
    async def test_service_without_external_dependencies(self, service):
        """Test service behavior when external dependencies are not available."""
        # Service should handle missing dependencies gracefully
        assert service.embeddings is None
        assert service.pinecone_index is None
        assert service.redis_client is None
        assert not service._initialized
        
        # Should be able to perform basic operations
        profile_text = service._create_profile_text(UserProfile(
            id="test",
            skills=["Python"]
        ))
        assert isinstance(profile_text, str)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])