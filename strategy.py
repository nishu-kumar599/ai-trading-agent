import pandas as pd


def apply_strategy(data):
    """
    Moving Average Crossover Strategy

    BUY:
    SMA 20 crosses above SMA 50.

    SELL:
    SMA 20 crosses below SMA 50.

    BUY can open a LONG position.
    SELL can open a SHORT position.
    """

    data = data.copy()

    # Calculate moving averages
    data["SMA_20"] = (
        data["Close"]
        .rolling(window=20)
        .mean()
    )

    data["SMA_50"] = (
        data["Close"]
        .rolling(window=50)
        .mean()
    )

    # Default signal
    data["Signal"] = "HOLD"

    for i in range(1, len(data)):

        current_sma20 = data["SMA_20"].iloc[i]
        current_sma50 = data["SMA_50"].iloc[i]

        previous_sma20 = data["SMA_20"].iloc[i - 1]
        previous_sma50 = data["SMA_50"].iloc[i - 1]

        # Skip NaN values
        if pd.isna(current_sma20) or pd.isna(current_sma50):
            continue

        if pd.isna(previous_sma20) or pd.isna(previous_sma50):
            continue

        # Bullish crossover
        if (
            current_sma20 > current_sma50
            and previous_sma20 <= previous_sma50
        ):
            data.loc[
                data.index[i],
                "Signal"
            ] = "BUY"

        # Bearish crossover
        elif (
            current_sma20 < current_sma50
            and previous_sma20 >= previous_sma50
        ):
            data.loc[
                data.index[i],
                "Signal"
            ] = "SELL"

    return data