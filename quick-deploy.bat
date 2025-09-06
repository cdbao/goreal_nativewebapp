@echo off
echo.
echo ========================================
echo   🔥 LÒ RÈN TITAN - QUICK DEPLOY 🔥
echo ========================================
echo.

REM Kiểm tra Node.js
echo [1/5] Kiểm tra Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Lỗi: Node.js chưa được cài đặt!
    echo Tải tại: https://nodejs.org
    pause
    exit /b 1
)
echo ✅ Node.js OK

REM Kiểm tra file .env
echo.
echo [2/5] Kiểm tra cấu hình...
if not exist "frontend\.env" (
    echo ❌ File .env chưa tồn tại!
    echo Hãy copy frontend\.env.example thành frontend\.env
    echo và điền thông tin Firebase config
    pause
    exit /b 1
)
echo ✅ File .env có sẵn

REM Build Frontend
echo.
echo [3/5] Building Frontend...
cd frontend
call npm install
if errorlevel 1 (
    echo ❌ npm install thất bại
    pause
    exit /b 1
)

call npm run build
if errorlevel 1 (
    echo ❌ Build thất bại
    pause
    exit /b 1
)
echo ✅ Frontend build thành công
cd..

REM Kiểm tra Firebase CLI
echo.
echo [4/5] Kiểm tra Firebase CLI...
firebase --version >nul 2>&1
if errorlevel 1 (
    echo 🔄 Cài đặt Firebase CLI...
    call npm install -g firebase-tools
    if errorlevel 1 (
        echo ❌ Không thể cài Firebase CLI
        pause
        exit /b 1
    )
)
echo ✅ Firebase CLI OK

REM Deploy
echo.
echo [5/5] Deploy lên Firebase...
echo 🚀 Đang deploy...
cd frontend
call firebase deploy --only hosting
if errorlevel 1 (
    echo ❌ Deploy thất bại
    echo Hãy chạy: firebase login
    echo Rồi thử lại
    pause
    exit /b 1
)

echo.
echo ========================================
echo   🎉 DEPLOY THÀNH CÔNG! 🎉
echo ========================================
echo.
echo ✅ Frontend đã được deploy lên Firebase Hosting
echo 🌐 Kiểm tra website tại Firebase Console
echo.
echo Tiếp theo:
echo 1. Deploy Backend Functions (xem DEPLOY_GUIDE_SIMPLE.md)
echo 2. Tạo dữ liệu mẫu trong Firestore
echo 3. Test website
echo.
pause