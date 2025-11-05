"""Background tasks for document processing service with LangChain integration."""

import asyncio
from typing import Dict, Any, Optional

from app.core.celery import celery_app
from app.core.logging import get_logger
from app.core.dependencies import get_redis_client, get_openai_client, ServiceDependencies
from app.core.config import get_settings

from .models import UserProfile, JobPosting, TemplateType, DocumentFormat
from .service import DocumentProcessingService

logger = get_logger(__name__)


async def _get_service_dependencies() -> ServiceDependencies:
    """Get service dependencies for Celery tasks."""
    settings = get_settings()
    redis_client = await get_redis_client()
    openai_client = await get_openai_client()
    logger_instance = get_logger(__name__)
    
    return ServiceDependencies(
        db_session=None,  # Not needed for document processing
        redis_client=redis_client,
        openai_client=openai_client,
        logger=logger_instance,
        settings=settings
    )


@celery_app.task(bind=True, name="document_processing.generate_resume_langchain")
def generate_resume_langchain_task(
    self, 
    user_profile_data: Dict[str, Any], 
    job_posting_data: Optional[Dict[str, Any]] = None,
    template_id: str = "professional",
    custom_instructions: Optional[str] = None
) -> Dict[str, Any]:
    """Background task for resume generation with LangChain."""
    try:
        logger.info("Starting LangChain resume generation task", 
                   user_id=user_profile_data.get("id"),
                   job_id=job_posting_data.get("id") if job_posting_data else None)
        
        # Run async function in event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            # Get dependencies
            dependencies = loop.run_until_complete(_get_service_dependencies())
            
            # Initialize service with dependencies
            service = DocumentProcessingService(dependencies)
            
            # Convert dict to Pydantic models
            user_profile = UserProfile(**user_profile_data)
            job_posting = JobPosting(**job_posting_data) if job_posting_data else None
            template = TemplateType(template_id)
            
            # Generate resume
            generated_document = loop.run_until_complete(
                service.generate_resume(
                    user_profile=user_profile,
                    job_posting=job_posting,
                    template_id=template,
                    custom_instructions=custom_instructions
                )
            )
            
            result = {
                "status": "completed",
                "document": generated_document.model_dump(),
                "metadata": {
                    "generation_time": generated_document.generation_time,
                    "word_count": generated_document.word_count,
                    "template_used": generated_document.template_used.value,
                    "langchain_enabled": True,
                    "cached": generated_document.metadata.get("cache_key") is not None
                }
            }
            
            logger.info("LangChain resume generation completed successfully", 
                       generation_time=generated_document.generation_time,
                       word_count=generated_document.word_count)
            return result
            
        finally:
            loop.close()
        
    except Exception as e:
        logger.error("LangChain resume generation failed", error=str(e), exc_info=True)
        self.retry(countdown=60, max_retries=3)


@celery_app.task(bind=True, name="document_processing.extract_job_requirements")
def extract_job_requirements_task(self, job_description: str) -> Dict[str, Any]:
    """Background task for job requirement extraction."""
    try:
        logger.info("Starting job requirement extraction task")
        
        # Initialize service
        service = DocumentProcessingService()
        
        # Run async function in event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            extracted_requirements = loop.run_until_complete(
                service.extract_job_requirements(job_description)
            )
        finally:
            loop.close()
        
        result = {
            "status": "completed",
            "requirements": extracted_requirements.dict()
        }
        
        logger.info("Job requirement extraction completed successfully")
        return result
        
    except Exception as e:
        logger.error("Job requirement extraction failed", error=str(e), exc_info=True)
        self.retry(countdown=60, max_retries=3)


@celery_app.task(bind=True, name="document_processing.generate_cover_letter")
def generate_cover_letter_task(
    self,
    user_profile_data: Dict[str, Any],
    job_posting_data: Dict[str, Any],
    custom_instructions: str = None
) -> Dict[str, Any]:
    """Background task for cover letter generation."""
    try:
        logger.info("Starting cover letter generation task",
                   user_id=user_profile_data.get("id"),
                   job_id=job_posting_data.get("id"))
        
        # Initialize service
        service = DocumentProcessingService()
        
        # Convert dict to Pydantic models
        user_profile = UserProfile(**user_profile_data)
        job_posting = JobPosting(**job_posting_data)
        
        # Run async function in event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            generated_document = loop.run_until_complete(
                service.generate_cover_letter(
                    user_profile=user_profile,
                    job_posting=job_posting,
                    custom_instructions=custom_instructions
                )
            )
        finally:
            loop.close()
        
        result = {
            "status": "completed",
            "document": generated_document.dict(),
            "metadata": {
                "generation_time": generated_document.generation_time,
                "word_count": generated_document.word_count
            }
        }
        
        logger.info("Cover letter generation completed successfully",
                   generation_time=generated_document.generation_time)
        return result
        
    except Exception as e:
        logger.error("Cover letter generation failed", error=str(e), exc_info=True)
        self.retry(countdown=60, max_retries=3)


@celery_app.task(bind=True, name="document_processing.batch_resume_generation")
def batch_resume_generation_task(
    self,
    user_profiles: list[Dict[str, Any]],
    job_postings: list[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Background task for batch resume generation."""
    try:
        logger.info("Starting batch resume generation task",
                   user_count=len(user_profiles))
        
        # Initialize service
        service = DocumentProcessingService()
        
        results = []
        failed_count = 0
        
        # Run async function in event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            for i, user_profile_data in enumerate(user_profiles):
                try:
                    user_profile = UserProfile(**user_profile_data)
                    job_posting = None
                    
                    if job_postings and i < len(job_postings):
                        job_posting = JobPosting(**job_postings[i])
                    
                    generated_document = loop.run_until_complete(
                        service.generate_resume(
                            user_profile=user_profile,
                            job_posting=job_posting,
                            template_id=TemplateType.PROFESSIONAL
                        )
                    )
                    
                    results.append({
                        "user_id": user_profile.id,
                        "status": "completed",
                        "document": generated_document.dict()
                    })
                    
                except Exception as e:
                    logger.error("Individual resume generation failed",
                               user_id=user_profile_data.get("id"),
                               error=str(e))
                    failed_count += 1
                    results.append({
                        "user_id": user_profile_data.get("id"),
                        "status": "failed",
                        "error": str(e)
                    })
        finally:
            loop.close()
        
        result = {
            "status": "completed",
            "total_processed": len(user_profiles),
            "successful": len(user_profiles) - failed_count,
            "failed": failed_count,
            "results": results
        }
        
        logger.info("Batch resume generation completed",
                   total=len(user_profiles),
                   successful=len(user_profiles) - failed_count,
                   failed=failed_count)
        return result
        
    except Exception as e:
        logger.error("Batch resume generation failed", error=str(e), exc_info=True)
        self.retry(countdown=300, max_retries=2)

@celery_app.task(bind=True, name="document_processing.process_document_langchain")
def process_document_langchain_task(
    self,
    file_content_base64: str,
    file_name: str,
    format: str
) -> Dict[str, Any]:
    """Background task for document processing with LangChain."""
    try:
        logger.info("Starting LangChain document processing task", 
                   file_name=file_name, format=format)
        
        # Decode base64 file content
        import base64
        file_content = base64.b64decode(file_content_base64)
        
        # Run async function in event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            # Get dependencies
            dependencies = loop.run_until_complete(_get_service_dependencies())
            
            # Initialize service with dependencies
            service = DocumentProcessingService(dependencies)
            
            # Process document
            processed_document = loop.run_until_complete(
                service.process_document_with_langchain(
                    file_content=file_content,
                    file_name=file_name,
                    format=DocumentFormat(format)
                )
            )
            
            result = {
                "status": "completed",
                "document": processed_document.model_dump(),
                "metadata": {
                    "processing_time": processed_document.processing_time,
                    "text_length": len(processed_document.extracted_text),
                    "langchain_enabled": True,
                    **processed_document.metadata
                }
            }
            
            logger.info("LangChain document processing completed successfully", 
                       processing_time=processed_document.processing_time,
                       text_length=len(processed_document.extracted_text))
            return result
            
        finally:
            loop.close()
        
    except Exception as e:
        logger.error("LangChain document processing failed", error=str(e), exc_info=True)
        self.retry(countdown=60, max_retries=3)


@celery_app.task(bind=True, name="document_processing.extract_requirements_langchain")
def extract_requirements_langchain_task(
    self, 
    job_description: str,
    company_name: Optional[str] = None,
    job_title: Optional[str] = None
) -> Dict[str, Any]:
    """Background task for job requirement extraction with LangChain."""
    try:
        logger.info("Starting LangChain job requirement extraction task",
                   company=company_name, title=job_title)
        
        # Run async function in event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            # Get dependencies
            dependencies = loop.run_until_complete(_get_service_dependencies())
            
            # Initialize service with dependencies
            service = DocumentProcessingService(dependencies)
            
            # Extract requirements
            extracted_requirements = loop.run_until_complete(
                service._extract_job_requirements_with_langchain(job_description)
            )
            
            result = {
                "status": "completed",
                "requirements": extracted_requirements.model_dump(),
                "metadata": {
                    "langchain_enabled": True,
                    "company_name": company_name,
                    "job_title": job_title,
                    "description_length": len(job_description)
                }
            }
            
            logger.info("LangChain job requirement extraction completed successfully")
            return result
            
        finally:
            loop.close()
        
    except Exception as e:
        logger.error("LangChain job requirement extraction failed", error=str(e), exc_info=True)
        self.retry(countdown=60, max_retries=3)


@celery_app.task(bind=True, name="document_processing.batch_document_processing")
def batch_document_processing_task(
    self,
    documents: list[Dict[str, Any]]  # List of {file_content_base64, file_name, format}
) -> Dict[str, Any]:
    """Background task for batch document processing with LangChain."""
    try:
        logger.info("Starting batch document processing task",
                   document_count=len(documents))
        
        # Run async function in event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            # Get dependencies
            dependencies = loop.run_until_complete(_get_service_dependencies())
            
            # Initialize service with dependencies
            service = DocumentProcessingService(dependencies)
            
            results = []
            failed_count = 0
            
            for i, doc_data in enumerate(documents):
                try:
                    # Decode base64 file content
                    import base64
                    file_content = base64.b64decode(doc_data["file_content_base64"])
                    
                    # Process document
                    processed_document = loop.run_until_complete(
                        service.process_document_with_langchain(
                            file_content=file_content,
                            file_name=doc_data["file_name"],
                            format=DocumentFormat(doc_data["format"])
                        )
                    )
                    
                    results.append({
                        "index": i,
                        "file_name": doc_data["file_name"],
                        "status": "completed",
                        "document": processed_document.model_dump()
                    })
                    
                except Exception as e:
                    logger.error("Individual document processing failed",
                               file_name=doc_data.get("file_name"),
                               error=str(e))
                    failed_count += 1
                    results.append({
                        "index": i,
                        "file_name": doc_data.get("file_name"),
                        "status": "failed",
                        "error": str(e)
                    })
            
            result = {
                "status": "completed",
                "total_processed": len(documents),
                "successful": len(documents) - failed_count,
                "failed": failed_count,
                "results": results,
                "metadata": {
                    "langchain_enabled": True,
                    "batch_size": len(documents)
                }
            }
            
            logger.info("Batch document processing completed",
                       total=len(documents),
                       successful=len(documents) - failed_count,
                       failed=failed_count)
            return result
            
        finally:
            loop.close()
        
    except Exception as e:
        logger.error("Batch document processing failed", error=str(e), exc_info=True)
        self.retry(countdown=300, max_retries=2)


@celery_app.task(bind=True, name="document_processing.generate_multiple_formats")
def generate_multiple_formats_task(
    self,
    user_profile_data: Dict[str, Any],
    job_posting_data: Optional[Dict[str, Any]] = None,
    formats: list[str] = None,  # List of template IDs
    custom_instructions: Optional[str] = None
) -> Dict[str, Any]:
    """Background task for generating resumes in multiple formats."""
    try:
        if formats is None:
            formats = ["professional", "modern", "classic"]
        
        logger.info("Starting multiple format resume generation task",
                   user_id=user_profile_data.get("id"),
                   formats=formats)
        
        # Run async function in event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            # Get dependencies
            dependencies = loop.run_until_complete(_get_service_dependencies())
            
            # Initialize service with dependencies
            service = DocumentProcessingService(dependencies)
            
            # Convert dict to Pydantic models
            user_profile = UserProfile(**user_profile_data)
            job_posting = JobPosting(**job_posting_data) if job_posting_data else None
            
            results = []
            failed_count = 0
            
            for template_id in formats:
                try:
                    template = TemplateType(template_id)
                    
                    # Generate resume for this template
                    generated_document = loop.run_until_complete(
                        service.generate_resume(
                            user_profile=user_profile,
                            job_posting=job_posting,
                            template_id=template,
                            custom_instructions=custom_instructions
                        )
                    )
                    
                    results.append({
                        "template_id": template_id,
                        "status": "completed",
                        "document": generated_document.model_dump()
                    })
                    
                except Exception as e:
                    logger.error("Individual format generation failed",
                               template_id=template_id,
                               error=str(e))
                    failed_count += 1
                    results.append({
                        "template_id": template_id,
                        "status": "failed",
                        "error": str(e)
                    })
            
            result = {
                "status": "completed",
                "total_formats": len(formats),
                "successful": len(formats) - failed_count,
                "failed": failed_count,
                "results": results,
                "metadata": {
                    "user_id": user_profile_data.get("id"),
                    "langchain_enabled": True
                }
            }
            
            logger.info("Multiple format generation completed",
                       total=len(formats),
                       successful=len(formats) - failed_count,
                       failed=failed_count)
            return result
            
        finally:
            loop.close()
        
    except Exception as e:
        logger.error("Multiple format generation failed", error=str(e), exc_info=True)
        self.retry(countdown=120, max_retries=2)