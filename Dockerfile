# GoREAL Project - Main Dockerfile
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Create data and logs directories
RUN mkdir -p data logs

# Install the package in development mode
RUN pip install -e .

# Expose ports
EXPOSE 5000 8501

# Default command (can be overridden in docker-compose)
CMD ["python", "-m", "goreal.api.app"]