# Monitoring and Logging Setup

This document provides a quick guide to set up and use the monitoring and logging infrastructure for the GiveMeJobs platform.

## Quick Start

### 1. Install Dependencies

```bash
# Install backend dependencies (includes monitoring packages)
npm install
```

### 2. Configure Environment Variables

Add the following to your `.env` file:

```bash
# Sentry (Error Tracking)
SENTRY_DSN=your-sentry-dsn-here
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1
NEXT_PUBLIC_SENTRY_DSN=your-frontend-sentry-dsn-here

# Prometheus (Metrics)
PROMETHEUS_ENABLED=true
PROMETHEUS_PORT=9090

# Logging
LOG_LEVEL=info
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_USERNAME=
ELASTICSEARCH_PASSWORD=
```

### 3. Start Monitoring Services

**Option A: Using the setup script (Windows)**
```bash
cd packages/backend
npm run monitoring:setup
```

**Option B: Using Docker Compose directly**
```bash
docker-compose up -d prometheus grafana elasticsearch logstash kibana
```

### 4. Verify Services

Check that all services are running:

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (login: admin/admin)
- **Kibana**: http://localhost:5601
- **Elasticsearch**: http://localhost:9200

### 5. Start the Application

```bash
npm run dev
```

## Monitoring Tools

### 1. Sentry (Error Tracking)

**What it does:**
- Captures and tracks application errors
- Provides stack traces and context
- Monitors performance issues
- Alerts on critical errors

**Setup:**
1. Create a Sentry account at https://sentry.io
2. Create a new project for backend and frontend
3. Copy the DSN and add to `.env`
4. Errors will automatically be captured

**Access:** https://sentry.io/organizations/your-org/issues/

### 2. Prometheus (Metrics Collection)

**What it does:**
- Collects application metrics
- Stores time-series data
- Provides alerting capabilities
- Queries metrics with PromQL

**Available Metrics:**
- HTTP request rates and durations
- Database query performance
- Cache hit/miss rates
- Application-specific metrics (job searches, documents generated, etc.)
- System metrics (CPU, memory)

**Access:** http://localhost:9090

**Example Queries:**
```promql
# Request rate
rate(http_requests_total[5m])

# 95th percentile response time
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Error rate
rate(http_request_errors_total[5m])
```

### 3. Grafana (Visualization)

**What it does:**
- Visualizes Prometheus metrics
- Creates custom dashboards
- Sets up alerts
- Shares dashboards with team

**Pre-configured Dashboard:**
A dashboard is automatically provisioned with:
- HTTP request metrics
- Database performance
- Cache performance
- Application metrics
- System resources

**Access:** http://localhost:3001 (admin/admin)

**Creating Custom Dashboards:**
1. Click "+" → "Dashboard"
2. Add panels with PromQL queries
3. Configure visualization type
4. Save dashboard

### 4. ELK Stack (Logging)

**Components:**
- **Elasticsearch**: Stores logs
- **Logstash**: Processes and forwards logs
- **Kibana**: Visualizes and searches logs

**What it does:**
- Centralized log storage
- Full-text search across logs
- Log aggregation and analysis
- Custom visualizations

**Access:** http://localhost:5601

**Using Kibana:**
1. Go to "Discover" to search logs
2. Create index pattern: `givemejobs-logs-*`
3. Filter by log level, context, or custom fields
4. Create visualizations and dashboards

## Application Endpoints

### Metrics Endpoint
```
GET http://localhost:4000/metrics
```
Returns Prometheus-formatted metrics for scraping.

### Performance Stats
```
GET http://localhost:4000/performance/stats
```
Returns current performance thresholds and statistics.

### Health Check
```
GET http://localhost:4000/health
```
Returns application health status including database connections.

## Using Monitoring in Code

### Error Tracking

```typescript
import { Sentry } from './config/sentry.config';

try {
  // Your code
} catch (error) {
  Sentry.captureException(error, {
    tags: { feature: 'job-search' },
    user: { id: userId },
    extra: { query: searchQuery }
  });
}
```

### Metrics

```typescript
import { metricsService } from './services/metrics.service';

// Increment counters
metricsService.jobSearches.inc({ source: 'linkedin' });
metricsService.documentsGenerated.inc({ type: 'resume' });

// Track durations
const endTimer = metricsService.httpRequestDuration.startTimer();
// ... do work ...
endTimer({ method: 'GET', route: '/api/jobs', status_code: 200 });
```

### Logging

```typescript
import { Logger } from './services/logger.service';

const logger = new Logger('MyService');

// Basic logging
logger.info('User action', { userId, action: 'login' });
logger.error('Operation failed', error, { context: 'payment' });

// Specialized logging
logger.logDatabaseQuery('SELECT', 'users', 45);
logger.logExternalApiCall('linkedin', '/jobs', 1200, 200);
logger.logUserAction(userId, 'job-application-submitted');
logger.logSecurityEvent('failed-login', 'medium', { ip: '1.2.3.4' });
```

### Performance Monitoring

```typescript
import { performanceMonitor } from './services/performance-monitor.service';

// Measure async operations
const result = await performanceMonitor.measureAsync(
  'generate-resume',
  async () => generateResume(userId, jobId),
  { userId, jobId }
);

// Manual timing
const endTimer = performanceMonitor.startTimer();
// ... do work ...
const duration = endTimer();
```

## Alerts

### Configured Alerts

The following alerts are pre-configured in Prometheus:

- **HighErrorRate**: Triggers when error rate > 5% for 5 minutes
- **SlowResponseTime**: Triggers when 95th percentile > 5s
- **SlowDatabaseQuery**: Triggers when query time > 2s
- **HighDatabaseConnections**: Triggers when connections > 80
- **LowCacheHitRate**: Triggers when hit rate < 70%
- **ServiceDown**: Triggers when service is unavailable

### Setting Up Notifications

To receive alert notifications:

1. Configure Alertmanager in `prometheus.yml`
2. Set up notification channels (email, Slack, etc.)
3. Define routing rules
4. Test alerts

## Troubleshooting

### Services Not Starting

```bash
# Check Docker logs
docker-compose logs prometheus
docker-compose logs grafana
docker-compose logs elasticsearch

# Restart services
docker-compose restart prometheus grafana elasticsearch
```

### Metrics Not Appearing

1. Check `/metrics` endpoint: http://localhost:4000/metrics
2. Verify Prometheus is scraping: http://localhost:9090/targets
3. Check Prometheus configuration in `prometheus.yml`

### Logs Not in Elasticsearch

1. Check Elasticsearch: `curl http://localhost:9200/_cat/indices`
2. Verify Logstash: `docker-compose logs logstash`
3. Check Winston configuration in `logger.service.ts`

### Grafana Dashboard Empty

1. Verify Prometheus data source is configured
2. Check time range in dashboard
3. Verify metrics are being collected
4. Check PromQL queries

## Best Practices

1. **Set up alerts early**: Don't wait for issues to occur
2. **Monitor business metrics**: Not just technical metrics
3. **Review logs regularly**: Look for patterns and anomalies
4. **Optimize based on data**: Use metrics to guide optimization
5. **Document incidents**: Learn from monitoring data

## Additional Resources

- [Sentry Documentation](https://docs.sentry.io/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Elasticsearch Documentation](https://www.elastic.co/guide/)
- [Winston Documentation](https://github.com/winstonjs/winston)

For detailed information, see `packages/backend/MONITORING.md`.
