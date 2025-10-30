# Quick Deployment Reference

A quick reference guide for deploying the GiveMeJobs platform.

## 🚀 Quick Deploy Commands

### Prerequisites Check
```bash
# Verify tools
kubectl version
docker --version
node --version

# Verify cluster access
kubectl cluster-info
kubectl get nodes
```

### 1. Configure Environment
```bash
# Set variables
export NAMESPACE=givemejobs-production
export VERSION=v1.0.0

# Copy and edit environment file
cp .env.production.example .env.production
# Edit .env.production with your values
```

### 2. Create Secrets
```bash
# Create Kubernetes secrets from env file
kubectl create secret generic backend-secrets \
  --from-env-file=.env.production \
  -n $NAMESPACE

# Create registry secret
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=$GITHUB_USERNAME \
  --docker-password=$GITHUB_TOKEN \
  -n $NAMESPACE
```

### 3. Deploy Infrastructure
```bash
# Apply all Kubernetes manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/cronjob-backup.yaml
```

### 4. Run Migrations
```bash
# Port forward to database
kubectl port-forward svc/postgres-service 5432:5432 -n $NAMESPACE &

# Run migrations
cd packages/backend
npm run migrate:up
npm run mongo:init
```

### 5. Verify Deployment
```bash
# Check pods
kubectl get pods -n $NAMESPACE

# Check services
kubectl get svc -n $NAMESPACE

# Check ingress
kubectl get ingress -n $NAMESPACE

# Test health endpoints
curl https://api.givemejobs.com/health
curl https://givemejobs.com
```

## 🔄 Common Operations

### View Logs
```bash
# Backend logs
kubectl logs -f deployment/backend -n $NAMESPACE

# Frontend logs
kubectl logs -f deployment/frontend -n $NAMESPACE

# Specific pod
kubectl logs -f <pod-name> -n $NAMESPACE
```

### Scale Services
```bash
# Manual scaling
kubectl scale deployment backend --replicas=5 -n $NAMESPACE
kubectl scale deployment frontend --replicas=5 -n $NAMESPACE
```

### Update Deployment
```bash
# Update image
kubectl set image deployment/backend \
  backend=ghcr.io/your-org/givemejobs-backend:$VERSION \
  -n $NAMESPACE

# Wait for rollout
kubectl rollout status deployment/backend -n $NAMESPACE
```

### Rollback
```bash
# Quick rollback
kubectl rollout undo deployment/backend -n $NAMESPACE

# Rollback to specific revision
kubectl rollout undo deployment/backend --to-revision=2 -n $NAMESPACE
```

## 🔍 Troubleshooting

### Pod Issues
```bash
# Describe pod
kubectl describe pod <pod-name> -n $NAMESPACE

# Get events
kubectl get events -n $NAMESPACE --sort-by='.lastTimestamp'

# Shell into pod
kubectl exec -it <pod-name> -n $NAMESPACE -- /bin/sh
```

### Service Issues
```bash
# Check endpoints
kubectl get endpoints -n $NAMESPACE

# Test service internally
kubectl run -it --rm debug --image=alpine --restart=Never -n $NAMESPACE -- sh
# Inside pod: wget -O- http://backend-service/health
```

### Database Issues
```bash
# Test PostgreSQL connection
kubectl run -it --rm psql --image=postgres:15 --restart=Never -n $NAMESPACE -- \
  psql $DATABASE_URL -c "SELECT 1"

# Test MongoDB connection
kubectl run -it --rm mongo --image=mongo:7 --restart=Never -n $NAMESPACE -- \
  mongosh $MONGODB_URI --eval "db.adminCommand({ping: 1})"
```

## 💾 Backup & Restore

### Manual Backup
```bash
# PostgreSQL
./scripts/backup-postgres.sh

# MongoDB
./scripts/backup-mongodb.sh
```

### Restore
```bash
# PostgreSQL
./scripts/restore-postgres.sh <backup-file>

# MongoDB
./scripts/restore-mongodb.sh <backup-file>
```

### Check Backup Jobs
```bash
# View CronJobs
kubectl get cronjobs -n $NAMESPACE

# View recent jobs
kubectl get jobs -n $NAMESPACE | grep backup

# View job logs
kubectl logs job/<job-name> -n $NAMESPACE
```

## 🔐 Security

### Run Security Scan
```bash
./scripts/security-scan.sh
```

### Update Secrets
```bash
# Delete old secret
kubectl delete secret backend-secrets -n $NAMESPACE

# Create new secret
kubectl create secret generic backend-secrets \
  --from-env-file=.env.production \
  -n $NAMESPACE

# Restart pods to pick up new secrets
kubectl rollout restart deployment/backend -n $NAMESPACE
```

## 📊 Monitoring

### Check Metrics
```bash
# CPU and memory usage
kubectl top pods -n $NAMESPACE
kubectl top nodes

# HPA status
kubectl get hpa -n $NAMESPACE
```

### Access Dashboards
- **Grafana**: https://grafana.givemejobs.com
- **Kibana**: https://kibana.givemejobs.com
- **Prometheus**: https://prometheus.givemejobs.com

## 🧪 Testing

### Smoke Tests
```bash
# Authentication
curl -X POST https://api.givemejobs.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Job search
curl https://api.givemejobs.com/api/jobs/search?keywords=engineer

# Frontend
curl https://givemejobs.com
```

### Load Test
```bash
k6 run scripts/load-test.js
```

## 📝 Environment Variables

### Required Backend Variables
```bash
DATABASE_URL=postgresql://user:pass@host:5432/db
MONGODB_URI=mongodb://user:pass@host:27017/db
REDIS_URL=redis://host:6379
JWT_SECRET=your-secret-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
```

### Required Frontend Variables
```bash
NEXT_PUBLIC_API_URL=https://api.givemejobs.com
```

## 🔗 Quick Links

- **Production**: https://givemejobs.com
- **API**: https://api.givemejobs.com
- **API Docs**: https://api.givemejobs.com/docs
- **Status**: https://status.givemejobs.com

## 📚 Documentation

- **Full Deployment Guide**: `docs/DEPLOYMENT_GUIDE.md`
- **API Documentation**: `docs/API_DOCUMENTATION.md`
- **Security Checklist**: `docs/SECURITY_AUDIT_CHECKLIST.md`
- **Optimization Guide**: `docs/PRODUCTION_OPTIMIZATION_GUIDE.md`
- **Backup Guide**: `scripts/BACKUP_RECOVERY_GUIDE.md`

## 🆘 Emergency Contacts

- **DevOps**: devops@givemejobs.com
- **On-Call**: Check PagerDuty
- **Slack**: #deployments

## ✅ Pre-Deploy Checklist

- [ ] Tests passing
- [ ] Security scan clean
- [ ] Secrets configured
- [ ] Database migrations ready
- [ ] Monitoring configured
- [ ] Team notified

## 📞 Support

For help:
1. Check documentation in `docs/`
2. Search existing issues
3. Contact DevOps team
4. Escalate to on-call if urgent

---

**Last Updated**: January 18, 2024  
**Version**: 1.0.0
