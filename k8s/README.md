# Kubernetes Deployment Guide

This directory contains Kubernetes manifests for deploying the GiveMeJobs platform.

## Prerequisites

- Kubernetes cluster (v1.24+)
- kubectl configured
- NGINX Ingress Controller installed
- cert-manager installed (for TLS certificates)
- Container registry access (GitHub Container Registry)

## Directory Structure

```
k8s/
├── namespace.yaml              # Namespace definitions
├── configmap.yaml              # Configuration maps
├── secrets.yaml.example        # Secret templates (DO NOT commit actual secrets)
├── backend-deployment.yaml     # Backend deployment, service, and HPA
├── frontend-deployment.yaml    # Frontend deployment, service, and HPA
├── ingress.yaml                # Ingress rules for routing
└── README.md                   # This file
```

## Deployment Steps

### 1. Create Namespaces

```bash
kubectl apply -f namespace.yaml
```

### 2. Create Secrets

**IMPORTANT:** Never commit actual secrets to version control!

Create secrets using kubectl:

```bash
# Production secrets
kubectl create secret generic backend-secrets \
  --from-literal=DATABASE_URL="postgresql://..." \
  --from-literal=MONGODB_URI="mongodb://..." \
  --from-literal=REDIS_URL="redis://..." \
  --from-literal=JWT_SECRET="..." \
  --from-literal=JWT_REFRESH_SECRET="..." \
  --from-literal=OPENAI_API_KEY="..." \
  --from-literal=PINECONE_API_KEY="..." \
  --from-literal=PINECONE_ENVIRONMENT="..." \
  --from-literal=LINKEDIN_CLIENT_ID="..." \
  --from-literal=LINKEDIN_CLIENT_SECRET="..." \
  --from-literal=GOOGLE_CLIENT_ID="..." \
  --from-literal=GOOGLE_CLIENT_SECRET="..." \
  --from-literal=EMAIL_HOST="..." \
  --from-literal=EMAIL_PORT="..." \
  --from-literal=EMAIL_USER="..." \
  --from-literal=EMAIL_PASSWORD="..." \
  --from-literal=SENTRY_DSN="..." \
  -n givemejobs-production

# Container registry secret
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=<github-username> \
  --docker-password=<github-token> \
  -n givemejobs-production
```

### 3. Apply ConfigMaps

```bash
kubectl apply -f configmap.yaml
```

### 4. Deploy Backend

```bash
kubectl apply -f backend-deployment.yaml
```

Verify deployment:

```bash
kubectl get pods -n givemejobs-production -l app=backend
kubectl logs -n givemejobs-production -l app=backend
```

### 5. Deploy Frontend

```bash
kubectl apply -f frontend-deployment.yaml
```

Verify deployment:

```bash
kubectl get pods -n givemejobs-production -l app=frontend
kubectl logs -n givemejobs-production -l app=frontend
```

### 6. Configure Ingress

```bash
kubectl apply -f ingress.yaml
```

Verify ingress:

```bash
kubectl get ingress -n givemejobs-production
kubectl describe ingress givemejobs-ingress -n givemejobs-production
```

## Monitoring Deployments

### Check Pod Status

```bash
kubectl get pods -n givemejobs-production
```

### View Logs

```bash
# Backend logs
kubectl logs -f -n givemejobs-production -l app=backend

# Frontend logs
kubectl logs -f -n givemejobs-production -l app=frontend
```

### Check HPA Status

```bash
kubectl get hpa -n givemejobs-production
```

### Describe Resources

```bash
kubectl describe deployment backend -n givemejobs-production
kubectl describe service backend-service -n givemejobs-production
```

## Scaling

### Manual Scaling

```bash
# Scale backend
kubectl scale deployment backend --replicas=5 -n givemejobs-production

# Scale frontend
kubectl scale deployment frontend --replicas=5 -n givemejobs-production
```

### Auto-scaling

HPA is configured to automatically scale based on CPU and memory usage:
- Backend: 3-10 replicas
- Frontend: 3-10 replicas

## Rolling Updates

Updates are performed automatically by the CD pipeline. To manually update:

```bash
kubectl set image deployment/backend \
  backend=ghcr.io/your-org/givemejobs-platform-backend:v1.2.3 \
  -n givemejobs-production

kubectl rollout status deployment/backend -n givemejobs-production
```

## Rollback

If a deployment fails:

```bash
# View rollout history
kubectl rollout history deployment/backend -n givemejobs-production

# Rollback to previous version
kubectl rollout undo deployment/backend -n givemejobs-production

# Rollback to specific revision
kubectl rollout undo deployment/backend --to-revision=2 -n givemejobs-production
```

## Health Checks

Both services have liveness and readiness probes configured:

- **Liveness Probe**: Checks if the container is running
- **Readiness Probe**: Checks if the container is ready to serve traffic

## Resource Limits

### Backend
- Requests: 512Mi memory, 250m CPU
- Limits: 1Gi memory, 500m CPU

### Frontend
- Requests: 256Mi memory, 100m CPU
- Limits: 512Mi memory, 250m CPU

## Troubleshooting

### Pod Not Starting

```bash
kubectl describe pod <pod-name> -n givemejobs-production
kubectl logs <pod-name> -n givemejobs-production
```

### Service Not Accessible

```bash
kubectl get svc -n givemejobs-production
kubectl describe svc backend-service -n givemejobs-production
```

### Ingress Issues

```bash
kubectl describe ingress givemejobs-ingress -n givemejobs-production
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx
```

### Check Events

```bash
kubectl get events -n givemejobs-production --sort-by='.lastTimestamp'
```

## Environment-Specific Deployments

### Staging

Replace `-n givemejobs-production` with `-n givemejobs-staging` in all commands.

### Production

Use the production namespace and ensure all secrets are properly configured.

## Cleanup

To remove all resources:

```bash
kubectl delete namespace givemejobs-production
kubectl delete namespace givemejobs-staging
```

## Security Considerations

1. Never commit secrets to version control
2. Use RBAC to restrict access
3. Enable network policies
4. Regularly update container images
5. Use TLS for all external traffic
6. Implement pod security policies
7. Regular security audits

## Support

For issues or questions, contact the DevOps team or refer to the main project documentation.
