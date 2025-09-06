# ✅ Deploy Checklist - Lò Rèn Titan

## 📋 Trước khi deploy

### Chuẩn bị môi trường:
- [ ] Node.js đã cài đặt (version 16+)
- [ ] Git đã cài đặt  
- [ ] Gmail account để sử dụng Firebase
- [ ] Internet connection ổn định

### Chuẩn bị project:
- [ ] Code đã được clone/download
- [ ] Đã `cd` vào thư mục `goreal-project`
- [ ] Không có lỗi TypeScript (`cd frontend && npm run build`)

---

## 🔥 PHASE 1: Firebase Setup

### Tạo Firebase Project:
- [ ] Truy cập [console.firebase.google.com](https://console.firebase.google.com)
- [ ] Đăng nhập Gmail
- [ ] Tạo project mới (tên: `titans-forge` hoặc tùy chọn)
- [ ] Tắt Google Analytics
- [ ] Project tạo thành công

### Kích hoạt Services:
- [ ] **Authentication**: Enable Email/Password sign-in
- [ ] **Firestore**: Create database (test mode, region: asia-southeast1)  
- [ ] **Storage**: Get started (test mode, same region)
- [ ] **Web App**: Tạo app với nickname `titans-forge-web`
- [ ] **Hosting**: Enable Firebase Hosting cho app
- [ ] Copy được Firebase config (API key, project ID, etc.)

---

## 🌐 PHASE 2: Frontend Deploy

### Cấu hình Environment:
- [ ] Copy `frontend/.env.example` thành `frontend/.env`
- [ ] Điền đầy đủ Firebase config vào `.env`:
  ```
  REACT_APP_FIREBASE_API_KEY=...
  REACT_APP_FIREBASE_AUTH_DOMAIN=...
  REACT_APP_FIREBASE_PROJECT_ID=...
  REACT_APP_FIREBASE_STORAGE_BUCKET=...
  REACT_APP_FIREBASE_MESSAGING_SENDER_ID=...
  REACT_APP_FIREBASE_APP_ID=...
  REACT_APP_CLOUD_FUNCTIONS_URL=https://asia-southeast1-PROJECT_ID.cloudfunctions.net
  ```

### Build và Deploy:
- [ ] `cd frontend && npm install` - thành công
- [ ] `npm run build` - thành công, không có lỗi
- [ ] `npm install -g firebase-tools` (nếu chưa có)
- [ ] `firebase login` - đăng nhập thành công  
- [ ] `firebase init hosting` - setup thành công
  - [ ] Choose existing project
  - [ ] Public directory: `build`
  - [ ] Single-page app: `y`
  - [ ] Auto builds: `n` (lúc đầu)
  - [ ] Overwrite index.html: `n`
- [ ] `firebase deploy --only hosting` - deploy thành công
- [ ] Firebase trả về URL hosting

### ✅ Kiểm tra Frontend:
- [ ] Truy cập URL được Firebase cung cấp
- [ ] Website tải được (thấy trang đăng nhập)
- [ ] Giao diện "Lò Rèn Titan" hiển thị đúng
- [ ] Không có console error nghiêm trọng

---

## ⚡ PHASE 3: Backend Deploy

### Setup Google Cloud:
- [ ] Tải và cài đặt [Google Cloud CLI](https://cloud.google.com/sdk/docs/install)
- [ ] `gcloud auth login` - đăng nhập thành công
- [ ] `gcloud config set project PROJECT_ID` - set project

### Deploy Functions:
- [ ] `cd ../backend-functions`
- [ ] `npm install` - cài đặt dependencies thành công
- [ ] Deploy từng function thành công:
  - [ ] `gcloud functions deploy approveSubmission --runtime nodejs18 --trigger-http --allow-unauthenticated --region asia-southeast1`
  - [ ] `gcloud functions deploy rejectSubmission --runtime nodejs18 --trigger-http --allow-unauthenticated --region asia-southeast1`  
  - [ ] `gcloud functions deploy health --runtime nodejs18 --trigger-http --allow-unauthenticated --region asia-southeast1`

### ✅ Kiểm tra Backend:
- [ ] `curl https://asia-southeast1-PROJECT_ID.cloudfunctions.net/health`
- [ ] Response: `{"status":"healthy",...}` 
- [ ] Cả 3 functions hiển thị trong Google Cloud Console

---

## 📊 PHASE 4: Database Setup

### Tạo Admin User (Firestore):
- [ ] Vào Firebase Console → Firestore Database
- [ ] Start collection: `users`
- [ ] Tạo document với fields:
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

### Tạo Sample Quest:
- [ ] Start collection: `quests`
- [ ] Tạo document với fields:
  ```
  title: "Tập thể dục buổi sáng"
  description: "Thực hiện 30 phút tập thể dục. Chụp ảnh làm bằng chứng."
  auraReward: 50
  isActive: true
  ```

---

## 🎯 PHASE 5: End-to-End Testing

### Test User Flow:
- [ ] Truy cập website
- [ ] **Đăng ký**: Tạo tài khoản mới với email/password
- [ ] **Đăng nhập**: Login thành công → vào Dashboard
- [ ] **Xem nhiệm vụ**: Dashboard hiển thị quest vừa tạo
- [ ] **Báo cáo nhiệm vụ**: 
  - [ ] Nhấn "Báo cáo rèn luyện"
  - [ ] Upload file ảnh
  - [ ] Gửi thành công
  - [ ] Thông báo "chờ duyệt" hiển thị

### Test Admin Flow:
- [ ] Tạo user với role "admin" trong Firestore
- [ ] Đăng ký/đăng nhập với email tương ứng
- [ ] Truy cập `/admin`
- [ ] Thấy danh sách submission chờ duyệt
- [ ] Test approve/reject (sẽ gọi Cloud Functions)

---

## 🛠️ Fix Common Issues

### ❌ Frontend không load:
- [ ] Kiểm tra console error trong browser (F12)
- [ ] Verify Firebase config trong `.env`
- [ ] Thử hard refresh (Ctrl+F5)

### ❌ Backend functions lỗi:
- [ ] Kiểm tra `gcloud functions list`
- [ ] Xem logs: `gcloud functions logs read FUNCTION_NAME`
- [ ] Verify project ID và region đúng

### ❌ Authentication lỗi:  
- [ ] Firebase Console → Authentication → Sign-in method → Email/Password enabled
- [ ] Firestore rules cho phép authenticated users

### ❌ Database permission lỗi:
- [ ] Firestore → Rules, thay bằng rules test:
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

---

## 🎉 SUCCESS CRITERIA

### ✅ Deployment Successful khi:
- [ ] Website accessible tại Firebase Hosting URL
- [ ] User có thể đăng ký/đăng nhập
- [ ] Dashboard hiển thị đúng thông tin user
- [ ] Quest system hoạt động (hiển thị + báo cáo)
- [ ] Admin panel accessible (với admin role)
- [ ] File upload hoạt động
- [ ] Cloud Functions responds correctly

### 📊 Final URLs:
```
Frontend: https://PROJECT_ID.web.app
Functions: https://asia-southeast1-PROJECT_ID.cloudfunctions.net
Firebase Console: https://console.firebase.google.com/project/PROJECT_ID
```

---

**🔥 Chúc mừng! "Lò Rèn Titan" đã sẵn sàng cho các Môn Sinh! ⚔️🛡️**