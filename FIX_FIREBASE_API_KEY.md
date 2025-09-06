# 🔧 Fix Lỗi Firebase API Key

## ❌ Lỗi hiện tại:
```
Firebase: Error (auth/api-key-not-valid.-please-pass-a-valid-api-key.)
```

## 🔍 Nguyên nhân:
1. **API key sai hoặc không hợp lệ**
2. **File .env chưa được tạo hoặc cấu hình sai**
3. **API key bị giới hạn hoặc vô hiệu**

---

## 🚀 CÁCH SỬA (5 PHÚT):

### Bước 1: Lấy Firebase Config đúng

1. **Truy cập**: [console.firebase.google.com](https://console.firebase.google.com)
2. **Chọn project** của bạn (hoặc tạo mới nếu chưa có)
3. **Vào Project Settings**:
   - Nhấn ⚙️ (Settings) ở sidebar trái
   - Chọn **Project settings**
4. **Scroll xuống "Your apps"**
5. **Nếu chưa có Web app**:
   - Nhấn `</>` (Web icon)
   - Nhập tên app: `titans-forge-web`
   - ✅ Tick "Also set up Firebase Hosting"
   - **Register app**
6. **Copy config**:
   - Trong phần **SDK setup and configuration**
   - Chọn **Config**
   - Copy toàn bộ object config

### Bước 2: Tạo/Sửa file .env

```bash
# Vào thư mục frontend
cd frontend

# Tạo file .env từ template
cp .env.example .env
```

### Bước 3: Paste config vào .env

**Mở file `frontend/.env`** và paste config theo format:

```env
REACT_APP_FIREBASE_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxx
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:xxxxxxxxxxxxxx
REACT_APP_CLOUD_FUNCTIONS_URL=https://asia-southeast1-your-project-id.cloudfunctions.net

# Sentry (tùy chọn - để trống được)
REACT_APP_SENTRY_DSN=
```

**⚠️ QUAN TRỌNG:**
- Không có dấu nháy `"` quanh giá trị
- Không có khoảng trắng thừa
- Tất cả phải bắt đầu với `REACT_APP_`

---

## ✅ KIỂM TRA CONFIG

### Cách 1: Kiểm tra trong browser
```bash
cd frontend
npm start
```
- Mở **F12** → **Console**
- Xem có lỗi Firebase nào không

### Cách 2: In config ra console
**Tạm thời thêm vào `src/firebase.ts`**:
```javascript
console.log('Firebase Config:', {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
});
```

---

## 🔧 XỬ LÝ CÁC TRƯỜNG HỢP KHÁC:

### ❌ "Project not found"
**Fix**: Kiểm tra `REACT_APP_FIREBASE_PROJECT_ID` có đúng không

### ❌ "Domain not authorized"  
**Fix**: 
1. Firebase Console → Authentication → Settings → Authorized domains
2. Thêm `localhost` và domain production của bạn

### ❌ "API key restricted"
**Fix**:
1. Google Cloud Console → APIs & Services → Credentials  
2. Click vào API key → Remove restrictions hoặc add services cần thiết

### ❌ File .env không được load
**Fix**:
```bash
# Restart dev server
cd frontend
npm start
```

---

## 🎯 TEST NHANH:

Sau khi config xong:

```bash
cd frontend
npm start
```

1. **Mở**: http://localhost:3000
2. **Thử đăng ký** với email/password bất kỳ
3. **Nếu OK**: Sẽ không có lỗi API key nữa

---

## 📞 VẪN LỖI?

**Gửi cho tôi:**
1. **Screenshot** Firebase Console config
2. **Nội dung file `.env`** (ẩn API key đi)
3. **Console error** đầy đủ

Tôi sẽ giúp debug cụ thể!

---

**🔥 Config đúng là website sẽ chạy ngay!** ⚔️🛡️