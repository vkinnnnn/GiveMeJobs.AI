"""
CDN and Asset Optimization API endpoints.
"""

import asyncio
from pathlib import Path
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, BackgroundTasks
from pydantic import BaseModel, Field
import structlog

from app.core.cdn_optimization import (
    CDNOptimizer, 
    AssetVersionManager, 
    CDNProvider,
    AssetType,
    AssetMetadata,
    create_cdn_optimizer
)
from app.core.config import get_settings
from app.core.dependencies import get_logger

logger = structlog.get_logger(__name__)
settings = get_settings()
router = APIRouter(prefix="/cdn", tags=["CDN"])


class AssetUploadRequest(BaseModel):
    """Asset upload request model."""
    target_path: Optional[str] = None
    optimize: bool = True
    cache_ttl: Optional[int] = None


class AssetUploadResponse(BaseModel):
    """Asset upload response model."""
    success: bool
    asset_metadata: Optional[Dict[str, Any]] = None
    cdn_url: Optional[str] = None
    error: Optional[str] = None


class BatchOptimizeRequest(BaseModel):
    """Batch optimization request model."""
    directory_path: str
    pattern: str = "*"
    max_concurrent: int = Field(default=5, ge=1, le=20)


class BatchOptimizeResponse(BaseModel):
    """Batch optimization response model."""
    success: bool
    total_assets: int
    successful: int
    failed: int
    results: List[Dict[str, Any]]
    error: Optional[str] = None


class CacheInvalidationRequest(BaseModel):
    """Cache invalidation request model."""
    paths: List[str]


class CacheInvalidationResponse(BaseModel):
    """Cache invalidation response model."""
    success: bool
    invalidated_paths: List[str]
    error: Optional[str] = None


class AssetManifestResponse(BaseModel):
    """Asset manifest response model."""
    manifest: Dict[str, str]
    total_assets: int


# Dependency to get CDN optimizer
async def get_cdn_optimizer() -> CDNOptimizer:
    """Get configured CDN optimizer."""
    return create_cdn_optimizer(
        provider=CDNProvider(settings.cdn.provider),
        base_url=settings.cdn.base_url,
        api_key=settings.cdn.api_key,
        zone_id=settings.cdn.zone_id,
        distribution_id=settings.cdn.distribution_id,
        image_quality=settings.cdn.image_quality,
        image_max_width=settings.cdn.image_max_width,
        image_max_height=settings.cdn.image_max_height,
        enable_webp=settings.cdn.enable_webp,
        enable_avif=settings.cdn.enable_avif,
        css_minify=settings.cdn.css_minify,
        js_minify=settings.cdn.js_minify,
        enable_brotli=settings.cdn.enable_brotli,
        enable_gzip=settings.cdn.enable_gzip
    )


@router.post("/upload", response_model=AssetUploadResponse)
async def upload_asset(
    file: UploadFile = File(...),
    request: AssetUploadRequest = AssetUploadRequest(),
    cdn_optimizer: CDNOptimizer = Depends(get_cdn_optimizer),
    logger: structlog.BoundLogger = Depends(get_logger)
):
    """Upload and optimize a single asset to CDN."""
    
    try:
        # Validate file
        if not file.filename:
            raise HTTPException(status_code=400, detail="No filename provided")
        
        # Create temporary file
        temp_path = Path(f"/tmp/{file.filename}")
        
        # Save uploaded file
        content = await file.read()
        temp_path.write_bytes(content)
        
        try:
            async with cdn_optimizer:
                # Optimize and upload
                asset_metadata = await cdn_optimizer.optimize_and_upload_asset(
                    temp_path, 
                    request.target_path
                )
                
                logger.info(
                    "Asset uploaded successfully",
                    filename=file.filename,
                    cdn_url=asset_metadata.cdn_url,
                    original_size=asset_metadata.size,
                    optimized_size=asset_metadata.optimized_size
                )
                
                return AssetUploadResponse(
                    success=True,
                    asset_metadata={
                        "path": asset_metadata.path,
                        "size": asset_metadata.size,
                        "optimized_size": asset_metadata.optimized_size,
                        "compression_ratio": asset_metadata.compression_ratio,
                        "mime_type": asset_metadata.mime_type,
                        "asset_type": asset_metadata.asset_type.value,
                        "hash": asset_metadata.hash
                    },
                    cdn_url=asset_metadata.cdn_url
                )
                
        finally:
            # Clean up temporary file
            if temp_path.exists():
                temp_path.unlink()
                
    except Exception as e:
        logger.error("Asset upload failed", filename=file.filename, error=str(e))
        return AssetUploadResponse(
            success=False,
            error=str(e)
        )


@router.post("/batch-optimize", response_model=BatchOptimizeResponse)
async def batch_optimize_assets(
    request: BatchOptimizeRequest,
    background_tasks: BackgroundTasks,
    cdn_optimizer: CDNOptimizer = Depends(get_cdn_optimizer),
    logger: structlog.BoundLogger = Depends(get_logger)
):
    """Batch optimize assets in a directory."""
    
    try:
        directory_path = Path(request.directory_path)
        
        if not directory_path.exists():
            raise HTTPException(
                status_code=404, 
                detail=f"Directory {request.directory_path} not found"
            )
        
        if not directory_path.is_dir():
            raise HTTPException(
                status_code=400, 
                detail=f"{request.directory_path} is not a directory"
            )
        
        async with cdn_optimizer:
            results = await cdn_optimizer.batch_optimize_directory(
                directory_path,
                request.pattern,
                request.max_concurrent
            )
            
            # Count assets in directory
            total_assets = len(list(directory_path.glob(request.pattern)))
            successful = len(results)
            failed = total_assets - successful
            
            logger.info(
                "Batch optimization completed",
                directory=request.directory_path,
                pattern=request.pattern,
                total=total_assets,
                successful=successful,
                failed=failed
            )
            
            return BatchOptimizeResponse(
                success=True,
                total_assets=total_assets,
                successful=successful,
                failed=failed,
                results=[
                    {
                        "path": result.path,
                        "size": result.size,
                        "optimized_size": result.optimized_size,
                        "compression_ratio": result.compression_ratio,
                        "cdn_url": result.cdn_url,
                        "asset_type": result.asset_type.value
                    }
                    for result in results
                ]
            )
            
    except Exception as e:
        logger.error(
            "Batch optimization failed", 
            directory=request.directory_path, 
            error=str(e)
        )
        return BatchOptimizeResponse(
            success=False,
            total_assets=0,
            successful=0,
            failed=0,
            results=[],
            error=str(e)
        )


@router.post("/invalidate-cache", response_model=CacheInvalidationResponse)
async def invalidate_cache(
    request: CacheInvalidationRequest,
    cdn_optimizer: CDNOptimizer = Depends(get_cdn_optimizer),
    logger: structlog.BoundLogger = Depends(get_logger)
):
    """Invalidate CDN cache for specified paths."""
    
    try:
        async with cdn_optimizer:
            success = await cdn_optimizer.invalidate_cache(request.paths)
            
            if success:
                logger.info("Cache invalidation successful", paths=request.paths)
                return CacheInvalidationResponse(
                    success=True,
                    invalidated_paths=request.paths
                )
            else:
                logger.warning("Cache invalidation failed", paths=request.paths)
                return CacheInvalidationResponse(
                    success=False,
                    invalidated_paths=[],
                    error="Cache invalidation failed"
                )
                
    except Exception as e:
        logger.error("Cache invalidation error", paths=request.paths, error=str(e))
        return CacheInvalidationResponse(
            success=False,
            invalidated_paths=[],
            error=str(e)
        )


@router.get("/asset-url/{asset_path:path}")
async def get_asset_url(
    asset_path: str,
    cdn_optimizer: CDNOptimizer = Depends(get_cdn_optimizer)
):
    """Get CDN URL for an asset."""
    
    try:
        async with cdn_optimizer:
            cdn_url = await cdn_optimizer.get_asset_url(asset_path)
            
            if cdn_url:
                return {"asset_path": asset_path, "cdn_url": cdn_url}
            else:
                raise HTTPException(
                    status_code=404, 
                    detail=f"Asset {asset_path} not found in CDN"
                )
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get asset URL", asset_path=asset_path, error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/manifest", response_model=AssetManifestResponse)
async def get_asset_manifest():
    """Get current asset manifest."""
    
    try:
        manifest_path = Path(settings.cdn.asset_manifest_path)
        manager = AssetVersionManager(manifest_path)
        await manager.load_manifest()
        
        return AssetManifestResponse(
            manifest=manager.manifest,
            total_assets=len(manager.manifest)
        )
        
    except Exception as e:
        logger.error("Failed to load asset manifest", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to load asset manifest")


@router.get("/health")
async def cdn_health_check(
    cdn_optimizer: CDNOptimizer = Depends(get_cdn_optimizer)
):
    """CDN service health check."""
    
    try:
        # Test CDN connectivity (simulated)
        async with cdn_optimizer:
            # This would typically test actual CDN connectivity
            return {
                "status": "healthy",
                "provider": cdn_optimizer.cdn_config.provider.value,
                "base_url": cdn_optimizer.cdn_config.base_url,
                "timestamp": asyncio.get_event_loop().time()
            }
            
    except Exception as e:
        logger.error("CDN health check failed", error=str(e))
        raise HTTPException(status_code=503, detail="CDN service unavailable")