#!/bin/bash
# GoREAL Production Rollback Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

print_header() {
    echo -e "${RED}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║${NC}                     ${CYAN}↩️  GoREAL Rollback${NC}                         ${RED}║${NC}"
    echo -e "${RED}╚══════════════════════════════════════════════════════════════════╝${NC}"
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

list_backups() {
    print_info "Available backups:"
    if [ -d "$PROJECT_ROOT/backups" ]; then
        local backups=($(ls -1t "$PROJECT_ROOT/backups" | grep "deployment-"))
        if [ ${#backups[@]} -eq 0 ]; then
            print_warning "No deployment backups found"
            return 1
        fi
        
        for i in "${!backups[@]}"; do
            local backup="${backups[$i]}"
            local backup_path="$PROJECT_ROOT/backups/$backup"
            local backup_date=$(echo "$backup" | sed 's/deployment-//' | sed 's/-/ /')
            
            echo "  [$((i+1))] $backup_date"
            
            # Show backup contents
            if [ -f "$backup_path/database.sql" ]; then
                echo "      ✅ Database backup"
            fi
            if [ -f "$backup_path/static_files.tar.gz" ]; then
                echo "      ✅ Static files backup"
            fi
            if [ -d "$backup_path/config" ]; then
                echo "      ✅ Configuration backup"
            fi
            echo ""
        done
        
        return 0
    else
        print_warning "Backups directory not found"
        return 1
    fi
}

select_backup() {
    local backup_name="$1"
    
    if [ -n "$backup_name" ]; then
        # Backup specified via command line
        SELECTED_BACKUP="$PROJECT_ROOT/backups/$backup_name"
        if [ ! -d "$SELECTED_BACKUP" ]; then
            print_error "Backup not found: $backup_name"
            exit 1
        fi
    else
        # Interactive selection
        if ! list_backups; then
            exit 1
        fi
        
        read -p "Select backup number (or 'q' to quit): " selection
        
        if [ "$selection" = "q" ]; then
            print_info "Rollback cancelled"
            exit 0
        fi
        
        local backups=($(ls -1t "$PROJECT_ROOT/backups" | grep "deployment-"))
        local index=$((selection-1))
        
        if [ $index -lt 0 ] || [ $index -ge ${#backups[@]} ]; then
            print_error "Invalid selection"
            exit 1
        fi
        
        SELECTED_BACKUP="$PROJECT_ROOT/backups/${backups[$index]}"
    fi
    
    print_info "Selected backup: $(basename "$SELECTED_BACKUP")"
}

confirm_rollback() {
    echo ""
    print_warning "⚠️  ROLLBACK CONFIRMATION ⚠️"
    echo ""
    echo "This will:"
    echo "1. Stop current GoREAL services"
    echo "2. Restore database from backup"
    echo "3. Restore configuration files"
    echo "4. Restart services with previous version"
    echo ""
    print_warning "Current data may be lost!"
    echo ""
    
    if [ "$FORCE_ROLLBACK" != "true" ]; then
        read -p "Are you sure you want to proceed? (yes/no): " confirmation
        
        if [ "$confirmation" != "yes" ]; then
            print_info "Rollback cancelled"
            exit 0
        fi
    fi
}

stop_current_services() {
    print_step "1" "Stopping Current Services"
    
    cd "$PROJECT_ROOT"
    
    print_info "Stopping all services..."
    docker-compose -f docker-compose.prod.yml down
    
    print_success "Services stopped"
}

restore_database() {
    print_step "2" "Restoring Database"
    
    local db_backup="$SELECTED_BACKUP/database.sql"
    
    if [ -f "$db_backup" ]; then
        print_info "Starting database container..."
        docker-compose -f docker-compose.prod.yml up -d postgres
        
        # Wait for database to be ready
        print_info "Waiting for database to be ready..."
        local max_attempts=30
        local attempt=1
        
        while [ $attempt -le $max_attempts ]; do
            if docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U goreal_user -d goreal_db >/dev/null 2>&1; then
                break
            fi
            
            if [ $attempt -eq $max_attempts ]; then
                print_error "Database failed to start"
                exit 1
            fi
            
            sleep 2
            ((attempt++))
        done
        
        print_info "Restoring database from backup..."
        docker-compose -f docker-compose.prod.yml exec -T postgres psql -U goreal_user -d goreal_db < "$db_backup"
        
        print_success "Database restored successfully"
    else
        print_warning "No database backup found, skipping database restore"
    fi
}

restore_static_files() {
    print_step "3" "Restoring Static Files"
    
    local static_backup="$SELECTED_BACKUP/static_files.tar.gz"
    
    if [ -f "$static_backup" ]; then
        print_info "Restoring static files..."
        docker run --rm -v goreal-project_static_files:/data -v "$SELECTED_BACKUP":/backup alpine \
            tar xzf /backup/static_files.tar.gz -C /data
        
        print_success "Static files restored"
    else
        print_warning "No static files backup found, skipping static files restore"
    fi
}

restore_configuration() {
    print_step "4" "Restoring Configuration"
    
    local config_backup="$SELECTED_BACKUP/config"
    
    if [ -d "$config_backup" ]; then
        print_info "Restoring configuration files..."
        
        # Backup current config
        if [ -d "$PROJECT_ROOT/docker/production" ]; then
            mv "$PROJECT_ROOT/docker/production" "$PROJECT_ROOT/docker/production.rollback-backup"
        fi
        
        # Restore from backup
        cp -r "$config_backup" "$PROJECT_ROOT/docker/production"
        
        print_success "Configuration restored"
    else
        print_warning "No configuration backup found, keeping current configuration"
    fi
}

restart_services() {
    print_step "5" "Restarting Services"
    
    cd "$PROJECT_ROOT"
    
    # Load environment variables
    if [ -f ".env.production" ]; then
        set -a
        source .env.production
        set +a
    fi
    
    print_info "Starting services with restored configuration..."
    docker-compose -f docker-compose.prod.yml up -d
    
    # Wait for services to be healthy
    print_info "Waiting for services to become healthy..."
    local max_attempts=20
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        local healthy_count=$(docker-compose -f docker-compose.prod.yml ps | grep "healthy" | wc -l)
        
        if [ $healthy_count -ge 2 ]; then  # At least API services healthy
            print_success "Services are healthy"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            print_warning "Some services may not be fully healthy yet"
            break
        fi
        
        print_info "Waiting for services... (attempt $attempt/$max_attempts)"
        sleep 10
        ((attempt++))
    done
    
    print_success "Services restarted"
}

verify_rollback() {
    print_step "6" "Verifying Rollback"
    
    # Test basic connectivity
    print_info "Testing service endpoints..."
    
    local endpoints=(
        "http://localhost/health"
        "http://localhost:8501/"
    )
    
    local success=true
    for endpoint in "${endpoints[@]}"; do
        print_info "Testing $endpoint..."
        if curl -f -s "$endpoint" > /dev/null 2>&1; then
            print_success "✅ $endpoint is responding"
        else
            print_warning "⚠️  $endpoint is not responding"
            success=false
        fi
    done
    
    if [ "$success" = true ]; then
        print_success "Rollback verification completed successfully"
    else
        print_warning "Some services may still be starting up"
    fi
}

create_rollback_log() {
    local log_file="$PROJECT_ROOT/rollback.log"
    local timestamp=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
    
    echo "[$timestamp] Rollback to $(basename "$SELECTED_BACKUP") completed" >> "$log_file"
    print_info "Rollback logged to: $log_file"
}

show_rollback_summary() {
    echo ""
    print_success "🔄 Rollback Completed!"
    echo ""
    echo -e "${CYAN}Rollback Summary:${NC}"
    echo "=================="
    echo -e "Restored from: ${YELLOW}$(basename "$SELECTED_BACKUP")${NC}"
    echo -e "Rollback time: ${YELLOW}$(date)${NC}"
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
}

main() {
    print_header
    
    local backup_name="$1"
    
    print_info "Initiating rollback process..."
    
    select_backup "$backup_name"
    confirm_rollback
    stop_current_services
    restore_database
    restore_static_files  
    restore_configuration
    restart_services
    verify_rollback
    create_rollback_log
    
    show_rollback_summary
}

# Parse command line arguments
FORCE_ROLLBACK=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --force)
            FORCE_ROLLBACK=true
            shift
            ;;
        --list)
            list_backups
            exit 0
            ;;
        --help)
            echo "Usage: $0 [BACKUP_NAME] [OPTIONS]"
            echo ""
            echo "Arguments:"
            echo "  BACKUP_NAME           Specific backup to restore (optional)"
            echo ""
            echo "Options:"
            echo "  --force              Skip confirmation prompt"
            echo "  --list               List available backups and exit"
            echo "  --help               Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                                    # Interactive backup selection"
            echo "  $0 deployment-20231201-143022        # Restore specific backup"
            echo "  $0 --list                            # List available backups"
            echo ""
            exit 0
            ;;
        -*)
            print_error "Unknown option: $1"
            exit 1
            ;;
        *)
            BACKUP_NAME="$1"
            shift
            ;;
    esac
done

# Run main rollback process
main "$BACKUP_NAME"