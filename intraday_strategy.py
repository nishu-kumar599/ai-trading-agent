import pandas as pd
from datetime import time


def calculate_rsi(data, period=14):

    delta = data["Close"].diff()

    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)

    avg_gain = gain.ewm(
        alpha=1 / period,
        adjust=False,
        min_periods=period
    ).mean()

    avg_loss = loss.ewm(
        alpha=1 / period,
        adjust=False,
        min_periods=period
    ).mean()

    rs = avg_gain / avg_loss

    rsi = 100 - (
        100 / (1 + rs)
    )

    return rsi


def calculate_vwap(data):

    data = data.copy()

    # Typical price
    typical_price = (
        data["High"]
        + data["Low"]
        + data["Close"]
    ) / 3

    # Group by trading day so VWAP
    # resets every morning
    trading_day = data.index.date

    cumulative_price_volume = (
        (typical_price * data["Volume"])
        .groupby(trading_day)
        .cumsum()
    )

    cumulative_volume = (
        data["Volume"]
        .groupby(trading_day)
        .cumsum()
    )

    vwap = (
        cumulative_price_volume
        / cumulative_volume.replace(0, pd.NA)
    )

    return vwap


def apply_intraday_strategy(data):

    data = data.copy()

    # =====================================
    # EMA 9
    # =====================================

    data["EMA_9"] = (
        data["Close"]
        .ewm(
            span=9,
            adjust=False
        )
        .mean()
    )

    # =====================================
    # EMA 21
    # =====================================

    data["EMA_21"] = (
        data["Close"]
        .ewm(
            span=21,
            adjust=False
        )
        .mean()
    )

    # =====================================
    # RSI
    # =====================================

    data["RSI"] = calculate_rsi(
        data,
        period=14
    )

    # =====================================
    # VWAP
    # =====================================

    data["VWAP"] = calculate_vwap(
        data
    )

    # =====================================
    # AVERAGE VOLUME
    # =====================================

    data["Volume_MA"] = (
        data["Volume"]
        .rolling(
            window=20
        )
        .mean()
    )

    # =====================================
    # EMA DIFFERENCE
    # =====================================

    # Helps avoid trades when EMA9
    # and EMA21 are almost identical.

    data["EMA_Distance"] = (

        abs(
            data["EMA_9"]
            - data["EMA_21"]
        )

        /

        data["Close"]

    ) * 100

    # =====================================
    # DEFAULT SIGNAL
    # =====================================

    data["Signal"] = "HOLD"

    # =====================================
    # CONFIGURATION
    # =====================================

    # Avoid first 15 minutes after open
    trading_start = time(
        9,
        30
    )

    # Avoid opening positions close
    # to market closing time
    trading_end = time(
        15,
        0
    )

    # Minimum percentage separation
    # between EMA9 and EMA21
    min_ema_distance = 0.01

    # Require current volume to be
    # at least this fraction of
    # average 20-candle volume
    volume_multiplier = 0.8

    # =====================================
    # GENERATE SIGNALS
    # =====================================

    for i in range(1, len(data)):

        timestamp = (
            data.index[i]
        )

        current_time = (
            timestamp.time()
        )

        # =================================
        # TRADING TIME FILTER
        # =================================

        if (
            current_time
            < trading_start
            or
            current_time
            > trading_end
        ):
            continue

        current_close = float(
            data["Close"].iloc[i]
        )

        current_ema9 = float(
            data["EMA_9"].iloc[i]
        )

        current_ema21 = float(
            data["EMA_21"].iloc[i]
        )

        previous_ema9 = float(
            data["EMA_9"].iloc[i - 1]
        )

        previous_ema21 = float(
            data["EMA_21"].iloc[i - 1]
        )

        current_rsi = (
            data["RSI"].iloc[i]
        )

        current_vwap = (
            data["VWAP"].iloc[i]
        )

        current_volume = (
            data["Volume"].iloc[i]
        )

        average_volume = (
            data["Volume_MA"].iloc[i]
        )

        ema_distance = (
            data["EMA_Distance"].iloc[i]
        )

        # =================================
        # SKIP INVALID DATA
        # =================================

        if (
            pd.isna(current_rsi)
            or
            pd.isna(current_vwap)
            or
            pd.isna(average_volume)
            or
            pd.isna(ema_distance)
        ):
            continue

        # =================================
        # VOLUME CONFIRMATION
        # =================================

        has_volume = (

            current_volume

            >=

            average_volume
            * volume_multiplier
        )

        if not has_volume:
            continue

        # =================================
        # EMA DISTANCE FILTER
        # =================================

        if (
            ema_distance
            < min_ema_distance
        ):
            continue

        # =================================
        # BUY SIGNAL
        # =================================

        bullish_crossover = (

            current_ema9
            > current_ema21

            and

            previous_ema9
            <= previous_ema21
        )

        bullish_rsi = (

            current_rsi
            >= 52

            and

            current_rsi
            <= 68
        )

        above_vwap = (

            current_close
            > current_vwap
        )

        if (
            bullish_crossover
            and
            bullish_rsi
            and
            above_vwap
        ):

            data.loc[
                timestamp,
                "Signal"
            ] = "BUY"

            continue

        # =================================
        # SELL / SHORT SIGNAL
        # =================================

        bearish_crossover = (

            current_ema9
            < current_ema21

            and

            previous_ema9
            >= previous_ema21
        )

        bearish_rsi = (

            current_rsi
            <= 48

            and

            current_rsi
            >= 32
        )

        below_vwap = (

            current_close
            < current_vwap
        )

        if (
            bearish_crossover
            and
            bearish_rsi
            and
            below_vwap
        ):

            data.loc[
                timestamp,
                "Signal"
            ] = "SELL"

    return data