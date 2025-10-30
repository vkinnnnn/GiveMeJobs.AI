import { Request, Response, NextFunction } from 'express';
import { getCacheControl, getCDNUrl, shouldUseCDN } from '../config/cdn.config';
import path from 'path';

/**
 * Static assets middleware with CDN support
 */
export function staticAssetsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const filePath = req.path;
  
  // Check if this is a static asset request
  if (!isStaticAsset(filePath)) {
    next();
    return;
  }
  
  // Set cache control headers
  const cacheControl = getCacheControl(filePath);
  res.setHeader('Cache-Control', cacheControl);
  
  // Set security headers for static assets
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // If CDN is enabled and should be used for this asset, redirect to CDN
  if (shouldUseCDN(filePath)) {
    const cdnUrl = getCDNUrl(filePath);
    if (cdnUrl !== filePath) {
      res.redirect(301, cdnUrl);
      return;
    }
  }
  
  next();
}

/**
 * Check if path is a static asset
 */
function isStaticAsset(filePath: string): boolean {
  const staticExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico',
    '.pdf', '.docx', '.doc',
    '.woff', '.woff2', '.ttf', '.eot',
    '.js', '.mjs', '.css',
    '.mp4', '.webm', '.mp3', '.wav',
  ];
  
  const extension = path.extname(filePath).toLowerCase();
  return staticExtensions.includes(extension);
}

/**
 * Image optimization middleware
 * Adds headers for image optimization
 */
export function imageOptimizationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const filePath = req.path;
  const extension = path.extname(filePath).toLowerCase();
  
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  
  if (imageExtensions.includes(extension)) {
    // Set image-specific headers
    res.setHeader('Accept-Ranges', 'bytes');
    
    // Support for WebP
    const acceptHeader = req.get('Accept') || '';
    if (acceptHeader.includes('image/webp')) {
      res.setHeader('Vary', 'Accept');
    }
    
    // Set appropriate content type
    const contentTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
    };
    
    const contentType = contentTypes[extension];
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
  }
  
  next();
}

/**
 * Compression middleware configuration
 * Optimizes compression for different asset types
 */
export function getCompressionOptions() {
  return {
    // Compression level (0-9, higher = better compression but slower)
    level: 6,
    
    // Minimum size to compress (bytes)
    threshold: 1024,
    
    // Filter function to determine what to compress
    filter: (req: Request, res: Response) => {
      const contentType = res.getHeader('Content-Type') as string;
      
      // Don't compress if already compressed
      if (req.headers['x-no-compression']) {
        return false;
      }
      
      // Compress text-based content
      const compressibleTypes = [
        'text/',
        'application/json',
        'application/javascript',
        'application/xml',
        'application/x-javascript',
      ];
      
      return compressibleTypes.some(type => contentType?.includes(type));
    },
  };
}

/**
 * ETag generation middleware
 * Generates ETags for static assets
 */
export function etagMiddleware(req: Request, res: Response, next: NextFunction): void {
  const originalSend = res.send;
  
  res.send = function (data: any) {
    // Generate ETag based on content
    if (data && typeof data === 'string') {
      const etag = generateETag(data);
      res.setHeader('ETag', etag);
      
      // Check if client has cached version
      const clientETag = req.get('If-None-Match');
      if (clientETag === etag) {
        res.status(304).end();
        return res;
      }
    }
    
    return originalSend.call(this, data);
  };
  
  next();
}

/**
 * Generate ETag from content
 */
function generateETag(content: string): string {
  const crypto = require('crypto');
  const hash = crypto.createHash('md5').update(content).digest('hex');
  return `"${hash}"`;
}

/**
 * CORS headers for static assets
 */
export function staticAssetsCORS(req: Request, res: Response, next: NextFunction): void {
  // Allow cross-origin requests for fonts and images
  const filePath = req.path;
  const extension = path.extname(filePath).toLowerCase();
  
  const crossOriginAssets = ['.woff', '.woff2', '.ttf', '.eot', '.svg'];
  
  if (crossOriginAssets.includes(extension)) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  
  next();
}

/**
 * Preload headers for critical assets
 */
export function preloadHeaders(criticalAssets: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const links = criticalAssets.map(asset => {
      const extension = path.extname(asset).toLowerCase();
      let asType = 'fetch';
      
      if (['.js', '.mjs'].includes(extension)) asType = 'script';
      else if (extension === '.css') asType = 'style';
      else if (['.woff', '.woff2'].includes(extension)) asType = 'font';
      else if (['.jpg', '.jpeg', '.png', '.webp'].includes(extension)) asType = 'image';
      
      return `<${asset}>; rel=preload; as=${asType}`;
    });
    
    if (links.length > 0) {
      res.setHeader('Link', links.join(', '));
    }
    
    next();
  };
}
