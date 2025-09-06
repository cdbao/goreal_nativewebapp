#!/bin/bash
# GoREAL Production Health Check Script
set -e

# Configuration
HOST=${HEALTH_CHECK_HOST:-localhost}
PORT=${HEALTH_CHECK_PORT:-8000}
ENDPOINT=${HEALTH_CHECK_ENDPOINT:-/health}
TIMEOUT=${HEALTH_CHECK_TIMEOUT:-10}

# Health check function
check_health() {
    local url="http://${HOST}:${PORT}${ENDPOINT}"
    
    # Use curl to check health endpoint
    response=$(curl -s -w "%{http_code}" -o /tmp/health_response --max-time $TIMEOUT "$url" || echo "000")
    
    if [ "$response" = "200" ]; then
        # Check if response contains expected health indicators
        if grep -q '"status".*"healthy"' /tmp/health_response 2>/dev/null; then
            echo "✅ Health check passed"
            rm -f /tmp/health_response
            exit 0
        else
            echo "❌ Health check failed: Invalid response format"
            cat /tmp/health_response 2>/dev/null || echo "No response body"
            rm -f /tmp/health_response
            exit 1
        fi
    else
        echo "❌ Health check failed: HTTP $response"
        cat /tmp/health_response 2>/dev/null || echo "No response body"
        rm -f /tmp/health_response
        exit 1
    fi
}

# Additional checks
check_dependencies() {
    # Check if process is running
    if ! pgrep -f "gunicorn\|streamlit" > /dev/null; then
        echo "❌ Application process not found"
        exit 1
    fi
    
    # Check disk space
    disk_usage=$(df /app | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt 90 ]; then
        echo "⚠️  Warning: Disk usage is ${disk_usage}%"
    fi
    
    # Check memory usage
    if command -v free >/dev/null 2>&1; then
        memory_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
        if [ "$memory_usage" -gt 90 ]; then
            echo "⚠️  Warning: Memory usage is ${memory_usage}%"
        fi
    fi
}

# Run checks
echo "🔍 Running health checks..."

# Basic dependency checks
check_dependencies

# Main health endpoint check
check_health