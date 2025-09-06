#!/bin/bash

# GoREAL Deployment Script
# Author: ClaudeCode
# Description: Script để deploy dự án GoREAL lên Google Cloud Platform

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print with colors
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
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

# Check if required tools are installed
check_requirements() {
    print_info "Checking requirements..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    if ! command -v gcloud &> /dev/null; then
        print_error "Google Cloud CLI is not installed"
        exit 1
    fi
    
    if ! command -v firebase &> /dev/null; then
        print_warning "Firebase CLI is not installed. Installing..."
        npm install -g firebase-tools
    fi
    
    print_success "All requirements are satisfied"
}

# Deploy frontend to Firebase Hosting
deploy_frontend() {
    print_info "Deploying frontend to Firebase Hosting..."
    
    cd frontend
    
    # Check if .env file exists
    if [ ! -f ".env" ]; then
        print_error ".env file not found in frontend directory"
        print_info "Please create .env file based on .env.example"
        exit 1
    fi
    
    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        print_info "Installing frontend dependencies..."
        npm install
    fi
    
    # Build the project
    print_info "Building frontend..."
    npm run build
    
    # Initialize Firebase if not already done
    if [ ! -f "firebase.json" ]; then
        print_info "Initializing Firebase..."
        firebase init hosting
    fi
    
    # Deploy to Firebase Hosting
    print_info "Deploying to Firebase Hosting..."
    firebase deploy --only hosting
    
    cd ..
    print_success "Frontend deployed successfully"
}

# Deploy backend Cloud Functions
deploy_backend() {
    print_info "Deploying backend Cloud Functions..."
    
    cd backend-functions
    
    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        print_info "Installing backend dependencies..."
        npm install
    fi
    
    # Get current project ID
    PROJECT_ID=$(gcloud config get-value project)
    if [ -z "$PROJECT_ID" ]; then
        print_error "No Google Cloud project is set"
        print_info "Please run: gcloud config set project YOUR_PROJECT_ID"
        exit 1
    fi
    
    print_info "Deploying to project: $PROJECT_ID"
    
    # Deploy Cloud Functions
    print_info "Deploying approveSubmission function..."
    gcloud functions deploy approveSubmission \
        --runtime nodejs18 \
        --trigger-http \
        --allow-unauthenticated \
        --region asia-southeast1 \
        --quiet
    
    print_info "Deploying rejectSubmission function..."
    gcloud functions deploy rejectSubmission \
        --runtime nodejs18 \
        --trigger-http \
        --allow-unauthenticated \
        --region asia-southeast1 \
        --quiet
    
    print_info "Deploying health check function..."
    gcloud functions deploy health \
        --runtime nodejs18 \
        --trigger-http \
        --allow-unauthenticated \
        --region asia-southeast1 \
        --quiet
    
    cd ..
    print_success "Backend Cloud Functions deployed successfully"
}

# Display deployment information
show_deployment_info() {
    PROJECT_ID=$(gcloud config get-value project)
    
    print_success "🔥 GoREAL Deployment Complete! 🔥"
    echo
    print_info "Deployment Information:"
    echo "────────────────────────────────────────────────"
    echo "📱 Frontend URL: https://$PROJECT_ID.web.app"
    echo "🔧 Cloud Functions:"
    echo "   • approveSubmission: https://asia-southeast1-$PROJECT_ID.cloudfunctions.net/approveSubmission"
    echo "   • rejectSubmission: https://asia-southeast1-$PROJECT_ID.cloudfunctions.net/rejectSubmission"
    echo "   • health: https://asia-southeast1-$PROJECT_ID.cloudfunctions.net/health"
    echo
    echo "🎮 Next steps:"
    echo "1. Update REACT_APP_CLOUD_FUNCTIONS_URL in your .env file"
    echo "2. Create admin user in Firestore"
    echo "3. Create sample quests in Firestore"
    echo "4. Test the application"
    echo
    print_success "Welcome to Lò Rèn Titan! 🏛️⚔️"
}

# Main deployment function
main() {
    echo "🔥 GoREAL - Lò Rèn Titan Deployment Script 🔥"
    echo "==============================================="
    echo
    
    # Parse arguments
    DEPLOY_FRONTEND=true
    DEPLOY_BACKEND=true
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --frontend-only)
                DEPLOY_BACKEND=false
                shift
                ;;
            --backend-only)
                DEPLOY_FRONTEND=false
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --frontend-only    Deploy only frontend"
                echo "  --backend-only     Deploy only backend"
                echo "  --help            Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Check requirements
    check_requirements
    
    # Deploy components
    if [ "$DEPLOY_FRONTEND" = true ]; then
        deploy_frontend
    fi
    
    if [ "$DEPLOY_BACKEND" = true ]; then
        deploy_backend
    fi
    
    # Show deployment information
    show_deployment_info
}

# Run main function
main "$@"