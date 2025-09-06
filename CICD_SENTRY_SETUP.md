# 🚀 Hướng dẫn Setup CI/CD và Error Tracking

## Tổng quan nâng cấp

Dự án "Lò Rèn Titan" đã được nâng cấp với hai tính năng quan trọng:

1. **🔍 Error Tracking với Sentry** - Tự động theo dõi và báo cáo lỗi
2. **⚡ CI/CD với GitHub Actions** - Tự động build và deploy

---

## 🔍 Phần 1: Thiết lập Sentry Error Tracking

### Bước 1: Tạo tài khoản Sentry

1. Truy cập [sentry.io](https://sentry.io)
2. Đăng ký tài khoản miễn phí
3. Tạo project mới:
   - **Platform**: React
   - **Project Name**: goreal-titans-forge
   - **Team**: Personal hoặc tạo team mới

### Bước 2: Lấy Sentry DSN

1. Sau khi tạo project, Sentry sẽ hiển thị **DSN** (Data Source Name)
2. DSN có dạng: `https://abc123@o123456.ingest.sentry.io/123456`
3. Copy DSN này để cấu hình

### Bước 3: Cấu hình Environment Variables

Thêm Sentry DSN vào file `.env`:

```env
# Thêm dòng này vào file frontend/.env
REACT_APP_SENTRY_DSN=https://your-actual-dsn@sentry.io/your-project-id
```

### Bước 4: Test Sentry Integration

1. Chạy app: `cd frontend && npm start`
2. Tạo một lỗi test để kiểm tra:

```javascript
// Thêm vào một component để test
const testSentryError = () => {
  throw new Error("Test Sentry Error - Lò Rèn Titan");
};

// Hoặc test manual capture
import * as Sentry from "@sentry/react";
Sentry.captureMessage("Test message from Titans' Guild", "info");
```

3. Kiểm tra dashboard Sentry để thấy lỗi được ghi nhận

---

## ⚡ Phần 2: Thiết lập CI/CD với GitHub Actions

### Bước 1: Setup Google Cloud Workload Identity Federation

#### A. Tạo Workload Identity Pool

```bash
# Đăng nhập Google Cloud CLI
gcloud auth login

# Thiết lập project
gcloud config set project YOUR_PROJECT_ID

# Tạo Workload Identity Pool
gcloud iam workload-identity-pools create "github-pool" \
  --project="YOUR_PROJECT_ID" \
  --location="global" \
  --display-name="GitHub Actions Pool"

# Tạo Workload Identity Provider
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --project="YOUR_PROJECT_ID" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --display-name="GitHub Actions Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.aud=assertion.aud,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"
```

#### B. Tạo Service Account

```bash
# Tạo service account cho GitHub Actions
gcloud iam service-accounts create "github-actions-sa" \
  --display-name="GitHub Actions Service Account"

# Gán quyền cần thiết
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/firebase.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudfunctions.admin"

# Liên kết với Workload Identity
gcloud iam service-accounts add-iam-policy-binding \
  "github-actions-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --project="YOUR_PROJECT_ID" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/attribute.repository/YOUR_GITHUB_USERNAME/goreal-project"
```

### Bước 2: Tạo Firebase Token

```bash
# Đăng nhập Firebase CLI
firebase login

# Tạo CI token
firebase login:ci
```

Copy token được tạo ra để sử dụng trong GitHub Secrets.

### Bước 3: Cấu hình GitHub Secrets

Trong GitHub repository, vào **Settings** → **Secrets and variables** → **Actions**, thêm các secrets sau:

#### Required Secrets:

```
GCP_PROJECT_ID
└── YOUR_FIREBASE_PROJECT_ID

GCP_WIF_PROVIDER  
└── projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/providers/github-provider

GCP_SERVICE_ACCOUNT
└── github-actions-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com

FIREBASE_TOKEN
└── Token từ bước firebase login:ci
```

#### Cách lấy PROJECT_NUMBER:
```bash
gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)"
```

### Bước 4: Test CI/CD Pipeline

1. Push code lên GitHub repository
2. Workflow sẽ tự động chạy khi push lên branch `main`
3. Kiểm tra tab **Actions** trong GitHub để theo dõi tiến trình

---

## 📊 Monitoring và Troubleshooting

### Sentry Dashboard

**Các thông tin được theo dõi:**
- JavaScript errors và exceptions
- Performance metrics
- User context (ai gặp lỗi, role, guild)
- Custom events và messages

**Useful Sentry Features:**
```javascript
// Ghi nhận event custom
Sentry.addBreadcrumb({
  message: 'User completed quest',
  category: 'quest',
  data: { questId: 'quest_123', auraReward: 50 }
});

// Ghi nhận user action
Sentry.captureMessage('User uploaded quest proof', 'info');

// Performance monitoring
const transaction = Sentry.startTransaction({
  name: 'Quest Submission',
  op: 'user_action'
});
// ... thực hiện action ...
transaction.finish();
```

### GitHub Actions Monitoring

**Kiểm tra deployment:**
- **Build logs**: Tab Actions → Build job
- **Deployment status**: Environment tab
- **Function logs**: Google Cloud Console → Cloud Functions

**Common Issues:**

1. **Build fails**: Kiểm tra TypeScript errors
```bash
cd frontend && npm run build
```

2. **Deployment fails**: Kiểm tra permissions và secrets
```bash
# Verify project ID
gcloud config get-value project

# Check service account permissions
gcloud projects get-iam-policy YOUR_PROJECT_ID
```

3. **Function deployment fails**: Kiểm tra dependencies
```bash
cd backend-functions && npm ci
```

---

## 🔧 Local Development

### Environment Setup

```bash
# Frontend
cd frontend
cp .env.example .env
# Chỉnh sửa .env với config thực tế
npm install
npm start

# Backend (nếu test local)
cd backend-functions
npm install
npm start
```

### Debug Commands

```bash
# Test build
npm run build

# Check for security vulnerabilities  
npm audit

# Test Sentry locally
# Tạm thời set DSN trong .env và test throw error
```

---

## 🚀 Deployment Process

### Automatic Deployment (Recommended)

1. Develop trên branch feature
2. Tạo Pull Request → `main`
3. CI sẽ chạy tests và validation
4. Merge PR → Auto deploy to production

### Manual Deployment (Backup)

```bash
# Frontend
cd frontend
npm run build
firebase deploy --only hosting

# Backend  
cd backend-functions
gcloud functions deploy approveSubmission --runtime nodejs18 --trigger-http
gcloud functions deploy rejectSubmission --runtime nodejs18 --trigger-http
```

---

## 📞 Support & Resources

### Documentation
- [Sentry React SDK](https://docs.sentry.io/platforms/javascript/guides/react/)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Firebase CI/CD](https://firebase.google.com/docs/hosting/github-integration)

### Useful Commands

```bash
# Check deployment status
firebase hosting:channel:list

# View function logs
gcloud functions logs read approveSubmission

# Test functions locally  
npm start --prefix backend-functions

# Sentry CLI (optional)
npm install -g @sentry/cli
sentry-cli releases list
```

---

**🔥 Lò Rèn Titan giờ đã có Error Tracking và Auto Deployment! ⚔️🛡️**

*Mọi lỗi sẽ được tự động ghi nhận, và mọi thay đổi code sẽ được tự động deploy!*