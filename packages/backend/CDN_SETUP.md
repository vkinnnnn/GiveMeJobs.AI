# CDN Setup Guide

This guide explains how to configure and use CDN (Content Delivery Network) for static assets in the GiveMeJobs platform.

## Overview

The platform supports two CDN providers:
- **AWS CloudFront** (with S3 as origin)
- **Cloudflare** (with R2 or custom origin)

## Configuration

### Environment Variables

Add the following variables to your `.env` file:

```env
# CDN Configuration
CDN_ENABLED=true
CDN_PROVIDER=cloudfront  # or 'cloudflare'
CDN_BASE_URL=https://cdn.givemejobs.com

# AWS CloudFront / S3 (if using CloudFront)
AWS_S3_BUCKET_NAME=givemejobs-assets
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# Cloudflare (if using Cloudflare)
CLOUDFLARE_ZONE_ID=your_zone_id
CLOUDFLARE_API_TOKEN=your_api_token
```

## AWS CloudFront Setup

### 1. Create S3 Bucket

```bash
aws s3 mb s3://givemejobs-assets --region us-east-1
```

### 2. Configure Bucket Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::givemejobs-assets/*"
    }
  ]
}
```

### 3. Create CloudFront Distribution

1. Go to AWS CloudFront Console
2. Create a new distribution
3. Set origin to your S3 bucket
4. Configure cache behaviors:
   - Images: Cache for 1 year
   - Documents: Cache for 1 day
   - Scripts/Styles: Cache for 1 year (with versioning)

### 4. Configure Cache Policies

Create custom cache policies for different asset types:

**Images Policy:**
- TTL: 31536000 seconds (1 year)
- Query strings: All
- Headers: Accept, Accept-Encoding
- Cookies: None

**Documents Policy:**
- TTL: 86400 seconds (1 day)
- Query strings: All
- Headers: None
- Cookies: None

### 5. Enable Compression

Enable automatic compression in CloudFront for:
- text/html
- text/css
- application/javascript
- application/json

## Cloudflare Setup

### 1. Add Domain to Cloudflare

1. Add your domain to Cloudflare
2. Update nameservers at your domain registrar

### 2. Configure Cache Rules

Create cache rules in Cloudflare dashboard:

**Rule 1: Images**
- If: File extension matches jpg, jpeg, png, gif, webp, svg
- Then: Cache level = Standard, Edge TTL = 1 year

**Rule 2: Documents**
- If: File extension matches pdf, docx, doc
- Then: Cache level = Standard, Edge TTL = 1 day

**Rule 3: Scripts/Styles**
- If: File extension matches js, css
- Then: Cache level = Standard, Edge TTL = 1 year

### 3. Enable Image Optimization

1. Go to Speed > Optimization
2. Enable "Polish" for image optimization
3. Enable "WebP" conversion

### 4. Configure R2 Storage (Optional)

If using Cloudflare R2 for storage:

```bash
# Install Wrangler CLI
npm install -g wrangler

# Create R2 bucket
wrangler r2 bucket create givemejobs-assets

# Upload files
wrangler r2 object put givemejobs-assets/path/to/file.jpg --file ./local/file.jpg
```

## Usage in Code

### Get CDN URL

```typescript
import { getCDNUrl } from './config/cdn.config';

const imageUrl = getCDNUrl('/images/logo.png');
// Returns: https://cdn.givemejobs.com/images/logo.png
```

### Get Optimized Image URL

```typescript
import { getOptimizedImageUrl } from './config/cdn.config';

const optimizedUrl = getOptimizedImageUrl('/images/profile.jpg', {
  width: 300,
  height: 300,
  quality: 85,
  format: 'webp',
  fit: 'cover',
});
```

### Purge Cache

```typescript
import { purgeCDNCache } from './config/cdn.config';

await purgeCDNCache([
  '/images/logo.png',
  '/styles/main.css',
]);
```

### Upload to CDN

```typescript
import { uploadToCDN } from './config/cdn.config';

const fileBuffer = await fs.readFile('./image.jpg');
const cdnUrl = await uploadToCDN(fileBuffer, '/images/new-image.jpg', 'image/jpeg');
```

## Asset Types and Cache Durations

| Asset Type | Extensions | Cache Duration |
|------------|-----------|----------------|
| Images | .jpg, .jpeg, .png, .gif, .webp, .svg, .ico | 1 year |
| Documents | .pdf, .docx, .doc | 1 day |
| Fonts | .woff, .woff2, .ttf, .eot | 1 year |
| Scripts | .js, .mjs | 1 year |
| Styles | .css | 1 year |
| Media | .mp4, .webm, .mp3, .wav | 1 year |

## Best Practices

### 1. Use Versioning for Scripts and Styles

Always version your scripts and styles to bust cache:

```typescript
import { getVersionedAssetUrl } from './config/cdn.config';

const scriptUrl = getVersionedAssetUrl('/js/app.js', '1.2.3');
// Returns: https://cdn.givemejobs.com/js/app.js?v=1.2.3
```

### 2. Optimize Images Before Upload

- Use WebP format for better compression
- Resize images to appropriate dimensions
- Compress images (quality 80-85 is usually sufficient)

### 3. Enable Compression

Ensure gzip/brotli compression is enabled for:
- HTML
- CSS
- JavaScript
- JSON
- XML

### 4. Set Appropriate Cache Headers

The middleware automatically sets cache headers based on asset type. You can customize in `cdn.config.ts`.

### 5. Use Preload for Critical Assets

```typescript
import { preloadHeaders } from './middleware/static-assets.middleware';

app.use(preloadHeaders([
  '/css/critical.css',
  '/js/app.js',
  '/fonts/main.woff2',
]));
```

## Monitoring

### CloudFront Metrics

Monitor in AWS CloudWatch:
- Requests
- Bytes downloaded
- Error rate
- Cache hit ratio

### Cloudflare Analytics

Monitor in Cloudflare dashboard:
- Requests
- Bandwidth
- Cache hit ratio
- Response time

## Troubleshooting

### Assets Not Loading from CDN

1. Check CDN_ENABLED is set to true
2. Verify CDN_BASE_URL is correct
3. Check CORS headers are set correctly
4. Verify DNS is pointing to CDN

### Cache Not Updating

1. Purge cache manually
2. Check cache headers are set correctly
3. Verify versioning is working

### Slow Asset Loading

1. Check CDN distribution is in correct regions
2. Verify compression is enabled
3. Check image optimization is working
4. Monitor cache hit ratio

## Security Considerations

1. **HTTPS Only**: Always use HTTPS for CDN URLs
2. **Signed URLs**: Use signed URLs for private content
3. **CORS**: Configure CORS headers appropriately
4. **Rate Limiting**: Implement rate limiting on origin server
5. **DDoS Protection**: Use CDN's DDoS protection features

## Cost Optimization

1. **Cache Aggressively**: Longer cache durations reduce origin requests
2. **Compress Assets**: Reduces bandwidth costs
3. **Use WebP**: Smaller file sizes reduce bandwidth
4. **Monitor Usage**: Track bandwidth and requests
5. **Set Appropriate TTLs**: Balance freshness vs. cost

## Migration Checklist

- [ ] Choose CDN provider (CloudFront or Cloudflare)
- [ ] Set up storage (S3 or R2)
- [ ] Configure CDN distribution
- [ ] Set cache policies
- [ ] Enable compression
- [ ] Configure image optimization
- [ ] Update DNS records
- [ ] Test asset loading
- [ ] Monitor performance
- [ ] Set up cache purging
- [ ] Configure alerts
