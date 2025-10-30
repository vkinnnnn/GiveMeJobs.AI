# Deployment and Auto-Scaling Guide

This guide covers deployment strategies, auto-scaling configuration, and load balancing for the GiveMeJobs backend.

## Table of Contents

1. [Deployment Options](#deployment-options)
2. [Kubernetes Deployment](#kubernetes-deployment)
3. [Docker Swarm Deployment](#docker-swarm-deployment)
4. [Auto-Scaling Configuration](#auto-scaling-configuration)
5. [Load Balancing](#load-balancing)
6. [Monitoring and Alerts](#monitoring-and-alerts)
7. [Performance Optimization](#performance-optimization)

## Deployment Options

### Option 1: Kubernetes (Recommended for Production)

Best for:
- Large-scale deployments
- Complex orchestration needs
- Multi-region deployments
- Advanced auto-scaling

### Option 2: Docker Swarm

Best for:
- Simpler deployments
- Smaller teams
- Less complex infrastructure

### Option 3: Traditional VMs with Load Balancer

Best for:
- Legacy infrastructure
- Specific compliance requirements

## Kubernetes Deployment

### Prerequisites

- Kubernetes cluster (EKS, GKE, AKS, or self-hosted)
- kubectl configured
- Docker registry access
- Helm (optional but recommended)

### Step 1: Create Secrets

```bash
kubectl create secret generic givemejobs-secrets \
  --from-literal=database-url="postgresql://user:pass@host:5432/db" \
  --from-literal=redis-url="redis://host:6379" \
  --from-literal=mongodb-uri="mongodb://user:pass@host:27017/db" \
  --from-literal=jwt-secret="your-jwt-secret" \
  --from-literal=openai-api-key="your-openai-key"
```

### Step 2: Apply ConfigMap

```bash
kubectl apply -f kubernetes/configmap.yaml
```

### Step 3: Deploy Application

```bash
kubectl apply -f kubernetes/deployment.yaml
```

### Step 4: Set Up Ingress

```bash
kubectl apply -f kubernetes/ingress.yaml
```

### Step 5: Verify Deployment

```bash
# Check pods
kubectl get pods -l app=givemejobs-backend

# Check service
kubectl get svc givemejobs-backend-service

# Check HPA
kubectl get hpa givemejobs-backend-hpa

# View logs
kubectl logs -f deployment/givemejobs-backend
```

## Docker Swarm Deployment

### Step 1: Initialize Swarm

```bash
docker swarm init
```

### Step 2: Create Secrets

```bash
echo "postgresql://user:pass@host:5432/db" | docker secret create db_url -
echo "your-jwt-secret" | docker secret create jwt_secret -
```

### Step 3: Deploy Stack

```bash
docker stack deploy -c docker-compose.prod.yml givemejobs
```

### Step 4: Scale Services

```bash
docker service scale givemejobs_backend=5
```

### Step 5: Monitor Services

```bash
docker service ls
docker service ps givemejobs_backend
docker service logs -f givemejobs_backend
```

## Auto-Scaling Configuration

### Horizontal Pod Autoscaler (HPA)

The HPA automatically scales pods based on CPU and memory usage.

**Configuration:**
- Min replicas: 3
- Max replicas: 10
- CPU target: 70%
- Memory target: 80%

**Scale-up behavior:**
- Adds up to 100% of current pods or 4 pods (whichever is higher)
- Evaluates every 30 seconds

**Scale-down behavior:**
- Removes up to 50% of current pods or 2 pods (whichever is lower)
- Waits 5 minutes before scaling down

### Custom Metrics Scaling

For advanced scaling based on custom metrics (e.g., request rate, queue length):

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: givemejobs-backend-hpa-custom
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: givemejobs-backend
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "1000"
  - type: External
    external:
      metric:
        name: queue_length
        selector:
          matchLabels:
            queue: job-processing
      target:
        type: Value
        value: "100"
```

### Vertical Pod Autoscaler (VPA)

For automatic resource request/limit adjustments:

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: givemejobs-backend-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: givemejobs-backend
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: backend
      minAllowed:
        cpu: 250m
        memory: 256Mi
      maxAllowed:
        cpu: 2000m
        memory: 2Gi
```

## Load Balancing

### Nginx Load Balancer

The included `nginx.conf` provides:
- Round-robin load balancing
- Health checks
- Rate limiting
- SSL termination
- WebSocket support
- Static file caching

### AWS Application Load Balancer (ALB)

For AWS deployments:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: givemejobs-backend-service
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
    service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled: "true"
    service.beta.kubernetes.io/aws-load-balancer-backend-protocol: "http"
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 3000
  selector:
    app: givemejobs-backend
```

### Health Checks

The `/health` endpoint provides:
- Application status
- Database connectivity
- Redis connectivity
- MongoDB connectivity

Configure health checks:
- Interval: 30 seconds
- Timeout: 5 seconds
- Healthy threshold: 2
- Unhealthy threshold: 3

## Monitoring and Alerts

### Prometheus Metrics

Add Prometheus annotations to deployment:

```yaml
metadata:
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "3000"
    prometheus.io/path: "/metrics"
```

### Key Metrics to Monitor

1. **Application Metrics:**
   - Request rate
   - Response time (p50, p95, p99)
   - Error rate
   - Active connections

2. **Resource Metrics:**
   - CPU usage
   - Memory usage
   - Disk I/O
   - Network I/O

3. **Database Metrics:**
   - Connection pool usage
   - Query duration
   - Slow queries
   - Deadlocks

4. **Cache Metrics:**
   - Hit rate
   - Miss rate
   - Eviction rate
   - Memory usage

### Alerting Rules

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
      
  - alert: HighCPUUsage
    expr: rate(container_cpu_usage_seconds_total[5m]) > 0.8
    for: 10m
    annotations:
      summary: "High CPU usage detected"
      
  - alert: HighMemoryUsage
    expr: container_memory_usage_bytes / container_spec_memory_limit_bytes > 0.9
    for: 5m
    annotations:
      summary: "High memory usage detected"
```

## Performance Optimization

### 1. Connection Pooling

Configure optimal pool sizes:

```typescript
// PostgreSQL
const pool = new Pool({
  max: 20,
  min: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Redis
const redis = new Redis({
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
});
```

### 2. Caching Strategy

Implement multi-level caching:
- L1: In-memory cache (Node.js)
- L2: Redis cache
- L3: CDN cache

### 3. Database Optimization

- Use connection pooling
- Implement query result caching
- Add appropriate indexes
- Use read replicas for read-heavy operations

### 4. Async Processing

Offload heavy operations to background jobs:
- Document generation
- Email sending
- Analytics calculation
- Report generation

### 5. Rate Limiting

Implement rate limiting at multiple levels:
- Application level (middleware)
- Load balancer level (Nginx)
- API Gateway level

## Scaling Strategies

### Horizontal Scaling

**When to scale out:**
- CPU usage > 70%
- Memory usage > 80%
- Request queue length > 100
- Response time > 1 second

**Scaling limits:**
- Min: 3 replicas (for high availability)
- Max: 10 replicas (adjust based on load)

### Vertical Scaling

**When to scale up:**
- Consistent high resource usage
- Memory-intensive operations
- Large data processing

**Resource limits:**
- CPU: 500m - 2000m
- Memory: 512Mi - 2Gi

### Database Scaling

1. **Read Replicas:**
   - Route read queries to replicas
   - Keep writes on primary

2. **Sharding:**
   - Partition data by user ID
   - Use consistent hashing

3. **Connection Pooling:**
   - Use PgBouncer for PostgreSQL
   - Implement connection pooling in application

## Deployment Checklist

- [ ] Build and push Docker image
- [ ] Create Kubernetes secrets
- [ ] Apply ConfigMap
- [ ] Deploy application
- [ ] Configure ingress/load balancer
- [ ] Set up auto-scaling
- [ ] Configure monitoring
- [ ] Set up alerts
- [ ] Test health checks
- [ ] Verify SSL/TLS
- [ ] Test rate limiting
- [ ] Perform load testing
- [ ] Set up backup strategy
- [ ] Document rollback procedure
- [ ] Configure log aggregation
- [ ] Set up error tracking

## Rollback Procedure

### Kubernetes Rollback

```bash
# View deployment history
kubectl rollout history deployment/givemejobs-backend

# Rollback to previous version
kubectl rollout undo deployment/givemejobs-backend

# Rollback to specific revision
kubectl rollout undo deployment/givemejobs-backend --to-revision=2

# Check rollout status
kubectl rollout status deployment/givemejobs-backend
```

### Docker Swarm Rollback

```bash
# Rollback service
docker service rollback givemejobs_backend

# Update to specific version
docker service update --image givemejobs/backend:v1.0.0 givemejobs_backend
```

## Troubleshooting

### Pods Not Starting

```bash
# Check pod status
kubectl describe pod <pod-name>

# Check logs
kubectl logs <pod-name>

# Check events
kubectl get events --sort-by=.metadata.creationTimestamp
```

### High Memory Usage

```bash
# Check memory usage
kubectl top pods

# Get detailed metrics
kubectl describe node <node-name>

# Check for memory leaks
kubectl exec -it <pod-name> -- node --expose-gc --inspect
```

### Slow Response Times

1. Check database query performance
2. Verify cache hit rates
3. Check network latency
4. Review application logs
5. Analyze slow query logs

## Best Practices

1. **Always use health checks**
2. **Implement graceful shutdown**
3. **Use resource limits**
4. **Enable auto-scaling**
5. **Monitor key metrics**
6. **Set up alerts**
7. **Regular load testing**
8. **Document procedures**
9. **Automate deployments**
10. **Plan for disaster recovery**
