# High Error Rate Runbook

## Alert: HighErrorRate

### Description
This alert fires when the error rate (5xx responses) exceeds 5% for more than 5 minutes.

### Severity: Critical

### Impact
- Users experiencing service failures
- Potential data loss or corruption
- Degraded user experience
- Possible revenue impact

## Immediate Actions (First 5 minutes)

### 1. Assess the Situation
```bash
# Check current error rate
kubectl get pods -n givemejobs-prod
kubectl logs -n givemejobs-prod -l app.kubernetes.io/name=backend --tail=100

# Check service status
curl -I https://api.givemejobs.ai/health
curl -I https://ai.givemejobs.ai/health
```

### 2. Check Recent Deployments
```bash
# Check recent deployments
kubectl rollout history deployment/backend -n givemejobs-prod
kubectl rollout history deployment/python-services -n givemejobs-prod

# If recent deployment, consider rollback
kubectl rollout undo deployment/backend -n givemejobs-prod
```

### 3. Check Resource Usage
```bash
# Check pod resource usage
kubectl top pods -n givemejobs-prod

# Check node resource usage
kubectl top nodes
```

## Investigation Steps

### 1. Analyze Error Patterns
- **Grafana Dashboard**: [Application Overview](https://grafana.givemejobs.ai/d/app-overview)
- **Kibana Logs**: [Error Analysis](https://kibana.givemejobs.ai/app/discover)

```bash
# Check error distribution by endpoint
kubectl logs -n givemejobs-prod -l app.kubernetes.io/name=backend | grep "ERROR" | tail -50

# Check database connectivity
kubectl exec -n givemejobs-prod deployment/backend -- curl postgres:5432
```

### 2. Check Dependencies
```bash
# Check database status
kubectl get pods -n givemejobs-prod -l app.kubernetes.io/name=postgresql

# Check Redis status
kubectl get pods -n givemejobs-prod -l app.kubernetes.io/name=redis

# Check external service connectivity
kubectl exec -n givemejobs-prod deployment/python-services -- curl -I https://api.openai.com
```

### 3. Check Application Metrics
- **Response Time**: Check if correlated with high latency
- **Memory Usage**: Look for memory leaks or OOM kills
- **CPU Usage**: Check for CPU throttling
- **Database Queries**: Look for slow queries or connection pool exhaustion

## Common Causes and Solutions

### 1. Database Issues
**Symptoms**: Connection timeouts, slow queries
**Solution**:
```bash
# Check database connections
kubectl exec -n givemejobs-prod deployment/postgres -- psql -U givemejobs -c "SELECT count(*) FROM pg_stat_activity;"

# Check for long-running queries
kubectl exec -n givemejobs-prod deployment/postgres -- psql -U givemejobs -c "SELECT query, state, query_start FROM pg_stat_activity WHERE state = 'active' ORDER BY query_start;"
```

### 2. Memory Issues
**Symptoms**: OOMKilled pods, high memory usage
**Solution**:
```bash
# Check for OOMKilled pods
kubectl get events -n givemejobs-prod --field-selector reason=OOMKilling

# Increase memory limits if needed
kubectl patch deployment backend -n givemejobs-prod -p '{"spec":{"template":{"spec":{"containers":[{"name":"backend","resources":{"limits":{"memory":"2Gi"}}}]}}}}'
```

### 3. External Service Issues
**Symptoms**: Timeouts to OpenAI, Pinecone, etc.
**Solution**:
```bash
# Check external service status
curl -I https://api.openai.com
curl -I https://api.pinecone.io

# Enable circuit breaker if available
# Check rate limiting status
```

### 4. Code Issues
**Symptoms**: Specific error patterns in logs
**Solution**:
- Review recent code changes
- Check for unhandled exceptions
- Validate input data processing

## Escalation

### When to Escalate
- Error rate > 10% for more than 10 minutes
- Unable to identify root cause within 15 minutes
- Database or critical infrastructure issues
- Security-related errors

### Escalation Contacts
- **On-call Engineer**: Use PagerDuty
- **Database Team**: database@givemejobs.ai
- **Security Team**: security@givemejobs.ai (if security-related)
- **CTO**: cto@givemejobs.ai (if business-critical)

## Communication

### Internal Communication
- Update #incident-response Slack channel
- Create incident in PagerDuty
- Notify stakeholders via email if customer-facing

### External Communication
- Update status page if customer-facing impact
- Prepare customer communication if needed
- Document incident for post-mortem

## Recovery Actions

### 1. Immediate Recovery
```bash
# Scale up replicas if needed
kubectl scale deployment backend --replicas=5 -n givemejobs-prod

# Restart problematic pods
kubectl rollout restart deployment/backend -n givemejobs-prod
```

### 2. Monitoring Recovery
- Monitor error rate returning to normal levels
- Check response times
- Verify all services are healthy
- Monitor for any secondary effects

## Post-Incident Actions

### 1. Immediate (within 1 hour)
- [ ] Confirm all services are stable
- [ ] Document timeline of events
- [ ] Identify root cause
- [ ] Implement immediate fixes

### 2. Short-term (within 24 hours)
- [ ] Schedule post-mortem meeting
- [ ] Create incident report
- [ ] Identify preventive measures
- [ ] Update monitoring/alerting if needed

### 3. Long-term (within 1 week)
- [ ] Implement preventive measures
- [ ] Update runbooks based on learnings
- [ ] Conduct team retrospective
- [ ] Update incident response procedures

## Related Runbooks
- [Application Down](./application-down.md)
- [High Response Time](./high-response-time.md)
- [Database Issues](./database-issues.md)
- [Memory Issues](./memory-issues.md)

## Useful Commands

```bash
# Quick health check
kubectl get pods -n givemejobs-prod
kubectl get svc -n givemejobs-prod
kubectl get ingress -n givemejobs-prod

# Log analysis
kubectl logs -n givemejobs-prod -l app.kubernetes.io/name=backend --since=10m
kubectl logs -n givemejobs-prod -l app.kubernetes.io/name=python-services --since=10m

# Resource monitoring
kubectl top pods -n givemejobs-prod
kubectl describe pod <pod-name> -n givemejobs-prod

# Database quick check
kubectl exec -n givemejobs-prod deployment/postgres -- pg_isready
kubectl exec -n givemejobs-prod deployment/redis -- redis-cli ping
```

## Metrics to Monitor
- Error rate by service
- Response time percentiles
- Pod restart count
- Resource utilization
- Database connection count
- External service response times