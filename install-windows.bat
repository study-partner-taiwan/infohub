@echo off
title InfoHub
cd /d "%~dp0"

echo.
echo  ======================================
echo       InfoHub  -  Starting...
echo  ======================================
echo.

:: ========== Check Node.js ==========
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  ERROR: Node.js is not installed!
    echo  Please go to https://nodejs.org and install it.
    start https://nodejs.org
    goto :done
)
for /f "tokens=*" %%v in ('node -v') do echo  OK - Node.js %%v

:: ========== Always clear build cache ==========
echo  Clearing build cache...
if exist ".next" rd /s /q ".next" 2>nul

:: ========== Install / Update dependencies ==========
if not exist "node_modules\youtube-transcript" (
    echo  Installing/updating dependencies...
    if exist "node_modules" rd /s /q "node_modules" 2>nul
    if exist "package-lock.json" del /f /q "package-lock.json" >nul 2>&1
    call npm install
    if not exist "node_modules\next" (
        echo  ERROR: npm install failed!
        goto :done
    )
    echo  OK - Dependencies installed!
) else (
    echo  OK - Dependencies ready
)

:: ========== Config ==========
if not exist ".env.local" (
    copy ".env.example" ".env.local" >nul
    echo  Created .env.local
)

:: ========== Launch ==========
echo.
echo  ========================================
echo   InfoHub: http://localhost:3000
echo   Press Ctrl+C to stop
echo  ========================================
echo.

start /b cmd /c "timeout /t 5 /nobreak >nul && start http://localhost:3000"
call npx next dev

:done
echo.
pause
