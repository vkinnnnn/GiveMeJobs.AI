# Deployment Guide

This guide provides step-by-step instructions for deploying the GiveMeJobs platform to production.

## Prerequisites

- Kubernetes cluster (v1.24+)
- kubectl configured
- Docker installed
- GitHub account with repository access
- Domain name configured
- SSL certificates (or cert-manager)
- Cloud storage (AWS S3 or equivalent)
- Database instances (PostgreSQL, MongoDB, Redis)

## Pre-Deployment Checklist

### Code Quality
- [ ] All tests passing
- [ ] Code review completed
- [ ] Security scan passed
- [ ] No critical vulnerabilities
- [ ] Documentation updated

### Configuration
- [ ] Environment variables configured
- [ ] Secrets created in Kubernetes
- [ ] Database migrations ready
- [ ] API keys obtained (see .env.mcp.template for complete list)
- [ ] OAuth credentials configured

### Infrastructure
- [ ] Kubernetes cluster provisioned
- [ ] Load balancer configured
- [ ] CDN configured
- [ ] DNS records created
- [ ] SSL certificates installed
- [ ] Monitoring tools installed

## Deployment Steps

### 1. Prepare Environment

#### Set Environment Variables

```bash
export ENVIRONMENT=production
export NAMESPACE=givemejobs-production
export REGISTRY=ghcr.io/your-org
export VERSION=v1.0.0
```

#### Verify Cluster Access

```bash
kubectl cluster-info
kubectl get nodes
```

### 2. Create Namespace and Secrets

#### Create Namespace

```bash
kubectl apply -f k8s/namespace.yaml
```

#### Create Secrets

```bash
# Database secrets
kubectl create secret generic backend-secrets \
  --from-literal=DATABASE_URL="postgresql://..." \
  --from-literal=MONGODB_URI="mongodb://..." \
  --from-literal=REDIS_URL="redis://..." \
  --from-literal=JWT_SECRET="..." \
  --from-literal=JWT_REFRESH_SECRET="..." \
  --from-literal=OPENAI_API_KEY="..." \
  --from-literal=PINECONE_API_KEY="..." \
  --from-literal=LINKEDIN_CLIENT_ID="..." \
  --from-literal=LINKEDIN_CLIENT_SECRET="..." \
  --from-literal=GOOGLE_CLIENT_ID="..." \
  --from-literal=GOOGLE_CLIENT_SECRET="..." \
  --from-literal=EMAIL_HOST="..." \
  --from-literal=EMAIL_PORT="..." \
  --from-literal=EMAIL_USER="..." \
  --from-literal=EMAIL_PASSWORD="..." \
  --from-literal=SENTRY_DSN="..." \
  -n $NAMESPACE

# Container registry secret
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=$GITHUB_USERNAME \
  --docker-password=$GITHUB_TOKEN \
  -n $NAMESPACE
```

### 3. Apply ConfigMaps

```bash
kubectl apply -f k8s/configmap.yaml
```

### 4. Run Database Migrations

#### PostgreSQL Migrations

```bash
# Port forward to database
kubectl port-forward svc/postgres-service 5432:5432 -n $NAMESPACE

# Run migrations
cd packages/backend
npm run migrate:up

# Verify migrations
psql $DATABASE_URL -c "SELECT * FROM pgmigrations;"
```

#### MongoDB Initialization

```bash
# Port forward to MongoDB
kubectl port-forward svc/mongodb-service 27017:27017 -n $NAMESPACE

# Initialize MongoDB
npm run mongo:init
```

### 5. Build and Push Docker Images

#### Build Images

```bash
# Build backend
docker build -f packages/backend/Dockerfile -t $REGISTRY/givemejobs-backend:$VERSION .

# Build frontend
docker build -f packages/frontend/Dockerfile -t $REGISTRY/givemejobs-frontend:$VERSION .
```

#### Push Images

```bash
# Login to registry
echo $GITHUB_TOKEN | docker login ghcr.io -u $GITHUB_USERNAME --password-stdin

# Push images
docker push $REGISTRY/givemejobs-backend:$VERSION
docker push $REGISTRY/givemejobs-frontend:$VERSION
```

### 6. Deploy Applications

#### Deploy Backend

```bash
# Update image tag in deployment
kubectl set image deployment/backend \
  backend=$REGISTRY/givemejobs-backend:$VERSION \
  -n $NAMESPACE

# Or apply deployment file
kubectl apply -f k8s/backend-deployment.yaml

# Wait for rollout
kubectl rollout status deployment/backend -n $NAMESPACE
```

#### Deploy Frontend

```bash
# Update image tag in deployment
kubectl set image deployment/frontend \
  frontend=$REGISTRY/givemejobs-frontend:$VERSION \
  -n $NAMESPACE

# Or apply deployment file
kubectl apply -f k8s/frontend-deployment.yaml

# Wait for rollout
kubectl rollout status deployment/frontend -n $NAMESPACE
```

### 7. Configure Ingress

```bash
kubectl apply -f k8s/ingress.yaml

# Verify ingress
kubectl get ingress -n $NAMESPACE
kubectl describe ingress givemejobs-ingress -n $NAMESPACE
```

### 8. Verify Deployment

#### Check Pod Status

```bash
kubectl get pods -n $NAMESPACE
```

Expected output:
```
NAME                        READY   STATUS    RESTARTS   AGE
backend-xxx-yyy             1/1     Running   0          2m
backend-xxx-zzz             1/1     Running   0          2m
backend-xxx-aaa             1/1     Running   0          2m
frontend-xxx-bbb            1/1     Running   0          2m
frontend-xxx-ccc            1/1     Running   0          2m
frontend-xxx-ddd            1/1     Running   0          2m
```

#### Check Services

```bash
kubectl get svc -n $NAMESPACE
```

#### Check Logs

```bash
# Backend logs
kubectl logs -f deployment/backend -n $NAMESPACE

# Frontend logs
kubectl logs -f deployment/frontend -n $NAMESPACE
```

#### Health Checks

```bash
# Backend health
curl https://api.givemejobs.com/health

# Frontend health
curl https://givemejobs.com
```

### 9. Configure Monitoring

#### Deploy Prometheus

```bash
kubectl apply -f k8s/monitoring/prometheus.yaml
```

#### Deploy Grafana

```bash
kubectl apply -f k8s/monitoring/grafana.yaml
```

#### Configure Alerts

```bash
kubectl apply -f k8s/monitoring/alerts.yaml
```

### 10. Set Up Backups

```bash
# Apply backup CronJobs
kubectl apply -f k8s/cronjob-backup.yaml

# Verify CronJobs
kubectl get cronjobs -n $NAMESPACE
```

## Post-Deployment Tasks

### 1. Smoke Tests

Run smoke tests to verify basic functionality:

```bash
# Test authentication
curl -X POST https://api.givemejobs.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Test job search
curl https://api.givemejobs.com/api/jobs/search?keywords=engineer

# Test frontend
curl https://givemejobs.com
```

### 2. Performance Testing

```bash
# Run load tests
k6 run scripts/load-test.js
```

### 3. Security Scan

```bash
# Run security scan
./scripts/security-scan.sh
```

### 4. Update DNS

If deploying for the first time:

```bash
# Get load balancer IP/hostname
kubectl get ingress givemejobs-ingress -n $NAMESPACE

# Update DNS records
# A record: givemejobs.com -> <load-balancer-ip>
# A record: api.givemejobs.com -> <load-balancer-ip>
# CNAME: www.givemejobs.com -> givemejobs.com
```

### 5. Configure CDN

Update CDN origin to point to the new deployment:

```bash
# CloudFront example
aws cloudfront update-distribution \
  --id <distribution-id> \
  --origin-domain-name <load-balancer-hostname>
```

### 6. Enable Monitoring Alerts

```bash
# Verify alerts are configured
kubectl get prometheusrules -n $NAMESPACE

# Test alert notifications
# Trigger a test alert and verify notifications
```

## Rollback Procedure

If issues are detected after deployment:

### Quick Rollback

```bash
# Rollback backend
kubectl rollout undo deployment/backend -n $NAMESPACE

# Rollback frontend
kubectl rollout undo deployment/frontend -n $NAMESPACE

# Verify rollback
kubectl rollout status deployment/backend -n $NAMESPACE
kubectl rollout status deployment/frontend -n $NAMESPACE
```

### Rollback to Specific Version

```bash
# View rollout history
kubectl rollout history deployment/backend -n $NAMESPACE

# Rollback to specific revision
kubectl rollout undo deployment/backend --to-revision=2 -n $NAMESPACE
```

### Database Rollback

If database migrations need to be rolled back:

```bash
# Rollback migrations
cd packages/backend
npm run migrate:down

# Verify rollback
psql $DATABASE_URL -c "SELECT * FROM pgmigrations;"
```

## Troubleshooting

### Pods Not Starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n $NAMESPACE

# Check logs
kubectl logs <pod-name> -n $NAMESPACE

# Common issues:
# - Image pull errors: Check registry credentials
# - CrashLoopBackOff: Check application logs
# - Pending: Check resource availability
```

### Service Not Accessible

```bash
# Check service
kubectl get svc -n $NAMESPACE
kubectl describe svc backend-service -n $NAMESPACE

# Check endpoints
kubectl get endpoints -n $NAMESPACE

# Test service internally
kubectl run -it --rm debug --image=alpine --restart=Never -n $NAMESPACE -- sh
# Inside pod:
wget -O- http://backend-service/health
```

### Ingress Issues

```bash
# Check ingress
kubectl describe ingress givemejobs-ingress -n $NAMESPACE

# Check ingress controller logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx

# Verify DNS
nslookup api.givemejobs.com
```

### Database Connection Issues

```bash
# Test database connectivity
kubectl run -it --rm psql --image=postgres:15 --restart=Never -n $NAMESPACE -- \
  psql $DATABASE_URL -c "SELECT 1"

# Check database logs
kubectl logs -n $NAMESPACE -l app=postgres
```

## Maintenance

### Regular Updates

```bash
# Update dependencies
npm update

# Rebuild and redeploy
./scripts/optimize-build.sh
# Follow deployment steps
```

### Scaling

```bash
# Manual scaling
kubectl scale deployment backend --replicas=5 -n $NAMESPACE

# Update HPA
kubectl edit hpa backend-hpa -n $NAMESPACE
```

### Certificate Renewal

If using cert-manager:

```bash
# Check certificate status
kubectl get certificates -n $NAMESPACE

# Force renewal
kubectl delete certificate givemejobs-tls -n $NAMESPACE
kubectl apply -f k8s/ingress.yaml
```

## Deployment Checklist

### Pre-Deployment
- [ ] Code merged to main branch
- [ ] All tests passing
- [ ] Security scan completed
- [ ] Database migrations tested
- [ ] Secrets configured
- [ ] Backup verified

### Deployment
- [ ] Namespace created
- [ ] Secrets applied
- [ ] ConfigMaps applied
- [ ] Database migrations run
- [ ] Images built and pushed
- [ ] Backend deployed
- [ ] Frontend deployed
- [ ] Ingress configured

### Post-Deployment
- [ ] Pods running
- [ ] Services accessible
- [ ] Health checks passing
- [ ] Smoke tests passed
- [ ] Performance tests passed
- [ ] Monitoring configured
- [ ] Alerts configured
- [ ] Backups scheduled
- [ ] DNS updated
- [ ] CDN configured

### Verification
- [ ] Application accessible
- [ ] Authentication working
- [ ] API endpoints responding
- [ ] Database queries working
- [ ] File uploads working
- [ ] Email sending working
- [ ] OAuth login working
- [ ] Analytics tracking

## Support

For deployment issues:
- Email: devops@givemejobs.com
- Slack: #deployments
- On-call: Check PagerDuty
- Documentation: https://docs.givemejobs.com/deployment

## Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Docker Documentation](https://docs.docker.com/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [AWS Documentation](https://docs.aws.amazon.com/)
- [Monitoring Setup Guide](./MONITORING_SETUP.md)
- [Backup Recovery Guide](../scripts/BACKUP_RECOVERY_GUIDE.md)
- [Security Audit Checklist](./SECURITY_AUDIT_CHECKLIST.md)
