@echo off
chcp 65001 >nul
echo ========================================
echo Killing ALL Python and Node processes
echo ========================================
echo.
echo [WARN] This will kill ALL Python and Node processes!
echo [INFO] Press Ctrl+C to cancel, or any key to continue...
pause
echo.

echo [INFO] Killing all Python processes...
taskkill /F /IM python.exe >nul 2>&1
taskkill /F /IM pythonw.exe >nul 2>&1

echo [INFO] Killing all Node processes...
taskkill /F /IM node.exe >nul 2>&1

echo [INFO] Waiting 2 seconds...
timeout /t 2 /nobreak >nul

echo.
echo [INFO] Checking ports...
netstat -ano | findstr ":8000 :8001 :5173" | findstr LISTENING >nul
if errorlevel 1 (
    echo [OK] All ports are free!
) else (
    echo [WARN] Some ports are still in use:
    netstat -ano | findstr ":8000 :8001 :5173" | findstr LISTENING
    echo.
    echo [INFO] Trying to kill remaining processes...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000 :8001 :5173" ^| findstr LISTENING') do (
        echo Killing process %%a...
        taskkill /F /PID %%a /T >nul 2>&1
    )
)

echo.
echo [OK] Done!
echo.
pause

