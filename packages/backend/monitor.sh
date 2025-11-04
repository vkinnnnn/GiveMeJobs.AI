#!/bin/bash

# Monitoring script for GiveMeJobs Backend
# This script monitors the health and performance of the application

set -e

# Configuration
API_URL="${API_URL:-http://localhost:4000}"
LOG_FILE="${LOG_FILE:-./logs/monitor.log}"
ALERT_WEBHOOK="${ALERT_WEBHOOK:-}"
ALERT_EMAIL="${ALERT_EMAIL:-}"

# Thresholds
CPU_THRESHOLD="${CPU_THRESHOLD:-80}"
MEMORY_THRESHOLD="${MEMORY_THRESHOLD:-80}"
DISK_THRESHOLD="${DISK_THRESHOLD:-90}"
RESPONSE_TIME_THRESHOLD="${RESPONSE_TIME_THRESHOLD:-5000}" # milliseconds

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Function to log with timestamp
log() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo -e "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Function to send alert
send_alert() {
    local subject=$1
    local message=$2
    local severity=$3
    
    log "ALERT" "$subject: $message"
    
    # Send webhook notification
    if [ -n "$ALERT_WEBHOOK" ]; then
        curl -X POST "$ALERT_WEBHOOK" \
             -H "Content-Type: application/json" \
             -d "{
                 \"text\": \"🚨 GiveMeJobs Alert\",
                 \"attachments\": [{
                     \"color\": \"danger\",
                     \"title\": \"$subject\",
                     \"text\": \"$message\",
                     \"fields\": [{
                         \"title\": \"Severity\",
                         \"value\": \"$severity\",
                         \"short\": true
                     }, {
                         \"title\": \"Time\",
                         \"value\": \"$(date)\",
                         \"short\": true
                     }]
                 }]
             }" \
             2>/dev/null || log "ERROR" "Failed to send webhook alert"
    fi
    
    # Send email notification
    if [ -n "$ALERT_EMAIL" ] && command -v mail >/dev/null 2>&1; then
        echo "$message" | mail -s "GiveMeJobs Alert: $subject" "$ALERT_EMAIL" || \
            log "ERROR" "Failed to send email alert"
    fi
}

# Function to check if service is running
check_service_status() {
    log "INFO" "Checking service status..."
    
    # Check if running via systemd
    if command -v systemctl >/dev/null 2>&1; then
        if systemctl is-active --quiet givemejobs-backend 2>/dev/null; then
            log "INFO" "✅ Service is running (systemd)"
            return 0
        else
            log "WARN" "❌ Service is not running (systemd)"
            return 1
        fi
    fi
    
    # Check if running via PM2
    if command -v pm2 >/dev/null 2>&1; then
        if pm2 list | grep -q "givemejobs-backend.*online"; then
            log "INFO" "✅ Service is running (PM2)"
            return 0
        else
            log "WARN" "❌ Service is not running (PM2)"
            return 1
        fi
    fi
    
    # Check if process is running
    if pgrep -f "node.*dist/index.js" >/dev/null; then
        log "INFO" "✅ Service process is running"
        return 0
    else
        log "WARN" "❌ Service process is not running"
        return 1
    fi
}

# Function to check health endpoint
check_health_endpoint() {
    log "INFO" "Checking health endpoint..."
    
    local start_time=$(date +%s%3N)
    local response_code
    local response_time
    
    if response_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$API_URL/health"); then
        local end_time=$(date +%s%3N)
        response_time=$((end_time - start_time))
        
        if [ "$response_code" = "200" ]; then
            log "INFO" "✅ Health endpoint OK (${response_time}ms)"
            
            # Check response time
            if [ "$response_time" -gt "$RESPONSE_TIME_THRESHOLD" ]; then
                send_alert "Slow Response Time" \
                          "Health endpoint responded in ${response_time}ms (threshold: ${RESPONSE_TIME_THRESHOLD}ms)" \
                          "WARNING"
            fi
            
            return 0
        else
            log "ERROR" "❌ Health endpoint returned $response_code"
            send_alert "Health Check Failed" \
                      "Health endpoint returned HTTP $response_code" \
                      "CRITICAL"
            return 1
        fi
    else
        log "ERROR" "❌ Health endpoint unreachable"
        send_alert "Health Check Failed" \
                  "Health endpoint is unreachable" \
                  "CRITICAL"
        return 1
    fi
}

# Function to check database connections
check_database_connections() {
    log "INFO" "Checking database connections..."
    
    local response
    if response=$(curl -s --max-time 10 "$API_URL/health/db"); then
        if echo "$response" | grep -q '"status":"healthy"'; then
            log "INFO" "✅ Database connections OK"
            return 0
        else
            log "ERROR" "❌ Database connections unhealthy: $response"
            send_alert "Database Connection Failed" \
                      "Database health check failed: $response" \
                      "CRITICAL"
            return 1
        fi
    else
        log "ERROR" "❌ Database health check unreachable"
        return 1
    fi
}

# Function to check system resources
check_system_resources() {
    log "INFO" "Checking system resources..."
    
    # Check CPU usage
    local cpu_usage
    if command -v top >/dev/null 2>&1; then
        cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
        cpu_usage=${cpu_usage%.*} # Remove decimal part
        
        if [ "$cpu_usage" -gt "$CPU_THRESHOLD" ]; then
            log "WARN" "⚠️  High CPU usage: ${cpu_usage}%"
            send_alert "High CPU Usage" \
                      "CPU usage is ${cpu_usage}% (threshold: ${CPU_THRESHOLD}%)" \
                      "WARNING"
        else
            log "INFO" "✅ CPU usage OK: ${cpu_usage}%"
        fi
    fi
    
    # Check memory usage
    local memory_usage
    if command -v free >/dev/null 2>&1; then
        memory_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
        
        if [ "$memory_usage" -gt "$MEMORY_THRESHOLD" ]; then
            log "WARN" "⚠️  High memory usage: ${memory_usage}%"
            send_alert "High Memory Usage" \
                      "Memory usage is ${memory_usage}% (threshold: ${MEMORY_THRESHOLD}%)" \
                      "WARNING"
        else
            log "INFO" "✅ Memory usage OK: ${memory_usage}%"
        fi
    fi
    
    # Check disk usage
    local disk_usage
    disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$disk_usage" -gt "$DISK_THRESHOLD" ]; then
        log "WARN" "⚠️  High disk usage: ${disk_usage}%"
        send_alert "High Disk Usage" \
                  "Disk usage is ${disk_usage}% (threshold: ${DISK_THRESHOLD}%)" \
                  "WARNING"
    else
        log "INFO" "✅ Disk usage OK: ${disk_usage}%"
    fi
}

# Function to check log files for errors
check_error_logs() {
    log "INFO" "Checking for recent errors..."
    
    local log_files=("./logs/error.log" "./logs/app.log" "/var/log/givemejobs/error.log")
    local error_count=0
    
    for log_file in "${log_files[@]}"; do
        if [ -f "$log_file" ]; then
            # Check for errors in the last 5 minutes
            local recent_errors
            recent_errors=$(find "$log_file" -mmin -5 -exec grep -i "error\|exception\|fatal" {} \; 2>/dev/null | wc -l)
            
            if [ "$recent_errors" -gt 0 ]; then
                error_count=$((error_count + recent_errors))
                log "WARN" "⚠️  Found $recent_errors recent errors in $log_file"
            fi
        fi
    done
    
    if [ "$error_count" -gt 10 ]; then
        send_alert "High Error Rate" \
                  "Found $error_count errors in the last 5 minutes" \
                  "WARNING"
    elif [ "$error_count" -gt 0 ]; then
        log "INFO" "Found $error_count recent errors (within normal range)"
    else
        log "INFO" "✅ No recent errors found"
    fi
}

# Function to check SSL certificate expiration
check_ssl_certificate() {
    if [ -n "$SSL_CERT_PATH" ] && [ -f "$SSL_CERT_PATH" ]; then
        log "INFO" "Checking SSL certificate expiration..."
        
        local expiry_date
        expiry_date=$(openssl x509 -enddate -noout -in "$SSL_CERT_PATH" | cut -d= -f2)
        local expiry_timestamp=$(date -d "$expiry_date" +%s)
        local current_timestamp=$(date +%s)
        local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
        
        if [ "$days_until_expiry" -lt 30 ]; then
            send_alert "SSL Certificate Expiring Soon" \
                      "SSL certificate expires in $days_until_expiry days" \
                      "WARNING"
        else
            log "INFO" "✅ SSL certificate valid for $days_until_expiry days"
        fi
    fi
}

# Function to restart service if needed
restart_service_if_needed() {
    local restart_needed=false
    
    # Check if service is not running
    if ! check_service_status >/dev/null 2>&1; then
        restart_needed=true
        log "WARN" "Service is not running, restart needed"
    fi
    
    # Check if health endpoint is failing
    if ! check_health_endpoint >/dev/null 2>&1; then
        restart_needed=true
        log "WARN" "Health endpoint failing, restart needed"
    fi
    
    if [ "$restart_needed" = true ]; then
        log "INFO" "Attempting to restart service..."
        
        # Try systemd first
        if command -v systemctl >/dev/null 2>&1; then
            if systemctl restart givemejobs-backend 2>/dev/null; then
                log "INFO" "✅ Service restarted via systemd"
                send_alert "Service Restarted" \
                          "Service was automatically restarted via systemd" \
                          "INFO"
                return 0
            fi
        fi
        
        # Try PM2
        if command -v pm2 >/dev/null 2>&1; then
            if pm2 restart givemejobs-backend 2>/dev/null; then
                log "INFO" "✅ Service restarted via PM2"
                send_alert "Service Restarted" \
                          "Service was automatically restarted via PM2" \
                          "INFO"
                return 0
            fi
        fi
        
        log "ERROR" "❌ Failed to restart service"
        send_alert "Service Restart Failed" \
                  "Failed to automatically restart the service" \
                  "CRITICAL"
        return 1
    fi
}

# Function to generate monitoring report
generate_report() {
    log "INFO" "Generating monitoring report..."
    
    local report_file="./logs/monitor-report-$(date +%Y%m%d_%H%M%S).txt"
    
    cat > "$report_file" << EOF
GiveMeJobs Monitoring Report
===========================
Generated: $(date)
API URL: $API_URL

System Information:
- Hostname: $(hostname)
- Uptime: $(uptime)
- Load Average: $(uptime | awk -F'load average:' '{print $2}')

Service Status:
$(check_service_status 2>&1)

Health Check:
$(check_health_endpoint 2>&1)

Database Status:
$(check_database_connections 2>&1)

System Resources:
$(check_system_resources 2>&1)

Recent Errors:
$(check_error_logs 2>&1)

EOF
    
    log "INFO" "✅ Monitoring report generated: $report_file"
}

# Function to show usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -u, --url URL        API URL (default: http://localhost:4000)"
    echo "  -l, --log FILE       Log file path (default: ./logs/monitor.log)"
    echo "  -r, --restart        Enable automatic service restart"
    echo "  -R, --report         Generate monitoring report"
    echo "  -c, --continuous     Run continuously (daemon mode)"
    echo "  -i, --interval SEC   Check interval in seconds (default: 60)"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  API_URL             API base URL"
    echo "  LOG_FILE            Log file path"
    echo "  ALERT_WEBHOOK       Webhook URL for alerts"
    echo "  ALERT_EMAIL         Email address for alerts"
    echo "  CPU_THRESHOLD       CPU usage threshold (default: 80)"
    echo "  MEMORY_THRESHOLD    Memory usage threshold (default: 80)"
    echo "  DISK_THRESHOLD      Disk usage threshold (default: 90)"
    echo "  RESPONSE_TIME_THRESHOLD Response time threshold in ms (default: 5000)"
}

# Main monitoring function
run_monitoring_checks() {
    log "INFO" "🔍 Starting monitoring checks..."
    
    local failed_checks=0
    
    # Run all checks
    check_service_status || failed_checks=$((failed_checks + 1))
    check_health_endpoint || failed_checks=$((failed_checks + 1))
    check_database_connections || failed_checks=$((failed_checks + 1))
    check_system_resources || failed_checks=$((failed_checks + 1))
    check_error_logs || failed_checks=$((failed_checks + 1))
    check_ssl_certificate || failed_checks=$((failed_checks + 1))
    
    if [ "$AUTO_RESTART" = true ]; then
        restart_service_if_needed || failed_checks=$((failed_checks + 1))
    fi
    
    if [ $failed_checks -eq 0 ]; then
        log "INFO" "✅ All monitoring checks passed"
    else
        log "WARN" "⚠️  $failed_checks monitoring checks failed"
    fi
    
    return $failed_checks
}

# Parse command line arguments
AUTO_RESTART=false
GENERATE_REPORT=false
CONTINUOUS=false
INTERVAL=60

while [[ $# -gt 0 ]]; do
    case $1 in
        -u|--url)
            API_URL="$2"
            shift 2
            ;;
        -l|--log)
            LOG_FILE="$2"
            shift 2
            ;;
        -r|--restart)
            AUTO_RESTART=true
            shift
            ;;
        -R|--report)
            GENERATE_REPORT=true
            shift
            ;;
        -c|--continuous)
            CONTINUOUS=true
            shift
            ;;
        -i|--interval)
            INTERVAL="$2"
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

# Handle interruption for continuous mode
trap 'log "INFO" "Monitoring stopped"; exit 0' INT TERM

# Main execution
log "INFO" "🚀 GiveMeJobs monitoring started"
log "INFO" "API URL: $API_URL"
log "INFO" "Log file: $LOG_FILE"

if [ "$GENERATE_REPORT" = true ]; then
    generate_report
fi

if [ "$CONTINUOUS" = true ]; then
    log "INFO" "Running in continuous mode (interval: ${INTERVAL}s)"
    
    while true; do
        run_monitoring_checks
        sleep "$INTERVAL"
    done
else
    run_monitoring_checks
    exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        log "INFO" "🎉 Monitoring completed successfully"
    else
        log "ERROR" "❌ Monitoring completed with $exit_code failed checks"
    fi
    
    exit $exit_code
fi