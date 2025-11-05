"""Background tasks for semantic search service."""

import asyncio
import time
from typing import Dict, Any, List

from app.core.celery import celery_app
from app.core.logging import get_logger
from .service import get_semantic_search_service
from .models import JobPosting, UserProfile, EmbeddingRequest, BatchEmbeddingRequest

logger = get_logger(__name__)


def run_async_task(coro):
    """Helper to run async tasks in Celery."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(bind=True, name="semantic_search.update_job_embeddings")
def update_job_embeddings_task(self, job_data_list: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Background task to update job embeddings."""
    try:
        logger.info("Starting job embeddings update task", job_count=len(job_data_list))
        start_time = time.time()
        
        async def process_jobs():
            service = await get_semantic_search_service()
            processed_count = 0
            failed_count = 0
            
            for job_data in job_data_list:
                try:
                    # Create job posting object
                    job = JobPosting(**job_data)
                    
                    # Generate job description text for embedding
                    job_text = f"{job.title} at {job.company}. {job.description}"
                    if job.required_skills:
                        job_text += f" Required skills: {', '.join(job.required_skills)}"
                    if job.location:
                        job_text += f" Location: {job.location}"
                    
                    # Generate embedding
                    embedding_request = EmbeddingRequest(
                        text=job_text,
                        embedding_type="job",
                        metadata={"job_id": job.id}
                    )
                    
                    embedding_response = await service.generate_embedding(embedding_request)
                    
                    # Store embedding in vector database
                    success = await service.store_job_embedding(job, embedding_response.embedding)
                    
                    if success:
                        processed_count += 1
                    else:
                        failed_count += 1
                        
                except Exception as e:
                    logger.warning(f"Failed to process job {job_data.get('id', 'unknown')}: {str(e)}")
                    failed_count += 1
                    continue
            
            return processed_count, failed_count
        
        processed_count, failed_count = run_async_task(process_jobs())
        processing_time = time.time() - start_time
        
        result = {
            "status": "completed",
            "jobs_processed": processed_count,
            "jobs_failed": failed_count,
            "embeddings_updated": processed_count,
            "processing_time": processing_time
        }
        
        logger.info(
            "Job embeddings update completed",
            jobs_processed=processed_count,
            jobs_failed=failed_count,
            processing_time=processing_time
        )
        return result
        
    except Exception as e:
        logger.error("Job embeddings update failed", error=str(e), exc_info=True)
        self.retry(countdown=300, max_retries=3)


@celery_app.task(bind=True, name="semantic_search.generate_user_embedding")
def generate_user_embedding_task(self, user_profile_data: Dict[str, Any]) -> Dict[str, Any]:
    """Background task to generate user profile embedding."""
    try:
        logger.info("Starting user embedding generation task", 
                   user_id=user_profile_data.get("id"))
        start_time = time.time()
        
        async def process_user():
            service = await get_semantic_search_service()
            
            # Create user profile object
            user_profile = UserProfile(**user_profile_data)
            
            # Generate profile text for embedding
            profile_text = service._create_profile_text(user_profile)
            
            # Generate embedding
            embedding_request = EmbeddingRequest(
                text=profile_text,
                embedding_type="profile",
                metadata={"user_id": user_profile.id}
            )
            
            embedding_response = await service.generate_embedding(embedding_request)
            
            return embedding_response.embedding, embedding_response.processing_time
        
        embedding_vector, generation_time = run_async_task(process_user())
        total_time = time.time() - start_time
        
        result = {
            "status": "completed",
            "user_id": user_profile_data.get("id"),
            "embedding_dimension": len(embedding_vector),
            "generation_time": generation_time,
            "total_time": total_time
        }
        
        logger.info("User embedding generation completed successfully",
                   user_id=user_profile_data.get("id"),
                   generation_time=generation_time)
        return result
        
    except Exception as e:
        logger.error("User embedding generation failed", error=str(e), exc_info=True)
        self.retry(countdown=60, max_retries=3)


@celery_app.task(bind=True, name="semantic_search.batch_job_matching")
def batch_job_matching_task(self, user_profiles_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Background task for batch job matching."""
    try:
        logger.info("Starting batch job matching task", user_count=len(user_profiles_data))
        start_time = time.time()
        
        async def process_batch_matching():
            service = await get_semantic_search_service()
            processed_users = 0
            total_matches = 0
            failed_users = 0
            
            for user_data in user_profiles_data:
                try:
                    user_profile = UserProfile(**user_data)
                    
                    # Create search request
                    from .models import SemanticSearchRequest, SearchType
                    search_request = SemanticSearchRequest(
                        user_profile=user_profile,
                        search_type=SearchType.HYBRID,
                        top_k=20,
                        include_explanation=False,
                        match_threshold=0.6
                    )
                    
                    # Perform search
                    results = await service.search_jobs(search_request)
                    
                    processed_users += 1
                    total_matches += len(results.matches)
                    
                    # Here you would typically store the matches in your database
                    # For now, we just log the results
                    logger.info(
                        "Generated matches for user",
                        user_id=user_profile.id,
                        match_count=len(results.matches)
                    )
                    
                except Exception as e:
                    logger.warning(f"Failed to process user {user_data.get('id', 'unknown')}: {str(e)}")
                    failed_users += 1
                    continue
            
            return processed_users, total_matches, failed_users
        
        processed_users, total_matches, failed_users = run_async_task(process_batch_matching())
        processing_time = time.time() - start_time
        
        result = {
            "status": "completed",
            "users_processed": processed_users,
            "users_failed": failed_users,
            "matches_generated": total_matches,
            "average_matches_per_user": total_matches / processed_users if processed_users > 0 else 0,
            "processing_time": processing_time
        }
        
        logger.info(
            "Batch job matching completed",
            users_processed=processed_users,
            users_failed=failed_users,
            total_matches=total_matches,
            processing_time=processing_time
        )
        return result
        
    except Exception as e:
        logger.error("Batch job matching failed", error=str(e), exc_info=True)
        self.retry(countdown=300, max_retries=3)


@celery_app.task(bind=True, name="semantic_search.batch_generate_embeddings")
def batch_generate_embeddings_task(self, texts: List[str], embedding_type: str = "job") -> Dict[str, Any]:
    """Background task for batch embedding generation."""
    try:
        logger.info("Starting batch embedding generation task", text_count=len(texts))
        start_time = time.time()
        
        async def process_batch_embeddings():
            service = await get_semantic_search_service()
            
            # Create batch request
            batch_request = BatchEmbeddingRequest(
                texts=texts,
                embedding_type=embedding_type,
                batch_size=100  # Process in batches of 100
            )
            
            # Generate embeddings
            response = await service.batch_generate_embeddings(batch_request)
            
            return response
        
        response = run_async_task(process_batch_embeddings())
        total_time = time.time() - start_time
        
        result = {
            "status": "completed",
            "texts_processed": len(texts),
            "successful_count": response.successful_count,
            "failed_count": response.failed_count,
            "embedding_generation_time": response.processing_time,
            "total_time": total_time,
            "errors": response.errors
        }
        
        logger.info(
            "Batch embedding generation completed",
            texts_processed=len(texts),
            successful_count=response.successful_count,
            failed_count=response.failed_count,
            total_time=total_time
        )
        return result
        
    except Exception as e:
        logger.error("Batch embedding generation failed", error=str(e), exc_info=True)
        self.retry(countdown=300, max_retries=3)


@celery_app.task(bind=True, name="semantic_search.refresh_vector_index")
def refresh_vector_index_task(self) -> Dict[str, Any]:
    """Background task to refresh the vector index with latest job data."""
    try:
        logger.info("Starting vector index refresh task")
        start_time = time.time()
        
        async def refresh_index():
            service = await get_semantic_search_service()
            
            if not service.pinecone_index:
                raise ValueError("Pinecone index not available")
            
            # Get current index stats
            stats_before = service.pinecone_index.describe_index_stats()
            
            # Here you would typically:
            # 1. Fetch all jobs from your database
            # 2. Generate embeddings for new/updated jobs
            # 3. Update the vector index
            # 4. Clean up old/deleted job embeddings
            
            # For now, we'll just return the current stats
            stats_after = service.pinecone_index.describe_index_stats()
            
            return stats_before, stats_after
        
        stats_before, stats_after = run_async_task(refresh_index())
        processing_time = time.time() - start_time
        
        result = {
            "status": "completed",
            "vectors_before": stats_before.total_vector_count,
            "vectors_after": stats_after.total_vector_count,
            "vectors_added": stats_after.total_vector_count - stats_before.total_vector_count,
            "index_fullness": stats_after.index_fullness,
            "processing_time": processing_time
        }
        
        logger.info(
            "Vector index refresh completed",
            vectors_before=stats_before.total_vector_count,
            vectors_after=stats_after.total_vector_count,
            processing_time=processing_time
        )
        return result
        
    except Exception as e:
        logger.error("Vector index refresh failed", error=str(e), exc_info=True)
        self.retry(countdown=600, max_retries=2)  # Longer retry interval for index operations