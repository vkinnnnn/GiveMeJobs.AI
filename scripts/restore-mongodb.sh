#!/bin/bash

# MongoDB Restore Script
# This script restores a MongoDB database from a backup file

set -e

# Check if backup file is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <backup_file>"
  echo "Example: $0 givemejobs_mongodb_20240118_120000.tar.gz"
  exit 1
fi

BACKUP_FILE=$1
BACKUP_DIR="/backups/mongodb"
TEMP_DIR="${BACKUP_DIR}/temp_restore"

# Environment variables (should be set externally)
: ${MONGODB_URI:?"MONGODB_URI is required"}

echo "WARNING: This will restore the database from backup: ${BACKUP_FILE}"
echo "This operation will DROP existing collections and restore from backup!"
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Restore cancelled"
  exit 0
fi

# Check if backup file exists locally
if [ ! -f "${BACKUP_DIR}/${BACKUP_FILE}" ]; then
  echo "Backup file not found locally. Attempting to download from S3..."
  
  if command -v aws &> /dev/null && [ ! -z "$BACKUP_STORAGE_BUCKET" ]; then
    aws s3 cp s3://${BACKUP_STORAGE_BUCKET}/mongodb/${BACKUP_FILE} ${BACKUP_DIR}/${BACKUP_FILE}
  else
    echo "ERROR: Backup file not found and cannot download from S3"
    exit 1
  fi
fi

echo "Starting MongoDB restore at $(date)"

# Create safety backup of current database
echo "Creating safety backup of current database..."
SAFETY_BACKUP="safety_backup_$(date +"%Y%m%d_%H%M%S")"
mongodump --uri="${MONGODB_URI}" \
  --out=${BACKUP_DIR}/${SAFETY_BACKUP} \
  --gzip
cd ${BACKUP_DIR}
tar -czf ${SAFETY_BACKUP}.tar.gz ${SAFETY_BACKUP}
rm -rf ${SAFETY_BACKUP}
echo "Safety backup created: ${SAFETY_BACKUP}.tar.gz"

# Extract backup archive
echo "Extracting backup archive..."
mkdir -p ${TEMP_DIR}
tar -xzf ${BACKUP_DIR}/${BACKUP_FILE} -C ${TEMP_DIR}

# Find the backup directory (mongodump creates a directory structure)
BACKUP_DATA_DIR=$(find ${TEMP_DIR} -type d -name "givemejobs*" | head -1)

if [ -z "$BACKUP_DATA_DIR" ]; then
  echo "ERROR: Could not find backup data directory"
  rm -rf ${TEMP_DIR}
  exit 1
fi

# Restore from backup
echo "Restoring database from backup..."
mongorestore --uri="${MONGODB_URI}" \
  --dir=${BACKUP_DATA_DIR} \
  --gzip \
  --drop \
  --verbose

# Clean up temporary files
rm -rf ${TEMP_DIR}

echo "MongoDB restore completed successfully at $(date)"
echo "Safety backup is available at: ${BACKUP_DIR}/${SAFETY_BACKUP}.tar.gz"
