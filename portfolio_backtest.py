import os
from collections import defaultdict

import numpy as np
import pandas as pd
import yfinance as yf


# =========================================================
# CONFIGURATION
# =========================================================

INITIAL_BALANCE = 100000

SYMBOLS = [
    "RELIANCE.NS",
    "TCS.NS",
    "INFY.NS",
    "HDFCBANK.NS",
    "ICICIBANK.NS",
    "SBIN.NS",
    "BHARTIARTL.NS",
    "ITC.NS",
    "LT.NS",
    "AXISBANK.NS",
]

PERIOD = "60d"
INTERVAL = "5m"

# Daily trade limits
MAX_NORMAL_TRADES_PER_DAY = 3
MAX_EXCEPTIONAL_TRADES_PER_DAY = 1

# Portfolio risk
MAX_POSITION_PERCENTAGE = 20
MAX_DAILY_LOSS_PERCENTAGE = 1.0

# Normal trade filters
MIN_NORMAL_SCORE = 7
MIN_NORMAL_RELATIVE_VOLUME = 1.20
MIN_NORMAL_MOMENTUM = 0.15

# Exceptional trade filters
EXCEPTIONAL_SCORE = 8
EXCEPTIONAL_RELATIVE_VOLUME = 2.0
EXCEPTIONAL_MOMENTUM = 0.50

# ATR
ATR_PERIOD = 14
ATR_STOP_MULTIPLIER = 1.5

# Risk / reward
RISK_REWARD_RATIO = 2.0

# Break-even
BREAK_EVEN_R = 1.0

# Start trailing after this R multiple
TRAILING_START_R = 1.5

# ATR trailing distance
TRAILING_ATR_MULTIPLIER = 1.0

# Slippage
SLIPPAGE_PERCENTAGE = 0.0005

# Simplified transaction cost estimate
TRANSACTION_COST_PERCENTAGE = 0.0003

# Trading times
MARKET_ENTRY_START = "09:30"
LAST_ENTRY_TIME = "15:00"
SQUARE_OFF_TIME = "15:20"

# Re-entry protection
COOLDOWN_MINUTES = 30

# CSV output
TRADE_REPORT_FILE = "portfolio_backtest_trades.csv"
DAILY_REPORT_FILE = "portfolio_backtest_daily.csv"
SYMBOL_REPORT_FILE = "portfolio_backtest_symbols.csv"


# =========================================================
# DOWNLOAD DATA
# =========================================================

def download_data(symbol):

    print(f"Downloading: {symbol}")

    try:

        data = yf.download(
            symbol,
            period=PERIOD,
            interval=INTERVAL,
            auto_adjust=True,
            progress=False
        )

        if data.empty:

            print(
                f"No data found for {symbol}"
            )

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

        required_columns = [
            "Open",
            "High",
            "Low",
            "Close",
            "Volume"
        ]

        data = data.dropna(
            subset=required_columns
        )

        # Convert timezone to India
        if data.index.tz is None:

            data.index = (
                data.index
                .tz_localize("UTC")
                .tz_convert(
                    "Asia/Kolkata"
                )
            )

        else:

            data.index = (
                data.index
                .tz_convert(
                    "Asia/Kolkata"
                )
            )

        return data

    except Exception as error:

        print(
            f"Download error for "
            f"{symbol}: {error}"
        )

        return None


# =========================================================
# RSI
# =========================================================

def calculate_rsi(
    close,
    period=14
):

    delta = close.diff()

    gain = delta.clip(
        lower=0
    )

    loss = (
        -delta.clip(
            upper=0
        )
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
        average_loss.replace(
            0,
            np.nan
        )
    )

    rsi = (
        100
        -
        (
            100
            /
            (
                1
                +
                rs
            )
        )
    )

    return rsi.fillna(50)


# =========================================================
# ADD INDICATORS
# =========================================================

def add_indicators(data):

    data = data.copy()

    # =====================================================
    # EMA
    # =====================================================

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

    data["EMA50"] = (
        data["Close"]
        .ewm(
            span=50,
            adjust=False
        )
        .mean()
    )

    # =====================================================
    # RSI
    # =====================================================

    data["RSI"] = (
        calculate_rsi(
            data["Close"]
        )
    )

    # =====================================================
    # ATR
    # =====================================================

    previous_close = (
        data["Close"]
        .shift(1)
    )

    true_range_1 = (
        data["High"]
        -
        data["Low"]
    )

    true_range_2 = (
        data["High"]
        -
        previous_close
    ).abs()

    true_range_3 = (
        data["Low"]
        -
        previous_close
    ).abs()

    data["TrueRange"] = (
        pd.concat(
            [
                true_range_1,
                true_range_2,
                true_range_3
            ],
            axis=1
        )
        .max(axis=1)
    )

    data["ATR"] = (
        data["TrueRange"]
        .rolling(
            window=ATR_PERIOD
        )
        .mean()
    )

    # =====================================================
    # TRADING DATE
    # =====================================================

    data["TradingDate"] = (
        data.index.date
    )

    # =====================================================
    # VWAP
    # =====================================================

    typical_price = (
        (
            data["High"]
            +
            data["Low"]
            +
            data["Close"]
        )
        /
        3
    )

    data["TPV"] = (
        typical_price
        *
        data["Volume"]
    )

    cumulative_tpv = (
        data
        .groupby(
            "TradingDate"
        )["TPV"]
        .cumsum()
    )

    cumulative_volume = (
        data
        .groupby(
            "TradingDate"
        )["Volume"]
        .cumsum()
    )

    data["VWAP"] = (
        cumulative_tpv
        /
        cumulative_volume.replace(
            0,
            np.nan
        )
    )

    # =====================================================
    # AVERAGE VOLUME
    # =====================================================

    data["AvgVolume"] = (
        data["Volume"]
        .rolling(
            window=20
        )
        .mean()
    )

    data["RelativeVolume"] = (
        data["Volume"]
        /
        data["AvgVolume"].replace(
            0,
            np.nan
        )
    )

    # =====================================================
    # 30-MINUTE MOMENTUM
    #
    # 6 x 5-minute candles
    # =====================================================

    data["Momentum"] = (
        data["Close"]
        .pct_change(
            periods=6
        )
        *
        100
    )

    return data


# =========================================================
# CALCULATE SIGNAL
# =========================================================

def calculate_signal(row):

    price = float(
        row["Close"]
    )

    ema9 = float(
        row["EMA9"]
    )

    ema21 = float(
        row["EMA21"]
    )

    ema50 = float(
        row["EMA50"]
    )

    rsi = float(
        row["RSI"]
    )

    vwap = float(
        row["VWAP"]
    )

    momentum = float(
        row["Momentum"]
    )

    relative_volume = float(
        row["RelativeVolume"]
    )

    atr = float(
        row["ATR"]
    )

    # =====================================================
    # LONG SCORE
    # =====================================================

    long_score = 0

    if ema9 > ema21:
        long_score += 2

    if price > vwap:
        long_score += 2

    if momentum > 0:
        long_score += 2

    if relative_volume >= 1:
        long_score += 1

    if 50 <= rsi <= 75:
        long_score += 2

    # =====================================================
    # SHORT SCORE
    # =====================================================

    short_score = 0

    if ema9 < ema21:
        short_score += 2

    if price < vwap:
        short_score += 2

    if momentum < 0:
        short_score += 2

    if relative_volume >= 1:
        short_score += 1

    if 25 <= rsi <= 50:
        short_score += 2

    # =====================================================
    # DETERMINE DIRECTION
    # =====================================================

    if long_score > short_score:

        direction = "LONG"
        score = long_score

    elif short_score > long_score:

        direction = "SHORT"
        score = short_score

    else:

        direction = "NONE"
        score = 0

    # =====================================================
    # EMA50 TREND CONFIRMATION
    # =====================================================

    long_trend = (
        price > ema50
        and
        ema9 > ema21
    )

    short_trend = (
        price < ema50
        and
        ema9 < ema21
    )

    if (
        direction == "LONG"
        and
        not long_trend
    ):

        direction = "NONE"

    elif (
        direction == "SHORT"
        and
        not short_trend
    ):

        direction = "NONE"

    # =====================================================
    # EXCEPTIONAL MOMENTUM
    # =====================================================

    exceptional = False

    if (
        direction == "LONG"
        and
        score >= EXCEPTIONAL_SCORE
        and
        momentum >= EXCEPTIONAL_MOMENTUM
        and
        relative_volume
        >= EXCEPTIONAL_RELATIVE_VOLUME
    ):

        exceptional = True

    elif (
        direction == "SHORT"
        and
        score >= EXCEPTIONAL_SCORE
        and
        momentum <= -EXCEPTIONAL_MOMENTUM
        and
        relative_volume
        >= EXCEPTIONAL_RELATIVE_VOLUME
    ):

        exceptional = True

    return {

        "Direction":
            direction,

        "Score":
            score,

        "Exceptional":
            exceptional,

        "Momentum":
            momentum,

        "RelativeVolume":
            relative_volume,

        "RSI":
            rsi,

        "VWAP":
            vwap,

        "ATR":
            atr
    }


# =========================================================
# SLIPPAGE
# =========================================================

def apply_entry_slippage(
    price,
    direction
):

    if direction == "LONG":

        return (
            price
            *
            (
                1
                +
                SLIPPAGE_PERCENTAGE
            )
        )

    return (
        price
        *
        (
            1
            -
            SLIPPAGE_PERCENTAGE
        )
    )


def apply_exit_slippage(
    price,
    direction
):

    if direction == "LONG":

        return (
            price
            *
            (
                1
                -
                SLIPPAGE_PERCENTAGE
            )
        )

    return (
        price
        *
        (
            1
            +
            SLIPPAGE_PERCENTAGE
        )
    )


# =========================================================
# PORTFOLIO BACKTESTER
# =========================================================

class PortfolioBacktester:

    def __init__(
        self,
        initial_balance
    ):

        self.initial_balance = (
            initial_balance
        )

        self.cash = (
            initial_balance
        )

        self.positions = {}

        self.trades = []

        self.equity_curve = []

        self.normal_trades_by_day = (
            defaultdict(int)
        )

        self.exceptional_trades_by_day = (
            defaultdict(int)
        )

        self.daily_realized_pnl = (
            defaultdict(float)
        )

        self.total_transaction_cost = 0

        self.total_slippage_cost = 0

        self.last_exit_time = {}


    # =====================================================
    # PORTFOLIO VALUE
    # =====================================================

    def portfolio_value(
        self,
        prices
    ):

        value = self.cash

        for symbol, position in (
            self.positions.items()
        ):

            current_price = (
                prices.get(
                    symbol,
                    position[
                        "EntryPrice"
                    ]
                )
            )

            if (
                position[
                    "Direction"
                ]
                ==
                "LONG"
            ):

                pnl = (
                    current_price
                    -
                    position[
                        "EntryPrice"
                    ]
                ) * position[
                    "Quantity"
                ]

            else:

                pnl = (
                    position[
                        "EntryPrice"
                    ]
                    -
                    current_price
                ) * position[
                    "Quantity"
                ]

            value += (
                position[
                    "ReservedCapital"
                ]
                +
                pnl
            )

        return value


    # =====================================================
    # DAILY LOSS LIMIT
    # =====================================================

    def daily_loss_reached(
        self,
        trading_date
    ):

        maximum_loss = (
            self.initial_balance
            *
            (
                MAX_DAILY_LOSS_PERCENTAGE
                /
                100
            )
        )

        return (
            self.daily_realized_pnl[
                trading_date
            ]
            <=
            -maximum_loss
        )


    # =====================================================
    # COOLDOWN CHECK
    # =====================================================

    def cooldown_active(
        self,
        symbol,
        timestamp
    ):

        if (
            symbol
            not in
            self.last_exit_time
        ):

            return False

        last_exit = (
            self.last_exit_time[
                symbol
            ]
        )

        minutes_since_exit = (
            (
                timestamp
                -
                last_exit
            )
            .total_seconds()
            /
            60
        )

        return (
            minutes_since_exit
            <
            COOLDOWN_MINUTES
        )


    # =====================================================
    # OPEN POSITION
    # =====================================================

    def open_position(
        self,
        symbol,
        timestamp,
        raw_price,
        direction,
        trade_type,
        signal
    ):

        # Already open
        if symbol in self.positions:

            return False

        trading_date = (
            timestamp.date()
        )

        # Daily loss protection
        if self.daily_loss_reached(
            trading_date
        ):

            return False

        # Cooldown
        if self.cooldown_active(
            symbol,
            timestamp
        ):

            return False

        # =================================================
        # TRADE LIMIT
        # =================================================

        if trade_type == "NORMAL":

            if (
                self.normal_trades_by_day[
                    trading_date
                ]
                >=
                MAX_NORMAL_TRADES_PER_DAY
            ):

                return False

        else:

            if (
                self.exceptional_trades_by_day[
                    trading_date
                ]
                >=
                MAX_EXCEPTIONAL_TRADES_PER_DAY
            ):

                return False

        # =================================================
        # ATR VALIDATION
        # =================================================

        atr = signal["ATR"]

        if (
            pd.isna(atr)
            or
            atr <= 0
        ):

            return False

        # =================================================
        # ENTRY SLIPPAGE
        # =================================================

        entry_price = (
            apply_entry_slippage(
                raw_price,
                direction
            )
        )

        entry_slippage_cost = (
            abs(
                entry_price
                -
                raw_price
            )
        )

        # =================================================
        # POSITION SIZE
        # =================================================

        maximum_position_value = (
            self.cash
            *
            (
                MAX_POSITION_PERCENTAGE
                /
                100
            )
        )

        quantity = int(
            maximum_position_value
            /
            entry_price
        )

        if quantity <= 0:

            return False

        reserved_capital = (
            entry_price
            *
            quantity
        )

        # =================================================
        # ENTRY TRANSACTION COST
        # =================================================

        entry_cost = (
            reserved_capital
            *
            TRANSACTION_COST_PERCENTAGE
        )

        required_cash = (
            reserved_capital
            +
            entry_cost
        )

        if required_cash > self.cash:

            return False

        # =================================================
        # ATR STOP AND TARGET
        # =================================================

        risk_distance = (
            atr
            *
            ATR_STOP_MULTIPLIER
        )

        if direction == "LONG":

            stop_loss = (
                entry_price
                -
                risk_distance
            )

            take_profit = (
                entry_price
                +
                (
                    risk_distance
                    *
                    RISK_REWARD_RATIO
                )
            )

        else:

            stop_loss = (
                entry_price
                +
                risk_distance
            )

            take_profit = (
                entry_price
                -
                (
                    risk_distance
                    *
                    RISK_REWARD_RATIO
                )
            )

        # =================================================
        # DEDUCT CAPITAL
        # =================================================

        self.cash -= (
            required_cash
        )

        self.total_transaction_cost += (
            entry_cost
        )

        self.total_slippage_cost += (
            entry_slippage_cost
            *
            quantity
        )

        # =================================================
        # SAVE POSITION
        # =================================================

        self.positions[
            symbol
        ] = {

            "Symbol":
                symbol,

            "Direction":
                direction,

            "TradeType":
                trade_type,

            "EntryTime":
                timestamp,

            "EntryPrice":
                entry_price,

            "RawEntryPrice":
                raw_price,

            "Quantity":
                quantity,

            "ReservedCapital":
                reserved_capital,

            "EntryTransactionCost":
                entry_cost,

            "InitialStopLoss":
                stop_loss,

            "StopLoss":
                stop_loss,

            "TakeProfit":
                take_profit,

            "ATR":
                atr,

            "RiskDistance":
                risk_distance,

            "HighestPrice":
                entry_price,

            "LowestPrice":
                entry_price,

            "BreakEvenActivated":
                False,

            "TrailingActivated":
                False,

            "Score":
                signal[
                    "Score"
                ],

            "Momentum":
                signal[
                    "Momentum"
                ],

            "RelativeVolume":
                signal[
                    "RelativeVolume"
                ]
        }

        # =================================================
        # UPDATE TRADE COUNTERS
        # =================================================

        if trade_type == "NORMAL":

            self.normal_trades_by_day[
                trading_date
            ] += 1

        else:

            self.exceptional_trades_by_day[
                trading_date
            ] += 1

        return True


    # =====================================================
    # UPDATE OPEN POSITION
    # =====================================================

    def update_position(
        self,
        symbol,
        timestamp,
        high,
        low,
        close
    ):

        if (
            symbol
            not in
            self.positions
        ):

            return

        position = (
            self.positions[
                symbol
            ]
        )

        direction = (
            position[
                "Direction"
            ]
        )

        entry_price = (
            position[
                "EntryPrice"
            ]
        )

        risk_distance = (
            position[
                "RiskDistance"
            ]
        )

        # =================================================
        # LONG POSITION
        # =================================================

        if direction == "LONG":

            # ---------------------------------------------
            # Conservative OHLC assumption:
            # Check existing stop before updating trailing.
            # ---------------------------------------------

            if (
                low
                <=
                position[
                    "StopLoss"
                ]
            ):

                self.close_position(
                    symbol,
                    timestamp,
                    position[
                        "StopLoss"
                    ],
                    "STOP LOSS"
                )

                return

            # ---------------------------------------------
            # Take profit
            # ---------------------------------------------

            if (
                high
                >=
                position[
                    "TakeProfit"
                ]
            ):

                self.close_position(
                    symbol,
                    timestamp,
                    position[
                        "TakeProfit"
                    ],
                    "TAKE PROFIT"
                )

                return

            # ---------------------------------------------
            # Track highest price
            # ---------------------------------------------

            if (
                high
                >
                position[
                    "HighestPrice"
                ]
            ):

                position[
                    "HighestPrice"
                ] = high

            profit_distance = (
                position[
                    "HighestPrice"
                ]
                -
                entry_price
            )

            # ---------------------------------------------
            # Break-even
            # ---------------------------------------------

            if (
                profit_distance
                >=
                risk_distance
                *
                BREAK_EVEN_R
            ):

                position[
                    "BreakEvenActivated"
                ] = True

                position[
                    "StopLoss"
                ] = max(
                    position[
                        "StopLoss"
                    ],
                    entry_price
                )

            # ---------------------------------------------
            # Dynamic trailing
            # ---------------------------------------------

            if (
                profit_distance
                >=
                risk_distance
                *
                TRAILING_START_R
            ):

                position[
                    "TrailingActivated"
                ] = True

                trailing_stop = (
                    position[
                        "HighestPrice"
                    ]
                    -
                    (
                        position[
                            "ATR"
                        ]
                        *
                        TRAILING_ATR_MULTIPLIER
                    )
                )

                position[
                    "StopLoss"
                ] = max(
                    position[
                        "StopLoss"
                    ],
                    trailing_stop
                )

        # =================================================
        # SHORT POSITION
        # =================================================

        else:

            # ---------------------------------------------
            # Conservative OHLC assumption
            # ---------------------------------------------

            if (
                high
                >=
                position[
                    "StopLoss"
                ]
            ):

                self.close_position(
                    symbol,
                    timestamp,
                    position[
                        "StopLoss"
                    ],
                    "STOP LOSS"
                )

                return

            # ---------------------------------------------
            # Take profit
            # ---------------------------------------------

            if (
                low
                <=
                position[
                    "TakeProfit"
                ]
            ):

                self.close_position(
                    symbol,
                    timestamp,
                    position[
                        "TakeProfit"
                    ],
                    "TAKE PROFIT"
                )

                return

            # ---------------------------------------------
            # Track lowest price
            # ---------------------------------------------

            if (
                low
                <
                position[
                    "LowestPrice"
                ]
            ):

                position[
                    "LowestPrice"
                ] = low

            profit_distance = (
                entry_price
                -
                position[
                    "LowestPrice"
                ]
            )

            # ---------------------------------------------
            # Break-even
            # ---------------------------------------------

            if (
                profit_distance
                >=
                risk_distance
                *
                BREAK_EVEN_R
            ):

                position[
                    "BreakEvenActivated"
                ] = True

                position[
                    "StopLoss"
                ] = min(
                    position[
                        "StopLoss"
                    ],
                    entry_price
                )

            # ---------------------------------------------
            # Dynamic trailing
            # ---------------------------------------------

            if (
                profit_distance
                >=
                risk_distance
                *
                TRAILING_START_R
            ):

                position[
                    "TrailingActivated"
                ] = True

                trailing_stop = (
                    position[
                        "LowestPrice"
                    ]
                    +
                    (
                        position[
                            "ATR"
                        ]
                        *
                        TRAILING_ATR_MULTIPLIER
                    )
                )

                position[
                    "StopLoss"
                ] = min(
                    position[
                        "StopLoss"
                    ],
                    trailing_stop
                )


    # =====================================================
    # CLOSE POSITION
    # =====================================================

    def close_position(
        self,
        symbol,
        timestamp,
        raw_exit_price,
        reason
    ):

        if (
            symbol
            not in
            self.positions
        ):

            return

        position = (
            self.positions[
                symbol
            ]
        )

        direction = (
            position[
                "Direction"
            ]
        )

        quantity = (
            position[
                "Quantity"
            ]
        )

        # =================================================
        # EXIT SLIPPAGE
        # =================================================

        exit_price = (
            apply_exit_slippage(
                raw_exit_price,
                direction
            )
        )

        # =================================================
        # GROSS PROFIT
        # =================================================

        if direction == "LONG":

            gross_profit = (
                exit_price
                -
                position[
                    "EntryPrice"
                ]
            ) * quantity

        else:

            gross_profit = (
                position[
                    "EntryPrice"
                ]
                -
                exit_price
            ) * quantity

        exit_value = (
            exit_price
            *
            quantity
        )

        # =================================================
        # EXIT TRANSACTION COST
        # =================================================

        exit_cost = (
            exit_value
            *
            TRANSACTION_COST_PERCENTAGE
        )

        entry_cost = (
            position[
                "EntryTransactionCost"
            ]
        )

        # True net trade P/L
        net_profit = (
            gross_profit
            -
            entry_cost
            -
            exit_cost
        )

        # =================================================
        # CASH ACCOUNTING
        #
        # Entry cost was already deducted at entry.
        # Therefore do not deduct it again here.
        # =================================================

        self.cash += (
            position[
                "ReservedCapital"
            ]
            +
            gross_profit
            -
            exit_cost
        )

        self.total_transaction_cost += (
            exit_cost
        )

        exit_slippage_cost = (
            abs(
                exit_price
                -
                raw_exit_price
            )
            *
            quantity
        )

        self.total_slippage_cost += (
            exit_slippage_cost
        )

        trading_date = (
            timestamp.date()
        )

        self.daily_realized_pnl[
            trading_date
        ] += (
            net_profit
        )

        # =================================================
        # SAVE TRADE
        # =================================================

        self.trades.append({

            "Symbol":
                symbol,

            "Direction":
                direction,

            "TradeType":
                position[
                    "TradeType"
                ],

            "EntryTime":
                position[
                    "EntryTime"
                ],

            "ExitTime":
                timestamp,

            "RawEntryPrice":
                position[
                    "RawEntryPrice"
                ],

            "EntryPrice":
                position[
                    "EntryPrice"
                ],

            "ExitPrice":
                exit_price,

            "Quantity":
                quantity,

            "InitialStopLoss":
                position[
                    "InitialStopLoss"
                ],

            "TakeProfit":
                position[
                    "TakeProfit"
                ],

            "GrossProfit":
                gross_profit,

            "EntryCost":
                entry_cost,

            "ExitCost":
                exit_cost,

            "Profit":
                net_profit,

            "Reason":
                reason,

            "Score":
                position[
                    "Score"
                ],

            "Momentum":
                position[
                    "Momentum"
                ],

            "RelativeVolume":
                position[
                    "RelativeVolume"
                ],

            "BreakEvenActivated":
                position[
                    "BreakEvenActivated"
                ],

            "TrailingActivated":
                position[
                    "TrailingActivated"
                ]
        })

        # Save cooldown time
        self.last_exit_time[
            symbol
        ] = timestamp

        # Remove position
        del self.positions[
            symbol
        ]


# =========================================================
# PREPARE MARKET DATA
# =========================================================

def prepare_market_data():

    market_data = {}

    for symbol in SYMBOLS:

        data = download_data(
            symbol
        )

        if data is None:

            continue

        data = add_indicators(
            data
        )

        data = data.dropna(
            subset=[
                "EMA9",
                "EMA21",
                "EMA50",
                "RSI",
                "ATR",
                "VWAP",
                "RelativeVolume",
                "Momentum"
            ]
        )

        market_data[
            symbol
        ] = data

    return market_data


# =========================================================
# RUN BACKTEST
# =========================================================

def run_backtest():

    print(
        "\n======================================"
    )

    print(
        "PORTFOLIO INTRADAY BACKTEST"
    )

    print(
        "======================================"
    )

    market_data = (
        prepare_market_data()
    )

    if not market_data:

        print(
            "No historical data available."
        )

        return

    # =====================================================
    # CREATE MASTER TIMELINE
    # =====================================================

    timestamps = sorted(
        set().union(
            *[
                set(
                    data.index
                )
                for data
                in market_data.values()
            ]
        )
    )

    backtester = (
        PortfolioBacktester(
            INITIAL_BALANCE
        )
    )

    latest_prices = {}

    # =====================================================
    # PROCESS TIMELINE
    # =====================================================

    for timestamp in timestamps:

        current_time = (
            timestamp.strftime(
                "%H:%M"
            )
        )

        trading_date = (
            timestamp.date()
        )

        opportunities = []

        # =================================================
        # PROCESS ALL STOCKS
        # =================================================

        for symbol, data in (
            market_data.items()
        ):

            if (
                timestamp
                not in
                data.index
            ):

                continue

            row = (
                data.loc[
                    timestamp
                ]
            )

            close = float(
                row["Close"]
            )

            high = float(
                row["High"]
            )

            low = float(
                row["Low"]
            )

            latest_prices[
                symbol
            ] = close

            # =============================================
            # MONITOR OPEN POSITION
            # =============================================

            if (
                symbol
                in
                backtester.positions
            ):

                backtester.update_position(
                    symbol,
                    timestamp,
                    high,
                    low,
                    close
                )

            # =============================================
            # SIGNAL
            # =============================================

            signal = (
                calculate_signal(
                    row
                )
            )

            if (
                signal[
                    "Direction"
                ]
                ==
                "NONE"
            ):

                continue

            opportunities.append({

                "Symbol":
                    symbol,

                "Price":
                    close,

                "Signal":
                    signal
            })

        # =================================================
        # END OF DAY SQUARE-OFF
        # =================================================

        if (
            current_time
            >=
            SQUARE_OFF_TIME
        ):

            symbols_to_close = list(
                backtester
                .positions
                .keys()
            )

            for symbol in (
                symbols_to_close
            ):

                if (
                    symbol
                    not in
                    latest_prices
                ):

                    continue

                backtester.close_position(
                    symbol,
                    timestamp,
                    latest_prices[
                        symbol
                    ],
                    "END OF DAY"
                )

        # =================================================
        # EQUITY SNAPSHOT
        # =================================================

        portfolio_value = (
            backtester.portfolio_value(
                latest_prices
            )
        )

        backtester.equity_curve.append({

            "Timestamp":
                timestamp,

            "Equity":
                portfolio_value
        })

        # =================================================
        # ENTRY TIME FILTER
        # =================================================

        if (
            current_time
            <
            MARKET_ENTRY_START
        ):

            continue

        if (
            current_time
            >=
            LAST_ENTRY_TIME
        ):

            continue

        # =================================================
        # DAILY LOSS FILTER
        # =================================================

        if (
            backtester
            .daily_loss_reached(
                trading_date
            )
        ):

            continue

        # =================================================
        # SORT BEST OPPORTUNITIES
        # =================================================

        opportunities.sort(

            key=lambda item: (

                item[
                    "Signal"
                ][
                    "Score"
                ],

                abs(
                    item[
                        "Signal"
                    ][
                        "Momentum"
                    ]
                ),

                item[
                    "Signal"
                ][
                    "RelativeVolume"
                ]
            ),

            reverse=True
        )

        # =================================================
        # EXCEPTIONAL TRADE
        # =================================================

        exceptional_candidates = [

            opportunity

            for opportunity
            in opportunities

            if opportunity[
                "Signal"
            ][
                "Exceptional"
            ]
        ]

        if (
            exceptional_candidates
            and
            backtester
            .exceptional_trades_by_day[
                trading_date
            ]
            <
            MAX_EXCEPTIONAL_TRADES_PER_DAY
        ):

            best = (
                exceptional_candidates[
                    0
                ]
            )

            backtester.open_position(

                symbol=
                    best[
                        "Symbol"
                    ],

                timestamp=
                    timestamp,

                raw_price=
                    best[
                        "Price"
                    ],

                direction=
                    best[
                        "Signal"
                    ][
                        "Direction"
                    ],

                trade_type=
                    "EXCEPTIONAL",

                signal=
                    best[
                        "Signal"
                    ]
            )

        # =================================================
        # NORMAL TRADES
        # =================================================

        for opportunity in (
            opportunities
        ):

            signal = (
                opportunity[
                    "Signal"
                ]
            )

            # Exceptional trade is handled above
            if signal[
                "Exceptional"
            ]:

                continue

            # Strong score required
            if (
                signal[
                    "Score"
                ]
                <
                MIN_NORMAL_SCORE
            ):

                continue

            # Relative volume filter
            if (
                signal[
                    "RelativeVolume"
                ]
                <
                MIN_NORMAL_RELATIVE_VOLUME
            ):

                continue

            # Momentum filter
            if (
                abs(
                    signal[
                        "Momentum"
                    ]
                )
                <
                MIN_NORMAL_MOMENTUM
            ):

                continue

            # Daily normal trade limit
            if (
                backtester
                .normal_trades_by_day[
                    trading_date
                ]
                >=
                MAX_NORMAL_TRADES_PER_DAY
            ):

                break

            backtester.open_position(

                symbol=
                    opportunity[
                        "Symbol"
                    ],

                timestamp=
                    timestamp,

                raw_price=
                    opportunity[
                        "Price"
                    ],

                direction=
                    signal[
                        "Direction"
                    ],

                trade_type=
                    "NORMAL",

                signal=
                    signal
            )

    # =====================================================
    # CLOSE REMAINING POSITIONS
    # =====================================================

    if timestamps:

        final_timestamp = (
            timestamps[
                -1
            ]
        )

        for symbol in list(
            backtester
            .positions
            .keys()
        ):

            if (
                symbol
                in
                latest_prices
            ):

                backtester.close_position(
                    symbol,
                    final_timestamp,
                    latest_prices[
                        symbol
                    ],
                    "BACKTEST END"
                )

    # =====================================================
    # REPORT
    # =====================================================

    display_report(
        backtester
    )

    export_reports(
        backtester
    )


# =========================================================
# PERFORMANCE HELPER
# =========================================================

def calculate_group_statistics(
    trades
):

    if not trades:

        return {
            "Trades": 0,
            "Wins": 0,
            "Losses": 0,
            "WinRate": 0,
            "NetProfit": 0,
            "AverageProfit": 0
        }

    wins = [
        trade
        for trade
        in trades
        if trade["Profit"] > 0
    ]

    losses = [
        trade
        for trade
        in trades
        if trade["Profit"] <= 0
    ]

    net_profit = sum(
        trade["Profit"]
        for trade
        in trades
    )

    return {

        "Trades":
            len(trades),

        "Wins":
            len(wins),

        "Losses":
            len(losses),

        "WinRate":
            (
                len(wins)
                /
                len(trades)
                *
                100
            ),

        "NetProfit":
            net_profit,

        "AverageProfit":
            (
                net_profit
                /
                len(trades)
            )
    }


# =========================================================
# DISPLAY GROUP
# =========================================================

def display_group(
    title,
    trades
):

    stats = (
        calculate_group_statistics(
            trades
        )
    )

    print(
        f"\n{title}"
    )

    print(
        f"Trades: "
        f"{stats['Trades']}"
    )

    print(
        f"Win Rate: "
        f"{stats['WinRate']:.2f}%"
    )

    print(
        f"Net P/L: "
        f"₹{stats['NetProfit']:.2f}"
    )

    print(
        f"Average P/L: "
        f"₹{stats['AverageProfit']:.2f}"
    )


# =========================================================
# DISPLAY REPORT
# =========================================================

def display_report(
    backtester
):

    trades = (
        backtester.trades
    )

    final_balance = (
        backtester.cash
    )

    net_profit = (
        final_balance
        -
        INITIAL_BALANCE
    )

    return_percentage = (
        net_profit
        /
        INITIAL_BALANCE
        *
        100
    )

    winning_trades = [

        trade

        for trade
        in trades

        if trade[
            "Profit"
        ] > 0
    ]

    losing_trades = [

        trade

        for trade
        in trades

        if trade[
            "Profit"
        ] <= 0
    ]

    completed_trades = (
        len(trades)
    )

    win_rate = (
        (
            len(
                winning_trades
            )
            /
            completed_trades
            *
            100
        )
        if completed_trades
        else 0
    )

    average_win = (
        np.mean(
            [
                trade[
                    "Profit"
                ]
                for trade
                in winning_trades
            ]
        )
        if winning_trades
        else 0
    )

    average_loss = (
        np.mean(
            [
                trade[
                    "Profit"
                ]
                for trade
                in losing_trades
            ]
        )
        if losing_trades
        else 0
    )

    gross_profit = sum(
        trade["Profit"]
        for trade
        in winning_trades
    )

    gross_loss = abs(
        sum(
            trade["Profit"]
            for trade
            in losing_trades
        )
    )

    profit_factor = (
        gross_profit
        /
        gross_loss
        if gross_loss > 0
        else float("inf")
    )

    # =====================================================
    # MAXIMUM DRAWDOWN
    # =====================================================

    maximum_drawdown = 0

    if backtester.equity_curve:

        equity = np.array(
            [
                point["Equity"]
                for point
                in backtester.equity_curve
            ]
        )

        running_peak = (
            np.maximum.accumulate(
                equity
            )
        )

        valid_peak = (
            running_peak > 0
        )

        drawdown = np.zeros_like(
            equity,
            dtype=float
        )

        drawdown[
            valid_peak
        ] = (
            (
                equity[
                    valid_peak
                ]
                -
                running_peak[
                    valid_peak
                ]
            )
            /
            running_peak[
                valid_peak
            ]
        )

        maximum_drawdown = (
            abs(
                np.min(
                    drawdown
                )
            )
            *
            100
        )

    # =====================================================
    # TRADE GROUPS
    # =====================================================

    long_trades = [
        trade
        for trade
        in trades
        if trade["Direction"] == "LONG"
    ]

    short_trades = [
        trade
        for trade
        in trades
        if trade["Direction"] == "SHORT"
    ]

    normal_trades = [
        trade
        for trade
        in trades
        if trade["TradeType"] == "NORMAL"
    ]

    exceptional_trades = [
        trade
        for trade
        in trades
        if trade["TradeType"] == "EXCEPTIONAL"
    ]

    # =====================================================
    # EXIT TYPES
    # =====================================================

    stop_exits = [
        trade
        for trade
        in trades
        if trade["Reason"] == "STOP LOSS"
    ]

    target_exits = [
        trade
        for trade
        in trades
        if trade["Reason"] == "TAKE PROFIT"
    ]

    eod_exits = [
        trade
        for trade
        in trades
        if trade["Reason"] == "END OF DAY"
    ]

    # =====================================================
    # BEST / WORST
    # =====================================================

    best_trade = (
        max(
            trades,
            key=lambda trade:
                trade["Profit"]
        )
        if trades
        else None
    )

    worst_trade = (
        min(
            trades,
            key=lambda trade:
                trade["Profit"]
        )
        if trades
        else None
    )

    # =====================================================
    # MAIN REPORT
    # =====================================================

    print(
        "\n======================================"
    )

    print(
        "PORTFOLIO BACKTEST RESULT"
    )

    print(
        "======================================"
    )

    print(
        f"Initial Balance: "
        f"₹{INITIAL_BALANCE:.2f}"
    )

    print(
        f"Final Balance: "
        f"₹{final_balance:.2f}"
    )

    print(
        f"Net Profit / Loss: "
        f"₹{net_profit:.2f}"
    )

    print(
        f"Return: "
        f"{return_percentage:.2f}%"
    )

    print(
        "\n---------- TRADE STATISTICS ----------"
    )

    print(
        f"Completed Trades: "
        f"{completed_trades}"
    )

    print(
        f"Winning Trades: "
        f"{len(winning_trades)}"
    )

    print(
        f"Losing Trades: "
        f"{len(losing_trades)}"
    )

    print(
        f"Win Rate: "
        f"{win_rate:.2f}%"
    )

    print(
        "\n---------- PERFORMANCE ----------"
    )

    print(
        f"Average Win: "
        f"₹{average_win:.2f}"
    )

    print(
        f"Average Loss: "
        f"₹{average_loss:.2f}"
    )

    print(
        f"Profit Factor: "
        f"{profit_factor:.2f}"
    )

    print(
        f"Maximum Drawdown: "
        f"{maximum_drawdown:.2f}%"
    )

    print(
        "\n---------- COSTS ----------"
    )

    print(
        f"Transaction Costs: "
        f"₹{backtester.total_transaction_cost:.2f}"
    )

    print(
        f"Estimated Slippage: "
        f"₹{backtester.total_slippage_cost:.2f}"
    )

    # =====================================================
    # LONG / SHORT
    # =====================================================

    display_group(
        "---------- LONG PERFORMANCE ----------",
        long_trades
    )

    display_group(
        "---------- SHORT PERFORMANCE ----------",
        short_trades
    )

    # =====================================================
    # NORMAL / EXCEPTIONAL
    # =====================================================

    display_group(
        "---------- NORMAL PERFORMANCE ----------",
        normal_trades
    )

    display_group(
        "---------- EXCEPTIONAL PERFORMANCE ----------",
        exceptional_trades
    )

    # =====================================================
    # EXIT STATISTICS
    # =====================================================

    print(
        "\n---------- EXIT STATISTICS ----------"
    )

    print(
        f"Stop Loss Exits: "
        f"{len(stop_exits)}"
    )

    print(
        f"Take Profit Exits: "
        f"{len(target_exits)}"
    )

    print(
        f"End Of Day Exits: "
        f"{len(eod_exits)}"
    )

    # =====================================================
    # BEST TRADE
    # =====================================================

    if best_trade:

        print(
            "\n---------- BEST TRADE ----------"
        )

        print(
            f"{best_trade['Symbol']} | "
            f"{best_trade['Direction']} | "
            f"{best_trade['TradeType']} | "
            f"P/L: ₹{best_trade['Profit']:.2f}"
        )

    # =====================================================
    # WORST TRADE
    # =====================================================

    if worst_trade:

        print(
            "\n---------- WORST TRADE ----------"
        )

        print(
            f"{worst_trade['Symbol']} | "
            f"{worst_trade['Direction']} | "
            f"{worst_trade['TradeType']} | "
            f"P/L: ₹{worst_trade['Profit']:.2f}"
        )


# =========================================================
# EXPORT REPORTS
# =========================================================

def export_reports(
    backtester
):

    if not backtester.trades:

        print(
            "\nNo trades available "
            "for CSV export."
        )

        return

    # =====================================================
    # COMPLETE TRADE REPORT
    # =====================================================

    trades_df = pd.DataFrame(
        backtester.trades
    )

    trades_df.to_csv(
        TRADE_REPORT_FILE,
        index=False
    )

    # =====================================================
    # DAILY REPORT
    # =====================================================

    trades_df[
        "TradingDate"
    ] = pd.to_datetime(
        trades_df[
            "ExitTime"
        ]
    ).dt.date

    daily_report = (
        trades_df
        .groupby(
            "TradingDate"
        )
        .agg(
            Trades=(
                "Profit",
                "count"
            ),
            NetProfit=(
                "Profit",
                "sum"
            ),
            AverageProfit=(
                "Profit",
                "mean"
            )
        )
        .reset_index()
    )

    daily_report.to_csv(
        DAILY_REPORT_FILE,
        index=False
    )

    # =====================================================
    # SYMBOL PERFORMANCE
    # =====================================================

    symbol_report = (
        trades_df
        .groupby(
            "Symbol"
        )
        .agg(
            Trades=(
                "Profit",
                "count"
            ),
            NetProfit=(
                "Profit",
                "sum"
            ),
            AverageProfit=(
                "Profit",
                "mean"
            ),
            BestTrade=(
                "Profit",
                "max"
            ),
            WorstTrade=(
                "Profit",
                "min"
            )
        )
        .reset_index()
    )

    symbol_report[
        "WinningTrades"
    ] = (
        trades_df[
            trades_df[
                "Profit"
            ] > 0
        ]
        .groupby(
            "Symbol"
        )
        .size()
        .reindex(
            symbol_report[
                "Symbol"
            ],
            fill_value=0
        )
        .values
    )

    symbol_report[
        "WinRate"
    ] = (
        symbol_report[
            "WinningTrades"
        ]
        /
        symbol_report[
            "Trades"
        ]
        *
        100
    )

    symbol_report = (
        symbol_report
        .sort_values(
            "NetProfit",
            ascending=False
        )
    )

    symbol_report.to_csv(
        SYMBOL_REPORT_FILE,
        index=False
    )

    print(
        "\n======================================"
    )

    print(
        "REPORTS EXPORTED"
    )

    print(
        "======================================"
    )

    print(
        f"Trades: "
        f"{TRADE_REPORT_FILE}"
    )

    print(
        f"Daily: "
        f"{DAILY_REPORT_FILE}"
    )

    print(
        f"Symbols: "
        f"{SYMBOL_REPORT_FILE}"
    )


# =========================================================
# START
# =========================================================

if __name__ == "__main__":

    run_backtest()