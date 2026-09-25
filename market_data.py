import pandas as pd
import yfinance as yf


def get_stock_data(symbol, period="1y", interval="1d"):

    print(f"Downloading data for {symbol}...")

    data = yf.download(
        symbol,
        period=period,
        interval=interval,
        auto_adjust=True
    )

    if data.empty:
        print("No data found.")
        return None

    # Fix MultiIndex columns returned by yfinance
    if isinstance(data.columns, pd.MultiIndex):
        data.columns = data.columns.get_level_values(0)

    return data


# Test market data
if __name__ == "__main__":

    stock_symbol = "RELIANCE.NS"

    stock_data = get_stock_data(
        symbol=stock_symbol,
        period="1y",
        interval="1d"
    )

    if stock_data is not None:
        print(stock_data.tail(10))