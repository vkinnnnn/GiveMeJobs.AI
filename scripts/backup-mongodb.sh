#!/bin/bash

# MongoDB Backup Script
# This script creates a backup of the MongoDB database and uploads it to cloud storage

set -e

# Configuration
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/backups/mongodb"
BACKUP_FILE="givemejobs_mongodb_${TIMESTAMP}"
RETENTION_DAYS=30

# Environment variables (should be set externally)
: ${MONGODB_URI:?"MONGODB_URI is required"}
: ${BACKUP_STORAGE_BUCKET:?"BACKUP_STORAGE_BUCKET is required"}

# Create backup directory if it doesn't exist
mkdir -p ${BACKUP_DIR}

echo "Starting MongoDB backup at $(date)"

# Create backup using mongodump
mongodump --uri="${MONGODB_URI}" \
  --out=${BACKUP_DIR}/${BACKUP_FILE} \
  --gzip \
  --verbose

# Verify backup was created
if [ ! -d "${BACKUP_DIR}/${BACKUP_FILE}" ]; then
  echo "ERROR: Backup directory was not created"
  exit 1
fi

# Create tar archive
cd ${BACKUP_DIR}
tar -czf ${BACKUP_FILE}.tar.gz ${BACKUP_FILE}
rm -rf ${BACKUP_FILE}

BACKUP_SIZE=$(du -h ${BACKUP_DIR}/${BACKUP_FILE}.tar.gz | cut -f1)
echo "Backup created successfully: ${BACKUP_FILE}.tar.gz (${BACKUP_SIZE})"

# Upload to cloud storage (AWS S3 example)
if command -v aws &> /dev/null; then
  echo "Uploading backup to S3..."
  aws s3 cp ${BACKUP_DIR}/${BACKUP_FILE}.tar.gz s3://${BACKUP_STORAGE_BUCKET}/mongodb/${BACKUP_FILE}.tar.gz
  echo "Backup uploaded to S3 successfully"
fi

# Clean up old backups
echo "Cleaning up backups older than ${RETENTION_DAYS} days..."
find ${BACKUP_DIR} -name "givemejobs_mongodb_*.tar.gz" -mtime +${RETENTION_DAYS} -delete

# List recent backups
echo "Recent backups:"
ls -lh ${BACKUP_DIR} | tail -5

echo "MongoDB backup completed at $(date)"
