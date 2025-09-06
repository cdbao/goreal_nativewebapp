# GoREAL Template System - Quick Start Guide

Get started with the GoREAL template system in minutes! This guide covers the essentials for creating your first project.

## 🚀 Create Your First Project

### Step 1: Choose a Template

List available templates:

```bash
./scripts/project-cli.sh list
```

Output:
```
📋 Available Templates:

🏷️  flask-api
   Flask API Project
   A production-ready Flask API project template with authentication, database integration, and comprehensive tooling
   Tags: flask, api, python, production, docker

🏷️  streamlit-dashboard  
   Streamlit Dashboard Project
   A modern Streamlit dashboard template with authentication, data visualization, and deployment configuration
   Tags: streamlit, dashboard, python, data-visualization, analytics

🏷️  fullstack
   Full-Stack Application
   Complete full-stack application template with Flask API backend, Streamlit frontend, and production deployment
   Tags: fullstack, flask, streamlit, docker, production
```

### Step 2: Create Project Interactively

```bash
./scripts/project-cli.sh create
```

Follow the interactive prompts:

```
📋 Available Templates:
1. Flask API Project (flask-api)
   A production-ready Flask API project template
2. Streamlit Dashboard Project (streamlit-dashboard)
   A modern Streamlit dashboard template
3. Full-Stack Application (fullstack)
   Complete full-stack application template

Select template (1-3): 1

📝 Configuration for Flask API Project
==================================================
Project name (e.g., my-api-project): awesome-api
Human-readable project title [Awesome Api]: Awesome API
Brief project description: My awesome API project
Author name [Your Name]: John Doe
Contact email (e.g., you@example.com): john@example.com
GitHub username: johndoe
Database type (postgresql/mysql/sqlite) [postgresql]: postgresql
Include Redis for caching (y/n) [y]: y
Include JWT authentication (y/n) [y]: y
```

### Step 3: Project Created! 🎉

```
🚀 Creating project from 'Flask API Project' template...
✅ Git repository initialized

🎉 Project 'awesome-api' created successfully!
📂 Location: /path/to/awesome-api

📋 Next Steps:
==============================
1. Review and update the .env file with your specific configuration
2. Install dependencies:
   pip install -r requirements.txt
   pip install -r requirements-dev.txt
3. Start with Docker: docker-compose up -d

📚 Documentation: /path/to/awesome-api/README.md
```

## 📁 What You Get

Your new project includes:

```
awesome-api/
├── awesome_api/               # Main application package
│   ├── api/                  # Flask API
│   ├── core/                 # Core functionality
│   ├── models/               # Data models
│   └── utils/                # Utilities
├── tests/                    # Test suite
├── docs/                     # Documentation
├── docker/                   # Docker configs
├── scripts/                  # Development scripts
├── requirements.txt          # Dependencies
├── requirements-dev.txt      # Dev dependencies
├── pyproject.toml           # Project config
├── docker-compose.yml       # Docker services
├── .env.example             # Environment template
├── .gitignore              # Git ignore rules
└── README.md               # Project README
```

## 🔧 Quick Setup

### Option 1: Docker (Recommended)

```bash
cd awesome-api

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

Your API will be available at:
- **API**: http://localhost:8000
- **Health Check**: http://localhost:8000/health

### Option 2: Local Development

```bash
cd awesome-api

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements-dev.txt

# Set up environment
cp .env.example .env
# Edit .env with your settings

# Run database migrations
python -c "from awesome_api.core.database import create_tables; create_tables()"

# Start development server
flask --app awesome_api.api.app:create_app() run --debug
```

## 🧪 Test Your Project

```bash
# Run tests
pytest

# Run with coverage
pytest --cov=awesome_api

# Check code quality
black .
flake8 .
mypy awesome_api/
```

## 🚀 Advanced Usage

### Create with Specific Template

```bash
./scripts/project-cli.sh create --template streamlit-dashboard
```

### Use Configuration File

Create `project-config.json`:

```json
{
  "project_name": "my-dashboard",
  "project_title": "Analytics Dashboard",
  "project_description": "A comprehensive analytics dashboard",
  "author_name": "Jane Doe",
  "author_email": "jane@example.com",
  "data_source": "database",
  "use_authentication": true,
  "include_charts": ["plotly", "altair"]
}
```

```bash
./scripts/project-cli.sh create --config project-config.json
```

## 📚 Next Steps

### Explore Template Features

Each template includes:
- **Production-ready**: Docker, CI/CD, monitoring
- **Best practices**: Code quality, testing, security
- **Documentation**: Comprehensive guides and examples
- **Flexibility**: Configurable options for different needs

### Common Tasks

```bash
# Development commands
./scripts/project-cli.sh dev:setup    # Setup dev environment
./scripts/project-cli.sh dev:test     # Run tests
./scripts/project-cli.sh dev:lint     # Code quality checks
./scripts/project-cli.sh dev:format   # Format code

# Docker commands
./scripts/project-cli.sh docker:build # Build images
./scripts/project-cli.sh docker:up    # Start services
./scripts/project-cli.sh docker:logs  # View logs

# Security
./scripts/project-cli.sh security:scan # Security scan
```

### Template Management

```bash
# List all templates
./scripts/project-cli.sh template:list

# Create custom template
./scripts/project-cli.sh template:create my-template

# Validate template
./scripts/project-cli.sh template:validate my-template

# Test template
./scripts/project-cli.sh template:test my-template
```

## 🛠️ Customizing Templates

### Create a Custom Template

1. **Create template skeleton**:
   ```bash
   ./scripts/project-cli.sh template:create my-custom-template
   ```

2. **Edit configuration** in `templates/project-templates/my-custom-template/template.json`:
   ```json
   {
     "name": "my-custom-template",
     "displayName": "My Custom Template",
     "description": "Template for my specific use case",
     "variables": {
       "custom_option": {
         "type": "boolean",
         "description": "Enable custom feature",
         "default": false
       }
     }
   }
   ```

3. **Add template files** in `src/` directory with `.template` extension

4. **Test your template**:
   ```bash
   ./scripts/project-cli.sh template:test my-custom-template
   ```

### Template Variables

Use `{{variable_name}}` syntax in template files:

```python
# app.py.template
"""{{project_title}} - {{project_description}}"""

from flask import Flask

app = Flask("{{project_name|replace('-', '_')}}")

{% if use_database %}
DATABASE_URL = "{{database_url}}"
{% endif %}

if __name__ == "__main__":
    app.run(port={{api_port|default(5000)}})
```

## 🆘 Troubleshooting

### Common Issues

**Template not found**:
```bash
❌ Template 'my-template' not found
```
- Check template name spelling
- List available templates with `./scripts/project-cli.sh list`

**Variable validation failed**:
```bash
❌ Variable 'project_name' doesn't match required pattern
```
- Check variable format requirements
- Use suggested examples from prompts

**Docker issues**:
```bash
❌ Docker is not running
```
- Start Docker Desktop or Docker daemon
- Verify with `docker info`

### Getting Help

```bash
# Command help
./scripts/project-cli.sh --help

# Specific command help  
./scripts/project-cli.sh create --help
./scripts/project-cli.sh template:create --help

# Validate project
./scripts/project-cli.sh validate

# Check template system
./scripts/project-cli.sh template:lint
```

## 📖 Learn More

- **[Complete Template Guide](TEMPLATE_SYSTEM_GUIDE.md)**: Comprehensive documentation
- **[API Documentation](../API.md)**: API reference and examples
- **[Deployment Guide](../deployment/PRODUCTION_DEPLOYMENT.md)**: Production deployment
- **[Security Guide](../deployment/SECURITY_GUIDE.md)**: Security best practices

## 🎯 Examples

### Flask API with PostgreSQL and Redis

```bash
./scripts/project-cli.sh create \
  --template flask-api \
  --config - << EOF
{
  "project_name": "todo-api",
  "project_title": "Todo API",
  "project_description": "A REST API for todo management",
  "database_type": "postgresql",
  "use_redis": true,
  "use_jwt_auth": true
}
EOF
```

### Streamlit Dashboard with Database

```bash
./scripts/project-cli.sh create \
  --template streamlit-dashboard \
  --config - << EOF
{
  "project_name": "sales-dashboard", 
  "project_title": "Sales Analytics Dashboard",
  "data_source": "database",
  "use_authentication": true,
  "include_charts": ["plotly", "altair"]
}
EOF
```

### Full-Stack Application

```bash
./scripts/project-cli.sh create \
  --template fullstack \
  --config - << EOF
{
  "project_name": "app-stack",
  "project_title": "My Application Stack", 
  "api_port": 8000,
  "dashboard_port": 8501,
  "use_monitoring": true
}
EOF
```

---

Ready to create amazing projects with GoREAL templates! 🚀

For questions or issues, please check the documentation or create a GitHub issue.