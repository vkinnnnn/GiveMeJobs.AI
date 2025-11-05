"""
CDN and Static Asset Optimization Service
Handles image optimization, compression, asset versioning, and CDN management
"""

import asyncio
import hashlib
import mimetypes
import os
import time
from typing import Dict, List, Optional, Any, Tuple, Union
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
import structlog
import aiofiles
import aiohttp
from PIL import Image, ImageOpt
import gzip
import brotli
from io import BytesIO
import json

logger = structlog.get_logger()

@dataclass
class AssetConfig:
    """Asset optimization configuration"""
    # Image optimization
    image_quality: int = 85
    image_formats: List[str] = None
    max_image_width: int = 2048
    max_image_height: int = 2048
    
    # Compression
    enable_gzip: bool = True
    enable_brotli: bool = True
    compression_level: int = 6
    
    # Caching
    cache_max_age: int = 31536000  # 1 year
    immutable_assets: bool = True
    
    # CDN
    cdn_base_url: str = ""
    cdn_regions: List[str] = None
    
    def __post_init__(self):
        if self.image_formats is None:
            self.image_formats = ['webp', 'jpeg', 'png']
        if self.cdn_regions is None:
            self.cdn_regions = ['us-east-1', 'eu-west-1', 'ap-southeast-1']

@dataclass
class OptimizedAsset:
    """Optimized asset information"""
    original_path: str
    optimized_path: str
    original_size: int
    optimized_size: int
    compression_ratio: float
    format: str
    width: Optional[int] = None
    height: Optional[int] = None
    hash: Optional[str] = None
    cdn_url: Optional[str] = None
    created_at: datetime = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.utcnow()
        
        if self.original_size > 0:
            self.compression_ratio = (self.original_size - self.optimized_size) / self.original_size

class CDNOptimizationService:
    """CDN and static asset optimization service"""
    
    def __init__(self, config: AssetConfig):
        self.config = config
        self.asset_cache: Dict[str, OptimizedAsset] = {}
        self.optimization_stats = {
            "total_assets": 0,
            "total_original_size": 0,
            "total_optimized_size": 0,
            "total_savings": 0,
            "optimization_time": 0
        }
        
        # Asset directories
        self.static_dir = Path("static")
        self.optimized_dir = Path("static/optimized")
        self.cache_dir = Path("static/cache")
        
        # Ensure directories exist
        self.optimized_dir.mkdir(parents=True, exist_ok=True)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        # CDN client
        self.cdn_session: Optional[aiohttp.ClientSession] = None
    
    async def initialize(self):
        """Initialize the CDN optimization service"""
        try:
            # Create HTTP session for CDN operations
            self.cdn_session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=30)
            )
            
            # Load existing asset cache
            await self._load_asset_cache()
            
            logger.info("CDN optimization service initialized")
            
        except Exception as e:
            logger.error("Failed to initialize CDN service", error=str(e))
            raise
    
    async def close(self):
        """Close the CDN optimization service"""
        if self.cdn_session:
            await self.cdn_session.close()
        
        # Save asset cache
        await self._save_asset_cache()
        
        logger.info("CDN optimization service closed")
    
    async def optimize_image(
        self, 
        input_path: Union[str, Path], 
        output_path: Optional[Union[str, Path]] = None,
        target_format: Optional[str] = None,
        quality: Optional[int] = None
    ) -> OptimizedAsset:
        """Optimize a single image"""
        start_time = time.time()
        input_path = Path(input_path)
        
        try:
            # Check if already optimized
            cache_key = self._get_cache_key(str(input_path))
            if cache_key in self.asset_cache:
                cached_asset = self.asset_cache[cache_key]
                if Path(cached_asset.optimized_path).exists():
                    return cached_asset
            
            # Read original image
            async with aiofiles.open(input_path, 'rb') as f:
                image_data = await f.read()
            
            original_size = len(image_data)
            
            # Open image with PIL
            image = Image.open(BytesIO(image_data))
            original_format = image.format.lower() if image.format else 'jpeg'
            
            # Determine target format
            if target_format is None:
                target_format = self._select_optimal_format(image, original_format)
            
            # Determine output path
            if output_path is None:
                output_path = self._generate_optimized_path(input_path, target_format)
            
            output_path = Path(output_path)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Optimize image
            optimized_image = await self._optimize_image_data(
                image, 
                target_format, 
                quality or self.config.image_quality
            )
            
            # Save optimized image
            async with aiofiles.open(output_path, 'wb') as f:
                await f.write(optimized_image)
            
            optimized_size = len(optimized_image)
            
            # Create asset record
            asset = OptimizedAsset(
                original_path=str(input_path),
                optimized_path=str(output_path),
                original_size=original_size,
                optimized_size=optimized_size,
                format=target_format,
                width=image.width,
                height=image.height,
                hash=self._calculate_hash(optimized_image)
            )
            
            # Cache the asset
            self.asset_cache[cache_key] = asset
            
            # Update stats
            self.optimization_stats["total_assets"] += 1
            self.optimization_stats["total_original_size"] += original_size
            self.optimization_stats["total_optimized_size"] += optimized_size
            self.optimization_stats["total_savings"] += (original_size - optimized_size)
            self.optimization_stats["optimization_time"] += (time.time() - start_time)
            
            logger.info("Image optimized", 
                       original_size=original_size,
                       optimized_size=optimized_size,
                       savings_percent=asset.compression_ratio * 100,
                       format=target_format)
            
            return asset
            
        except Exception as e:
            logger.error("Image optimization failed", 
                        path=str(input_path), error=str(e))
            raise
    
    async def _optimize_image_data(
        self, 
        image: Image.Image, 
        target_format: str, 
        quality: int
    ) -> bytes:
        """Optimize image data"""
        # Resize if too large
        if (image.width > self.config.max_image_width or 
            image.height > self.config.max_image_height):
            image.thumbnail(
                (self.config.max_image_width, self.config.max_image_height),
                Image.Resampling.LANCZOS
            )
        
        # Convert color mode if necessary
        if target_format == 'jpeg' and image.mode in ('RGBA', 'LA', 'P'):
            # Convert to RGB for JPEG
            background = Image.new('RGB', image.size, (255, 255, 255))
            if image.mode == 'P':
                image = image.convert('RGBA')
            background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
            image = background
        elif target_format == 'webp' and image.mode not in ('RGB', 'RGBA'):
            image = image.convert('RGBA' if 'transparency' in image.info else 'RGB')
        
        # Save to bytes
        output = BytesIO()
        
        if target_format == 'webp':
            image.save(output, 'WEBP', quality=quality, optimize=True)
        elif target_format == 'jpeg':
            image.save(output, 'JPEG', quality=quality, optimize=True)
        elif target_format == 'png':
            image.save(output, 'PNG', optimize=True)
        else:
            raise ValueError(f"Unsupported format: {target_format}")
        
        return output.getvalue()
    
    def _select_optimal_format(self, image: Image.Image, original_format: str) -> str:
        """Select optimal image format based on content"""
        # Check if image has transparency
        has_transparency = (
            image.mode in ('RGBA', 'LA') or 
            'transparency' in image.info
        )
        
        # For images with transparency, prefer WebP or PNG
        if has_transparency:
            return 'webp' if 'webp' in self.config.image_formats else 'png'
        
        # For photos, prefer WebP or JPEG
        if self._is_photo(image):
            return 'webp' if 'webp' in self.config.image_formats else 'jpeg'
        
        # For graphics/illustrations, prefer WebP or PNG
        return 'webp' if 'webp' in self.config.image_formats else 'png'
    
    def _is_photo(self, image: Image.Image) -> bool:
        """Determine if image is likely a photograph"""
        # Simple heuristic: photos typically have more colors and less sharp edges
        if image.mode not in ('RGB', 'RGBA'):
            return False
        
        # Sample the image to check color diversity
        sample = image.resize((100, 100))
        colors = len(sample.getcolors(maxcolors=256*256*256))
        
        # Photos typically have more unique colors
        return colors > 1000
    
    def _generate_optimized_path(self, original_path: Path, target_format: str) -> Path:
        """Generate path for optimized asset"""
        stem = original_path.stem
        return self.optimized_dir / f"{stem}.{target_format}"
    
    async def compress_text_asset(
        self, 
        input_path: Union[str, Path],
        output_dir: Optional[Union[str, Path]] = None
    ) -> Dict[str, OptimizedAsset]:
        """Compress text-based assets (CSS, JS, HTML)"""
        input_path = Path(input_path)
        
        if output_dir is None:
            output_dir = self.optimized_dir
        else:
            output_dir = Path(output_dir)
        
        output_dir.mkdir(parents=True, exist_ok=True)
        
        try:
            # Read original file
            async with aiofiles.open(input_path, 'rb') as f:
                original_data = await f.read()
            
            original_size = len(original_data)
            compressed_assets = {}
            
            # Generate compressed versions
            if self.config.enable_gzip:
                gzip_data = gzip.compress(original_data, compresslevel=self.config.compression_level)
                gzip_path = output_dir / f"{input_path.name}.gz"
                
                async with aiofiles.open(gzip_path, 'wb') as f:
                    await f.write(gzip_data)
                
                compressed_assets['gzip'] = OptimizedAsset(
                    original_path=str(input_path),
                    optimized_path=str(gzip_path),
                    original_size=original_size,
                    optimized_size=len(gzip_data),
                    format='gzip',
                    hash=self._calculate_hash(gzip_data)
                )
            
            if self.config.enable_brotli:
                brotli_data = brotli.compress(original_data, quality=self.config.compression_level)
                brotli_path = output_dir / f"{input_path.name}.br"
                
                async with aiofiles.open(brotli_path, 'wb') as f:
                    await f.write(brotli_data)
                
                compressed_assets['brotli'] = OptimizedAsset(
                    original_path=str(input_path),
                    optimized_path=str(brotli_path),
                    original_size=original_size,
                    optimized_size=len(brotli_data),
                    format='brotli',
                    hash=self._calculate_hash(brotli_data)
                )
            
            logger.info("Text asset compressed", 
                       path=str(input_path),
                       original_size=original_size,
                       gzip_size=compressed_assets.get('gzip', {}).optimized_size if 'gzip' in compressed_assets else None,
                       brotli_size=compressed_assets.get('brotli', {}).optimized_size if 'brotli' in compressed_assets else None)
            
            return compressed_assets
            
        except Exception as e:
            logger.error("Text asset compression failed", 
                        path=str(input_path), error=str(e))
            raise
    
    async def generate_asset_manifest(self, assets_dir: Union[str, Path]) -> Dict[str, Any]:
        """Generate asset manifest with versioning information"""
        assets_dir = Path(assets_dir)
        manifest = {
            "version": datetime.utcnow().isoformat(),
            "assets": {},
            "cdn_base_url": self.config.cdn_base_url
        }
        
        try:
            # Scan for assets
            for asset_path in assets_dir.rglob("*"):
                if asset_path.is_file() and not asset_path.name.startswith('.'):
                    relative_path = asset_path.relative_to(assets_dir)
                    
                    # Calculate file hash for versioning
                    async with aiofiles.open(asset_path, 'rb') as f:
                        content = await f.read()
                    
                    file_hash = self._calculate_hash(content)
                    file_size = len(content)
                    
                    # Generate versioned filename
                    stem = asset_path.stem
                    suffix = asset_path.suffix
                    versioned_name = f"{stem}.{file_hash[:8]}{suffix}"
                    
                    manifest["assets"][str(relative_path)] = {
                        "versioned_name": versioned_name,
                        "hash": file_hash,
                        "size": file_size,
                        "mime_type": mimetypes.guess_type(str(asset_path))[0],
                        "cdn_url": f"{self.config.cdn_base_url}/{versioned_name}" if self.config.cdn_base_url else None
                    }
            
            # Save manifest
            manifest_path = assets_dir / "manifest.json"
            async with aiofiles.open(manifest_path, 'w') as f:
                await f.write(json.dumps(manifest, indent=2))
            
            logger.info("Asset manifest generated", 
                       assets_count=len(manifest["assets"]),
                       manifest_path=str(manifest_path))
            
            return manifest
            
        except Exception as e:
            logger.error("Asset manifest generation failed", error=str(e))
            raise
    
    async def upload_to_cdn(
        self, 
        asset_path: Union[str, Path], 
        cdn_key: str,
        content_type: Optional[str] = None
    ) -> str:
        """Upload asset to CDN"""
        asset_path = Path(asset_path)
        
        if not self.cdn_session:
            raise RuntimeError("CDN session not initialized")
        
        try:
            # Read asset data
            async with aiofiles.open(asset_path, 'rb') as f:
                asset_data = await f.read()
            
            # Determine content type
            if content_type is None:
                content_type = mimetypes.guess_type(str(asset_path))[0] or 'application/octet-stream'
            
            # Calculate hash for integrity
            asset_hash = self._calculate_hash(asset_data)
            
            # Prepare headers
            headers = {
                'Content-Type': content_type,
                'Content-Length': str(len(asset_data)),
                'Cache-Control': f'public, max-age={self.config.cache_max_age}',
                'ETag': f'"{asset_hash}"'
            }
            
            if self.config.immutable_assets:
                headers['Cache-Control'] += ', immutable'
            
            # Upload to CDN (this would be specific to your CDN provider)
            cdn_url = await self._upload_to_cdn_provider(cdn_key, asset_data, headers)
            
            logger.info("Asset uploaded to CDN", 
                       local_path=str(asset_path),
                       cdn_key=cdn_key,
                       cdn_url=cdn_url,
                       size=len(asset_data))
            
            return cdn_url
            
        except Exception as e:
            logger.error("CDN upload failed", 
                        path=str(asset_path), 
                        cdn_key=cdn_key, 
                        error=str(e))
            raise
    
    async def _upload_to_cdn_provider(
        self, 
        key: str, 
        data: bytes, 
        headers: Dict[str, str]
    ) -> str:
        """Upload to specific CDN provider (implement based on your CDN)"""
        # This is a placeholder - implement based on your CDN provider
        # Examples: AWS CloudFront/S3, Cloudflare, Azure CDN, etc.
        
        # For AWS S3/CloudFront:
        # Use boto3 or aiobotocore to upload to S3
        
        # For Cloudflare:
        # Use Cloudflare API to upload to R2 or Workers KV
        
        # For now, return a mock URL
        return f"{self.config.cdn_base_url}/{key}"
    
    async def optimize_directory(
        self, 
        input_dir: Union[str, Path],
        output_dir: Optional[Union[str, Path]] = None
    ) -> Dict[str, OptimizedAsset]:
        """Optimize all assets in a directory"""
        input_dir = Path(input_dir)
        
        if output_dir is None:
            output_dir = self.optimized_dir
        else:
            output_dir = Path(output_dir)
        
        optimized_assets = {}
        
        try:
            # Find all assets
            image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp'}
            text_extensions = {'.css', '.js', '.html', '.htm', '.json', '.xml', '.svg'}
            
            for asset_path in input_dir.rglob("*"):
                if asset_path.is_file() and not asset_path.name.startswith('.'):
                    extension = asset_path.suffix.lower()
                    relative_path = asset_path.relative_to(input_dir)
                    
                    try:
                        if extension in image_extensions:
                            # Optimize image
                            optimized = await self.optimize_image(asset_path)
                            optimized_assets[str(relative_path)] = optimized
                            
                        elif extension in text_extensions:
                            # Compress text asset
                            compressed = await self.compress_text_asset(asset_path, output_dir)
                            for compression_type, asset in compressed.items():
                                key = f"{relative_path}.{compression_type}"
                                optimized_assets[key] = asset
                        
                    except Exception as e:
                        logger.warning("Failed to optimize asset", 
                                     path=str(asset_path), error=str(e))
            
            logger.info("Directory optimization completed", 
                       input_dir=str(input_dir),
                       assets_optimized=len(optimized_assets))
            
            return optimized_assets
            
        except Exception as e:
            logger.error("Directory optimization failed", 
                        input_dir=str(input_dir), error=str(e))
            raise
    
    async def invalidate_cdn_cache(self, paths: List[str]) -> bool:
        """Invalidate CDN cache for specified paths"""
        if not self.cdn_session:
            raise RuntimeError("CDN session not initialized")
        
        try:
            # This would be specific to your CDN provider
            # For CloudFront: CreateInvalidation API
            # For Cloudflare: Purge Cache API
            
            logger.info("CDN cache invalidation requested", paths=paths)
            
            # Placeholder implementation
            return True
            
        except Exception as e:
            logger.error("CDN cache invalidation failed", 
                        paths=paths, error=str(e))
            return False
    
    def _calculate_hash(self, data: bytes) -> str:
        """Calculate SHA-256 hash of data"""
        return hashlib.sha256(data).hexdigest()
    
    def _get_cache_key(self, path: str) -> str:
        """Generate cache key for asset"""
        return hashlib.md5(path.encode()).hexdigest()
    
    async def _load_asset_cache(self):
        """Load asset cache from disk"""
        cache_file = self.cache_dir / "asset_cache.json"
        
        try:
            if cache_file.exists():
                async with aiofiles.open(cache_file, 'r') as f:
                    cache_data = json.loads(await f.read())
                
                for key, data in cache_data.items():
                    self.asset_cache[key] = OptimizedAsset(**data)
                
                logger.debug("Asset cache loaded", entries=len(self.asset_cache))
                
        except Exception as e:
            logger.warning("Failed to load asset cache", error=str(e))
    
    async def _save_asset_cache(self):
        """Save asset cache to disk"""
        cache_file = self.cache_dir / "asset_cache.json"
        
        try:
            cache_data = {}
            for key, asset in self.asset_cache.items():
                cache_data[key] = {
                    "original_path": asset.original_path,
                    "optimized_path": asset.optimized_path,
                    "original_size": asset.original_size,
                    "optimized_size": asset.optimized_size,
                    "compression_ratio": asset.compression_ratio,
                    "format": asset.format,
                    "width": asset.width,
                    "height": asset.height,
                    "hash": asset.hash,
                    "cdn_url": asset.cdn_url,
                    "created_at": asset.created_at.isoformat() if asset.created_at else None
                }
            
            async with aiofiles.open(cache_file, 'w') as f:
                await f.write(json.dumps(cache_data, indent=2))
            
            logger.debug("Asset cache saved", entries=len(self.asset_cache))
            
        except Exception as e:
            logger.warning("Failed to save asset cache", error=str(e))
    
    def get_optimization_stats(self) -> Dict[str, Any]:
        """Get optimization statistics"""
        total_savings = self.optimization_stats["total_savings"]
        total_original = self.optimization_stats["total_original_size"]
        
        return {
            **self.optimization_stats,
            "savings_percentage": (total_savings / total_original * 100) if total_original > 0 else 0,
            "avg_optimization_time": (
                self.optimization_stats["optimization_time"] / 
                self.optimization_stats["total_assets"]
            ) if self.optimization_stats["total_assets"] > 0 else 0
        }

# Factory function
def create_cdn_service(config: AssetConfig) -> CDNOptimizationService:
    """Create CDN optimization service"""
    return CDNOptimizationService(config)