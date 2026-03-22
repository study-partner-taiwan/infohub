@echo off
title InfoHub - Setup Auto Start
echo.
echo  ======================================
echo   InfoHub - Auto Start Setup
echo  ======================================
echo.
echo  This will make InfoHub start automatically
echo  when you turn on your computer.
echo.

:: Get the path of this script's directory
set "INFOHUB_DIR=%~dp0"
set "VBS_PATH=%INFOHUB_DIR%start-infohub.vbs"
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_PATH=%STARTUP_DIR%\InfoHub.lnk"

:: Check if start-infohub.vbs exists
if not exist "%VBS_PATH%" (
    echo  ERROR: start-infohub.vbs not found!
    echo  Make sure this script is in the infohub folder.
    goto :done
)

:: Create shortcut in Startup folder using PowerShell
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = '%VBS_PATH%'; $s.WorkingDirectory = '%INFOHUB_DIR%'; $s.Description = 'InfoHub Auto Start'; $s.Save()"

if exist "%SHORTCUT_PATH%" (
    echo  [OK] Auto-start enabled!
    echo.
    echo  InfoHub will now start automatically when
    echo  you log in to Windows.
    echo.
    echo  To disable: delete the shortcut at
    echo  %SHORTCUT_PATH%
) else (
    echo  [FAILED] Could not create startup shortcut.
    echo  Try running this script as Administrator.
)

:done
echo.
pause
