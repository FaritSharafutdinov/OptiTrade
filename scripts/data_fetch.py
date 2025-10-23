import ccxt
import pandas as pd
import time
from datetime import datetime, timedelta

# --- Конфигурация ---
EXCHANGE_ID = 'binance' # Можно выбрать другую биржу, поддерживаемую ccxt
SYMBOL = 'BTC/USDT'     # Торговая пара (Bitcoin к Tether)
TIMEFRAME = '1h'        # 👈 ИЗМЕНЕНО: Интервал 1 час
YEARS_TO_FETCH = 2      # Сбор данных за последние 2 года
# --------------------

def fetch_ohlcv_data(exchange_id, symbol, timeframe, start_date):
    """
    Получает исторические данные OHLCV с помощью ccxt, обрабатывая пагинацию.
    """
    exchange = getattr(ccxt, exchange_id)({'enableRateLimit': True}) # Включаем встроенный Rate Limit
    
    # Конвертация даты начала в timestamp (миллисекунды)
    since = int(start_date.timestamp() * 1000)
    
    all_ohlcv = []
    # Лимит обычно 1000 свечей, при 1-часовом интервале за 2 года ~17520 свечей (потребуется ~18 запросов)
    limit = 1000 
    
    print(f"Подключение к бирже: {exchange_id.upper()}")
    print(f"Сбор часовых данных для {symbol} за 2 года начиная с {start_date.strftime('%Y-%m-%d %H:%M:%S')}")

    while True:
        try:
            # Получение данных
            ohlcv = exchange.fetch_ohlcv(symbol, timeframe, since=since, limit=limit)
            
            if not ohlcv:
                print("Данные больше не поступают. Сбор завершен.")
                break
                
            all_ohlcv.extend(ohlcv)
            
            # Установка новой точки начала для следующего запроса
            # Берем timestamp последней свечи и добавляем 1 мс
            since = ohlcv[-1][0] + 1 
            
            # Конвертация timestamp в читаемую дату для вывода прогресса
            next_date = datetime.fromtimestamp(since / 1000)
            print(f"Собрано {len(all_ohlcv)} свечей. Продолжение с {next_date.strftime('%Y-%m-%d %H:%M:%S')}...")

            # Ограничение скорости запросов (обеспечивается 'enableRateLimit': True)
            
        except ccxt.DDoSProtection as e:
            print(f"🚨 Защита от DDoS: {e}. Ожидание 10 секунд...")
            time.sleep(10)
        except ccxt.RequestTimeout as e:
            print(f"⏳ Превышено время ожидания запроса: {e}. Ожидание 5 секунд...")
            time.sleep(5)
        except ccxt.ExchangeNotAvailable as e:
            print(f"❌ Биржа недоступна: {e}. Завершение работы.")
            break
        except Exception as e:
            print(f"❌ Произошла ошибка: {e}. Завершение работы.")
            break

    return all_ohlcv

# ----------------------------------------
if __name__ == '__main__':
    # 1. Расчет даты начала (2 года назад от сегодняшнего дня)
    end_date = datetime.utcnow().replace(minute=0, second=0, microsecond=0) # Выравниваем по часу
    start_date = end_date - timedelta(days=365 * YEARS_TO_FETCH)
    
    # 2. Получение данных
    data = fetch_ohlcv_data(EXCHANGE_ID, SYMBOL, TIMEFRAME, start_date)
    
    if data:
        # 3. Преобразование в DataFrame
        df = pd.DataFrame(data, columns=['timestamp', 'Open', 'High', 'Low', 'Close', 'Volume'])
        
        # 4. Обработка столбца 'timestamp'
        df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
        df.set_index('timestamp', inplace=True)
        
        # Удаление возможных дубликатов, если они возникли при сборе
        df = df[~df.index.duplicated(keep='first')]
        
        # 5. Вывод и сохранение
        print("\n" + "="*50)
        print("ГОТОВЫЙ DATAFRAME (первые 5 строк):")
        print(df.head())
        print("="*50)
        print(f"Общее количество часовых свечей: {len(df)}")
        
        # Сохранение в CSV файл
        filename = f"{SYMBOL.replace('/', '_')}_{TIMEFRAME}_{YEARS_TO_FETCH}Y.csv"
        df.to_csv(filename)
        print(f"✅ Данные сохранены в файл: {filename}")
    else:
        print("Не удалось получить данные.")
