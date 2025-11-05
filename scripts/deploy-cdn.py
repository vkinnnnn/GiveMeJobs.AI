#!/usr/bin/env python3
"""
CDN Deployment and Asset Upload Script
Deploys CloudFront infrastructure and uploads optimized assets
"""

import asyncio
import argparse
import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Optional, Any
import boto3
import structlog
from botocore.exceptions import ClientError, NoCredentialsError

# Add the project root to Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from packages.python_services.app.services.cdn_optimization_service import (
    CDNOptimizationService, 
    AssetConfig
)

logger = structlog.get_logger()

class CDNDeployment:
    """CDN deployment and management"""
    
    def __init__(self, environment: str = "production"):
        self.environment = environment
        self.region = "us-east-1"  # CloudFront requires us-east-1 for certificates
        
        # AWS clients
        self.cloudformation = boto3.client('cloudformation', region_name=self.region)
        self.s3 = boto3.client('s3', region_name=self.region)
        self.cloudfront = boto3.client('cloudfront', region_name=self.region)
        self.route53 = boto3.client('route53', region_name=self.region)
        
        # Configuration
        self.stack_name = f"givemejobs-cdn-{environment}"
        self.template_path = Path("infrastructure/cloudfront-config.yml")
        
        # Asset optimization service
        self.asset_config = AssetConfig(
            image_quality=85,
            image_formats=['webp', 'jpeg', 'png'],
            max_image_width=2048,
            max_image_height=2048,
            enable_gzip=True,
            enable_brotli=True,
            compression_level=6,
            cache_max_age=31536000,  # 1 year
            immutable_assets=True,
            cdn_base_url="",  # Will be set after deployment
            cdn_regions=['us-east-1', 'eu-west-1', 'ap-southeast-1']
        )
        
        self.cdn_service: Optional[CDNOptimizationService] = None
    
    async def deploy_infrastructure(
        self, 
        domain_name: str,
        certificate_arn: str,
        hosted_zone_id: str,
        s3_bucket_name: Optional[str] = None
    ) -> Dict[str, str]:
        """Deploy CloudFront infrastructure using CloudFormation"""
        
        if s3_bucket_name is None:
            s3_bucket_name = f"givemejobs-static-assets"
        
        try:
            # Read CloudFormation template
            with open(self.template_path, 'r') as f:
                template_body = f.read()
            
            # Prepare parameters
            parameters = [
                {
                    'ParameterKey': 'Environment',
                    'ParameterValue': self.environment
                },
                {
                    'ParameterKey': 'DomainName',
                    'ParameterValue': domain_name
                },
                {
                    'ParameterKey': 'S3BucketName',
                    'ParameterValue': s3_bucket_name
                },
                {
                    'ParameterKey': 'CertificateArn',
                    'ParameterValue': certificate_arn
                },
                {
                    'ParameterKey': 'HostedZoneId',
                    'ParameterValue': hosted_zone_id
                }
            ]
            
            # Check if stack exists
            stack_exists = await self._stack_exists()
            
            if stack_exists:
                logger.info("Updating existing CloudFormation stack", stack_name=self.stack_name)
                
                response = self.cloudformation.update_stack(
                    StackName=self.stack_name,
                    TemplateBody=template_body,
                    Parameters=parameters,
                    Capabilities=['CAPABILITY_IAM']
                )
                
                operation = "UPDATE"
                
            else:
                logger.info("Creating new CloudFormation stack", stack_name=self.stack_name)
                
                response = self.cloudformation.create_stack(
                    StackName=self.stack_name,
                    TemplateBody=template_body,
                    Parameters=parameters,
                    Capabilities=['CAPABILITY_IAM'],
                    OnFailure='ROLLBACK'
                )
                
                operation = "CREATE"
            
            # Wait for stack operation to complete
            logger.info(f"Waiting for stack {operation.lower()} to complete...")
            
            if operation == "CREATE":
                waiter = self.cloudformation.get_waiter('stack_create_complete')
            else:
                waiter = self.cloudformation.get_waiter('stack_update_complete')
            
            waiter.wait(
                StackName=self.stack_name,
                WaiterConfig={
                    'Delay': 30,
                    'MaxAttempts': 120  # 60 minutes max
                }
            )
            
            # Get stack outputs
            outputs = await self._get_stack_outputs()
            
            logger.info("CloudFormation stack deployment completed", 
                       stack_name=self.stack_name,
                       operation=operation,
                       outputs=outputs)
            
            return outputs
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            
            if error_code == 'ValidationError' and 'No updates are to be performed' in str(e):
                logger.info("No updates needed for CloudFormation stack")
                return await self._get_stack_outputs()
            else:
                logger.error("CloudFormation deployment failed", 
                           error_code=error_code,
                           error_message=str(e))
                raise
        
        except Exception as e:
            logger.error("Infrastructure deployment failed", error=str(e))
            raise
    
    async def _stack_exists(self) -> bool:
        """Check if CloudFormation stack exists"""
        try:
            self.cloudformation.describe_stacks(StackName=self.stack_name)
            return True
        except ClientError as e:
            if e.response['Error']['Code'] == 'ValidationError':
                return False
            raise
    
    async def _get_stack_outputs(self) -> Dict[str, str]:
        """Get CloudFormation stack outputs"""
        try:
            response = self.cloudformation.describe_stacks(StackName=self.stack_name)
            stack = response['Stacks'][0]
            
            outputs = {}
            for output in stack.get('Outputs', []):
                outputs[output['OutputKey']] = output['OutputValue']
            
            return outputs
            
        except Exception as e:
            logger.error("Failed to get stack outputs", error=str(e))
            return {}
    
    async def optimize_and_upload_assets(
        self, 
        assets_dir: Path,
        s3_bucket: str,
        cdn_url: str
    ) -> Dict[str, Any]:
        """Optimize assets and upload to S3/CDN"""
        
        try:
            # Update CDN configuration
            self.asset_config.cdn_base_url = cdn_url
            
            # Initialize CDN service
            self.cdn_service = CDNOptimizationService(self.asset_config)
            await self.cdn_service.initialize()
            
            # Optimize all assets in directory
            logger.info("Starting asset optimization", assets_dir=str(assets_dir))
            
            optimized_assets = await self.cdn_service.optimize_directory(assets_dir)
            
            # Generate asset manifest
            manifest = await self.cdn_service.generate_asset_manifest(assets_dir)
            
            # Upload optimized assets to S3
            upload_results = []
            
            for asset_path, asset_info in optimized_assets.items():
                try:
                    # Upload to S3
                    s3_key = f"assets/{asset_path}"
                    
                    await self._upload_to_s3(
                        asset_info.optimized_path,
                        s3_bucket,
                        s3_key
                    )
                    
                    # Update asset info with CDN URL
                    asset_info.cdn_url = f"{cdn_url}/{s3_key}"
                    
                    upload_results.append({
                        "local_path": asset_info.optimized_path,
                        "s3_key": s3_key,
                        "cdn_url": asset_info.cdn_url,
                        "size": asset_info.optimized_size,
                        "compression_ratio": asset_info.compression_ratio
                    })
                    
                except Exception as e:
                    logger.error("Failed to upload asset", 
                               asset_path=asset_path, error=str(e))
            
            # Upload manifest to S3
            manifest_path = assets_dir / "manifest.json"
            await self._upload_to_s3(
                str(manifest_path),
                s3_bucket,
                "assets/manifest.json"
            )
            
            # Get optimization statistics
            stats = self.cdn_service.get_optimization_stats()
            
            logger.info("Asset optimization and upload completed",
                       total_assets=len(optimized_assets),
                       uploaded_assets=len(upload_results),
                       **stats)
            
            return {
                "optimized_assets": len(optimized_assets),
                "uploaded_assets": len(upload_results),
                "manifest_url": f"{cdn_url}/assets/manifest.json",
                "optimization_stats": stats,
                "upload_results": upload_results
            }
            
        except Exception as e:
            logger.error("Asset optimization and upload failed", error=str(e))
            raise
        
        finally:
            if self.cdn_service:
                await self.cdn_service.close()
    
    async def _upload_to_s3(
        self, 
        local_path: str, 
        bucket: str, 
        key: str
    ):
        """Upload file to S3 with optimized settings"""
        
        try:
            # Determine content type
            import mimetypes
            content_type = mimetypes.guess_type(local_path)[0] or 'application/octet-stream'
            
            # Prepare metadata
            extra_args = {
                'ContentType': content_type,
                'CacheControl': f'public, max-age={self.asset_config.cache_max_age}',
                'Metadata': {
                    'uploaded-by': 'cdn-deployment-script',
                    'environment': self.environment
                }
            }
            
            # Add immutable cache control for versioned assets
            if self.asset_config.immutable_assets and any(
                pattern in key for pattern in ['.css', '.js', '.woff2', '.jpg', '.png', '.webp']
            ):
                extra_args['CacheControl'] += ', immutable'
            
            # Upload file
            self.s3.upload_file(
                local_path,
                bucket,
                key,
                ExtraArgs=extra_args
            )
            
            logger.debug("File uploaded to S3", 
                        local_path=local_path,
                        s3_key=key,
                        content_type=content_type)
            
        except Exception as e:
            logger.error("S3 upload failed", 
                        local_path=local_path,
                        s3_key=key,
                        error=str(e))
            raise
    
    async def invalidate_cdn_cache(
        self, 
        distribution_id: str, 
        paths: List[str]
    ) -> str:
        """Invalidate CloudFront cache for specified paths"""
        
        try:
            # Create invalidation
            response = self.cloudfront.create_invalidation(
                DistributionId=distribution_id,
                InvalidationBatch={
                    'Paths': {
                        'Quantity': len(paths),
                        'Items': paths
                    },
                    'CallerReference': f"deployment-{int(asyncio.get_event_loop().time())}"
                }
            )
            
            invalidation_id = response['Invalidation']['Id']
            
            logger.info("CloudFront cache invalidation created",
                       distribution_id=distribution_id,
                       invalidation_id=invalidation_id,
                       paths=paths)
            
            return invalidation_id
            
        except Exception as e:
            logger.error("CloudFront cache invalidation failed", 
                        distribution_id=distribution_id,
                        paths=paths,
                        error=str(e))
            raise
    
    async def get_deployment_status(self) -> Dict[str, Any]:
        """Get current deployment status"""
        
        try:
            # Check CloudFormation stack
            stack_status = "NOT_DEPLOYED"
            stack_outputs = {}
            
            try:
                response = self.cloudformation.describe_stacks(StackName=self.stack_name)
                stack = response['Stacks'][0]
                stack_status = stack['StackStatus']
                
                for output in stack.get('Outputs', []):
                    stack_outputs[output['OutputKey']] = output['OutputValue']
                    
            except ClientError as e:
                if e.response['Error']['Code'] != 'ValidationError':
                    raise
            
            # Check S3 bucket
            s3_status = "NOT_FOUND"
            s3_objects_count = 0
            
            if 'S3BucketName' in stack_outputs:
                try:
                    bucket_name = stack_outputs['S3BucketName']
                    self.s3.head_bucket(Bucket=bucket_name)
                    s3_status = "EXISTS"
                    
                    # Count objects
                    response = self.s3.list_objects_v2(Bucket=bucket_name, Prefix="assets/")
                    s3_objects_count = response.get('KeyCount', 0)
                    
                except ClientError:
                    s3_status = "ERROR"
            
            # Check CloudFront distribution
            cf_status = "NOT_FOUND"
            
            if 'CloudFrontDistributionId' in stack_outputs:
                try:
                    distribution_id = stack_outputs['CloudFrontDistributionId']
                    response = self.cloudfront.get_distribution(Id=distribution_id)
                    cf_status = response['Distribution']['Status']
                    
                except ClientError:
                    cf_status = "ERROR"
            
            return {
                "environment": self.environment,
                "stack_name": self.stack_name,
                "stack_status": stack_status,
                "s3_status": s3_status,
                "s3_objects_count": s3_objects_count,
                "cloudfront_status": cf_status,
                "outputs": stack_outputs
            }
            
        except Exception as e:
            logger.error("Failed to get deployment status", error=str(e))
            return {"error": str(e)}

async def main():
    """Main deployment function"""
    
    parser = argparse.ArgumentParser(description="Deploy CDN infrastructure and optimize assets")
    parser.add_argument("--environment", default="production", help="Environment name")
    parser.add_argument("--domain", required=True, help="CDN domain name")
    parser.add_argument("--certificate-arn", required=True, help="ACM certificate ARN")
    parser.add_argument("--hosted-zone-id", required=True, help="Route 53 hosted zone ID")
    parser.add_argument("--assets-dir", default="packages/frontend/public", help="Assets directory")
    parser.add_argument("--bucket-name", help="S3 bucket name (optional)")
    parser.add_argument("--skip-infrastructure", action="store_true", help="Skip infrastructure deployment")
    parser.add_argument("--skip-assets", action="store_true", help="Skip asset optimization and upload")
    parser.add_argument("--invalidate-cache", action="store_true", help="Invalidate CloudFront cache")
    parser.add_argument("--status-only", action="store_true", help="Show deployment status only")
    
    args = parser.parse_args()
    
    # Configure logging
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.JSONRenderer()
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )
    
    try:
        # Initialize deployment
        deployment = CDNDeployment(args.environment)
        
        # Show status if requested
        if args.status_only:
            status = await deployment.get_deployment_status()
            print(json.dumps(status, indent=2))
            return
        
        # Deploy infrastructure
        outputs = {}
        if not args.skip_infrastructure:
            outputs = await deployment.deploy_infrastructure(
                domain_name=args.domain,
                certificate_arn=args.certificate_arn,
                hosted_zone_id=args.hosted_zone_id,
                s3_bucket_name=args.bucket_name
            )
        else:
            outputs = await deployment._get_stack_outputs()
        
        # Optimize and upload assets
        if not args.skip_assets and outputs:
            assets_dir = Path(args.assets_dir)
            
            if not assets_dir.exists():
                logger.error("Assets directory not found", path=str(assets_dir))
                sys.exit(1)
            
            upload_results = await deployment.optimize_and_upload_assets(
                assets_dir=assets_dir,
                s3_bucket=outputs['S3BucketName'],
                cdn_url=outputs['CDNUrl']
            )
            
            print(f"\nAsset optimization completed:")
            print(f"- Optimized assets: {upload_results['optimized_assets']}")
            print(f"- Uploaded assets: {upload_results['uploaded_assets']}")
            print(f"- Manifest URL: {upload_results['manifest_url']}")
            print(f"- Total savings: {upload_results['optimization_stats']['savings_percentage']:.1f}%")
        
        # Invalidate cache if requested
        if args.invalidate_cache and outputs:
            invalidation_id = await deployment.invalidate_cdn_cache(
                distribution_id=outputs['CloudFrontDistributionId'],
                paths=['/*']  # Invalidate all paths
            )
            print(f"\nCache invalidation created: {invalidation_id}")
        
        # Show final status
        print(f"\nDeployment completed successfully!")
        print(f"CDN URL: {outputs.get('CDNUrl', 'N/A')}")
        print(f"CloudFront Distribution: {outputs.get('CloudFrontDistributionId', 'N/A')}")
        print(f"S3 Bucket: {outputs.get('S3BucketName', 'N/A')}")
        
    except NoCredentialsError:
        logger.error("AWS credentials not found. Please configure your credentials.")
        sys.exit(1)
    
    except Exception as e:
        logger.error("Deployment failed", error=str(e))
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())