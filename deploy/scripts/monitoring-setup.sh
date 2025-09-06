#!/bin/bash
# GoREAL Monitoring Setup Script
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
MONITORING_DIR="$PROJECT_ROOT/deploy/monitoring"

print_header() {
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}                ${CYAN}📊 GoREAL Monitoring Setup${NC}                     ${BLUE}║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
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

check_prerequisites() {
    print_step "1" "Checking Prerequisites"
    
    # Check required commands
    local required_commands=("docker" "docker-compose")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            print_error "$cmd is required but not installed"
            exit 1
        fi
    done
    print_success "All required commands are available"
    
    # Check Docker is running
    if ! docker info &> /dev/null; then
        print_error "Docker is not running"
        exit 1
    fi
    print_success "Docker is running"
}

create_monitoring_configs() {
    print_step "2" "Creating Monitoring Configurations"
    
    # Create Grafana datasources configuration
    cat > "$MONITORING_DIR/grafana-datasources.yml" << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false

  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    editable: false

  - name: Jaeger
    type: jaeger
    access: proxy
    url: http://jaeger:16686
    editable: false
EOF

    # Create Alertmanager configuration
    cat > "$MONITORING_DIR/alertmanager.yml" << 'EOF'
global:
  smtp_smarthost: 'localhost:587'
  smtp_from: 'alertmanager@yourdomain.com'
  smtp_auth_username: ''
  smtp_auth_password: ''

route:
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: web.hook

receivers:
  - name: 'web.hook'
    email_configs:
      - to: 'admin@yourdomain.com'
        subject: '[GoREAL] Alert: {{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          Details:
          {{ range .Labels.SortedPairs }} - {{ .Name }}: {{ .Value }}
          {{ end }}
          {{ end }}
    
    slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK_URL'
        channel: '#alerts'
        title: 'GoREAL Alert'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}: {{ .Annotations.description }}{{ end }}'

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'cluster', 'service']
EOF

    # Create Loki configuration
    cat > "$MONITORING_DIR/loki-config.yml" << 'EOF'
auth_enabled: false

server:
  http_listen_port: 3100
  grpc_listen_port: 9096

ingester:
  wal:
    enabled: true
    dir: /loki/wal
  lifecycler:
    address: 127.0.0.1
    ring:
      kvstore:
        store: inmemory
      replication_factor: 1
    final_sleep: 0s
  chunk_idle_period: 1h
  max_chunk_age: 1h
  chunk_target_size: 1048576
  chunk_retain_period: 30s
  max_transfer_retries: 0

schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

storage_config:
  boltdb_shipper:
    active_index_directory: /loki/boltdb-shipper-active
    cache_location: /loki/boltdb-shipper-cache
    cache_ttl: 24h
    shared_store: filesystem
  filesystem:
    directory: /loki/chunks

compactor:
  working_directory: /loki/boltdb-shipper-compactor
  shared_store: filesystem

limits_config:
  reject_old_samples: true
  reject_old_samples_max_age: 168h

chunk_store_config:
  max_look_back_period: 0s

table_manager:
  retention_deletes_enabled: false
  retention_period: 0s

ruler:
  storage:
    type: local
    local:
      directory: /loki/rules
  rule_path: /loki/rules
  alertmanager_url: http://alertmanager:9093
  ring:
    kvstore:
      store: inmemory
  enable_api: true
EOF

    # Create Promtail configuration
    cat > "$MONITORING_DIR/promtail-config.yml" << 'EOF'
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: containers
    static_configs:
      - targets:
          - localhost
        labels:
          job: containerlogs
          __path__: /var/lib/docker/containers/*/*log

    pipeline_stages:
      - json:
          expressions:
            output: log
            stream: stream
            attrs:
      - json:
          expressions:
            tag:
          source: attrs
      - regex:
          expression: (?P<container_name>(?:[^|])*[^|])
          source: tag
      - timestamp:
          format: RFC3339Nano
          source: time
      - labels:
          stream:
          container_name:
      - output:
          source: output

  - job_name: goreal-logs
    static_configs:
      - targets:
          - localhost
        labels:
          job: goreal
          __path__: /app/logs/*.log
    pipeline_stages:
      - match:
          selector: '{job="goreal"}'
          stages:
            - regex:
                expression: '(?P<timestamp>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}),(?P<ms>\d{3}) - (?P<level>\w+) - (?P<logger>[\w.]+) - (?P<message>.*)'
            - timestamp:
                format: '2006-01-02 15:04:05'
                source: timestamp
            - labels:
                level:
                logger:
EOF

    print_success "Monitoring configurations created"
}

setup_monitoring_environment() {
    print_step "3" "Setting up Monitoring Environment"
    
    cd "$MONITORING_DIR"
    
    # Load production environment
    if [ -f "$PROJECT_ROOT/.env.production" ]; then
        source "$PROJECT_ROOT/.env.production"
    fi
    
    # Set default Grafana password if not set
    if [ -z "$GRAFANA_ADMIN_PASSWORD" ]; then
        export GRAFANA_ADMIN_PASSWORD="goreal-admin-$(openssl rand -base64 8 | tr -d '=+/')"
        print_info "Generated Grafana admin password: $GRAFANA_ADMIN_PASSWORD"
        print_warning "Save this password - it's needed to access Grafana"
    fi
    
    # Pull monitoring images
    print_info "Pulling monitoring images..."
    docker-compose -f docker-compose.monitoring.yml pull
    
    print_success "Monitoring environment setup complete"
}

start_monitoring_stack() {
    print_step "4" "Starting Monitoring Stack"
    
    cd "$MONITORING_DIR"
    
    # Start monitoring services
    print_info "Starting monitoring services..."
    docker-compose -f docker-compose.monitoring.yml up -d
    
    # Wait for services to be ready
    print_info "Waiting for services to start..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        local healthy_count=$(docker-compose -f docker-compose.monitoring.yml ps | grep "healthy" | wc -l)
        
        if [ $healthy_count -ge 3 ]; then  # At least 3 core services healthy
            print_success "Monitoring services are healthy"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            print_warning "Some monitoring services may still be starting"
            break
        fi
        
        print_info "Waiting for services... (attempt $attempt/$max_attempts)"
        sleep 10
        ((attempt++))
    done
    
    print_success "Monitoring stack started"
}

configure_grafana_dashboards() {
    print_step "5" "Configuring Grafana Dashboards"
    
    # Wait for Grafana to be fully ready
    print_info "Waiting for Grafana API to be ready..."
    local max_attempts=20
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "http://localhost:3000/api/health" > /dev/null 2>&1; then
            print_success "Grafana API is ready"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            print_warning "Grafana API not responding, dashboards may need manual import"
            return 0
        fi
        
        sleep 5
        ((attempt++))
    done
    
    # Import dashboards via API
    print_info "Importing Grafana dashboards..."
    
    local dashboard_files=("$MONITORING_DIR/grafana-dashboards"/*.json)
    for dashboard_file in "${dashboard_files[@]}"; do
        if [ -f "$dashboard_file" ]; then
            local dashboard_name=$(basename "$dashboard_file" .json)
            
            # Import dashboard using Grafana API
            curl -X POST \
                -H "Content-Type: application/json" \
                -u "admin:${GRAFANA_ADMIN_PASSWORD:-admin}" \
                -d @"$dashboard_file" \
                "http://localhost:3000/api/dashboards/db" \
                > /dev/null 2>&1
            
            if [ $? -eq 0 ]; then
                print_success "Imported dashboard: $dashboard_name"
            else
                print_warning "Failed to import dashboard: $dashboard_name (will be available in provisioning directory)"
            fi
        fi
    done
}

verify_monitoring_setup() {
    print_step "6" "Verifying Monitoring Setup"
    
    # Test monitoring endpoints
    local services=(
        "Prometheus:http://localhost:9090/-/healthy"
        "Grafana:http://localhost:3000/api/health" 
        "Alertmanager:http://localhost:9093/-/healthy"
        "Node Exporter:http://localhost:9100/metrics"
    )
    
    local success=true
    for service_info in "${services[@]}"; do
        local service_name=$(echo "$service_info" | cut -d: -f1)
        local service_url=$(echo "$service_info" | cut -d: -f2-)
        
        print_info "Testing $service_name..."
        if curl -f -s "$service_url" > /dev/null 2>&1; then
            print_success "✅ $service_name is responding"
        else
            print_warning "⚠️  $service_name is not responding"
            success=false
        fi
    done
    
    if [ "$success" = true ]; then
        print_success "All monitoring services are responding"
    else
        print_warning "Some monitoring services may still be starting"
    fi
}

show_monitoring_summary() {
    echo ""
    print_success "📊 Monitoring Setup Complete!"
    echo ""
    echo -e "${CYAN}Monitoring Services:${NC}"
    echo "==================="
    echo "• Prometheus: http://localhost:9090"
    echo "• Grafana: http://localhost:3000"
    echo "• Alertmanager: http://localhost:9093"
    echo "• Node Exporter: http://localhost:9100"
    echo ""
    echo -e "${CYAN}Grafana Login:${NC}"
    echo "=============="
    echo "• Username: admin"
    echo "• Password: ${GRAFANA_ADMIN_PASSWORD:-admin}"
    echo ""
    echo -e "${CYAN}Management Commands:${NC}"
    echo "===================="
    echo "• View monitoring logs: cd deploy/monitoring && docker-compose -f docker-compose.monitoring.yml logs -f"
    echo "• Stop monitoring: cd deploy/monitoring && docker-compose -f docker-compose.monitoring.yml down"
    echo "• Restart monitoring: cd deploy/monitoring && docker-compose -f docker-compose.monitoring.yml restart"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "==========="
    echo "1. Configure Slack/email notifications in alertmanager.yml"
    echo "2. Customize alert rules in alert-rules.yml" 
    echo "3. Import additional Grafana dashboards as needed"
    echo "4. Set up log rotation for monitoring data"
}

main() {
    print_header
    
    check_prerequisites
    create_monitoring_configs
    setup_monitoring_environment
    start_monitoring_stack
    configure_grafana_dashboards
    verify_monitoring_setup
    
    show_monitoring_summary
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-start)
            SKIP_START=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --skip-start    Setup configs only, don't start services"
            echo "  --help         Show this help message"
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