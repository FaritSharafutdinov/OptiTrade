import os
import sys
from pathlib import Path
from typing import List, Any, Dict, Optional, Union
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import logging

# Добавляем путь к RL_algorithms для импорта
rl_algorithms_path = Path(__file__).parent.parent / "RL_algorithms"
sys.path.insert(0, str(rl_algorithms_path))
sys.path.insert(0, str(rl_algorithms_path / "algorithms_training"))

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="RL Model Service")

# Глобальные переменные для моделей
rl_models = {}  # Словарь всех загруженных моделей: {"ppo": model, "a2c": model, "sac": model}
current_model_type = None  # Текущая активная модель
model_env = None
observation_cache = {}  # Кэш для истории наблюдений по символам

# Конфигурация
MODEL_PATH = os.getenv("MODEL_PATH", None)
MODEL_TYPE = os.getenv("MODEL_TYPE", "ppo")  # ppo, a2c, sac
USE_RL_MODEL = os.getenv("USE_RL_MODEL", "true").lower() == "true"
LAZY_LOAD_MODELS = os.getenv("LAZY_LOAD_MODELS", "false").lower() == "true"  # Загружать модели по требованию


class Observation(BaseModel):
    features: List[float]
    symbol: str
    timestamp: str
    current_price: Optional[float] = None
    volume: Optional[float] = None
    # Дополнительные параметры портфеля для RL модели
    position: Optional[float] = 0.0
    position_size: Optional[float] = 0.1
    equity: Optional[float] = 10000.0


def load_single_model(model_type_name: str) -> Optional[Any]:
    """Загрузка одной RL модели по типу"""
    try:
        from stable_baselines3 import PPO, SAC, A2C
        
        # Ищем модель в стандартной папке
        model_dir = rl_algorithms_path / "models" / model_type_name.upper()
        model_files = list(model_dir.glob(f"{model_type_name}_baseline.zip"))
        if not model_files:
            logger.warning(f"Модель {model_type_name} не найдена в {model_dir}")
            return None
        
        model_path = model_files[0]
        logger.info(f"Loading {model_type_name.upper()} model from {model_path}")
        
        # Загружаем модель
        model_classes = {
            "ppo": PPO,
            "a2c": A2C,
            "sac": SAC
        }
        
        ModelClass = model_classes.get(model_type_name.lower(), None)
        if not ModelClass:
            logger.error(f"Unknown model type: {model_type_name}")
            return None
        
        model = ModelClass.load(str(model_path))
        logger.info(f"✅ {model_type_name.upper()} model loaded successfully")
        return model
        
    except Exception as e:
        logger.error(f"Error loading {model_type_name} model: {e}", exc_info=True)
        return None


def load_all_models():
    """Загрузка всех доступных RL моделей"""
    global rl_models, current_model_type
    
    if not USE_RL_MODEL:
        logger.info("RL models disabled, using simple mode")
        return
    
    available_types = ["ppo", "a2c", "sac"]
    loaded_count = 0
    
    for model_type_name in available_types:
        model = load_single_model(model_type_name)
        if model:
            rl_models[model_type_name.lower()] = model
            loaded_count += 1
    
    if loaded_count > 0:
        # Устанавливаем текущую модель (приоритет: MODEL_TYPE из env, затем первая загруженная)
        current_model_type = MODEL_TYPE.lower() if MODEL_TYPE.lower() in rl_models else list(rl_models.keys())[0]
        logger.info(f"✅ Loaded {loaded_count} models. Active model: {current_model_type.upper()}")
    else:
        logger.warning("No RL models loaded, will use simple mode")
        current_model_type = None


def load_rl_model():
    """Загрузка RL моделей (backward compatibility)"""
    global current_model_type
    
    if LAZY_LOAD_MODELS:
        # Lazy loading - загружаем только текущую модель
        model = load_single_model(MODEL_TYPE)
        if model:
            rl_models[MODEL_TYPE.lower()] = model
            current_model_type = MODEL_TYPE.lower()
        else:
            current_model_type = None
    else:
        # Загружаем все доступные модели
        load_all_models()


@app.on_event("startup")
async def startup_event():
    """Инициализация при запуске сервиса"""
    logger.info("🚀 Запуск Model Service...")
    load_rl_model()


@app.get("/health")
async def health():
    """Проверка здоровья сервиса"""
    return {
        "status": "ok",
        "models_loaded": list(rl_models.keys()),
        "active_model": current_model_type,
        "total_models": len(rl_models),
        "use_rl_models": USE_RL_MODEL
    }


def simple_predict(features: List[float]) -> Dict[str, Any]:
    """Упрощенное предсказание без RL модели (fallback)"""
    if not features:
        return {"action": "HOLD", "confidence": 0.5, "score": 0.0}
    
    # Простая логика на основе суммы признаков
    score = sum(features) / len(features) if features else 0.0
    
    if score > 0.3:
        action = "BUY"
        confidence = min(0.95, 0.5 + abs(score) * 0.5)
    elif score < -0.3:
        action = "SELL"
        confidence = min(0.95, 0.5 + abs(score) * 0.5)
    else:
        action = "HOLD"
        confidence = 0.6
    
    return {
        "action": action,
        "confidence": round(confidence, 2),
        "score": round(float(score), 4)
    }


def get_active_model():
    """Получить текущую активную модель"""
    if current_model_type and current_model_type in rl_models:
        return rl_models[current_model_type]
    elif len(rl_models) > 0:
        # Используем первую доступную модель
        return list(rl_models.values())[0]
    return None


def rl_model_predict(obs: Observation, model_type_override: Optional[str] = None) -> Dict[str, Any]:
    """Предсказание с использованием RL модели"""
    global observation_cache
    
    # Определяем какую модель использовать
    active_model = None
    used_model_type = current_model_type
    
    if model_type_override and model_type_override.lower() in rl_models:
        active_model = rl_models[model_type_override.lower()]
        used_model_type = model_type_override.lower()
    else:
        active_model = get_active_model()
    
    if active_model is None:
        return simple_predict(obs.features)
    
    try:
        # Для RL модели нужна полная история наблюдений
        # Создаем упрощенное наблюдение на основе текущих данных
        
        # Базовая структура наблюдения: (window_size, num_features)
        # Для упрощения создадим минимальное наблюдение
        
        # Преобразуем features в numpy array
        feature_array = np.array(obs.features, dtype=np.float32)
        
        # Если features недостаточно, дополняем нулями или используем кэш
        window_size = 30  # Как в обучении
        num_base_features = 11  # Базовые признаки из среды
        
        # Создаем упрощенное наблюдение
        # Для продакшена нужно кэшировать историю, но пока используем текущий момент
        if len(feature_array) < num_base_features:
            # Дополняем нулями
            feature_array = np.pad(
                feature_array, 
                (0, max(0, num_base_features - len(feature_array))),
                mode='constant'
            )[:num_base_features]
        
        # Добавляем портфельные признаки
        portfolio_features = np.array([
            obs.position or 0.0,
            obs.position_size or 0.1,
            (obs.equity or 10000.0) / 10000.0,  # Нормализованный капитал
            0.0  # Количество сделок (пока 0)
        ], dtype=np.float32)
        
        # Создаем наблюдение: повторяем текущие признаки для window_size
        # В реальности нужна история, но для демо используем текущие данные
        observation = np.zeros((window_size, num_base_features + 4), dtype=np.float32)
        
        # Заполняем последний временной шаг текущими данными
        observation[-1, :num_base_features] = feature_array[:num_base_features]
        observation[-1, num_base_features:] = portfolio_features
        
        # Если есть кэш, используем его для заполнения истории
        cache_key = obs.symbol
        if cache_key in observation_cache:
            # Используем последние наблюдения из кэша
            cached_obs = observation_cache[cache_key]
            if len(cached_obs) >= window_size - 1:
                observation[:-1] = cached_obs[-(window_size-1):]
            elif len(cached_obs) > 0:
                observation[:len(cached_obs)] = cached_obs[-len(cached_obs):]
        
        # Обновляем кэш (храним последние window_size наблюдений)
        if cache_key not in observation_cache:
            observation_cache[cache_key] = []
        observation_cache[cache_key].append(observation[-1])
        if len(observation_cache[cache_key]) > window_size:
            observation_cache[cache_key] = observation_cache[cache_key][-window_size:]
        
        # Предсказание модели
        action_array, _ = active_model.predict(observation, deterministic=True)
        
        # Преобразуем действие RL модели в формат бекенда
        # action_array: [target_position (-1..1), target_size (0.1..1.0)]
        target_position = float(action_array[0])
        target_size = float(action_array[1])
        
        # Определяем действие
        if target_position > 0.3:
            action = "BUY"
            confidence = min(0.95, abs(target_position) * target_size)
        elif target_position < -0.3:
            action = "SELL"
            confidence = min(0.95, abs(target_position) * target_size)
        else:
            action = "HOLD"
            confidence = 1.0 - abs(target_position)
        
        return {
            "action": action,
            "confidence": round(confidence, 2),
            "score": round(float(target_position), 4),
            "position": round(target_position, 4),
            "size": round(target_size, 4),
            "model_type": used_model_type
        }
        
    except Exception as e:
        logger.error(f"Ошибка предсказания RL модели: {e}", exc_info=True)
        # Fallback на простой режим
        return simple_predict(obs.features)


class PredictRequest(BaseModel):
    features: List[float]
    symbol: str
    timestamp: str
    current_price: Optional[float] = None
    volume: Optional[float] = None
    position: Optional[float] = 0.0
    position_size: Optional[float] = 0.1
    equity: Optional[float] = 10000.0
    model_type: Optional[str] = None  # Опционально: выбрать конкретную модель


@app.post("/predict")
async def predict(req: Dict[str, Any]) -> Dict[str, Any]:
    """
    Предсказание действия на основе наблюдения.
    
    Поддерживает два формата запроса:
    1. Новый формат: PredictRequest с полем model_type
    2. Старый формат: Observation или dict (для обратной совместимости)
    
    Если RL модель загружена, использует её.
    Иначе использует упрощенную логику.
    
    Параметры:
    - model_type: опционально, выбирает конкретную модель (ppo/a2c/sac)
    """
    try:
        # Поддержка обоих форматов для обратной совместимости
        if isinstance(req, dict):
            # Если пришел dict (старый формат от backend)
            obs = Observation(**req)
            model_type_override = req.get('model_type')
        elif isinstance(req, Observation):
            # Если пришел Observation напрямую
            obs = req
            model_type_override = None
        else:
            # Новый формат через PredictRequest (Pydantic model)
            obs = Observation(
                features=req.features,
                symbol=req.symbol,
                timestamp=req.timestamp,
                current_price=req.current_price,
                volume=req.volume,
                position=req.position,
                position_size=req.position_size,
                equity=req.equity
            )
            model_type_override = getattr(req, 'model_type', None)
        
        active_model = get_active_model()
        if active_model is not None or (model_type_override and model_type_override.lower() in rl_models):
            result = rl_model_predict(obs, model_type_override)
        else:
            result = simple_predict(obs.features)
        
        return result
        
    except Exception as e:
        logger.error(f"Error processing request: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/batch")
async def predict_batch(observations: List[Observation], model_type: Optional[str] = None) -> List[Dict[str, Any]]:
    """Пакетное предсказание для нескольких наблюдений"""
    results = []
    active_model = get_active_model()
    
    for obs in observations:
        try:
            if active_model is not None or (model_type and model_type.lower() in rl_models):
                result = rl_model_predict(obs, model_type)
            else:
                result = simple_predict(obs.features)
            results.append(result)
        except Exception as e:
            logger.error(f"Error predicting for {obs.symbol}: {e}")
            results.append({"action": "HOLD", "confidence": 0.0, "error": str(e)})
    
    return results


@app.post("/cache/clear")
async def clear_cache(symbol: Optional[str] = None):
    """Очистка кэша наблюдений"""
    global observation_cache
    if symbol:
        if symbol in observation_cache:
            del observation_cache[symbol]
            return {"status": "ok", "message": f"Cache cleared for {symbol}"}
        else:
            return {"status": "ok", "message": f"No cache found for {symbol}"}
    else:
        observation_cache.clear()
        return {"status": "ok", "message": "All cache cleared"}


# ========== Model Management API ==========

@app.get("/models")
async def list_models():
    """Получить список доступных моделей"""
    available_models = []
    
    # Проверяем какие модели есть на диске
    model_types = ["ppo", "a2c", "sac"]
    for model_type_name in model_types:
        model_dir = rl_algorithms_path / "models" / model_type_name.upper()
        model_files = list(model_dir.glob(f"{model_type_name}_baseline.zip"))
        
        is_loaded = model_type_name.lower() in rl_models
        is_active = model_type_name.lower() == current_model_type
        
        available_models.append({
            "type": model_type_name.upper(),
            "available": len(model_files) > 0,
            "loaded": is_loaded,
            "active": is_active,
            "path": str(model_files[0]) if model_files else None
        })
    
    return {
        "available_models": available_models,
        "active_model": current_model_type,
        "total_loaded": len(rl_models)
    }


@app.post("/models/switch")
async def switch_model(request: Dict[str, str]):
    """Переключиться на другую модель"""
    global current_model_type, rl_models
    
    model_type_requested = request.get("model_type", "").lower()
    
    if not model_type_requested:
        raise HTTPException(status_code=400, detail="model_type is required")
    
    # Если модель уже загружена, просто переключаемся
    if model_type_requested in rl_models:
        current_model_type = model_type_requested
        logger.info(f"Switched to {model_type_requested.upper()} model")
        return {
            "status": "ok",
            "message": f"Switched to {model_type_requested.upper()} model",
            "active_model": current_model_type
        }
    
    # Пытаемся загрузить модель
    model = load_single_model(model_type_requested)
    if model:
        rl_models[model_type_requested] = model
        current_model_type = model_type_requested
        logger.info(f"Loaded and switched to {model_type_requested.upper()} model")
        return {
            "status": "ok",
            "message": f"Loaded and switched to {model_type_requested.upper()} model",
            "active_model": current_model_type
        }
    else:
        raise HTTPException(
            status_code=404,
            detail=f"Model {model_type_requested} not found or failed to load"
        )


@app.post("/models/load")
async def load_model(request: Dict[str, str]):
    """Загрузить модель (без переключения)"""
    global rl_models
    
    model_type_requested = request.get("model_type", "").lower()
    
    if not model_type_requested:
        raise HTTPException(status_code=400, detail="model_type is required")
    
    if model_type_requested in rl_models:
        return {
            "status": "ok",
            "message": f"{model_type_requested.upper()} model already loaded",
            "loaded_models": list(rl_models.keys())
        }
    
    model = load_single_model(model_type_requested)
    if model:
        rl_models[model_type_requested] = model
        logger.info(f"Loaded {model_type_requested.upper()} model")
        return {
            "status": "ok",
            "message": f"{model_type_requested.upper()} model loaded successfully",
            "loaded_models": list(rl_models.keys())
        }
    else:
        raise HTTPException(
            status_code=404,
            detail=f"Model {model_type_requested} not found or failed to load"
        )


@app.post("/models/reload")
async def reload_model(request: Dict[str, str]):
    """Перезагрузить модель"""
    global rl_models, current_model_type
    
    model_type_requested = request.get("model_type", "").lower()
    
    if not model_type_requested:
        # Перезагружаем все модели
        rl_models.clear()
        load_all_models()
        return {
            "status": "ok",
            "message": "All models reloaded",
            "loaded_models": list(rl_models.keys()),
            "active_model": current_model_type
        }
    
    # Перезагружаем конкретную модель
    if model_type_requested in rl_models:
        del rl_models[model_type_requested]
    
    model = load_single_model(model_type_requested)
    if model:
        rl_models[model_type_requested] = model
        # Если это была активная модель, обновляем
        if model_type_requested == current_model_type:
            current_model_type = model_type_requested
        logger.info(f"Reloaded {model_type_requested.upper()} model")
        return {
            "status": "ok",
            "message": f"{model_type_requested.upper()} model reloaded",
            "loaded_models": list(rl_models.keys()),
            "active_model": current_model_type
        }
    else:
        raise HTTPException(
            status_code=404,
            detail=f"Model {model_type_requested} not found or failed to load"
        )


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
