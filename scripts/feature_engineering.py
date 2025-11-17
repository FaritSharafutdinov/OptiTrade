import pandas as pd
import pandas_ta as ta
import numpy as np

# --- Конфигурация ---
INPUT_FILENAME = 'BTC_USDT_SP500_OI_1h_2Y.csv'
OUTPUT_FILENAME = 'BTC_USDT_OI_SP500_FEATURES_1h_2Y.csv'

# --- Соответствие старых и новых колонок ---
# Определяем текущие колонки, чтобы избежать ошибок
COL_MAPPING = {
    'Open': 'BTC_Open',
    'High': 'BTC_High',
    'Low': 'BTC_Low',
    'Close': 'BTC_Close',
    'Volume': 'BTC_Volume',
    'SP500_Close': 'SP500_Close'  # Для SP500 оставляем
}
# --------------------

def calculate_log_return(series, periods=1):
    """
    Расчет логарифмического возврата.
    """
    return np.log(series / series.shift(periods))

def create_advanced_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Создает стационарные фичи, включая SP500 log return,
    и рассчитывает индикаторы без look-ahead bias.
    """
    # 1. ПЕРЕИМЕНОВАНИЕ КОЛОНОК ДЛЯ УНИВЕРСАЛЬНОСТИ
    # Используем копию, чтобы не менять исходный DataFrame
    df_temp = df.copy()
    
    # Создаем временные псевдонимы для BTC-данных (Close, High, Low, Volume)
    for old_name, new_name in COL_MAPPING.items():
        if new_name in df_temp.columns and old_name not in df_temp.columns:
            df_temp[old_name] = df_temp[new_name]
    
    # Проверка наличия обязательных колонок
    required_cols = ['Close', 'High', 'Low', 'Volume', 'SP500_Close']
    if not all(col in df_temp.columns for col in required_cols):
        missing = [col for col in required_cols if col not in df_temp.columns]
        raise ValueError(f"Отсутствуют обязательные колонки: {missing}. Проверьте COL_MAPPING и входной датасет.")


    ## 2. ОСНОВНЫЕ ФИЧИ И ТАРГЕТ

    # Log Return для BTC (основной таргет/базовая фича)
    df_temp['log_return'] = calculate_log_return(df_temp['Close'])
    
    # 🌟 НОВАЯ ФИЧА: Log Return для SP500
    df_temp['SP500_log_return'] = calculate_log_return(df_temp['SP500_Close'])
    

    ## 3. СТАЦИОНАРНЫЕ ЦЕНОВЫЕ ПРЕОБРАЗОВАНИЯ (BTC)

    prev_close = df_temp['Close'].shift(1)
    # Диапазон относительно предыдущего закрытия
    df_temp['price_range'] = (df_temp['High'] - df_temp['Low']) / prev_close
    # Изменение внутри бара (закрытия к открытию)
    df_temp['price_change'] = (df_temp['Close'] - df_temp['Open']) / df_temp['Open']
    # Хвосты относительно предыдущего закрытия
    df_temp['high_to_prev_close'] = (df_temp['High'] - prev_close) / prev_close
    df_temp['low_to_prev_close'] = (df_temp['Low'] - prev_close) / prev_close

    ## 4. ВОЛАТИЛЬНОСТЬ И ОБЪЕМ

    for window in [5, 14, 21]:
        # Волатильность (стандартное отклонение лог-доходности)
        df_temp[f'volatility_{window}'] = df_temp['log_return'].rolling(window=window).std()
        # Скользящее среднее объема
        df_temp[f'volume_ma_{window}'] = df_temp['Volume'].rolling(window=window).mean()

    # Z-score объема
    vol_mean_100 = df_temp['Volume'].rolling(100).mean()
    vol_std_100 = df_temp['Volume'].rolling(100).std()
    df_temp['volume_zscore'] = (df_temp['Volume'] - vol_mean_100) / vol_std_100


    ## 5. БЕЗОПАСНЫЕ ТЕХНИЧЕСКИЕ ИНДИКАТОРЫ (Без Look-Ahead Bias)

    # Создаем сдвинутые версии BTC-данных для расчета индикаторов (t-1)
    df_temp['prev_Close'] = df_temp['Close'].shift(1)
    df_temp['prev_High'] = df_temp['High'].shift(1)
    df_temp['prev_Low'] = df_temp['Low'].shift(1)

    # MACD на сдвинутых данных
    macd_data = df_temp.ta.macd(close='prev_Close', fast=12, slow=26, signal=9)
    if macd_data is not None:
        df_temp['MACD_safe'] = macd_data.iloc[:, 0]
        df_temp['MACDs_safe'] = macd_data.iloc[:, 1]
        df_temp['MACDh_safe'] = macd_data.iloc[:, 2]

    # RSI на сдвинутых данных
    rsi_data = df_temp.ta.rsi(close='prev_Close', length=14)
    if rsi_data is not None:
        df_temp['RSI_safe'] = rsi_data

    # ATR на сдвинутых данных
    atr_data = df_temp.ta.atr(high='prev_High', low='prev_Low', close='prev_Close', length=14)
    if atr_data is not None:
        # Нормализуем ATR относительно предыдущего закрытия (для стационарности)
        df_temp['ATR_safe_norm'] = atr_data / df_temp['prev_Close']
    
    # Удаляем временные колонки, использованные для расчета индикаторов
    df_temp.drop(['prev_Close', 'prev_High', 'prev_Low'], axis=1, inplace=True, errors='ignore')


    ## 6. ВРЕМЕННЫЕ ФИЧИ (ЦИКЛИЧЕСКОЕ КОДИРОВАНИЕ)

    # Циклическое кодирование времени (подразумевается, что индекс - DateTimeIndex)
    df_temp['hour_sin'] = np.sin(2 * np.pi * df_temp.index.hour / 24)
    df_temp['hour_cos'] = np.cos(2 * np.pi * df_temp.index.hour / 24)
    df_temp['day_sin'] = np.sin(2 * np.pi * df_temp.index.dayofweek / 7)
    df_temp['day_cos'] = np.cos(2 * np.pi * df_temp.index.dayofweek / 7)
    df_temp['month_sin'] = np.sin(2 * np.pi * df_temp.index.month / 12)
    df_temp['month_cos'] = np.cos(2 * np.pi * df_temp.index.month / 12)

    ## 7. ФИНАЛЬНАЯ ОЧИСТКА

    # Список колонок, которые нужно удалить:
    # 1. Оригинальные BTC-OHLCV, т.к. мы используем их стационарные преобразования.
    # 2. Временные псевдонимы, если они были созданы.
    
    cols_to_drop = list(COL_MAPPING.keys()) + list(COL_MAPPING.values())
    # Убираем SP500_Close из удаления, если он не попал в основные, но оставляем его Log Return
    cols_to_drop = [c for c in cols_to_drop] 

    # Дополнительно удаляем временные псевдонимы (Open, High, Low, Close, Volume)
    cols_to_drop.extend(['Open', 'High', 'Low', 'Volume','SP500_Close', 'SP500_High', 'SP500_Low', 'SP500_Open',
       'SP500_Volume'])
    
    # Оставляем только уникальные и избегаем 'SP500_Close'
    final_cols_to_drop = set(c for c in cols_to_drop) - set(['Close'])

    # Убеждаемся, что мы не удаляем только что созданные фичи и Open_Interest
    final_df = df_temp.drop(columns=list(final_cols_to_drop), errors='ignore')
    
    # Удаляем строки с NaN (появляются из-за rolling windows и shift)
    final_df.dropna(inplace=True) 

    return final_df

# --- Основной блок ---
if __name__ == '__main__':
    try:
        # 1. Загрузка данных
        df = pd.read_csv(INPUT_FILENAME, index_col='timestamp', parse_dates=True)
        print(f"Загружен файл: {INPUT_FILENAME}. Размер: {len(df)}")
        
        # 2. Расчет и добавление фич
        print("Начало Feature Engineering...")
        df_features = create_advanced_features(df)

        # 3. Вывод и сохранение
        print("\n" + "="*70)
        print(f"ГОТОВЫЙ DATAFRAME С {len(df_features.columns)} ФИЧАМИ (первые 5 строк с NaN):")
        print(df_features.head())
        print("-" * 70)
        print("ГОТОВЫЙ DATAFRAME С ФИЧАМИ (последние 5 строк, очищенные от NaN):")
        print(df_features.tail())
        print("="*70)
        
        # Сохранение в новый CSV файл
        df_features.to_csv(OUTPUT_FILENAME)
        print(f"✅ Обогащенные данные сохранены в файл: {OUTPUT_FILENAME}")
        
    except FileNotFoundError:
        print(f"❌ Ошибка: Файл '{INPUT_FILENAME}' не найден. Убедитесь, что он существует.")
    except ValueError as ve:
        print(f"❌ Ошибка данных: {ve}")
    except Exception as e:
        print(f"❌ Произошла непредвиденная ошибка при обработке данных: {e}")
