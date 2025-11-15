import pandas as pd
import yfinance as yf
from pathlib import Path

def load_yf_series(ticker, name):
    """
    Load market index or commodity price from Yahoo Finance.

    Parameters:
        ticker: Yahoo Finance symbol.
        name: column name in output.

    What this does:
        - Downloads OHLC data
        - Keeps only the Close price
        - Renames column to a usable format
    """
    period="730d"
    interval="1h"
    df = yf.download(ticker, period=period, interval=interval, auto_adjust=True)
    df = df[["Close"]]
    df.rename(columns={"Close": name}, inplace=True)
    return df


def main():
    Path("data").mkdir(exist_ok=True)

    print("Downloading hourly macro data...")

    # SP500: Broad measure of U.S. stock market risk sentiment
    sp500 = load_yf_series("^GSPC", "SP500")

    # NASDAQ 100: Tech sector performance – highly correlated with risk-on sentiment
    nasdaq = load_yf_series("^NDX", "NASDAQ")

    # VIX: Implied volatility index – proxy for market fear
    vix = load_yf_series("^VIX", "VIX")

    # GOLD: Safe-haven asset – inverse relationship with risk-on assets
    gold = load_yf_series("GC=F", "GOLD")

    # OIL (WTI): Reflects global economic activity and inflation expectations
    oil = load_yf_series("CL=F", "OIL")


    print("Merging datasets...")
    macro = pd.concat([sp500, nasdaq, vix, gold, oil], axis=1)

    print("Synchronizing timestamps and filling missing values...")
    macro = macro.sort_index()
    macro = macro.resample("1h").ffill()

    macro.to_csv("data/macro_features_hourly.csv")
    print("Done → data/macro_features_hourly.csv")


# def main():
#     # Ensure output folder exists
#     Path("data").mkdir(exist_ok=True)

#     print("Downloading data from Yahoo Finance...")

#     # --- Market indices and commodities ---
#     # SP500: Broad measure of U.S. stock market risk sentiment
#     sp500 = load_yf_series("^GSPC", "SP500")

#     # NASDAQ 100: Tech sector performance – highly correlated with risk-on sentiment
#     nasdaq = load_yf_series("^NDX", "NASDAQ")

#     # VIX: Implied volatility index – proxy for market fear
#     vix = load_yf_series("^VIX", "VIX")

#     # GOLD: Safe-haven asset – inverse relationship with risk-on assets
#     gold = load_yf_series("GC=F", "GOLD")

#     # OIL (WTI): Reflects global economic activity and inflation expectations
#     oil = load_yf_series("CL=F", "OIL")


#     print("Merging all datasets...")
#     macro = pd.concat(
#         [
#             sp500, nasdaq, vix, gold, oil
#         ],
#         axis=1
#     )

#     print("Synchronizing timestamps and filling missing values...")
#     # Convert to daily frequency and forward-fill missing entries
#     macro = macro.sort_index()
#     macro = macro.resample("1D").ffill()

#     print("Saving final dataset...")
#     macro.to_csv("data/macro_features.csv")
#     print("Done → data/macro_features.csv")


if __name__ == "__main__":
    main()
