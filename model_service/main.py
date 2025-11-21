import os
import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Any, Dict
from pathlib import Path
from stable_baselines3 import PPO, A2C, SAC
from datetime import datetime

app = FastAPI(title="RL Model Service")

# Глобальные переменные для моделей
models = {}
current_model = None

class Obs(BaseModel):
    features: List[float]
    symbol: str
    timestamp: str

class PredictionResponse(BaseModel):
    action: str
    score: float
    confidence: float
    model: str

# Получаем абсолютный путь к корню проекта
PROJECT_ROOT = Path(__file__).parent.parent

# Путь к моделям относительно корня проекта
MODELS_DIR = PROJECT_ROOT / "RL_algorithms" / "models"

def load_models():
    """Загрузка обученных моделей при старте сервиса"""
    try:
        print(f"🔍 Looking for models in: {MODELS_DIR}")

        if not MODELS_DIR.exists():
            print(f"❌ Models directory not found: {MODELS_DIR}")
            return

        # Загрузка PPO модели
        ppo_path = MODELS_DIR / "ppo_model.zip"
        if ppo_path.exists():
            models["ppo"] = PPO.load(str(ppo_path))
            print("✅ PPO model loaded")

        # Загрузка A2C модели
        a2c_path = MODELS_DIR / "a2c_model.zip"
        if a2c_path.exists():
            models["a2c"] = A2C.load(str(a2c_path))
            print("✅ A2C model loaded")

        # Загрузка SAC модели
        sac_path = MODELS_DIR / "sac_model.zip"
        if sac_path.exists():
            models["sac"] = SAC.load(str(sac_path))
            print("✅ SAC model loaded")

        # Установка модели по умолчанию
        global current_model
        if "ppo" in models:
            current_model = "ppo"
        elif "a2c" in models:
            current_model = "a2c"
        elif "sac" in models:
            current_model = "sac"

        print(f"✅ Default model set to: {current_model}")

    except Exception as e:
        print(f"❌ Error loading models: {e}")

@app.on_event("startup")
async def startup_event():
    """Загрузка моделей при старте"""
    print(f"🏠 Project root: {PROJECT_ROOT}")
    print(f"📁 Models directory: {MODELS_DIR}")
    print(f"📁 Directory exists: {MODELS_DIR.exists()}")

    if MODELS_DIR.exists():
        print("📋 Files in models directory:")
        for file in MODELS_DIR.iterdir():
            print(f"   - {file.name}")

    load_models()

def prepare_observation(features: List[float]) -> np.ndarray:
    """Подготовка наблюдения для модели"""
    # Нормализация features
    features_array = np.array(features, dtype=np.float32)

    # Добавление временных признаков если нужно
    if len(features_array) < 20:  # Пример: модель ожидает 20 features
        # Дополнение нулями или средними значениями
        features_array = np.pad(features_array, (0, 20 - len(features_array)),
                                mode='constant', constant_values=0)

    return features_array.reshape(1, -1)

@app.post("/predict", response_model=PredictionResponse)
async def predict(obs: Obs) -> PredictionResponse:
    """Предсказание с использованием обученной RL модели"""
    try:
        if not current_model or current_model not in models:
            return fallback_prediction(obs)

        # Подготовка наблюдения
        observation = prepare_observation(obs.features)

        # Получение предсказания от модели
        model = models[current_model]
        action, _states = model.predict(observation, deterministic=True)

        # Конвертация действия в торговый сигнал
        # Предполагаем, что action: 0=SELL, 1=HOLD, 2=BUY
        action_map = {0: "SELL", 1: "HOLD", 2: "BUY"}
        action_str = action_map.get(int(action[0]), "HOLD")

        # Расчет confidence (можно использовать вероятности или Q-values)
        confidence = calculate_confidence(model, observation, action)

        return PredictionResponse(
            action=action_str,
            score=float(action[0]),
            confidence=confidence,
            model=current_model
        )

    except Exception as e:
        print(f"❌ Prediction error: {e}")
        return fallback_prediction(obs)

def calculate_confidence(model, observation, action) -> float:
    """Расчет уверенности предсказания"""
    try:
        # Для моделей с вероятностными политиками
        if hasattr(model, 'predict_proba'):
            probabilities = model.predict_proba(observation)
            if probabilities is not None:
                return float(probabilities[0][action[0]])

        # Fallback: базовая уверенность на основе стабильности
        return 0.7 + (np.random.random() * 0.2)  # 0.7-0.9 для демо

    except:
        return 0.8  # Дефолтная уверенность

def fallback_prediction(obs: Obs) -> PredictionResponse:
    """Резервный алгоритм если модели не загружены"""
    s = sum(obs.features) if obs.features else 0.0
    if s > 0.3:
        action = "BUY"
    elif s < -0.3:
        action = "SELL"
    else:
        action = "HOLD"

    return PredictionResponse(
        action=action,
        score=float(s),
        confidence=0.6,
        model="fallback"
    )

@app.post("/models/switch")
async def switch_model(model_name: str):
    """Переключение на другую модель"""
    global current_model
    if model_name in models:
        current_model = model_name
        return {"status": "success", "model": current_model}
    else:
        return {"status": "error", "message": f"Model {model_name} not found"}

@app.get("/models/available")
async def get_available_models():
    """Получить список доступных моделей"""
    return {
        "available_models": list(models.keys()),
        "current_model": current_model
    }

@app.get("/health")
async def health():
    models_status = "loaded" if models else "no_models"
    return {
        "status": "healthy",
        "service": "rl_model",
        "models_loaded": models_status,
        "current_model": current_model
    }