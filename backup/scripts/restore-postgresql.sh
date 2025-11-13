#!/bin/bash
# PostgreSQL Restore Script for GiveMeJobs Platform

set -euo pipefail

# Configuration
BACKUP_DIR="/backups/postgresql"
S3_BUCKET="givemejobs-backups"

# Database connection details
DB_HOST="${POSTGRES_HOST:-postgres}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-givemejobs_db}"
DB_USER="${POSTGRES_USER:-givemejobs}"

# Logging
LOG_FILE="/var/log/backup/postgresql_restore.log"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    log "ERROR: $1"
    exit 1
}

# Usage information
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Options:
    -f, --file BACKUP_FILE      Restore from local backup file
    -s, --s3-key S3_KEY        Restore from S3 backup
    -d, --date DATE            Restore from backup by date (YYYYMMDD)
    -l, --list                 List available backups
    -p, --pitr TIMESTAMP       Point-in-time recovery to timestamp
    --dry-run                  Show what would be restored without executing
    --force                    Skip confirmation prompts
    -h, --help                 Show this help message

Examples:
    $0 --list
    $0 --file /backups/postgresql/backup_20231201_120000.sql.gz
    $0 --s3-key postgresql/backup_20231201_120000.sql.gz
    $0 --date 20231201
    $0 --pitr "2023-12-01 12:00:00"

EOF
}

# Parse command line arguments
parse_args() {
    BACKUP_FILE=""
    S3_KEY=""
    BACKUP_DATE=""
    LIST_BACKUPS=false
    PITR_TIMESTAMP=""
    DRY_RUN=false
    FORCE=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -f|--file)
                BACKUP_FILE="$2"
                shift 2
                ;;
            -s|--s3-key)
                S3_KEY="$2"
                shift 2
                ;;
            -d|--date)
                BACKUP_DATE="$2"
                shift 2
                ;;
            -l|--list)
                LIST_BACKUPS=true
                shift
                ;;
            -p|--pitr)
                PITR_TIMESTAMP="$2"
                shift 2
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --force)
                FORCE=true
                shift
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            *)
                error_exit "Unknown option: $1"
                ;;
        esac
    done
}

# List available backups
list_backups() {
    log "Listing available backups..."
    
    echo "Local backups:"
    if [[ -d "$BACKUP_DIR" ]]; then
        ls -la "$BACKUP_DIR"/postgresql_backup_*.sql.gz 2>/dev/null || echo "No local backups found"
    else
        echo "No local backup directory found"
    fi
    
    echo ""
    echo "S3 backups:"
    aws s3 ls "s3://$S3_BUCKET/postgresql/" --recursive | grep "\.sql\.gz$" || echo "No S3 backups found"
    
    echo ""
    echo "PITR backups:"
    aws s3 ls "s3://$S3_BUCKET/postgresql/pitr/" --recursive || echo "No PITR backups found"
}

# Download backup from S3
download_from_s3() {
    local s3_key="$1"
    local local_file="$BACKUP_DIR/$(basename "$s3_key")"
    
    log "Downloading backup from S3: $s3_key"
    
    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR"
    
    # Download file
    aws s3 cp "s3://$S3_BUCKET/$s3_key" "$local_file" || error_exit "Failed to download backup from S3"
    
    # Verify download
    if [[ ! -f "$local_file" ]]; then
        error_exit "Downloaded file not found: $local_file"
    fi
    
    log "Backup downloaded successfully: $local_file"
    echo "$local_file"
}

# Find backup by date
find_backup_by_date() {
    local date="$1"
    
    log "Finding backup for date: $date"
    
    # Look for local backup first
    local local_backup=$(ls "$BACKUP_DIR"/postgresql_backup_${date}_*.sql.gz 2>/dev/null | head -1 || true)
    if [[ -n "$local_backup" ]]; then
        echo "$local_backup"
        return
    fi
    
    # Look for S3 backup
    local s3_backup=$(aws s3 ls "s3://$S3_BUCKET/postgresql/" | grep "postgresql_backup_${date}_" | awk '{print $4}' | head -1 || true)
    if [[ -n "$s3_backup" ]]; then
        download_from_s3 "postgresql/$s3_backup"
        return
    fi
    
    error_exit "No backup found for date: $date"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if pg_restore is available
    if ! command -v pg_restore &> /dev/null; then
        error_exit "pg_restore not found. Please install PostgreSQL client tools."
    fi
    
    # Check if psql is available
    if ! command -v psql &> /dev/null; then
        error_exit "psql not found. Please install PostgreSQL client tools."
    fi
    
    # Check database connectivity
    if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER"; then
        error_exit "Cannot connect to PostgreSQL server"
    fi
    
    log "Prerequisites check completed successfully"
}

# Create database backup before restore
create_pre_restore_backup() {
    log "Creating pre-restore backup..."
    
    local pre_restore_backup="$BACKUP_DIR/pre_restore_$(date +%Y%m%d_%H%M%S).sql.gz"
    
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --format=custom --compress=9 --file="$pre_restore_backup" || error_exit "Failed to create pre-restore backup"
    
    log "Pre-restore backup created: $pre_restore_backup"
}

# Restore database from backup
restore_database() {
    local backup_file="$1"
    
    log "Starting database restore from: $backup_file"
    
    # Verify backup file exists and is readable
    if [[ ! -f "$backup_file" ]]; then
        error_exit "Backup file not found: $backup_file"
    fi
    
    if [[ ! -r "$backup_file" ]]; then
        error_exit "Backup file not readable: $backup_file"
    fi
    
    # Check if backup file is compressed
    local restore_file="$backup_file"
    if [[ "$backup_file" == *.gz ]]; then
        log "Decompressing backup file..."
        local temp_file="${backup_file%.gz}"
        gunzip -c "$backup_file" > "$temp_file" || error_exit "Failed to decompress backup file"
        restore_file="$temp_file"
    fi
    
    # Drop existing connections to the database
    log "Terminating existing connections to database..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c \
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" || true
    
    # Drop and recreate database
    log "Dropping and recreating database..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;" || error_exit "Failed to drop database"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;" || error_exit "Failed to create database"
    
    # Restore database
    log "Restoring database..."
    pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --verbose --clean --if-exists --no-owner --no-privileges \
        "$restore_file" || error_exit "Failed to restore database"
    
    # Cleanup temporary file if created
    if [[ "$restore_file" != "$backup_file" ]]; then
        rm -f "$restore_file"
    fi
    
    log "Database restore completed successfully"
}

# Point-in-time recovery
perform_pitr() {
    local target_timestamp="$1"
    
    log "Starting point-in-time recovery to: $target_timestamp"
    
    # Find the most recent base backup before the target timestamp
    local base_backup=$(aws s3 ls "s3://$S3_BUCKET/postgresql/pitr/" | \
        awk -v target="$target_timestamp" '$1 " " $2 < target {print $4}' | \
        tail -1)
    
    if [[ -z "$base_backup" ]]; then
        error_exit "No base backup found before target timestamp"
    fi
    
    log "Using base backup: $base_backup"
    
    # Download and restore base backup
    local base_backup_file=$(download_from_s3 "postgresql/pitr/$base_backup")
    
    # Extract base backup
    local pitr_dir="$BACKUP_DIR/pitr_restore"
    mkdir -p "$pitr_dir"
    tar -xzf "$base_backup_file" -C "$pitr_dir"
    
    # Stop PostgreSQL service (this would need to be adapted for Kubernetes)
    log "Note: Manual PostgreSQL service restart required for PITR"
    log "1. Stop PostgreSQL service"
    log "2. Replace data directory with: $pitr_dir"
    log "3. Configure recovery.conf with target timestamp: $target_timestamp"
    log "4. Start PostgreSQL service"
    
    error_exit "PITR requires manual intervention. See logs for instructions."
}

# Verify restore
verify_restore() {
    log "Verifying database restore..."
    
    # Check database connectivity
    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null; then
        error_exit "Cannot connect to restored database"
    fi
    
    # Check table count
    local table_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")
    
    log "Restored database contains $table_count tables"
    
    # Check for critical tables
    local critical_tables=("users" "jobs" "applications" "resumes")
    for table in "${critical_tables[@]}"; do
        local exists=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table');")
        
        if [[ "$exists" =~ "t" ]]; then
            log "Critical table '$table' exists"
        else
            log "WARNING: Critical table '$table' not found"
        fi
    done
    
    log "Database restore verification completed"
}

# Send notification
send_notification() {
    local status="$1"
    local message="$2"
    
    # Send to Slack webhook if configured
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"PostgreSQL Restore $status: $message\"}" \
            "$SLACK_WEBHOOK_URL" || log "Failed to send Slack notification"
    fi
}

# Main execution
main() {
    parse_args "$@"
    
    # Handle list backups option
    if [[ "$LIST_BACKUPS" == true ]]; then
        list_backups
        exit 0
    fi
    
    log "Starting PostgreSQL restore process..."
    
    local start_time=$(date +%s)
    
    # Determine backup file to restore
    local backup_file=""
    
    if [[ -n "$BACKUP_FILE" ]]; then
        backup_file="$BACKUP_FILE"
    elif [[ -n "$S3_KEY" ]]; then
        backup_file=$(download_from_s3 "$S3_KEY")
    elif [[ -n "$BACKUP_DATE" ]]; then
        backup_file=$(find_backup_by_date "$BACKUP_DATE")
    elif [[ -n "$PITR_TIMESTAMP" ]]; then
        perform_pitr "$PITR_TIMESTAMP"
        exit 0
    else
        error_exit "No backup source specified. Use --help for usage information."
    fi
    
    # Dry run mode
    if [[ "$DRY_RUN" == true ]]; then
        log "DRY RUN: Would restore from backup file: $backup_file"
        exit 0
    fi
    
    # Confirmation prompt
    if [[ "$FORCE" != true ]]; then
        echo "WARNING: This will completely replace the current database!"
        echo "Backup file: $backup_file"
        echo "Target database: $DB_NAME on $DB_HOST:$DB_PORT"
        read -p "Are you sure you want to continue? (yes/no): " confirm
        
        if [[ "$confirm" != "yes" ]]; then
            log "Restore cancelled by user"
            exit 0
        fi
    fi
    
    # Execute restore process
    check_prerequisites
    create_pre_restore_backup
    restore_database "$backup_file"
    verify_restore
    
    # Calculate duration
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    local success_message="PostgreSQL restore completed successfully in ${duration}s from $(basename "$backup_file")"
    log "$success_message"
    
    send_notification "SUCCESS" "$success_message"
    
    log "PostgreSQL restore process completed"
}

# Execute main function
main "$@"