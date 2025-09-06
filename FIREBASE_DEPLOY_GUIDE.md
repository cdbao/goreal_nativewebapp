# 🔥 Firebase Deploy Guide - Khắc phục lỗi Permission Denied (403)

## 🚨 Vấn đề hiện tại

Bạn gặp lỗi **Permission denied (403)** khi upload hình ảnh. Đây là do Firebase Storage Rules chưa được deploy hoặc chưa đúng cấu hình.

## ✅ Giải pháp hoàn chỉnh

### **Bước 1: Kiểm tra Firebase CLI**

```bash
# Cài đặt Firebase CLI nếu chưa có
npm install -g firebase-tools

# Đăng nhập Firebase
firebase login

# Kiểm tra project hiện tại
firebase projects:list
```

### **Bước 2: Deploy Storage Rules**

```bash
# Di chuyển vào thư mục frontend
cd C:\Users\cob01\goreal-project\frontend

# Deploy Storage Rules
firebase deploy --only storage

# Hoặc deploy tất cả rules cùng lúc
firebase deploy --only storage,firestore
```

### **Bước 3: Kiểm tra User Role trong Firestore**

Đảm bảo user hiện tại có role 'admin' trong Firestore:

1. Vào **Firebase Console** → **Firestore Database**
2. Tìm collection `users` → document của user hiện tại
3. Đảm bảo có field `role: "admin"`

Nếu chưa có, tạo/update document như sau:

```javascript
// Trong Firestore Console
{
  userId: "YOUR_USER_ID",
  displayName: "Your Name",
  email: "your-email@example.com", 
  guild: "titans",
  level: "Môn Sinh",
  currentAura: 0,
  currentStreak: 0,
  role: "admin"  // ← Quan trọng!
}
```

### **Bước 4: Verify Rules đã được Deploy**

Kiểm tra Storage Rules trong Firebase Console:

1. Vào **Firebase Console** → **Storage** → **Rules**
2. Đảm bảo rules có nội dung như sau:

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    
    // Background images - Admins can upload/manage, all authenticated users can read
    match /backgrounds/{fileName} {
      // Allow read for all authenticated users
      allow read: if request.auth != null;
      
      // Allow write/delete only for admins
      allow write, delete: if request.auth != null && 
        exists(/databases/(default)/documents/users/$(request.auth.uid)) &&
        get(/databases/(default)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Background thumbnails - Same rules as main backgrounds  
    match /backgrounds/thumbnails/{fileName} {
      allow read: if request.auth != null;
      allow write, delete: if request.auth != null && 
        exists(/databases/(default)/documents/users/$(request.auth.uid)) &&
        get(/databases/(default)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // ... (other rules)
  }
}
```

## 🔍 Debug Steps

### **1. Sử dụng Auth Debugger**

Trong ImprovedBackgroundManager, khi gặp lỗi 403, nhấn nút **"🔍 Debug Quyền"** để:

- ✅ Kiểm tra authentication status
- ✅ Kiểm tra user data trong Firestore
- ✅ Kiểm tra admin role
- ✅ Xem raw debug data

### **2. Console Debug**

Mở **Developer Tools** (F12) và kiểm tra:

```javascript
// Kiểm tra current user
console.log('Current user:', firebase.auth().currentUser);

// Kiểm tra user data trong Firestore (cần chạy trong component)
const userDoc = await getDoc(doc(db, 'users', userId));
console.log('User data:', userDoc.data());
```

### **3. Test Storage Rules**

Vào **Firebase Console** → **Storage** → **Rules** → **Playground**:

```javascript
// Test case: Admin uploading background
// Auth: Simulate signed-in user with your UID
// Resource path: /backgrounds/test-image.jpg
// Operation: write
```

## 🛠️ Troubleshooting

### **Lỗi: "Firebase CLI not found"**
```bash
npm install -g firebase-tools
```

### **Lỗi: "Not logged in"**
```bash
firebase login
```

### **Lỗi: "Project not found"**
```bash
firebase use --add
# Chọn project GoREAL
```

### **Lỗi: "Rules validation failed"**
Kiểm tra syntax trong file `storage.rules`

### **Lỗi: "User role not found"**
Cập nhật user document trong Firestore với `role: "admin"`

### **Lỗi: "CORS policy"**
Đây là vấn đề Firebase Storage CORS, thường tự resolve sau khi deploy rules.

## 📋 Commands Checklist

Chạy theo thứ tự:

```bash
# 1. Đảm bảo trong đúng thư mục
cd C:\Users\cob01\goreal-project\frontend

# 2. Kiểm tra Firebase project
firebase projects:list

# 3. Chọn project (nếu cần)
firebase use goreal-project-id

# 4. Deploy storage rules
firebase deploy --only storage

# 5. Kiểm tra deployment
firebase open hosting:site
```

## 🎯 Expected Results

Sau khi hoàn thành:

- ✅ User có role "admin" có thể upload hình nền
- ✅ Tất cả user đã đăng nhập có thể xem hình nền
- ✅ Non-admin users không thể upload (security)
- ✅ Auth Debugger hiển thị "✅ Quyền hợp lệ"

## 🆘 Nếu vẫn lỗi

1. **Clear browser cache** và refresh trang
2. **Log out và log in lại**  
3. **Kiểm tra Network tab** trong DevTools cho error details
4. **Verify Firebase project configuration** trong `firebase.json`
5. **Check Firebase Console** → **Usage** → **Storage** để đảm bảo có quota

## 💡 Quick Fix Commands

```bash
# All-in-one deploy và test
cd C:\Users\cob01\goreal-project\frontend
firebase login
firebase deploy --only storage,firestore
```

Sau khi deploy xong, thử upload lại hình ảnh. Nếu vẫn lỗi, sử dụng Auth Debugger để identify exact issue! 🔍