#!/bin/bash
# GoREAL Production Entrypoint Script
set -e

echo "🚀 Starting GoREAL Production Application..."

# Wait for dependencies
if [ -n "$DATABASE_URL" ]; then
    echo "⏳ Waiting for database..."
    /wait-for-it.sh ${DATABASE_URL##*@} --timeout=60 --strict -- echo "✅ Database is ready"
fi

if [ -n "$REDIS_URL" ]; then
    redis_host=$(echo $REDIS_URL | cut -d'/' -f3 | cut -d':' -f1)
    redis_port=$(echo $REDIS_URL | cut -d'/' -f3 | cut -d':' -f2)
    echo "⏳ Waiting for Redis..."
    /wait-for-it.sh $redis_host:$redis_port --timeout=60 --strict -- echo "✅ Redis is ready"
fi

# Initialize database if needed
if [ "$1" = "gunicorn" ] && [ "${INSTANCE_ID}" = "api-1" ]; then
    echo "🔧 Initializing database..."
    python -c "
from goreal.core.database import create_tables
try:
    create_tables()
    print('✅ Database initialized successfully')
except Exception as e:
    print(f'⚠️  Database initialization warning: {e}')
"
fi

# Create necessary directories
mkdir -p /app/logs /app/tmp

# Set up logging
export PYTHONPATH="/app:$PYTHONPATH"
export LOG_FILE="/app/logs/goreal-${INSTANCE_ID:-app}.log"

# Handle different service types
case "$1" in
    gunicorn)
        echo "🌐 Starting Gunicorn API server (Instance: ${INSTANCE_ID:-default})..."
        exec gunicorn \
            --bind 0.0.0.0:8000 \
            --workers ${WORKERS:-4} \
            --worker-class ${WORKER_CLASS:-gevent} \
            --worker-connections ${WORKER_CONNECTIONS:-1000} \
            --max-requests ${MAX_REQUESTS:-1000} \
            --max-requests-jitter ${MAX_REQUESTS_JITTER:-100} \
            --timeout ${TIMEOUT:-30} \
            --keepalive ${KEEPALIVE:-2} \
            --preload ${PRELOAD:-true} \
            --access-logfile /app/logs/access.log \
            --error-logfile /app/logs/error.log \
            --log-level ${LOG_LEVEL:-info} \
            --capture-output \
            "goreal.api.app:create_app()"
        ;;
    streamlit)
        echo "📊 Starting Streamlit Dashboard..."
        exec streamlit run goreal/dashboard/app.py \
            --server.port=${STREAMLIT_SERVER_PORT:-8501} \
            --server.address=${STREAMLIT_SERVER_ADDRESS:-0.0.0.0} \
            --server.headless=${STREAMLIT_SERVER_HEADLESS:-true} \
            --browser.gatherUsageStats=${STREAMLIT_BROWSER_GATHER_USAGE_STATS:-false} \
            --logger.level=${LOG_LEVEL:-info}
        ;;
    worker)
        echo "⚙️ Starting background worker..."
        # Add worker process if needed
        exec python -m goreal.worker
        ;;
    bash|sh)
        echo "🐚 Starting interactive shell..."
        exec /bin/bash
        ;;
    *)
        echo "🔧 Running custom command: $@"
        exec "$@"
        ;;
esac