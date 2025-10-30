#!/bin/bash

# PostgreSQL Restore Script
# This script restores a PostgreSQL database from a backup file

set -e

# Check if backup file is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <backup_file>"
  echo "Example: $0 givemejobs_postgres_20240118_120000.sql.gz"
  exit 1
fi

BACKUP_FILE=$1
BACKUP_DIR="/backups/postgres"

# Environment variables (should be set externally)
: ${DATABASE_URL:?"DATABASE_URL is required"}

echo "WARNING: This will restore the database from backup: ${BACKUP_FILE}"
echo "This operation will DROP and RECREATE the database!"
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Restore cancelled"
  exit 0
fi

# Check if backup file exists locally
if [ ! -f "${BACKUP_DIR}/${BACKUP_FILE}" ]; then
  echo "Backup file not found locally. Attempting to download from S3..."
  
  if command -v aws &> /dev/null && [ ! -z "$BACKUP_STORAGE_BUCKET" ]; then
    aws s3 cp s3://${BACKUP_STORAGE_BUCKET}/postgres/${BACKUP_FILE} ${BACKUP_DIR}/${BACKUP_FILE}
  else
    echo "ERROR: Backup file not found and cannot download from S3"
    exit 1
  fi
fi

echo "Starting PostgreSQL restore at $(date)"

# Extract database connection details from DATABASE_URL
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')

export PGPASSWORD=$DB_PASS

# Create a backup of current database before restore
echo "Creating safety backup of current database..."
SAFETY_BACKUP="safety_backup_$(date +"%Y%m%d_%H%M%S").sql.gz"
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME | gzip > ${BACKUP_DIR}/${SAFETY_BACKUP}
echo "Safety backup created: ${SAFETY_BACKUP}"

# Drop existing connections
echo "Terminating existing connections..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();"

# Drop and recreate database
echo "Dropping and recreating database..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE ${DB_NAME};"

# Restore from backup
echo "Restoring database from backup..."
gunzip -c ${BACKUP_DIR}/${BACKUP_FILE} | psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME

echo "PostgreSQL restore completed successfully at $(date)"
echo "Safety backup is available at: ${BACKUP_DIR}/${SAFETY_BACKUP}"
