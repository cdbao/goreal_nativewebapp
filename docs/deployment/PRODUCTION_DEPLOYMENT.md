# GoREAL Production Deployment Guide

This guide provides comprehensive instructions for deploying GoREAL to a production environment.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Security Configuration](#security-configuration)
4. [Deployment Process](#deployment-process)
5. [Monitoring and Health Checks](#monitoring-and-health-checks)
6. [Maintenance and Operations](#maintenance-and-operations)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Operating System**: Ubuntu 20.04 LTS or newer, CentOS 8+, or similar Linux distribution
- **CPU**: Minimum 2 cores, recommended 4+ cores
- **RAM**: Minimum 4GB, recommended 8GB+
- **Storage**: Minimum 50GB free space for application and logs
- **Network**: Stable internet connection with required ports open

### Required Software

- Docker 20.10+ and Docker Compose 2.0+
- Git for version control
- OpenSSL for certificate management
- curl and wget for testing

### Installation Commands

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-plugin git openssl curl wget

# CentOS/RHEL
sudo yum install -y docker docker-compose git openssl curl wget
sudo systemctl enable --now docker

# Add current user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

## Environment Setup

### 1. Clone the Repository

```bash
git clone <your-goreal-repo-url>
cd goreal-project
git checkout main  # or your production branch
```

### 2. Environment Configuration

Run the environment setup script:

```bash
./deploy/scripts/setup-env.sh
```

This script will:
- Create `.env.production` from template
- Generate secure passwords and secret keys
- Set up the secrets directory
- Create SSL certificates (self-signed for development)

### 3. Manual Configuration

Edit `.env.production` and update the following values:

```bash
# Google Sheets Integration
GOOGLE_SHEETS_SPREADSHEET_ID=your_actual_spreadsheet_id

# Roblox API (if applicable)  
ROBLOX_API_KEY=your_actual_api_key

# Domain Configuration
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Email/SMTP Settings for notifications
GRAFANA_SMTP_HOST=your.smtp.server.com:587
GRAFANA_SMTP_USER=your_email@yourdomain.com
GRAFANA_SMTP_PASSWORD=your_email_password
```

### 4. Google Service Account Setup

1. Create a Google Cloud Project
2. Enable Google Sheets API
3. Create a Service Account and download JSON credentials
4. Copy credentials to: `secrets/google-credentials.json`
5. Share your Google Sheet with the service account email

## Security Configuration

### 1. SSL Certificates

For production, replace self-signed certificates with valid SSL certificates:

```bash
# Copy your certificates
cp /path/to/your/cert.pem secrets/ssl/cert.pem
cp /path/to/your/private.key secrets/ssl/key.pem

# Set correct permissions
chmod 644 secrets/ssl/cert.pem
chmod 600 secrets/ssl/key.pem
```

### 2. Secrets Management

Use the secrets manager for secure operations:

```bash
# Check secrets status
./deploy/scripts/secrets-manager.sh status

# Create encrypted backup
./deploy/scripts/secrets-manager.sh backup

# Rotate passwords
./deploy/scripts/secrets-manager.sh rotate
```

### 3. Firewall Configuration

Configure your firewall to allow required ports:

```bash
# Basic firewall setup (Ubuntu/UFW)
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw allow 3000/tcp # Grafana (restrict to admin IPs)
sudo ufw allow 9090/tcp # Prometheus (restrict to admin IPs)
```

## Deployment Process

### 1. Pre-deployment Validation

Validate your environment before deployment:

```bash
# Validate environment configuration
./deploy/scripts/validate-env.sh

# Check system resources
docker system df
df -h
free -h
```

### 2. Initial Deployment

For the first deployment:

```bash
# Deploy the application
./deploy/scripts/deploy.sh

# The script will:
# - Check prerequisites
# - Create backup (if existing deployment)
# - Build production images
# - Deploy services with zero-downtime strategy
# - Run database migrations
# - Verify deployment
# - Clean up old resources
```

### 3. Subsequent Deployments

For updates and new versions:

```bash
# Deploy specific version
./deploy/scripts/deploy.sh --version v2.1.0

# Deploy with custom environment
./deploy/scripts/deploy.sh --env production --version latest
```

### 4. Deployment Verification

After deployment, verify all services:

```bash
# Check service status
docker-compose -f docker-compose.prod.yml ps

# Test endpoints
curl -f http://localhost/health
curl -f http://localhost:8501/

# Check logs
docker-compose -f docker-compose.prod.yml logs -f --tail=50
```

## Monitoring and Health Checks

### 1. Setup Monitoring Stack

Deploy comprehensive monitoring:

```bash
# Setup and start monitoring services
./deploy/scripts/monitoring-setup.sh
```

### 2. Access Monitoring Services

- **Grafana Dashboard**: http://localhost:3000 (admin/password from setup)
- **Prometheus**: http://localhost:9090
- **Alertmanager**: http://localhost:9093

### 3. Configure Alerts

Edit `deploy/monitoring/alertmanager.yml` for notifications:

```yaml
receivers:
  - name: 'web.hook'
    email_configs:
      - to: 'admin@yourdomain.com'
        subject: '[GoREAL] Alert'
    slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK_URL'
        channel: '#alerts'
```

### 4. Health Check Endpoints

The application provides several health check endpoints:

- **API Health**: `GET /health`
- **Database Health**: `GET /health/database` 
- **Redis Health**: `GET /health/redis`
- **Full System Health**: `GET /health/full`

## Maintenance and Operations

### 1. Backup Operations

#### Automated Backups

Backups are created automatically during deployments. Manual backup:

```bash
# Create manual backup
./deploy/scripts/deploy.sh --backup-only

# List available backups
./deploy/scripts/rollback.sh --list
```

#### Backup Verification

```bash
# Verify backup integrity
ls -la backups/
./deploy/scripts/secrets-manager.sh backup  # For secrets
```

### 2. Log Management

#### Log Locations

```bash
# Application logs
docker-compose -f docker-compose.prod.yml logs api-1
docker-compose -f docker-compose.prod.yml logs api-2
docker-compose -f docker-compose.prod.yml logs dashboard

# System logs via Loki/Grafana
# Access via Grafana -> Explore -> Loki datasource
```

#### Log Rotation

Configure log rotation to prevent disk space issues:

```bash
# Create logrotate configuration
sudo tee /etc/logrotate.d/goreal << EOF
/var/lib/docker/containers/*/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
EOF
```

### 3. Database Maintenance

#### Regular Maintenance Tasks

```bash
# Database health check
docker-compose -f docker-compose.prod.yml exec postgres psql -U goreal_user -d goreal_db -c "SELECT version();"

# Database backup
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U goreal_user goreal_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Database statistics
docker-compose -f docker-compose.prod.yml exec postgres psql -U goreal_user -d goreal_db -c "SELECT schemaname,tablename,n_tup_ins,n_tup_upd,n_tup_del FROM pg_stat_user_tables;"
```

### 4. Security Updates

#### Regular Security Maintenance

```bash
# Update system packages
sudo apt-get update && sudo apt-get upgrade -y

# Update Docker images
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Rotate secrets periodically
./deploy/scripts/secrets-manager.sh rotate
```

## Troubleshooting

### Common Issues

#### 1. Service Won't Start

```bash
# Check service logs
docker-compose -f docker-compose.prod.yml logs [service-name]

# Check resource usage
docker stats

# Check disk space
df -h
```

#### 2. Database Connection Issues

```bash
# Test database connectivity
docker-compose -f docker-compose.prod.yml exec api-1 python -c "
from goreal.core.database import get_db_connection
try:
    conn = get_db_connection()
    print('✅ Database connection successful')
    conn.close()
except Exception as e:
    print(f'❌ Database connection failed: {e}')
"
```

#### 3. High Memory Usage

```bash
# Check memory usage by container
docker stats --no-stream

# Restart memory-hungry services
docker-compose -f docker-compose.prod.yml restart api-1 api-2
```

#### 4. SSL Certificate Issues

```bash
# Check certificate validity
openssl x509 -in secrets/ssl/cert.pem -text -noout

# Test SSL connection
openssl s_client -connect localhost:443 -servername yourdomain.com
```

### Emergency Procedures

#### 1. Quick Rollback

If deployment fails or issues arise:

```bash
# Immediate rollback to last working version
./deploy/scripts/rollback.sh

# Rollback to specific backup
./deploy/scripts/rollback.sh deployment-20231201-143022
```

#### 2. Service Recovery

For individual service failures:

```bash
# Restart specific service
docker-compose -f docker-compose.prod.yml restart api-1

# Recreate service with fresh container
docker-compose -f docker-compose.prod.yml up -d --force-recreate api-1
```

#### 3. Data Recovery

For data corruption or loss:

```bash
# Restore from latest backup
./deploy/scripts/rollback.sh

# Restore specific database backup
docker-compose -f docker-compose.prod.yml exec postgres psql -U goreal_user -d goreal_db < backup_file.sql
```

### Getting Help

#### Log Analysis

```bash
# Comprehensive log collection
./deploy/scripts/collect-logs.sh

# Check system health
./deploy/scripts/health-check.sh --full
```

#### Support Information

When seeking support, provide:
1. System information (`uname -a`, `docker version`)
2. Service status (`docker-compose ps`)
3. Recent logs (last 100 lines from affected services)
4. Error messages and stack traces
5. Steps to reproduce the issue

## Performance Optimization

### 1. Resource Tuning

```bash
# Monitor resource usage
docker stats
htop

# Adjust worker counts in .env.production
WORKERS=8  # Adjust based on CPU cores
WORKER_CONNECTIONS=2000
```

### 2. Database Optimization

```bash
# Check database performance
docker-compose -f docker-compose.prod.yml exec postgres psql -U goreal_user -d goreal_db -c "
SELECT query, calls, mean_time, total_time 
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;"
```

### 3. Monitoring Performance

Use Grafana dashboards to monitor:
- Response times and request rates
- Database query performance
- Resource utilization (CPU, memory, disk)
- Error rates and availability

## Security Best Practices

1. **Regular Updates**: Keep all software components updated
2. **Access Control**: Use strong passwords and limit access
3. **Network Security**: Configure firewalls and use HTTPS
4. **Secret Management**: Rotate secrets regularly and never commit them to version control
5. **Monitoring**: Set up comprehensive logging and alerting
6. **Backups**: Maintain regular backups and test recovery procedures
7. **Audit Logs**: Monitor access logs and audit trails

## Conclusion

This deployment guide covers the essential aspects of running GoREAL in production. For additional support or questions, refer to the project documentation or contact the development team.

Remember to:
- Test deployments in a staging environment first
- Maintain regular backups
- Monitor system health continuously
- Keep security practices up to date
- Document any customizations or configuration changes