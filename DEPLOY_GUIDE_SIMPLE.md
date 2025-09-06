# 🚀 Hướng dẫn Deploy "Lò Rèn Titan" - ĐỀU ĐƠN GIẢN

## 📋 Tổng quan: 3 bước chính

1. **Bước 1**: Setup Firebase (10 phút)
2. **Bước 2**: Deploy Frontend (5 phút) 
3. **Bước 3**: Deploy Backend (5 phút)

*Tổng cộng: ~20 phút*

---

## 🔥 BƯỚC 1: Setup Firebase Project (BẮT BUỘC)

### A. Tạo Firebase Project

1. **Truy cập**: [console.firebase.google.com](https://console.firebase.google.com)
2. **Đăng nhập** bằng Gmail
3. **Tạo project mới**:
   - Tên project: `titans-forge` (hoặc tên bạn thích)
   - Chọn **Continue**
   - Tắt Google Analytics (không cần)
   - Chọn **Create project**

### B. Kích hoạt Services

**1. Authentication:**
- Vào **Authentication** → **Sign-in method**
- Nhấn **Email/Password** → **Enable** → **Save**

**2. Firestore Database:**
- Vào **Firestore Database** → **Create database**
- Chọn **Start in test mode** → **Next**
- Chọn location: **asia-southeast1** → **Done**

**3. Storage:**
- Vào **Storage** → **Get started**
- Chọn **Start in test mode** → **Next**
- Location: **asia-southeast1** → **Done**

### C. Tạo Web App

1. Trong Firebase Console, nhấn **⚙️** → **Project settings**
2. Scroll xuống **Your apps** → Nhấn **</>** (Web icon)
3. **App nickname**: `titans-forge-web`
4. ✅ **Also set up Firebase Hosting** 
5. **Register app**
6. **Copy config** (sẽ dùng sau)
7. **Continue to console**

---

## 🌐 BƯỚC 2: Deploy Frontend

### A. Cấu hình Environment

1. **Mở terminal** trong thư mục project
2. **Copy config từ Firebase**:

```bash
cd frontend
cp .env.example .env
```

3. **Chỉnh sửa file `.env`** với config từ Firebase:

```env
REACT_APP_FIREBASE_API_KEY=your_api_key_từ_firebase
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_CLOUD_FUNCTIONS_URL=https://asia-southeast1-your_project_id.cloudfunctions.net

# Tùy chọn - có thể để trống lúc đầu
REACT_APP_SENTRY_DSN=
```

### B. Build và Deploy

```bash
# 1. Cài đặt dependencies
npm install

# 2. Test build
npm run build

# 3. Cài đặt Firebase CLI
npm install -g firebase-tools

# 4. Đăng nhập Firebase
firebase login

# 5. Khởi tạo Firebase trong project
firebase init hosting

# Trả lời các câu hỏi:
# - Use existing project: Chọn project vừa tạo
# - Public directory: build
# - Single-page app: YES
# - Set up automatic builds: NO (lúc đầu)
# - Overwrite index.html: NO

# 6. Deploy
firebase deploy --only hosting
```

### ✅ Kiểm tra Frontend

Sau khi deploy, Firebase sẽ show URL như: `https://your-project.web.app`

Truy cập URL → Bạn sẽ thấy trang đăng nhập của "Lò Rèn Titan"!

---

## ⚡ BƯỚC 3: Deploy Backend Functions

### A. Setup Google Cloud

```bash
# 1. Cài đặt Google Cloud CLI
# Tải từ: https://cloud.google.com/sdk/docs/install

# 2. Đăng nhập
gcloud auth login

# 3. Set project (thay your_project_id)
gcloud config set project your_project_id
```

### B. Deploy Functions

```bash
# 1. Vào thư mục backend
cd ../backend-functions

# 2. Cài đặt dependencies
npm install

# 3. Deploy từng function
gcloud functions deploy approveSubmission \
  --runtime nodejs18 \
  --trigger-http \
  --allow-unauthenticated \
  --region asia-southeast1

gcloud functions deploy rejectSubmission \
  --runtime nodejs18 \
  --trigger-http \
  --allow-unauthenticated \
  --region asia-southeast1

gcloud functions deploy health \
  --runtime nodejs18 \
  --trigger-http \
  --allow-unauthenticated \
  --region asia-southeast1
```

### ✅ Kiểm tra Backend

```bash
# Test health function
curl https://asia-southeast1-your_project_id.cloudfunctions.net/health
```

Nếu trả về `{"status":"healthy",...}` → Backend OK!

---

## 📊 BƯỚC 4: Tạo dữ liệu mẫu

### A. Tạo Admin User

1. **Vào Firebase Console** → **Firestore Database**
2. **Start collection**: `users`
3. **Document ID**: Tự động
4. **Thêm fields**:

```
displayName: "Admin Kael"
email: "admin@titans-guild.com" 
guild: "Titans' Guild"
level: "Thủ lĩnh"
currentAura: 0
currentStreak: 0
role: "admin"
userId: "admin_test_123"
```

### B. Tạo Quest mẫu

1. **Start collection**: `quests`
2. **Document ID**: Tự động  
3. **Thêm fields**:

```
title: "Tập thể dục buổi sáng"
description: "Thực hiện 30 phút tập thể dục. Chụp ảnh làm bằng chứng."
auraReward: 50
isActive: true
```

---

## 🎯 TEST WEBSITE

1. **Truy cập website**: `https://your-project.web.app`

2. **Tạo tài khoản mới**:
   - Đăng ký với email/password bất kỳ
   - Sau khi đăng ký → Tự động vào Dashboard

3. **Test chức năng**:
   - Xem nhiệm vụ
   - Upload ảnh báo cáo
   - Truy cập `/admin` (nếu có role admin)

---

## 🔧 Troubleshooting phổ biến

### ❌ "Firebase config error"
**Fix**: Kiểm tra file `.env` có đúng config từ Firebase

### ❌ "Functions not found"
**Fix**: 
```bash
# Kiểm tra functions đã deploy
gcloud functions list

# Deploy lại nếu cần
cd backend-functions
gcloud functions deploy health --runtime nodejs18 --trigger-http
```

### ❌ "Permission denied"
**Fix**: Vào Firebase Console → Firestore → Rules → Thay rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### ❌ "Build failed"
**Fix**:
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## 📱 KẾT QUẢ CUỐI CÙNG

Sau khi hoàn thành, bạn sẽ có:

- ✅ **Website live** tại `https://your-project.web.app`
- ✅ **Đăng ký/Đăng nhập** hoạt động
- ✅ **Dashboard** hiển thị nhiệm vụ
- ✅ **Upload file** báo cáo hoạt động  
- ✅ **Admin panel** để duyệt báo cáo
- ✅ **Backend API** xử lý approve/reject

---

## 🆘 CẦN HELP?

Nếu gặp vấn đề ở bước nào:

1. **Copy chính xác** error message
2. **Chụp screenshot** console/terminal
3. **Báo cáo** bước nào bị stuck

Tôi sẽ giúp debug cụ thể! 

---

**🔥 Chúc bạn deploy thành công "Lò Rèn Titan"! ⚔️🛡️**