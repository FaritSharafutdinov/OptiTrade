#!/bin/bash
# Скрипт для запуска всех сервисов OptiTrade на Linux/macOS

set -e

echo "🚀 Запуск OptiTrade - все сервисы"
echo ""

# Проверяем наличие виртуального окружения
if [ ! -d ".venv" ]; then
    echo "⚠️  Виртуальное окружение не найдено. Создаю..."
    python3 -m venv .venv
fi

# Активируем виртуальное окружение
echo "📦 Активирую виртуальное окружение..."
source .venv/bin/activate

# Проверяем установленные зависимости
echo "🔍 Проверяю зависимости..."
if ! python -c "import fastapi" 2>/dev/null; then
    echo "📥 Устанавливаю зависимости..."
    pip install -r requirements.txt
else
    echo "✅ Зависимости уже установлены"
fi

# Проверяем наличие .env файла
if [ ! -f ".env" ]; then
    echo "⚠️  Файл .env не найден. Создаю из примера..."
    cat > .env << EOF
ADMIN_API_KEY=devkey
MODEL_SERVICE_URL=http://127.0.0.1:8001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/optitrade
MODEL_TYPE=ppo
USE_RL_MODEL=true
EOF
    echo "✅ Создан файл .env"
fi

# Проверяем frontend зависимости
if [ ! -d "frontend/node_modules" ]; then
    echo "📥 Устанавливаю зависимости frontend..."
    cd frontend
    npm install
    cd ..
fi

echo ""
echo "🎯 Запускаю сервисы..."
echo ""

# Функция для остановки всех процессов при выходе
cleanup() {
    echo ""
    echo "🛑 Остановка всех сервисов..."
    kill $MODEL_SERVICE_PID $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    exit
}

trap cleanup SIGINT SIGTERM

# Запускаем model_service в фоне
echo "🤖 Запуск Model Service (порт 8001)..."
MODEL_TYPE=ppo USE_RL_MODEL=true uvicorn model_service.main:app --host 127.0.0.1 --port 8001 --reload &
MODEL_SERVICE_PID=$!

sleep 3

# Запускаем backend в фоне
echo "🔧 Запуск Backend API (порт 8000)..."
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!

sleep 3

# Запускаем frontend
echo "🌐 Запуск Frontend (порт 5173)..."
cd frontend
npm run dev -- --host &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Все сервисы запущены!"
echo ""
echo "📍 Доступные URL:"
echo "   Frontend:    http://localhost:5173"
echo "   Backend API: http://localhost:8000"
echo "   Model Service: http://localhost:8001"
echo "   API Docs:    http://localhost:8000/docs"
echo ""
echo "⚠️  Для остановки нажмите Ctrl+C"
echo ""

# Ждем завершения
wait

