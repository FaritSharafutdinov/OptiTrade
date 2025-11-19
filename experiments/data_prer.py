
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler

# Load CSV
df = pd.read_csv("BTC_USDT_OI_SP500_FEATURES_1h_2Y.csv", parse_dates=['timestamp'])

# Fill gaps
df.fillna(method='ffill', inplace=True)
df.fillna(0, inplace=True)

# Select features
features = [
    'Open_Interest','Close','log_return','SP500_log_return','price_range','price_change',
    'high_to_prev_close','low_to_prev_close','volatility_5','volume_ma_5','volatility_14',
    'volume_ma_14','volatility_21','volume_ma_21','volume_zscore','MACD_safe','MACDs_safe',
    'MACDh_safe','RSI_safe','ATR_safe_norm','hour_sin','hour_cos','day_sin','day_cos','month_sin','month_cos'
]

scaler = StandardScaler()
df[features] = scaler.fit_transform(df[features])
