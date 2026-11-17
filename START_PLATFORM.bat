@echo off
setlocal
cd /d "%~dp0"

title Khoi dong Cay Tri An & AI Academy Support
echo ==================================================================
echo   KHOI DONG NEN TANG: CAY TRI AN TAY NGUYEN + AI ACADEMY SUPPORT
echo ==================================================================
echo.

where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [LOI] Khong tim thay Node.js trong he thong!
    echo Vui long cai dat Node.js tai https://nodejs.org de khoi chay san pham.
    echo.
    pause
    exit /b 1
)

node scripts\platform-start.cjs

timeout /t 3 /nobreak >nul 2>&1
exit /b 0
