@echo off
title Stop InfoHub
echo.
echo  Stopping InfoHub...
echo.

:: Find and kill node process running on port 3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
    echo  Stopped process PID: %%a
)

echo.
echo  InfoHub has been stopped.
echo.
pause
