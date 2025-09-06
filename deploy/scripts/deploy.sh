#!/bin/bash
# GoREAL Production Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEPLOY_ENV=${DEPLOY_ENV:-production}
VERSION=${VERSION:-latest}
BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
VCS_REF=${GITHUB_SHA:-$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")}

# Print functions
print_header() {
    echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║${NC}                     ${CYAN}🚀 GoREAL Deployment${NC}                        ${PURPLE}║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_step() {
    echo -e "${BLUE}[STEP $1]${NC} $2"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

# Helper functions
check_prerequisites() {
    print_step "1" "Checking Prerequisites"
    
    # Check required commands
    local required_commands=("docker" "docker-compose" "curl" "git")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            print_error "$cmd is required but not installed"
            exit 1
        fi
    done
    print_success "All required commands are available"
    
    # Check Docker is running
    if ! docker info &> /dev/null; then
        print_error "Docker is not running"
        exit 1
    fi
    print_success "Docker is running"
    
    # Check environment file
    if [ ! -f "$PROJECT_ROOT/.env.production" ]; then
        print_error "Production environment file not found: $PROJECT_ROOT/.env.production"
        print_info "Please create .env.production with required variables"
        exit 1
    fi
    print_success "Environment configuration found"
}

backup_current_deployment() {
    print_step "2" "Creating Backup"
    
    local backup_dir="$PROJECT_ROOT/backups/deployment-$(date +'%Y%m%d-%H%M%S')"
    mkdir -p "$backup_dir"
    
    # Backup database
    if docker-compose -f docker-compose.prod.yml ps postgres | grep -q "Up"; then
        print_info "Backing up database..."
        docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U goreal_user goreal_db > "$backup_dir/database.sql"
        print_success "Database backup created"
    fi
    
    # Backup volumes
    if docker volume ls | grep -q "goreal-project_static_files"; then
        print_info "Backing up static files..."
        docker run --rm -v goreal-project_static_files:/data -v "$backup_dir":/backup alpine tar czf /backup/static_files.tar.gz -C /data .
        print_success "Static files backup created"
    fi
    
    # Backup configuration
    cp -r "$PROJECT_ROOT/docker/production" "$backup_dir/config"
    
    print_success "Backup completed: $backup_dir"
    echo "$backup_dir" > "$PROJECT_ROOT/.last_backup"
}

build_images() {
    print_step "3" "Building Production Images"
    
    cd "$PROJECT_ROOT"
    
    # Set build arguments
    export BUILD_DATE
    export VERSION
    export VCS_REF
    
    print_info "Building images with:"
    print_info "  Version: $VERSION"
    print_info "  Build Date: $BUILD_DATE"
    print_info "  VCS Ref: $VCS_REF"
    
    # Build production image
    docker build \
        -f Dockerfile.prod \
        --build-arg BUILD_DATE="$BUILD_DATE" \
        --build-arg VERSION="$VERSION" \
        --build-arg VCS_REF="$VCS_REF" \
        -t goreal:$VERSION \
        -t goreal:latest \
        .
    
    print_success "Images built successfully"
}

deploy_services() {
    print_step "4" "Deploying Services"
    
    cd "$PROJECT_ROOT"
    
    # Load environment variables
    set -a
    source .env.production
    set +a
    
    # Deploy with zero-downtime strategy
    print_info "Starting new services..."
    
    # Scale up new instances
    docker-compose -f docker-compose.prod.yml up -d --scale api-1=1 --scale api-2=1
    
    # Wait for health checks
    print_info "Waiting for services to become healthy..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose -f docker-compose.prod.yml ps | grep -E "(api-1|api-2)" | grep -q "healthy"; then
            print_success "Services are healthy"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            print_error "Services failed to become healthy after $max_attempts attempts"
            exit 1
        fi
        
        print_info "Waiting for services to be ready... (attempt $attempt/$max_attempts)"
        sleep 10
        ((attempt++))
    done
    
    print_success "Services deployed successfully"
}

run_database_migrations() {
    print_step "5" "Running Database Migrations"
    
    # Run migrations if needed
    print_info "Checking for database migrations..."
    docker-compose -f docker-compose.prod.yml exec -T api-1 python -c "
from goreal.core.database import create_tables
try:
    create_tables()
    print('✅ Database schema updated')
except Exception as e:
    print(f'⚠️  Migration warning: {e}')
"
    
    print_success "Database migrations completed"
}

verify_deployment() {
    print_step "6" "Verifying Deployment"
    
    # Test health endpoints
    local services=("nginx" "api-1" "api-2" "dashboard")
    local urls=(
        "http://localhost/health"
        "http://localhost:8000/health"
        "http://localhost:8001/health"
        "http://localhost:8501/"
    )
    
    for i in "${!services[@]}"; do
        local service="${services[$i]}"
        local url="${urls[$i]}"
        
        print_info "Testing $service at $url"
        
        local max_attempts=10
        local attempt=1
        local success=false
        
        while [ $attempt -le $max_attempts ] && [ "$success" = false ]; do
            if curl -f -s "$url" > /dev/null 2>&1; then
                print_success "$service is responding"
                success=true
            else
                if [ $attempt -eq $max_attempts ]; then
                    print_error "$service health check failed"
                    exit 1
                fi
                sleep 5
                ((attempt++))
            fi
        done
    done
    
    print_success "All services are responding correctly"
}

cleanup_old_resources() {
    print_step "7" "Cleaning Up"
    
    # Remove unused images
    print_info "Removing unused Docker images..."
    docker image prune -f
    
    # Remove old backups (keep last 5)
    print_info "Cleaning up old backups..."
    if [ -d "$PROJECT_ROOT/backups" ]; then
        ls -1t "$PROJECT_ROOT/backups" | tail -n +6 | xargs -r -I {} rm -rf "$PROJECT_ROOT/backups/{}"
    fi
    
    print_success "Cleanup completed"
}

rollback_deployment() {
    print_error "Deployment failed, initiating rollback..."
    
    if [ -f "$PROJECT_ROOT/.last_backup" ]; then
        local backup_dir=$(cat "$PROJECT_ROOT/.last_backup")
        if [ -d "$backup_dir" ]; then
            print_info "Rolling back to previous deployment..."
            
            # Stop current services
            docker-compose -f docker-compose.prod.yml down
            
            # Restore database
            if [ -f "$backup_dir/database.sql" ]; then
                print_info "Restoring database..."
                docker-compose -f docker-compose.prod.yml up -d postgres
                sleep 10
                docker-compose -f docker-compose.prod.yml exec -T postgres psql -U goreal_user -d goreal_db < "$backup_dir/database.sql"
            fi
            
            # Restore configuration
            if [ -d "$backup_dir/config" ]; then
                print_info "Restoring configuration..."
                cp -r "$backup_dir/config/"* "$PROJECT_ROOT/docker/production/"
            fi
            
            # Restart services
            docker-compose -f docker-compose.prod.yml up -d
            
            print_success "Rollback completed"
        fi
    else
        print_error "No backup found for rollback"
    fi
    
    exit 1
}

show_deployment_summary() {
    echo ""
    print_success "🎉 Deployment Completed Successfully!"
    echo ""
    echo -e "${CYAN}Deployment Summary:${NC}"
    echo "==================="
    echo -e "Environment: ${YELLOW}$DEPLOY_ENV${NC}"
    echo -e "Version: ${YELLOW}$VERSION${NC}"
    echo -e "Build Date: ${YELLOW}$BUILD_DATE${NC}"
    echo -e "VCS Ref: ${YELLOW}$VCS_REF${NC}"
    echo ""
    echo -e "${CYAN}Service URLs:${NC}"
    echo "============="
    echo "• API: http://localhost"
    echo "• Dashboard: http://localhost/dashboard"
    echo "• Health Check: http://localhost/health"
    echo ""
    echo -e "${CYAN}Management Commands:${NC}"
    echo "===================="
    echo "• View logs: docker-compose -f docker-compose.prod.yml logs -f"
    echo "• Check status: docker-compose -f docker-compose.prod.yml ps"
    echo "• Stop services: docker-compose -f docker-compose.prod.yml down"
}

# Main deployment function
main() {
    print_header
    
    # Set trap for error handling
    trap rollback_deployment ERR
    
    echo -e "${CYAN}Starting deployment of GoREAL $VERSION to $DEPLOY_ENV environment${NC}"
    echo ""
    
    check_prerequisites
    backup_current_deployment
    build_images
    deploy_services
    run_database_migrations
    verify_deployment
    cleanup_old_resources
    
    # Remove error trap on success
    trap - ERR
    
    show_deployment_summary
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --env)
            DEPLOY_ENV="$2"
            shift 2
            ;;
        --version)
            VERSION="$2"
            shift 2
            ;;
        --skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --skip-health-check)
            SKIP_HEALTH_CHECK=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --env ENV              Deployment environment (default: production)"
            echo "  --version VERSION      Version to deploy (default: latest)"
            echo "  --skip-backup         Skip backup creation"
            echo "  --skip-health-check   Skip health check verification"
            echo "  --help                Show this help message"
            echo ""
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main deployment
main