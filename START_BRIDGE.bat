@echo off
setlocal
cd /d "%~dp0"

title Tram Xu Ly AI Academy Support (Codex Bridge)
echo ==================================================================
echo   TRAM XU LY AI ACADEMY SUPPORT - SELF-HOSTED CODEX BRIDGE
echo ==================================================================
echo.

where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [LOI] Khong tim thay Node.js trong he thong!
    echo Vui long cai dat Node.js tai https://nodejs.org de su dung bridge.
    pause
    exit /b 1
)

node scripts\codex-bridge-client.cjs
pause
