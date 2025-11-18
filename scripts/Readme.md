## Workflow

1. Run `data_fetch.py` to collect OHLCV + open-interest data.
2. Run `feature_engineering.py` to enrich the dataset with technical indicators and time features.

Feature-engineering adjustments:

1. Drop raw OHLCV columns (non-stationary + highly correlated).
2. Add log-return features (stationary, high MI score vs. close price).
3. Append S&P 500 log returns as a macro context feature.
4. Encode time-based signals via sine/cosine pairs.
5. Remove indicator leakage (shift calculations so we never peek into the future).
6. Refresh the indicator set (add higher-signal metrics, retire redundant ones).

`pipeline.py` automates the steps above; schedule it via Task Scheduler (Windows) or cron (macOS/Linux).

> **First run tip:** uncomment `run_batch_history()` at the bottom of `pipeline.py` to bootstrap the full dataset, then comment it again for incremental updates.
