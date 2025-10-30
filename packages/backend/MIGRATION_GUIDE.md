# Migration Guide - Task 21 Implementation

This guide provides step-by-step instructions for applying the security and performance optimizations from Task 21.

## Prerequisites

- Node.js 20+ installed
- PostgreSQL 15+ running
- Redis 7+ running
- MongoDB 7+ running
- kubectl configured (for Kubernetes deployment)
- Docker installed (for containerized deployment)

## Step 1: Install Dependencies

```bash
cd packages/backend

# Install new dependency for input sanitization
npm install isomorphic-dompurify
```

## Step 2: Run Database Migrations

### Add User Roles

```bash
# Run migration to add role and permissions columns
npm run migrate:up
```

This will run:
- `1697000000011_add-user-roles.js` - Adds role and permissions to users table
- `1697000000012_add-performance-indexes.js` - Adds performance indexes

### Verify Migrations

```bash
# Check migration status
npm run migrate:status

# Verify indexes were created
psql -d givemejobs -c "\di"
```

## Step 3: Update Environment Variables

Add the following to your `.env` file:

```env
# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# CDN Configuration (optional)
CDN_ENABLED=false
CDN_PROVIDER=cloudfront
CDN_BASE_URL=https://cdn.givemejobs.com
AWS_S3_BUCKET_NAME=givemejobs-assets
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret

# Cloudflare (if using Cloudflare)
CLOUDFLARE_ZONE_ID=your_zone_id
CLOUDFLARE_API_TOKEN=your_token

# Application Version (for cache busting)
APP_VERSION=1.0.0
```

## Step 4: Update Existing Users

All existing users need to have the default 'user' role assigned:

```sql
-- Update existing users to have 'user' role
UPDATE users 
SET role = 'user', 
    permissions = '[]'::jsonb 
WHERE role IS NULL;

-- Create an admin user (replace with your admin email)
UPDATE users 
SET role = 'admin' 
WHERE email = 'admin@givemejobs.com';
```

## Step 5: Test the Application

### Start the Development Server

```bash
npm run dev
```

### Test Health Endpoints

```bash
# Comprehensive health check
curl http://localhost:3000/health

# Readiness check
curl http://localhost:3000/ready

# Liveness check
curl http://localhost:3000/alive
```

### Test Rate Limiting

```bash
# Test auth rate limiting (should block after 5 requests)
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
  echo ""
done
```

### Test RBAC

```bash
# Login as regular user
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"password"}' \
  | jq -r '.data.accessToken')

# Try to access analytics (should succeed)
curl http://localhost:3000/api/analytics/dashboard \
  -H "Authorization: Bearer $TOKEN"

# Try to access admin endpoint (should fail)
curl http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer $TOKEN"
```

### Test Input Sanitization

```bash
# Test XSS prevention
curl -X PUT http://localhost:3000/api/users/123/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"professionalHeadline":"<script>alert(\"XSS\")</script>Developer"}'

# Response should have sanitized input (no script tags)
```

## Step 6: Configure CDN (Optional)

### For AWS CloudFront

1. Create S3 bucket:
```bash
aws s3 mb s3://givemejobs-assets --region us-east-1
```

2. Create CloudFront distribution:
```bash
# Use AWS Console or CLI to create distribution
# Point origin to S3 bucket
```

3. Update `.env`:
```env
CDN_ENABLED=true
CDN_PROVIDER=cloudfront
CDN_BASE_URL=https://d1234567890.cloudfront.net
```

### For Cloudflare

1. Add domain to Cloudflare
2. Configure cache rules (see CDN_SETUP.md)
3. Update `.env`:
```env
CDN_ENABLED=true
CDN_PROVIDER=cloudflare
CDN_BASE_URL=https://cdn.givemejobs.com
```

## Step 7: Deploy to Production

### Option A: Kubernetes

```bash
# Create secrets
kubectl create secret generic givemejobs-secrets \
  --from-literal=database-url="$DATABASE_URL" \
  --from-literal=redis-url="$REDIS_URL" \
  --from-literal=mongodb-uri="$MONGODB_URI" \
  --from-literal=jwt-secret="$JWT_SECRET"

# Apply configurations
kubectl apply -f kubernetes/configmap.yaml
kubectl apply -f kubernetes/deployment.yaml
kubectl apply -f kubernetes/ingress.yaml

# Verify deployment
kubectl get pods
kubectl get hpa
kubectl get ingress
```

### Option B: Docker Swarm

```bash
# Initialize swarm
docker swarm init

# Create secrets
echo "$DATABASE_URL" | docker secret create db_url -
echo "$JWT_SECRET" | docker secret create jwt_secret -

# Deploy stack
docker stack deploy -c docker-compose.prod.yml givemejobs

# Verify deployment
docker service ls
docker service ps givemejobs_backend
```

### Option C: Traditional Deployment

```bash
# Build application
npm run build

# Start with PM2
pm2 start dist/index.js -i max --name givemejobs-backend

# Configure Nginx
sudo cp nginx.conf /etc/nginx/sites-available/givemejobs
sudo ln -s /etc/nginx/sites-available/givemejobs /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Step 8: Configure Monitoring

### Prometheus

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'givemejobs-backend'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
```

### Grafana

1. Add Prometheus data source
2. Import dashboard (see DEPLOYMENT_SCALING.md)
3. Configure alerts

## Step 9: Set Up Alerts

### Example Alert Rules

```yaml
groups:
- name: givemejobs-alerts
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
    for: 5m
    annotations:
      summary: "High error rate detected"
      
  - alert: HighResponseTime
    expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
    for: 5m
    annotations:
      summary: "High response time detected"
```

## Step 10: Verify Everything Works

### Checklist

- [ ] Database migrations completed
- [ ] All indexes created
- [ ] Environment variables configured
- [ ] Application starts without errors
- [ ] Health endpoints return 200
- [ ] Rate limiting works
- [ ] RBAC works
- [ ] Input sanitization works
- [ ] CDN configured (if enabled)
- [ ] Auto-scaling configured
- [ ] Load balancer configured
- [ ] Monitoring configured
- [ ] Alerts configured
- [ ] SSL/TLS configured
- [ ] Backup strategy in place

### Performance Verification

```bash
# Run load test
k6 run load-test.js

# Check response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/jobs

# Check cache hit rate
redis-cli info stats | grep keyspace_hits
```

## Rollback Procedure

If something goes wrong, follow these steps:

### 1. Rollback Code

```bash
# Kubernetes
kubectl rollout undo deployment/givemejobs-backend

# Docker Swarm
docker service rollback givemejobs_backend

# Git
git revert HEAD
git push
```

### 2. Rollback Database

```bash
# Rollback migrations
npm run migrate:down

# Or manually
psql -d givemejobs -c "DROP INDEX IF EXISTS idx_users_role;"
psql -d givemejobs -c "ALTER TABLE users DROP COLUMN IF EXISTS role;"
```

### 3. Restore Configuration

```bash
# Restore previous .env
cp .env.backup .env

# Restart application
pm2 restart givemejobs-backend
```

## Troubleshooting

### Issue: Migrations Fail

**Solution:**
```bash
# Check database connection
psql -d givemejobs -c "SELECT 1;"

# Check migration status
npm run migrate:status

# Run migrations one by one
npm run migrate:up -- -m 1697000000011_add-user-roles.js
```

### Issue: Rate Limiting Not Working

**Solution:**
```bash
# Check Redis connection
redis-cli ping

# Check Redis keys
redis-cli keys "ratelimit:*"

# Clear rate limit keys
redis-cli del $(redis-cli keys "ratelimit:*")
```

### Issue: RBAC Errors

**Solution:**
```bash
# Verify role column exists
psql -d givemejobs -c "\d users"

# Check user roles
psql -d givemejobs -c "SELECT id, email, role FROM users;"

# Update user role
psql -d givemejobs -c "UPDATE users SET role = 'user' WHERE id = 'user-id';"
```

### Issue: High Memory Usage

**Solution:**
```bash
# Check memory usage
kubectl top pods

# Adjust resource limits
kubectl edit deployment givemejobs-backend

# Restart pods
kubectl rollout restart deployment/givemejobs-backend
```

### Issue: CDN Not Working

**Solution:**
```bash
# Check CDN configuration
echo $CDN_ENABLED
echo $CDN_BASE_URL

# Test CDN URL
curl -I https://cdn.givemejobs.com/test.jpg

# Purge CDN cache
# (See CDN_SETUP.md for provider-specific instructions)
```

## Performance Tuning

### Database Connection Pool

```typescript
// Adjust in src/config/database.ts
const pool = new Pool({
  max: 20,        // Increase for high load
  min: 5,         // Minimum connections
  idleTimeoutMillis: 30000,
});
```

### Redis Configuration

```bash
# Adjust maxmemory
redis-cli CONFIG SET maxmemory 1gb

# Set eviction policy
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

### Auto-Scaling Thresholds

```yaml
# Adjust in kubernetes/deployment.yaml
metrics:
- type: Resource
  resource:
    name: cpu
    target:
      type: Utilization
      averageUtilization: 70  # Adjust based on load
```

## Maintenance

### Regular Tasks

**Daily:**
- Monitor error rates
- Check response times
- Review slow queries

**Weekly:**
- Review cache hit rates
- Analyze auto-scaling patterns
- Check disk usage

**Monthly:**
- Review and optimize indexes
- Update dependencies
- Security audit
- Performance testing

### Backup Strategy

```bash
# Database backup
pg_dump givemejobs > backup_$(date +%Y%m%d).sql

# Redis backup
redis-cli BGSAVE

# MongoDB backup
mongodump --uri="$MONGODB_URI" --out=backup_$(date +%Y%m%d)
```

## Support

For issues or questions:
1. Check logs: `kubectl logs -f deployment/givemejobs-backend`
2. Review documentation in this repository
3. Contact DevOps team

## Conclusion

You have successfully migrated to the optimized version with:
- ✅ Rate limiting
- ✅ RBAC
- ✅ Input validation and sanitization
- ✅ Database optimization
- ✅ CDN configuration
- ✅ Auto-scaling

The application is now production-ready with enterprise-grade security and performance!
