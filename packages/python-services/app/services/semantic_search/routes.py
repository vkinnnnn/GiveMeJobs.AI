"""Semantic Search Service routes."""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import List

from app.core.auth import ServiceAuth, get_current_auth
from app.core.logging import get_logger
from .service import get_semantic_search_service, SemanticSearchService
from .models import (
    SemanticSearchRequest, SearchResults, EmbeddingRequest, EmbeddingResponse,
    BatchEmbeddingRequest, BatchEmbeddingResponse, VectorSearchRequest,
    VectorSearchResponse, JobPosting, UserProfile, SearchFilters,
    SimilarityRequest, SimilarityResponse
)

logger = get_logger(__name__)
router = APIRouter()


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "semantic-search",
        "version": "1.0.0",
        "timestamp": "2024-01-01T00:00:00Z"
    }


@router.get("/status")
async def service_status(auth: ServiceAuth = Depends(get_current_auth)):
    """Service status endpoint with authentication."""
    logger.info("Service status requested", service=auth.service_name)
    
    try:
        service = await get_semantic_search_service()
        
        return {
            "service": "semantic-search",
            "status": "operational",
            "initialized": service._initialized,
            "features": [
                "vector-embeddings",
                "semantic-matching",
                "composite-scoring",
                "keyword-fallback",
                "hybrid-search",
                "batch-processing"
            ],
            "capabilities": {
                "openai_embeddings": service.embeddings is not None,
                "pinecone_index": service.pinecone_index is not None,
                "redis_cache": service.redis_client is not None
            }
        }
    except Exception as e:
        logger.error(f"Status check failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Service status check failed")


@router.post("/search", response_model=SearchResults)
async def search_jobs(
    request: SemanticSearchRequest,
    auth: ServiceAuth = Depends(get_current_auth)
):
    """Main semantic search endpoint for job matching."""
    logger.info(
        "Search request received",
        user_id=request.user_profile.id,
        search_type=request.search_type.value,
        top_k=request.top_k,
        service=auth.service_name
    )
    
    try:
        service = await get_semantic_search_service()
        results = await service.search_jobs(request)
        
        logger.info(
            "Search completed successfully",
            user_id=request.user_profile.id,
            results_count=results.total_found,
            processing_time=results.processing_time
        )
        
        return results
        
    except Exception as e:
        logger.error(
            f"Search failed: {str(e)}",
            user_id=request.user_profile.id,
            search_type=request.search_type.value
        )
        raise HTTPException(
            status_code=500,
            detail=f"Search operation failed: {str(e)}"
        )


@router.post("/embeddings/generate", response_model=EmbeddingResponse)
async def generate_embedding(
    request: EmbeddingRequest,
    auth: ServiceAuth = Depends(get_current_auth)
):
    """Generate embedding for a single text."""
    logger.info(
        "Embedding generation requested",
        text_length=len(request.text),
        embedding_type=request.embedding_type,
        service=auth.service_name
    )
    
    try:
        service = await get_semantic_search_service()
        response = await service.generate_embedding(request)
        
        logger.info(
            "Embedding generated successfully",
            dimension=response.dimension,
            processing_time=response.processing_time
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Embedding generation failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Embedding generation failed: {str(e)}"
        )


@router.post("/embeddings/batch", response_model=BatchEmbeddingResponse)
async def generate_batch_embeddings(
    request: BatchEmbeddingRequest,
    background_tasks: BackgroundTasks,
    auth: ServiceAuth = Depends(get_current_auth)
):
    """Generate embeddings for multiple texts in batch."""
    logger.info(
        "Batch embedding generation requested",
        text_count=len(request.texts),
        batch_size=request.batch_size,
        embedding_type=request.embedding_type,
        service=auth.service_name
    )
    
    try:
        service = await get_semantic_search_service()
        response = await service.batch_generate_embeddings(request)
        
        logger.info(
            "Batch embeddings generated",
            successful_count=response.successful_count,
            failed_count=response.failed_count,
            processing_time=response.processing_time
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Batch embedding generation failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Batch embedding generation failed: {str(e)}"
        )


@router.post("/jobs/store-embedding")
async def store_job_embedding(
    job: JobPosting,
    embedding: List[float],
    background_tasks: BackgroundTasks,
    auth: ServiceAuth = Depends(get_current_auth)
):
    """Store job embedding in vector database."""
    logger.info(
        "Job embedding storage requested",
        job_id=job.id,
        embedding_dimension=len(embedding),
        service=auth.service_name
    )
    
    try:
        service = await get_semantic_search_service()
        
        # Store embedding in background
        background_tasks.add_task(
            service.store_job_embedding,
            job,
            embedding
        )
        
        return {
            "status": "accepted",
            "job_id": job.id,
            "message": "Embedding storage queued for processing"
        }
        
    except Exception as e:
        logger.error(f"Job embedding storage failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Job embedding storage failed: {str(e)}"
        )


@router.post("/similarity/calculate", response_model=SimilarityResponse)
async def calculate_similarity(
    request: SimilarityRequest,
    auth: ServiceAuth = Depends(get_current_auth)
):
    """Calculate similarity between two vectors."""
    logger.info(
        "Similarity calculation requested",
        vector1_dim=len(request.vector1),
        vector2_dim=len(request.vector2),
        similarity_type=request.similarity_type.value,
        service=auth.service_name
    )
    
    try:
        import time
        import numpy as np
        from sklearn.metrics.pairwise import cosine_similarity, euclidean_distances
        
        start_time = time.time()
        
        if len(request.vector1) != len(request.vector2):
            raise ValueError("Vectors must have the same dimension")
            
        vec1 = np.array(request.vector1).reshape(1, -1)
        vec2 = np.array(request.vector2).reshape(1, -1)
        
        if request.similarity_type.value == "cosine_similarity":
            similarity = float(cosine_similarity(vec1, vec2)[0][0])
        elif request.similarity_type.value == "euclidean_distance":
            # Convert distance to similarity (0-1 range)
            distance = float(euclidean_distances(vec1, vec2)[0][0])
            similarity = 1.0 / (1.0 + distance)
        elif request.similarity_type.value == "dot_product":
            similarity = float(np.dot(vec1, vec2.T)[0][0])
        else:
            raise ValueError(f"Unsupported similarity type: {request.similarity_type}")
            
        processing_time = time.time() - start_time
        
        response = SimilarityResponse(
            similarity_score=similarity,
            similarity_type=request.similarity_type,
            processing_time=processing_time
        )
        
        logger.info(
            "Similarity calculated successfully",
            similarity_score=similarity,
            processing_time=processing_time
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Similarity calculation failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Similarity calculation failed: {str(e)}"
        )


@router.get("/index/stats")
async def get_index_stats(auth: ServiceAuth = Depends(get_current_auth)):
    """Get vector index statistics."""
    logger.info("Index stats requested", service=auth.service_name)
    
    try:
        service = await get_semantic_search_service()
        
        if not service.pinecone_index:
            raise HTTPException(
                status_code=503,
                detail="Vector index not available"
            )
            
        # Get index stats from Pinecone
        stats = service.pinecone_index.describe_index_stats()
        
        return {
            "total_vectors": stats.total_vector_count,
            "dimension": stats.dimension,
            "index_fullness": stats.index_fullness,
            "namespaces": stats.namespaces or {}
        }
        
    except Exception as e:
        logger.error(f"Failed to get index stats: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get index stats: {str(e)}"
        )


@router.post("/search/semantic-only", response_model=SearchResults)
async def semantic_search_only(
    request: SemanticSearchRequest,
    auth: ServiceAuth = Depends(get_current_auth)
):
    """Perform semantic search only (no traditional matching)."""
    logger.info(
        "Semantic-only search requested",
        user_id=request.user_profile.id,
        top_k=request.top_k,
        service=auth.service_name
    )
    
    try:
        service = await get_semantic_search_service()
        
        # Force semantic search type
        request.search_type = "semantic"
        results = await service.search_jobs(request)
        
        return results
        
    except Exception as e:
        logger.error(f"Semantic-only search failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Semantic search failed: {str(e)}"
        )


@router.post("/search/keyword-only", response_model=SearchResults)
async def keyword_search_only(
    request: SemanticSearchRequest,
    auth: ServiceAuth = Depends(get_current_auth)
):
    """Perform keyword search only (no semantic matching)."""
    logger.info(
        "Keyword-only search requested",
        user_id=request.user_profile.id,
        top_k=request.top_k,
        service=auth.service_name
    )
    
    try:
        service = await get_semantic_search_service()
        
        # Force keyword search type
        request.search_type = "keyword"
        results = await service.search_jobs(request)
        
        return results
        
    except Exception as e:
        logger.error(f"Keyword-only search failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Keyword search failed: {str(e)}"
        )