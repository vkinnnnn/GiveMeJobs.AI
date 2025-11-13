#!/bin/bash
# PostgreSQL Backup Script for GiveMeJobs Platform

set -euo pipefail

# Configuration
BACKUP_DIR="/backups/postgresql"
S3_BUCKET="givemejobs-backups"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="postgresql_backup_${DATE}"

# Database connection details
DB_HOST="${POSTGRES_HOST:-postgres}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-givemejobs_db}"
DB_USER="${POSTGRES_USER:-givemejobs}"

# Logging
LOG_FILE="/var/log/backup/postgresql_backup.log"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    log "ERROR: $1"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if pg_dump is available
    if ! command -v pg_dump &> /dev/null; then
        error_exit "pg_dump not found. Please install PostgreSQL client tools."
    fi
    
    # Check if AWS CLI is available
    if ! command -v aws &> /dev/null; then
        error_exit "AWS CLI not found. Please install AWS CLI."
    fi
    
    # Check database connectivity
    if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"; then
        error_exit "Cannot connect to PostgreSQL database"
    fi
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    log "Prerequisites check completed successfully"
}

# Create database backup
create_backup() {
    log "Starting PostgreSQL backup..."
    
    local backup_file="$BACKUP_DIR/${BACKUP_NAME}.sql"
    local compressed_file="$BACKUP_DIR/${BACKUP_NAME}.sql.gz"
    
    # Create SQL dump
    log "Creating SQL dump..."
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --verbose --no-password --format=custom --compress=9 \
        --file="$backup_file" || error_exit "Failed to create database dump"
    
    # Compress backup
    log "Compressing backup..."
    gzip "$backup_file" || error_exit "Failed to compress backup"
    
    # Verify backup integrity
    log "Verifying backup integrity..."
    if ! gzip -t "$compressed_file"; then
        error_exit "Backup file is corrupted"
    fi
    
    # Get backup size
    local backup_size=$(du -h "$compressed_file" | cut -f1)
    log "Backup created successfully: $compressed_file (Size: $backup_size)"
    
    echo "$compressed_file"
}

# Upload to S3
upload_to_s3() {
    local backup_file="$1"
    local s3_key="postgresql/$(basename "$backup_file")"
    
    log "Uploading backup to S3..."
    
    # Upload with server-side encryption
    aws s3 cp "$backup_file" "s3://$S3_BUCKET/$s3_key" \
        --server-side-encryption AES256 \
        --storage-class STANDARD_IA || error_exit "Failed to upload backup to S3"
    
    log "Backup uploaded to S3: s3://$S3_BUCKET/$s3_key"
    
    # Verify upload
    if aws s3 ls "s3://$S3_BUCKET/$s3_key" > /dev/null; then
        log "S3 upload verified successfully"
    else
        error_exit "S3 upload verification failed"
    fi
}

# Create point-in-time recovery backup
create_pitr_backup() {
    log "Creating point-in-time recovery backup..."
    
    # Create base backup using pg_basebackup
    local pitr_dir="$BACKUP_DIR/pitr_${DATE}"
    mkdir -p "$pitr_dir"
    
    pg_basebackup -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
        -D "$pitr_dir" -Ft -z -P -v || error_exit "Failed to create PITR backup"
    
    # Upload PITR backup to S3
    local pitr_archive="$BACKUP_DIR/pitr_${DATE}.tar.gz"
    tar -czf "$pitr_archive" -C "$BACKUP_DIR" "pitr_${DATE}"
    
    aws s3 cp "$pitr_archive" "s3://$S3_BUCKET/postgresql/pitr/" \
        --server-side-encryption AES256 || error_exit "Failed to upload PITR backup to S3"
    
    log "PITR backup created and uploaded successfully"
    
    # Cleanup local PITR files
    rm -rf "$pitr_dir" "$pitr_archive"
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up old backups..."
    
    # Cleanup local backups older than retention period
    find "$BACKUP_DIR" -name "postgresql_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
    
    # Cleanup S3 backups (using lifecycle policy is preferred)
    local cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y%m%d)
    
    aws s3 ls "s3://$S3_BUCKET/postgresql/" | while read -r line; do
        local file_date=$(echo "$line" | awk '{print $4}' | grep -o '[0-9]\{8\}' | head -1)
        if [[ "$file_date" < "$cutoff_date" ]]; then
            local file_name=$(echo "$line" | awk '{print $4}')
            aws s3 rm "s3://$S3_BUCKET/postgresql/$file_name"
            log "Deleted old backup: $file_name"
        fi
    done
    
    log "Cleanup completed"
}

# Send notification
send_notification() {
    local status="$1"
    local message="$2"
    
    # Send to Slack webhook if configured
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"PostgreSQL Backup $status: $message\"}" \
            "$SLACK_WEBHOOK_URL" || log "Failed to send Slack notification"
    fi
    
    # Send email notification if configured
    if [[ -n "${NOTIFICATION_EMAIL:-}" ]]; then
        echo "$message" | mail -s "PostgreSQL Backup $status" "$NOTIFICATION_EMAIL" || log "Failed to send email notification"
    fi
}

# Main execution
main() {
    log "Starting PostgreSQL backup process..."
    
    local start_time=$(date +%s)
    
    # Trap errors and send failure notification
    trap 'send_notification "FAILED" "PostgreSQL backup failed. Check logs for details."' ERR
    
    # Execute backup process
    check_prerequisites
    
    local backup_file
    backup_file=$(create_backup)
    
    upload_to_s3 "$backup_file"
    
    # Create PITR backup (weekly)
    if [[ $(date +%u) -eq 7 ]]; then
        create_pitr_backup
    fi
    
    cleanup_old_backups
    
    # Calculate duration
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    local success_message="PostgreSQL backup completed successfully in ${duration}s. Backup: $(basename "$backup_file")"
    log "$success_message"
    
    send_notification "SUCCESS" "$success_message"
    
    # Remove local backup file after successful upload
    rm -f "$backup_file"
    
    log "PostgreSQL backup process completed"
}

# Execute main function
main "$@"