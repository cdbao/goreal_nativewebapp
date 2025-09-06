#!/bin/bash
# GoREAL Project - Development Environment Setup Script

set -e

echo "🚀 Setting up GoREAL Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
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

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Set Docker Compose command
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
else
    DOCKER_COMPOSE="docker compose"
fi

print_status "Using Docker Compose command: $DOCKER_COMPOSE"

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p data logs notebooks/{data_analysis,api_testing,development}
print_success "Directories created"

# Check if credentials file exists
if [ ! -f "goreal-470006-ac9c0ea86e0c.json" ]; then
    print_warning "Google credentials file not found!"
    print_warning "Please place your Google Service Account credentials file as 'goreal-470006-ac9c0ea86e0c.json'"
    print_warning "You can continue setup, but Google Sheets integration won't work without credentials."
fi

# Build Docker images
print_status "Building Docker images..."
$DOCKER_COMPOSE build
print_success "Docker images built successfully"

# Start the development environment
print_status "Starting development services..."
$DOCKER_COMPOSE -f docker-compose.yml -f docker-compose.dev.yml up -d postgres redis

# Wait for database to be ready
print_status "Waiting for database to be ready..."
sleep 10

# Check if database is ready
max_attempts=30
attempt=1
while [ $attempt -le $max_attempts ]; do
    if $DOCKER_COMPOSE exec postgres pg_isready -U goreal_user -d goreal_db >/dev/null 2>&1; then
        print_success "Database is ready!"
        break
    fi
    
    if [ $attempt -eq $max_attempts ]; then
        print_error "Database failed to start after $max_attempts attempts"
        exit 1
    fi
    
    print_status "Waiting for database... (attempt $attempt/$max_attempts)"
    sleep 2
    ((attempt++))
done

# Start all services
print_status "Starting all development services..."
$DOCKER_COMPOSE -f docker-compose.yml -f docker-compose.dev.yml up -d
print_success "All services started!"

# Show service status
echo ""
echo "📋 Service Status:"
echo "==================="
$DOCKER_COMPOSE -f docker-compose.yml -f docker-compose.dev.yml ps

echo ""
echo "🌐 Access URLs:"
echo "==============="
echo "• API Server:        http://localhost:5000"
echo "• Dashboard:         http://localhost:8501"
echo "• Jupyter Lab:       http://localhost:8888"
echo "• PgAdmin:          http://localhost:5050"
echo "• Redis Commander:   http://localhost:8081"

echo ""
echo "📊 Database Access:"
echo "==================="
echo "• Host: localhost:5432"
echo "• Database: goreal_db"
echo "• Username: goreal_user"
echo "• Password: goreal_password"

echo ""
echo "🎉 Development environment is ready!"
echo ""
echo "Next steps:"
echo "1. Open Jupyter Lab at http://localhost:8888 to explore notebooks"
echo "2. Test the API at http://localhost:5000/health"
echo "3. Access the dashboard at http://localhost:8501"
echo "4. Use 'scripts/dev-stop.sh' to stop all services"
echo "5. Use 'scripts/dev-logs.sh' to view service logs"