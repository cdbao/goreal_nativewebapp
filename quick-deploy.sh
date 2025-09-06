#!/bin/bash

echo ""
echo "========================================"
echo "  🔥 LÒ RÈN TITAN - QUICK DEPLOY 🔥"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}[$1/5]${NC} $2"
}

print_success() {
    echo -e "${GREEN}✅${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}🔄${NC} $1"
}

# Kiểm tra Node.js
print_step "1" "Kiểm tra Node.js..."
if ! command -v node &> /dev/null; then
    print_error "Node.js chưa được cài đặt!"
    echo "Tải tại: https://nodejs.org"
    exit 1
fi
print_success "Node.js OK"

# Kiểm tra file .env
echo ""
print_step "2" "Kiểm tra cấu hình..."
if [ ! -f "frontend/.env" ]; then
    print_error "File .env chưa tồn tại!"
    echo "Hãy copy frontend/.env.example thành frontend/.env"
    echo "và điền thông tin Firebase config"
    exit 1
fi
print_success "File .env có sẵn"

# Build Frontend
echo ""
print_step "3" "Building Frontend..."
cd frontend

echo "📦 Installing dependencies..."
if ! npm install; then
    print_error "npm install thất bại"
    exit 1
fi

echo "🏗️  Building project..."
if ! npm run build; then
    print_error "Build thất bại"
    exit 1
fi
print_success "Frontend build thành công"
cd ..

# Kiểm tra Firebase CLI
echo ""
print_step "4" "Kiểm tra Firebase CLI..."
if ! command -v firebase &> /dev/null; then
    print_warning "Cài đặt Firebase CLI..."
    if ! npm install -g firebase-tools; then
        print_error "Không thể cài Firebase CLI"
        exit 1
    fi
fi
print_success "Firebase CLI OK"

# Deploy
echo ""
print_step "5" "Deploy lên Firebase..."
echo "🚀 Đang deploy..."
cd frontend

if ! firebase deploy --only hosting; then
    print_error "Deploy thất bại"
    echo "Hãy chạy: firebase login"
    echo "Rồi thử lại"
    exit 1
fi

echo ""
echo "========================================"
echo "  🎉 DEPLOY THÀNH CÔNG! 🎉"
echo "========================================"
echo ""
print_success "Frontend đã được deploy lên Firebase Hosting"
echo "🌐 Kiểm tra website tại Firebase Console"
echo ""
echo "Tiếp theo:"
echo "1. Deploy Backend Functions (xem DEPLOY_GUIDE_SIMPLE.md)"
echo "2. Tạo dữ liệu mẫu trong Firestore"  
echo "3. Test website"
echo ""