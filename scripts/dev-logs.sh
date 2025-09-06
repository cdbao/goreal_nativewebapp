#!/bin/bash
# GoREAL Project - View Development Logs Script

# Colors for output
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Set Docker Compose command
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
else
    DOCKER_COMPOSE="docker compose"
fi

# Default service to show logs for
SERVICE=${1:-""}

if [ -z "$SERVICE" ]; then
    echo "📋 Available services:"
    echo "====================="
    $DOCKER_COMPOSE -f docker-compose.yml -f docker-compose.dev.yml ps --services
    echo ""
    echo "Usage: $0 [service_name]"
    echo "       $0 api        # Show API logs"
    echo "       $0 dashboard  # Show dashboard logs" 
    echo "       $0 postgres   # Show database logs"
    echo "       $0 jupyter    # Show Jupyter logs"
    echo ""
    echo "Or view all logs:"
    $DOCKER_COMPOSE -f docker-compose.yml -f docker-compose.dev.yml logs --tail=50 -f
else
    print_status "Showing logs for service: $SERVICE"
    $DOCKER_COMPOSE -f docker-compose.yml -f docker-compose.dev.yml logs --tail=50 -f $SERVICE
fi