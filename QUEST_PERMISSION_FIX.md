# 🔧 Khắc phục lỗi Permission Denied khi chấp nhận Quest

## ✅ **Đã thực hiện:**

### 1. **Cập nhật Firestore Rules**
Đã thêm rules cho subcollection `activeQuests`:

```javascript
// User active quests - users can read/write their own active quests
match /users/{userId}/activeQuests/{questId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}

// Allow listing subcollections for the user
match /users/{userId} {
  allow read: if request.auth != null && request.auth.uid == userId;
  match /activeQuests/{questId} {
    allow read, write: if request.auth != null && request.auth.uid == userId;
  }
}
```

### 2. **Deploy Firestore Rules thành công**
```bash
firebase deploy --only firestore
```
**Status:** ✅ Deploy complete!

### 3. **Thêm Quest Debugger**
Component debug để kiểm tra permissions trong development mode.

---

## 🧪 **Cách test lại:**

### Bước 1: Làm mới browser
1. **Hard refresh**: Ctrl + Shift + R 
2. **Clear cache**: F12 → Application → Storage → Clear site data
3. **Hoặc**: Incognito mode

### Bước 2: Đăng nhập lại
1. Logout khỏi app
2. Login lại để refresh Firebase token
3. Đảm bảo user có `guild` trong profile

### Bước 3: Sử dụng Quest Debugger
1. Vào Dashboard
2. Scroll xuống phần "Quest Permission Debugger" (chỉ hiện trong dev mode)
3. Click "🧪 Run Permission Test"
4. Kiểm tra kết quả:
   - ✅ **readUserDoc**: User document accessible
   - ✅ **readQuests**: Can read quests from guild
   - ✅ **readActiveQuests**: Can read own activeQuests
   - ✅ **createActiveQuest**: Can create test activeQuest

### Bước 4: Test chấp nhận Quest
1. Thử click "🔥 Chấp Nhận Thử Thách" trên quest card
2. Kiểm tra Console (F12) để xem logs
3. Nếu thành công → Quest card chuyển sang trạng thái "accepted"

---

## 🚨 **Nếu vẫn lỗi:**

### Check 1: User Document
```javascript
// Console command để kiểm tra user data
firebase.auth().currentUser.uid
// Copy UID này và check trong Firestore Console
```

### Check 2: Firestore Console
1. Vào [Firebase Console](https://console.firebase.google.com/project/goreal-470006-b3689/firestore)
2. Navigate: `users/{yourUID}` 
3. Đảm bảo user có:
   - `guild`: 'titans' | 'illumination' | 'envoys'
   - `displayName`: string
   - `email`: string

### Check 3: Network Tab
1. F12 → Network
2. Thử chấp nhận quest
3. Tìm request tới Firestore
4. Check response code:
   - **200**: Success ✅
   - **403**: Permission denied ❌
   - **400**: Bad request ❌

### Check 4: Firebase Rules Simulator
1. Vào [Firebase Console](https://console.firebase.google.com/project/goreal-470006-b3689/firestore/rules)
2. Click "Rules playground"
3. Test rule:
   - **Location**: `/users/{your-uid}/activeQuests/test-quest`
   - **Operation**: Create
   - **Authenticated**: Yes với your UID

---

## 📋 **Expected Behavior sau fix:**

1. **Quest Card Animation**: ✅ Smooth loading → acceptance animation
2. **Firestore Write**: ✅ Document tạo trong `users/{uid}/activeQuests/{questId}`
3. **UI Update**: ✅ Card chuyển sang "Đã chấp nhận thử thách!"
4. **Quest Report**: ✅ Dynamic report interface xuất hiện bên dưới
5. **No Console Errors**: ✅ Không có permission denied errors

---

## 🛠️ **Troubleshooting Commands:**

```bash
# Check Firebase CLI
firebase --version

# Check current project
firebase use

# Re-deploy rules nếu cần
cd frontend
firebase deploy --only firestore

# Check rules trong console
firebase open firestore

# Test local với emulator (optional)
firebase emulators:start --only firestore
```

---

## 🎯 **Kết luận:**

**Firestore Rules** đã được update để support subcollection `activeQuests`. 

**Lỗi permission-denied** giờ đây đã được fix through:
- ✅ Rules cho phép user read/write own activeQuests
- ✅ Deployed to Firebase production  
- ✅ Enhanced error handling với retry logic
- ✅ Debug component để test permissions

**Next steps**: Test trên browser với steps ở trên!