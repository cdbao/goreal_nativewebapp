#!/bin/bash
# GoREAL Secrets Management Script
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
SECRETS_DIR="$PROJECT_ROOT/secrets"
ENV_FILE="$PROJECT_ROOT/.env.production"

print_header() {
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}                   ${CYAN}🔐 GoREAL Secrets Manager${NC}                     ${BLUE}║${NC}"
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

generate_password() {
    local length=${1:-16}
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-${length}
}

encrypt_file() {
    local source_file="$1"
    local encrypted_file="${source_file}.enc"
    local password="$2"
    
    if [ ! -f "$source_file" ]; then
        print_error "Source file not found: $source_file"
        return 1
    fi
    
    if [ -z "$password" ]; then
        print_error "Password required for encryption"
        return 1
    fi
    
    openssl enc -aes-256-cbc -salt -in "$source_file" -out "$encrypted_file" -pass pass:"$password"
    
    if [ $? -eq 0 ]; then
        print_success "File encrypted: $encrypted_file"
        return 0
    else
        print_error "Encryption failed"
        return 1
    fi
}

decrypt_file() {
    local encrypted_file="$1"
    local output_file="$2"
    local password="$3"
    
    if [ ! -f "$encrypted_file" ]; then
        print_error "Encrypted file not found: $encrypted_file"
        return 1
    fi
    
    if [ -z "$password" ]; then
        print_error "Password required for decryption"
        return 1
    fi
    
    openssl enc -aes-256-cbc -d -in "$encrypted_file" -out "$output_file" -pass pass:"$password"
    
    if [ $? -eq 0 ]; then
        print_success "File decrypted: $output_file"
        return 0
    else
        print_error "Decryption failed"
        return 1
    fi
}

backup_secrets() {
    print_info "Creating encrypted backup of secrets..."
    
    local backup_dir="$PROJECT_ROOT/backups/secrets-$(date +'%Y%m%d-%H%M%S')"
    mkdir -p "$backup_dir"
    
    # Get encryption password
    read -s -p "Enter password for backup encryption: " backup_password
    echo ""
    
    if [ -z "$backup_password" ]; then
        print_error "Password cannot be empty"
        return 1
    fi
    
    # Create tar of secrets directory
    local secrets_tar="$backup_dir/secrets.tar"
    tar -cf "$secrets_tar" -C "$PROJECT_ROOT" secrets/
    
    # Encrypt the tar file
    if encrypt_file "$secrets_tar" "$backup_password"; then
        rm "$secrets_tar"  # Remove unencrypted tar
        print_success "Secrets backup created: $backup_dir/secrets.tar.enc"
        
        # Create backup info file
        cat > "$backup_dir/backup_info.txt" << EOF
Backup Created: $(date)
Contents: secrets/ directory
Encryption: AES-256-CBC
EOF
        
        print_info "Backup info saved: $backup_dir/backup_info.txt"
    else
        print_error "Failed to create encrypted backup"
        rm -f "$secrets_tar"
        return 1
    fi
}

restore_secrets() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        print_error "Backup file path required"
        return 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        print_error "Backup file not found: $backup_file"
        return 1
    fi
    
    print_warning "This will overwrite existing secrets!"
    read -p "Continue? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        print_info "Restore cancelled"
        return 0
    fi
    
    # Get decryption password
    read -s -p "Enter password for backup decryption: " backup_password
    echo ""
    
    # Create temporary directory for extraction
    local temp_dir=$(mktemp -d)
    local decrypted_tar="$temp_dir/secrets.tar"
    
    # Decrypt backup
    if decrypt_file "$backup_file" "$decrypted_tar" "$backup_password"; then
        # Backup current secrets if they exist
        if [ -d "$SECRETS_DIR" ]; then
            local current_backup="$SECRETS_DIR.backup.$(date +'%Y%m%d-%H%M%S')"
            mv "$SECRETS_DIR" "$current_backup"
            print_info "Current secrets backed up to: $current_backup"
        fi
        
        # Extract secrets
        tar -xf "$decrypted_tar" -C "$PROJECT_ROOT"
        
        print_success "Secrets restored successfully"
    else
        print_error "Failed to restore secrets"
    fi
    
    # Clean up
    rm -rf "$temp_dir"
}

rotate_passwords() {
    print_info "Rotating database and Redis passwords..."
    
    if [ ! -f "$ENV_FILE" ]; then
        print_error "Environment file not found: $ENV_FILE"
        return 1
    fi
    
    # Generate new passwords
    local new_db_password=$(generate_password 20)
    local new_redis_password=$(generate_password 20)
    
    print_info "Generated new passwords"
    
    # Create backup of current env file
    cp "$ENV_FILE" "${ENV_FILE}.backup.$(date +'%Y%m%d-%H%M%S')"
    
    # Update passwords in env file
    sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=$new_db_password/g" "$ENV_FILE"
    sed -i "s/your_db_password/$new_db_password/g" "$ENV_FILE"
    sed -i "s/your_redis_password/$new_redis_password/g" "$ENV_FILE"
    
    # Update DATABASE_URL and REDIS_URL
    sed -i "s|postgresql://goreal_user:[^@]*@|postgresql://goreal_user:$new_db_password@|g" "$ENV_FILE"
    
    print_success "Passwords rotated successfully"
    print_warning "You must restart all services for changes to take effect"
    print_warning "Update any external systems that use these credentials"
}

check_secret_permissions() {
    print_info "Checking secrets directory permissions..."
    
    if [ ! -d "$SECRETS_DIR" ]; then
        print_warning "Secrets directory not found: $SECRETS_DIR"
        return 1
    fi
    
    # Check directory permissions
    local dir_perms=$(stat -c "%a" "$SECRETS_DIR" 2>/dev/null || stat -f "%A" "$SECRETS_DIR" 2>/dev/null || echo "unknown")
    
    if [ "$dir_perms" != "700" ]; then
        print_warning "Secrets directory has permissions: $dir_perms (should be 700)"
        print_info "Fixing permissions..."
        chmod 700 "$SECRETS_DIR"
        print_success "Directory permissions fixed"
    else
        print_success "Directory permissions are correct (700)"
    fi
    
    # Check file permissions
    find "$SECRETS_DIR" -type f -name "*.key" -o -name "*.pem" -o -name "*credentials*" | while read -r file; do
        local file_perms=$(stat -c "%a" "$file" 2>/dev/null || stat -f "%A" "$file" 2>/dev/null || echo "unknown")
        
        if [ "$file_perms" != "600" ]; then
            print_warning "File has permissions: $file ($file_perms) - should be 600"
            chmod 600 "$file"
            print_success "Fixed permissions for: $(basename "$file")"
        fi
    done
}

validate_google_credentials() {
    local creds_file="$SECRETS_DIR/google-credentials.json"
    
    if [ ! -f "$creds_file" ]; then
        print_warning "Google credentials file not found: $creds_file"
        return 1
    fi
    
    print_info "Validating Google credentials format..."
    
    # Check if it's valid JSON
    if ! python3 -c "import json; json.load(open('$creds_file'))" 2>/dev/null; then
        print_error "Invalid JSON format in Google credentials"
        return 1
    fi
    
    # Check required fields
    local required_fields=("type" "project_id" "private_key" "client_email")
    local valid=true
    
    for field in "${required_fields[@]}"; do
        if ! python3 -c "import json; creds=json.load(open('$creds_file')); exit(0 if '$field' in creds and creds['$field'] else 1)" 2>/dev/null; then
            print_error "Missing required field in Google credentials: $field"
            valid=false
        fi
    done
    
    if [ "$valid" = true ]; then
        print_success "Google credentials format is valid"
        return 0
    else
        return 1
    fi
}

show_secrets_status() {
    print_info "Secrets Status Report"
    echo "===================="
    echo ""
    
    # Environment file
    if [ -f "$ENV_FILE" ]; then
        print_success "Environment file: ✅ Found"
        
        # Check for template values
        if grep -q "your-.*-here\|your_.*_password\|your_.*_id" "$ENV_FILE"; then
            print_warning "Environment file contains template values"
        else
            print_success "Environment file: ✅ No template values"
        fi
    else
        print_error "Environment file: ❌ Not found"
    fi
    
    # Secrets directory
    if [ -d "$SECRETS_DIR" ]; then
        print_success "Secrets directory: ✅ Found"
        
        # List secret files
        echo ""
        echo "Secret files:"
        find "$SECRETS_DIR" -type f | while read -r file; do
            local filename=$(basename "$file")
            local size=$(stat -c %s "$file" 2>/dev/null || echo "unknown")
            echo "  • $filename ($size bytes)"
        done
        
        # Check permissions
        echo ""
        check_secret_permissions
    else
        print_error "Secrets directory: ❌ Not found"
    fi
    
    # Google credentials
    echo ""
    validate_google_credentials
    
    # SSL certificates
    echo ""
    if [ -f "$SECRETS_DIR/ssl/cert.pem" ] && [ -f "$SECRETS_DIR/ssl/key.pem" ]; then
        print_success "SSL certificates: ✅ Found"
        
        # Check certificate expiry
        local cert_file="$SECRETS_DIR/ssl/cert.pem"
        local expiry=$(openssl x509 -in "$cert_file" -noout -enddate 2>/dev/null | cut -d= -f2)
        if [ -n "$expiry" ]; then
            echo "  Certificate expires: $expiry"
        fi
    else
        print_warning "SSL certificates: ⚠️  Not found"
    fi
}

main() {
    print_header
    
    case "${1:-status}" in
        backup)
            backup_secrets
            ;;
        restore)
            restore_secrets "$2"
            ;;
        rotate)
            rotate_passwords
            ;;
        permissions)
            check_secret_permissions
            ;;
        validate)
            validate_google_credentials
            ;;
        status)
            show_secrets_status
            ;;
        *)
            echo "Usage: $0 {backup|restore|rotate|permissions|validate|status}"
            echo ""
            echo "Commands:"
            echo "  backup          Create encrypted backup of secrets"
            echo "  restore FILE    Restore secrets from encrypted backup"
            echo "  rotate          Rotate database and Redis passwords"
            echo "  permissions     Check and fix file permissions"
            echo "  validate        Validate Google credentials format"
            echo "  status          Show status of all secrets"
            echo ""
            exit 1
            ;;
    esac
}

main "$@"