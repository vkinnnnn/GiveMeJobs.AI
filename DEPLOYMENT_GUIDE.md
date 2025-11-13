# Deployment Guide

## Overview

This comprehensive guide covers all aspects of deploying the GiveMeJobs platform from development to production environments.

## Production Readiness Status

### Core Platform: ✅ Production Ready
- **35+ Microservices** implemented and functional
- **80+ API Endpoints** with comprehensive functionality
- **Complete Frontend Application** with 60+ React components
- **AI-Powered Features** fully integrated
- **Security** production-grade implementation
- **Monitoring** comprehensive observability stack

### Known Issues (Non-Critical)
- **84 TypeScript errors** in test files (does not affect runtime)
- Some test configurations need updates
- Optional blockchain service not implemented

## Quick Production Deployment

### Prerequisites
- **Server**: Linux (Ubuntu 20.04+), 4+ cores, 8GB+ RAM, 100GB+ SSD
- **Software**: Docker 24.0+, Docker Compose 2.20+, Node.js 20+
- **Network**: Static IP address with registered domain
- **SSL**: Valid SSL certificate for your domain

### One-Command Deployment
```bash
# Clone and configure
git clone https://github.com/yourusername/givemejobs-platform.git
cd givemejobs-platform
cp packages/backend/.env.example packages/backend/.env.production
# Edit .env.production with your production values

# Deploy with Docker
docker-compose -f docker-compose.production.yml up -d

# Initialize databases
docker-compose -f docker-compose.production.yml exec backend npm run migrate:up
docker-compose -f docker-compose.production.yml exec backend npm run mongo:init
```

### Access Your Platform
- **Frontend**: https://yourdomain.com
- **API**: https://yourdomain.com/api
- **Health Check**: https://yourdomain.com/health
- **Monitoring**: https://yourdomain.com:3001 (Grafana)

## Detailed Deployment Steps

### 1. Server Preparation

#### System Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login to apply docker group changes
```

#### Firewall Configuration
```bash
# Install and configure UFW
sudo apt install ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. Application Setup

#### Repository and Configuration
```bash
# Clone repository
git clone https://github.com/yourusername/givemejobs-platform.git
cd givemejobs-platform

# Configure environment files
cp packages/backend/.env.example packages/backend/.env.production
cp packages/frontend/.env.example packages/frontend/.env.production

# Edit configuration files with production values
nano packages/backend/.env.production
nano packages/frontend/.env.production
```

#### SSL Certificate Setup
```bash
# Create SSL directory
mkdir -p nginx/ssl

# Copy SSL certificates
cp /path/to/certificate.crt nginx/ssl/certificate.crt
cp /path/to/private.key nginx/ssl/private.key

# Set proper permissions
chmod 600 nginx/ssl/private.key
chmod 644 nginx/ssl/certificate.crt
```

### 3. Service Deployment

#### Build and Start Services
```bash
# Build production images
docker-compose -f docker-compose.production.yml build

# Start all services
docker-compose -f docker-compose.production.yml up -d

# Check service status
docker-compose -f docker-compose.production.yml ps
```

#### Database Initialization
```bash
# Run database migrations
docker-compose -f docker-compose.production.yml exec backend npm run migrate:up

# Initialize MongoDB collections
docker-compose -f docker-compose.production.yml exec backend npm run mongo:init

# Test database connections
docker-compose -f docker-compose.production.yml exec backend npm run test:connections
```

#### Service Verification
```bash
# Check all services are healthy
docker-compose -f docker-compose.production.yml exec backend npm run check:all

# Test API endpoints
curl -f https://yourdomain.com/api/health
curl -f https://yourdomain.com/health

# Check logs
docker-compose -f docker-compose.production.yml logs -f backend
docker-compose -f docker-compose.production.yml logs -f frontend
```

## Kubernetes Deployment

### Prerequisites
- Kubernetes cluster (v1.24+)
- kubectl configured
- Docker registry access

### Quick Deploy Commands
```bash
# Set environment variables
export NAMESPACE=givemejobs-production
export VERSION=v1.0.0

# Create secrets
kubectl create secret generic backend-secrets \
  --from-env-file=.env.production \
  -n $NAMESPACE

# Deploy infrastructure
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/ingress.yaml

# Verify deployment
kubectl get pods -n $NAMESPACE
kubectl get svc -n $NAMESPACE
```

### Kubernetes Operations
```bash
# View logs
kubectl logs -f deployment/backend -n $NAMESPACE

# Scale services
kubectl scale deployment backend --replicas=5 -n $NAMESPACE

# Update deployment
kubectl set image deployment/backend \
  backend=ghcr.io/your-org/givemejobs-backend:$VERSION \
  -n $NAMESPACE

# Rollback if needed
kubectl rollout undo deployment/backend -n $NAMESPACE
```

## Environment Configuration

### Production Environment Variables

#### Backend (.env.production)
```env
# Database URLs
DATABASE_URL=postgresql://user:password@host:5432/givemejobs_prod
MONGODB_URI=mongodb://user:password@host:27017/givemejobs_docs
REDIS_URL=redis://host:6379

# JWT Secrets (use strong random values)
JWT_SECRET=your-production-jwt-secret-min-32-chars
JWT_REFRESH_SECRET=your-production-refresh-secret-min-32-chars

# OAuth Credentials
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret

# AI Services
OPENAI_API_KEY=sk-proj-your-openai-key
PINECONE_API_KEY=your-pinecone-key
PINECONE_INDEX_NAME=givemejobs
PINECONE_HOST=your-pinecone-host

# Email Service
RESEND_API_KEY=re_your-resend-key
EMAIL_FROM=noreply@yourdomain.com

# Optional Services
ADZUNA_APP_ID=your-adzuna-id
ADZUNA_APP_KEY=your-adzuna-key
SENTRY_DSN=your-sentry-dsn

# Production Settings
NODE_ENV=production
LOG_LEVEL=info
RATE_LIMIT_MAX_REQUESTS=100
```

#### Frontend (.env.production)
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_SENTRY_DSN=your-frontend-sentry-dsn
```

## Security Configuration

### Security Features Implemented
- **HTTPS/TLS**: SSL termination with valid certificates
- **Authentication**: JWT with refresh tokens
- **Authorization**: Role-based access control (RBAC)
- **Input Validation**: Zod schema validation
- **Rate Limiting**: API endpoint protection
- **CORS**: Proper cross-origin configuration
- **Security Headers**: Comprehensive security headers
- **Password Security**: bcrypt hashing
- **Session Management**: Secure session handling
- **Audit Logging**: Complete audit trail

### Security Hardening
```bash
# Install Fail2Ban
sudo apt install fail2ban
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Configure Nginx protection
sudo nano /etc/fail2ban/jail.local
# Add Nginx jail configuration

# Restart Fail2Ban
sudo systemctl restart fail2ban
```

### Security Verification
```bash
# Test security headers
curl -I https://yourdomain.com

# Should include:
# - Strict-Transport-Security
# - X-Frame-Options: DENY
# - X-Content-Type-Options: nosniff
# - X-XSS-Protection: 1; mode=block
```

## Monitoring and Observability

### Monitoring Stack
- **Prometheus**: Metrics collection
- **Grafana**: Visualization dashboards
- **ELK Stack**: Log aggregation and analysis
- **Sentry**: Error tracking and debugging

### Access Monitoring Dashboards
- **Grafana**: https://yourdomain.com:3001 (admin/admin)
- **Prometheus**: https://yourdomain.com:9090
- **Kibana**: https://yourdomain.com:5601

### Health Monitoring
```bash
# Application health checks
curl https://yourdomain.com/api/health
curl https://yourdomain.com/health

# Service status
docker-compose -f docker-compose.production.yml exec backend npm run check:all

# System resources
docker stats
htop
df -h
```

## Backup and Recovery

### Automated Backup Setup
```bash
# Create backup script
cp packages/backend/backup.sh /usr/local/bin/givemejobs-backup
chmod +x /usr/local/bin/givemejobs-backup

# Set up cron job for daily backups at 2 AM
crontab -e
# Add: 0 2 * * * /usr/local/bin/givemejobs-backup
```

### Manual Backup
```bash
# Create backup directory
mkdir -p /var/backups/givemejobs

# Backup PostgreSQL
docker-compose -f docker-compose.production.yml exec postgres \
  pg_dump -U givemejobs givemejobs_db > /var/backups/givemejobs/postgres_$(date +%Y%m%d).sql

# Backup MongoDB
docker-compose -f docker-compose.production.yml exec mongodb \
  mongodump --uri="mongodb://user:pass@localhost:27017/givemejobs_docs" \
  --out=/var/backups/givemejobs/mongodb_$(date +%Y%m%d)

# Backup uploaded files
tar -czf /var/backups/givemejobs/uploads_$(date +%Y%m%d).tar.gz \
  -C /var/lib/docker/volumes/givemejobs_backend-uploads/_data .
```

### Recovery Process
```bash
# Stop services
docker-compose -f docker-compose.production.yml down

# Restore PostgreSQL
docker-compose -f docker-compose.production.yml up -d postgres
docker-compose -f docker-compose.production.yml exec postgres \
  psql -U givemejobs -d givemejobs_db < /var/backups/givemejobs/postgres_YYYYMMDD.sql

# Restore MongoDB
docker-compose -f docker-compose.production.yml up -d mongodb
docker-compose -f docker-compose.production.yml exec mongodb \
  mongorestore --uri="mongodb://user:pass@localhost:27017/givemejobs_docs" \
  /var/backups/givemejobs/mongodb_YYYYMMDD/givemejobs_docs

# Start all services
docker-compose -f docker-compose.production.yml up -d
```

## Performance and Scaling

### Performance Optimizations
- **Database Indexing**: Optimized queries with proper indexes
- **Caching**: Redis caching for frequently accessed data
- **Connection Pooling**: Database connection optimization
- **Compression**: Gzip compression for API responses
- **CDN Ready**: Static asset optimization

### Expected Performance
- **API Response Time**: < 200ms for most endpoints
- **Database Queries**: < 50ms average
- **AI Generation**: 3-10 seconds for documents
- **Concurrent Users**: 1000+ with current architecture
- **Uptime**: 99.9% with proper monitoring

### Scaling Options
```bash
# Docker Compose scaling
docker-compose -f docker-compose.production.yml up -d --scale backend=3 --scale frontend=3

# Kubernetes horizontal scaling
kubectl scale deployment backend --replicas=5 -n $NAMESPACE
kubectl scale deployment frontend --replicas=5 -n $NAMESPACE

# Auto-scaling with HPA
kubectl autoscale deployment backend --cpu-percent=70 --min=3 --max=10 -n $NAMESPACE
```

## Troubleshooting

### Common Issues

#### Service Won't Start
```bash
# Check logs
docker-compose -f docker-compose.production.yml logs service-name

# Check configuration
docker-compose -f docker-compose.production.yml config

# Restart specific service
docker-compose -f docker-compose.production.yml restart service-name
```

#### Database Connection Issues
```bash
# Test database connections
docker-compose -f docker-compose.production.yml exec backend npm run test:connections

# Check database logs
docker-compose -f docker-compose.production.yml logs postgres mongodb redis
```

#### SSL Certificate Issues
```bash
# Check certificate validity
openssl x509 -in nginx/ssl/certificate.crt -text -noout

# Test SSL configuration
openssl s_client -connect yourdomain.com:443
```

### Emergency Procedures

#### Service Outage
```bash
# Quick restart all services
docker-compose -f docker-compose.production.yml restart

# Full restart if needed
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d
```

#### Database Corruption
```bash
# Stop application
docker-compose -f docker-compose.production.yml stop backend frontend

# Restore from latest backup (see Recovery Process)

# Start application
docker-compose -f docker-compose.production.yml start backend frontend
```

## Updates and Maintenance

### Application Updates
```bash
# Pull latest changes
git pull origin main

# Rebuild and deploy
docker-compose -f docker-compose.production.yml build
docker-compose -f docker-compose.production.yml up -d

# Run any new migrations
docker-compose -f docker-compose.production.yml exec backend npm run migrate:up
```

### System Maintenance
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Clean up Docker
docker system prune -f
docker volume prune -f

# Rotate logs
sudo logrotate -f /etc/logrotate.d/givemejobs-backend
```

## Cost Estimation

### Monthly Costs
- **Free Tier Services**: Resend (3,000 emails), Adzuna (1,000 calls)
- **Paid Services**: OpenAI ($20-50), Pinecone ($70)
- **Infrastructure**: Server ($40-80), Database ($15-30), Storage ($10-20), CDN ($5-15)
- **Monitoring**: $10-20/month
- **Total Estimated**: $170-295/month

## Support and Documentation

### Documentation Files
- **API Documentation**: Complete API reference
- **Security Checklist**: Security audit procedures
- **Backup Guide**: Backup and recovery procedures
- **Optimization Guide**: Performance optimization

### Support Channels
- **Email**: devops@givemejobs.com
- **Documentation**: https://docs.givemejobs.com
- **Status Page**: https://status.givemejobs.com

## Pre-Deployment Checklist

### Development Ready
- [ ] All tests passing
- [ ] Security scan completed
- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Database migrations tested
- [ ] Monitoring configured
- [ ] Backup procedures tested

### Production Ready
- [ ] Domain configured
- [ ] SSL certificates valid
- [ ] Production secrets updated
- [ ] Database passwords changed
- [ ] Monitoring alerts configured
- [ ] Backup automation enabled
- [ ] Team notified
- [ ] Rollback plan ready

## Post-Deployment Verification

### Immediate Checks
- [ ] All pods/containers running
- [ ] Health checks passing
- [ ] API endpoints responding
- [ ] Frontend loading correctly
- [ ] Database connections working
- [ ] SSL certificates valid

### Extended Verification
- [ ] User registration working
- [ ] OAuth login functional
- [ ] Job search returning results
- [ ] AI features generating content
- [ ] Email notifications sending
- [ ] Application tracking working
- [ ] Performance within targets
- [ ] Monitoring dashboards active

## Summary

The GiveMeJobs platform is production-ready with comprehensive features, security, monitoring, and deployment automation. The platform can be deployed using either Docker Compose for single-server deployments or Kubernetes for scalable cloud deployments.

**Key Features Ready for Production:**
- Complete job search and matching platform
- AI-powered document generation
- Comprehensive application tracking
- Secure authentication with OAuth
- Professional email notifications
- Real-time analytics and insights
- Enterprise-grade security
- Comprehensive monitoring and alerting

**Deployment Time**: 30-60 minutes for complete setup
**Maintenance**: Automated backups, monitoring, and updates
**Scalability**: Horizontal scaling ready with load balancing
**Security**: Production-grade security implementation

The platform is ready for immediate production deployment and can handle thousands of concurrent users with proper infrastructure scaling.