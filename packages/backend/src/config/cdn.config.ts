import { config } from './index';

/**
 * CDN Configuration
 * Supports CloudFront and Cloudflare
 */

export interface CDNConfig {
  enabled: boolean;
  provider: 'cloudfront' | 'cloudflare' | 'none';
  baseUrl: string;
  bucketName?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  cloudflareZoneId?: string;
  cloudflareApiToken?: string;
}

export const cdnConfig: CDNConfig = {
  enabled: process.env.CDN_ENABLED === 'true',
  provider: (process.env.CDN_PROVIDER as 'cloudfront' | 'cloudflare') || 'none',
  baseUrl: process.env.CDN_BASE_URL || '',
  
  // AWS CloudFront / S3 configuration
  bucketName: process.env.AWS_S3_BUCKET_NAME,
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  
  // Cloudflare configuration
  cloudflareZoneId: process.env.CLOUDFLARE_ZONE_ID,
  cloudflareApiToken: process.env.CLOUDFLARE_API_TOKEN,
};

/**
 * Asset types and their cache durations
 */
export const assetCacheConfig = {
  images: {
    maxAge: 31536000, // 1 year
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico'],
  },
  documents: {
    maxAge: 86400, // 1 day
    extensions: ['.pdf', '.docx', '.doc'],
  },
  fonts: {
    maxAge: 31536000, // 1 year
    extensions: ['.woff', '.woff2', '.ttf', '.eot'],
  },
  scripts: {
    maxAge: 31536000, // 1 year (with versioning)
    extensions: ['.js', '.mjs'],
  },
  styles: {
    maxAge: 31536000, // 1 year (with versioning)
    extensions: ['.css'],
  },
  media: {
    maxAge: 31536000, // 1 year
    extensions: ['.mp4', '.webm', '.mp3', '.wav'],
  },
};

/**
 * Get CDN URL for an asset
 */
export function getCDNUrl(assetPath: string): string {
  if (!cdnConfig.enabled || !cdnConfig.baseUrl) {
    return assetPath;
  }
  
  // Remove leading slash if present
  const cleanPath = assetPath.startsWith('/') ? assetPath.slice(1) : assetPath;
  
  // Ensure base URL doesn't end with slash
  const baseUrl = cdnConfig.baseUrl.endsWith('/') 
    ? cdnConfig.baseUrl.slice(0, -1) 
    : cdnConfig.baseUrl;
  
  return `${baseUrl}/${cleanPath}`;
}

/**
 * Get cache control header for asset type
 */
export function getCacheControl(filename: string): string {
  const extension = filename.substring(filename.lastIndexOf('.')).toLowerCase();
  
  for (const [type, config] of Object.entries(assetCacheConfig)) {
    if (config.extensions.includes(extension)) {
      return `public, max-age=${config.maxAge}, immutable`;
    }
  }
  
  // Default cache control
  return 'public, max-age=3600'; // 1 hour
}

/**
 * Check if file should be served from CDN
 */
export function shouldUseCDN(filename: string): boolean {
  if (!cdnConfig.enabled) {
    return false;
  }
  
  const extension = filename.substring(filename.lastIndexOf('.')).toLowerCase();
  
  return Object.values(assetCacheConfig).some(config =>
    config.extensions.includes(extension)
  );
}

/**
 * Generate versioned asset URL
 */
export function getVersionedAssetUrl(assetPath: string, version?: string): string {
  const url = getCDNUrl(assetPath);
  const versionParam = version || process.env.APP_VERSION || Date.now().toString();
  
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${versionParam}`;
}

/**
 * Image optimization parameters
 */
export interface ImageOptimizationParams {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
  fit?: 'cover' | 'contain' | 'fill';
}

/**
 * Get optimized image URL
 * Works with Cloudflare Image Resizing or CloudFront with Lambda@Edge
 */
export function getOptimizedImageUrl(
  imagePath: string,
  params: ImageOptimizationParams = {}
): string {
  const baseUrl = getCDNUrl(imagePath);
  
  if (cdnConfig.provider === 'cloudflare') {
    // Cloudflare Image Resizing
    const queryParams = new URLSearchParams();
    if (params.width) queryParams.set('width', params.width.toString());
    if (params.height) queryParams.set('height', params.height.toString());
    if (params.quality) queryParams.set('quality', params.quality.toString());
    if (params.format) queryParams.set('format', params.format);
    if (params.fit) queryParams.set('fit', params.fit);
    
    const query = queryParams.toString();
    return query ? `${baseUrl}?${query}` : baseUrl;
  }
  
  // For CloudFront, you would need Lambda@Edge for image optimization
  // This is a simplified version
  return baseUrl;
}

/**
 * Purge CDN cache
 */
export async function purgeCDNCache(paths: string[]): Promise<void> {
  if (!cdnConfig.enabled) {
    return;
  }
  
  if (cdnConfig.provider === 'cloudflare' && cdnConfig.cloudflareApiToken) {
    await purgeCloudflareCache(paths);
  } else if (cdnConfig.provider === 'cloudfront') {
    await purgeCloudFrontCache(paths);
  }
}

/**
 * Purge Cloudflare cache
 */
async function purgeCloudflareCache(paths: string[]): Promise<void> {
  const { cloudflareZoneId, cloudflareApiToken } = cdnConfig;
  
  if (!cloudflareZoneId || !cloudflareApiToken) {
    console.warn('Cloudflare credentials not configured');
    return;
  }
  
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${cloudflareZoneId}/purge_cache`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cloudflareApiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ files: paths }),
      }
    );
    
    if (!response.ok) {
      throw new Error(`Cloudflare cache purge failed: ${response.statusText}`);
    }
    
    console.log('Cloudflare cache purged successfully');
  } catch (error) {
    console.error('Error purging Cloudflare cache:', error);
    throw error;
  }
}

/**
 * Purge CloudFront cache
 */
async function purgeCloudFrontCache(paths: string[]): Promise<void> {
  // This would require AWS SDK
  // Implementation depends on your AWS setup
  console.log('CloudFront cache purge not implemented. Paths:', paths);
  
  // Example implementation would use AWS SDK:
  // const cloudfront = new AWS.CloudFront();
  // await cloudfront.createInvalidation({
  //   DistributionId: 'YOUR_DISTRIBUTION_ID',
  //   InvalidationBatch: {
  //     CallerReference: Date.now().toString(),
  //     Paths: {
  //       Quantity: paths.length,
  //       Items: paths,
  //     },
  //   },
  // }).promise();
}

/**
 * Upload file to CDN storage (S3 or Cloudflare R2)
 */
export async function uploadToCDN(
  file: Buffer,
  path: string,
  contentType: string
): Promise<string> {
  if (!cdnConfig.enabled) {
    throw new Error('CDN is not enabled');
  }
  
  // This would require AWS SDK or Cloudflare R2 SDK
  // Implementation depends on your setup
  console.log('Upload to CDN not fully implemented');
  
  // Return the CDN URL
  return getCDNUrl(path);
}
