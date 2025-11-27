# Локальный деплой OptiTrade

## Быстрый старт

### Windows

1. **Откройте PowerShell в корне проекта**

2. **Запустите скрипт автоматического запуска:**
   ```powershell
   .\scripts\start_all.ps1
   ```
   
   Или используйте Batch файл:
   ```cmd
   scripts\start_all.bat
   ```

3. **Откройте браузер:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000/docs
   - Model Service: http://localhost:8001/health

### Linux/macOS

1. **Откройте терминал в корне проекта**

2. **Сделайте скрипт исполняемым и запустите:**
   ```bash
   chmod +x scripts/start_all.sh
   ./scripts/start_all.sh
   ```

3. **Откройте браузер:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000/docs
   - Model Service: http://localhost:8001/health

## Ручной запуск (если нужно)

### 1. Настройка окружения

**Создайте виртуальное окружение:**
```bash
python -m venv .venv

# Windows
.venv\Scripts\activate

# Linux/macOS
source .venv/bin/activate
```

**Установите зависимости:**
```bash
pip install -r requirements.txt
```

**Создайте файл `.env` в корне проекта:**
```env
ADMIN_API_KEY=devkey
MODEL_SERVICE_URL=http://127.0.0.1:8001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/optitrade
MODEL_TYPE=ppo
USE_RL_MODEL=true
```

### 2. Настройка Frontend

```bash
cd frontend
npm install
```

Создайте `frontend/.env` (опционально):
```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_BASE_URL=http://127.0.0.1:8000
```

### 3. Запуск сервисов

**Терминал 1 - Model Service:**
```bash
MODEL_TYPE=ppo USE_RL_MODEL=true uvicorn model_service.main:app --host 127.0.0.1 --port 8001 --reload
```

**Терминал 2 - Backend:**
```bash
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

**Терминал 3 - Frontend:**
```bash
cd frontend
npm run dev -- --host
```

## Проверка работоспособности

### Model Service
```bash
curl http://localhost:8001/health
```
Ожидаемый ответ:
```json
{
  "status": "ok",
  "model_loaded": true,
  "model_type": "ppo"
}
```

### Backend
```bash
curl http://localhost:8000/health
```
Ожидаемый ответ:
```json
{
  "status": "ok"
}
```

### Тест предсказания модели
```bash
curl -X POST http://localhost:8001/predict \
  -H "Content-Type: application/json" \
  -d '{
    "features": [0.1, 0.2, -0.1, 0.3, 0.05],
    "symbol": "BTC",
    "timestamp": "2024-01-01T00:00:00Z"
  }'
```

## Настройка PostgreSQL (опционально)

Если вы хотите использовать базу данных:

### Windows
1. Скачайте и установите PostgreSQL: https://www.postgresql.org/download/windows/
2. Запустите pgAdmin или используйте psql
3. Создайте базу данных:
   ```sql
   CREATE DATABASE optitrade;
   CREATE USER optitrade WITH PASSWORD 'optitrade';
   GRANT ALL PRIVILEGES ON DATABASE optitrade TO optitrade;
   ```

### Linux/macOS
```bash
# Установка PostgreSQL
# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib

# macOS
brew install postgresql@15
brew services start postgresql@15

# Создание базы данных
psql postgres
CREATE DATABASE optitrade;
CREATE USER optitrade WITH PASSWORD 'optitrade';
GRANT ALL PRIVILEGES ON DATABASE optitrade TO optitrade;
\q
```

**Примечание:** Backend будет работать даже без PostgreSQL, но некоторые функции могут быть ограничены.

## Режимы работы Model Service

### С RL моделью (рекомендуется)
```env
USE_RL_MODEL=true
MODEL_TYPE=ppo  # или a2c, sac
```

Модель будет загружена из `RL_algorithms/models/{MODEL_TYPE}/`

### Упрощенный режим (без ML)
```env
USE_RL_MODEL=false
```

Используется простая пороговая логика без ML моделей.

## Устранение проблем

### Модель не загружается
- Проверьте наличие файла модели: `RL_algorithms/models/PPO/ppo_baseline.zip`
- Проверьте логи Model Service при запуске
- Установите `USE_RL_MODEL=false` для демо режима

### Ошибки импорта
- Убедитесь, что все зависимости установлены: `pip install -r requirements.txt`
- Проверьте версию Python (требуется 3.9+)

### Порт уже занят
- Измените порты в командах запуска
- Обновите `MODEL_SERVICE_URL` в `.env` если изменили порт Model Service

### Frontend не подключается к Backend
- Проверьте `VITE_API_BASE_URL` в `frontend/.env`
- Убедитесь, что Backend запущен на правильном порту

## Структура портов

- **Frontend**: 5173 (Vite dev server)
- **Backend**: 8000 (FastAPI)
- **Model Service**: 8001 (FastAPI)

Все сервисы доступны на localhost.

