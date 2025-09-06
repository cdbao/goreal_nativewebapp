# GoREAL Template System Documentation

Welcome to the GoREAL Template System! This powerful project scaffolding system helps you create consistent, production-ready projects quickly and efficiently.

## 📚 Documentation Index

### Getting Started
- **[Quick Start Guide](QUICK_START.md)** - Create your first project in minutes
- **[Template System Guide](TEMPLATE_SYSTEM_GUIDE.md)** - Comprehensive documentation

### Core Concepts
- **Templates**: Reusable project structures with variable substitution
- **Shared Configurations**: Common config files used across templates
- **CLI Tools**: Command-line interface for template management

## 🚀 Quick Example

```bash
# Create a new Flask API project
./scripts/project-cli.sh create --template flask-api

# Create a Streamlit dashboard
./scripts/project-cli.sh create --template streamlit-dashboard

# Create a full-stack application
./scripts/project-cli.sh create --template fullstack
```

## 📋 Available Templates

| Template | Description | Features |
|----------|-------------|----------|
| **flask-api** | Production Flask API | JWT auth, database, Docker, monitoring |
| **streamlit-dashboard** | Interactive dashboard | Data viz, auth, caching, deployment |
| **fullstack** | Complete application | API + dashboard, microservices, CI/CD |

## 🛠️ Template Features

### Every Template Includes:
- **Production-ready**: Docker, CI/CD, monitoring, security
- **Best practices**: Code quality tools, testing, documentation
- **Flexibility**: Configurable options for different needs
- **Security**: Secure defaults, secret management, validation

### Generated Project Structure:
```
my-project/
├── src/                     # Application source code
├── tests/                   # Comprehensive test suite
├── docs/                    # Documentation
├── docker/                  # Container configurations
├── scripts/                 # Development scripts
├── .github/                 # CI/CD workflows
├── pyproject.toml          # Project configuration
├── requirements.txt        # Dependencies
├── docker-compose.yml      # Service orchestration
└── README.md              # Project documentation
```

## 🔧 CLI Commands

### Project Creation
```bash
# Interactive creation
./scripts/project-cli.sh create

# Specific template
./scripts/project-cli.sh create --template flask-api

# With configuration
./scripts/project-cli.sh create --config project.json

# List templates
./scripts/project-cli.sh list
```

### Template Management
```bash
# List all templates
./scripts/project-cli.sh template:list

# Create new template
./scripts/project-cli.sh template:create my-template

# Validate template
./scripts/project-cli.sh template:validate my-template

# Test template
./scripts/project-cli.sh template:test my-template

# Validate all templates
./scripts/project-cli.sh template:lint
```

### Development Tools
```bash
# Setup development environment
./scripts/project-cli.sh dev:setup

# Run tests
./scripts/project-cli.sh dev:test

# Code quality checks
./scripts/project-cli.sh dev:lint

# Format code
./scripts/project-cli.sh dev:format
```

### Docker Operations
```bash
# Build images
./scripts/project-cli.sh docker:build

# Start services
./scripts/project-cli.sh docker:up

# Stop services  
./scripts/project-cli.sh docker:down

# View logs
./scripts/project-cli.sh docker:logs
```

## 🎯 Use Cases

### API Development
- **REST APIs**: Flask with SQLAlchemy, authentication, rate limiting
- **Microservices**: Service mesh, load balancing, monitoring
- **Data APIs**: Database integration, caching, data validation

### Dashboard & Analytics
- **Business Dashboards**: Interactive visualizations, real-time data
- **Data Analysis**: Jupyter integration, data pipelines, exports
- **Monitoring Dashboards**: System metrics, alerts, health checks

### Full-Stack Applications
- **Web Applications**: Frontend + backend, user management, deployment
- **SaaS Platforms**: Multi-tenancy, billing, admin panels
- **Enterprise Apps**: SSO, audit logging, compliance

## 🚀 Advanced Features

### Variable Substitution
Templates support powerful variable substitution:

```python
# Template file: app.py.template
"""{{project_title}} - {{project_description}}"""

from flask import Flask

app = Flask("{{project_name|replace('-', '_')}}")

{% if use_database %}
DATABASE_URL = "{{database_url}}"
{% endif %}
```

### Conditional Content
Include/exclude files based on configuration:

```json
{
  "conditional": {
    "use_docker": ["Dockerfile", "docker-compose.yml"],
    "database_type:postgresql": ["docker/postgres/"],
    "use_monitoring": ["deploy/monitoring/"]
  }
}
```

### Shared Configurations
Reuse common configurations across templates:
- **Python**: pyproject.toml, requirements.txt
- **Docker**: Dockerfile, docker-compose.yml  
- **GitHub**: CI/CD workflows, issue templates
- **Security**: .gitignore, environment files

## 🏗️ Template Architecture

### Template Structure
```
templates/
├── project-templates/           # Template definitions
│   ├── flask-api/
│   │   ├── template.json       # Configuration
│   │   ├── src/                # Source files
│   │   └── scripts/            # Setup scripts
├── shared-configs/             # Reusable configurations  
│   ├── python/
│   ├── docker/
│   ├── github/
│   └── env/
```

### Template Configuration
```json
{
  "name": "flask-api",
  "displayName": "Flask API Project", 
  "description": "Production-ready Flask API",
  "version": "1.0.0",
  "variables": {
    "project_name": {
      "type": "string",
      "description": "Project name",
      "pattern": "^[a-z][a-z0-9-]*$"
    }
  },
  "files": {
    "template": ["README.md", "requirements.txt"],
    "copy": ["assets/", "static/"],
    "conditional": {
      "use_docker": ["Dockerfile"]
    }
  }
}
```

## 📖 Documentation Structure

```
docs/templates/
├── README.md                   # This file
├── QUICK_START.md             # Quick start guide
├── TEMPLATE_SYSTEM_GUIDE.md   # Comprehensive guide
└── examples/                   # Example configurations
```

## 🔗 Related Documentation

- **[API Documentation](../API.md)** - API reference and examples
- **[Deployment Guide](../deployment/PRODUCTION_DEPLOYMENT.md)** - Production deployment
- **[Security Guide](../deployment/SECURITY_GUIDE.md)** - Security best practices
- **[Contributing Guide](../../CONTRIBUTING.md)** - How to contribute

## 🤝 Contributing

We welcome contributions to the template system:

1. **New Templates**: Create templates for specific use cases
2. **Improvements**: Enhance existing templates with new features
3. **Documentation**: Improve guides and examples
4. **Bug Fixes**: Report and fix issues

### Creating Templates

1. Fork the repository
2. Create template with `./scripts/project-cli.sh template:create`
3. Test thoroughly with `./scripts/project-cli.sh template:test`
4. Submit pull request with documentation

### Template Guidelines

- **Generic**: Design for broad applicability
- **Secure**: Follow security best practices
- **Documented**: Include comprehensive documentation
- **Tested**: Test all template variations
- **Maintained**: Keep dependencies updated

## 🆘 Support

### Getting Help
- **Documentation**: Start with this guide and the Quick Start
- **CLI Help**: Run `./scripts/project-cli.sh --help` for commands
- **GitHub Issues**: Report bugs and request features
- **Community**: Join discussions and share templates

### Troubleshooting
- **Validation Errors**: Use `template:validate` to check templates
- **Variable Issues**: Check variable syntax and types
- **File Issues**: Verify file paths and permissions
- **Docker Issues**: Ensure Docker is running

### Common Solutions
```bash
# Fix template validation
./scripts/project-cli.sh template:validate my-template

# Test template creation
./scripts/project-cli.sh template:test my-template

# Check all templates
./scripts/project-cli.sh template:lint

# Validate project
./scripts/project-cli.sh validate
```

## 🚀 Getting Started

Ready to create your first project? 

1. **[Read the Quick Start Guide](QUICK_START.md)** (5 minutes)
2. **Create your first project** with `./scripts/project-cli.sh create`
3. **Explore the generated project** structure and features
4. **Customize for your needs** or create custom templates

---

**Happy coding with GoREAL templates! 🎉**