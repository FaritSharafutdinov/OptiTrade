import ccxt
import pandas as pd
import time
from datetime import datetime, timedelta
import requests
import yfinance as yf

# ==============================================================================
# 🚀 КОНФИГУРАЦИЯ
# ==============================================================================
EXCHANGE_ID = 'binance'
SYMBOL = 'BTC/USDT'
TIMEFRAME = '1h'
YEARS_TO_FETCH = 2
# Конфигурация S&P 500
SP500_TICKER = 'ES=F' # Тикер S&P 500 на Yahoo Finance
SP500_INTERVAL = '1h' # Интервал для S&P 500
# Конфигурация Open Interest (Bybit)
OI_SYMBOL_BYBIT = 'BTCUSDT' # Символ для Bybit Perpetual Futures
OI_CATEGORY_BYBIT = 'linear'
OI_INTERVAL_BYBIT = '1h'
BASE_URL_BYBIT = "https://api.bybit.com"
ENDPOINT_OI_BYBIT = "/v5/market/open-interest"

# ==============================================================================
# 🛠️ ФУНКЦИИ СБОРА ДАННЫХ
# (Оставлены без изменений для сохранения их логики)
# ==============================================================================

def fetch_ohlcv_data(exchange_id, symbol, timeframe, start_date):
    """
    Получает исторические данные OHLCV с помощью ccxt, обрабатывая пагинацию.
    """
    try:
        exchange_class = getattr(ccxt, exchange_id)
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
            
            # Небольшая пауза для обхода rate limit
            time.sleep(exchange.rateLimit / 1000.0) 

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

def fetch_open_interest_data(symbol, category, interval, start_date):
    """
    Получает исторические данные Open Interest с Bybit API (v5), используя
    курсор для обратной пагинации.
    """

    url = BASE_URL_BYBIT + ENDPOINT_OI_BYBIT
    start_ts = int(start_date.timestamp() * 1000)

    all_oi_data = [] # Список словарей
    limit = 200
    current_cursor = None
    previous_cursor = None

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

            previous_cursor = current_cursor
            current_cursor = result.get('nextPageCursor')

            if current_cursor == previous_cursor and all_oi_data:
                print(f"⚠️ Ошибка пагинации: Курсор не изменился. Завершение сбора.")
                break

            current_oldest_ts = int(oi_list[-1]['timestamp'])
            oldest_date_in_batch = datetime.fromtimestamp(current_oldest_ts / 1000)

            # Переворачиваем для добавления в хронологическом порядке в all_oi_data
            oi_list.reverse()
            all_oi_data.extend(oi_list)

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
        all_oi_data.sort(key=lambda x: int(x['timestamp']))
        df_oi = pd.DataFrame(all_oi_data)
        df_oi['timestamp'] = pd.to_numeric(df_oi['timestamp'])
        df_oi = df_oi[df_oi['timestamp'] >= start_ts]
        df_oi.drop_duplicates(subset=['timestamp'], keep='first', inplace=True)
        return df_oi

    return pd.DataFrame()


def fetch_sp500_data(ticker, interval, start_date):
    """
    Получает исторические данные OHLCV S&P 500 (или другого тикера) с Yahoo Finance.
    """
    print(f"\n--- 3. Сбор данных S&P 500 ---")
    print(f"Использование yfinance для {ticker} с интервалом {interval}")

    try:
        start_date_str = start_date.strftime('%Y-%m-%d')
        # yfinance может возвращать multi-index, если есть ошибки/предупреждения, 
        # поэтому убираем колонки Adj Close
        df_sp500 = yf.download(
            ticker,
            start=start_date_str,
            interval=interval,
            progress=False,
        )

        if df_sp500.empty:
            print(f"⚠️ Не удалось получить данные для {ticker} или DataFrame пуст.")
            return pd.DataFrame()

        # Если yfinance возвращает мультииндекс (MultiIndex), упрощаем его до одного уровня
        if isinstance(df_sp500.columns, pd.MultiIndex):
            # Переименовываем столбцы, чтобы они содержали тикер и название (напр. ('ES=F', 'Close') -> 'ES=F_Close')
            df_sp500.columns = [f'{col[0]}_{col[1]}' if col[0] else col[1] for col in df_sp500.columns]
        
        # Переименование и очистка уже происходит в блоке ниже, поэтому тут оставляем 
        # только удаление Adj Close, если оно есть
        if 'Adj Close' in df_sp500.columns:
            df_sp500.drop(columns=['Adj Close'], inplace=True)
            
        df_sp500.index.name = 'timestamp'
        # Удаляем информацию о часовом поясе
        df_sp500 = df_sp500.tz_localize(None) 
        
        print(f"✅ Успешно собрано {len(df_sp500)} свечей S&P 500.")
        return df_sp500

    except Exception as e:
        print(f"❌ Произошла ошибка при сборе S&P 500: {e}")
        return pd.DataFrame()


# ==============================================================================
# 🧩 ОСНОВНАЯ ЛОГИКА И ОБЪЕДИНЕНИЕ
# ==============================================================================
if __name__ == '__main__':
    # 1. Расчет даты начала (2 года назад)
    end_date = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
    start_date = end_date - timedelta(days=364 * YEARS_TO_FETCH)

    # 2. Получение данных
    ohlcv_data = fetch_ohlcv_data(EXCHANGE_ID, SYMBOL, TIMEFRAME, start_date)
    df_oi = fetch_open_interest_data(OI_SYMBOL_BYBIT, OI_CATEGORY_BYBIT, OI_INTERVAL_BYBIT, start_date)
    df_sp500 = fetch_sp500_data(SP500_TICKER, SP500_INTERVAL, start_date)

    if not ohlcv_data:
        print("Не удалось получить данные OHLCV. Завершение.")
        exit()

    # 3. Преобразование OHLCV в DataFrame
    df_ohlcv = pd.DataFrame(ohlcv_data, columns=['timestamp', 'Open', 'High', 'Low', 'Close', 'Volume'])
    df_ohlcv['timestamp'] = pd.to_datetime(df_ohlcv['timestamp'], unit='ms')
    df_ohlcv.set_index('timestamp', inplace=True)
    df_ohlcv = df_ohlcv[~df_ohlcv.index.duplicated(keep='first')]
    final_df = df_ohlcv
    
    # 4. Объединение с Open Interest
    if not df_oi.empty:
        df_oi['timestamp'] = pd.to_datetime(df_oi['timestamp'], unit='ms')
        df_oi.set_index('timestamp', inplace=True)
        # Объединение и переименование Open Interest (openInterest -> Open_Interest)
        final_df = final_df.join(df_oi[['openInterest']].rename(
            columns={'openInterest': 'Open_Interest'}), how='left')
        print(f"\n✅ Успешно объединены OHLCV и Open Interest. Размер объединенного DF: {len(final_df)}")
    else:
        print("\n⚠️ Не удалось получить данные Open Interest или DataFrame пуст.")

    # 5. Объединение с S&P 500
    if not df_sp500.empty:
        # Объединение с SP500. Используем 'left' join
        final_df = final_df.join(df_sp500, how='left')
        print(f"\n✅ Успешно объединены данные S&P 500.")

        # --- Обработка пропусков S&P 500 ---
        # 1. ЗАПОЛНЕНИЕ ПРОПУСКОВ (ffill)
        # Ищем столбцы, которые могут содержать данные S&P 500 (название тикера или стандартные 'Open', 'Close', 'High', 'Low', 'Volume')
        sp500_columns = [col for col in final_df.columns if SP500_TICKER in str(col) or str(col) in ['Open', 'High', 'Low', 'Close', 'Volume']]

        # Заполняем пропуски последним известным значением (ffill)
        final_df[sp500_columns] = final_df[sp500_columns].ffill()

        # Для корректного удаления начальных строк, заполняем оставшиеся NaN нулями
        final_df[sp500_columns] = final_df[sp500_columns].fillna(0)

        # 2. УДАЛЕНИЕ НАЧАЛЬНЫХ НУЛЕВЫХ СТРОК SP500
        is_sp500_zero = (final_df[sp500_columns] == 0).all(axis=1)

        # Находим индекс первой строки, где хотя бы один столбец SP500 НЕ равен нулю
        # is_sp500_zero.idxmin() вернет индекс первого False, если он есть
        if False in is_sp500_zero.values:
            first_valid_row_index = is_sp500_zero.idxmin()
            rows_before = final_df.index.get_loc(first_valid_row_index)
            rows_to_drop = final_df.iloc[:rows_before]
            final_df = final_df.drop(rows_to_drop.index, axis=0)
            print(f"✅ Удалено {len(rows_to_drop)} начальных строк, где S&P 500 был равен 0.")

        print(f"✅ Пропуски в данных S&P 500 заполнены методом Forward Fill (ffill).")
    else:
        print("\n⚠️ Не удалось получить данные S&P 500 или DataFrame пуст.")

    # 6. БЛОК ПЕРЕИМЕНОВАНИЯ СТОЛБЦОВ (ВТОРОЙ СКРИПТ)
    # Этот блок гарантирует, что имена столбцов будут чистыми и единообразными
    print("\n--- 6. Финальное Переименование Столбцов ---")
    
    # Предполагаем, что столбцы BTC/USDT называются 'Open', 'Close', 'High', 'Low', 'Volume'
    # и их нужно переименовать в 'BTC_...'
    
    # 1. Переименование основных BTC/USDT столбцов
    btc_rename_map = {
        'Open': 'BTC_Open',
        'High': 'BTC_High',
        'Low': 'BTC_Low',
        'Close': 'BTC_Close',
        'Volume': 'BTC_Volume'
    }
    final_df.rename(columns=btc_rename_map, inplace=True)

    # 2. Переименование Open Interest (если не переименовано в п. 4)
    # final_df.rename(columns={'openInterest': 'Open_Interest'}, inplace=True) # Уже сделано в п.4

    # 3. Переименование столбцов S&P 500
    new_column_names = {}
    yfinance_prefix = "SP500_"

    for col in final_df.columns:
        col_str = str(col)
        
        # Ищем столбцы, содержащие тикер S&P 500 (ES=F)
        if SP500_TICKER in col_str:
            
            # Извлекаем нужное нам название
            if 'Close' in col_str:
                new_name = f"{yfinance_prefix}Close"
            elif 'Open' in col_str:
                new_name = f"{yfinance_prefix}Open"
            elif 'High' in col_str:
                new_name = f"{yfinance_prefix}High"
            elif 'Low' in col_str:
                new_name = f"{yfinance_prefix}Low"
            elif 'Volume' in col_str:
                new_name = f"{yfinance_prefix}Volume"
            else:
                new_name = col_str

            new_column_names[col] = new_name

    final_df.rename(columns=new_column_names, inplace=True)
    print("✅ Названия столбцов успешно очищены и стандартизированы.")

    # 7. Вывод и сохранение
    print("\n" + "="*70)
    print(f"ГОТОВЫЙ DATAFRAME (первые 5 строк с S&P 500 и Open Interest):")
    print(final_df.head())
    print("="*70)
    print(f"Общее количество часовых свечей: {len(final_df)}")
    print(f"Финальные столбцы: {list(final_df.columns)}")

    # Сохранение в CSV файл
    filename = f"{SYMBOL.replace('/', '_')}_SP500_OI_{TIMEFRAME}_{YEARS_TO_FETCH}Y.csv"
    final_df.to_csv(filename)
    print(f"✅ Данные сохранены в файл: {filename}")
