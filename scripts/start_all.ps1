# Скрипт для запуска всех сервисов OptiTrade на Windows

Write-Host "🚀 Запуск OptiTrade - все сервисы" -ForegroundColor Green
Write-Host ""

# Проверяем наличие виртуального окружения
if (-not (Test-Path ".venv")) {
    Write-Host "⚠️  Виртуальное окружение не найдено. Создаю..." -ForegroundColor Yellow
    python -m venv .venv
}

# Активируем виртуальное окружение
Write-Host "📦 Активирую виртуальное окружение..." -ForegroundColor Cyan
& .\.venv\Scripts\Activate.ps1

# Проверяем установленные зависимости
Write-Host "🔍 Проверяю зависимости..." -ForegroundColor Cyan
$requirementsInstalled = Test-Path ".venv\Lib\site-packages\fastapi"
if (-not $requirementsInstalled) {
    Write-Host "📥 Устанавливаю зависимости..." -ForegroundColor Yellow
    pip install -r requirements.txt
} else {
    Write-Host "✅ Зависимости уже установлены" -ForegroundColor Green
}

# Проверяем наличие .env файла
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  Файл .env не найден. Создаю из примера..." -ForegroundColor Yellow
    $envContent = @"
ADMIN_API_KEY=devkey
MODEL_SERVICE_URL=http://127.0.0.1:8001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/optitrade
MODEL_TYPE=ppo
USE_RL_MODEL=true
"@
    $envContent | Out-File -FilePath ".env" -Encoding utf8
    Write-Host "✅ Создан файл .env" -ForegroundColor Green
}

# Проверяем frontend зависимости
if (-not (Test-Path "frontend\node_modules")) {
    Write-Host "📥 Устанавливаю зависимости frontend..." -ForegroundColor Yellow
    Set-Location frontend
    npm install
    Set-Location ..
}

Write-Host ""
Write-Host "🎯 Запускаю сервисы..." -ForegroundColor Green
Write-Host ""

# Запускаем model_service в фоновом процессе
Write-Host "🤖 Запуск Model Service (порт 8001)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; .\.venv\Scripts\Activate.ps1; `$env:MODEL_TYPE='ppo'; `$env:USE_RL_MODEL='true'; uvicorn model_service.main:app --host 127.0.0.1 --port 8001 --reload"

Start-Sleep -Seconds 3

# Запускаем backend в фоновом процессе
Write-Host "🔧 Запуск Backend API (порт 8000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; .\.venv\Scripts\Activate.ps1; uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload"

Start-Sleep -Seconds 3

# Запускаем frontend
Write-Host "🌐 Запуск Frontend (порт 5173)..." -ForegroundColor Cyan
Set-Location frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev -- --host"
Set-Location ..

Write-Host ""
Write-Host "✅ Все сервисы запущены!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Доступные URL:" -ForegroundColor Yellow
Write-Host "   Frontend:    http://localhost:5173" -ForegroundColor White
Write-Host "   Backend API: http://localhost:8000" -ForegroundColor White
Write-Host "   Model Service: http://localhost:8001" -ForegroundColor White
Write-Host "   API Docs:    http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  Для остановки закройте все окна PowerShell" -ForegroundColor Yellow

