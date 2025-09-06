#!/bin/bash
# GoREAL Project - Database Backup Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_NAME="goreal_db"
DB_USER="goreal_user"

# Set Docker Compose command
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
else
    DOCKER_COMPOSE="docker compose"
fi

echo "💾 GoREAL Database Backup Script"
echo "================================"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Check if PostgreSQL container is running
if ! $DOCKER_COMPOSE ps postgres | grep -q "Up"; then
    print_error "PostgreSQL container is not running. Please start it first with:"
    print_error "$DOCKER_COMPOSE up -d postgres"
    exit 1
fi

# Backup database
print_status "Creating database backup..."
backup_file="$BACKUP_DIR/goreal_db_backup_$TIMESTAMP.sql"

$DOCKER_COMPOSE exec -T postgres pg_dump -U $DB_USER -d $DB_NAME > "$backup_file"

if [ $? -eq 0 ]; then
    print_success "Database backup created: $backup_file"
    backup_size=$(du -h "$backup_file" | cut -f1)
    print_status "Backup size: $backup_size"
else
    print_error "Database backup failed"
    exit 1
fi

# Create compressed backup
print_status "Creating compressed backup..."
gzip -c "$backup_file" > "${backup_file}.gz"
compressed_size=$(du -h "${backup_file}.gz" | cut -f1)
print_success "Compressed backup created: ${backup_file}.gz (size: $compressed_size)"

# Clean up old backups (keep last 7 days)
print_status "Cleaning up old backups (keeping last 7 days)..."
find "$BACKUP_DIR" -name "goreal_db_backup_*.sql*" -mtime +7 -delete
cleanup_count=$(find "$BACKUP_DIR" -name "goreal_db_backup_*.sql*" | wc -l)
print_success "Cleanup completed. $cleanup_count backup files remaining."

# Backup data directory
if [ -d "./data" ]; then
    print_status "Backing up data directory..."
    data_backup="$BACKUP_DIR/data_backup_$TIMESTAMP.tar.gz"
    tar -czf "$data_backup" -C . data/
    data_backup_size=$(du -h "$data_backup" | cut -f1)
    print_success "Data directory backup created: $data_backup (size: $data_backup_size)"
fi

echo ""
echo "🎉 Backup completed successfully!"
echo ""
echo "📋 Backup Files Created:"
echo "========================"
echo "• SQL Backup:        $backup_file"
echo "• Compressed Backup: ${backup_file}.gz"
if [ -f "$data_backup" ]; then
    echo "• Data Directory:    $data_backup"
fi

echo ""
echo "📖 To restore from backup:"
echo "=========================="
echo "1. Stop the application: scripts/dev-stop.sh"
echo "2. Start only postgres: $DOCKER_COMPOSE up -d postgres"
echo "3. Restore database: $DOCKER_COMPOSE exec -T postgres psql -U $DB_USER -d $DB_NAME < $backup_file"
echo "4. Start application: scripts/dev-setup.sh"