#!/bin/bash
# GoREAL Project CLI - Unified command line interface

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
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

print_header() {
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}                    ${CYAN}🚀 GoREAL Project CLI${NC}                       ${BLUE}║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
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

show_help() {
    print_header
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "📋 Project Management Commands:"
    echo "  create                    Create a new project from template"
    echo "  list                      List available project templates"
    echo "  validate                  Validate project configuration"
    echo ""
    echo "🔧 Template Management Commands:"
    echo "  template:list             List all available templates"
    echo "  template:create <name>    Create a new template"
    echo "  template:validate <name>  Validate a template"
    echo "  template:test <name>      Test template creation"
    echo "  template:lint             Validate all templates"
    echo ""
    echo "🏗️  Development Commands:"
    echo "  dev:setup                 Set up development environment"
    echo "  dev:test                  Run tests"
    echo "  dev:lint                  Run code quality checks"
    echo "  dev:format                Format code"
    echo ""
    echo "🐳 Docker Commands:"
    echo "  docker:build              Build Docker images"
    echo "  docker:up                 Start services with Docker Compose"
    echo "  docker:down               Stop Docker services"
    echo "  docker:logs               View Docker logs"
    echo ""
    echo "🚀 Deployment Commands:"
    echo "  deploy:staging            Deploy to staging environment"
    echo "  deploy:production         Deploy to production"
    echo "  deploy:rollback           Rollback deployment"
    echo "  deploy:status             Check deployment status"
    echo ""
    echo "📊 Monitoring Commands:"
    echo "  monitor:setup             Set up monitoring stack"
    echo "  monitor:status            Check monitoring services"
    echo "  monitor:logs              View monitoring logs"
    echo ""
    echo "🔐 Security Commands:"
    echo "  security:scan             Run security scans"
    echo "  security:secrets          Manage secrets"
    echo "  security:rotate           Rotate passwords and keys"
    echo ""
    echo "Options:"
    echo "  --help, -h                Show this help message"
    echo "  --verbose, -v             Enable verbose output"
    echo "  --dry-run                 Show what would be done without executing"
    echo ""
    echo "Examples:"
    echo "  $0 create --template flask-api"
    echo "  $0 template:create my-custom-template"
    echo "  $0 dev:setup"
    echo "  $0 docker:up --build"
    echo "  $0 deploy:production --version v1.2.0"
}

# Project Management Commands
cmd_create() {
    local template=""
    local output="."
    local config=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --template|-t)
                template="$2"
                shift 2
                ;;
            --output|-o)
                output="$2"
                shift 2
                ;;
            --config|-c)
                config="$2"
                shift 2
                ;;
            *)
                print_error "Unknown option: $1"
                return 1
                ;;
        esac
    done
    
    local cmd="python \"$SCRIPT_DIR/create-project.py\""
    
    if [ -n "$template" ]; then
        cmd="$cmd --template \"$template\""
    fi
    
    if [ -n "$output" ] && [ "$output" != "." ]; then
        cmd="$cmd --output \"$output\""
    fi
    
    if [ -n "$config" ]; then
        cmd="$cmd --config \"$config\""
    fi
    
    eval "$cmd"
}

cmd_list() {
    python "$SCRIPT_DIR/create-project.py" --list
}

cmd_validate() {
    local project_dir="${1:-.}"
    
    print_info "Validating project configuration in: $project_dir"
    
    # Check for required files
    local required_files=("README.md" "requirements.txt")
    local missing_files=()
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$project_dir/$file" ]; then
            missing_files+=("$file")
        fi
    done
    
    if [ ${#missing_files[@]} -gt 0 ]; then
        print_warning "Missing files: ${missing_files[*]}"
    else
        print_success "All required files present"
    fi
    
    # Validate Python syntax
    if command -v python >/dev/null 2>&1; then
        print_info "Checking Python syntax..."
        if find "$project_dir" -name "*.py" -exec python -m py_compile {} \; 2>/dev/null; then
            print_success "Python syntax validation passed"
        else
            print_error "Python syntax validation failed"
            return 1
        fi
    fi
}

# Template Management Commands
cmd_template_list() {
    python "$SCRIPT_DIR/template-manager.py" list
}

cmd_template_create() {
    local template_name="$1"
    local template_type="${2:-basic}"
    
    if [ -z "$template_name" ]; then
        print_error "Template name required"
        return 1
    fi
    
    python "$SCRIPT_DIR/template-manager.py" create --template "$template_name" --type "$template_type"
}

cmd_template_validate() {
    local template_name="$1"
    
    if [ -z "$template_name" ]; then
        print_error "Template name required"
        return 1
    fi
    
    python "$SCRIPT_DIR/template-manager.py" validate --template "$template_name"
}

cmd_template_test() {
    local template_name="$1"
    local output_dir="$2"
    
    if [ -z "$template_name" ]; then
        print_error "Template name required"
        return 1
    fi
    
    local cmd="python \"$SCRIPT_DIR/template-manager.py\" test --template \"$template_name\""
    
    if [ -n "$output_dir" ]; then
        cmd="$cmd --output \"$output_dir\""
    fi
    
    eval "$cmd"
}

cmd_template_lint() {
    python "$SCRIPT_DIR/template-manager.py" lint
}

# Development Commands
cmd_dev_setup() {
    print_info "Setting up development environment..."
    
    # Check for Python
    if ! command -v python3 >/dev/null 2>&1; then
        print_error "Python 3 is required but not installed"
        return 1
    fi
    
    # Create virtual environment
    if [ ! -d "venv" ]; then
        print_info "Creating virtual environment..."
        python3 -m venv venv
        print_success "Virtual environment created"
    fi
    
    # Activate virtual environment
    source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null
    
    # Install dependencies
    if [ -f "requirements-dev.txt" ]; then
        print_info "Installing development dependencies..."
        pip install -r requirements-dev.txt
        print_success "Development dependencies installed"
    elif [ -f "requirements.txt" ]; then
        print_info "Installing dependencies..."
        pip install -r requirements.txt
        print_success "Dependencies installed"
    fi
    
    # Install pre-commit hooks
    if command -v pre-commit >/dev/null 2>&1 && [ -f ".pre-commit-config.yaml" ]; then
        print_info "Installing pre-commit hooks..."
        pre-commit install
        print_success "Pre-commit hooks installed"
    fi
    
    print_success "Development environment setup complete"
}

cmd_dev_test() {
    print_info "Running tests..."
    
    if command -v pytest >/dev/null 2>&1; then
        pytest --cov --cov-report=term-missing
    else
        python -m unittest discover tests/
    fi
}

cmd_dev_lint() {
    print_info "Running code quality checks..."
    
    local errors=0
    
    # Black formatting check
    if command -v black >/dev/null 2>&1; then
        print_info "Checking code formatting with Black..."
        if ! black --check . 2>/dev/null; then
            print_warning "Code formatting issues found. Run 'black .' to fix."
            ((errors++))
        else
            print_success "Code formatting is correct"
        fi
    fi
    
    # flake8 linting
    if command -v flake8 >/dev/null 2>&1; then
        print_info "Running flake8 linting..."
        if ! flake8 . 2>/dev/null; then
            print_warning "Linting issues found"
            ((errors++))
        else
            print_success "Linting passed"
        fi
    fi
    
    # mypy type checking
    if command -v mypy >/dev/null 2>&1; then
        print_info "Running mypy type checking..."
        if ! mypy . --ignore-missing-imports 2>/dev/null; then
            print_warning "Type checking issues found"
            ((errors++))
        else
            print_success "Type checking passed"
        fi
    fi
    
    if [ $errors -eq 0 ]; then
        print_success "All code quality checks passed"
    else
        print_warning "$errors code quality issues found"
        return 1
    fi
}

cmd_dev_format() {
    print_info "Formatting code..."
    
    # Black formatting
    if command -v black >/dev/null 2>&1; then
        black .
        print_success "Code formatted with Black"
    fi
    
    # isort import sorting
    if command -v isort >/dev/null 2>&1; then
        isort .
        print_success "Imports sorted with isort"
    fi
}

# Docker Commands
cmd_docker_build() {
    print_info "Building Docker images..."
    
    if [ -f "docker-compose.yml" ]; then
        docker-compose build "$@"
    elif [ -f "Dockerfile" ]; then
        docker build -t "$(basename "$PWD"):latest" .
    else
        print_error "No Docker configuration found"
        return 1
    fi
    
    print_success "Docker images built"
}

cmd_docker_up() {
    print_info "Starting Docker services..."
    
    if [ -f "docker-compose.yml" ]; then
        docker-compose up -d "$@"
        print_success "Docker services started"
        
        # Show service status
        docker-compose ps
    else
        print_error "No docker-compose.yml found"
        return 1
    fi
}

cmd_docker_down() {
    print_info "Stopping Docker services..."
    
    if [ -f "docker-compose.yml" ]; then
        docker-compose down "$@"
        print_success "Docker services stopped"
    else
        print_error "No docker-compose.yml found"
        return 1
    fi
}

cmd_docker_logs() {
    local service="$1"
    
    if [ -f "docker-compose.yml" ]; then
        if [ -n "$service" ]; then
            docker-compose logs -f "$service"
        else
            docker-compose logs -f
        fi
    else
        print_error "No docker-compose.yml found"
        return 1
    fi
}

# Security Commands
cmd_security_scan() {
    print_info "Running security scans..."
    
    local errors=0
    
    # bandit security scan
    if command -v bandit >/dev/null 2>&1; then
        print_info "Running bandit security scan..."
        if ! bandit -r . -f json -o bandit-report.json 2>/dev/null; then
            print_warning "Security issues found in bandit-report.json"
            ((errors++))
        else
            print_success "No security issues found"
        fi
    fi
    
    # safety dependency scan
    if command -v safety >/dev/null 2>&1; then
        print_info "Scanning dependencies with safety..."
        if ! safety check 2>/dev/null; then
            print_warning "Vulnerable dependencies found"
            ((errors++))
        else
            print_success "No vulnerable dependencies found"
        fi
    fi
    
    if [ $errors -eq 0 ]; then
        print_success "Security scans completed successfully"
    else
        print_warning "$errors security issues found"
        return 1
    fi
}

# Main command dispatcher
main() {
    if [ $# -eq 0 ] || [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
        show_help
        return 0
    fi
    
    local command="$1"
    shift
    
    case "$command" in
        create)
            cmd_create "$@"
            ;;
        list)
            cmd_list "$@"
            ;;
        validate)
            cmd_validate "$@"
            ;;
        template:list)
            cmd_template_list "$@"
            ;;
        template:create)
            cmd_template_create "$@"
            ;;
        template:validate)
            cmd_template_validate "$@"
            ;;
        template:test)
            cmd_template_test "$@"
            ;;
        template:lint)
            cmd_template_lint "$@"
            ;;
        dev:setup)
            cmd_dev_setup "$@"
            ;;
        dev:test)
            cmd_dev_test "$@"
            ;;
        dev:lint)
            cmd_dev_lint "$@"
            ;;
        dev:format)
            cmd_dev_format "$@"
            ;;
        docker:build)
            cmd_docker_build "$@"
            ;;
        docker:up)
            cmd_docker_up "$@"
            ;;
        docker:down)
            cmd_docker_down "$@"
            ;;
        docker:logs)
            cmd_docker_logs "$@"
            ;;
        security:scan)
            cmd_security_scan "$@"
            ;;
        *)
            print_error "Unknown command: $command"
            echo ""
            echo "Run '$0 --help' for available commands"
            return 1
            ;;
    esac
}

main "$@"