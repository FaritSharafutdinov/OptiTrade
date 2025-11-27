@echo off
chcp 65001 >nul
echo Checking Node.js and npm installation...
echo.

where node >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Node.js found!
    node --version
    echo.
) else (
    echo [ERROR] Node.js NOT found in PATH
    echo.
)

where npm >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] npm found!
    npm --version
    echo.
) else (
    echo [ERROR] npm NOT found in PATH
    echo.
)

echo.
echo If Node.js is not installed:
echo 1. Download from https://nodejs.org/
echo 2. Install LTS version
echo 3. Restart command prompt
echo 4. Run start_all.bat again
echo.
pause
