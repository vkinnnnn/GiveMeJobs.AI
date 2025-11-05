"""Enhanced semantic search service with vector embeddings and Pinecone integration."""

import asyncio
import json
import time
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity, euclidean_distances
from sklearn.feature_extraction.text import TfidfVectorizer
from elasticsearch import AsyncElasticsearch
import pinecone
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.core.config import get_settings
from app.core.logging import get_logger
from app.core.openai_client import EnhancedOpenAIClient
from app.core.dependencies import ServiceDependencies
from app.core.exceptions import VectorSearchException, EmbeddingException

from .models import (
    UserProfile, JobPosting, SearchFilters, SemanticSearchRequest,
    JobMatch, SearchResults, SearchType, EmbeddingRequest, EmbeddingResponse,
    VectorSearchRequest, VectorSearchResponse, VectorSearchResult,
    BatchEmbeddingRequest, BatchEmbeddingResponse, SimilarityRequest,
    SimilarityResponse, MatchType
)

logger = get_logger(__name__)


class EnhancedSemanticSearchService:
    """Enhanced semantic search service with vector embeddings, Pinecone, and Elasticsearch."""
    
    def __init__(self, dependencies: ServiceDependencies):
        self.deps = dependencies
        self.settings = dependencies.settings
        self.openai_client = dependencies.openai
        self.redis = dependencies.redis
        self.logger = dependencies.logger
        
        # Initialize components
        self.embeddings = None
        self.pinecone_client = None
        self.pinecone_index = None
        self.elasticsearch_client = None
        
        # Text processing
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        
        self.tfidf_vectorizer = TfidfVectorizer(
            max_features=10000,
            stop_words='english',
            ngram_range=(1, 3),
            min_df=2,
            max_df=0.95
        )
        
        # Cache settings
        self.cache_ttl = 3600  # 1 hour
        self.embedding_cache_ttl = 86400  # 24 hours
        
        self._initialized = False
        
    async def initialize(self):
        """Initialize the enhanced semantic search service with all dependencies."""
        if self._initialized:
            return
            
        try:
            self.logger.info("Initializing enhanced semantic search service")
            
            # Initialize OpenAI embeddings with LangChain
            if self.settings.ai.openai_api_key:
                self.embeddings = OpenAIEmbeddings(
                    openai_api_key=self.settings.ai.openai_api_key,
                    model="text-embedding-ada-002",
                    chunk_size=1000,
                    max_retries=3,
                    request_timeout=60
                )
                self.logger.info("OpenAI embeddings initialized with LangChain")
            else:
                self.logger.warning("OpenAI API key not provided, semantic search will be limited")
                
            # Initialize Pinecone with legacy client
            if self.settings.ai.pinecone_api_key:
                pinecone.init(
                    api_key=self.settings.ai.pinecone_api_key,
                    environment=self.settings.ai.pinecone_environment or "us-east1-gcp"
                )
                
                # Check if index exists, create if not
                index_name = self.settings.ai.pinecone_index_name
                existing_indexes = pinecone.list_indexes()
                
                if index_name not in existing_indexes:
                    self.logger.info(f"Creating Pinecone index: {index_name}")
                    pinecone.create_index(
                        name=index_name,
                        dimension=self.settings.ai.pinecone_dimension,
                        metric=self.settings.ai.pinecone_metric
                    )
                    
                self.pinecone_index = pinecone.Index(index_name)
                self.logger.info("Pinecone index initialized")
            else:
                self.logger.warning("Pinecone credentials not provided, vector search will be limited")
                
            # Initialize Elasticsearch for keyword search fallback
            try:
                self.elasticsearch_client = AsyncElasticsearch(
                    [{"host": "localhost", "port": 9200}],
                    timeout=30,
                    max_retries=3,
                    retry_on_timeout=True
                )
                # Test connection
                await self.elasticsearch_client.ping()
                self.logger.info("Elasticsearch client initialized")
            except Exception as e:
                self.logger.warning(f"Elasticsearch not available: {e}")
                self.elasticsearch_client = None
            
            self._initialized = True
            self.logger.info("Enhanced semantic search service initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize semantic search service: {str(e)}")
            raise VectorSearchException(
                f"Service initialization failed: {str(e)}",
                index_name=self.settings.ai.pinecone_index_name
            )
            
    async def search_jobs(self, request: SemanticSearchRequest) -> SearchResults:
        """Enhanced main search method with hybrid semantic and traditional matching."""
        start_time = time.time()
        
        try:
            await self.initialize()
            
            self.logger.info(
                "Starting enhanced job search",
                user_id=request.user_profile.id,
                search_type=request.search_type.value,
                top_k=request.top_k
            )
            
            # Generate cache key
            cache_key = self._generate_cache_key(request)
            
            # Check cache first
            cached_result = await self._get_cached_result(cache_key)
            if cached_result:
                cached_result.metadata["cache_hit"] = True
                self.logger.info("Returning cached search results", user_id=request.user_profile.id)
                return cached_result
                
            # Perform search based on type with enhanced algorithms
            matches = []
            
            if request.search_type == SearchType.SEMANTIC and self.embeddings and self.pinecone_index:
                matches = await self._enhanced_semantic_search(request)
            elif request.search_type == SearchType.KEYWORD:
                matches = await self._enhanced_keyword_search(request)
            else:  # HYBRID or fallback
                matches = await self._enhanced_hybrid_search(request)
                
            # Apply advanced filters
            if request.filters:
                matches = await self._apply_advanced_filters(matches, request.filters)
                
            # Enhanced scoring and ranking
            matches = await self._apply_enhanced_scoring(matches, request.user_profile)
            
            # Sort by composite score and limit results
            matches.sort(key=lambda x: x.composite_score, reverse=True)
            matches = matches[:request.top_k]
            
            # Generate match explanations if requested
            if request.include_explanation:
                for match in matches:
                    match.match_explanation = await self._generate_match_explanation(
                        match, request.user_profile
                    )
            
            # Create enhanced results
            results = SearchResults(
                matches=matches,
                total_found=len(matches),
                search_type=request.search_type,
                processing_time=time.time() - start_time,
                user_id=request.user_profile.id,
                filters_applied=request.filters,
                metadata={
                    "embedding_model": "text-embedding-ada-002" if self.embeddings else None,
                    "vector_db": "pinecone" if self.pinecone_index else None,
                    "elasticsearch_available": self.elasticsearch_client is not None,
                    "cache_hit": False,
                    "enhanced_scoring": True,
                    "match_explanations": request.include_explanation
                }
            )
            
            # Cache results
            await self._cache_result(cache_key, results)
            
            self.logger.info(
                "Enhanced search completed",
                user_id=request.user_profile.id,
                search_type=request.search_type.value,
                results_count=len(matches),
                processing_time=results.processing_time,
                avg_score=np.mean([m.composite_score for m in matches]) if matches else 0
            )
            
            return results
            
        except Exception as e:
            self.logger.error(f"Enhanced search failed: {str(e)}", user_id=request.user_profile.id)
            raise VectorSearchException(
                f"Search operation failed: {str(e)}",
                query_dimension=1536 if self.embeddings else None
            )
            # Fallback to keyword search if semantic search fails
            if request.search_type != SearchType.KEYWORD:
                logger.info("Falling back to keyword search", user_id=request.user_profile.id)
                request.search_type = SearchType.KEYWORD
                return await self._keyword_search_fallback(request, start_time)
            raise
            
    async def _semantic_search(self, request: SemanticSearchRequest) -> List[JobMatch]:
        """Perform semantic search using vector embeddings."""
        try:
            # Generate user profile embedding
            profile_text = self._create_profile_text(request.user_profile)
            profile_embedding = await self.embeddings.aembed_query(profile_text)
            
            # Search in Pinecone
            search_results = self.pinecone_index.query(
                vector=profile_embedding,
                top_k=min(request.top_k * 2, 100),  # Get more results for filtering
                include_metadata=True,
                filter=self._create_pinecone_filters(request.filters) if request.filters else None
            )
            
            matches = []
            for match in search_results.matches:
                try:
                    job_data = match.metadata
                    job = JobPosting(**job_data)
                    
                    # Calculate traditional score
                    traditional_score = self._calculate_traditional_match(
                        request.user_profile, job
                    )
                    
                    # Calculate composite score
                    semantic_score = float(match.score)
                    composite_score = (semantic_score * 0.6) + (traditional_score * 0.4)
                    
                    # Generate match explanation if requested
                    explanation = None
                    if request.include_explanation:
                        explanation = self._generate_match_explanation(
                            request.user_profile, job, semantic_score, traditional_score
                        )
                    
                    job_match = JobMatch(
                        job=job,
                        semantic_score=semantic_score,
                        traditional_score=traditional_score,
                        composite_score=composite_score,
                        match_explanation=explanation,
                        matching_skills=self._find_matching_skills(request.user_profile, job),
                        skill_gaps=self._find_skill_gaps(request.user_profile, job),
                        salary_match=self._check_salary_match(request.user_profile, job),
                        location_match=self._check_location_match(request.user_profile, job)
                    )
                    
                    if composite_score >= request.match_threshold:
                        matches.append(job_match)
                        
                except Exception as e:
                    logger.warning(f"Failed to process job match: {str(e)}")
                    continue
                    
            return matches
            
        except Exception as e:
            logger.error(f"Semantic search failed: {str(e)}")
            raise
            
    async def _keyword_search(self, request: SemanticSearchRequest) -> List[JobMatch]:
        """Perform keyword-based search as fallback."""
        try:
            # This would typically query a traditional database
            # For now, we'll simulate with a basic implementation
            logger.info("Performing keyword search", user_id=request.user_profile.id)
            
            # In a real implementation, this would query your job database
            # with SQL LIKE queries or full-text search
            jobs = await self._get_jobs_from_database(request.filters)
            
            matches = []
            profile_keywords = self._extract_keywords(request.user_profile)
            
            for job in jobs:
                job_keywords = self._extract_job_keywords(job)
                
                # Calculate keyword similarity
                keyword_score = self._calculate_keyword_similarity(profile_keywords, job_keywords)
                traditional_score = self._calculate_traditional_match(request.user_profile, job)
                
                composite_score = (keyword_score * 0.4) + (traditional_score * 0.6)
                
                if composite_score >= request.match_threshold:
                    explanation = None
                    if request.include_explanation:
                        explanation = self._generate_keyword_explanation(
                            profile_keywords, job_keywords, traditional_score
                        )
                    
                    job_match = JobMatch(
                        job=job,
                        semantic_score=keyword_score,
                        traditional_score=traditional_score,
                        composite_score=composite_score,
                        match_explanation=explanation,
                        matching_skills=self._find_matching_skills(request.user_profile, job),
                        skill_gaps=self._find_skill_gaps(request.user_profile, job),
                        salary_match=self._check_salary_match(request.user_profile, job),
                        location_match=self._check_location_match(request.user_profile, job)
                    )
                    matches.append(job_match)
                    
            return matches
            
        except Exception as e:
            logger.error(f"Keyword search failed: {str(e)}")
            raise
            
    async def _hybrid_search(self, request: SemanticSearchRequest) -> List[JobMatch]:
        """Perform hybrid search combining semantic and keyword approaches."""
        try:
            semantic_matches = []
            keyword_matches = []
            
            # Try semantic search first
            if self.embeddings and self.pinecone_index:
                try:
                    semantic_matches = await self._semantic_search(request)
                except Exception as e:
                    logger.warning(f"Semantic search failed in hybrid mode: {str(e)}")
                    
            # Perform keyword search
            try:
                keyword_matches = await self._keyword_search(request)
            except Exception as e:
                logger.warning(f"Keyword search failed in hybrid mode: {str(e)}")
                
            # Combine and deduplicate results
            combined_matches = self._combine_search_results(semantic_matches, keyword_matches)
            
            return combined_matches
            
        except Exception as e:
            logger.error(f"Hybrid search failed: {str(e)}")
            raise
            
    def _create_profile_text(self, profile: UserProfile) -> str:
        """Convert user profile to searchable text for embedding generation."""
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
        """Calculate traditional matching score based on exact criteria."""
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
                # Calculate how well the salary matches expectations
                if profile.salary_expectation_max:
                    mid_expectation = (profile.salary_expectation_min + profile.salary_expectation_max) / 2
                    if job.salary_min:
                        job_mid = (job.salary_min + job.salary_max) / 2
                        salary_ratio = min(job_mid / mid_expectation, 1.0)
                    else:
                        salary_ratio = min(job.salary_max / mid_expectation, 1.0)
                    score += salary_ratio * 0.15
                else:
                    score += 0.15
            total_weight += 0.15
            
        # Normalize score by total weight applied
        return score / total_weight if total_weight > 0 else 0.0
        
    def _find_matching_skills(self, profile: UserProfile, job: JobPosting) -> List[str]:
        """Find skills that match between profile and job."""
        user_skills = set(skill.lower() for skill in profile.skills)
        job_skills = set(skill.lower() for skill in (job.required_skills + job.preferred_skills))
        
        matching = user_skills.intersection(job_skills)
        return list(matching)
        
    def _find_skill_gaps(self, profile: UserProfile, job: JobPosting) -> List[str]:
        """Find skills required by job but missing from profile."""
        user_skills = set(skill.lower() for skill in profile.skills)
        required_skills = set(skill.lower() for skill in job.required_skills)
        
        gaps = required_skills - user_skills
        return list(gaps)
        
    def _check_salary_match(self, profile: UserProfile, job: JobPosting) -> Optional[bool]:
        """Check if job salary matches user expectations."""
        if not profile.salary_expectation_min or not job.salary_max:
            return None
            
        return job.salary_max >= profile.salary_expectation_min
        
    def _check_location_match(self, profile: UserProfile, job: JobPosting) -> Optional[bool]:
        """Check if job location matches user preferences."""
        if not profile.preferred_locations or not job.location:
            return None
            
        return any(
            loc.lower() in job.location.lower() 
            for loc in profile.preferred_locations
        )
        
    def _generate_match_explanation(
        self, 
        profile: UserProfile, 
        job: JobPosting, 
        semantic_score: float, 
        traditional_score: float
    ) -> Dict[str, Any]:
        """Generate detailed explanation of why job matches user profile."""
        explanation = {
            "semantic_score": semantic_score,
            "traditional_score": traditional_score,
            "matching_factors": [],
            "concerns": []
        }
        
        # Analyze matching factors
        matching_skills = self._find_matching_skills(profile, job)
        if matching_skills:
            explanation["matching_factors"].append({
                "factor": "skills",
                "details": f"Matching skills: {', '.join(matching_skills)}"
            })
            
        skill_gaps = self._find_skill_gaps(profile, job)
        if skill_gaps:
            explanation["concerns"].append({
                "factor": "skill_gaps",
                "details": f"Missing skills: {', '.join(skill_gaps)}"
            })
            
        # Experience analysis
        if job.experience_level:
            exp_mapping = {'entry': 0, 'junior': 1, 'mid': 3, 'senior': 5, 'lead': 8}
            required_years = exp_mapping.get(job.experience_level.lower(), 0)
            
            if profile.years_experience >= required_years:
                explanation["matching_factors"].append({
                    "factor": "experience",
                    "details": f"Experience requirement met ({profile.years_experience} >= {required_years} years)"
                })
            else:
                explanation["concerns"].append({
                    "factor": "experience",
                    "details": f"May need more experience ({profile.years_experience} < {required_years} years)"
                })
                
        # Salary analysis
        salary_match = self._check_salary_match(profile, job)
        if salary_match is True:
            explanation["matching_factors"].append({
                "factor": "salary",
                "details": "Salary meets expectations"
            })
        elif salary_match is False:
            explanation["concerns"].append({
                "factor": "salary",
                "details": "Salary below expectations"
            })
            
        return explanation
        
    async def generate_embedding(self, request: EmbeddingRequest) -> EmbeddingResponse:
        """Generate embedding for text."""
        start_time = time.time()
        
        try:
            await self.initialize()
            
            if not self.embeddings:
                raise ValueError("OpenAI embeddings not available")
                
            embedding = await self.embeddings.aembed_query(request.text)
            
            return EmbeddingResponse(
                embedding=embedding,
                dimension=len(embedding),
                model_used="text-embedding-ada-002",
                processing_time=time.time() - start_time,
                metadata=request.metadata
            )
            
        except Exception as e:
            logger.error(f"Embedding generation failed: {str(e)}")
            raise
            
    async def batch_generate_embeddings(self, request: BatchEmbeddingRequest) -> BatchEmbeddingResponse:
        """Generate embeddings for multiple texts in batches."""
        start_time = time.time()
        
        try:
            await self.initialize()
            
            if not self.embeddings:
                raise ValueError("OpenAI embeddings not available")
                
            embeddings = []
            errors = []
            successful_count = 0
            
            # Process in batches
            for i in range(0, len(request.texts), request.batch_size):
                batch = request.texts[i:i + request.batch_size]
                
                try:
                    batch_embeddings = await self.embeddings.aembed_documents(batch)
                    embeddings.extend(batch_embeddings)
                    successful_count += len(batch)
                except Exception as e:
                    errors.append(f"Batch {i//request.batch_size + 1}: {str(e)}")
                    # Add empty embeddings for failed batch
                    embeddings.extend([[] for _ in batch])
                    
            return BatchEmbeddingResponse(
                embeddings=embeddings,
                processing_time=time.time() - start_time,
                successful_count=successful_count,
                failed_count=len(request.texts) - successful_count,
                errors=errors
            )
            
        except Exception as e:
            logger.error(f"Batch embedding generation failed: {str(e)}")
            raise
            
    async def store_job_embedding(self, job: JobPosting, embedding: List[float]) -> bool:
        """Store job embedding in Pinecone."""
        try:
            await self.initialize()
            
            if not self.pinecone_index:
                raise ValueError("Pinecone index not available")
                
            # Prepare metadata
            metadata = {
                "id": job.id,
                "title": job.title,
                "company": job.company,
                "location": job.location or "",
                "salary_min": job.salary_min or 0,
                "salary_max": job.salary_max or 0,
                "employment_type": job.employment_type or "",
                "experience_level": job.experience_level or "",
                "industry": job.industry or "",
                "remote_type": job.remote_type or "",
                "required_skills": job.required_skills,
                "preferred_skills": job.preferred_skills,
                "company_size": job.company_size or "",
                "description": job.description[:1000]  # Truncate for metadata limits
            }
            
            # Store in Pinecone
            self.pinecone_index.upsert(
                vectors=[(job.id, embedding, metadata)]
            )
            
            logger.info(f"Stored embedding for job {job.id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to store job embedding: {str(e)}")
            return False
            
    # Helper methods for caching and database operations
    
    def _generate_cache_key(self, request: SemanticSearchRequest) -> str:
        """Generate cache key for search request."""
        key_parts = [
            f"search:{request.user_profile.id}",
            f"type:{request.search_type.value}",
            f"k:{request.top_k}",
            f"threshold:{request.match_threshold}"
        ]
        
        if request.filters:
            # Create a deterministic string from filters
            filter_str = json.dumps(request.filters.dict(), sort_keys=True)
            key_parts.append(f"filters:{hash(filter_str)}")
            
        return ":".join(key_parts)
        
    async def _get_cached_result(self, cache_key: str) -> Optional[SearchResults]:
        """Get cached search results."""
        try:
            if not self.redis_client:
                return None
                
            cached_data = await self.redis_client.get(cache_key)
            if cached_data:
                data = json.loads(cached_data)
                return SearchResults(**data)
                
        except Exception as e:
            logger.warning(f"Cache retrieval failed: {str(e)}")
            
        return None
        
    async def _cache_result(self, cache_key: str, results: SearchResults, ttl: int = 300):
        """Cache search results."""
        try:
            if not self.redis_client:
                return
                
            # Mark as cached
            results.metadata["cache_hit"] = False
            
            await self.redis_client.setex(
                cache_key,
                ttl,
                results.json()
            )
            
        except Exception as e:
            logger.warning(f"Cache storage failed: {str(e)}")
            
    async def _get_jobs_from_database(self, filters: Optional[SearchFilters]) -> List[JobPosting]:
        """Get jobs from database with filters (placeholder implementation)."""
        # This would typically query your actual job database
        # For now, return empty list as this needs to be connected to your actual data source
        logger.info("Getting jobs from database (placeholder implementation)")
        return []
        
    def _extract_keywords(self, profile: UserProfile) -> List[str]:
        """Extract keywords from user profile."""
        keywords = []
        keywords.extend(profile.skills)
        
        if profile.career_goals:
            # Simple keyword extraction - in production, use NLP
            keywords.extend(profile.career_goals.lower().split())
            
        return [kw.lower().strip() for kw in keywords if kw.strip()]
        
    def _extract_job_keywords(self, job: JobPosting) -> List[str]:
        """Extract keywords from job posting."""
        keywords = []
        keywords.extend(job.required_skills)
        keywords.extend(job.preferred_skills)
        
        # Extract from title and description
        keywords.extend(job.title.lower().split())
        keywords.extend(job.description.lower().split()[:50])  # First 50 words
        
        return [kw.lower().strip() for kw in keywords if kw.strip()]
        
    def _calculate_keyword_similarity(self, profile_keywords: List[str], job_keywords: List[str]) -> float:
        """Calculate similarity between keyword sets."""
        if not profile_keywords or not job_keywords:
            return 0.0
            
        profile_set = set(profile_keywords)
        job_set = set(job_keywords)
        
        intersection = profile_set.intersection(job_set)
        union = profile_set.union(job_set)
        
        return len(intersection) / len(union) if union else 0.0
        
    def _generate_keyword_explanation(
        self, 
        profile_keywords: List[str], 
        job_keywords: List[str], 
        traditional_score: float
    ) -> Dict[str, Any]:
        """Generate explanation for keyword-based matching."""
        matching_keywords = list(set(profile_keywords).intersection(set(job_keywords)))
        
        return {
            "search_type": "keyword",
            "traditional_score": traditional_score,
            "matching_keywords": matching_keywords[:10],  # Limit to top 10
            "keyword_match_count": len(matching_keywords)
        }
        
    def _combine_search_results(
        self, 
        semantic_matches: List[JobMatch], 
        keyword_matches: List[JobMatch]
    ) -> List[JobMatch]:
        """Combine and deduplicate search results from different methods."""
        combined = {}
        
        # Add semantic matches
        for match in semantic_matches:
            combined[match.job.id] = match
            
        # Add keyword matches, updating scores if job already exists
        for match in keyword_matches:
            if match.job.id in combined:
                # Average the scores for jobs found by both methods
                existing = combined[match.job.id]
                existing.semantic_score = (existing.semantic_score + match.semantic_score) / 2
                existing.traditional_score = (existing.traditional_score + match.traditional_score) / 2
                existing.composite_score = (existing.semantic_score * 0.6) + (existing.traditional_score * 0.4)
            else:
                combined[match.job.id] = match
                
        return list(combined.values())
        
    def _apply_filters(self, matches: List[JobMatch], filters: SearchFilters) -> List[JobMatch]:
        """Apply search filters to job matches."""
        filtered_matches = []
        
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
                
            if filters.salary_max and job.salary_min and job.salary_min > filters.salary_max:
                continue
                
            # Employment type filter
            if filters.employment_types:
                if not job.employment_type or job.employment_type not in filters.employment_types:
                    continue
                    
            # Experience level filter
            if filters.experience_levels:
                if not job.experience_level or job.experience_level not in filters.experience_levels:
                    continue
                    
            # Industry filter
            if filters.industries:
                if not job.industry or job.industry not in filters.industries:
                    continue
                    
            # Remote type filter
            if filters.remote_types:
                if not job.remote_type or job.remote_type not in filters.remote_types:
                    continue
                    
            # Required skills filter
            if filters.required_skills:
                job_skills = set(skill.lower() for skill in job.required_skills)
                filter_skills = set(skill.lower() for skill in filters.required_skills)
                if not filter_skills.intersection(job_skills):
                    continue
                    
            filtered_matches.append(match)
            
        return filtered_matches
        
    def _create_pinecone_filters(self, filters: SearchFilters) -> Dict[str, Any]:
        """Create Pinecone metadata filters from search filters."""
        pinecone_filters = {}
        
        if filters.locations:
            pinecone_filters["location"] = {"$in": filters.locations}
            
        if filters.salary_min:
            pinecone_filters["salary_max"] = {"$gte": filters.salary_min}
            
        if filters.employment_types:
            pinecone_filters["employment_type"] = {"$in": filters.employment_types}
            
        if filters.industries:
            pinecone_filters["industry"] = {"$in": filters.industries}
            
        if filters.remote_types:
            pinecone_filters["remote_type"] = {"$in": filters.remote_types}
            
        return pinecone_filters
        
    async def _keyword_search_fallback(
        self, 
        request: SemanticSearchRequest, 
        start_time: float
    ) -> SearchResults:
        """Fallback keyword search when semantic search fails."""
        try:
            matches = await self._keyword_search(request)
            
            return SearchResults(
                matches=matches,
                total_found=len(matches),
                search_type=SearchType.KEYWORD,
                processing_time=time.time() - start_time,
                user_id=request.user_profile.id,
                filters_applied=request.filters,
                metadata={
                    "fallback": True,
                    "original_search_type": request.search_type.value
                }
            )
            
        except Exception as e:
            logger.error(f"Fallback search also failed: {str(e)}")
            # Return empty results rather than failing completely
            return SearchResults(
                matches=[],
                total_found=0,
                search_type=SearchType.KEYWORD,
                processing_time=time.time() - start_time,
                user_id=request.user_profile.id,
                filters_applied=request.filters,
                metadata={
                    "error": "All search methods failed",
                    "fallback": True
                }
            )


# Global service instance (legacy - kept for compatibility)
semantic_search_service = None


async def get_semantic_search_service_legacy():
    """Get the legacy semantic search service instance."""
    # This is kept for backward compatibility
    # Use get_semantic_search_service with dependencies instead
    pass
# Enhanced methods for the semantic search service

    async def _enhanced_semantic_search(self, request: SemanticSearchRequest) -> List[JobMatch]:
        """Enhanced semantic search with improved vector operations."""
        try:
            self.logger.info("Performing enhanced semantic search", user_id=request.user_profile.id)
            
            # Generate enhanced user profile embedding
            profile_text = self._create_enhanced_profile_text(request.user_profile)
            
            # Check embedding cache first
            cache_key = f"embedding:{hash(profile_text)}"
            cached_embedding = await self._get_cached_embedding(cache_key)
            
            if cached_embedding:
                profile_embedding = cached_embedding
            else:
                profile_embedding = await self.embeddings.aembed_query(profile_text)
                await self._cache_embedding(cache_key, profile_embedding)
            
            # Enhanced Pinecone search with better filtering
            search_results = self.pinecone_index.query(
                vector=profile_embedding,
                top_k=min(request.top_k * 3, 200),  # Get more results for better filtering
                include_metadata=True,
                include_values=False,
                filter=self._create_enhanced_pinecone_filters(request.filters) if request.filters else None
            )
            
            matches = []
            for match in search_results.matches:
                try:
                    job_data = match.metadata
                    job = JobPosting(**job_data)
                    
                    # Enhanced scoring with multiple factors
                    semantic_score = float(match.score)
                    traditional_score = await self._calculate_enhanced_traditional_match(
                        request.user_profile, job
                    )
                    
                    # Advanced composite scoring
                    composite_score = await self._calculate_advanced_composite_score(
                        semantic_score, traditional_score, request.user_profile, job
                    )
                    
                    if composite_score >= request.match_threshold:
                        job_match = JobMatch(
                            job=job,
                            semantic_score=semantic_score,
                            traditional_score=traditional_score,
                            composite_score=composite_score,
                            matching_skills=self._find_matching_skills(request.user_profile, job),
                            skill_gaps=self._find_skill_gaps(request.user_profile, job),
                            salary_match=self._check_salary_match(request.user_profile, job),
                            location_match=self._check_location_match(request.user_profile, job)
                        )
                        matches.append(job_match)
                        
                except Exception as e:
                    self.logger.warning(f"Failed to process job match: {str(e)}")
                    continue
                    
            return matches
            
        except Exception as e:
            self.logger.error(f"Enhanced semantic search failed: {str(e)}")
            raise VectorSearchException(f"Semantic search failed: {str(e)}")

    async def _enhanced_keyword_search(self, request: SemanticSearchRequest) -> List[JobMatch]:
        """Enhanced keyword search with Elasticsearch integration."""
        try:
            self.logger.info("Performing enhanced keyword search", user_id=request.user_profile.id)
            
            if self.elasticsearch_client:
                return await self._elasticsearch_search(request)
            else:
                return await self._fallback_keyword_search(request)
                
        except Exception as e:
            self.logger.error(f"Enhanced keyword search failed: {str(e)}")
            return await self._fallback_keyword_search(request)

    async def _enhanced_hybrid_search(self, request: SemanticSearchRequest) -> List[JobMatch]:
        """Enhanced hybrid search combining multiple approaches."""
        try:
            self.logger.info("Performing enhanced hybrid search", user_id=request.user_profile.id)
            
            # Run searches in parallel
            semantic_task = asyncio.create_task(self._enhanced_semantic_search(request))
            keyword_task = asyncio.create_task(self._enhanced_keyword_search(request))
            
            # Wait for both to complete
            semantic_matches, keyword_matches = await asyncio.gather(
                semantic_task, keyword_task, return_exceptions=True
            )
            
            # Handle exceptions
            if isinstance(semantic_matches, Exception):
                self.logger.warning(f"Semantic search failed in hybrid mode: {semantic_matches}")
                semantic_matches = []
                
            if isinstance(keyword_matches, Exception):
                self.logger.warning(f"Keyword search failed in hybrid mode: {keyword_matches}")
                keyword_matches = []
            
            # Enhanced result combination with weighted scoring
            combined_matches = await self._enhanced_combine_results(
                semantic_matches, keyword_matches, request.user_profile
            )
            
            return combined_matches
            
        except Exception as e:
            self.logger.error(f"Enhanced hybrid search failed: {str(e)}")
            raise VectorSearchException(f"Hybrid search failed: {str(e)}")

    async def _elasticsearch_search(self, request: SemanticSearchRequest) -> List[JobMatch]:
        """Perform search using Elasticsearch."""
        try:
            # Build Elasticsearch query
            query = {
                "bool": {
                    "should": [
                        {
                            "multi_match": {
                                "query": " ".join(request.user_profile.skills),
                                "fields": ["required_skills^2", "preferred_skills", "description"],
                                "type": "best_fields"
                            }
                        },
                        {
                            "match": {
                                "title": {
                                    "query": " ".join(request.user_profile.preferred_roles or []),
                                    "boost": 1.5
                                }
                            }
                        }
                    ],
                    "minimum_should_match": 1
                }
            }
            
            # Add filters
            if request.filters:
                query["bool"]["filter"] = self._create_elasticsearch_filters(request.filters)
            
            # Execute search
            response = await self.elasticsearch_client.search(
                index="jobs",
                body={
                    "query": query,
                    "size": request.top_k * 2,
                    "_source": True
                }
            )
            
            matches = []
            for hit in response["hits"]["hits"]:
                try:
                    job_data = hit["_source"]
                    job = JobPosting(**job_data)
                    
                    # Use Elasticsearch score as semantic score
                    semantic_score = min(hit["_score"] / 10.0, 1.0)  # Normalize
                    traditional_score = await self._calculate_enhanced_traditional_match(
                        request.user_profile, job
                    )
                    
                    composite_score = (semantic_score * 0.4) + (traditional_score * 0.6)
                    
                    if composite_score >= request.match_threshold:
                        job_match = JobMatch(
                            job=job,
                            semantic_score=semantic_score,
                            traditional_score=traditional_score,
                            composite_score=composite_score,
                            matching_skills=self._find_matching_skills(request.user_profile, job),
                            skill_gaps=self._find_skill_gaps(request.user_profile, job),
                            salary_match=self._check_salary_match(request.user_profile, job),
                            location_match=self._check_location_match(request.user_profile, job)
                        )
                        matches.append(job_match)
                        
                except Exception as e:
                    self.logger.warning(f"Failed to process Elasticsearch result: {str(e)}")
                    continue
                    
            return matches
            
        except Exception as e:
            self.logger.error(f"Elasticsearch search failed: {str(e)}")
            raise

    def _create_enhanced_profile_text(self, profile: UserProfile) -> str:
        """Create enhanced profile text with better structure for embeddings."""
        sections = []
        
        # Skills section with categorization
        if profile.skills:
            skills_text = f"Technical Skills and Expertise: {', '.join(profile.skills)}"
            sections.append(skills_text)
        
        # Experience section with detailed formatting
        if profile.experience:
            exp_parts = []
            for exp in profile.experience:
                title = exp.get('title', '')
                company = exp.get('company', '')
                description = exp.get('description', '')
                achievements = exp.get('achievements', '')
                
                exp_text = f"{title} at {company}"
                if description:
                    exp_text += f" - {description}"
                if achievements:
                    exp_text += f" Achievements: {achievements}"
                    
                exp_parts.append(exp_text)
            
            sections.append(f"Professional Experience: {' | '.join(exp_parts)}")
        
        # Education with emphasis on relevant fields
        if profile.education:
            edu_parts = []
            for edu in profile.education:
                degree = edu.get('degree', '')
                field = edu.get('field', '')
                institution = edu.get('institution', '')
                
                edu_text = f"{degree}"
                if field:
                    edu_text += f" in {field}"
                if institution:
                    edu_text += f" from {institution}"
                    
                edu_parts.append(edu_text)
            
            sections.append(f"Education: {' | '.join(edu_parts)}")
        
        # Career objectives and preferences
        if profile.career_goals:
            sections.append(f"Career Objectives: {profile.career_goals}")
        
        if profile.industry_preferences:
            sections.append(f"Industry Interests: {', '.join(profile.industry_preferences)}")
        
        if profile.preferred_roles:
            sections.append(f"Target Roles: {', '.join(profile.preferred_roles)}")
        
        return " | ".join(sections)

    async def _calculate_enhanced_traditional_match(
        self, profile: UserProfile, job: JobPosting
    ) -> float:
        """Enhanced traditional matching with more sophisticated scoring."""
        scores = []
        weights = []
        
        # Enhanced skill matching (35% weight)
        skill_score = await self._calculate_skill_match_score(profile, job)
        scores.append(skill_score)
        weights.append(0.35)
        
        # Experience matching with level analysis (25% weight)
        exp_score = self._calculate_experience_match_score(profile, job)
        scores.append(exp_score)
        weights.append(0.25)
        
        # Location and remote preferences (15% weight)
        location_score = self._calculate_location_match_score(profile, job)
        scores.append(location_score)
        weights.append(0.15)
        
        # Salary alignment (15% weight)
        salary_score = self._calculate_salary_match_score(profile, job)
        scores.append(salary_score)
        weights.append(0.15)
        
        # Industry and role alignment (10% weight)
        industry_score = self._calculate_industry_match_score(profile, job)
        scores.append(industry_score)
        weights.append(0.10)
        
        # Calculate weighted average
        weighted_score = sum(score * weight for score, weight in zip(scores, weights))
        return min(weighted_score, 1.0)

    async def _calculate_skill_match_score(self, profile: UserProfile, job: JobPosting) -> float:
        """Calculate sophisticated skill matching score."""
        if not profile.skills or not job.required_skills:
            return 0.0
        
        user_skills = set(skill.lower().strip() for skill in profile.skills)
        required_skills = set(skill.lower().strip() for skill in job.required_skills)
        preferred_skills = set(skill.lower().strip() for skill in job.preferred_skills)
        
        # Exact matches
        required_matches = user_skills.intersection(required_skills)
        preferred_matches = user_skills.intersection(preferred_skills)
        
        # Calculate scores
        required_score = len(required_matches) / len(required_skills) if required_skills else 0
        preferred_score = len(preferred_matches) / len(preferred_skills) if preferred_skills else 0
        
        # Weighted combination (required skills are more important)
        skill_score = (required_score * 0.8) + (preferred_score * 0.2)
        
        # Bonus for having more skills than required
        if len(user_skills) > len(required_skills):
            bonus = min(0.1, (len(user_skills) - len(required_skills)) * 0.02)
            skill_score += bonus
        
        return min(skill_score, 1.0)

    def _calculate_experience_match_score(self, profile: UserProfile, job: JobPosting) -> float:
        """Calculate experience matching score with level analysis."""
        if not hasattr(profile, 'years_experience') or not job.experience_level:
            return 0.5  # Neutral score if data is missing
        
        # Experience level mapping
        level_years = {
            'entry': 0, 'junior': 1, 'associate': 2, 'mid': 3, 'senior': 5, 
            'lead': 7, 'principal': 10, 'director': 12, 'vp': 15, 'executive': 20
        }
        
        required_years = level_years.get(job.experience_level.lower(), 3)
        user_years = getattr(profile, 'years_experience', 0)
        
        if user_years >= required_years:
            # Perfect match or overqualified
            if user_years <= required_years * 1.5:
                return 1.0  # Perfect range
            else:
                # Slightly penalize overqualification
                return max(0.8, 1.0 - (user_years - required_years * 1.5) * 0.05)
        else:
            # Underqualified but may still be viable
            ratio = user_years / required_years if required_years > 0 else 0
            return max(0.2, ratio * 0.8)

    def _calculate_location_match_score(self, profile: UserProfile, job: JobPosting) -> float:
        """Calculate location and remote work matching score."""
        if not profile.preferred_locations and not hasattr(profile, 'remote_preferences'):
            return 0.5  # Neutral if no preferences specified
        
        score = 0.0
        
        # Check location match
        if profile.preferred_locations and job.location:
            location_match = any(
                loc.lower() in job.location.lower() 
                for loc in profile.preferred_locations
            )
            if location_match:
                score += 0.6
        
        # Check remote work preferences
        if hasattr(profile, 'remote_preferences') and job.remote_type:
            remote_prefs = getattr(profile, 'remote_preferences', [])
            if job.remote_type.lower() in [pref.lower() for pref in remote_prefs]:
                score += 0.4
        
        return min(score, 1.0)

    def _calculate_salary_match_score(self, profile: UserProfile, job: JobPosting) -> float:
        """Calculate salary matching score with range analysis."""
        if not profile.salary_expectation_min or not job.salary_max:
            return 0.5  # Neutral if salary info is missing
        
        # Check if job meets minimum expectations
        if job.salary_max < profile.salary_expectation_min:
            return 0.0  # Below minimum expectations
        
        # Calculate how well the salary range aligns
        if profile.salary_expectation_max:
            profile_mid = (profile.salary_expectation_min + profile.salary_expectation_max) / 2
            
            if job.salary_min:
                job_mid = (job.salary_min + job.salary_max) / 2
                
                # Perfect match if job midpoint is within 10% of profile midpoint
                diff_ratio = abs(job_mid - profile_mid) / profile_mid
                if diff_ratio <= 0.1:
                    return 1.0
                elif diff_ratio <= 0.2:
                    return 0.8
                elif diff_ratio <= 0.3:
                    return 0.6
                else:
                    return 0.4
            else:
                # Only max salary available
                if job.salary_max >= profile_mid:
                    return 0.8
                else:
                    return 0.6
        else:
            # Only minimum expectation available
            if job.salary_max >= profile.salary_expectation_min * 1.2:
                return 0.8
            else:
                return 0.6

    def _calculate_industry_match_score(self, profile: UserProfile, job: JobPosting) -> float:
        """Calculate industry and role alignment score."""
        score = 0.0
        
        # Industry match
        if hasattr(profile, 'industry_preferences') and job.industry:
            industry_prefs = getattr(profile, 'industry_preferences', [])
            if any(ind.lower() in job.industry.lower() for ind in industry_prefs):
                score += 0.5
        
        # Role/title match
        if hasattr(profile, 'preferred_roles') and job.title:
            role_prefs = getattr(profile, 'preferred_roles', [])
            if any(role.lower() in job.title.lower() for role in role_prefs):
                score += 0.5
        
        return min(score, 1.0)

    async def _calculate_advanced_composite_score(
        self, semantic_score: float, traditional_score: float, 
        profile: UserProfile, job: JobPosting
    ) -> float:
        """Calculate advanced composite score with dynamic weighting."""
        
        # Base weighted score
        base_score = (semantic_score * 0.6) + (traditional_score * 0.4)
        
        # Apply dynamic adjustments based on job characteristics
        adjustments = 0.0
        
        # Boost for high-demand skills
        high_demand_skills = {'python', 'javascript', 'react', 'aws', 'kubernetes', 'machine learning'}
        user_skills = set(skill.lower() for skill in profile.skills)
        job_skills = set(skill.lower() for skill in job.required_skills)
        
        high_demand_matches = user_skills.intersection(job_skills).intersection(high_demand_skills)
        if high_demand_matches:
            adjustments += len(high_demand_matches) * 0.02
        
        # Boost for recent job postings
        if hasattr(job, 'posted_date') and job.posted_date:
            from datetime import datetime, timedelta
            if job.posted_date > datetime.now() - timedelta(days=7):
                adjustments += 0.05
        
        # Penalty for significant skill gaps in required skills
        skill_gaps = self._find_skill_gaps(profile, job)
        if len(skill_gaps) > 3:
            adjustments -= 0.1
        
        final_score = base_score + adjustments
        return max(0.0, min(1.0, final_score))

    async def _apply_advanced_filters(
        self, matches: List[JobMatch], filters: SearchFilters
    ) -> List[JobMatch]:
        """Apply advanced filtering with fuzzy matching."""
        if not filters:
            return matches
        
        filtered_matches = []
        
        for match in matches:
            job = match.job
            
            # Advanced location filtering with fuzzy matching
            if filters.locations:
                location_match = False
                if job.location:
                    for filter_loc in filters.locations:
                        # Exact match
                        if filter_loc.lower() in job.location.lower():
                            location_match = True
                            break
                        # Fuzzy match for cities/states
                        if self._fuzzy_location_match(filter_loc, job.location):
                            location_match = True
                            break
                
                if not location_match:
                    continue
            
            # Advanced salary filtering with range overlap
            if filters.salary_min or filters.salary_max:
                if not self._salary_range_overlap(filters, job):
                    continue
            
            # Other filters (employment type, experience, etc.)
            if not self._apply_standard_filters(filters, job):
                continue
            
            filtered_matches.append(match)
        
        return filtered_matches

    def _fuzzy_location_match(self, filter_location: str, job_location: str) -> bool:
        """Perform fuzzy location matching."""
        # Simple fuzzy matching - in production, use a proper fuzzy matching library
        filter_words = set(filter_location.lower().split())
        job_words = set(job_location.lower().split())
        
        # Check if any words match
        return len(filter_words.intersection(job_words)) > 0

    def _salary_range_overlap(self, filters: SearchFilters, job: JobPosting) -> bool:
        """Check if salary ranges overlap."""
        job_min = job.salary_min or 0
        job_max = job.salary_max or float('inf')
        
        filter_min = filters.salary_min or 0
        filter_max = filters.salary_max or float('inf')
        
        # Check for range overlap
        return not (job_max < filter_min or job_min > filter_max)

    def _apply_standard_filters(self, filters: SearchFilters, job: JobPosting) -> bool:
        """Apply standard filters (employment type, experience, etc.)."""
        
        # Employment type filter
        if filters.employment_types:
            if not job.employment_type or job.employment_type not in filters.employment_types:
                return False
        
        # Experience level filter
        if filters.experience_levels:
            if not job.experience_level or job.experience_level not in filters.experience_levels:
                return False
        
        # Industry filter
        if filters.industries:
            if not job.industry or job.industry not in filters.industries:
                return False
        
        # Remote type filter
        if filters.remote_types:
            if not job.remote_type or job.remote_type not in filters.remote_types:
                return False
        
        return True

    async def _enhanced_combine_results(
        self, semantic_matches: List[JobMatch], keyword_matches: List[JobMatch],
        profile: UserProfile
    ) -> List[JobMatch]:
        """Enhanced result combination with intelligent merging."""
        combined = {}
        
        # Add semantic matches with higher weight
        for match in semantic_matches:
            match.metadata = {"source": "semantic", "weight": 0.7}
            combined[match.job.id] = match
        
        # Add keyword matches, merging if job already exists
        for match in keyword_matches:
            if match.job.id in combined:
                existing = combined[match.job.id]
                
                # Weighted average based on source reliability
                semantic_weight = 0.7
                keyword_weight = 0.3
                
                existing.semantic_score = (
                    existing.semantic_score * semantic_weight + 
                    match.semantic_score * keyword_weight
                )
                existing.traditional_score = (
                    existing.traditional_score * semantic_weight + 
                    match.traditional_score * keyword_weight
                )
                
                # Recalculate composite score
                existing.composite_score = await self._calculate_advanced_composite_score(
                    existing.semantic_score, existing.traditional_score, profile, existing.job
                )
                
                existing.metadata = {"source": "hybrid", "weight": 1.0}
            else:
                match.metadata = {"source": "keyword", "weight": 0.3}
                combined[match.job.id] = match
        
        return list(combined.values())

    async def _generate_match_explanation(
        self, match: JobMatch, profile: UserProfile
    ) -> Dict[str, Any]:
        """Generate detailed match explanation with insights."""
        
        explanation = {
            "overall_score": match.composite_score,
            "semantic_score": match.semantic_score,
            "traditional_score": match.traditional_score,
            "strengths": [],
            "concerns": [],
            "recommendations": []
        }
        
        # Analyze strengths
        if match.matching_skills:
            explanation["strengths"].append({
                "category": "skills",
                "description": f"Strong skill match: {', '.join(match.matching_skills[:5])}",
                "impact": "high"
            })
        
        if match.salary_match:
            explanation["strengths"].append({
                "category": "compensation",
                "description": "Salary meets your expectations",
                "impact": "medium"
            })
        
        if match.location_match:
            explanation["strengths"].append({
                "category": "location",
                "description": "Location matches your preferences",
                "impact": "medium"
            })
        
        # Analyze concerns
        if match.skill_gaps:
            explanation["concerns"].append({
                "category": "skills",
                "description": f"Missing required skills: {', '.join(match.skill_gaps[:3])}",
                "severity": "medium" if len(match.skill_gaps) <= 2 else "high"
            })
        
        # Generate recommendations
        if match.skill_gaps:
            explanation["recommendations"].append({
                "category": "skill_development",
                "description": f"Consider learning: {', '.join(match.skill_gaps[:2])}",
                "priority": "high"
            })
        
        if match.composite_score > 0.8:
            explanation["recommendations"].append({
                "category": "application",
                "description": "This is an excellent match - consider applying soon",
                "priority": "high"
            })
        
        return explanation

    async def _get_cached_embedding(self, cache_key: str) -> Optional[List[float]]:
        """Get cached embedding."""
        try:
            cached_data = await self.redis.get(cache_key)
            if cached_data:
                return json.loads(cached_data)
        except Exception as e:
            self.logger.warning(f"Failed to get cached embedding: {e}")
        return None

    async def _cache_embedding(self, cache_key: str, embedding: List[float]) -> None:
        """Cache embedding."""
        try:
            await self.redis.setex(
                cache_key, 
                self.embedding_cache_ttl, 
                json.dumps(embedding)
            )
        except Exception as e:
            self.logger.warning(f"Failed to cache embedding: {e}")

    def _create_enhanced_pinecone_filters(self, filters: SearchFilters) -> Dict[str, Any]:
        """Create enhanced Pinecone filters with better logic."""
        pinecone_filters = {}
        
        if filters.locations:
            # Use OR logic for multiple locations
            pinecone_filters["location"] = {"$in": filters.locations}
        
        if filters.salary_min:
            pinecone_filters["salary_max"] = {"$gte": filters.salary_min}
        
        if filters.salary_max:
            pinecone_filters["salary_min"] = {"$lte": filters.salary_max}
        
        if filters.employment_types:
            pinecone_filters["employment_type"] = {"$in": filters.employment_types}
        
        if filters.experience_levels:
            pinecone_filters["experience_level"] = {"$in": filters.experience_levels}
        
        if filters.industries:
            pinecone_filters["industry"] = {"$in": filters.industries}
        
        if filters.remote_types:
            pinecone_filters["remote_type"] = {"$in": filters.remote_types}
        
        return pinecone_filters

    def _create_elasticsearch_filters(self, filters: SearchFilters) -> List[Dict[str, Any]]:
        """Create Elasticsearch filters."""
        es_filters = []
        
        if filters.locations:
            es_filters.append({
                "terms": {"location.keyword": filters.locations}
            })
        
        if filters.salary_min:
            es_filters.append({
                "range": {"salary_max": {"gte": filters.salary_min}}
            })
        
        if filters.salary_max:
            es_filters.append({
                "range": {"salary_min": {"lte": filters.salary_max}}
            })
        
        if filters.employment_types:
            es_filters.append({
                "terms": {"employment_type.keyword": filters.employment_types}
            })
        
        return es_filters

    async def _fallback_keyword_search(self, request: SemanticSearchRequest) -> List[JobMatch]:
        """Fallback keyword search when Elasticsearch is not available."""
        self.logger.info("Using fallback keyword search")
        
        # This would typically query your job database
        # For now, return empty list as placeholder
        return []


# Update the global service instance to use the enhanced version
enhanced_semantic_search_service = None

async def get_semantic_search_service(dependencies: ServiceDependencies = None) -> EnhancedSemanticSearchService:
    """Get the enhanced semantic search service instance."""
    global enhanced_semantic_search_service
    
    if enhanced_semantic_search_service is None and dependencies:
        enhanced_semantic_search_service = EnhancedSemanticSearchService(dependencies)
        await enhanced_semantic_search_service.initialize()
    
    return enhanced_semantic_search_service