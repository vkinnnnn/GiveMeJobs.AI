#!/bin/bash
# Deployment Script for GiveMeJobs Platform

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
HELM_CHART_PATH="$PROJECT_ROOT/helm/givemejobs"

# Default values
ENVIRONMENT=""
NAMESPACE=""
IMAGE_TAG=""
DRY_RUN=false
FORCE=false
ROLLBACK=false
ROLLBACK_REVISION=""
SKIP_TESTS=false
BACKUP_BEFORE_DEPLOY=true

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Usage information
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Deploy GiveMeJobs platform to Kubernetes cluster.

Options:
    -e, --environment ENV       Target environment (staging|production)
    -n, --namespace NAMESPACE   Kubernetes namespace (optional, defaults based on environment)
    -t, --tag TAG              Docker image tag to deploy
    -d, --dry-run              Show what would be deployed without executing
    -f, --force                Skip confirmation prompts
    -r, --rollback [REVISION]  Rollback to previous or specific revision
    -s, --skip-tests           Skip pre-deployment tests
    --no-backup                Skip pre-deployment backup
    -h, --help                 Show this help message

Examples:
    $0 --environment staging --tag develop
    $0 --environment production --tag v1.2.3 --force
    $0 --environment production --rollback
    $0 --environment staging --rollback 5

EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -e|--environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -n|--namespace)
                NAMESPACE="$2"
                shift 2
                ;;
            -t|--tag)
                IMAGE_TAG="$2"
                shift 2
                ;;
            -d|--dry-run)
                DRY_RUN=true
                shift
                ;;
            -f|--force)
                FORCE=true
                shift
                ;;
            -r|--rollback)
                ROLLBACK=true
                if [[ $# -gt 1 && ! $2 =~ ^- ]]; then
                    ROLLBACK_REVISION="$2"
                    shift 2
                else
                    shift
                fi
                ;;
            -s|--skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --no-backup)
                BACKUP_BEFORE_DEPLOY=false
                shift
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
}

# Validate arguments
validate_args() {
    if [[ -z "$ENVIRONMENT" ]]; then
        log_error "Environment is required. Use --environment staging|production"
        exit 1
    fi

    if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
        log_error "Environment must be 'staging' or 'production'"
        exit 1
    fi

    # Set default namespace if not provided
    if [[ -z "$NAMESPACE" ]]; then
        if [[ "$ENVIRONMENT" == "staging" ]]; then
            NAMESPACE="givemejobs-staging"
        else
            NAMESPACE="givemejobs-prod"
        fi
    fi

    # Validate image tag for non-rollback deployments
    if [[ "$ROLLBACK" != true && -z "$IMAGE_TAG" ]]; then
        log_error "Image tag is required for deployment. Use --tag <tag>"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check if kubectl is available and configured
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl not found. Please install kubectl."
        exit 1
    fi

    # Check if helm is available
    if ! command -v helm &> /dev/null; then
        log_error "helm not found. Please install Helm."
        exit 1
    fi

    # Check kubectl connectivity
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster. Check your kubeconfig."
        exit 1
    fi

    # Check if namespace exists
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_warning "Namespace '$NAMESPACE' does not exist. Creating it..."
        kubectl create namespace "$NAMESPACE"
    fi

    # Verify Helm chart
    if [[ ! -f "$HELM_CHART_PATH/Chart.yaml" ]]; then
        log_error "Helm chart not found at $HELM_CHART_PATH"
        exit 1
    fi

    log_success "Prerequisites check completed"
}

# Run pre-deployment tests
run_pre_deployment_tests() {
    if [[ "$SKIP_TESTS" == true ]]; then
        log_warning "Skipping pre-deployment tests"
        return
    fi

    log_info "Running pre-deployment tests..."

    # Helm chart validation
    log_info "Validating Helm chart..."
    helm lint "$HELM_CHART_PATH" || {
        log_error "Helm chart validation failed"
        exit 1
    }

    # Template validation
    log_info "Validating Kubernetes templates..."
    helm template test-release "$HELM_CHART_PATH" \
        --values "$HELM_CHART_PATH/values-${ENVIRONMENT}.yaml" \
        --set images.backend.tag="$IMAGE_TAG" \
        --set images.frontend.tag="$IMAGE_TAG" \
        --set images.pythonServices.tag="$IMAGE_TAG" \
        --set images.celeryWorker.tag="$IMAGE_TAG" \
        --validate > /dev/null || {
        log_error "Kubernetes template validation failed"
        exit 1
    }

    # Check if images exist (for production)
    if [[ "$ENVIRONMENT" == "production" ]]; then
        log_info "Verifying Docker images exist..."
        local images=(
            "ghcr.io/givemejobs/platform/backend:$IMAGE_TAG"
            "ghcr.io/givemejobs/platform/frontend:$IMAGE_TAG"
            "ghcr.io/givemejobs/platform/python-services:$IMAGE_TAG"
            "ghcr.io/givemejobs/platform/celery-worker:$IMAGE_TAG"
        )

        for image in "${images[@]}"; do
            if ! docker manifest inspect "$image" &> /dev/null; then
                log_error "Image not found: $image"
                exit 1
            fi
        done
    fi

    log_success "Pre-deployment tests completed"
}

# Create pre-deployment backup
create_backup() {
    if [[ "$BACKUP_BEFORE_DEPLOY" != true ]]; then
        log_warning "Skipping pre-deployment backup"
        return
    fi

    log_info "Creating pre-deployment backup..."

    # Create backup jobs
    local timestamp=$(date +%s)
    
    # PostgreSQL backup
    kubectl create job --from=cronjob/postgresql-backup \
        "pre-deploy-backup-postgres-$timestamp" \
        -n "$NAMESPACE" || log_warning "Failed to create PostgreSQL backup job"

    # MongoDB backup
    kubectl create job --from=cronjob/mongodb-backup \
        "pre-deploy-backup-mongo-$timestamp" \
        -n "$NAMESPACE" || log_warning "Failed to create MongoDB backup job"

    # Wait for backup jobs to complete (with timeout)
    log_info "Waiting for backup jobs to complete (timeout: 10 minutes)..."
    
    local timeout=600
    local elapsed=0
    local interval=10

    while [[ $elapsed -lt $timeout ]]; do
        local postgres_status=$(kubectl get job "pre-deploy-backup-postgres-$timestamp" -n "$NAMESPACE" -o jsonpath='{.status.conditions[0].type}' 2>/dev/null || echo "NotFound")
        local mongo_status=$(kubectl get job "pre-deploy-backup-mongo-$timestamp" -n "$NAMESPACE" -o jsonpath='{.status.conditions[0].type}' 2>/dev/null || echo "NotFound")

        if [[ "$postgres_status" == "Complete" && "$mongo_status" == "Complete" ]]; then
            log_success "Backup jobs completed successfully"
            return
        fi

        if [[ "$postgres_status" == "Failed" || "$mongo_status" == "Failed" ]]; then
            log_error "Backup jobs failed. Check job logs for details."
            exit 1
        fi

        sleep $interval
        elapsed=$((elapsed + interval))
        log_info "Backup in progress... (${elapsed}s/${timeout}s)"
    done

    log_warning "Backup jobs did not complete within timeout. Proceeding with deployment..."
}

# Perform rollback
perform_rollback() {
    log_info "Performing rollback..."

    local release_name="givemejobs"
    if [[ "$ENVIRONMENT" == "staging" ]]; then
        release_name="givemejobs-staging"
    fi

    # Get rollback revision
    local revision_arg=""
    if [[ -n "$ROLLBACK_REVISION" ]]; then
        revision_arg="--revision $ROLLBACK_REVISION"
    fi

    # Perform rollback
    if [[ "$DRY_RUN" == true ]]; then
        log_info "DRY RUN: Would rollback release '$release_name' in namespace '$NAMESPACE'"
        helm history "$release_name" -n "$NAMESPACE" || true
    else
        helm rollback "$release_name" $revision_arg -n "$NAMESPACE" || {
            log_error "Rollback failed"
            exit 1
        }
        log_success "Rollback completed successfully"
    fi
}

# Deploy application
deploy_application() {
    log_info "Deploying application to $ENVIRONMENT environment..."

    local release_name="givemejobs"
    if [[ "$ENVIRONMENT" == "staging" ]]; then
        release_name="givemejobs-staging"
    fi

    local values_file="$HELM_CHART_PATH/values-${ENVIRONMENT}.yaml"

    # Build Helm command
    local helm_cmd=(
        helm upgrade --install "$release_name" "$HELM_CHART_PATH"
        --namespace "$NAMESPACE"
        --create-namespace
        --values "$values_file"
        --set "images.backend.tag=$IMAGE_TAG"
        --set "images.frontend.tag=$IMAGE_TAG"
        --set "images.pythonServices.tag=$IMAGE_TAG"
        --set "images.celeryWorker.tag=$IMAGE_TAG"
        --set "deployment.timestamp=$(date +%s)"
        --set "deployment.deployedBy=$(whoami)"
        --set "deployment.gitCommit=${GITHUB_SHA:-$(git rev-parse HEAD 2>/dev/null || echo 'unknown')}"
        --timeout 15m
        --wait
    )

    # Add atomic flag for production
    if [[ "$ENVIRONMENT" == "production" ]]; then
        helm_cmd+=(--atomic)
    fi

    # Execute deployment
    if [[ "$DRY_RUN" == true ]]; then
        log_info "DRY RUN: Would execute the following Helm command:"
        echo "${helm_cmd[*]} --dry-run"
        "${helm_cmd[@]}" --dry-run
    else
        log_info "Executing deployment..."
        "${helm_cmd[@]}" || {
            log_error "Deployment failed"
            
            # Show recent events for debugging
            log_info "Recent events in namespace $NAMESPACE:"
            kubectl get events -n "$NAMESPACE" --sort-by='.lastTimestamp' | tail -20
            
            exit 1
        }
        log_success "Deployment completed successfully"
    fi
}

# Run post-deployment tests
run_post_deployment_tests() {
    if [[ "$DRY_RUN" == true || "$SKIP_TESTS" == true ]]; then
        return
    fi

    log_info "Running post-deployment tests..."

    # Wait for pods to be ready
    log_info "Waiting for pods to be ready..."
    kubectl wait --for=condition=available --timeout=300s \
        deployment/backend deployment/frontend deployment/python-services \
        -n "$NAMESPACE" || {
        log_error "Pods did not become ready within timeout"
        exit 1
    }

    # Health check tests
    log_info "Running health checks..."
    
    local base_url
    if [[ "$ENVIRONMENT" == "staging" ]]; then
        base_url="https://staging.givemejobs.ai"
    else
        base_url="https://givemejobs.ai"
    fi

    # Test frontend
    if curl -f -s "$base_url/health" > /dev/null; then
        log_success "Frontend health check passed"
    else
        log_error "Frontend health check failed"
        exit 1
    fi

    # Test backend API
    local api_url="${base_url/givemejobs.ai/api.givemejobs.ai}"
    if [[ "$ENVIRONMENT" == "staging" ]]; then
        api_url="${base_url/staging.givemejobs.ai/api-staging.givemejobs.ai}"
    fi

    if curl -f -s "$api_url/health" > /dev/null; then
        log_success "Backend API health check passed"
    else
        log_error "Backend API health check failed"
        exit 1
    fi

    # Test Python AI services
    local ai_url="${base_url/givemejobs.ai/ai.givemejobs.ai}"
    if [[ "$ENVIRONMENT" == "staging" ]]; then
        ai_url="${base_url/staging.givemejobs.ai/ai-staging.givemejobs.ai}"
    fi

    if curl -f -s "$ai_url/health" > /dev/null; then
        log_success "Python AI services health check passed"
    else
        log_error "Python AI services health check failed"
        exit 1
    fi

    log_success "Post-deployment tests completed"
}

# Show deployment status
show_deployment_status() {
    if [[ "$DRY_RUN" == true ]]; then
        return
    fi

    log_info "Deployment Status:"
    echo "===================="
    
    # Show release info
    local release_name="givemejobs"
    if [[ "$ENVIRONMENT" == "staging" ]]; then
        release_name="givemejobs-staging"
    fi

    helm status "$release_name" -n "$NAMESPACE"
    
    echo ""
    log_info "Pod Status:"
    kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/instance="$release_name"
    
    echo ""
    log_info "Service Status:"
    kubectl get svc -n "$NAMESPACE" -l app.kubernetes.io/instance="$release_name"
    
    echo ""
    log_info "Ingress Status:"
    kubectl get ingress -n "$NAMESPACE" -l app.kubernetes.io/instance="$release_name"
}

# Send deployment notification
send_notification() {
    local status="$1"
    local message="$2"

    # Send Slack notification if webhook URL is configured
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        local color="good"
        if [[ "$status" == "FAILED" ]]; then
            color="danger"
        fi

        curl -X POST -H 'Content-type: application/json' \
            --data "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"Deployment $status\",
                    \"text\": \"$message\",
                    \"fields\": [
                        {\"title\": \"Environment\", \"value\": \"$ENVIRONMENT\", \"short\": true},
                        {\"title\": \"Namespace\", \"value\": \"$NAMESPACE\", \"short\": true},
                        {\"title\": \"Image Tag\", \"value\": \"$IMAGE_TAG\", \"short\": true},
                        {\"title\": \"Deployed By\", \"value\": \"$(whoami)\", \"short\": true}
                    ]
                }]
            }" \
            "$SLACK_WEBHOOK_URL" || log_warning "Failed to send Slack notification"
    fi
}

# Main execution
main() {
    parse_args "$@"
    validate_args

    log_info "Starting deployment process..."
    log_info "Environment: $ENVIRONMENT"
    log_info "Namespace: $NAMESPACE"
    log_info "Image Tag: $IMAGE_TAG"
    log_info "Dry Run: $DRY_RUN"

    # Confirmation prompt for production
    if [[ "$ENVIRONMENT" == "production" && "$FORCE" != true && "$DRY_RUN" != true ]]; then
        echo ""
        log_warning "You are about to deploy to PRODUCTION!"
        echo "Environment: $ENVIRONMENT"
        echo "Namespace: $NAMESPACE"
        echo "Image Tag: $IMAGE_TAG"
        echo ""
        read -p "Are you sure you want to continue? (yes/no): " confirm
        
        if [[ "$confirm" != "yes" ]]; then
            log_info "Deployment cancelled by user"
            exit 0
        fi
    fi

    # Trap errors and send failure notification
    trap 'send_notification "FAILED" "Deployment failed. Check logs for details."' ERR

    # Execute deployment steps
    check_prerequisites

    if [[ "$ROLLBACK" == true ]]; then
        perform_rollback
    else
        run_pre_deployment_tests
        create_backup
        deploy_application
        run_post_deployment_tests
    fi

    show_deployment_status

    # Send success notification
    local success_message="Deployment completed successfully to $ENVIRONMENT environment"
    if [[ "$ROLLBACK" == true ]]; then
        success_message="Rollback completed successfully in $ENVIRONMENT environment"
    fi

    send_notification "SUCCESS" "$success_message"
    log_success "$success_message"
}

# Execute main function
main "$@"