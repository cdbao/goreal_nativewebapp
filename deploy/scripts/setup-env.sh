#!/bin/bash
# GoREAL Environment Setup Script
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
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

print_header() {
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}                  ${BLUE}🔧 GoREAL Environment Setup${NC}                    ${CYAN}║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_step() {
    echo -e "${BLUE}[STEP $1]${NC} $2"
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

generate_secret_key() {
    # Generate a secure random secret key
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

generate_db_password() {
    # Generate a secure database password
    openssl rand -base64 20 | tr -d "=+/" | cut -c1-16
}

setup_environment_file() {
    print_step "1" "Setting up Environment File"
    
    local env_file="$PROJECT_ROOT/.env.production"
    local template_file="$PROJECT_ROOT/.env.production.template"
    
    if [ -f "$env_file" ]; then
        print_warning "Production environment file already exists"
        read -p "Do you want to backup and recreate it? (y/n): " confirm
        if [ "$confirm" != "y" ]; then
            print_info "Skipping environment file setup"
            return 0
        fi
        
        # Backup existing file
        cp "$env_file" "$env_file.backup.$(date +%Y%m%d-%H%M%S)"
        print_info "Existing file backed up"
    fi
    
    if [ ! -f "$template_file" ]; then
        print_error "Environment template file not found: $template_file"
        exit 1
    fi
    
    # Copy template
    cp "$template_file" "$env_file"
    
    # Generate secure values
    local secret_key=$(generate_secret_key)
    local db_password=$(generate_db_password)
    local redis_password=$(generate_db_password)
    
    # Replace placeholders with generated values
    sed -i "s/your-secret-key-here-use-strong-random-string/$secret_key/g" "$env_file"
    sed -i "s/your_db_password/$db_password/g" "$env_file"
    sed -i "s/your_redis_password/$redis_password/g" "$env_file"
    
    # Set build date and VCS ref
    local build_date=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
    local vcs_ref=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    
    sed -i "s/BUILD_DATE=.*/BUILD_DATE=$build_date/g" "$env_file"
    sed -i "s/VCS_REF=.*/VCS_REF=$vcs_ref/g" "$env_file"
    
    print_success "Environment file created with secure defaults"
    print_warning "Please review and update the following values manually:"
    echo "  - GOOGLE_SHEETS_SPREADSHEET_ID"
    echo "  - ROBLOX_API_KEY"
    echo "  - CORS_ORIGINS"
    echo "  - SSL certificate paths"
}

setup_secrets_directory() {
    print_step "2" "Setting up Secrets Directory"
    
    local secrets_dir="$PROJECT_ROOT/secrets"
    mkdir -p "$secrets_dir"
    
    # Set restrictive permissions
    chmod 700 "$secrets_dir"
    
    # Create placeholder files
    cat > "$secrets_dir/google-credentials.json.example" << 'EOF'
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "your-private-key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n",
  "client_email": "your-service-account@your-project.iam.gserviceaccount.com",
  "client_id": "your-client-id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40your-project.iam.gserviceaccount.com"
}
EOF
    
    # Create SSL directory structure
    mkdir -p "$secrets_dir/ssl"
    
    # Create self-signed certificate for development/testing
    if ! [ -f "$secrets_dir/ssl/cert.pem" ]; then
        print_info "Generating self-signed SSL certificate for development..."
        openssl req -x509 -newkey rsa:4096 -keyout "$secrets_dir/ssl/key.pem" -out "$secrets_dir/ssl/cert.pem" -days 365 -nodes \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
        
        chmod 600 "$secrets_dir/ssl/key.pem"
        chmod 644 "$secrets_dir/ssl/cert.pem"
        
        print_success "Self-signed SSL certificate generated"
        print_warning "Replace with production certificates before deployment"
    fi
    
    print_success "Secrets directory configured"
}

create_env_validation_script() {
    print_step "3" "Creating Environment Validation Script"
    
    cat > "$PROJECT_ROOT/deploy/scripts/validate-env.sh" << 'EOF'
#!/bin/bash
# GoREAL Environment Validation Script
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env.production"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

validate_env() {
    local errors=0
    
    echo "🔍 Validating production environment..."
    echo ""
    
    if [ ! -f "$ENV_FILE" ]; then
        echo -e "${RED}❌ Environment file not found: $ENV_FILE${NC}"
        return 1
    fi
    
    source "$ENV_FILE"
    
    # Required variables
    required_vars=(
        "APP_SECRET_KEY"
        "DATABASE_URL"
        "DB_PASSWORD"
        "REDIS_URL"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            echo -e "${RED}❌ Missing required variable: $var${NC}"
            ((errors++))
        else
            echo -e "${GREEN}✅ $var is set${NC}"
        fi
    done
    
    # Validate secret key strength
    if [ ${#APP_SECRET_KEY} -lt 24 ]; then
        echo -e "${YELLOW}⚠️  APP_SECRET_KEY should be at least 24 characters${NC}"
        ((errors++))
    fi
    
    # Check for template values
    template_values=(
        "your-secret-key-here"
        "your_db_password"
        "your_spreadsheet_id"
    )
    
    for template in "${template_values[@]}"; do
        if grep -q "$template" "$ENV_FILE"; then
            echo -e "${YELLOW}⚠️  Found template value: $template - please update${NC}"
            ((errors++))
        fi
    done
    
    # Validate file paths
    if [ ! -f "$GOOGLE_SHEETS_CREDENTIALS_FILE" ]; then
        echo -e "${YELLOW}⚠️  Google credentials file not found: $GOOGLE_SHEETS_CREDENTIALS_FILE${NC}"
    fi
    
    if [ $errors -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✅ Environment validation passed!${NC}"
        return 0
    else
        echo ""
        echo -e "${RED}❌ Environment validation failed with $errors errors${NC}"
        return 1
    fi
}

validate_env
EOF
    
    chmod +x "$PROJECT_ROOT/deploy/scripts/validate-env.sh"
    print_success "Environment validation script created"
}

setup_gitignore() {
    print_step "4" "Updating .gitignore for Secrets"
    
    local gitignore="$PROJECT_ROOT/.gitignore"
    
    # Add secrets to gitignore if not already present
    if ! grep -q ".env.production" "$gitignore" 2>/dev/null; then
        echo "" >> "$gitignore"
        echo "# Production Environment and Secrets" >> "$gitignore"
        echo ".env.production" >> "$gitignore"
        echo ".env.local" >> "$gitignore"
        echo "secrets/" >> "$gitignore"
        echo "*.pem" >> "$gitignore"
        echo "*.key" >> "$gitignore"
        echo "google-credentials.json" >> "$gitignore"
        
        print_success "Updated .gitignore with secrets patterns"
    else
        print_info ".gitignore already configured for secrets"
    fi
}

show_setup_summary() {
    echo ""
    print_success "🔧 Environment Setup Complete!"
    echo ""
    echo -e "${CYAN}Next Steps:${NC}"
    echo "==========="
    echo "1. Review and update .env.production with your specific values:"
    echo "   - GOOGLE_SHEETS_SPREADSHEET_ID"
    echo "   - ROBLOX_API_KEY (if applicable)"
    echo "   - CORS_ORIGINS for your domain"
    echo ""
    echo "2. Add your Google Service Account credentials:"
    echo "   - Copy your credentials to: secrets/google-credentials.json"
    echo ""
    echo "3. For production SSL certificates:"
    echo "   - Replace secrets/ssl/cert.pem and secrets/ssl/key.pem"
    echo ""
    echo "4. Validate your configuration:"
    echo "   ./deploy/scripts/validate-env.sh"
    echo ""
    echo -e "${YELLOW}Security Notes:${NC}"
    echo "=============="
    echo "• Never commit secrets to version control"
    echo "• Use environment-specific credentials"
    echo "• Regularly rotate passwords and keys"
    echo "• Monitor access to secrets directory"
}

main() {
    print_header
    
    setup_environment_file
    setup_secrets_directory
    create_env_validation_script
    setup_gitignore
    
    show_setup_summary
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --force)
            FORCE_SETUP=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --force    Force recreation of existing files"
            echo "  --help     Show this help message"
            echo ""
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

main