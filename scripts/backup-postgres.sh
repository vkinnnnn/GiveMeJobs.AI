#!/bin/bash

# PostgreSQL Backup Script
# This script creates a backup of the PostgreSQL database and uploads it to cloud storage

set -e

# Configuration
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/backups/postgres"
BACKUP_FILE="givemejobs_postgres_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=30

# Environment variables (should be set externally)
: ${DATABASE_URL:?"DATABASE_URL is required"}
: ${BACKUP_STORAGE_BUCKET:?"BACKUP_STORAGE_BUCKET is required"}

# Create backup directory if it doesn't exist
mkdir -p ${BACKUP_DIR}

echo "Starting PostgreSQL backup at $(date)"

# Extract database connection details from DATABASE_URL
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')

# Create backup
export PGPASSWORD=$DB_PASS
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME \
  --format=plain \
  --no-owner \
  --no-acl \
  --verbose \
  | gzip > ${BACKUP_DIR}/${BACKUP_FILE}

# Verify backup was created
if [ ! -f "${BACKUP_DIR}/${BACKUP_FILE}" ]; then
  echo "ERROR: Backup file was not created"
  exit 1
fi

BACKUP_SIZE=$(du -h ${BACKUP_DIR}/${BACKUP_FILE} | cut -f1)
echo "Backup created successfully: ${BACKUP_FILE} (${BACKUP_SIZE})"

# Upload to cloud storage (AWS S3 example)
if command -v aws &> /dev/null; then
  echo "Uploading backup to S3..."
  aws s3 cp ${BACKUP_DIR}/${BACKUP_FILE} s3://${BACKUP_STORAGE_BUCKET}/postgres/${BACKUP_FILE}
  echo "Backup uploaded to S3 successfully"
fi

# Clean up old backups
echo "Cleaning up backups older than ${RETENTION_DAYS} days..."
find ${BACKUP_DIR} -name "givemejobs_postgres_*.sql.gz" -mtime +${RETENTION_DAYS} -delete

# List recent backups
echo "Recent backups:"
ls -lh ${BACKUP_DIR} | tail -5

echo "PostgreSQL backup completed at $(date)"
