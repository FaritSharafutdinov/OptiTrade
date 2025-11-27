# 🤖 Model Management Guide

## Overview

The Model Service now supports:
- ✅ **Multiple RL models** (PPO, A2C, SAC)
- ✅ **Dynamic model switching** without restart
- ✅ **API for model management**
- ✅ **All models loaded by default** (or lazy loading option)

## API Endpoints

### Model Service (Port 8001)

#### List Available Models
```bash
GET http://localhost:8001/models
```

Response:
```json
{
  "available_models": [
    {
      "type": "PPO",
      "available": true,
      "loaded": true,
      "active": true,
      "path": "RL_algorithms/models/PPO/ppo_baseline.zip"
    },
    {
      "type": "A2C",
      "available": true,
      "loaded": true,
      "active": false,
      "path": "RL_algorithms/models/A2C/a2c_baseline.zip"
    },
    {
      "type": "SAC",
      "available": true,
      "loaded": true,
      "active": false,
      "path": "RL_algorithms/models/SAC/sac_baseline.zip"
    }
  ],
  "active_model": "ppo",
  "total_loaded": 3
}
```

#### Switch Model
```bash
POST http://localhost:8001/models/switch
Content-Type: application/json

{
  "model_type": "a2c"
}
```

#### Load Model (without switching)
```bash
POST http://localhost:8001/models/load
Content-Type: application/json

{
  "model_type": "sac"
}
```

#### Reload Model
```bash
POST http://localhost:8001/models/reload
Content-Type: application/json

{
  "model_type": "ppo"
}
```

### Backend Proxy (Port 8000)

#### List Models
```bash
GET http://localhost:8000/model/list
```

#### Switch Model
```bash
POST http://localhost:8000/model/switch
X-API-Key: devkey
Content-Type: application/json

{
  "model_type": "a2c"
}
```

#### Load Model
```bash
POST http://localhost:8000/model/load
X-API-Key: devkey
Content-Type: application/json

{
  "model_type": "sac"
}
```

## Using Models in Predictions

### Option 1: Use Active Model
```python
# Uses currently active model
response = requests.post(
    "http://localhost:8000/model/predict",
    json={
        "features": [0.1, 0.2, 0.3, ...],
        "symbol": "BTC",
        "timestamp": "2024-01-01T00:00:00Z"
    }
)
```

### Option 2: Specify Model Type
```python
# Explicitly choose a model
response = requests.post(
    "http://localhost:8000/model/predict",
    json={
        "features": [0.1, 0.2, 0.3, ...],
        "symbol": "BTC",
        "timestamp": "2024-01-01T00:00:00Z",
        "model_type": "sac"  # Override active model
    }
)
```

## Configuration

### Environment Variables

**Model Service** (`.env` or environment):

```bash
# Enable/disable RL models
USE_RL_MODEL=true              # default: true

# Default model type (used if lazy loading)
MODEL_TYPE=ppo                 # ppo, a2c, or sac

# Loading strategy
LAZY_LOAD_MODELS=false         # false = load all models at startup
```

### Loading Strategies

**1. Load All Models (Default)**
```bash
USE_RL_MODEL=true
LAZY_LOAD_MODELS=false
```

All available models (PPO, A2C, SAC) are loaded at startup. Fast switching, but uses more memory.

**2. Lazy Loading**
```bash
USE_RL_MODEL=true
LAZY_LOAD_MODELS=true
MODEL_TYPE=ppo
```

Only the default model is loaded. Other models are loaded on-demand when switching.

## Example: Switching Models via API

```python
import requests

# Check available models
models = requests.get("http://localhost:8001/models").json()
print(f"Active: {models['active_model']}")
print(f"Loaded: {models['total_loaded']} models")

# Switch to A2C
switch_response = requests.post(
    "http://localhost:8001/models/switch",
    json={"model_type": "a2c"}
)
print(switch_response.json())

# Make prediction with new model
prediction = requests.post(
    "http://localhost:8000/model/predict",
    json={
        "features": [0.1, 0.2, 0.3],
        "symbol": "BTC",
        "timestamp": "2024-01-01T00:00:00Z"
    }
)
print(f"Model used: {prediction.json().get('model_type')}")
```

## Troubleshooting

### Model Not Loading
- Check model files exist: `RL_algorithms/models/{MODEL_TYPE}/{model_type}_baseline.zip`
- Check logs in Model Service console
- Verify `USE_RL_MODEL=true` in `.env`

### Model Switch Failing
- Verify model is available: `GET /models`
- Check model file exists on disk
- Check Model Service logs for errors

### Simple Mode Instead of RL
- Set `USE_RL_MODEL=true` in `.env`
- Restart Model Service
- Check `GET /health` endpoint

## Current Status

- ✅ All 3 models (PPO, A2C, SAC) available
- ✅ Models loaded by default at startup
- ✅ Dynamic switching without restart
- ✅ API endpoints for management
- ✅ Backend proxy endpoints
- 🔄 Frontend UI (coming soon)

