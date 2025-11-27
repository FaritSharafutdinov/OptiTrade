# Интеграция ML части с системой OptiTrade

Этот документ описывает, как интегрирована ML часть (RL модели) с фронтендом и бекендом.

## Архитектура

```
┌─────────────┐      ┌─────────────┐      ┌──────────────┐
│  Frontend   │──────│   Backend   │──────│ Model Service│
│  (React)    │      │   (FastAPI) │      │  (FastAPI)   │
│  :5173      │      │    :8000    │      │    :8001     │
└─────────────┘      └─────────────┘      └──────────────┘
                                                  │
                                                  │ загружает
                                                  ▼
                                         ┌──────────────┐
                                         │ RL Models    │
                                         │ (Stable-B3)  │
                                         │ PPO/A2C/SAC  │
                                         └──────────────┘
```

## Компоненты

### 1. Model Service (`model_service/main.py`)

Сервис, который:
- Загружает обученные RL модели при старте
- Принимает наблюдения от бекенда
- Делает предсказания (BUY/SELL/HOLD)
- Поддерживает кэширование истории наблюдений

**API Endpoints:**
- `POST /predict` - предсказание на основе наблюдения
- `GET /health` - проверка состояния
- `POST /predict/batch` - пакетные предсказания
- `POST /cache/clear` - очистка кэша

### 2. Backend (`backend/main.py`)

Основной API сервис, который:
- Проксирует запросы к Model Service через `/model/predict`
- Управляет торговыми операциями
- Хранит данные в PostgreSQL

### 3. RL Models (`RL_algorithms/`)

Папка с обученными моделями:
- `models/PPO/ppo_baseline.zip` - PPO модель
- `models/A2C/a2c_baseline.zip` - A2C модель
- `models/SAC/sac_baseline.zip` - SAC модель

## Формат данных

### Запрос к Model Service

```json
{
  "features": [0.1, 0.2, -0.1, ...],  // Вектор признаков
  "symbol": "BTC",                     // Торговая пара
  "timestamp": "2024-01-01T00:00:00Z", // Время
  "current_price": 50000.0,            // Текущая цена (опционально)
  "volume": 1000.0,                    // Объем (опционально)
  "position": 0.0,                     // Текущая позиция (опционально)
  "position_size": 0.1,                // Размер позиции (опционально)
  "equity": 10000.0                    // Капитал (опционально)
}
```

### Ответ от Model Service

```json
{
  "action": "BUY",           // BUY, SELL, или HOLD
  "confidence": 0.85,        // Уверенность модели (0-1)
  "score": 0.72,             // Сырой скор
  "position": 0.72,          // Предлагаемая позиция (-1..1)
  "size": 0.5,               // Размер позиции (0.1..1.0)
  "model_type": "ppo"        // Тип использованной модели
}
```

## Переменные окружения

### Model Service

```bash
MODEL_TYPE=ppo              # ppo, a2c, или sac
USE_RL_MODEL=true           # Использовать RL модели (true) или простой режим (false)
MODEL_PATH=                 # Опционально: явный путь к модели
PORT=8001                   # Порт сервиса
```

### Backend

```bash
MODEL_SERVICE_URL=http://127.0.0.1:8001  # URL Model Service
ADMIN_API_KEY=devkey                      # API ключ для защищенных endpoints
DATABASE_URL=postgresql://...             # Строка подключения к БД
```

## Режимы работы

### 1. Режим с RL моделью (USE_RL_MODEL=true)

- Загружает обученную модель из `RL_algorithms/models/`
- Использует полную логику предсказания
- Требует корректной структуры данных
- Кэширует историю наблюдений для каждого символа

### 2. Упрощенный режим (USE_RL_MODEL=false)

- Использует простую пороговую логику
- Не требует ML моделей
- Работает с минимальным набором данных
- Полезен для тестирования и демо

## Запуск

### Автоматический запуск (рекомендуется)

```bash
# Windows
.\scripts\start_all.ps1

# Linux/macOS
./scripts/start_all.sh
```

### Ручной запуск

```bash
# 1. Model Service
MODEL_TYPE=ppo USE_RL_MODEL=true uvicorn model_service.main:app --host 127.0.0.1 --port 8001 --reload

# 2. Backend
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload

# 3. Frontend
cd frontend && npm run dev
```

## Тестирование

### Проверка Model Service

```bash
curl http://localhost:8001/health
```

Ответ:
```json
{
  "status": "ok",
  "model_loaded": true,
  "model_type": "ppo"
}
```

### Тестовый запрос на предсказание

```bash
curl -X POST http://localhost:8001/predict \
  -H "Content-Type: application/json" \
  -d '{
    "features": [0.1, 0.2, -0.1, 0.3, 0.05],
    "symbol": "BTC",
    "timestamp": "2024-01-01T00:00:00Z",
    "current_price": 50000.0
  }'
```

## Добавление новых моделей

1. Обучите модель используя скрипты из `RL_algorithms/algorithms_training/`
2. Сохраните модель в `RL_algorithms/models/{MODEL_TYPE}/`
3. Установите `MODEL_TYPE` в переменных окружения
4. Перезапустите Model Service

## Troubleshooting

### Модель не загружается

- Проверьте, что файл модели существует в `RL_algorithms/models/{MODEL_TYPE}/`
- Проверьте логи Model Service при запуске
- Убедитесь, что `USE_RL_MODEL=true`
- Если проблема сохраняется, установите `USE_RL_MODEL=false` для демо режима

### Ошибки импорта

- Убедитесь, что все зависимости установлены: `pip install -r requirements.txt`
- Проверьте, что пути к `RL_algorithms` корректны

### Производительность

- RL модели требуют GPU для оптимальной производительности
- Для CPU используйте меньшие модели или упрощенный режим
- Кэш наблюдений увеличивает потребление памяти

## Дальнейшие улучшения

- [ ] Добавить поддержку нескольких моделей одновременно
- [ ] Реализовать автоматическое переключение моделей
- [ ] Добавить метрики производительности моделей
- [ ] Интегрировать реальные данные с бирж
- [ ] Добавить онлайн обучение

