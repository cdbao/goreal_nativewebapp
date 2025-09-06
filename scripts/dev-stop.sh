#!/bin/bash
# GoREAL Project - Stop Development Environment Script

set -e

echo "🛑 Stopping GoREAL Development Environment..."

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

# Set Docker Compose command
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
else
    DOCKER_COMPOSE="docker compose"
fi

# Stop all services
print_status "Stopping all development services..."
$DOCKER_COMPOSE -f docker-compose.yml -f docker-compose.dev.yml down

# Option to remove volumes (data persistence)
if [ "$1" = "--remove-data" ] || [ "$1" = "-r" ]; then
    print_status "Removing volumes and data..."
    $DOCKER_COMPOSE -f docker-compose.yml -f docker-compose.dev.yml down -v
    print_success "All services stopped and data removed"
else
    print_success "All services stopped (data preserved)"
    echo ""
    echo "💡 To remove all data as well, run: $0 --remove-data"
fi

echo ""
echo "🧹 Clean up completed!"