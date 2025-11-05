#!/usr/bin/env python3
"""
CDN Setup and Configuration Script

This script helps set up CDN configuration for the GiveMeJobs platform.
It supports CloudFront, Cloudflare, and custom CDN providers.
"""

import asyncio
import json
import os
import sys
from pathlib import Path
from typing import Dict, Any, Optional

import click
import structlog
from app.core.cdn_optimization import (
    CDNProvider, 
    CDNOptimizer, 
    AssetVersionManager,
    create_cdn_optimizer
)

logger = structlog.get_logger(__name__)


@click.group()
def cli():
    """CDN Setup and Management CLI."""
    pass


@cli.command()
@click.option('--provider', type=click.Choice(['cloudfront', 'cloudflare', 'custom']), 
              default='cloudfront', help='CDN provider')
@click.option('--base-url', required=True, help='CDN base URL')
@click.option('--api-key', help='CDN API key (if required)')
@click.option('--zone-id', help='Zone ID (Cloudflare)')
@click.option('--distribution-id', help='Distribution ID (CloudFront)')
@click.option('--config-file', default='cdn_config.json', help='Configuration file path')
def configure(provider: str, base_url: str, api_key: Optional[str], 
              zone_id: Optional[str], distribution_id: Optional[str], 
              config_file: str):
    """Configure CDN settings."""
    
    config = {
        'provider': provider,
        'base_url': base_url,
        'api_key': api_key,
        'zone_id': zone_id,
        'distribution_id': distribution_id,
        'cache_ttl': 86400,
        'enable_compression': True,
        'enable_minification': True,
        'optimization': {
            'image_quality': 85,
            'image_max_width': 2048,
            'image_max_height': 2048,
            'enable_webp': True,
            'enable_avif': False,
            'css_minify': True,
            'js_minify': True,
            'enable_brotli': True,
            'enable_gzip': True
        }
    }
    
    # Save configuration
    config_path = Path(config_file)
    config_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(config_path, 'w') as f:
        json.dump(config, f, indent=2)
    
    click.echo(f"CDN configuration saved to {config_path}")
    click.echo(f"Provider: {provider}")
    click.echo(f"Base URL: {base_url}")


@cli.command()
@click.option('--directory', required=True, type=click.Path(exists=True), 
              help='Directory containing assets to optimize')
@click.option('--pattern', default='*', help='File pattern to match')
@click.option('--config-file', default='cdn_config.json', help='Configuration file path')
@click.option('--max-concurrent', default=5, help='Maximum concurrent optimizations')
def optimize(directory: str, pattern: str, config_file: str, max_concurrent: int):
    """Optimize and upload assets to CDN."""
    
    async def run_optimization():
        # Load configuration
        config_path = Path(config_file)
        if not config_path.exists():
            click.echo(f"Configuration file {config_file} not found. Run 'configure' first.")
            return
        
        with open(config_path) as f:
            config = json.load(f)
        
        # Create CDN optimizer
        provider = CDNProvider(config['provider'])
        optimizer = create_cdn_optimizer(
            provider=provider,
            base_url=config['base_url'],
            api_key=config.get('api_key'),
            zone_id=config.get('zone_id'),
            distribution_id=config.get('distribution_id'),
            **config.get('optimization', {})
        )
        
        # Optimize assets
        directory_path = Path(directory)
        
        async with optimizer:
            click.echo(f"Optimizing assets in {directory_path} with pattern '{pattern}'...")
            
            results = await optimizer.batch_optimize_directory(
                directory_path, 
                pattern, 
                max_concurrent
            )
            
            click.echo(f"Optimization completed. {len(results)} assets processed.")
            
            # Display results
            for result in results:
                click.echo(f"  {result.path}: {result.size} -> {result.optimized_size} bytes "
                          f"({result.compression_ratio:.1%} reduction)")
    
    asyncio.run(run_optimization())


@cli.command()
@click.option('--config-file', default='cdn_config.json', help='Configuration file path')
@click.argument('paths', nargs=-1, required=True)
def invalidate(config_file: str, paths):
    """Invalidate CDN cache for specified paths."""
    
    async def run_invalidation():
        # Load configuration
        config_path = Path(config_file)
        if not config_path.exists():
            click.echo(f"Configuration file {config_file} not found. Run 'configure' first.")
            return
        
        with open(config_path) as f:
            config = json.load(f)
        
        # Create CDN optimizer
        provider = CDNProvider(config['provider'])
        optimizer = create_cdn_optimizer(
            provider=provider,
            base_url=config['base_url'],
            api_key=config.get('api_key'),
            zone_id=config.get('zone_id'),
            distribution_id=config.get('distribution_id')
        )
        
        async with optimizer:
            click.echo(f"Invalidating cache for {len(paths)} paths...")
            
            success = await optimizer.invalidate_cache(list(paths))
            
            if success:
                click.echo("Cache invalidation completed successfully.")
            else:
                click.echo("Cache invalidation failed.")
    
    asyncio.run(run_invalidation())


@cli.command()
@click.option('--manifest-path', default='asset_manifest.json', help='Asset manifest file path')
def show_manifest(manifest_path: str):
    """Show current asset manifest."""
    
    async def run_show():
        manager = AssetVersionManager(Path(manifest_path))
        await manager.load_manifest()
        
        if not manager.manifest:
            click.echo("No assets in manifest.")
            return
        
        click.echo("Asset Manifest:")
        click.echo("-" * 50)
        
        for original, versioned in manager.manifest.items():
            click.echo(f"{original} -> {versioned}")
    
    asyncio.run(run_show())


@cli.command()
@click.option('--config-file', default='cdn_config.json', help='Configuration file path')
def test_connection(config_file: str):
    """Test CDN connection and configuration."""
    
    async def run_test():
        # Load configuration
        config_path = Path(config_file)
        if not config_path.exists():
            click.echo(f"Configuration file {config_file} not found. Run 'configure' first.")
            return
        
        with open(config_path) as f:
            config = json.load(f)
        
        click.echo("Testing CDN configuration...")
        click.echo(f"Provider: {config['provider']}")
        click.echo(f"Base URL: {config['base_url']}")
        
        # Create test file
        test_content = b"CDN test file content"
        test_path = "test/cdn_test.txt"
        
        # Create CDN optimizer
        provider = CDNProvider(config['provider'])
        optimizer = create_cdn_optimizer(
            provider=provider,
            base_url=config['base_url'],
            api_key=config.get('api_key'),
            zone_id=config.get('zone_id'),
            distribution_id=config.get('distribution_id')
        )
        
        async with optimizer:
            try:
                # Test upload (simulated)
                cdn_url = await optimizer._upload_to_cdn(test_path, test_content)
                click.echo(f"✓ Upload test successful: {cdn_url}")
                
                # Test cache invalidation (simulated)
                success = await optimizer.invalidate_cache([test_path])
                if success:
                    click.echo("✓ Cache invalidation test successful")
                else:
                    click.echo("✗ Cache invalidation test failed")
                
                click.echo("CDN configuration appears to be working correctly.")
                
            except Exception as e:
                click.echo(f"✗ CDN test failed: {e}")
    
    asyncio.run(run_test())


if __name__ == '__main__':
    cli()