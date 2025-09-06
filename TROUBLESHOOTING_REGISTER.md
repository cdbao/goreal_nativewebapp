# 🐛 Troubleshooting: Lỗi Đăng Ký

## Vấn đề hiện tại
**Lỗi**: "Đăng ký thất bại. Email có thể đã được sử dụng."

## ✅ Checklist Debug

### 1. Kiểm tra Firebase Configuration
```bash
# Trong thư mục frontend, kiểm tra file .env
ls -la .env
cat .env
```

**Đảm bảo file `.env` có đầy đủ:**
```env
REACT_APP_FIREBASE_API_KEY=your_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

### 2. Kiểm tra Firebase Console

#### A. Authentication Settings
1. Đăng nhập [Firebase Console](https://console.firebase.google.com)
2. Chọn project của bạn
3. Vào **Authentication** > **Sign-in method**
4. Đảm bảo **Email/Password** được **Enable**

#### B. Project Settings
1. Vào **Project Settings** (⚙️ icon)
2. Tab **General** > **Your apps**
3. Kiểm tra Web app config có đúng không

### 3. Debug Steps

#### Bước 1: Sử dụng Firebase Debug
1. Chạy app: `npm start`
2. Mở trang đăng ký
3. Nhấn nút **🔧 Debug Firebase** ở góc phải dưới
4. Mở browser console (F12)
5. Kiểm tra logs

#### Bước 2: Test với email mới
- Thử đăng ký với email hoàn toàn mới
- Kiểm tra console logs cho error cụ thể

#### Bước 3: Kiểm tra Network Tab
1. Mở Developer Tools (F12)
2. Vào tab **Network**
3. Thử đăng ký
4. Xem request/response để tìm lỗi

## 🔧 Các lỗi Firebase phổ biến

### `auth/email-already-in-use`
**Nguyên nhân**: Email đã tồn tại
**Giải pháp**: Sử dụng email khác hoặc đăng nhập

### `auth/invalid-email`
**Nguyên nhân**: Format email sai
**Giải pháp**: Kiểm tra định dạng email

### `auth/weak-password`
**Nguyên nhân**: Mật khẩu < 6 ký tự
**Giải pháp**: Dùng mật khẩu ít nhất 6 ký tự

### `auth/network-request-failed`
**Nguyên nhân**: Lỗi mạng hoặc config
**Giải pháp**: 
- Kiểm tra internet
- Kiểm tra Firebase config
- Kiểm tra CORS

### `auth/api-key-not-valid`
**Nguyên nhân**: API key sai hoặc bị vô hiệu hóa
**Giải pháp**: 
- Kiểm tra API key trong Firebase Console
- Regenerate API key nếu cần

## 🚀 Quick Fixes

### Fix 1: Reset Firebase Config
```bash
# Trong Firebase Console
# 1. Project Settings > General > Your apps
# 2. Click vào Web app
# 3. Copy config object mới
# 4. Cập nhật .env file
```

### Fix 2: Kiểm tra Firestore Rules
```javascript
// Vào Firestore > Rules
// Đảm bảo có rule sau:
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Fix 3: Clear Browser Cache
```bash
# Chrome: Ctrl+Shift+Delete
# Hoặc thử Incognito mode
```

## 📞 Nếu vẫn lỗi

1. **Check console logs**: Xem chi tiết lỗi trong browser console
2. **Try different browser**: Test trên browser khác
3. **Check Firebase status**: https://status.firebase.google.com/
4. **Recreate Firebase project**: Nếu cần thiết

## 🔍 Debug Commands

```bash
# Build để kiểm tra lỗi TypeScript
npm run build

# Start với verbose logs
REACT_APP_DEBUG=true npm start

# Kiểm tra Firebase CLI
firebase --version
firebase projects:list
```

---

**Sau khi làm theo checklist trên, thử đăng ký lại và báo kết quả!** 🔥