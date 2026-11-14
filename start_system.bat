@echo off
chcp 65001 > nul
title FaceGate AI - Khoi dong he thong

echo ===================================================
echo       HE THONG KIEM SOAT RA VAO FACEGATE AI
echo ===================================================
echo.
echo [1/3] Dang khoi dong Backend API (Port 8000)...
start "FaceGate - Backend API" cmd /k "cd /d %~dp0backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo [2/3] Dang khoi dong AI Service (Port 8001)...
start "FaceGate - AI Service" cmd /k "cd /d %~dp0ai-service && python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload"

echo [3/3] Dang khoi dong Frontend Next.js (Port 3000)...
start "FaceGate - Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ===================================================
echo Tat ca cac dich vu da duoc khoi dong trong cac cua so rieng!
echo.
echo - Frontend:  http://localhost:3000
echo - Backend:   http://localhost:8000
echo - Swagger:   http://localhost:8000/docs
echo - AI Micro:  http://localhost:8001
echo.
echo Tai khoan dang nhap: admin@facegate.ai / Admin@123
echo ===================================================
pause

