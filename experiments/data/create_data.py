import ccxt, pandas as pd

ex = ccxt.bybit()
bars = ex.fetch_ohlcv('BTC/USDT', timeframe='1h', limit=2000)
df = pd.DataFrame(bars, columns=['timestamp','open','high','low','close','volume'])
df.to_csv('data/btcusdt_1h.csv', index=False)
