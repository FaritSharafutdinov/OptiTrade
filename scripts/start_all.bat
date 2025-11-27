@echo off
chcp 65001 >nul
REM Script to start all OptiTrade services on Windows

echo ========================================
echo Starting OptiTrade - All Services
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

REM Check for Node.js
echo [INFO] Checking Node.js...
where npm >nul 2>&1
if errorlevel 1 (
    echo [WARN] Node.js not found - Frontend will be skipped
    echo        Backend and Model Service will work normally
    set FRONTEND_ENABLED=0
) else (
    set FRONTEND_ENABLED=1
    echo [OK] Node.js found
    REM Check frontend dependencies
    if not exist "frontend\node_modules" (
        echo [INFO] Installing frontend dependencies...
        pushd "%PROJECT_ROOT%\frontend"
        if errorlevel 1 (
            echo [ERROR] Cannot access frontend directory
            set FRONTEND_ENABLED=0
        ) else (
            call npm install
            if errorlevel 1 (
                echo [ERROR] Failed to install frontend dependencies
                set FRONTEND_ENABLED=0
            ) else (
                echo [OK] Frontend dependencies installed
            )
            popd
        )
    ) else (
        echo [OK] Frontend dependencies already installed
    )
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

timeout /t 3 /nobreak >nul

REM Start frontend (only if Node.js is installed)
if "%FRONTEND_ENABLED%"=="1" (
    echo [INFO] Starting Frontend on port 5173...
    start "Frontend" cmd /k "cd /d "%PROJECT_ROOT%\frontend" && npm run dev -- --host"
) else (
    echo [WARN] Frontend skipped (Node.js not installed)
)

echo.
echo ========================================
echo [OK] All services started!
echo ========================================
echo.
echo Available URLs:
echo    Frontend:     http://localhost:5173
echo    Backend API:  http://localhost:8000
echo    Model Service: http://localhost:8001
echo    API Docs:     http://localhost:8000/docs
echo.
echo [INFO] To stop services, close all command windows
echo.
pause
