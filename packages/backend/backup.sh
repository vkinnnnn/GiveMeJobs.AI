#!/bin/bash

# Backup script for GiveMeJobs Backend
# This script creates backups of all critical data

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS="${RETENTION_DAYS:-7}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔄 Starting GiveMeJobs backup process...${NC}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Load environment variables
if [ -f ".env.production" ]; then
    source .env.production
elif [ -f ".env" ]; then
    source .env
else
    echo -e "${RED}❌ No environment file found!${NC}"
    exit 1
fi

# Function to log with timestamp
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to backup PostgreSQL
backup_postgres() {
    log "${YELLOW}📊 Backing up PostgreSQL database...${NC}"
    
    if [ -z "$DATABASE_URL" ]; then
        log "${RED}❌ DATABASE_URL not set${NC}"
        return 1
    fi
    
    local backup_file="$BACKUP_DIR/postgres_$DATE.sql"
    
    if pg_dump "$DATABASE_URL" > "$backup_file"; then
        log "${GREEN}✅ PostgreSQL backup completed: $backup_file${NC}"
        
        # Compress the backup
        gzip "$backup_file"
        log "${GREEN}✅ PostgreSQL backup compressed: $backup_file.gz${NC}"
    else
        log "${RED}❌ PostgreSQL backup failed${NC}"
        return 1
    fi
}

# Function to backup MongoDB
backup_mongodb() {
    log "${YELLOW}📄 Backing up MongoDB database...${NC}"
    
    if [ -z "$MONGODB_URI" ]; then
        log "${RED}❌ MONGODB_URI not set${NC}"
        return 1
    fi
    
    local backup_dir="$BACKUP_DIR/mongodb_$DATE"
    
    if mongodump --uri="$MONGODB_URI" --out="$backup_dir"; then
        log "${GREEN}✅ MongoDB backup completed: $backup_dir${NC}"
        
        # Compress the backup
        tar -czf "$backup_dir.tar.gz" -C "$BACKUP_DIR" "mongodb_$DATE"
        rm -rf "$backup_dir"
        log "${GREEN}✅ MongoDB backup compressed: $backup_dir.tar.gz${NC}"
    else
        log "${RED}❌ MongoDB backup failed${NC}"
        return 1
    fi
}

# Function to backup uploaded files
backup_uploads() {
    log "${YELLOW}📁 Backing up uploaded files...${NC}"
    
    if [ -d "uploads" ]; then
        local backup_file="$BACKUP_DIR/uploads_$DATE.tar.gz"
        
        if tar -czf "$backup_file" uploads/; then
            log "${GREEN}✅ Uploads backup completed: $backup_file${NC}"
        else
            log "${RED}❌ Uploads backup failed${NC}"
            return 1
        fi
    else
        log "${YELLOW}⚠️  No uploads directory found, skipping...${NC}"
    fi
}

# Function to backup configuration files
backup_config() {
    log "${YELLOW}⚙️  Backing up configuration files...${NC}"
    
    local config_backup="$BACKUP_DIR/config_$DATE.tar.gz"
    
    # Create temporary directory for config files
    local temp_dir=$(mktemp -d)
    
    # Copy important config files (excluding sensitive data)
    [ -f "package.json" ] && cp "package.json" "$temp_dir/"
    [ -f "tsconfig.json" ] && cp "tsconfig.json" "$temp_dir/"
    [ -f "docker-compose.yml" ] && cp "docker-compose.yml" "$temp_dir/"
    [ -f "nginx.conf" ] && cp "nginx.conf" "$temp_dir/"
    [ -f ".env.example" ] && cp ".env.example" "$temp_dir/"
    
    if tar -czf "$config_backup" -C "$temp_dir" .; then
        log "${GREEN}✅ Configuration backup completed: $config_backup${NC}"
    else
        log "${RED}❌ Configuration backup failed${NC}"
    fi
    
    # Cleanup
    rm -rf "$temp_dir"
}

# Function to clean old backups
cleanup_old_backups() {
    log "${YELLOW}🧹 Cleaning up old backups (older than $RETENTION_DAYS days)...${NC}"
    
    local deleted_count=0
    
    # Clean PostgreSQL backups
    deleted_count=$(find "$BACKUP_DIR" -name "postgres_*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
    [ $deleted_count -gt 0 ] && log "${GREEN}✅ Deleted $deleted_count old PostgreSQL backups${NC}"
    
    # Clean MongoDB backups
    deleted_count=$(find "$BACKUP_DIR" -name "mongodb_*.tar.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
    [ $deleted_count -gt 0 ] && log "${GREEN}✅ Deleted $deleted_count old MongoDB backups${NC}"
    
    # Clean upload backups
    deleted_count=$(find "$BACKUP_DIR" -name "uploads_*.tar.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
    [ $deleted_count -gt 0 ] && log "${GREEN}✅ Deleted $deleted_count old upload backups${NC}"
    
    # Clean config backups
    deleted_count=$(find "$BACKUP_DIR" -name "config_*.tar.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
    [ $deleted_count -gt 0 ] && log "${GREEN}✅ Deleted $deleted_count old config backups${NC}"
}

# Function to create backup manifest
create_manifest() {
    log "${YELLOW}📋 Creating backup manifest...${NC}"
    
    local manifest_file="$BACKUP_DIR/manifest_$DATE.txt"
    
    cat > "$manifest_file" << EOF
GiveMeJobs Backup Manifest
=========================
Date: $(date)
Backup ID: $DATE
Environment: ${NODE_ENV:-development}

Files in this backup:
EOF
    
    find "$BACKUP_DIR" -name "*_$DATE.*" -type f -exec basename {} \; | sort >> "$manifest_file"
    
    # Add file sizes
    echo "" >> "$manifest_file"
    echo "File sizes:" >> "$manifest_file"
    find "$BACKUP_DIR" -name "*_$DATE.*" -type f -exec ls -lh {} \; | awk '{print $9 ": " $5}' >> "$manifest_file"
    
    log "${GREEN}✅ Backup manifest created: $manifest_file${NC}"
}

# Function to send notification (if configured)
send_notification() {
    local status=$1
    local message=$2
    
    if [ -n "$BACKUP_WEBHOOK_URL" ]; then
        curl -X POST "$BACKUP_WEBHOOK_URL" \
             -H "Content-Type: application/json" \
             -d "{\"text\":\"GiveMeJobs Backup $status: $message\"}" \
             2>/dev/null || true
    fi
    
    if [ -n "$BACKUP_EMAIL" ] && command -v mail >/dev/null 2>&1; then
        echo "$message" | mail -s "GiveMeJobs Backup $status" "$BACKUP_EMAIL" || true
    fi
}

# Main backup process
main() {
    local start_time=$(date +%s)
    local failed=0
    
    log "${GREEN}🚀 Starting backup process...${NC}"
    
    # Run backup functions
    backup_postgres || failed=1
    backup_mongodb || failed=1
    backup_uploads || failed=1
    backup_config || failed=1
    
    # Create manifest
    create_manifest
    
    # Cleanup old backups
    cleanup_old_backups
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    if [ $failed -eq 0 ]; then
        log "${GREEN}🎉 Backup completed successfully in ${duration}s${NC}"
        send_notification "SUCCESS" "Backup completed successfully in ${duration}s"
    else
        log "${RED}❌ Backup completed with errors in ${duration}s${NC}"
        send_notification "FAILED" "Backup completed with errors in ${duration}s"
        exit 1
    fi
}

# Handle interruption
trap 'log "${RED}❌ Backup interrupted${NC}"; exit 1' INT TERM

# Check dependencies
check_dependencies() {
    local missing_deps=()
    
    command -v pg_dump >/dev/null 2>&1 || missing_deps+=("postgresql-client")
    command -v mongodump >/dev/null 2>&1 || missing_deps+=("mongodb-tools")
    command -v tar >/dev/null 2>&1 || missing_deps+=("tar")
    command -v gzip >/dev/null 2>&1 || missing_deps+=("gzip")
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        log "${RED}❌ Missing dependencies: ${missing_deps[*]}${NC}"
        log "${YELLOW}Please install the missing dependencies and try again${NC}"
        exit 1
    fi
}

# Show usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -d, --dir DIR        Backup directory (default: ./backups)"
    echo "  -r, --retention DAYS Retention period in days (default: 7)"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  BACKUP_DIR          Backup directory"
    echo "  RETENTION_DAYS      Retention period in days"
    echo "  BACKUP_WEBHOOK_URL  Webhook URL for notifications"
    echo "  BACKUP_EMAIL        Email address for notifications"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--dir)
            BACKUP_DIR="$2"
            shift 2
            ;;
        -r|--retention)
            RETENTION_DAYS="$2"
            shift 2
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Run the backup
check_dependencies
main