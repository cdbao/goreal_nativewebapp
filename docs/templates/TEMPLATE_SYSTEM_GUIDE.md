# GoREAL Template System Guide

This guide provides comprehensive documentation for the GoREAL project template system, including creating, managing, and using project templates.

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Template Structure](#template-structure)
4. [Creating Templates](#creating-templates)
5. [Using Templates](#using-templates)
6. [Template Configuration](#template-configuration)
7. [Shared Configurations](#shared-configurations)
8. [Advanced Features](#advanced-features)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

## Overview

The GoREAL template system provides a powerful way to create consistent, reusable project structures. It supports:

- **Multiple Template Types**: Flask API, Streamlit Dashboard, Full-stack applications
- **Variable Substitution**: Dynamic content based on user input
- **Conditional Files**: Include/exclude files based on configuration
- **Shared Configurations**: Reusable config files across templates
- **Validation**: Comprehensive template validation and testing
- **CLI Integration**: Command-line tools for template management

### Key Benefits

- **Consistency**: Standardized project structures across your organization
- **Productivity**: Rapid project initialization with best practices
- **Maintainability**: Centralized template management and updates
- **Flexibility**: Customizable templates for different use cases
- **Quality**: Built-in validation and testing

## Quick Start

### Create a New Project

```bash
# Interactive project creation
./scripts/project-cli.sh create

# Create with specific template
./scripts/project-cli.sh create --template flask-api

# Create with configuration file
./scripts/project-cli.sh create --template fullstack --config project-config.json
```

### List Available Templates

```bash
# List all templates
./scripts/project-cli.sh list

# List with detailed information
./scripts/project-cli.sh template:list
```

### Create a Custom Template

```bash
# Create new template skeleton
./scripts/project-cli.sh template:create my-custom-template

# Validate template
./scripts/project-cli.sh template:validate my-custom-template

# Test template
./scripts/project-cli.sh template:test my-custom-template
```

## Template Structure

Templates are organized in the following directory structure:

```
templates/
├── project-templates/
│   ├── flask-api/
│   │   ├── template.json          # Template configuration
│   │   ├── src/                   # Template source files
│   │   │   ├── README.md.template
│   │   │   ├── requirements.txt.template
│   │   │   └── app.py.template
│   │   └── scripts/               # Template-specific scripts
│   ├── streamlit-dashboard/
│   └── fullstack/
└── shared-configs/
    ├── python/
    │   └── pyproject.toml.template
    ├── docker/
    │   ├── Dockerfile.template
    │   └── docker-compose.yml.template
    ├── github/
    │   └── workflows/
    └── env/
        └── .env.example.template
```

### Template Components

| Component | Purpose |
|-----------|---------|
| `template.json` | Template configuration and metadata |
| `src/` | Template source files and directories |
| `scripts/` | Template-specific setup scripts |
| `*.template` | Files that undergo variable substitution |

## Creating Templates

### 1. Create Template Skeleton

```bash
./scripts/project-cli.sh template:create my-template --type basic
```

This creates:
- Basic directory structure
- Template configuration file
- Sample template files

### 2. Configure Template Metadata

Edit `template.json`:

```json
{
  "name": "my-template",
  "displayName": "My Custom Template",
  "description": "A template for my specific use case",
  "version": "1.0.0",
  "author": "Your Name",
  "tags": ["python", "web", "custom"],
  "requirements": {
    "python": ">=3.10",
    "docker": ">=20.10"
  }
}
```

### 3. Define Variables

Add user-configurable variables:

```json
{
  "variables": {
    "project_name": {
      "type": "string",
      "description": "Project name (lowercase, hyphens allowed)",
      "pattern": "^[a-z][a-z0-9-]*[a-z0-9]$",
      "example": "my-project"
    },
    "database_type": {
      "type": "choice",
      "description": "Database type",
      "choices": ["postgresql", "mysql", "sqlite"],
      "default": "postgresql"
    },
    "use_redis": {
      "type": "boolean",
      "description": "Include Redis for caching",
      "default": true
    },
    "features": {
      "type": "multiselect",
      "description": "Features to include",
      "choices": ["auth", "api", "dashboard"],
      "default": ["api"]
    }
  }
}
```

### 4. Create Template Files

Template files use `{{variable}}` syntax for substitution:

```python
# src/app.py.template
"""{{project_title}} - {{project_description}}"""

from flask import Flask

app = Flask(__name__)
app.config['SECRET_KEY'] = '{{secret_key}}'

{% if use_redis %}
import redis
redis_client = redis.Redis(host='localhost', port=6379)
{% endif %}

if __name__ == '__main__':
    app.run(host='0.0.0.0', port={{api_port|default(5000)}})
```

### 5. Define File Structure

Specify the project structure in `template.json`:

```json
{
  "structure": {
    "{{project_name}}/": {
      "{{project_name|replace('-', '_')}}/": {
        "__init__.py": "template",
        "app.py": "template",
        "config.py": "template"
      },
      "tests/": {
        "__init__.py": "template",
        "test_app.py": "template"
      },
      "docs/": {
        "README.md": "template"
      }
    }
  }
}
```

### 6. Configure File Processing

Define how files should be processed:

```json
{
  "files": {
    "copy": [
      "assets/",
      "static/"
    ],
    "template": [
      "README.md",
      "requirements.txt",
      "pyproject.toml"
    ],
    "conditional": {
      "use_docker": [
        "Dockerfile",
        "docker-compose.yml"
      ],
      "database_type:postgresql": [
        "docker/postgres/"
      ]
    }
  }
}
```

### 7. Add Hooks (Optional)

Define pre/post creation hooks:

```json
{
  "hooks": {
    "pre_create": [
      "scripts/validate_inputs.py"
    ],
    "post_create": [
      "scripts/setup_virtualenv.sh",
      "scripts/install_dependencies.sh"
    ]
  }
}
```

## Using Templates

### Interactive Creation

The interactive mode guides users through template configuration:

```bash
$ ./scripts/project-cli.sh create

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
Brief project description [A RESTful API for managing resources]: My awesome API project
Author/Organization name [Your Name]: John Doe
Contact email (e.g., you@example.com): john@example.com
```

### Configuration File

Create projects using JSON configuration:

```json
{
  "project_name": "my-api",
  "project_title": "My API",
  "project_description": "A sample API project",
  "author_name": "John Doe",
  "author_email": "john@example.com",
  "database_type": "postgresql",
  "use_redis": true,
  "use_jwt_auth": true
}
```

```bash
./scripts/project-cli.sh create --template flask-api --config config.json
```

### Programmatic Usage

Use the Python API directly:

```python
from scripts.create_project import ProjectCreator

creator = ProjectCreator()
inputs = {
    "project_name": "test-project",
    "project_title": "Test Project",
    "author_name": "Test Author"
}

success = creator.create_project("flask-api", "./output", inputs)
```

## Template Configuration

### Variable Types

| Type | Description | Example |
|------|-------------|---------|
| `string` | Text input | Project name, description |
| `integer` | Numeric input | Port numbers, counts |
| `boolean` | Yes/No choice | Enable features |
| `choice` | Single selection | Database type |
| `multiselect` | Multiple selections | Feature list |

### Variable Properties

```json
{
  "variable_name": {
    "type": "string",
    "description": "Human-readable description",
    "pattern": "^[a-z][a-z0-9-]*$",  // Regex validation
    "example": "sample-value",        // Example value
    "default": "default-value",       // Default value
    "min": 1,                        // Minimum (integer)
    "max": 100,                      // Maximum (integer)
    "choices": ["option1", "option2"] // Available choices
  }
}
```

### Template Filters

Variables support filters for transformation:

- `{{project_name|replace('-', '_')}}` - Replace hyphens with underscores
- `{{project_title|title}}` - Title case
- `{{project_name|upper}}` - Uppercase
- `{{project_name|lower}}` - Lowercase

### Conditional Processing

Use conditions to include/exclude content:

```json
{
  "conditional": {
    "use_docker": ["Dockerfile", "docker-compose.yml"],
    "database_type:postgresql": ["docker/postgres/"],
    "api_framework:flask": ["src/flask/"]
  }
}
```

## Shared Configurations

Shared configurations provide reusable template files across multiple templates.

### Available Shared Configs

| Category | Files | Purpose |
|----------|-------|---------|
| Python | `pyproject.toml.template` | Project configuration |
| Docker | `Dockerfile.template`, `docker-compose.yml.template` | Containerization |
| GitHub | `ci.yml.template` | CI/CD workflows |
| Environment | `.env.example.template` | Environment variables |
| Git | `.gitignore.template` | Version control |

### Using Shared Configs

Reference shared configurations in `template.json`:

```json
{
  "files": {
    "template": [
      "pyproject.toml",    // Uses shared-configs/python/pyproject.toml.template
      "Dockerfile",        // Uses shared-configs/docker/Dockerfile.template
      ".env.example"       // Uses shared-configs/env/.env.example.template
    ]
  }
}
```

### Creating Shared Configs

1. Add template file to appropriate shared-configs directory
2. Use standard variable substitution syntax
3. Make it generic for multiple use cases
4. Document any special requirements

## Advanced Features

### Custom Hooks

Create custom setup scripts for complex initialization:

```python
# scripts/custom_setup.py
import sys
import subprocess

def setup_custom_environment():
    """Custom setup logic"""
    # Install additional dependencies
    subprocess.check_call([
        sys.executable, "-m", "pip", "install", 
        "custom-package==1.0.0"
    ])
    
    # Configure custom settings
    with open("custom-config.yml", "w") as f:
        f.write("custom_setting: enabled\n")

if __name__ == "__main__":
    setup_custom_environment()
```

### Complex Variable Processing

Handle complex variable relationships:

```json
{
  "variables": {
    "deployment_type": {
      "type": "choice",
      "choices": ["docker", "kubernetes", "heroku"]
    },
    "container_port": {
      "type": "integer",
      "description": "Application port",
      "default": 8000,
      "min": 1000,
      "max": 65535,
      "condition": "deployment_type != 'heroku'"
    }
  }
}
```

### Template Inheritance

Extend existing templates:

```json
{
  "extends": "flask-api",
  "name": "flask-api-extended",
  "description": "Extended Flask API with additional features",
  "additional_variables": {
    "custom_feature": {
      "type": "boolean",
      "default": false
    }
  }
}
```

## Best Practices

### Template Design

1. **Keep Templates Generic**: Design for broad applicability
2. **Provide Good Defaults**: Minimize required user input
3. **Clear Documentation**: Comprehensive variable descriptions
4. **Validation**: Include input validation patterns
5. **Testing**: Test templates thoroughly before deployment

### Variable Naming

- Use descriptive names: `database_type` not `db`
- Follow conventions: `snake_case` for variables
- Group related variables: `api_host`, `api_port`, `api_version`
- Use boolean prefixes: `use_redis`, `enable_auth`

### File Organization

- Group related files in directories
- Use clear directory names
- Keep template files organized
- Separate source code from configuration

### Configuration Management

- Use environment-specific templates
- Provide secure defaults
- Document all configuration options
- Include example configurations

### Security Considerations

- Generate secure secrets automatically
- Never include hardcoded credentials
- Use appropriate file permissions
- Validate user inputs

## Troubleshooting

### Common Issues

#### Template Validation Errors

**Problem**: Template fails validation
```bash
❌ Missing required field: displayName
```

**Solution**: Ensure all required fields are present in `template.json`:
```json
{
  "name": "required",
  "displayName": "required", 
  "description": "required",
  "version": "required"
}
```

#### Variable Substitution Failures

**Problem**: Variables not being replaced
```bash
Project created with {{project_name}} in filename
```

**Solution**: Ensure proper template syntax and file extension:
- Files must have `.template` extension
- Use `{{variable_name}}` syntax
- Check variable names match configuration

#### Missing Template Files

**Problem**: Referenced template files not found
```bash
⚠️ Template file not found: requirements.txt
```

**Solution**: 
- Check file exists in `src/` directory
- Verify shared config availability
- Use correct relative paths

#### Conditional Processing Issues

**Problem**: Conditional files not included/excluded properly
```bash
Docker files included when use_docker=false
```

**Solution**: Check conditional syntax:
```json
{
  "conditional": {
    "use_docker": ["Dockerfile"],        // Boolean variable
    "database_type:postgresql": ["..."]  // Choice variable
  }
}
```

### Debugging Templates

#### Enable Verbose Mode

```bash
./scripts/project-cli.sh create --template my-template --verbose
```

#### Validate Template Structure

```bash
./scripts/project-cli.sh template:validate my-template
```

#### Test Template Creation

```bash
./scripts/project-cli.sh template:test my-template
```

#### Check Template Syntax

```bash
./scripts/project-cli.sh template:lint
```

### Getting Help

#### Command Help

```bash
./scripts/project-cli.sh --help
./scripts/project-cli.sh template:create --help
```

#### Template Documentation

- Check template-specific README files
- Review example configurations
- Consult shared configuration docs

#### Community Support

- Create GitHub issues for bugs
- Join discussions for questions
- Contribute improvements

## Examples

### Simple Template

A minimal template for Python packages:

```json
{
  "name": "python-package",
  "displayName": "Python Package",
  "description": "Simple Python package template",
  "version": "1.0.0",
  "variables": {
    "package_name": {
      "type": "string",
      "description": "Package name",
      "pattern": "^[a-z][a-z0-9_]*$"
    }
  },
  "structure": {
    "{{package_name}}/": {
      "{{package_name}}/": {
        "__init__.py": "template"
      },
      "tests/": {
        "__init__.py": "template"
      }
    }
  },
  "files": {
    "template": [
      "README.md",
      "setup.py",
      "requirements.txt"
    ]
  }
}
```

### Complex Template

A full-featured web application template:

```json
{
  "name": "webapp-advanced",
  "displayName": "Advanced Web Application",
  "description": "Full-featured web application with multiple options",
  "version": "2.0.0",
  "variables": {
    "project_name": {"type": "string", "pattern": "^[a-z][a-z0-9-]*$"},
    "framework": {"type": "choice", "choices": ["flask", "fastapi"]},
    "database": {"type": "choice", "choices": ["postgresql", "mysql", "sqlite"]},
    "features": {"type": "multiselect", "choices": ["auth", "api", "admin", "cache"]},
    "use_docker": {"type": "boolean", "default": true},
    "deployment": {"type": "choice", "choices": ["docker", "heroku", "aws"]}
  },
  "files": {
    "template": [
      "README.md", "requirements.txt", ".env.example"
    ],
    "conditional": {
      "framework:flask": ["src/flask/"],
      "framework:fastapi": ["src/fastapi/"],
      "use_docker": ["Dockerfile", "docker-compose.yml"],
      "deployment:aws": ["aws/", "terraform/"],
      "deployment:heroku": ["Procfile", "runtime.txt"]
    }
  },
  "hooks": {
    "post_create": [
      "scripts/setup_database.sh",
      "scripts/install_dependencies.sh"
    ]
  }
}
```

## Conclusion

The GoREAL template system provides a powerful foundation for standardizing and accelerating project creation. By following this guide, you can create robust, reusable templates that improve productivity and maintain consistency across your projects.

Key takeaways:
1. Start with simple templates and gradually add complexity
2. Use shared configurations to reduce duplication
3. Test templates thoroughly before deployment
4. Document templates comprehensively for users
5. Follow security best practices for sensitive data
6. Leverage community templates and contribute back

For additional support or questions, refer to the project documentation or create an issue in the GitHub repository.