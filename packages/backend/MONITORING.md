# Monitoring and Logging Guide

This document describes the monitoring and logging infrastructure for the GiveMeJobs platform.

## Overview

The platform uses a comprehensive monitoring stack:

- **Sentry**: Error tracking and performance monitoring
- **Prometheus**: Metrics collection and alerting
- **Grafana**: Metrics visualization and dashboards
- **ELK Stack**: Centralized logging (Elasticsearch, Logstash, Kibana)
- **Winston**: Structured application logging

## Architecture

```
Application
    ├── Sentry (Error Tracking)
    ├── Prometheus (Metrics)
    │   └── Grafana (Visualization)
    └── Winston (Logging)
        └── Elasticsearch (Log Storage)
            └── Kibana (Log Visualization)
```

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# Sentry
SENTRY_DSN=your-sentry-dsn
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1
NEXT_PUBLIC_SENTRY_DSN=your-frontend-sentry-dsn

# Prometheus
PROMETHEUS_ENABLED=true
PROMETHEUS_PORT=9090

# Logging
LOG_LEVEL=info
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_USERNAME=
ELASTICSEARCH_PASSWORD=
```

## Components

### 1. Error Tracking (Sentry)

**Backend Setup:**
- Automatically captures unhandled errors
- Tracks performance with distributed tracing
- Filters out validation errors
- Includes user context and request metadata

**Frontend Setup:**
- Captures client-side errors
- Session replay for debugging
- Performance monitoring
- User feedback integration

**Usage:**
```typescript
import { Sentry } from './config/sentry.config';

// Manually capture an error
Sentry.captureException(error, {
  tags: { feature: 'job-search' },
  user: { id: userId },
});

// Add breadcrumbs
Sentry.addBreadcrumb({
  message: 'User searched for jobs',
  level: 'info',
  data: { query: searchQuery },
});
```

### 2. Metrics Collection (Prometheus)

**Available Metrics:**

**HTTP Metrics:**
- `http_requests_total`: Total HTTP requests
- `http_request_duration_seconds`: Request duration histogram
- `http_request_errors_total`: Total HTTP errors

**Database Metrics:**
- `db_query_duration_seconds`: Database query duration
- `db_connections_active`: Active database connections
- `db_query_errors_total`: Database query errors

**Application Metrics:**
- `active_users_total`: Currently active users
- `job_searches_total`: Total job searches
- `documents_generated_total`: Documents generated
- `applications_created_total`: Applications created

**Cache Metrics:**
- `cache_hits_total`: Cache hits
- `cache_misses_total`: Cache misses

**External API Metrics:**
- `external_api_calls_total`: External API calls
- `external_api_errors_total`: External API errors
- `external_api_duration_seconds`: External API call duration

**Accessing Metrics:**
- Prometheus UI: http://localhost:9090
- Metrics endpoint: http://localhost:4000/metrics

**Usage:**
```typescript
import { metricsService } from './services/metrics.service';

// Track custom metrics
metricsService.jobSearches.inc({ source: 'linkedin' });
metricsService.documentsGenerated.inc({ type: 'resume' });
metricsService.applicationsCreated.inc();
```

### 3. Visualization (Grafana)

**Access:**
- URL: http://localhost:3001
- Default credentials: admin/admin

**Pre-configured Dashboard:**
- HTTP request rate and duration
- Error rates
- Database performance
- Cache hit rates
- Application-specific metrics
- System resources (CPU, memory)

**Creating Custom Dashboards:**
1. Log in to Grafana
2. Create new dashboard
3. Add panels with PromQL queries
4. Save and share

### 4. Logging (Winston + ELK)

**Log Levels:**
- `error`: Error events
- `warn`: Warning events
- `info`: Informational messages
- `http`: HTTP request logs
- `debug`: Debug information

**Log Destinations:**
- Console (development)
- Files (`logs/error.log`, `logs/combined.log`)
- Elasticsearch (production)

**Usage:**
```typescript
import { Logger } from './services/logger.service';

const logger = new Logger('MyService');

// Basic logging
logger.info('User logged in', { userId: '123' });
logger.error('Failed to process payment', error, { orderId: '456' });

// Specialized logging
logger.logDatabaseQuery('SELECT', 'users', 45);
logger.logExternalApiCall('linkedin', '/jobs', 1200, 200);
logger.logUserAction('user-123', 'job-application-submitted');
logger.logSecurityEvent('failed-login-attempt', 'medium', { ip: '1.2.3.4' });
logger.logPerformance('document-generation', 3500);
```

**Accessing Logs:**
- Kibana UI: http://localhost:5601
- Log files: `packages/backend/logs/`

### 5. Performance Monitoring

**Automatic Tracking:**
- API response times
- Database query performance
- External API call duration
- Cache performance

**Performance Thresholds:**
- API: Warning at 2s, Critical at 5s
- Database: Warning at 500ms, Critical at 2s
- External API: Warning at 3s, Critical at 10s

**Usage:**
```typescript
import { performanceMonitor } from './services/performance-monitor.service';

// Measure async operations
const result = await performanceMonitor.measureAsync(
  'generate-resume',
  async () => {
    return await generateResume(userId, jobId);
  },
  { userId, jobId }
);

// Manual timing
const endTimer = performanceMonitor.startTimer();
// ... do work ...
const duration = endTimer();
performanceMonitor.trackApiPerformance('POST', '/api/jobs', duration, 200);
```

**Performance Stats Endpoint:**
- URL: http://localhost:4000/performance/stats

## Alerts

### Prometheus Alerts

Configured in `alert_rules.yml`:

- **HighErrorRate**: Error rate > 5% for 5 minutes
- **CriticalErrorRate**: Error rate > 10% for 2 minutes
- **SlowResponseTime**: 95th percentile > 5s for 5 minutes
- **SlowDatabaseQuery**: 95th percentile > 2s for 5 minutes
- **HighDatabaseConnections**: > 80 active connections
- **LowCacheHitRate**: < 70% hit rate for 10 minutes
- **ExternalAPIErrors**: > 0.1 errors/sec for 5 minutes
- **HighMemoryUsage**: > 1GB for 5 minutes
- **ServiceDown**: Service unavailable for 1 minute

### Setting Up Alerting

1. Configure Alertmanager in `prometheus.yml`
2. Set up notification channels (email, Slack, PagerDuty)
3. Define alert routing rules
4. Test alerts

## Best Practices

### Error Tracking

1. **Always include context**: Add relevant metadata to errors
2. **Filter noise**: Don't send validation errors to Sentry
3. **Set up alerts**: Configure Sentry alerts for critical errors
4. **Review regularly**: Check Sentry dashboard daily

### Metrics

1. **Use labels wisely**: Don't create high-cardinality labels
2. **Track business metrics**: Not just technical metrics
3. **Set up dashboards**: Create role-specific dashboards
4. **Monitor trends**: Look for patterns over time

### Logging

1. **Use appropriate levels**: Don't log everything as `info`
2. **Include context**: Add relevant metadata to logs
3. **Structured logging**: Use JSON format for machine parsing
4. **Log rotation**: Configure log file rotation
5. **Sensitive data**: Never log passwords or tokens

### Performance

1. **Set realistic thresholds**: Based on SLAs and user expectations
2. **Monitor continuously**: Don't wait for users to complain
3. **Optimize proactively**: Address slow queries before they become critical
4. **Track trends**: Monitor performance over time

## Troubleshooting

### Sentry Not Receiving Errors

1. Check `SENTRY_DSN` is set correctly
2. Verify network connectivity to Sentry
3. Check Sentry project settings
4. Review `beforeSend` filters

### Prometheus Not Scraping Metrics

1. Verify `/metrics` endpoint is accessible
2. Check `prometheus.yml` configuration
3. Ensure application is running
4. Review Prometheus logs

### Logs Not Appearing in Elasticsearch

1. Check Elasticsearch is running: `curl http://localhost:9200`
2. Verify Logstash configuration
3. Check Winston Elasticsearch transport configuration
4. Review Logstash logs

### Grafana Dashboard Not Showing Data

1. Verify Prometheus data source is configured
2. Check PromQL queries are correct
3. Ensure time range is appropriate
4. Verify metrics are being collected

## Maintenance

### Daily Tasks

- Review error rates in Sentry
- Check critical alerts in Prometheus
- Monitor application performance

### Weekly Tasks

- Review Grafana dashboards
- Analyze log patterns in Kibana
- Check disk usage for logs and metrics
- Review and update alert thresholds

### Monthly Tasks

- Clean up old logs and metrics
- Review and optimize slow queries
- Update monitoring documentation
- Conduct monitoring system health check

## Resources

- [Sentry Documentation](https://docs.sentry.io/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Winston Documentation](https://github.com/winstonjs/winston)
- [Elasticsearch Documentation](https://www.elastic.co/guide/)
