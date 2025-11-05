"""Data models for semantic search service."""

from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Any, Union

from pydantic import BaseModel, Field, validator


class SearchType(str, Enum):
    """Types of search operations."""
    SEMANTIC = "semantic"
    KEYWORD = "keyword"
    HYBRID = "hybrid"


class MatchType(str, Enum):
    """Types of matching algorithms."""
    COSINE_SIMILARITY = "cosine_similarity"
    EUCLIDEAN_DISTANCE = "euclidean_distance"
    DOT_PRODUCT = "dot_product"


class UserProfile(BaseModel):
    """User profile for semantic search."""
    id: str
    skills: List[str] = Field(default_factory=list)
    experience: List[Dict[str, Any]] = Field(default_factory=list)
    education: List[Dict[str, Any]] = Field(default_factory=list)
    career_goals: Optional[str] = None
    preferred_locations: List[str] = Field(default_factory=list)
    salary_expectation_min: Optional[int] = None
    salary_expectation_max: Optional[int] = None
    years_experience: int = 0
    industry_preferences: List[str] = Field(default_factory=list)
    job_type_preferences: List[str] = Field(default_factory=list)  # full-time, part-time, contract
    remote_preferences: List[str] = Field(default_factory=list)  # remote, hybrid, on-site


class JobPosting(BaseModel):
    """Job posting for semantic search."""
    id: str
    title: str
    company: str
    description: str
    location: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    employment_type: Optional[str] = None  # full-time, part-time, contract
    experience_level: Optional[str] = None
    industry: Optional[str] = None
    remote_type: Optional[str] = None  # remote, hybrid, on-site
    required_skills: List[str] = Field(default_factory=list)
    preferred_skills: List[str] = Field(default_factory=list)
    posted_date: Optional[datetime] = None
    company_size: Optional[str] = None
    benefits: List[str] = Field(default_factory=list)


class SearchFilters(BaseModel):
    """Filters for job search."""
    locations: Optional[List[str]] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    employment_types: Optional[List[str]] = None
    experience_levels: Optional[List[str]] = None
    industries: Optional[List[str]] = None
    remote_types: Optional[List[str]] = None
    company_sizes: Optional[List[str]] = None
    posted_within_days: Optional[int] = None
    required_skills: Optional[List[str]] = None


class SemanticSearchRequest(BaseModel):
    """Request model for semantic search."""
    user_profile: UserProfile
    filters: Optional[SearchFilters] = None
    search_type: SearchType = SearchType.HYBRID
    top_k: int = Field(default=10, ge=1, le=100)
    include_explanation: bool = True
    match_threshold: float = Field(default=0.7, ge=0.0, le=1.0)


class JobMatch(BaseModel):
    """Individual job match result."""
    job: JobPosting
    semantic_score: float = Field(ge=0.0, le=1.0)
    traditional_score: float = Field(ge=0.0, le=1.0)
    composite_score: float = Field(ge=0.0, le=1.0)
    match_explanation: Optional[Dict[str, Any]] = None
    matching_skills: List[str] = Field(default_factory=list)
    skill_gaps: List[str] = Field(default_factory=list)
    salary_match: Optional[bool] = None
    location_match: Optional[bool] = None
    
    @validator('composite_score')
    def validate_composite_score(cls, v, values):
        semantic = values.get('semantic_score', 0)
        traditional = values.get('traditional_score', 0)
        # Ensure composite score is reasonable combination
        expected = (semantic * 0.6) + (traditional * 0.4)
        if abs(v - expected) > 0.1:  # Allow some tolerance
            return expected
        return v


class SearchResults(BaseModel):
    """Search results response."""
    matches: List[JobMatch]
    total_found: int
    search_type: SearchType
    processing_time: float
    user_id: str
    filters_applied: Optional[SearchFilters] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class EmbeddingRequest(BaseModel):
    """Request for generating embeddings."""
    request_id: str = Field(default_factory=lambda: str(__import__('uuid').uuid4()))
    text: str
    embedding_type: str = "job"  # job, profile, skill
    metadata: Optional[Dict[str, Any]] = None


class EmbeddingResponse(BaseModel):
    """Response for embedding generation."""
    embedding: List[float]
    dimension: int
    model_used: str
    processing_time: float
    metadata: Optional[Dict[str, Any]] = None


class VectorSearchRequest(BaseModel):
    """Request for vector similarity search."""
    query_vector: List[float]
    top_k: int = Field(default=10, ge=1, le=100)
    filters: Optional[Dict[str, Any]] = None
    include_metadata: bool = True
    namespace: Optional[str] = None


class VectorSearchResult(BaseModel):
    """Individual vector search result."""
    id: str
    score: float
    metadata: Optional[Dict[str, Any]] = None


class VectorSearchResponse(BaseModel):
    """Response for vector search."""
    results: List[VectorSearchResult]
    processing_time: float
    total_found: int


class IndexStats(BaseModel):
    """Statistics about the vector index."""
    total_vectors: int
    dimension: int
    index_fullness: float
    namespaces: Dict[str, int]  # namespace -> vector count


class BatchEmbeddingRequest(BaseModel):
    """Request for batch embedding generation."""
    texts: List[str]
    embedding_type: str = "job"
    batch_size: int = Field(default=100, ge=1, le=1000)
    metadata: Optional[List[Dict[str, Any]]] = None


class BatchEmbeddingResponse(BaseModel):
    """Response for batch embedding generation."""
    embeddings: List[List[float]]
    processing_time: float
    successful_count: int
    failed_count: int
    errors: List[str] = Field(default_factory=list)


class SimilarityRequest(BaseModel):
    """Request for similarity calculation."""
    vector1: List[float]
    vector2: List[float]
    similarity_type: MatchType = MatchType.COSINE_SIMILARITY


class SimilarityResponse(BaseModel):
    """Response for similarity calculation."""
    similarity_score: float
    similarity_type: MatchType
    processing_time: float


class SearchAnalytics(BaseModel):
    """Analytics data for search operations."""
    user_id: str
    search_query: str
    search_type: SearchType
    results_count: int
    top_score: float
    average_score: float
    processing_time: float
    filters_used: Optional[SearchFilters] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class RecommendationRequest(BaseModel):
    """Request for job recommendations."""
    user_profile: UserProfile
    exclude_job_ids: List[str] = Field(default_factory=list)
    recommendation_type: str = "similar_jobs"  # similar_jobs, career_growth, skill_development
    top_k: int = Field(default=20, ge=1, le=100)


class RecommendationResponse(BaseModel):
    """Response for job recommendations."""
    recommendations: List[JobMatch]
    recommendation_type: str
    user_id: str
    processing_time: float
    metadata: Dict[str, Any] = Field(default_factory=dict)