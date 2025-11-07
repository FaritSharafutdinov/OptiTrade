import ccxt
import pandas as pd
import time
from datetime import datetime, timedelta
import requests

# --- Конфигурация ---
EXCHANGE_ID = 'binance' 
SYMBOL = 'BTC/USDT'      
TIMEFRAME = '1h'        
YEARS_TO_FETCH = 2      
# --- Конфигурация Open Interest (Bybit) ---
OI_SYMBOL_BYBIT = 'BTCUSDT' # Символ для Bybit Perpetual Futures
OI_CATEGORY_BYBIT = 'linear'
OI_INTERVAL_BYBIT = '1h'
BASE_URL_BYBIT = "https://api.bybit.com"
ENDPOINT_OI_BYBIT = "/v5/market/open-interest"
# --------------------

# --- Функция сбора OHLCV (оставлена без изменений) ---
def fetch_ohlcv_data(exchange_id, symbol, timeframe, start_date):
    """
    Получает исторические данные OHLCV с помощью ccxt, обрабатывая пагинацию.
    """
    try:
        exchange_class = getattr(ccxt, exchange_id)
        # Включаем встроенный Rate Limit
        exchange = exchange_class({'enableRateLimit': True})
    except AttributeError:
        print(f"❌ Биржа {exchange_id} не поддерживается ccxt.")
        return []

    since = int(start_date.timestamp() * 1000)
    all_ohlcv = []
    limit = 1000 
    
    print(f"--- 1. Сбор OHLCV ---")
    print(f"Подключение к бирже: {exchange_id.upper()}")
    print(f"Сбор часовых данных для {symbol} за {YEARS_TO_FETCH} года начиная с {start_date.strftime('%Y-%m-%d %H:%M:%S')}")

    while True:
        try:
            ohlcv = exchange.fetch_ohlcv(symbol, timeframe, since=since, limit=limit)
            
            if not ohlcv:
                print("Данные OHLCV больше не поступают. Сбор завершен.")
                break
                
            all_ohlcv.extend(ohlcv)
            
            since = ohlcv[-1][0] + 1 
            
            next_date = datetime.fromtimestamp(since / 1000)
            print(f"Собрано {len(all_ohlcv)} свечей. Продолжение с {next_date.strftime('%Y-%m-%d %H:%M:%S')}...")

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
            print(f"❌ Произошла ошибка при сборе OHLCV: {e}. Завершение работы.")
            break

    return all_ohlcv

# --- ИСПРАВЛЕННАЯ функция для сбора Open Interest (OI) с Bybit ---
def fetch_open_interest_data(symbol, category, interval, start_date):
    """
    Получает исторические данные Open Interest с Bybit API (v5), используя 
    курсор для обратной пагинации.
    """
    
    url = BASE_URL_BYBIT + ENDPOINT_OI_BYBIT
    start_ts = int(start_date.timestamp() * 1000)
    
    all_oi_data = [] # Список словарей
    limit = 200 
    current_cursor = None # Курсор для текущего запроса
    previous_cursor = None # Курсор для проверки зацикливания

    print(f"\n--- 2. Сбор Open Interest ---")
    print(f"Подключение к Bybit (Futures) для {symbol}")
    print(f"Сбор часовых данных за {YEARS_TO_FETCH} года начиная с {start_date.strftime('%Y-%m-%d %H:%M:%S')}")

    while True:
        params = {
            "category": category,
            "symbol": symbol,
            "intervalTime": interval,
            "limit": limit,
        }
        
        # Добавляем курсор, если он есть
        if current_cursor:
            params['cursor'] = current_cursor

        try:
            response = requests.get(url, params=params)
            response.raise_for_status() 
            data = response.json()

            if data.get('retCode') != 0:
                 print(f"❌ Ошибка API Bybit: {data.get('retMsg', 'Неизвестная ошибка')}")
                 break
                 
            result = data.get('result', {})
            oi_list = result.get('list', [])

            if not oi_list:
                print("Данные Open Interest больше не поступают. Сбор завершен.")
                break
            
            # --- 1. Проверка на зацикливание и прогресс ---
            
            # Обновление курсора и проверка:
            previous_cursor = current_cursor
            current_cursor = result.get('nextPageCursor')
            
            # Если курсор пуст и не был пустым, или курсор не изменился, и мы не достигли даты:
            if current_cursor == previous_cursor and all_oi_data:
                print(f"⚠️ Ошибка пагинации: Курсор не изменился. Завершение сбора.")
                break
            
            # API возвращает от НОВОГО к СТАРОМУ, поэтому самый старый элемент - ПОСЛЕДНИЙ.
            current_oldest_ts = int(oi_list[-1]['timestamp'])
            oldest_date_in_batch = datetime.fromtimestamp(current_oldest_ts / 1000)
            
            # 2. Обработка данных
            # Переворачиваем для добавления в хронологическом порядке в all_oi_data
            oi_list.reverse() 
            all_oi_data.extend(oi_list)

            # 3. Условие остановки: достигнута дата начала (2 года назад)
            print(f"Собрано {len(all_oi_data)} точек OI. Самая старая точка в пакете: {oldest_date_in_batch.strftime('%Y-%m-%d %H:%M:%S')}...")
            
            if current_oldest_ts < start_ts:
                 print("✅ Достигнута или пройдена дата начала сбора. Завершение сбора.")
                 break
            
            if not current_cursor:
                print("Курсор для следующей страницы пуст. Сбор завершен.")
                break
                
            time.sleep(0.5) # Соблюдение Rate Limit Bybit
            
        except requests.exceptions.HTTPError as errh:
            print(f"\n❌ Ошибка HTTP в Bybit: {errh}. Ожидание 10 секунд...")
            time.sleep(10)
        except Exception as e:
            print(f"\n❌ Произошла непредвиденная ошибка при запросе Bybit: {e}. Завершение работы.")
            break

    # Окончательная обработка и возвращение DataFrame
    if all_oi_data:
        # 1. Сортировка по ключу 'timestamp'
        all_oi_data.sort(key=lambda x: int(x['timestamp']))
        
        # 2. Преобразование в DataFrame для очистки и фильтрации
        df_oi = pd.DataFrame(all_oi_data)
        
        # 3. Фильтрация данных после start_date (убираем данные, полученные "за гранью")
        df_oi['timestamp'] = pd.to_numeric(df_oi['timestamp'])
        df_oi = df_oi[df_oi['timestamp'] >= start_ts]
        
        # 4. Удаление дубликатов (на случай перекрытия пакетов)
        df_oi.drop_duplicates(subset=['timestamp'], keep='first', inplace=True)
        
        return df_oi
        
    return pd.DataFrame() 

# ----------------------------------------
if __name__ == '__main__':
    # 1. Расчет даты начала (2 года назад от сегодняшнего дня)
    end_date = datetime.utcnow().replace(minute=0, second=0, microsecond=0) 
    start_date = end_date - timedelta(days=365 * YEARS_TO_FETCH)
    
    # 2. Получение данных OHLCV
    ohlcv_data = fetch_ohlcv_data(EXCHANGE_ID, SYMBOL, TIMEFRAME, start_date)
    
    # 3. Получение данных Open Interest
    df_oi = fetch_open_interest_data(OI_SYMBOL_BYBIT, OI_CATEGORY_BYBIT, OI_INTERVAL_BYBIT, start_date)
    
    # 4. Обработка и объединение данных
    
    if not ohlcv_data:
         print("Не удалось получить данные OHLCV. Завершение.")
         exit()

    # Преобразование OHLCV в DataFrame
    df_ohlcv = pd.DataFrame(ohlcv_data, columns=['timestamp', 'Open', 'High', 'Low', 'Close', 'Volume'])
    df_ohlcv['timestamp'] = pd.to_datetime(df_ohlcv['timestamp'], unit='ms')
    df_ohlcv.set_index('timestamp', inplace=True)
    df_ohlcv = df_ohlcv[~df_ohlcv.index.duplicated(keep='first')]
    
    final_df = df_ohlcv
    
    if not df_oi.empty:
        # Преобразование DataFrame OI: установка индекса и переименование
        df_oi['timestamp'] = pd.to_datetime(df_oi['timestamp'], unit='ms')
        df_oi.set_index('timestamp', inplace=True)
        df_oi.rename(columns={'openInterest': 'Open Interest'}, inplace=True)

        # Объединение OHLCV и OI по индексу (времени)
        # Left Join, чтобы сохранить все OHLCV свечи
        final_df = final_df.join(df_oi['Open Interest'], how='left')
        print(f"\n✅ Успешно объединены OHLCV и Open Interest. Размер объединенного DF: {len(final_df)}")
        
    else:
        print("\n⚠️ Не удалось получить данные Open Interest или DataFrame пуст. Сохраняем только OHLCV.")

    
    # 5. Вывод и сохранение
    print("\n" + "="*50)
    print("ГОТОВЫЙ DATAFRAME (первые 5 строк):")
    print(final_df.head())
    print("="*50)
    print(f"Общее количество часовых свечей: {len(final_df)}")
    
    # Сохранение в CSV файл
    filename = f"{SYMBOL.replace('/', '_')}_OI_{TIMEFRAME}_{YEARS_TO_FETCH}Y.csv"
    final_df.to_csv(filename)
    print(f"✅ Данные сохранены в файл: {filename}")