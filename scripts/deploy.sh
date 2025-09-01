#!/bin/bash

# ShiftLink Deployment Script
# This script handles the deployment process for ShiftLink

set -e # Exit on any error

echo "🚀 Starting ShiftLink deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="shiftlink"
BUILD_DIR="dist"
BACKUP_DIR="backups"

# Functions
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

check_dependencies() {
    log_info "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    log_success "Dependencies check passed"
}

run_tests() {
    log_info "Running tests..."
    
    # Unit tests
    npm run test || {
        log_error "Unit tests failed"
        exit 1
    }
    
    # Type checking
    npm run type-check || {
        log_error "Type checking failed"
        exit 1
    }
    
    # Linting
    npm run lint || {
        log_error "Linting failed"
        exit 1
    }
    
    log_success "All tests passed"
}

build_project() {
    log_info "Building project..."
    
    # Clean previous build
    rm -rf .next
    
    # Build
    npm run build || {
        log_error "Build failed"
        exit 1
    }
    
    log_success "Build completed"
}

run_e2e_tests() {
    log_info "Running E2E tests..."
    
    # Install Playwright browsers if needed
    npx playwright install
    
    # Run E2E tests
    npm run test:e2e || {
        log_warning "E2E tests failed - check if the application is running"
        return 1
    }
    
    log_success "E2E tests passed"
}

deploy_to_vercel() {
    log_info "Deploying to Vercel..."
    
    if ! command -v vercel &> /dev/null; then
        log_info "Installing Vercel CLI..."
        npm install -g vercel
    fi
    
    # Deploy
    vercel --prod || {
        log_error "Deployment to Vercel failed"
        exit 1
    }
    
    log_success "Deployed to Vercel successfully"
}

create_backup() {
    log_info "Creating backup..."
    
    timestamp=$(date +"%Y%m%d_%H%M%S")
    backup_name="${PROJECT_NAME}_backup_${timestamp}"
    
    mkdir -p "$BACKUP_DIR"
    
    # Create backup (excluding node_modules and other large directories)
    tar -czf "${BACKUP_DIR}/${backup_name}.tar.gz" \
        --exclude=node_modules \
        --exclude=.next \
        --exclude=.git \
        --exclude=dist \
        --exclude=coverage \
        --exclude=test-results \
        --exclude=playwright-report \
        . || {
        log_warning "Backup creation failed"
        return 1
    }
    
    log_success "Backup created: ${backup_name}.tar.gz"
}

cleanup_old_backups() {
    log_info "Cleaning up old backups..."
    
    # Keep only the last 5 backups
    if [ -d "$BACKUP_DIR" ]; then
        cd "$BACKUP_DIR"
        ls -t "${PROJECT_NAME}_backup_"*.tar.gz | tail -n +6 | xargs -r rm
        cd ..
    fi
    
    log_success "Backup cleanup completed"
}

validate_deployment() {
    log_info "Validating deployment..."
    
    # Here you would add deployment validation logic
    # For example, health checks, smoke tests, etc.
    
    log_success "Deployment validation passed"
}

# Main deployment flow
main() {
    log_info "Starting deployment process..."
    
    # Pre-deployment checks
    check_dependencies
    
    # Create backup
    create_backup
    cleanup_old_backups
    
    # Install dependencies
    log_info "Installing dependencies..."
    npm ci
    
    # Run tests
    run_tests
    
    # Build project
    build_project
    
    # Run E2E tests (optional, can be skipped in CI/CD)
    if [ "$SKIP_E2E" != "true" ]; then
        run_e2e_tests || log_warning "Skipping E2E tests due to failures"
    fi
    
    # Deploy
    if [ "$DEPLOY_TARGET" = "vercel" ] || [ -z "$DEPLOY_TARGET" ]; then
        deploy_to_vercel
    else
        log_error "Unknown deployment target: $DEPLOY_TARGET"
        exit 1
    fi
    
    # Validate deployment
    validate_deployment
    
    log_success "🎉 Deployment completed successfully!"
    log_info "Application should be available at your Vercel URL"
}

# Handle command line arguments
case "$1" in
    "build-only")
        check_dependencies
        build_project
        ;;
    "test-only")
        check_dependencies
        run_tests
        ;;
    "e2e-only")
        run_e2e_tests
        ;;
    *)
        main
        ;;
esac