# GoREAL Project - Development Makefile

.PHONY: help setup start stop logs test clean backup sample-data build

# Default target
help:
	@echo "🎮 GoREAL Project - Development Commands"
	@echo "========================================"
	@echo ""
	@echo "Setup Commands:"
	@echo "  make setup        - Set up development environment"
	@echo "  make build        - Build Docker images"
	@echo ""
	@echo "Control Commands:"
	@echo "  make start        - Start all services"
	@echo "  make stop         - Stop all services"
	@echo "  make restart      - Restart all services"
	@echo "  make logs         - View all service logs"
	@echo "  make logs-api     - View API service logs"
	@echo "  make logs-db      - View database logs"
	@echo ""
	@echo "Development Commands:"
	@echo "  make test         - Run API tests"
	@echo "  make sample-data  - Generate sample data"
	@echo "  make backup       - Backup database"
	@echo "  make jupyter      - Open Jupyter Lab"
	@echo ""
	@echo "Maintenance Commands:"
	@echo "  make clean        - Clean up containers and volumes"
	@echo "  make reset        - Full reset (clean + setup)"
	@echo ""
	@echo "Access URLs:"
	@echo "  API:          http://localhost:5000"
	@echo "  Dashboard:    http://localhost:8501"  
	@echo "  Jupyter:      http://localhost:8888"
	@echo "  PgAdmin:      http://localhost:5050"

# Setup development environment
setup:
	@echo "🚀 Setting up GoREAL development environment..."
	@chmod +x scripts/*.sh
	@./scripts/dev-setup.sh

# Build Docker images
build:
	@echo "🔨 Building Docker images..."
	@docker-compose build

# Start all services
start:
	@echo "▶️  Starting GoREAL services..."
	@docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
	@echo "✅ Services started! Check status with: make status"

# Stop all services
stop:
	@echo "⏹️  Stopping GoREAL services..."
	@./scripts/dev-stop.sh

# Restart services
restart: stop start

# View service status
status:
	@echo "📊 GoREAL Services Status:"
	@docker-compose -f docker-compose.yml -f docker-compose.dev.yml ps

# View all logs
logs:
	@docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=50 -f

# View API logs
logs-api:
	@docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=50 -f api

# View database logs  
logs-db:
	@docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=50 -f postgres

# Run API tests
test:
	@echo "🧪 Running API tests..."
	@chmod +x scripts/test-api.sh
	@./scripts/test-api.sh

# Generate sample data
sample-data:
	@echo "📊 Generating sample data..."
	@python3 scripts/generate-sample-data.py

# Backup database
backup:
	@echo "💾 Creating database backup..."
	@chmod +x scripts/backup-data.sh
	@./scripts/backup-data.sh

# Open Jupyter Lab
jupyter:
	@echo "📓 Opening Jupyter Lab..."
	@xdg-open http://localhost:8888 2>/dev/null || open http://localhost:8888 2>/dev/null || echo "Open http://localhost:8888 in your browser"

# Clean up containers and volumes
clean:
	@echo "🧹 Cleaning up Docker containers and volumes..."
	@docker-compose -f docker-compose.yml -f docker-compose.dev.yml down -v --remove-orphans
	@docker system prune -f
	@echo "✅ Cleanup completed"

# Full reset
reset: clean setup

# Development shortcuts
dev: start
down: stop

# Database shortcuts
db-shell:
	@docker-compose exec postgres psql -U goreal_user -d goreal_db

db-reset:
	@echo "⚠️  Resetting database..."
	@docker-compose stop postgres
	@docker-compose rm -f postgres
	@docker volume rm goreal-project_postgres_data 2>/dev/null || true
	@docker-compose up -d postgres
	@sleep 10
	@echo "✅ Database reset completed"

# Quick development workflow
quick-start: build start sample-data
	@echo "🎉 Quick start completed! Services are ready."
	@echo "• API: http://localhost:5000/health"
	@echo "• Dashboard: http://localhost:8501"
	@echo "• Jupyter: http://localhost:8888"