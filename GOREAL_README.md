# GoREAL - EduGame Project: Lò Rèn Titan

Website EduGame nhập vai giúp người dùng (10-15 tuổi) rèn luyện thói quen ngoài đời thực thông qua việc thực hiện các nhiệm vụ và tích lũy điểm AURA trong game.

## 🎮 Tổng quan dự án

**Cốt truyện**: Player là Môn Sinh của Titans' Guild, rèn luyện tại Lò Rèn Titan dưới sự dẫn dắt của Thủ lĩnh Kael.

**Vòng lặp trải nghiệm**: Đăng ký → Nhận nhiệm vụ → Báo cáo → Chờ duyệt → Nhận thưởng AURA

## 🏗️ Kiến trúc hệ thống

### Frontend
- **Framework**: React.js với TypeScript
- **Routing**: React Router  
- **Authentication**: Firebase Auth
- **Storage**: Firebase Storage (cho file upload)
- **Database**: Firestore
- **Error Tracking**: Sentry SDK
- **CI/CD**: GitHub Actions

### Backend
- **Platform**: Google Cloud Functions
- **Runtime**: Node.js 18
- **Database**: Firestore
- **File Storage**: Google Cloud Storage
- **Monitoring**: Sentry Error Tracking
- **Deployment**: Automated với GitHub Actions

### Database Schema (Firestore)

#### Collection: `users`
```javascript
{
  userId: "firebase_uid",
  displayName: "Tên người dùng",
  email: "user@example.com",
  guild: "Titans' Guild",
  level: "Môn Sinh",
  currentAura: 0,
  currentStreak: 0,
  role: "player" // hoặc "admin"
}
```

#### Collection: `quests`
```javascript
{
  questId: "unique_quest_id",
  title: "Tên nhiệm vụ",
  description: "Mô tả chi tiết",
  auraReward: 100,
  isActive: true
}
```

#### Collection: `submissions`
```javascript
{
  submissionId: "unique_submission_id",
  userId: "firebase_uid",
  questId: "quest_id",
  proofUrl: "https://storage.googleapis.com/...",
  status: "pending", // "approved", "rejected"
  submittedAt: "timestamp"
}
```

## 🚀 Hướng dẫn cài đặt

### 1. Cài đặt dependencies

```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend-functions
npm install
```

### 2. Thiết lập Firebase Config

Tạo file `.env` trong thư mục `frontend/` dựa trên `.env.example`:

```env
REACT_APP_FIREBASE_API_KEY=your_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_CLOUD_FUNCTIONS_URL=https://your-region-your-project.cloudfunctions.net
```

### 3. Thiết lập Firebase Services

1. Tạo Firebase project tại [Firebase Console](https://console.firebase.google.com)
2. Kích hoạt:
   - **Authentication** → Email/Password
   - **Firestore Database** → Test mode
   - **Storage** → Test mode
3. Tạo Web App và copy config vào file `.env`

### 4. Khởi tạo dữ liệu mẫu

#### Tạo admin user trong Firestore:
```javascript
// Collection: users
// Document ID: <firebase_auth_uid_của_admin>
{
  userId: "admin_firebase_uid",
  displayName: "Thủ lĩnh Kael",
  email: "admin@titans-guild.com",
  guild: "Titans' Guild",
  level: "Thủ lĩnh",
  currentAura: 0,
  currentStreak: 0,
  role: "admin"
}
```

#### Tạo quest mẫu:
```javascript
// Collection: quests  
// Document ID: tự động generate
{
  title: "Tập thể dục buổi sáng",
  description: "Thực hiện 30 phút tập thể dục vào buổi sáng. Chụp ảnh hoặc quay video ngắn làm bằng chứng.",
  auraReward: 50,
  isActive: true
}
```

### 5. Chạy ứng dụng

#### Development Mode
```bash
# Frontend
cd frontend
npm start
# → http://localhost:3000

# Backend (local testing - tùy chọn)
cd backend-functions
npm start  
# → http://localhost:8080
```

#### Production Deployment

**Deploy Frontend:**
```bash
cd frontend
npm run build

# Deploy với Firebase Hosting
firebase init hosting
firebase deploy --only hosting
```

**Deploy Backend Functions:**
```bash
cd backend-functions

# Deploy Cloud Functions
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
```

## 📱 Hướng dẫn sử dụng

### Cho Player (Môn Sinh)
1. **Đăng ký tài khoản**: Sử dụng email và mật khẩu
2. **Xem Dashboard**: Kiểm tra AURA, Streak và nhiệm vụ hiện tại
3. **Báo cáo rèn luyện**: Upload ảnh/video bằng chứng thực hiện nhiệm vụ
4. **Chờ phê duyệt**: Admin sẽ xem xét và phê duyệt báo cáo
5. **Nhận thưởng**: AURA và Streak sẽ được cập nhật tự động

### Cho Admin (Hội Đồng Thẩm Định)
1. **Truy cập trang Admin**: Đi đến `/admin` (chỉ tài khoản có role="admin")
2. **Xem danh sách báo cáo**: Các submission đang chờ duyệt
3. **Thẩm định**: Xem ảnh/video bằng chứng
4. **Quyết định**: Phê duyệt hoặc từ chối báo cáo

## 🔧 Cấu trúc thư mục

```
goreal-project/
├── frontend/                 # React.js frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── contexts/        # React contexts
│   │   ├── types/           # TypeScript types
│   │   └── firebase.ts      # Firebase config
│   └── .env.example
├── backend-functions/       # Google Cloud Functions
│   ├── index.js            # Main functions
│   └── package.json
└── GOREAL_README.md        # Documentation này
```

## 🔒 Bảo mật

### Firestore Rules mẫu:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    match /quests/{questId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    match /submissions/{submissionId} {
      allow read, create: if request.auth != null;
      allow update: if request.auth != null && (
        request.auth.uid == resource.data.userId ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'
      );
    }
  }
}
```

## 🐛 Troubleshooting

### Lỗi thường gặp:

1. **Firebase config không tìm thấy**
   - Kiểm tra file `.env` có đúng format không
   - Đảm bảo các biến bắt đầu với `REACT_APP_`

2. **CORS Error với Cloud Functions**
   - Kiểm tra CORS headers trong functions
   - Đảm bảo URL functions chính xác

3. **Permission denied Firestore**
   - Kiểm tra Firestore Security Rules
   - Đảm bảo user đã authenticate

4. **File upload thất bại**
   - Kiểm tra Firebase Storage rules
   - Đảm bảo file < 10MB và đúng định dạng

## 🎯 Features chính

✅ **Hệ thống Authentication** (Đăng ký/Đăng nhập)  
✅ **Dashboard "Lò Rèn Titan"** (Giao diện chính)  
✅ **Chức năng Báo cáo nhiệm vụ** (Upload file bằng chứng)  
✅ **Giao diện Admin** (Duyệt báo cáo)  
✅ **Google Cloud Functions** (Approve/Reject submissions)  

## 📞 Hỗ trợ

Nếu gặp vấn đề, vui lòng:
1. Kiểm tra troubleshooting guide trên
2. Xem console logs (F12 → Console)
3. Kiểm tra Network tab để debug API calls

---

**🔥 Chúc mừng! Bạn đã sẵn sàng chinh phục Lò Rèn Titan! 🔥**