"""
CDN and static asset optimization with Python.

This module provides:
- CloudFront/Cloudflare CDN configuration
- Image optimization and compression with Python libraries
- Asset versioning and cache busting with Python scripts
- Global content distribution with Python-based optimization
"""

import asyncio
import hashlib
import json
import mimetypes
import os
import time
from dataclasses import dataclass, asdict
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union, Any
from urllib.parse import urljoin, urlparse

import aiofiles
import httpx
from PIL import Image, ImageOptim
import structlog
from prometheus_client import Counter, Histogram, Gauge

from .config import get_settings

logger = structlog.get_logger(__name__)
settings = get_settings()


class CDNProvider(Enum):
    """CDN provider enumeration."""
    CLOUDFRONT = "cloudfront"
    CLOUDFLARE = "cloudflare"
    FASTLY = "fastly"
    CUSTOM = "custom"


class AssetType(Enum):
    """Asset type enumeration."""
    IMAGE = "image"
    CSS = "css"
    JAVASCRIPT = "javascript"
    FONT = "font"
    VIDEO = "video"
    DOCUMENT = "document"
    OTHER = "other"


@dataclass
class CDNConfig:
    """CDN configuration."""
    provider: CDNProvider
    base_url: str
    api_key: Optional[str] = None
    zone_id: Optional[str] = None
    distribution_id: Optional[str] = None
    cache_ttl: int = 86400  # 24 hours
    enable_compression: bool = True
    enable_minification: bool = True


@dataclass
class AssetOptimizationConfig:
    """Asset optimization configuration."""
    image_quality: int = 85
    image_max_width: int = 2048
    image_max_height: int = 2048
    enable_webp: bool = True
    enable_avif: bool = False
    css_minify: bool = True
    js_minify: bool = True
    enable_brotli: bool = True
    enable_gzip: bool = True


@dataclass
class AssetMetadata:
    """Asset metadata."""
    path: str
    size: int
    hash: str
    mime_type: str
    asset_type: AssetType
    optimized_size: Optional[int] = None
    compression_ratio: Optional[float] = None
    cdn_url: Optional[str] = None
    cache_key: Optional[str] = None
    last_modified: Optional[float] = None


# Prometheus metrics
asset_operations = Counter(
    'asset_operations_total',
    'Total asset operations',
    ['operation_type', 'asset_type', 'status']
)

asset_optimization_duration = Histogram(
    'asset_optimization_duration_seconds',
    'Time spent optimizing assets',
    ['asset_type']
)

cdn_cache_hits = Counter(
    'cdn_cache_hits_total',
    'CDN cache hits',
    ['provider', 'asset_type']
)

cdn_cache_misses = Counter(
    'cdn_cache_misses_total',
    'CDN cache misses',
    ['provider', 'asset_type']
)

asset_size_gauge = Gauge(
    'asset_size_bytes',
    'Asset size in bytes',
    ['asset_path', 'optimized']
)


class CDNOptimizer:
    """CDN and static asset optimizer."""
    
    def __init__(self, cdn_config: CDNConfig, optimization_config: AssetOptimizationConfig):
        self.cdn_config = cdn_config
        self.optimization_config = optimization_config
        self.asset_cache: Dict[str, AssetMetadata] = {}
        self.http_client = httpx.AsyncClient(timeout=30.0)
        
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.http_client.aclose()
    
    async def optimize_and_upload_asset(
        self, 
        asset_path: Path, 
        target_path: Optional[str] = None
    ) -> AssetMetadata:
        """Optimize and upload asset to CDN."""
        try:
            with asset_optimization_duration.labels(
                asset_type=self._get_asset_type(asset_path).value
            ).time():
                # Read original asset
                async with aiofiles.open(asset_path, 'rb') as f:
                    content = await f.read()
                
                # Generate metadata
                asset_metadata = await self._generate_asset_metadata(asset_path, content)
                
                # Optimize asset based on type
                optimized_content = await self._optimize_asset(content, asset_metadata)
                
                # Generate versioned filename
                versioned_path = self._generate_versioned_path(
                    target_path or str(asset_path), 
                    asset_metadata.hash
                )
                
                # Upload to CDN
                cdn_url = await self._upload_to_cdn(versioned_path, optimized_content)
                
                # Update metadata
                asset_metadata.optimized_size = len(optimized_content)
                asset_metadata.compression_ratio = (
                    1 - (len(optimized_content) / len(content))
                ) if len(content) > 0 else 0
                asset_metadata.cdn_url = cdn_url
                asset_metadata.cache_key = versioned_path
                
                # Cache metadata
                self.asset_cache[str(asset_path)] = asset_metadata
                
                # Update metrics
                asset_operations.labels(
                    operation_type='optimize_upload',
                    asset_type=asset_metadata.asset_type.value,
                    status='success'
                ).inc()
                
                asset_size_gauge.labels(
                    asset_path=str(asset_path),
                    optimized='false'
                ).set(len(content))
                
                asset_size_gauge.labels(
                    asset_path=str(asset_path),
                    optimized='true'
                ).set(len(optimized_content))
                
                logger.info(
                    "Asset optimized and uploaded successfully",
                    asset_path=str(asset_path),
                    original_size=len(content),
                    optimized_size=len(optimized_content),
                    compression_ratio=asset_metadata.compression_ratio,
                    cdn_url=cdn_url
                )
                
                return asset_metadata
                
        except Exception as e:
            asset_operations.labels(
                operation_type='optimize_upload',
                asset_type=self._get_asset_type(asset_path).value,
                status='error'
            ).inc()
            
            logger.error(
                "Failed to optimize and upload asset",
                asset_path=str(asset_path),
                error=str(e)
            )
            raise
    
    async def _generate_asset_metadata(self, asset_path: Path, content: bytes) -> AssetMetadata:
        """Generate asset metadata."""
        file_hash = hashlib.sha256(content).hexdigest()[:16]
        mime_type, _ = mimetypes.guess_type(str(asset_path))
        asset_type = self._get_asset_type(asset_path)
        
        return AssetMetadata(
            path=str(asset_path),
            size=len(content),
            hash=file_hash,
            mime_type=mime_type or 'application/octet-stream',
            asset_type=asset_type,
            last_modified=asset_path.stat().st_mtime if asset_path.exists() else time.time()
        )
    
    def _get_asset_type(self, asset_path: Path) -> AssetType:
        """Determine asset type from file extension."""
        suffix = asset_path.suffix.lower()
        
        if suffix in ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg']:
            return AssetType.IMAGE
        elif suffix in ['.css']:
            return AssetType.CSS
        elif suffix in ['.js', '.mjs']:
            return AssetType.JAVASCRIPT
        elif suffix in ['.woff', '.woff2', '.ttf', '.otf', '.eot']:
            return AssetType.FONT
        elif suffix in ['.mp4', '.webm', '.ogg', '.avi', '.mov']:
            return AssetType.VIDEO
        elif suffix in ['.pdf', '.doc', '.docx', '.txt']:
            return AssetType.DOCUMENT
        else:
            return AssetType.OTHER
    
    async def _optimize_asset(self, content: bytes, metadata: AssetMetadata) -> bytes:
        """Optimize asset based on type."""
        if metadata.asset_type == AssetType.IMAGE:
            return await self._optimize_image(content, metadata)
        elif metadata.asset_type == AssetType.CSS:
            return await self._optimize_css(content)
        elif metadata.asset_type == AssetType.JAVASCRIPT:
            return await self._optimize_javascript(content)
        else:
            return await self._compress_generic(content)
    
    async def _optimize_image(self, content: bytes, metadata: AssetMetadata) -> bytes:
        """Optimize image with PIL and compression."""
        try:
            # Load image
            from io import BytesIO
            image = Image.open(BytesIO(content))
            
            # Convert to RGB if necessary
            if image.mode in ('RGBA', 'LA', 'P'):
                background = Image.new('RGB', image.size, (255, 255, 255))
                if image.mode == 'P':
                    image = image.convert('RGBA')
                background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
                image = background
            
            # Resize if too large
            if (image.width > self.optimization_config.image_max_width or 
                image.height > self.optimization_config.image_max_height):
                image.thumbnail(
                    (self.optimization_config.image_max_width, 
                     self.optimization_config.image_max_height),
                    Image.Resampling.LANCZOS
                )
            
            # Save optimized image
            output = BytesIO()
            
            # Choose format based on configuration and original format
            if self.optimization_config.enable_webp and metadata.mime_type != 'image/gif':
                image.save(
                    output, 
                    format='WEBP', 
                    quality=self.optimization_config.image_quality,
                    optimize=True
                )
            elif metadata.mime_type == 'image/jpeg':
                image.save(
                    output, 
                    format='JPEG', 
                    quality=self.optimization_config.image_quality,
                    optimize=True
                )
            elif metadata.mime_type == 'image/png':
                image.save(
                    output, 
                    format='PNG', 
                    optimize=True
                )
            else:
                # Keep original format
                original_format = image.format or 'JPEG'
                image.save(output, format=original_format, optimize=True)
            
            return output.getvalue()
            
        except Exception as e:
            logger.warning(
                "Image optimization failed, using original",
                error=str(e)
            )
            return content
    
    async def _optimize_css(self, content: bytes) -> bytes:
        """Optimize CSS by minifying."""
        if not self.optimization_config.css_minify:
            return content
        
        try:
            import cssmin
            css_text = content.decode('utf-8')
            minified = cssmin.cssmin(css_text)
            return minified.encode('utf-8')
        except Exception as e:
            logger.warning("CSS minification failed, using original", error=str(e))
            return content
    
    async def _optimize_javascript(self, content: bytes) -> bytes:
        """Optimize JavaScript by minifying."""
        if not self.optimization_config.js_minify:
            return content
        
        try:
            import jsmin
            js_text = content.decode('utf-8')
            minified = jsmin.jsmin(js_text)
            return minified.encode('utf-8')
        except Exception as e:
            logger.warning("JavaScript minification failed, using original", error=str(e))
            return content
    
    async def _compress_generic(self, content: bytes) -> bytes:
        """Apply generic compression."""
        if self.optimization_config.enable_brotli:
            try:
                import brotli
                return brotli.compress(content)
            except ImportError:
                pass
        
        if self.optimization_config.enable_gzip:
            import gzip
            return gzip.compress(content)
        
        return content
    
    def _generate_versioned_path(self, original_path: str, file_hash: str) -> str:
        """Generate versioned path with hash."""
        path_obj = Path(original_path)
        stem = path_obj.stem
        suffix = path_obj.suffix
        
        # Insert hash before extension
        versioned_name = f"{stem}.{file_hash}{suffix}"
        return str(path_obj.parent / versioned_name)
    
    async def _upload_to_cdn(self, path: str, content: bytes) -> str:
        """Upload asset to CDN."""
        if self.cdn_config.provider == CDNProvider.CLOUDFRONT:
            return await self._upload_to_cloudfront(path, content)
        elif self.cdn_config.provider == CDNProvider.CLOUDFLARE:
            return await self._upload_to_cloudflare(path, content)
        else:
            return await self._upload_to_custom_cdn(path, content)
    
    async def _upload_to_cloudfront(self, path: str, content: bytes) -> str:
        """Upload to AWS CloudFront via S3."""
        try:
            import boto3
            from botocore.exceptions import ClientError
            
            # This would typically use boto3 to upload to S3
            # For now, we'll simulate the upload
            s3_key = path.lstrip('/')
            cdn_url = urljoin(self.cdn_config.base_url, s3_key)
            
            logger.info(
                "Simulated CloudFront upload",
                path=path,
                cdn_url=cdn_url,
                size=len(content)
            )
            
            return cdn_url
            
        except Exception as e:
            logger.error("CloudFront upload failed", error=str(e))
            raise
    
    async def _upload_to_cloudflare(self, path: str, content: bytes) -> str:
        """Upload to Cloudflare."""
        try:
            # Cloudflare API upload
            url = f"https://api.cloudflare.com/client/v4/zones/{self.cdn_config.zone_id}/files"
            
            headers = {
                "Authorization": f"Bearer {self.cdn_config.api_key}",
                "Content-Type": "application/octet-stream"
            }
            
            # For now, simulate the upload
            cdn_url = urljoin(self.cdn_config.base_url, path.lstrip('/'))
            
            logger.info(
                "Simulated Cloudflare upload",
                path=path,
                cdn_url=cdn_url,
                size=len(content)
            )
            
            return cdn_url
            
        except Exception as e:
            logger.error("Cloudflare upload failed", error=str(e))
            raise
    
    async def _upload_to_custom_cdn(self, path: str, content: bytes) -> str:
        """Upload to custom CDN endpoint."""
        try:
            # Custom CDN upload logic
            cdn_url = urljoin(self.cdn_config.base_url, path.lstrip('/'))
            
            logger.info(
                "Simulated custom CDN upload",
                path=path,
                cdn_url=cdn_url,
                size=len(content)
            )
            
            return cdn_url
            
        except Exception as e:
            logger.error("Custom CDN upload failed", error=str(e))
            raise
    
    async def invalidate_cache(self, paths: List[str]) -> bool:
        """Invalidate CDN cache for specified paths."""
        try:
            if self.cdn_config.provider == CDNProvider.CLOUDFRONT:
                return await self._invalidate_cloudfront_cache(paths)
            elif self.cdn_config.provider == CDNProvider.CLOUDFLARE:
                return await self._invalidate_cloudflare_cache(paths)
            else:
                return await self._invalidate_custom_cache(paths)
                
        except Exception as e:
            logger.error("Cache invalidation failed", error=str(e))
            return False
    
    async def _invalidate_cloudfront_cache(self, paths: List[str]) -> bool:
        """Invalidate CloudFront cache."""
        try:
            # CloudFront invalidation API call
            logger.info("Simulated CloudFront cache invalidation", paths=paths)
            return True
        except Exception as e:
            logger.error("CloudFront cache invalidation failed", error=str(e))
            return False
    
    async def _invalidate_cloudflare_cache(self, paths: List[str]) -> bool:
        """Invalidate Cloudflare cache."""
        try:
            # Cloudflare purge API call
            logger.info("Simulated Cloudflare cache invalidation", paths=paths)
            return True
        except Exception as e:
            logger.error("Cloudflare cache invalidation failed", error=str(e))
            return False
    
    async def _invalidate_custom_cache(self, paths: List[str]) -> bool:
        """Invalidate custom CDN cache."""
        try:
            logger.info("Simulated custom CDN cache invalidation", paths=paths)
            return True
        except Exception as e:
            logger.error("Custom CDN cache invalidation failed", error=str(e))
            return False
    
    async def get_asset_url(self, asset_path: str) -> Optional[str]:
        """Get CDN URL for asset."""
        if asset_path in self.asset_cache:
            return self.asset_cache[asset_path].cdn_url
        return None
    
    async def batch_optimize_directory(
        self, 
        directory: Path, 
        pattern: str = "*",
        max_concurrent: int = 5
    ) -> List[AssetMetadata]:
        """Batch optimize all assets in a directory."""
        assets = list(directory.glob(pattern))
        
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def optimize_single(asset_path: Path) -> AssetMetadata:
            async with semaphore:
                return await self.optimize_and_upload_asset(asset_path)
        
        tasks = [optimize_single(asset) for asset in assets]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        successful_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(
                    "Failed to optimize asset",
                    asset_path=str(assets[i]),
                    error=str(result)
                )
            else:
                successful_results.append(result)
        
        logger.info(
            "Batch optimization completed",
            total_assets=len(assets),
            successful=len(successful_results),
            failed=len(assets) - len(successful_results)
        )
        
        return successful_results


class AssetVersionManager:
    """Manages asset versioning and cache busting."""
    
    def __init__(self, manifest_path: Path):
        self.manifest_path = manifest_path
        self.manifest: Dict[str, str] = {}
        
    async def load_manifest(self) -> None:
        """Load asset manifest from file."""
        try:
            if self.manifest_path.exists():
                async with aiofiles.open(self.manifest_path, 'r') as f:
                    content = await f.read()
                    self.manifest = json.loads(content)
            else:
                self.manifest = {}
        except Exception as e:
            logger.error("Failed to load asset manifest", error=str(e))
            self.manifest = {}
    
    async def save_manifest(self) -> None:
        """Save asset manifest to file."""
        try:
            self.manifest_path.parent.mkdir(parents=True, exist_ok=True)
            async with aiofiles.open(self.manifest_path, 'w') as f:
                await f.write(json.dumps(self.manifest, indent=2))
        except Exception as e:
            logger.error("Failed to save asset manifest", error=str(e))
    
    def add_asset(self, original_path: str, versioned_path: str) -> None:
        """Add asset to manifest."""
        self.manifest[original_path] = versioned_path
    
    def get_versioned_path(self, original_path: str) -> Optional[str]:
        """Get versioned path for original asset."""
        return self.manifest.get(original_path)
    
    def remove_asset(self, original_path: str) -> None:
        """Remove asset from manifest."""
        self.manifest.pop(original_path, None)


# Factory function for creating CDN optimizer
def create_cdn_optimizer(
    provider: CDNProvider = CDNProvider.CLOUDFRONT,
    base_url: str = None,
    api_key: str = None,
    **kwargs
) -> CDNOptimizer:
    """Create CDN optimizer with configuration."""
    
    cdn_config = CDNConfig(
        provider=provider,
        base_url=base_url or settings.CDN_BASE_URL,
        api_key=api_key or settings.CDN_API_KEY,
        zone_id=kwargs.get('zone_id', settings.CDN_ZONE_ID),
        distribution_id=kwargs.get('distribution_id', settings.CDN_DISTRIBUTION_ID),
        cache_ttl=kwargs.get('cache_ttl', 86400),
        enable_compression=kwargs.get('enable_compression', True),
        enable_minification=kwargs.get('enable_minification', True)
    )
    
    optimization_config = AssetOptimizationConfig(
        image_quality=kwargs.get('image_quality', 85),
        image_max_width=kwargs.get('image_max_width', 2048),
        image_max_height=kwargs.get('image_max_height', 2048),
        enable_webp=kwargs.get('enable_webp', True),
        enable_avif=kwargs.get('enable_avif', False),
        css_minify=kwargs.get('css_minify', True),
        js_minify=kwargs.get('js_minify', True),
        enable_brotli=kwargs.get('enable_brotli', True),
        enable_gzip=kwargs.get('enable_gzip', True)
    )
    
    return CDNOptimizer(cdn_config, optimization_config)