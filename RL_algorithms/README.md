## RL alogitrhms

## Что сейчас работает
- `python algorithms_training\stable_baselines_train.py` (перед тем как запускать: `cd RL_algorithms`)
- Обучает PPO / A2C / SAC и т.д. из Stable-Baselines3 можно выбирать какую модель обучать параметром --model ppo/sac/a2c
- Пример: `python algorithms_training\stable_baselines_train.py --model sac`
- Сохраняет модель в `/models/`

## Структура папки

```
RL_algorithms/  # Все алгоритмы и скрипты обучения
│── algorithms_training/
│       ├── a2c_train.py              # реализация и обучение A2C-агента
│       ├── stable_baselines_train.py # Обучение через Stable-Baselines3 (PPO, A2C, SAC и т.д.)
│       └───── rl_environment/
│               ├── A2C_trading_env.py       # Gym-подобная торговая среда (состояние, награда, действия) для самописного A2C-futynf
│               └── stable_env.py            # торговая среда для stable-baseline алгоритмов  
│
├── datasets/                         # Датасеты и признаки
│   ├── BTC_USDT_01_1h_2Y.csv                 # Чистые OHLCV-данные BTC/USDT, 1-часовой таймфрейм, ~2 года
│   ├── BTC_USDT_01_FEATURES_1h_2Y.csv        # Тот же датасет + рассчитанные технические индикаторы
│   └── BTC_USDT_01_SP500_FEATURES_1h_2Y.csv  # Данные BTC + признаки S&P 500 (корреляция с фондовым рынком)
│
├── models/                           # Папка для сохранения обученных моделей и чекпоинтов
│   
│
├── researches/                       # Исследования и прототипы
│   └── MultiAgentApproach.md         # Описание идеи и текущей архитектуры мультиагентного подхода
│
├── .gitignore
├── README.md                         # Этот файл
└── requirements.txt                  # Зависимости проекта
```