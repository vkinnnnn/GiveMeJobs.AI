# Redis Cluster Configuration

## Overview
The GiveMeJobs platform supports Redis clustering for high availability and improved performance. The cluster configuration is available in `docker-compose.cache-cluster.yml`.

## Configuration

### Docker Compose Setup
To use Redis cluster instead of single Redis instance:

```bash
# Start with Redis cluster
docker-compose -f docker-compose.yml -f docker-compose.cache-cluster.yml up -d

# Or start only the cache cluster
docker-compose -f docker-compose.cache-cluster.yml up -d
```

### Cluster Nodes
The cluster consists of 6 Redis nodes:
- **redis-node-1**: Port 7001 (Master)
- **redis-node-2**: Port 7002 (Master) 
- **redis-node-3**: Port 7003 (Master)
- **redis-node-4**: Port 7004 (Replica)
- **redis-node-5**: Port 7005 (Replica)
- **redis-node-6**: Port 7006 (Replica)

### Environment Variables
Add to your `.env` file for cluster support:

```env
# Redis Cluster Configuration
REDIS_CLUSTER_ENABLED=true
REDIS_CLUSTER_NODES=redis-node-1:7001,redis-node-2:7002,redis-node-3:7003,redis-node-4:7004,redis-node-5:7005,redis-node-6:7006
REDIS_PASSWORD=your_secure_password
```

## Service Integration

### Node.js Backend
The `CacheService` automatically detects and uses Redis cluster when configured:
- Automatic failover between cluster nodes
- Circuit breaker pattern for fault tolerance
- Multi-layer caching (memory + Redis cluster)

### Python Services
The `AdvancedCacheService` supports Redis cluster with:
- Async Redis cluster client
- Intelligent cache warming
- Event-driven cache invalidation

## Monitoring
- **Redis Exporter**: Available on port 9121 for Prometheus metrics
- **Sentinel**: High availability monitoring on ports 26379-26381
- **Health Checks**: Automatic health monitoring for all nodes

## Benefits
- **High Availability**: Automatic failover if nodes go down
- **Scalability**: Distributed data across multiple nodes
- **Performance**: Improved throughput with parallel operations
- **Fault Tolerance**: Continues operating with node failures

## Fallback Behavior
If cluster is unavailable, services automatically fall back to:
1. Single Redis instance (if available)
2. Memory-only caching
3. Direct database queries (with performance impact)