# 📊 Real Backtesting System

## Overview

The backtesting system now uses **real RL models** on **historical market data** to generate accurate metrics.

## How It Works

1. **Load Historical Data**: Fetches historical OHLCV data from `RL_algorithms/datasets/`
2. **Load RL Model**: Loads trained model (PPO, A2C, or SAC) for prediction
3. **Simulate Trading**: Runs the model through historical data step by step
4. **Calculate Metrics**: Computes real metrics based on actual trading performance

## Features

✅ **Real model predictions** - Uses actual RL models (PPO/A2C/SAC)  
✅ **Historical data** - Uses real market data from dataset  
✅ **Accurate metrics** - Calculates Sharpe ratio, drawdown, win rate, profit factor  
✅ **Different results** - Results vary based on:
   - Date range
   - Initial balance
   - Model type (PPO/A2C/SAC)
   - Strategy parameters

## API Usage

### Run Backtest

```bash
POST http://localhost:8000/backtest/run
X-API-Key: devkey
Content-Type: application/json

{
  "start_date": "2023-01-01",
  "end_date": "2023-12-31",
  "initial_balance": 10000,
  "symbols": ["BTC"],
  "strategy_params": {
    "model_type": "ppo",  // or "a2c", "sac"
    "window_size": 30,
    "fee": 0.001
  }
}
```

### Response

```json
{
  "id": 1,
  "created_at": "2024-01-15T10:30:00Z",
  "params": {
    "start_date": "2023-01-01",
    "end_date": "2023-12-31",
    "initial_balance": 10000,
    "symbols": ["BTC"],
    "model_type": "ppo"
  },
  "metrics": {
    "total_return": 1250.50,
    "total_return_pct": 12.5,
    "sharpe_ratio": 1.45,
    "max_drawdown": -8.3,
    "win_rate": 58.2,
    "total_trades": 127,
    "profit_factor": 1.75,
    "final_balance": 11250.50
  }
}
```

## Parameters

### Required
- `start_date`: Start date in ISO format (YYYY-MM-DD)
- `end_date`: End date in ISO format (YYYY-MM-DD)

### Optional
- `initial_balance`: Starting balance (default: 10000)
- `symbols`: List of symbols (currently uses BTC dataset)
- `strategy_params`: Additional parameters
  - `model_type`: "ppo", "a2c", or "sac" (default: "ppo")
  - `window_size`: Observation window size (default: 30)
  - `fee`: Trading fee (default: 0.001)

## Metrics Explained

- **total_return**: Absolute profit/loss in USD
- **total_return_pct**: Percentage return
- **sharpe_ratio**: Risk-adjusted return (higher is better)
- **max_drawdown**: Maximum peak-to-trough decline (%)
- **win_rate**: Percentage of profitable trades
- **total_trades**: Number of trades executed
- **profit_factor**: Ratio of gross profit to gross loss
- **final_balance**: Ending balance

## Technical Details

### Data Source
- Uses preprocessed dataset: `RL_algorithms/datasets/BTC_USDT_OI_SP500_FEATURES_1h_2Y.csv`
- Contains OHLCV data with technical indicators
- 1-hour timeframe
- ~2 years of historical data

### Environment
- Uses `EnhancedTradingEnv` from RL algorithms
- Simulates realistic trading with:
  - Position management
  - Commission fees
  - Portfolio tracking
  - Risk management

### Models
- Supports PPO, A2C, SAC models
- Models loaded from `RL_algorithms/models/{MODEL_TYPE}/`
- Deterministic predictions for consistency

## Example: Compare Models

```python
import requests

models = ["ppo", "a2c", "sac"]
results = {}

for model in models:
    response = requests.post(
        "http://localhost:8000/backtest/run",
        headers={"X-API-Key": "devkey"},
        json={
            "start_date": "2023-01-01",
            "end_date": "2023-06-30",
            "initial_balance": 10000,
            "strategy_params": {"model_type": model}
        }
    )
    results[model] = response.json()["metrics"]

# Compare results
for model, metrics in results.items():
    print(f"{model.upper()}: {metrics['total_return_pct']:.2f}% return, "
          f"Sharpe: {metrics['sharpe_ratio']:.2f}")
```

## Performance Notes

- Backtests can take **10-30 seconds** depending on date range
- Uses async execution to avoid blocking
- Results are cached in database for quick retrieval
- Each backtest generates unique results based on actual model performance

## Troubleshooting

### "Dataset not found"
- Ensure `RL_algorithms/datasets/BTC_USDT_OI_SP500_FEATURES_1h_2Y.csv` exists
- Run data collection scripts if needed

### "Model not found"
- Check that model files exist: `RL_algorithms/models/{MODEL_TYPE}/{model_type}_baseline.zip`
- Train models first if missing

### "No data for period"
- Requested date range may be outside available data
- Check dataset date range and adjust request

