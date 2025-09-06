# ⚡ QUICK FIX - Firebase API Key Error

## 🚨 Lỗi: `auth/api-key-not-valid`

### ✅ GIẢI PHÁP 3 PHÚT:

#### Bước 1: Lấy Firebase Config
1. **Vào**: [console.firebase.google.com](https://console.firebase.google.com)
2. **Chọn project** (hoặc tạo mới)
3. **⚙️ Project Settings** → Scroll xuống **"Your apps"**
4. **Nếu chưa có app**: Nhấn `</>` → Tạo web app
5. **Copy config object**

#### Bước 2: Tạo file .env
```bash
cd frontend
cp .env.example .env
```

#### Bước 3: Paste config
**Mở `frontend/.env`**, paste theo format:

```env
REACT_APP_FIREBASE_API_KEY=AIzaSyxxxxxxxx
REACT_APP_FIREBASE_AUTH_DOMAIN=project.firebaseapp.com  
REACT_APP_FIREBASE_PROJECT_ID=project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456
REACT_APP_FIREBASE_APP_ID=1:123456:web:xxx
REACT_APP_CLOUD_FUNCTIONS_URL=https://asia-southeast1-project-id.cloudfunctions.net
REACT_APP_SENTRY_DSN=
```

#### Bước 4: Restart
```bash
# Stop (Ctrl+C) rồi chạy lại:
npm start
```

### 🔧 DEBUG NGAY:

1. **Chạy app**: `npm start`  
2. **Nhấn nút**: "🔧 Debug Firebase Config" (góc phải dưới)
3. **Xem results**: Console + popup sẽ show status từng config

### ✅ Success khi:
- Tất cả config hiện ✅ 
- Thử đăng ký không còn lỗi API key

### 🆘 Vẫn lỗi?
- Screenshot debug popup + gửi cho tôi
- Check file .env có trong thư mục `frontend/` không
- Đảm bảo đã restart `npm start`

---

**🔥 Fix xong là chạy ngay!** ⚔️🛡️