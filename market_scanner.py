import pandas as pd
import yfinance as yf


# ==========================================
# STOCK UNIVERSE
# ==========================================

STOCKS = {
    # NSE
    "RELIANCE.NS": "NSE",
    "TCS.NS": "NSE",
    "INFY.NS": "NSE",
    "HDFCBANK.NS": "NSE",
    "ICICIBANK.NS": "NSE",
    "SBIN.NS": "NSE",
    "BHARTIARTL.NS": "NSE",
    "ITC.NS": "NSE",
    "LT.NS": "NSE",
    "AXISBANK.NS": "NSE",

    # BSE
    "500325.BO": "BSE",  # Reliance
    "532540.BO": "BSE",  # TCS
    "500209.BO": "BSE",  # Infosys
    "500180.BO": "BSE",  # HDFC Bank
    "532174.BO": "BSE",  # ICICI Bank
}


# ==========================================
# DOWNLOAD DATA
# ==========================================

def download_stock_data(
    symbol,
    period="5d",
    interval="5m"
):

    try:

        data = yf.download(
            symbol,
            period=period,
            interval=interval,
            auto_adjust=True,
            progress=False
        )

        if data.empty:

            return None

        # Fix MultiIndex
        if isinstance(
            data.columns,
            pd.MultiIndex
        ):

            data.columns = (
                data.columns
                .get_level_values(0)
            )

        # Convert timezone
        if data.index.tz is not None:

            data.index = (
                data.index
                .tz_convert(
                    "Asia/Kolkata"
                )
            )

        return data

    except Exception as error:

        print(
            f"Error downloading "
            f"{symbol}: {error}"
        )

        return None


# ==========================================
# RSI
# ==========================================

def calculate_rsi(
    data,
    period=14
):

    delta = (
        data["Close"]
        .diff()
    )

    gain = (
        delta
        .clip(lower=0)
    )

    loss = (
        -delta
        .clip(upper=0)
    )

    average_gain = (
        gain
        .ewm(
            alpha=1 / period,
            adjust=False
        )
        .mean()
    )

    average_loss = (
        loss
        .ewm(
            alpha=1 / period,
            adjust=False
        )
        .mean()
    )

    rs = (
        average_gain
        /
        average_loss
        .replace(0, pd.NA)
    )

    return (
        100
        -
        (
            100
            /
            (1 + rs)
        )
    )


# ==========================================
# VWAP
# ==========================================

def calculate_vwap(data):

    typical_price = (

        data["High"]

        + data["Low"]

        + data["Close"]

    ) / 3

    trading_day = (
        data.index.date
    )

    cumulative_price_volume = (

        (
            typical_price
            * data["Volume"]
        )

        .groupby(
            trading_day
        )

        .cumsum()
    )

    cumulative_volume = (

        data["Volume"]

        .groupby(
            trading_day
        )

        .cumsum()
    )

    return (

        cumulative_price_volume

        /

        cumulative_volume
        .replace(0, pd.NA)
    )


# ==========================================
# ANALYZE STOCK
# ==========================================

def analyze_stock(
    symbol,
    exchange
):

    data = download_stock_data(
        symbol
    )

    if data is None:

        return None

    if len(data) < 30:

        return None

    # ======================================
    # INDICATORS
    # ======================================

    data["EMA9"] = (

        data["Close"]

        .ewm(
            span=9,
            adjust=False
        )

        .mean()
    )

    data["EMA21"] = (

        data["Close"]

        .ewm(
            span=21,
            adjust=False
        )

        .mean()
    )

    data["RSI"] = (
        calculate_rsi(data)
    )

    data["VWAP"] = (
        calculate_vwap(data)
    )

    data["VolumeMA"] = (

        data["Volume"]

        .rolling(20)

        .mean()
    )

    # ======================================
    # LATEST CANDLE
    # ======================================

    latest = (
        data.iloc[-1]
    )

    previous = (
        data.iloc[-2]
    )

    price = float(
        latest["Close"]
    )

    ema9 = float(
        latest["EMA9"]
    )

    ema21 = float(
        latest["EMA21"]
    )

    rsi = float(
        latest["RSI"]
    )

    vwap = float(
        latest["VWAP"]
    )

    volume = float(
        latest["Volume"]
    )

    average_volume = float(
        latest["VolumeMA"]
    )

    # ======================================
    # RELATIVE VOLUME
    # ======================================

    if average_volume > 0:

        relative_volume = (

            volume
            /
            average_volume
        )

    else:

        relative_volume = 0

    # ======================================
    # 30-MINUTE MOMENTUM
    # ======================================

    # 5-minute candles
    # 6 candles = 30 minutes

    if len(data) >= 7:

        old_price = float(
            data["Close"]
            .iloc[-7]
        )

        momentum_percentage = (

            (
                price
                - old_price
            )

            /
            old_price

        ) * 100

    else:

        momentum_percentage = 0

    # ======================================
    # TREND
    # ======================================

    if (
        price > vwap
        and
        ema9 > ema21
    ):

        trend = "BULLISH"

    elif (
        price < vwap
        and
        ema9 < ema21
    ):

        trend = "BEARISH"

    else:

        trend = "NEUTRAL"

    # ======================================
    # MOMENTUM SCORE
    # ======================================

    score = 0

    # --------------------------------------
    # Price momentum
    # --------------------------------------

    if abs(
        momentum_percentage
    ) >= 0.5:

        score += 2

    elif abs(
        momentum_percentage
    ) >= 0.25:

        score += 1

    # --------------------------------------
    # Relative volume
    # --------------------------------------

    if relative_volume >= 2:

        score += 3

    elif relative_volume >= 1.5:

        score += 2

    elif relative_volume >= 1:

        score += 1

    # --------------------------------------
    # Trend confirmation
    # --------------------------------------

    if trend in [
        "BULLISH",
        "BEARISH"
    ]:

        score += 2

    # --------------------------------------
    # RSI confirmation
    # --------------------------------------

    if (
        trend == "BULLISH"
        and
        55 <= rsi <= 75
    ):

        score += 2

    elif (
        trend == "BEARISH"
        and
        25 <= rsi <= 45
    ):

        score += 2

    # ======================================
    # EXCEPTIONAL MOMENTUM
    # ======================================

    exceptional_momentum = (
        "NONE"
    )

    # LONG exceptional momentum
    if (

        score >= 7

        and

        momentum_percentage
        >= 0.5

        and

        relative_volume
        >= 1.5

        and

        trend == "BULLISH"

        and

        price > vwap
    ):

        exceptional_momentum = (
            "LONG"
        )

    # SHORT exceptional momentum
    elif (

        score >= 7

        and

        momentum_percentage
        <= -0.5

        and

        relative_volume
        >= 1.5

        and

        trend == "BEARISH"

        and

        price < vwap
    ):

        exceptional_momentum = (
            "SHORT"
        )

    # ======================================
    # RETURN RESULT
    # ======================================

    return {

        "Symbol":
            symbol,

        "Exchange":
            exchange,

        "Price":
            price,

        "Momentum":
            momentum_percentage,

        "RelativeVolume":
            relative_volume,

        "EMA9":
            ema9,

        "EMA21":
            ema21,

        "RSI":
            rsi,

        "VWAP":
            vwap,

        "Trend":
            trend,

        "Score":
            score,

        "ExceptionalMomentum":
            exceptional_momentum
    }


# ==========================================
# RUN MARKET SCANNER
# ==========================================

def scan_market():

    results = []

    print(
        "\nScanning Indian "
        "stock market..."
    )

    print(
        "=" * 60
    )

    for symbol, exchange in (
        STOCKS.items()
    ):

        print(
            f"Scanning "
            f"{exchange}: "
            f"{symbol}"
        )

        result = (
            analyze_stock(
                symbol,
                exchange
            )
        )

        if result is not None:

            results.append(
                result
            )

    # ======================================
    # SORT BY MOMENTUM SCORE
    # ======================================

    results.sort(

        key=lambda x:
            x["Score"],

        reverse=True
    )

    return results


# ==========================================
# DISPLAY RESULTS
# ==========================================

def display_results(
    results
):

    print(
        "\n========== "
        "MARKET SCANNER RESULTS "
        "=========="
    )

    if not results:

        print(
            "No stocks found."
        )

        return

    for stock in results:

        print(
            f"\n"
            f"{stock['Exchange']} | "
            f"{stock['Symbol']}"
        )

        print(
            f"Price: "
            f"₹{stock['Price']:.2f}"
        )

        print(
            f"30 Min Momentum: "
            f"{stock['Momentum']:.2f}%"
        )

        print(
            f"Relative Volume: "
            f"{stock['RelativeVolume']:.2f}x"
        )

        print(
            f"RSI: "
            f"{stock['RSI']:.2f}"
        )

        print(
            f"VWAP: "
            f"₹{stock['VWAP']:.2f}"
        )

        print(
            f"Trend: "
            f"{stock['Trend']}"
        )

        print(
            f"Momentum Score: "
            f"{stock['Score']}/9"
        )

        print(
            f"Exceptional Momentum: "
            f"{stock['ExceptionalMomentum']}"
        )


# ==========================================
# DISPLAY EXCEPTIONAL OPPORTUNITIES
# ==========================================

def display_exceptional_opportunities(
    results
):

    opportunities = [

        stock

        for stock in results

        if stock[
            "ExceptionalMomentum"
        ] != "NONE"
    ]

    print(
        "\n========== "
        "EXCEPTIONAL MOMENTUM "
        "OPPORTUNITIES "
        "=========="
    )

    if not opportunities:

        print(
            "No exceptional "
            "opportunities found."
        )

        return

    for stock in opportunities:

        print(
            f"\n"
            f"{stock['Exchange']} | "
            f"{stock['Symbol']} | "
            f"{stock['ExceptionalMomentum']} | "
            f"Score: "
            f"{stock['Score']}/9 | "
            f"Momentum: "
            f"{stock['Momentum']:.2f}% | "
            f"Relative Volume: "
            f"{stock['RelativeVolume']:.2f}x"
        )


# ==========================================
# MAIN
# ==========================================

if __name__ == "__main__":

    market_results = (
        scan_market()
    )

    display_results(
        market_results
    )

    display_exceptional_opportunities(
        market_results
    )