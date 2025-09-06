# 🧪 GOREAL SUBMISSION WORKFLOW - KIỂM TRA CHỨC NĂNG

## ✅ LUỒNG XỬ LÝ ĐÚNG CÁCH

### **1. PLAYER NỘP BÀI (Frontend)**

#### QuestReporting.tsx / DynamicQuestReport.tsx
```typescript
// ✅ ĐÚNG - Chỉ tạo submission với status 'pending'
await addDoc(collection(db, 'submissions'), {
  submissionId,
  userId: currentUser.uid,
  questId: quest.questId,
  proofData: downloadURL,
  proofType: 'image',
  status: 'pending',  // ✅ PENDING - chưa cộng điểm
  submittedAt: serverTimestamp()
});

// ✅ KHÔNG có logic cộng AURA/Streak
// ✅ Chỉ hiển thị "Đang chờ duyệt"
```

#### AuraOfferingCeremony.tsx
```typescript
// ✅ ĐÚNG - Chỉ animate AURA nếu đã approved
const animateAuraIncrease = () => {
  if (submission.status !== 'approved') {
    setDisplayedAura(currentAura); // ✅ Giữ nguyên AURA hiện tại
    return;
  }
  // Chỉ animate nếu đã approved
}
```

### **2. ADMIN DUYỆT BÀI (AdminPanel)**

#### AdminPanel.tsx - handleApprove()
```typescript
// ✅ ĐÚNG - Cộng AURA và Streak KHI ADMIN APPROVE
const handleApprove = async (submissionId: string) => {
  // 1. Lấy thông tin submission, quest, user
  const submissionToApprove = pendingSubmissions.find(s => s.submissionId === submissionId);
  const questDoc = await getDoc(doc(db, 'quests', submissionToApprove.questId));
  const userDoc = await getDoc(doc(db, 'users', submissionToApprove.userId));
  
  // 2. Tính toán AURA và Streak mới
  const newAura = (currentUserData.currentAura || 0) + questData.auraReward;
  const newStreak = (currentUserData.currentStreak || 0) + 1;
  
  // 3. Cập nhật submission status = 'approved'
  await updateDoc(submissionRef, {
    status: 'approved',
    approvedAt: new Date(),
    approvedBy: userData?.userId
  });
  
  // 4. ✅ CỘNG AURA VÀ STREAK CHỈ KHI ADMIN APPROVE
  await updateDoc(userRef, {
    currentAura: newAura,
    currentStreak: newStreak,
    lastQuestCompleted: new Date()
  });
}
```

### **3. PLAYER NHẬN THÔNG BÁO**

#### Khi player reload dashboard:
- ✅ AURA và Streak được cập nhật trong database
- ✅ AuraOfferingCeremony hiển thị animation khi submission.status === 'approved'
- ✅ Player thấy điểm đã được cộng

---

## 🧪 KỊCH BẢN KIỂM TRA

### **Test Case 1: Player Submit Quest**
1. **Player Action:** Nhấn "Hoàn Thành Rèn Luyện"
2. **Expected Result:**
   - ✅ File được upload lên Storage
   - ✅ Submission được tạo với status: 'pending'
   - ✅ AURA không thay đổi (giữ nguyên)
   - ✅ Streak không thay đổi
   - ✅ Hiển thị "Đang chờ duyệt"
   - ✅ AuraOfferingCeremony hiển thị "Phần thưởng sẽ được cộng khi được duyệt"

### **Test Case 2: Admin Approve Submission**
1. **Admin Action:** Nhấn "✅ Phê duyệt" trong Admin Panel
2. **Expected Result:**
   - ✅ Submission.status = 'approved'
   - ✅ User.currentAura += quest.auraReward
   - ✅ User.currentStreak += 1
   - ✅ User.lastQuestCompleted = now()
   - ✅ Thông báo "Player đã nhận +X AURA và +1 Streak"

### **Test Case 3: Player Reload After Approval**
1. **Player Action:** Reload dashboard
2. **Expected Result:**
   - ✅ AURA hiển thị số mới (đã cộng)
   - ✅ Streak hiển thị số mới
   - ✅ Nếu có AuraOfferingCeremony, animate từ AURA cũ lên AURA mới
   - ✅ Hiển thị "✅ Đã được duyệt"

### **Test Case 4: Admin Reject Submission**
1. **Admin Action:** Nhấn "❌ Từ chối"
2. **Expected Result:**
   - ✅ Submission.status = 'rejected'
   - ❌ AURA KHÔNG thay đổi
   - ❌ Streak KHÔNG thay đổi
   - ✅ Player có thể nộp lại

---

## 🔍 ĐIỂM KIỂM TRA QUAN TRỌNG

### ✅ **FRONTEND - Submission Components**
- [ ] QuestReporting.tsx - Không cộng AURA khi submit
- [ ] DynamicQuestReport.tsx - Không cộng AURA khi submit  
- [ ] AuraOfferingCeremony.tsx - Chỉ animate khi approved
- [ ] EnhancedQuestManager.tsx - Không cộng AURA trong handleCeremonyComplete

### ✅ **ADMIN PANEL**
- [ ] AdminPanel.tsx handleApprove() - Cộng AURA + Streak
- [ ] AdminPanel.tsx handleReject() - KHÔNG cộng AURA/Streak

### ✅ **USER EXPERIENCE**
- [ ] Player submit: Thấy "Đang chờ duyệt", AURA không đổi
- [ ] Admin approve: Player thấy AURA tăng lên
- [ ] Animation chỉ chạy khi đã approved

---

## 🚀 KẾT QUẢ MONG MUỐN

**LUỒNG HOÀN HẢO:**
```
Player Submit → Status: Pending → AURA: Unchanged → Admin Approve → AURA: +Reward → Player Happy! 🎉
```

**KHÔNG ĐƯỢC XẢY RA:**
```
Player Submit → AURA: +Reward ❌ (Cộng sớm - SAI!)
```

---

*Tài liệu này đảm bảo rằng AURA và Streak chỉ được cộng SAU KHI Admin phê duyệt, tuân thủ đúng business logic của GoReal Web Game.*