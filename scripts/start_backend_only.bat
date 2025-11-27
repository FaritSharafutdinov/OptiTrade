@echo off
chcp 65001 >nul
REM Script to start only Backend and Model Service (without Frontend)

echo ========================================
echo Starting Backend and Model Service
echo ========================================
echo.

REM Save current directory
cd /d "%~dp0.."
set PROJECT_ROOT=%CD%
echo [INFO] Project root: %PROJECT_ROOT%
echo.

REM Check for virtual environment
if not exist ".venv" (
    echo [WARN] Virtual environment not found. Creating...
    python -m venv .venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment
        pause
        exit /b 1
    )
)

REM Activate virtual environment
echo [INFO] Activating virtual environment...
call .venv\Scripts\activate.bat
if errorlevel 1 (
    echo [ERROR] Failed to activate virtual environment
    pause
    exit /b 1
)

REM Check installed dependencies
echo [INFO] Checking Python dependencies...
python -c "import fastapi" 2>nul
if errorlevel 1 (
    echo [INFO] Installing Python dependencies...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
) else (
    echo [OK] Python dependencies already installed
)

REM Check for .env file
if not exist ".env" (
    echo [WARN] .env file not found. Creating...
    (
        echo ADMIN_API_KEY=devkey
        echo MODEL_SERVICE_URL=http://127.0.0.1:8001
        echo DATABASE_URL=sqlite:///./optitrade.db
        echo MODEL_TYPE=ppo
        echo USE_RL_MODEL=true
    ) > .env
    echo [OK] Created .env file
)

echo.
echo [INFO] Starting services...
echo.

REM Start model_service (without reload to avoid .venv watching issues)
echo [INFO] Starting Model Service on port 8001...
start "Model Service" cmd /k "cd /d "%PROJECT_ROOT%" && call .venv\Scripts\activate.bat && set MODEL_TYPE=ppo && set USE_RL_MODEL=true && python -m uvicorn model_service.main:app --host 127.0.0.1 --port 8001"

timeout /t 3 /nobreak >nul

REM Start backend (without reload to avoid .venv watching issues)
echo [INFO] Starting Backend API on port 8000...
start "Backend API" cmd /k "cd /d "%PROJECT_ROOT%" && call .venv\Scripts\activate.bat && python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000"

echo.
echo ========================================
echo [OK] Backend and Model Service started!
echo ========================================
echo.
echo Available URLs:
echo    Backend API:   http://localhost:8000/docs
echo    Model Service: http://localhost:8001/health
echo.
echo [INFO] To stop services, close all command windows
echo.
pause
