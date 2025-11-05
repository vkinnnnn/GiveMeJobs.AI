"""Document Processing Service routes."""

import time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse

from app.core.auth import ServiceAuth, get_current_auth
from app.core.exceptions import ProcessingException, ValidationException
from app.core.logging import get_logger, get_correlation_id
from app.core.dependencies import get_document_processing_dependencies, ServiceDependencies

from .models import (
    DocumentGenerationRequest,
    JobRequirementExtractionRequest,
    DocumentProcessingResponse,
    ExtractedRequirements,
    GeneratedDocument,
    UserProfile,
    JobPosting,
    TemplateType,
    DocumentFormat
)
from .service import DocumentProcessingService

logger = get_logger(__name__)
router = APIRouter()


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "document-processing",
        "version": "1.0.0"
    }


@router.get("/status")
async def service_status(auth: ServiceAuth = Depends(get_current_auth)):
    """Service status endpoint with authentication."""
    logger.info("Service status requested", service=auth.service_name)
    return {
        "service": "document-processing",
        "status": "operational",
        "features": [
            "resume-generation",
            "job-requirement-extraction",
            "document-formatting",
            "multi-format-support",
            "cover-letter-generation"
        ]
    }


@router.post("/generate-resume", response_model=DocumentProcessingResponse)
async def generate_resume(
    request: DocumentGenerationRequest,
    deps: ServiceDependencies = Depends(get_document_processing_dependencies),
    auth: ServiceAuth = Depends(get_current_auth)
):
    """Generate AI-powered resume with context awareness."""
    start_time = time.time()
    correlation_id = get_correlation_id()
    
    try:
        logger.info(
            "Resume generation requested",
            user_id=request.user_profile.id,
            template=request.template_id,
            has_job_posting=request.job_posting is not None
        )
        
        # Initialize service with dependencies and generate resume
        document_service = DocumentProcessingService(deps)
        generated_document = await document_service.generate_resume(
            user_profile=request.user_profile,
            job_posting=request.job_posting,
            template_id=request.template_id,
            custom_instructions=request.custom_instructions
        )
        
        processing_time = time.time() - start_time
        
        return DocumentProcessingResponse(
            status="completed",
            document=generated_document,
            correlation_id=correlation_id,
            processing_time=processing_time
        )
        
    except ProcessingException as e:
        logger.error("Resume generation failed", error=str(e))
        return DocumentProcessingResponse(
            status="failed",
            error=str(e),
            correlation_id=correlation_id,
            processing_time=time.time() - start_time
        )
    except Exception as e:
        logger.error("Unexpected error in resume generation", error=str(e), exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/extract-requirements", response_model=DocumentProcessingResponse)
async def extract_job_requirements(
    request: JobRequirementExtractionRequest,
    deps: ServiceDependencies = Depends(get_document_processing_dependencies),
    auth: ServiceAuth = Depends(get_current_auth)
):
    """Extract structured requirements from job description using NLP."""
    start_time = time.time()
    correlation_id = get_correlation_id()
    
    try:
        logger.info("Job requirement extraction requested")
        
        # Initialize service with dependencies and extract requirements
        document_service = DocumentProcessingService(deps)
        extracted_requirements = await document_service.extract_job_requirements(
            job_description=request.job_description
        )
        
        processing_time = time.time() - start_time
        
        return DocumentProcessingResponse(
            status="completed",
            requirements=extracted_requirements,
            correlation_id=correlation_id,
            processing_time=processing_time
        )
        
    except ProcessingException as e:
        logger.error("Job requirement extraction failed", error=str(e))
        return DocumentProcessingResponse(
            status="failed",
            error=str(e),
            correlation_id=correlation_id,
            processing_time=time.time() - start_time
        )
    except Exception as e:
        logger.error("Unexpected error in requirement extraction", error=str(e), exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/generate-cover-letter", response_model=DocumentProcessingResponse)
async def generate_cover_letter(
    user_profile: UserProfile,
    job_posting: JobPosting,
    custom_instructions: Optional[str] = None,
    auth: ServiceAuth = Depends(get_current_auth)
):
    """Generate AI-powered cover letter."""
    start_time = time.time()
    correlation_id = get_correlation_id()
    
    try:
        logger.info(
            "Cover letter generation requested",
            user_id=user_profile.id,
            job_id=job_posting.id
        )
        
        # Generate cover letter
        generated_document = await document_service.generate_cover_letter(
            user_profile=user_profile,
            job_posting=job_posting,
            custom_instructions=custom_instructions
        )
        
        processing_time = time.time() - start_time
        
        return DocumentProcessingResponse(
            status="completed",
            document=generated_document,
            correlation_id=correlation_id,
            processing_time=processing_time
        )
        
    except ProcessingException as e:
        logger.error("Cover letter generation failed", error=str(e))
        return DocumentProcessingResponse(
            status="failed",
            error=str(e),
            correlation_id=correlation_id,
            processing_time=time.time() - start_time
        )
    except Exception as e:
        logger.error("Unexpected error in cover letter generation", error=str(e), exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/process-document")
async def process_document(
    file: UploadFile = File(...),
    format: DocumentFormat = Form(...),
    auth: ServiceAuth = Depends(get_current_auth)
):
    """Process uploaded document and extract text."""
    start_time = time.time()
    correlation_id = get_correlation_id()
    
    try:
        logger.info(
            "Document processing requested",
            file_name=file.filename,
            format=format
        )
        
        # Read file content
        file_content = await file.read()
        
        # Process document
        processed_document = await document_service.process_document(
            file_content=file_content,
            file_name=file.filename or "unknown",
            format=format
        )
        
        processing_time = time.time() - start_time
        
        return {
            "status": "completed",
            "document": processed_document.dict(),
            "correlation_id": correlation_id,
            "processing_time": processing_time
        }
        
    except ProcessingException as e:
        logger.error("Document processing failed", error=str(e))
        return JSONResponse(
            status_code=422,
            content={
                "status": "failed",
                "error": str(e),
                "correlation_id": correlation_id,
                "processing_time": time.time() - start_time
            }
        )
    except Exception as e:
        logger.error("Unexpected error in document processing", error=str(e), exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/templates")
async def get_available_templates(auth: ServiceAuth = Depends(get_current_auth)):
    """Get list of available resume templates."""
    return {
        "templates": [
            {
                "id": template.value,
                "name": template.value.title(),
                "description": f"{template.value.title()} resume template"
            }
            for template in TemplateType
        ]
    }


@router.get("/formats")
async def get_supported_formats(auth: ServiceAuth = Depends(get_current_auth)):
    """Get list of supported document formats."""
    return {
        "formats": [
            {
                "id": format.value,
                "name": format.value.upper(),
                "description": f"{format.value.upper()} document format"
            }
            for format in DocumentFormat
        ]
    }