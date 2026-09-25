import pandas as pd
import yfinance as yf


def get_intraday_data(
    symbol,
    period="30d",
    interval="5m"
):

    print(
        f"Downloading intraday data "
        f"for {symbol}..."
    )

    data = yf.download(
        symbol,
        period=period,
        interval=interval,
        auto_adjust=True,
        progress=True
    )

    if data.empty:
        print("No intraday data found.")
        return None

    # Fix MultiIndex returned by yfinance
    if isinstance(data.columns, pd.MultiIndex):
        data.columns = (
            data.columns.get_level_values(0)
        )

    # Remove missing values
    data = data.dropna()

    # Convert timestamps to Indian time
    if data.index.tz is not None:
        data.index = data.index.tz_convert(
            "Asia/Kolkata"
        )

    return data