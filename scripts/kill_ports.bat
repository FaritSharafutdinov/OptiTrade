@echo off
chcp 65001 >nul
echo ========================================
echo Killing processes on ports 9000, 9001, 5175
echo ========================================
echo.

echo [INFO] Checking ports...
echo.

REM Function to kill process on port
set PORT_FOUND=0

REM Kill processes on port 9000 (Backend)
echo Checking port 9000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :9000 ^| findstr LISTENING') do (
    echo [INFO] Found process %%a on port 9000, killing...
    taskkill /F /PID %%a >nul 2>&1
    if errorlevel 1 (
        echo [WARN] Failed to kill process %%a, trying again...
        taskkill /F /PID %%a /T >nul 2>&1
    ) else (
        echo [OK] Process %%a killed
        set PORT_FOUND=1
    )
)

REM Kill processes on port 9001 (Model Service)
echo Checking port 9001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :9001 ^| findstr LISTENING') do (
    echo [INFO] Found process %%a on port 9001, killing...
    taskkill /F /PID %%a >nul 2>&1
    if errorlevel 1 (
        echo [WARN] Failed to kill process %%a, trying again...
        taskkill /F /PID %%a /T >nul 2>&1
    ) else (
        echo [OK] Process %%a killed
        set PORT_FOUND=1
    )
)

REM Kill processes on port 5175 (Frontend)
echo Checking port 5175...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5175 ^| findstr LISTENING') do (
    echo [INFO] Found process %%a on port 5175, killing...
    taskkill /F /PID %%a >nul 2>&1
    if errorlevel 1 (
        echo [WARN] Failed to kill process %%a, trying again...
        taskkill /F /PID %%a /T >nul 2>&1
    ) else (
        echo [OK] Process %%a killed
        set PORT_FOUND=1
    )
)

echo.
echo [INFO] Killing all Python processes related to uvicorn...
for /f "tokens=2" %%a in ('tasklist ^| findstr /i "python.exe"') do (
    wmic process where "ProcessId=%%a AND CommandLine LIKE '%%uvicorn%%'" delete >nul 2>&1
)

echo.
echo [INFO] Waiting 2 seconds for processes to terminate...
timeout /t 2 /nobreak >nul

echo.
echo [INFO] Final check - checking if ports are free...

REM Check if ports are still in use
netstat -ano | findstr :9000 | findstr LISTENING >nul
if errorlevel 1 (
    echo [OK] Port 9000 is free
) else (
    echo [WARN] Port 9000 is still in use!
    echo [INFO] Trying to kill all processes using port 9000...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :9000 ^| findstr LISTENING') do (
        taskkill /F /PID %%a /T >nul 2>&1
    )
)

netstat -ano | findstr :9001 | findstr LISTENING >nul
if errorlevel 1 (
    echo [OK] Port 9001 is free
) else (
    echo [WARN] Port 9001 is still in use!
    echo [INFO] Trying to kill all processes using port 9001...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :9001 ^| findstr LISTENING') do (
        taskkill /F /PID %%a /T >nul 2>&1
    )
)

netstat -ano | findstr :5175 | findstr LISTENING >nul
if errorlevel 1 (
    echo [OK] Port 5175 is free
) else (
    echo [WARN] Port 5175 is still in use!
    echo [INFO] Trying to kill all processes using port 5175...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5175 ^| findstr LISTENING') do (
        taskkill /F /PID %%a /T >nul 2>&1
    )
)

echo.
echo ========================================
echo [OK] Done! Ports should be free now.
echo ========================================
echo.
echo If ports are still in use, you may need to:
echo 1. Close all command windows manually
echo 2. Open Task Manager (Ctrl+Shift+Esc)
echo 3. End all Python.exe and Node.exe processes
echo.
pause
