#!/bin/bash
# MongoDB Backup Script for GiveMeJobs Platform

set -euo pipefail

# Configuration
BACKUP_DIR="/backups/mongodb"
S3_BUCKET="givemejobs-backups"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="mongodb_backup_${DATE}"

# MongoDB connection details
MONGO_HOST="${MONGO_HOST:-mongodb}"
MONGO_PORT="${MONGO_PORT:-27017}"
MONGO_DB="${MONGO_DB:-givemejobs_docs}"
MONGO_USER="${MONGO_USER:-givemejobs}"

# Logging
LOG_FILE="/var/log/backup/mongodb_backup.log"
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
    
    # Check if mongodump is available
    if ! command -v mongodump &> /dev/null; then
        error_exit "mongodump not found. Please install MongoDB tools."
    fi
    
    # Check if AWS CLI is available
    if ! command -v aws &> /dev/null; then
        error_exit "AWS CLI not found. Please install AWS CLI."
    fi
    
    # Check MongoDB connectivity
    if ! mongosh --host "$MONGO_HOST:$MONGO_PORT" --eval "db.adminCommand('ping')" --quiet; then
        error_exit "Cannot connect to MongoDB database"
    fi
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    log "Prerequisites check completed successfully"
}

# Create database backup
create_backup() {
    log "Starting MongoDB backup..."
    
    local backup_dir="$BACKUP_DIR/$BACKUP_NAME"
    local compressed_file="$BACKUP_DIR/${BACKUP_NAME}.tar.gz"
    
    # Create backup directory
    mkdir -p "$backup_dir"
    
    # Create MongoDB dump
    log "Creating MongoDB dump..."
    mongodump --host "$MONGO_HOST:$MONGO_PORT" \
        --db "$MONGO_DB" \
        --username "$MONGO_USER" \
        --password "$MONGO_PASSWORD" \
        --out "$backup_dir" \
        --gzip || error_exit "Failed to create MongoDB dump"
    
    # Create archive
    log "Creating compressed archive..."
    tar -czf "$compressed_file" -C "$BACKUP_DIR" "$BACKUP_NAME" || error_exit "Failed to create archive"
    
    # Verify archive integrity
    log "Verifying backup integrity..."
    if ! tar -tzf "$compressed_file" > /dev/null; then
        error_exit "Backup archive is corrupted"
    fi
    
    # Get backup size
    local backup_size=$(du -h "$compressed_file" | cut -f1)
    log "Backup created successfully: $compressed_file (Size: $backup_size)"
    
    # Cleanup temporary directory
    rm -rf "$backup_dir"
    
    echo "$compressed_file"
}

# Create oplog backup for point-in-time recovery
create_oplog_backup() {
    log "Creating oplog backup for point-in-time recovery..."
    
    local oplog_file="$BACKUP_DIR/oplog_${DATE}.bson.gz"
    
    # Dump oplog
    mongodump --host "$MONGO_HOST:$MONGO_PORT" \
        --username "$MONGO_USER" \
        --password "$MONGO_PASSWORD" \
        --db local \
        --collection oplog.rs \
        --out - | gzip > "$oplog_file" || error_exit "Failed to create oplog backup"
    
    # Upload oplog to S3
    aws s3 cp "$oplog_file" "s3://$S3_BUCKET/mongodb/oplog/" \
        --server-side-encryption AES256 || error_exit "Failed to upload oplog to S3"
    
    log "Oplog backup created and uploaded successfully"
    
    # Cleanup local oplog file
    rm -f "$oplog_file"
}

# Upload to S3
upload_to_s3() {
    local backup_file="$1"
    local s3_key="mongodb/$(basename "$backup_file")"
    
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

# Create collection-level backups for critical collections
create_collection_backups() {
    log "Creating collection-level backups for critical collections..."
    
    local collections=("users" "jobs" "applications" "resumes" "analytics")
    
    for collection in "${collections[@]}"; do
        log "Backing up collection: $collection"
        
        local collection_file="$BACKUP_DIR/${collection}_${DATE}.json.gz"
        
        # Export collection as JSON
        mongoexport --host "$MONGO_HOST:$MONGO_PORT" \
            --db "$MONGO_DB" \
            --collection "$collection" \
            --username "$MONGO_USER" \
            --password "$MONGO_PASSWORD" \
            --jsonArray | gzip > "$collection_file" || log "Warning: Failed to backup collection $collection"
        
        # Upload to S3
        if [[ -f "$collection_file" ]]; then
            aws s3 cp "$collection_file" "s3://$S3_BUCKET/mongodb/collections/" \
                --server-side-encryption AES256 || log "Warning: Failed to upload collection backup $collection"
            
            # Cleanup local file
            rm -f "$collection_file"
        fi
    done
    
    log "Collection-level backups completed"
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up old backups..."
    
    # Cleanup local backups older than retention period
    find "$BACKUP_DIR" -name "mongodb_backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete
    
    # Cleanup S3 backups (using lifecycle policy is preferred)
    local cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y%m%d)
    
    aws s3 ls "s3://$S3_BUCKET/mongodb/" | while read -r line; do
        local file_date=$(echo "$line" | awk '{print $4}' | grep -o '[0-9]\{8\}' | head -1)
        if [[ "$file_date" < "$cutoff_date" ]]; then
            local file_name=$(echo "$line" | awk '{print $4}')
            aws s3 rm "s3://$S3_BUCKET/mongodb/$file_name"
            log "Deleted old backup: $file_name"
        fi
    done
    
    log "Cleanup completed"
}

# Validate backup consistency
validate_backup() {
    local backup_file="$1"
    
    log "Validating backup consistency..."
    
    # Extract and validate archive structure
    local temp_dir=$(mktemp -d)
    tar -xzf "$backup_file" -C "$temp_dir"
    
    # Check if backup contains expected database
    if [[ ! -d "$temp_dir/$BACKUP_NAME/$MONGO_DB" ]]; then
        error_exit "Backup validation failed: Database directory not found"
    fi
    
    # Check if backup contains BSON files
    local bson_count=$(find "$temp_dir/$BACKUP_NAME/$MONGO_DB" -name "*.bson.gz" | wc -l)
    if [[ $bson_count -eq 0 ]]; then
        error_exit "Backup validation failed: No BSON files found"
    fi
    
    log "Backup validation successful: Found $bson_count collections"
    
    # Cleanup temp directory
    rm -rf "$temp_dir"
}

# Send notification
send_notification() {
    local status="$1"
    local message="$2"
    
    # Send to Slack webhook if configured
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"MongoDB Backup $status: $message\"}" \
            "$SLACK_WEBHOOK_URL" || log "Failed to send Slack notification"
    fi
    
    # Send email notification if configured
    if [[ -n "${NOTIFICATION_EMAIL:-}" ]]; then
        echo "$message" | mail -s "MongoDB Backup $status" "$NOTIFICATION_EMAIL" || log "Failed to send email notification"
    fi
}

# Main execution
main() {
    log "Starting MongoDB backup process..."
    
    local start_time=$(date +%s)
    
    # Trap errors and send failure notification
    trap 'send_notification "FAILED" "MongoDB backup failed. Check logs for details."' ERR
    
    # Execute backup process
    check_prerequisites
    
    local backup_file
    backup_file=$(create_backup)
    
    validate_backup "$backup_file"
    
    upload_to_s3 "$backup_file"
    
    # Create oplog backup for PITR (daily)
    create_oplog_backup
    
    # Create collection-level backups (weekly)
    if [[ $(date +%u) -eq 7 ]]; then
        create_collection_backups
    fi
    
    cleanup_old_backups
    
    # Calculate duration
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    local success_message="MongoDB backup completed successfully in ${duration}s. Backup: $(basename "$backup_file")"
    log "$success_message"
    
    send_notification "SUCCESS" "$success_message"
    
    # Remove local backup file after successful upload
    rm -f "$backup_file"
    
    log "MongoDB backup process completed"
}

# Execute main function
main "$@"