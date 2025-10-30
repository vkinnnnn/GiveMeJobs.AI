# Database Backup and Recovery Guide

This guide provides instructions for backing up and restoring the GiveMeJobs platform databases.

## Overview

The platform uses three databases:
- **PostgreSQL**: User data, profiles, applications, jobs
- **MongoDB**: Document templates, generated documents
- **Redis**: Cache and session data (ephemeral, not backed up)

## Automated Backups

### Kubernetes CronJobs

Automated backups run daily via Kubernetes CronJobs:
- PostgreSQL: Daily at 2:00 AM UTC
- MongoDB: Daily at 3:00 AM UTC

Backups are stored in:
1. Persistent Volume (local storage)
2. AWS S3 (cloud storage)

### Backup Retention

- Local backups: 30 days
- S3 backups: Configured via S3 lifecycle policies (recommended: 90 days)

### Monitoring Backups

Check backup job status:

```bash
# View CronJob status
kubectl get cronjobs -n givemejobs-production

# View recent backup jobs
kubectl get jobs -n givemejobs-production | grep backup

# View backup job logs
kubectl logs -n givemejobs-production job/postgres-backup-<timestamp>
kubectl logs -n givemejobs-production job/mongodb-backup-<timestamp>
```

## Manual Backups

### PostgreSQL Backup

```bash
# Set environment variables
export DATABASE_URL="postgresql://user:pass@host:5432/dbname"
export BACKUP_STORAGE_BUCKET="givemejobs-backups"

# Run backup script
chmod +x scripts/backup-postgres.sh
./scripts/backup-postgres.sh
```

### MongoDB Backup

```bash
# Set environment variables
export MONGODB_URI="mongodb://user:pass@host:27017/dbname"
export BACKUP_STORAGE_BUCKET="givemejobs-backups"

# Run backup script
chmod +x scripts/backup-mongodb.sh
./scripts/backup-mongodb.sh
```

## Backup Verification

Always verify backups after creation:

```bash
# List local backups
ls -lh /backups/postgres/
ls -lh /backups/mongodb/

# List S3 backups
aws s3 ls s3://givemejobs-backups/postgres/
aws s3 ls s3://givemejobs-backups/mongodb/

# Test backup integrity (PostgreSQL)
gunzip -t /backups/postgres/givemejobs_postgres_YYYYMMDD_HHMMSS.sql.gz

# Test backup integrity (MongoDB)
tar -tzf /backups/mongodb/givemejobs_mongodb_YYYYMMDD_HHMMSS.tar.gz
```

## Database Restoration

### Before Restoring

**CRITICAL WARNINGS:**
1. Restoration will DROP and RECREATE the database
2. All current data will be lost
3. Always create a safety backup before restoring
4. Test restoration in staging environment first
5. Notify all users of planned downtime

### PostgreSQL Restoration

```bash
# Set environment variables
export DATABASE_URL="postgresql://user:pass@host:5432/dbname"
export BACKUP_STORAGE_BUCKET="givemejobs-backups"

# Run restore script
chmod +x scripts/restore-postgres.sh
./scripts/restore-postgres.sh givemejobs_postgres_20240118_120000.sql.gz
```

The script will:
1. Prompt for confirmation
2. Create a safety backup of current database
3. Download backup from S3 if not available locally
4. Terminate existing connections
5. Drop and recreate database
6. Restore from backup file

### MongoDB Restoration

```bash
# Set environment variables
export MONGODB_URI="mongodb://user:pass@host:27017/dbname"
export BACKUP_STORAGE_BUCKET="givemejobs-backups"

# Run restore script
chmod +x scripts/restore-mongodb.sh
./scripts/restore-mongodb.sh givemejobs_mongodb_20240118_120000.tar.gz
```

The script will:
1. Prompt for confirmation
2. Create a safety backup of current database
3. Download backup from S3 if not available locally
4. Extract backup archive
5. Drop existing collections
6. Restore from backup

## Point-in-Time Recovery

### PostgreSQL PITR

For point-in-time recovery, enable WAL archiving:

```sql
-- Enable WAL archiving in postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'aws s3 cp %p s3://givemejobs-backups/wal/%f'
```

Restore to specific point in time:

```bash
# Restore base backup
./scripts/restore-postgres.sh givemejobs_postgres_20240118_020000.sql.gz

# Create recovery.conf
cat > recovery.conf <<EOF
restore_command = 'aws s3 cp s3://givemejobs-backups/wal/%f %p'
recovery_target_time = '2024-01-18 14:30:00'
EOF

# Restart PostgreSQL to apply recovery
```

### MongoDB PITR

MongoDB PITR requires replica set with oplog:

```bash
# Restore to specific timestamp
mongorestore --uri="${MONGODB_URI}" \
  --dir=/backups/mongodb/backup_dir \
  --oplogReplay \
  --oplogLimit="1705587000:1"
```

## Disaster Recovery Procedures

### Complete System Failure

1. **Provision new infrastructure**
   ```bash
   kubectl apply -f k8s/namespace.yaml
   kubectl apply -f k8s/configmap.yaml
   kubectl apply -f k8s/secrets.yaml
   ```

2. **Restore databases**
   ```bash
   # Restore PostgreSQL
   ./scripts/restore-postgres.sh <latest_backup>
   
   # Restore MongoDB
   ./scripts/restore-mongodb.sh <latest_backup>
   ```

3. **Deploy applications**
   ```bash
   kubectl apply -f k8s/backend-deployment.yaml
   kubectl apply -f k8s/frontend-deployment.yaml
   kubectl apply -f k8s/ingress.yaml
   ```

4. **Verify system health**
   ```bash
   curl https://api.givemejobs.com/health
   curl https://givemejobs.com
   ```

### Data Corruption

1. **Identify corruption scope**
   - Check application logs
   - Query database for inconsistencies
   - Determine last known good state

2. **Restore from backup**
   - Choose backup before corruption occurred
   - Follow restoration procedures above

3. **Replay transactions** (if applicable)
   - Use WAL files (PostgreSQL)
   - Use oplog (MongoDB)

### Accidental Data Deletion

1. **Stop application immediately**
   ```bash
   kubectl scale deployment backend --replicas=0 -n givemejobs-production
   ```

2. **Create emergency backup**
   ```bash
   ./scripts/backup-postgres.sh
   ./scripts/backup-mongodb.sh
   ```

3. **Restore from last backup**
   ```bash
   ./scripts/restore-postgres.sh <backup_before_deletion>
   ./scripts/restore-mongodb.sh <backup_before_deletion>
   ```

4. **Restart application**
   ```bash
   kubectl scale deployment backend --replicas=3 -n givemejobs-production
   ```

## Testing Recovery Procedures

### Regular DR Drills

Perform quarterly disaster recovery drills:

1. **Schedule drill** (announce to team)
2. **Restore to staging environment**
3. **Verify data integrity**
4. **Test application functionality**
5. **Document issues and improvements**
6. **Update procedures**

### Staging Environment Testing

```bash
# Set staging environment variables
export DATABASE_URL="<staging_db_url>"
export MONGODB_URI="<staging_mongo_uri>"

# Restore production backup to staging
./scripts/restore-postgres.sh <production_backup>
./scripts/restore-mongodb.sh <production_backup>

# Verify restoration
npm run test --workspace=@givemejobs/backend
```

## Backup Storage Management

### S3 Lifecycle Policies

Configure S3 lifecycle policies for cost optimization:

```json
{
  "Rules": [
    {
      "Id": "TransitionToIA",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        }
      ],
      "Expiration": {
        "Days": 365
      }
    }
  ]
}
```

### Backup Encryption

All backups should be encrypted:

```bash
# Enable S3 bucket encryption
aws s3api put-bucket-encryption \
  --bucket givemejobs-backups \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

## Monitoring and Alerts

### Backup Monitoring

Set up alerts for:
- Backup job failures
- Backup size anomalies
- Missing backups
- S3 upload failures

### Example Alert Rules

```yaml
# Prometheus alert rules
groups:
- name: backup_alerts
  rules:
  - alert: BackupJobFailed
    expr: kube_job_status_failed{job=~".*backup.*"} > 0
    for: 5m
    annotations:
      summary: "Backup job failed"
      description: "Backup job {{ $labels.job }} has failed"
  
  - alert: BackupNotCompleted
    expr: time() - kube_job_status_completion_time{job=~".*backup.*"} > 86400
    annotations:
      summary: "Backup not completed in 24 hours"
      description: "No successful backup in the last 24 hours"
```

## Troubleshooting

### Common Issues

**Issue: Backup script fails with permission denied**
```bash
# Solution: Ensure scripts are executable
chmod +x scripts/*.sh
```

**Issue: S3 upload fails**
```bash
# Solution: Verify AWS credentials
aws sts get-caller-identity

# Check S3 bucket permissions
aws s3api get-bucket-policy --bucket givemejobs-backups
```

**Issue: Restore fails with connection error**
```bash
# Solution: Verify database connectivity
psql $DATABASE_URL -c "SELECT 1"
mongosh $MONGODB_URI --eval "db.adminCommand({ping: 1})"
```

**Issue: Backup file corrupted**
```bash
# Solution: Use previous backup
ls -lt /backups/postgres/ | head -10
./scripts/restore-postgres.sh <previous_backup>
```

## Security Considerations

1. **Encrypt backups at rest and in transit**
2. **Restrict access to backup storage**
3. **Use IAM roles instead of access keys**
4. **Audit backup access logs**
5. **Test backup restoration regularly**
6. **Keep backup scripts in version control**
7. **Document recovery procedures**

## Support

For backup and recovery issues:
1. Check logs: `kubectl logs -n givemejobs-production <pod-name>`
2. Review this guide
3. Contact DevOps team
4. Escalate to database administrator if needed

## Appendix

### Backup File Naming Convention

- PostgreSQL: `givemejobs_postgres_YYYYMMDD_HHMMSS.sql.gz`
- MongoDB: `givemejobs_mongodb_YYYYMMDD_HHMMSS.tar.gz`

### Backup Locations

- Local: `/backups/{postgres|mongodb}/`
- S3: `s3://givemejobs-backups/{postgres|mongodb}/`

### Recovery Time Objectives (RTO)

- PostgreSQL: < 1 hour
- MongoDB: < 1 hour
- Full system: < 2 hours

### Recovery Point Objectives (RPO)

- Daily backups: 24 hours
- With WAL/oplog: < 5 minutes
