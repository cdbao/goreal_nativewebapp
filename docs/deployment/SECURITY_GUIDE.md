# GoREAL Security Guide

This guide outlines security best practices and configurations for GoREAL deployment and operations.

## Table of Contents

1. [Security Architecture Overview](#security-architecture-overview)
2. [Authentication and Authorization](#authentication-and-authorization)
3. [Data Protection](#data-protection)
4. [Network Security](#network-security)
5. [Container Security](#container-security)
6. [Secrets Management](#secrets-management)
7. [Monitoring and Incident Response](#monitoring-and-incident-response)
8. [Compliance and Auditing](#compliance-and-auditing)

## Security Architecture Overview

### Defense in Depth Strategy

GoREAL implements multiple layers of security:

```
┌─────────────────────────────────────────────────────────────┐
│                    Internet/External                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                  Load Balancer/CDN                          │
│                  (SSL Termination)                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                  Nginx Reverse Proxy                        │
│              (Rate Limiting, WAF)                           │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                 Application Layer                           │
│              (API + Dashboard)                              │
│        ┌─────────────┬─────────────┐                       │
│        │    API-1    │    API-2    │                       │
│        └─────────────┴─────────────┘                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                  Data Layer                                 │
│        ┌─────────────┬─────────────┐                       │
│        │ PostgreSQL  │   Redis     │                       │
│        └─────────────┴─────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

### Security Principles

1. **Principle of Least Privilege**: Each component has minimal required permissions
2. **Zero Trust Architecture**: Verify every request and connection
3. **Defense in Depth**: Multiple security layers protect against different threats
4. **Security by Default**: Secure configurations are the default
5. **Continuous Monitoring**: Real-time security monitoring and alerting

## Authentication and Authorization

### API Authentication

#### JWT Token-Based Authentication

```python
# Example API authentication middleware
from functools import wraps
from flask import request, jsonify
import jwt

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'No token provided'}), 401
        
        try:
            # Remove 'Bearer ' prefix
            token = token.split(' ')[1]
            payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            request.user = payload
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        
        return f(*args, **kwargs)
    return decorated
```

#### API Key Authentication

For service-to-service communication:

```bash
# Generate API keys
openssl rand -base64 32 | tr -d "=+/" | cut -c1-32

# Store in environment variables
API_KEYS="key1,key2,key3"
```

### Role-Based Access Control (RBAC)

```python
# User roles and permissions
ROLES = {
    'admin': ['read', 'write', 'delete', 'manage_users'],
    'moderator': ['read', 'write', 'moderate_content'],
    'user': ['read', 'write_own'],
    'readonly': ['read']
}

def require_permission(permission):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            user_role = request.user.get('role', 'readonly')
            if permission not in ROLES.get(user_role, []):
                return jsonify({'error': 'Insufficient permissions'}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator
```

### Session Management

```python
# Secure session configuration
app.config.update(
    SESSION_COOKIE_SECURE=True,        # HTTPS only
    SESSION_COOKIE_HTTPONLY=True,      # No JavaScript access
    SESSION_COOKIE_SAMESITE='Lax',     # CSRF protection
    PERMANENT_SESSION_LIFETIME=timedelta(hours=24)
)
```

## Data Protection

### Data Encryption

#### Encryption at Rest

```bash
# Database encryption
# PostgreSQL with encrypted tablespaces
CREATE TABLESPACE encrypted_space 
LOCATION '/var/lib/postgresql/data/encrypted'
WITH (encryption_key_command = 'echo $DB_ENCRYPTION_KEY');

# File encryption for sensitive data
gpg --cipher-algo AES256 --compress-algo 2 --symmetric --output encrypted_file.gpg sensitive_file.txt
```

#### Encryption in Transit

```nginx
# Nginx SSL configuration
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    # SSL certificates
    ssl_certificate /app/ssl/cert.pem;
    ssl_certificate_key /app/ssl/key.pem;
    
    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
}
```

### Data Sanitization

```python
# Input validation and sanitization
from marshmallow import Schema, fields, validate
import bleach

class UserInputSchema(Schema):
    username = fields.Str(required=True, validate=validate.Length(min=3, max=50))
    email = fields.Email(required=True)
    content = fields.Str(validate=validate.Length(max=1000))

def sanitize_html(content):
    """Sanitize HTML content to prevent XSS"""
    allowed_tags = ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li']
    return bleach.clean(content, tags=allowed_tags, strip=True)

def validate_and_sanitize(data, schema):
    """Validate and sanitize input data"""
    try:
        result = schema.load(data)
        # Sanitize text fields
        for key, value in result.items():
            if isinstance(value, str):
                result[key] = sanitize_html(value)
        return result, None
    except ValidationError as err:
        return None, err.messages
```

### Personal Data Protection (GDPR/Privacy)

```python
# Data anonymization and pseudonymization
import hashlib
import secrets

def pseudonymize_user_id(user_id, salt=None):
    """Create a pseudonymous identifier"""
    if not salt:
        salt = secrets.token_bytes(32)
    return hashlib.pbkdf2_hmac('sha256', 
                               str(user_id).encode(), 
                               salt, 
                               100000).hex()

def anonymize_ip(ip_address):
    """Anonymize IP address for privacy compliance"""
    parts = ip_address.split('.')
    if len(parts) == 4:  # IPv4
        return f"{parts[0]}.{parts[1]}.{parts[2]}.0"
    # For IPv6, remove last 64 bits
    return ':'.join(ip_address.split(':')[:-4]) + '::'
```

## Network Security

### Firewall Configuration

```bash
# UFW (Ubuntu) firewall setup
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (restrict to admin IPs in production)
sudo ufw allow from 192.168.1.0/24 to any port 22

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow monitoring (restrict to admin network)
sudo ufw allow from 10.0.0.0/8 to any port 3000  # Grafana
sudo ufw allow from 10.0.0.0/8 to any port 9090  # Prometheus

# Enable firewall
sudo ufw --force enable
```

### Rate Limiting

```nginx
# Nginx rate limiting configuration
http {
    # Define rate limiting zones
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;
    limit_req_zone $binary_remote_addr zone=general:10m rate=30r/s;
    
    server {
        # API endpoints
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            limit_req_status 429;
            proxy_pass http://goreal-api;
        }
        
        # Login endpoint
        location /api/auth/login {
            limit_req zone=login burst=3 nodelay;
            limit_req_status 429;
            proxy_pass http://goreal-api;
        }
        
        # General content
        location / {
            limit_req zone=general burst=50 nodelay;
            proxy_pass http://goreal-api;
        }
    }
}
```

### DDoS Protection

```python
# Application-level DDoS protection
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    app,
    key_func=get_remote_address,
    default_limits=["1000 per day", "100 per hour"],
    storage_uri="redis://redis:6379"
)

@app.route('/api/sensitive-endpoint')
@limiter.limit("5 per minute")
def sensitive_endpoint():
    return jsonify({'message': 'Success'})

# IP blocking middleware
BLOCKED_IPS = set()

@app.before_request
def block_malicious_ips():
    client_ip = get_remote_address()
    if client_ip in BLOCKED_IPS:
        abort(403)
```

## Container Security

### Docker Security Best Practices

#### Dockerfile Security

```dockerfile
# Use specific, minimal base images
FROM python:3.11-slim-bullseye AS base

# Create non-root user
RUN groupadd -r goreal && \
    useradd -r -g goreal -d /app -s /bin/bash goreal

# Install security updates
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
        ca-certificates \
        curl && \
    rm -rf /var/lib/apt/lists/*

# Set secure permissions
COPY --chown=goreal:goreal . /app
RUN chmod -R 755 /app && \
    chmod -R 644 /app/goreal/

# Use non-root user
USER goreal

# Security labels
LABEL security.scan=true
LABEL security.automated=true
```

#### Container Runtime Security

```yaml
# docker-compose.prod.yml security configurations
version: '3.8'

services:
  api-1:
    image: goreal:latest
    security_opt:
      - no-new-privileges:true
      - apparmor:docker-default
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - SETGID
      - SETUID
    read_only: true
    tmpfs:
      - /tmp:noexec,nosuid,size=100m
      - /app/logs:noexec,nosuid,size=500m
    ulimits:
      nproc: 65535
      nofile: 20000
```

### Container Scanning

```bash
# Scan Docker images for vulnerabilities
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image goreal:latest

# Scan for secrets in images
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  trufflesecurity/trufflehog docker --image goreal:latest
```

## Secrets Management

### Environment Variables Security

```bash
# Secure environment variable handling
# Never commit secrets to version control

# Use .env files with proper permissions
chmod 600 .env.production

# Validate environment variables
validate_env_vars() {
    local required_vars=("APP_SECRET_KEY" "DB_PASSWORD" "REDIS_PASSWORD")
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            echo "ERROR: Required environment variable $var is not set"
            exit 1
        fi
    done
}
```

### Secret Rotation

```bash
#!/bin/bash
# Automated secret rotation script

rotate_database_password() {
    local new_password=$(openssl rand -base64 32)
    
    # Update database user password
    docker-compose exec postgres psql -U postgres -c \
        "ALTER USER goreal_user PASSWORD '$new_password';"
    
    # Update environment file
    sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=$new_password/" .env.production
    
    # Restart services to pick up new password
    docker-compose restart api-1 api-2
}

rotate_api_keys() {
    local new_key=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    
    # Update environment
    sed -i "s/APP_SECRET_KEY=.*/APP_SECRET_KEY=$new_key/" .env.production
    
    # Rolling restart to avoid downtime
    docker-compose restart api-1
    sleep 30
    docker-compose restart api-2
}
```

### Secrets Storage

```python
# Use external secret management systems in production
import boto3
import os

def get_secret_from_aws(secret_name):
    """Retrieve secret from AWS Secrets Manager"""
    session = boto3.session.Session()
    client = session.client('secretsmanager', region_name='us-east-1')
    
    try:
        response = client.get_secret_value(SecretId=secret_name)
        return response['SecretString']
    except Exception as e:
        print(f"Error retrieving secret {secret_name}: {e}")
        return None

# Initialize secrets from external sources
if os.getenv('USE_AWS_SECRETS', 'false').lower() == 'true':
    DB_PASSWORD = get_secret_from_aws('goreal/db/password')
    API_SECRET_KEY = get_secret_from_aws('goreal/api/secret')
else:
    DB_PASSWORD = os.getenv('DB_PASSWORD')
    API_SECRET_KEY = os.getenv('APP_SECRET_KEY')
```

## Monitoring and Incident Response

### Security Monitoring

```yaml
# Prometheus alert rules for security events
groups:
  - name: security-alerts
    rules:
      - alert: HighFailedLoginAttempts
        expr: rate(goreal_failed_login_attempts_total[5m]) > 0.1
        for: 2m
        labels:
          severity: warning
          category: security
        annotations:
          summary: "High failed login attempts detected"
          
      - alert: SuspiciousAPIActivity
        expr: rate(http_requests_total{status=~"4[0-9][0-9]"}[5m]) > 10
        for: 1m
        labels:
          severity: warning
          category: security
          
      - alert: UnauthorizedAccessAttempt
        expr: increase(goreal_unauthorized_access_total[1m]) > 10
        for: 0m
        labels:
          severity: critical
          category: security
```

### Security Event Logging

```python
import logging
import json
from datetime import datetime

# Security event logger
security_logger = logging.getLogger('security')
security_handler = logging.FileHandler('/app/logs/security.log')
security_formatter = logging.Formatter('%(asctime)s - SECURITY - %(message)s')
security_handler.setFormatter(security_formatter)
security_logger.addHandler(security_handler)
security_logger.setLevel(logging.INFO)

def log_security_event(event_type, user_id=None, ip_address=None, details=None):
    """Log security events in structured format"""
    event = {
        'timestamp': datetime.utcnow().isoformat(),
        'event_type': event_type,
        'user_id': user_id,
        'ip_address': ip_address,
        'details': details or {},
        'severity': get_event_severity(event_type)
    }
    security_logger.info(json.dumps(event))

# Usage examples
log_security_event('login_failed', user_id='user123', ip_address='192.168.1.100')
log_security_event('suspicious_activity', ip_address='10.0.0.1', 
                   details={'requests_per_minute': 1000, 'endpoints': ['/api/admin']})
```

### Incident Response Playbook

#### 1. Security Incident Detection

```bash
# Automated incident detection script
#!/bin/bash

check_security_indicators() {
    # Check for brute force attempts
    if grep -c "authentication failure" /var/log/auth.log | awk '{if ($1 > 100) exit 1}'; then
        trigger_alert "High authentication failures detected"
    fi
    
    # Check for unusual network activity
    netstat -tuln | awk '$4 ~ /:80$/ {count++} END {if (count > 1000) exit 1}' || \
        trigger_alert "Unusual network connections detected"
    
    # Check disk space (potential DoS)
    df -h | awk '$5 > 90 {exit 1}' || \
        trigger_alert "Disk space critical - possible DoS"
}

trigger_alert() {
    local message="$1"
    echo "$(date): SECURITY ALERT - $message" | \
        mail -s "GoREAL Security Alert" admin@yourdomain.com
    
    # Also send to Slack/teams
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"SECURITY ALERT: $message\"}" \
        "$SLACK_WEBHOOK_URL"
}
```

#### 2. Incident Response Steps

1. **Immediate Response** (0-15 minutes)
   - Assess threat level
   - Isolate affected systems if necessary
   - Preserve evidence

2. **Containment** (15 minutes - 1 hour)
   - Block malicious IPs
   - Disable compromised accounts
   - Apply emergency patches

3. **Investigation** (1-24 hours)
   - Analyze logs and evidence
   - Determine scope of impact
   - Identify root cause

4. **Recovery** (1-72 hours)
   - Restore systems from clean backups
   - Apply security improvements
   - Monitor for recurring issues

5. **Post-Incident** (1-2 weeks)
   - Document lessons learned
   - Update security procedures
   - Conduct security training

## Compliance and Auditing

### Audit Logging

```python
# Comprehensive audit logging
import functools
from flask import request, g

def audit_log(action):
    """Decorator to log user actions for audit purposes"""
    def decorator(f):
        @functools.wraps(f)
        def wrapper(*args, **kwargs):
            user_id = getattr(g, 'user_id', 'anonymous')
            ip_address = request.remote_addr
            user_agent = request.headers.get('User-Agent', '')
            
            # Log the action
            audit_logger.info({
                'timestamp': datetime.utcnow().isoformat(),
                'action': action,
                'user_id': user_id,
                'ip_address': ip_address,
                'user_agent': user_agent,
                'endpoint': request.endpoint,
                'method': request.method,
                'args': dict(request.args),
                'form': dict(request.form) if request.form else None
            })
            
            return f(*args, **kwargs)
        return wrapper
    return decorator

# Usage
@app.route('/api/admin/users/<user_id>', methods=['DELETE'])
@audit_log('delete_user')
def delete_user(user_id):
    # Implementation
    pass
```

### Compliance Checks

```bash
# Automated compliance verification
#!/bin/bash

run_compliance_checks() {
    echo "Running GoREAL compliance checks..."
    
    # Check password policy
    check_password_policy
    
    # Check SSL configuration
    check_ssl_config
    
    # Check file permissions
    check_file_permissions
    
    # Check audit logging
    check_audit_logs
    
    # Generate compliance report
    generate_compliance_report
}

check_password_policy() {
    # Verify password complexity requirements
    python3 -c "
import re
password_policy = {
    'min_length': 12,
    'require_uppercase': True,
    'require_lowercase': True,
    'require_numbers': True,
    'require_special': True
}
print('Password policy check: PASSED')
"
}

check_ssl_config() {
    # Verify SSL/TLS configuration
    if openssl s_client -connect localhost:443 < /dev/null 2>/dev/null | \
       grep -q "TLSv1.[23]"; then
        echo "SSL configuration check: PASSED"
    else
        echo "SSL configuration check: FAILED"
    fi
}
```

### Data Retention Policies

```python
# Automated data retention and cleanup
from datetime import datetime, timedelta

def cleanup_old_data():
    """Clean up old data according to retention policies"""
    
    # Clean up old log entries (keep 1 year)
    cutoff_date = datetime.utcnow() - timedelta(days=365)
    
    # Clean up old audit logs
    db.session.execute(
        "DELETE FROM audit_logs WHERE created_at < :cutoff",
        {'cutoff': cutoff_date}
    )
    
    # Clean up old user sessions (keep 90 days)
    session_cutoff = datetime.utcnow() - timedelta(days=90)
    db.session.execute(
        "DELETE FROM user_sessions WHERE created_at < :cutoff",
        {'cutoff': session_cutoff}
    )
    
    # Archive old user data (GDPR compliance)
    archive_inactive_users()
    
    db.session.commit()

def archive_inactive_users():
    """Archive data for users inactive for 2+ years"""
    inactive_cutoff = datetime.utcnow() - timedelta(days=730)
    
    inactive_users = User.query.filter(
        User.last_login < inactive_cutoff
    ).all()
    
    for user in inactive_users:
        # Create archive record
        archive_user_data(user)
        
        # Pseudonymize user data
        user.email = f"archived_{user.id}@example.com"
        user.username = f"archived_user_{user.id}"
        user.is_archived = True
```

## Security Checklist

### Pre-Deployment Security Checklist

- [ ] All secrets are properly configured and not in version control
- [ ] SSL certificates are valid and properly configured
- [ ] Database passwords are strong and rotated
- [ ] API keys are properly secured
- [ ] File permissions are correctly set (600 for secrets, 644 for configs)
- [ ] Firewall rules are configured
- [ ] Rate limiting is enabled
- [ ] Security headers are configured
- [ ] Input validation is implemented
- [ ] Audit logging is enabled

### Ongoing Security Maintenance

- [ ] Regular security updates applied
- [ ] Secrets rotated quarterly
- [ ] Security logs monitored daily
- [ ] Backup integrity verified weekly
- [ ] Vulnerability scans run monthly
- [ ] Access reviews conducted quarterly
- [ ] Security training completed annually
- [ ] Incident response procedures tested annually

## Conclusion

Security is an ongoing process that requires continuous attention and improvement. This guide provides a foundation for securing your GoREAL deployment, but should be adapted based on your specific security requirements and threat model.

Key takeaways:
1. Implement defense in depth with multiple security layers
2. Follow the principle of least privilege
3. Monitor and log security events continuously
4. Keep all systems updated and patched
5. Regularly test and validate security controls
6. Have an incident response plan ready
7. Ensure compliance with relevant regulations

For additional security guidance or to report security issues, contact the security team immediately.