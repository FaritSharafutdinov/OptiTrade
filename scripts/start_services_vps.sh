#!/bin/bash
# Скрипт для запуска всех сервисов OptiTrade на VPS
# Использование: ./scripts/start_services_vps.sh [--background]

set -e

# Получаем директорию скрипта
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

cd "$PROJECT_ROOT"

# Проверка флага фонового режима
BACKGROUND=false
if [[ "$1" == "--background" ]] || [[ "$1" == "-b" ]]; then
    BACKGROUND=true
fi

echo "🚀 Запуск OptiTrade на VPS"
echo "📁 Директория проекта: $PROJECT_ROOT"
echo ""

# Проверяем виртуальное окружение
if [ ! -d ".venv" ]; then
    echo "⚠️  Виртуальное окружение не найдено. Создаю..."
    python3 -m venv .venv
fi

# Активируем виртуальное окружение
echo "📦 Активирую виртуальное окружение..."
source .venv/bin/activate

# Проверяем зависимости
echo "🔍 Проверяю Python зависимости..."
if ! python -c "import fastapi" 2>/dev/null; then
    echo "📥 Устанавливаю Python зависимости..."
    pip install --upgrade pip
    pip install -r requirements.txt
else
    echo "✅ Python зависимости установлены"
fi

# Проверяем .env файл
if [ ! -f ".env" ]; then
    echo "⚠️  Файл .env не найден. Создаю..."
    cat > .env << EOF
ADMIN_API_KEY=$(openssl rand -hex 16)
MODEL_SERVICE_URL=http://127.0.0.1:9001
DATABASE_URL=sqlite:///./optitrade.db
MODEL_TYPE=ppo
USE_RL_MODEL=true
EOF
    echo "✅ Создан файл .env с случайным ADMIN_API_KEY"
fi

# Проверяем frontend зависимости
if [ ! -d "frontend/node_modules" ]; then
    echo "📥 Устанавливаю зависимости frontend..."
    cd frontend
    npm install
    cd ..
else
    echo "✅ Frontend зависимости установлены"
fi

echo ""
echo "🎯 Запускаю сервисы..."
echo ""

# Функция для остановки всех процессов
cleanup() {
    echo ""
    echo "🛑 Остановка всех сервисов..."
    if [ ! -z "$MODEL_SERVICE_PID" ]; then
        kill $MODEL_SERVICE_PID 2>/dev/null || true
    fi
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    exit
}

trap cleanup SIGINT SIGTERM EXIT

# Запуск Model Service
echo "🤖 Запуск Model Service (порт 9001)..."
if [ "$BACKGROUND" = true ]; then
    MODEL_TYPE=ppo USE_RL_MODEL=true uvicorn model_service.main:app --host 0.0.0.0 --port 9001 > /tmp/optitrade_model.log 2>&1 &
    MODEL_SERVICE_PID=$!
    echo "   PID: $MODEL_SERVICE_PID (логи: /tmp/optitrade_model.log)"
else
    MODEL_TYPE=ppo USE_RL_MODEL=true uvicorn model_service.main:app --host 0.0.0.0 --port 9001 &
    MODEL_SERVICE_PID=$!
fi

sleep 3

# Запуск Backend
echo "🔧 Запуск Backend API (порт 9000)..."
if [ "$BACKGROUND" = true ]; then
    uvicorn backend.main:app --host 0.0.0.0 --port 9000 > /tmp/optitrade_backend.log 2>&1 &
    BACKEND_PID=$!
    echo "   PID: $BACKEND_PID (логи: /tmp/optitrade_backend.log)"
else
    uvicorn backend.main:app --host 0.0.0.0 --port 9000 &
    BACKEND_PID=$!
fi

sleep 3

# Запуск Frontend
echo "🌐 Запуск Frontend (порт 5175)..."
cd frontend
if [ "$BACKGROUND" = true ]; then
    npm run dev -- --host 0.0.0.0 --port 5175 > /tmp/optitrade_frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo "   PID: $FRONTEND_PID (логи: /tmp/optitrade_frontend.log)"
else
    npm run dev -- --host 0.0.0.0 --port 5175 &
    FRONTEND_PID=$!
fi
cd ..

echo ""
echo "✅ Все сервисы запущены!"
echo ""
echo "📍 Доступные URL:"
echo "   Frontend:    http://$(hostname -I | awk '{print $1}'):5175"
echo "   Backend API: http://$(hostname -I | awk '{print $1}'):9000"
echo "   API Docs:    http://$(hostname -I | awk '{print $1}'):9000/docs"
echo "   Model Service: http://$(hostname -I | awk '{print $1}'):9001/health"
echo ""

if [ "$BACKGROUND" = true ]; then
    echo "📋 Логи:"
    echo "   Model Service: tail -f /tmp/optitrade_model.log"
    echo "   Backend:       tail -f /tmp/optitrade_backend.log"
    echo "   Frontend:      tail -f /tmp/optitrade_frontend.log"
    echo ""
    echo "⚠️  Сервисы запущены в фоновом режиме"
    echo "   Для остановки: pkill -f 'uvicorn\|vite'"
else
    echo "⚠️  Для остановки нажмите Ctrl+C"
    echo ""
    # Ждем завершения
    wait
fi

