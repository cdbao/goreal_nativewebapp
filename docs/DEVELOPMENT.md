# GoREAL Development Guide

This guide provides comprehensive information for developing and contributing to the GoREAL project.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Development Environment](#development-environment)
- [Project Structure](#project-structure)
- [Docker Setup](#docker-setup)
- [Database Management](#database-management)
- [API Development](#api-development)
- [Frontend Development](#frontend-development)
- [Testing](#testing)
- [Jupyter Notebooks](#jupyter-notebooks)
- [Debugging](#debugging)
- [Contributing](#contributing)

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Git
- Python 3.11+ (for local development)

### One-Command Setup
```bash
# Clone the repository
git clone <repository-url>
cd goreal-project

# Quick start with sample data
make quick-start
```

This will:
1. Build all Docker images
2. Start all services (API, Dashboard, Database, Jupyter)
3. Initialize the database with sample data
4. Generate test data for development

### Manual Setup
```bash
# Set up development environment
make setup

# Start all services
make start

# Generate sample data
make sample-data
```

## 🏗️ Development Environment

### Service Architecture

The development environment consists of:

| Service | Port | Description | URL |
|---------|------|-------------|-----|
| **API** | 5000 | Flask API server | http://localhost:5000 |
| **Dashboard** | 8501 | Streamlit admin dashboard | http://localhost:8501 |
| **Database** | 5432 | PostgreSQL database | localhost:5432 |
| **Redis** | 6379 | Cache and session store | localhost:6379 |
| **Jupyter** | 8888 | Jupyter Lab environment | http://localhost:8888 |
| **PgAdmin** | 5050 | Database admin interface | http://localhost:5050 |
| **Redis Commander** | 8081 | Redis management UI | http://localhost:8081 |

### Environment Variables

Copy the example environment file and customize:
```bash
cp .env.example .env
# Edit .env with your preferred settings
```

Key environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `FLASK_DEBUG`: Enable Flask debug mode
- `GOOGLE_CREDENTIALS_FILE`: Google Sheets API credentials

## 📁 Project Structure

```
goreal-project/
├── goreal/                 # Main Python package
│   ├── api/               # Flask API components
│   ├── dashboard/         # Streamlit dashboard
│   ├── core/             # Core business logic
│   └── config/           # Configuration management
├── database/             # Database scripts and migrations
│   ├── init/            # Database initialization scripts
│   └── migrations/      # Database migration scripts
├── notebooks/           # Jupyter notebooks
│   ├── data_analysis/   # Data analysis notebooks
│   ├── api_testing/     # API testing notebooks
│   └── development/     # Development notebooks
├── scripts/            # Development and utility scripts
├── tests/              # Test suite
├── docs/               # Documentation
└── docker-compose.yml  # Docker services configuration
```

## 🐳 Docker Setup

### Development Services

Start all development services:
```bash
# Full development stack
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Or use the shortcut
make start
```

### Individual Services

Start specific services:
```bash
# Database only
docker-compose up -d postgres

# API only (requires database)
docker-compose up -d postgres redis api

# Dashboard only (requires database)
docker-compose up -d postgres dashboard
```

### Building Images

Rebuild Docker images after code changes:
```bash
# Rebuild all images
make build

# Rebuild specific service
docker-compose build api
```

## 🗄️ Database Management

### Database Access

Connect to the database:
```bash
# Using make shortcut
make db-shell

# Direct connection
docker-compose exec postgres psql -U goreal_user -d goreal_db
```

### Sample Data

Generate realistic sample data:
```bash
# Generate default sample data
make sample-data

# Generate custom amount of data
python3 scripts/generate-sample-data.py --players 50 --challenges 8
```

### Database Reset

Reset the database to a clean state:
```bash
make db-reset
```

### Backups

Create database backups:
```bash
# Create backup
make backup

# Backup files are stored in ./backups/
```

## 🔌 API Development

### Running the API

The API runs automatically in the Docker environment. For local development:

```bash
# In Docker (recommended)
docker-compose up -d api

# Local development
cd goreal-project
python -m goreal.api.app
```

### API Testing

Test the API endpoints:
```bash
# Quick API test
make test

# Comprehensive testing in Jupyter
# Open http://localhost:8888
# Navigate to notebooks/api_testing/api_testing_suite.ipynb
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/log_challenge` | Log a new challenge |
| POST | `/submit_challenge` | Submit challenge proof |
| GET | `/get_status` | Get challenge status |
| GET | `/get_challenges` | Get available challenges |

### Adding New Endpoints

1. Define the route in `goreal/api/routes.py`
2. Add validation in `goreal/core/validators.py`
3. Add database operations in `goreal/core/database.py`
4. Write tests in `tests/`
5. Update API documentation

## 📊 Frontend Development

### Dashboard Development

The Streamlit dashboard auto-reloads on file changes:

```bash
# Dashboard runs on http://localhost:8501
# Edit files in goreal/dashboard/
```

### Dashboard Components

- `app.py`: Main dashboard application
- `components.py`: Reusable UI components
- `data_handlers.py`: Data fetching and processing

### Customizing the Dashboard

1. Edit layout in `dashboard/app.py`
2. Add new components in `dashboard/components.py`
3. Implement data processing in `dashboard/data_handlers.py`
4. Test changes at http://localhost:8501

## 🧪 Testing

### Running Tests

```bash
# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ -v --cov=goreal --cov-report=html

# Run specific test file
pytest tests/test_validators.py -v
```

### API Testing

```bash
# Quick API health check
curl http://localhost:5000/health

# Run comprehensive API tests
make test

# Interactive testing in Jupyter
# notebooks/api_testing/api_testing_suite.ipynb
```

### Adding Tests

1. Create test files in `tests/` directory
2. Follow naming convention: `test_*.py`
3. Use pytest fixtures for setup
4. Include both unit and integration tests

## 📓 Jupyter Notebooks

### Accessing Jupyter

```bash
# Open Jupyter Lab
make jupyter

# Or navigate directly to:
http://localhost:8888
```

### Available Notebooks

1. **Data Analysis** (`notebooks/data_analysis/`)
   - Player analytics and insights
   - Challenge completion analysis
   - Performance metrics

2. **API Testing** (`notebooks/api_testing/`)
   - Comprehensive API endpoint testing
   - Load testing and performance analysis
   - Error handling validation

3. **Development** (`notebooks/development/`)
   - Database exploration
   - Data visualization experiments
   - Feature development prototypes

### Creating New Notebooks

1. Save notebooks in appropriate category folder
2. Include clear documentation and explanations
3. Use meaningful names and organize code cells
4. Add sample data and expected outputs

## 🐛 Debugging

### Service Logs

View service logs:
```bash
# All services
make logs

# Specific service
make logs-api
make logs-db

# Follow logs in real-time
docker-compose logs -f api
```

### Database Debugging

```bash
# Connect to database
make db-shell

# View table contents
\dt                           # List tables
SELECT * FROM players LIMIT 5;  # View data
```

### API Debugging

1. Enable Flask debug mode in `.env`
2. Check API logs: `make logs-api`
3. Test endpoints with curl or Jupyter notebooks
4. Use debugger in IDE with local development

### Common Issues

**API not responding:**
- Check if services are running: `make status`
- View API logs: `make logs-api`
- Verify database connection

**Database connection errors:**
- Ensure PostgreSQL is running: `docker-compose ps postgres`
- Check database logs: `make logs-db`
- Verify credentials in `.env`

**Google Sheets integration issues:**
- Ensure credentials file exists: `goreal-470006-ac9c0ea86e0c.json`
- Check file permissions and format
- Verify Google Sheets API is enabled

## 🤝 Contributing

### Development Workflow

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/goreal-project.git
   cd goreal-project
   ```

2. **Set Up Development Environment**
   ```bash
   make setup
   ```

3. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

4. **Make Changes**
   - Write code following project conventions
   - Add tests for new functionality
   - Update documentation as needed

5. **Test Your Changes**
   ```bash
   make test
   python -m pytest tests/ -v
   ```

6. **Submit Pull Request**
   - Push changes to your fork
   - Create pull request with clear description
   - Include test results and documentation updates

### Code Style

- Follow PEP 8 for Python code
- Use type hints where appropriate
- Write clear docstrings for functions and classes
- Keep functions focused and modular

### Git Workflow

- Use descriptive commit messages
- Keep commits focused on single changes
- Reference issues in commit messages when applicable
- Squash commits before merging when appropriate

## 📚 Additional Resources

- [API Documentation](API.md)
- [Database Schema](DATABASE.md)
- [Deployment Guide](DEPLOYMENT.md)
- [Troubleshooting Guide](TROUBLESHOOTING.md)

## 🆘 Getting Help

- **Issues**: Create GitHub issues for bugs and feature requests
- **Discussions**: Use GitHub discussions for questions
- **Documentation**: Check the `docs/` directory
- **Code Examples**: Explore Jupyter notebooks for examples

---

Happy coding! 🎮