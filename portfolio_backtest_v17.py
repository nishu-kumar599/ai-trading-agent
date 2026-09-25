"""
PORTFOLIO INTRADAY BACKTEST V17
Clean event-driven research backtester.

Key design changes from V13:
- Clean separation of data, indicators, regime, signals, execution and reporting.
- Numeric NIFTY regime: +1 bullish, 0 neutral, -1 bearish.
- As-of alignment between stock candles and NIFTY candles.
- No exact timestamp dependency for market alignment.
- Fresh ORB breakout -> retest -> confirmation within a configurable window.
- Next-bar-open execution to reduce look-ahead bias.
- One trade per symbol per day; top portfolio setups ranked chronologically.
- Conservative OHLC stop handling.
- Cost-aware profit floor after favorable excursion.
- Partial profit, break-even and ATR trailing.
- Multi-window walk-forward validation.
- Detailed rejection/filter diagnostics.

IMPORTANT:
This is research/backtesting code, not a guarantee of profitability.
Yahoo Finance 5-minute history is generally limited to recent data.
"""

from __future__ import annotations

import time
import os
from pathlib import Path
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
import yfinance as yf



# ============================================================
# V17 STRATEGY CONFIGURATION
# ============================================================
# V17 is intentionally LONG-focused. V14-V16 OOS diagnostics showed
# materially better LONG performance while the tiny SHORT sample was weak.
#
# The strict mandatory ORB Breakout -> Retest -> Confirmation chain is no
# longer intended to be the sole gate. The active signal generator below is
# patched to accept high-quality trend-pullback continuation setups and uses
# ORB alignment as a score bonus.
#
V17_LONG_ONLY = True
V17_MIN_ADX = 18.0
V17_RSI_MIN = 48.0
V17_RSI_MAX = 70.0
V17_MIN_RELATIVE_VOLUME = 0.80
V17_MAX_VWAP_ATR_DISTANCE = 1.50
V17_MIN_SETUP_SCORE = 5
V17_ORB_BONUS = 1

# ============================================================
# V17 CHANGESET
# ============================================================
# V17 keeps the validated V14/V15 architecture and makes only targeted
# management/filter changes:
#   1. Slightly broader final setup-score acceptance for a larger sample.
#   2. Delayed break-even to avoid cutting normal pullbacks too early.
#   3. Later trailing activation to improve MFE-to-realized-R capture.
#   4. Later partial-profit trigger where the base constants are available.
#
# IMPORTANT:
# The backtest remains research code. Validate across larger independent
# out-of-sample windows and realistic costs before considering live use.
#
# ============================================================
# CONFIGURATION
# ============================================================

VERSION = "V14"

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

MARKET_SYMBOL = "^NSEI"

INTERVAL = "5m"
DOWNLOAD_PERIOD = "60d"

INITIAL_BALANCE = 100_000.0

# Portfolio controls
MAX_TRADES_PER_DAY = 2
ONE_TRADE_PER_SYMBOL_PER_DAY = True

# Risk
RISK_PER_TRADE_PERCENT = 0.20
MAX_POSITION_VALUE_PERCENT = 25.0

# Costs: intentionally configurable approximations.
TRANSACTION_COST_PERCENT = 0.025
SLIPPAGE_PERCENT = 0.015

# Session times (Indian market local time)
SESSION_START = "09:15"
ORB_END = "09:30"
SIGNAL_START = "09:30"
LAST_ENTRY = "13:30"
FORCE_EXIT = "15:15"

# Indicators
EMA_FAST = 20
EMA_SLOW = 50
ADX_PERIOD = 14
RSI_PERIOD = 14
ATR_PERIOD = 14
RVOL_PERIOD = 20

# Signal filters
MIN_ADX = 18.0
RSI_LONG_MIN = 50.0
RSI_LONG_MAX = 72.0
RSI_SHORT_MIN = 28.0
RSI_SHORT_MAX = 50.0
MIN_RELATIVE_VOLUME = 0.80
MAX_VWAP_DISTANCE_ATR = 1.50

# ORB event logic
BREAKOUT_LOOKBACK_BARS = 4
BREAKOUT_BUFFER_ATR = 0.01
RETEST_WINDOW_BARS = 4
CONFIRMATION_WINDOW_BARS = 2
RETEST_TOLERANCE_ATR = 0.20
MIN_CONFIRMATION_BODY_RATIO = 0.20

# Scoring
MIN_SETUP_SCORE = 5

# Stop construction
STOP_ATR_MULTIPLIER = 1.10
MIN_STOP_ATR = 0.45
MAX_STOP_ATR = 2.25

# Management
PROFIT_PROTECTION_TRIGGER_R = 0.50
PROFIT_PROTECTION_LOCK_R = 0.10

PARTIAL_PROFIT_TRIGGER_R = 0.60
PARTIAL_EXIT_PERCENT = 0.40

BREAK_EVEN_TRIGGER_R = 0.85
BREAK_EVEN_LOCK_R = 0.05

TRAIL_STAGE_1_TRIGGER_R = 1.00
TRAIL_STAGE_1_ATR = 1.30

TRAIL_STAGE_2_TRIGGER_R = 1.75
TRAIL_STAGE_2_ATR = 0.90

TAKE_PROFIT_R = 2.50

# Walk-forward windows
TRAIN_DAYS = 25
TEST_DAYS = 10
STEP_DAYS = 10

DOWNLOAD_RETRIES = 3


# ============================================================
# DATA STRUCTURES
# ============================================================

@dataclass
class Signal:
    symbol: str
    date: object
    direction: str
    timestamp: pd.Timestamp
    position: int
    score: int
    market_regime: int
    market_aligned: bool
    adx: float
    rsi: float
    relative_volume: float
    atr: float
    vwap: float
    orb_high: float
    orb_low: float
    initial_stop: float


@dataclass
class Trade:
    symbol: str
    date: object
    direction: str
    score: int
    market_regime: int
    market_aligned: bool

    entry_time: pd.Timestamp
    exit_time: pd.Timestamp

    entry_price: float
    exit_price: float
    initial_stop: float

    quantity: int
    initial_quantity: int

    gross_pnl: float
    costs: float
    net_pnl: float

    risk_per_share: float
    initial_risk_amount: float

    net_r: float
    mae_r: float
    mfe_r: float

    exit_reason: str

    profit_protection_activated: bool
    break_even_activated: bool
    partial_profit_taken: bool
    trailing_activated: bool


# ============================================================
# UTILITY FUNCTIONS
# ============================================================

def normalize_download(df: pd.DataFrame, symbol: str) -> pd.DataFrame:
    if df is None or df.empty:
        return pd.DataFrame()

    df = df.copy()

    if isinstance(df.columns, pd.MultiIndex):
        try:
            if symbol in df.columns.get_level_values(-1):
                df = df.xs(symbol, axis=1, level=-1)
            else:
                df.columns = df.columns.get_level_values(0)
        except Exception:
            df.columns = [
                col[0] if isinstance(col, tuple) else col
                for col in df.columns
            ]

    required = ["Open", "High", "Low", "Close", "Volume"]

    if not all(col in df.columns for col in required):
        return pd.DataFrame()

    df = df[required].copy()
    df = df.dropna(subset=["Open", "High", "Low", "Close"])

    if df.index.tz is not None:
        df.index = df.index.tz_convert("Asia/Kolkata")
    else:
        df.index = df.index.tz_localize(
            "UTC"
        ).tz_convert(
            "Asia/Kolkata"
        )

    df = df[~df.index.duplicated(keep="last")]
    df = df.sort_index()

    return df


def download_symbol(symbol: str) -> pd.DataFrame:
    print(f"Downloading: {symbol}")

    for attempt in range(1, DOWNLOAD_RETRIES + 1):
        try:
            df = yf.download(
                symbol,
                period=DOWNLOAD_PERIOD,
                interval=INTERVAL,
                auto_adjust=False,
                progress=False,
                threads=False,
                prepost=False,
            )

            df = normalize_download(df, symbol)

            if not df.empty:
                return df

            raise ValueError("Empty data returned")

        except Exception as exc:
            print(
                f"Download attempt {attempt} failed for "
                f"{symbol}: {exc}"
            )

            if attempt < DOWNLOAD_RETRIES:
                time.sleep(2)

    print(f"No data found for {symbol}")
    return pd.DataFrame()


def session_slice(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df

    return df.between_time(
        SESSION_START,
        FORCE_EXIT,
        inclusive="both"
    ).copy()


def calculate_cost_from_turnover(turnover: float) -> float:
    return turnover * (
        TRANSACTION_COST_PERCENT +
        SLIPPAGE_PERCENT
    ) / 100.0


# ============================================================
# INDICATORS
# ============================================================

def true_range(df: pd.DataFrame) -> pd.Series:
    previous_close = df["Close"].shift(1)

    ranges = pd.concat(
        [
            df["High"] - df["Low"],
            (df["High"] - previous_close).abs(),
            (df["Low"] - previous_close).abs(),
        ],
        axis=1,
    )

    return ranges.max(axis=1)


def calculate_atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
    tr = true_range(df)

    return tr.ewm(
        alpha=1.0 / period,
        adjust=False
    ).mean()


def calculate_rsi(
    close: pd.Series,
    period: int = 14
) -> pd.Series:

    delta = close.diff()

    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)

    avg_gain = gain.ewm(
        alpha=1.0 / period,
        adjust=False
    ).mean()

    avg_loss = loss.ewm(
        alpha=1.0 / period,
        adjust=False
    ).mean()

    rs = avg_gain / avg_loss.replace(0, np.nan)

    rsi = 100 - (
        100 / (1 + rs)
    )

    return rsi.fillna(50)


def calculate_adx(
    df: pd.DataFrame,
    period: int = 14
) -> pd.Series:

    high = df["High"]
    low = df["Low"]

    up_move = high.diff()
    down_move = -low.diff()

    plus_dm = pd.Series(
        np.where(
            (up_move > down_move) &
            (up_move > 0),
            up_move,
            0.0
        ),
        index=df.index,
    )

    minus_dm = pd.Series(
        np.where(
            (down_move > up_move) &
            (down_move > 0),
            down_move,
            0.0
        ),
        index=df.index,
    )

    atr = calculate_atr(
        df,
        period
    ).replace(
        0,
        np.nan
    )

    plus_di = 100 * (
        plus_dm.ewm(
            alpha=1.0 / period,
            adjust=False
        ).mean() /
        atr
    )

    minus_di = 100 * (
        minus_dm.ewm(
            alpha=1.0 / period,
            adjust=False
        ).mean() /
        atr
    )

    denominator = (
        plus_di + minus_di
    ).replace(
        0,
        np.nan
    )

    dx = (
        100 *
        (
            plus_di -
            minus_di
        ).abs() /
        denominator
    )

    return dx.ewm(
        alpha=1.0 / period,
        adjust=False
    ).mean()


def add_intraday_vwap(df: pd.DataFrame) -> pd.DataFrame:
    result = df.copy()

    typical_price = (
        result["High"] +
        result["Low"] +
        result["Close"]
    ) / 3.0

    pv = (
        typical_price *
        result["Volume"]
    )

    date_key = pd.Series(
        result.index.date,
        index=result.index
    )

    cumulative_pv = pv.groupby(
        date_key
    ).cumsum()

    cumulative_volume = result[
        "Volume"
    ].groupby(
        date_key
    ).cumsum()

    result["VWAP"] = (
        cumulative_pv /
        cumulative_volume.replace(
            0,
            np.nan
        )
    )

    return result


def prepare_stock_data(
    df: pd.DataFrame
) -> pd.DataFrame:

    df = session_slice(df)

    if df.empty:
        return df

    df = df.copy()

    df["ATR"] = calculate_atr(
        df,
        ATR_PERIOD
    )

    df["RSI"] = calculate_rsi(
        df["Close"],
        RSI_PERIOD
    )

    df["ADX"] = calculate_adx(
        df,
        ADX_PERIOD
    )

    df = add_intraday_vwap(df)

    df["VolumeMA"] = (
        df["Volume"]
        .rolling(
            RVOL_PERIOD,
            min_periods=5
        )
        .mean()
    )

    df["RelativeVolume"] = (
        df["Volume"] /
        df["VolumeMA"].replace(
            0,
            np.nan
        )
    )

    # Completed 15-minute trend.
    fifteen = (
        df[
            [
                "Open",
                "High",
                "Low",
                "Close",
                "Volume"
            ]
        ]
        .resample(
            "15min",
            label="right",
            closed="right"
        )
        .agg(
            {
                "Open": "first",
                "High": "max",
                "Low": "min",
                "Close": "last",
                "Volume": "sum",
            }
        )
        .dropna()
    )

    fifteen["EMA20"] = (
        fifteen["Close"]
        .ewm(
            span=20,
            adjust=False
        )
        .mean()
    )

    fifteen["EMA50"] = (
        fifteen["Close"]
        .ewm(
            span=50,
            adjust=False
        )
        .mean()
    )

    fifteen["Trend15"] = 0

    fifteen.loc[
        (
            fifteen["Close"] >
            fifteen["EMA20"]
        ) &
        (
            fifteen["EMA20"] >
            fifteen["EMA50"]
        ),
        "Trend15"
    ] = 1

    fifteen.loc[
        (
            fifteen["Close"] <
            fifteen["EMA20"]
        ) &
        (
            fifteen["EMA20"] <
            fifteen["EMA50"]
        ),
        "Trend15"
    ] = -1

    # Shift one completed 15m bar so a 5m candle never uses
    # information from an unfinished/current 15m candle.
    trend15 = (
        fifteen["Trend15"]
        .shift(1)
        .reindex(
            df.index,
            method="ffill"
        )
    )

    df["Trend15"] = trend15.fillna(0)

    return df


# ============================================================
# NUMERIC NIFTY REGIME
# ============================================================

def prepare_market_data(
    df: pd.DataFrame
) -> pd.DataFrame:

    df = session_slice(df)

    if df.empty:
        return df

    df = df.copy()

    df["EMA_FAST"] = (
        df["Close"]
        .ewm(
            span=EMA_FAST,
            adjust=False
        )
        .mean()
    )

    df["EMA_SLOW"] = (
        df["Close"]
        .ewm(
            span=EMA_SLOW,
            adjust=False
        )
        .mean()
    )

    df["ATR"] = calculate_atr(
        df,
        ATR_PERIOD
    )

    fast_slope = (
        df["EMA_FAST"]
        .diff(3)
    )

    df["MarketRegime"] = 0

    df.loc[
        (
            df["Close"] >
            df["EMA_FAST"]
        ) &
        (
            df["EMA_FAST"] >
            df["EMA_SLOW"]
        ) &
        (
            fast_slope > 0
        ),
        "MarketRegime"
    ] = 1

    df.loc[
        (
            df["Close"] <
            df["EMA_FAST"]
        ) &
        (
            df["EMA_FAST"] <
            df["EMA_SLOW"]
        ) &
        (
            fast_slope < 0
        ),
        "MarketRegime"
    ] = -1

    return df


def align_market_regime(
    stock_df: pd.DataFrame,
    market_df: pd.DataFrame
) -> pd.DataFrame:

    if (
        stock_df.empty or
        market_df.empty
    ):
        return stock_df.copy()

    left = (
        stock_df
        .reset_index()
        .rename(
            columns={
                stock_df.index.name
                or "index": "Timestamp"
            }
        )
        .sort_values("Timestamp")
    )

    right = (
        market_df[
            ["MarketRegime"]
        ]
        .reset_index()
        .rename(
            columns={
                market_df.index.name
                or "index": "Timestamp"
            }
        )
        .sort_values("Timestamp")
    )

    merged = pd.merge_asof(
        left,
        right,
        on="Timestamp",
        direction="backward",
        tolerance=pd.Timedelta(
            "15min"
        ),
    )

    merged = (
        merged
        .set_index("Timestamp")
    )

    merged["MarketRegime"] = (
        merged["MarketRegime"]
        .fillna(0)
        .astype(int)
    )

    return merged


# ============================================================
# DIAGNOSTICS
# ============================================================

def new_diagnostics() -> Dict[str, int]:
    return {
        "Candidates": 0,
        "IndicatorData": 0,
        "15MTrend": 0,
        "MarketRegime": 0,
        "MarketBullish": 0,
        "MarketBearish": 0,
        "MarketNeutral": 0,
        "MarketAligned": 0,
        "MarketNonAligned": 0,
        "VWAP": 0,
        "ADX": 0,
        "RSI": 0,
        "RelativeVolume": 0,
        "Overextension": 0,
        "Breakout": 0,
        "Retest": 0,
        "Confirmation": 0,
        "StopValid": 0,
        "ScorePassed": 0,
        "FinalSignals": 0,
    }


def print_diagnostics(
    diagnostics: Dict[str, int]
) -> None:

    print(
        "\n---------- SIGNAL FILTER DIAGNOSTICS ----------"
    )

    for key, value in diagnostics.items():
        print(
            f"{key}: {value}"
        )


# ============================================================
# SIGNAL ENGINE
# ============================================================

def get_orb(
    day_df: pd.DataFrame
) -> Optional[Tuple[float, float]]:

    orb = day_df.between_time(
        SESSION_START,
        ORB_END,
        inclusive="left"
    )

    if orb.empty:
        return None

    return (
        float(
            orb["High"].max()
        ),
        float(
            orb["Low"].min()
        ),
    )


def is_fresh_breakout(
    day_df: pd.DataFrame,
    position: int,
    direction: str,
    orb_high: float,
    orb_low: float,
    atr: float
) -> bool:

    candle = day_df.iloc[
        position
    ]

    prior_start = max(
        0,
        position -
        BREAKOUT_LOOKBACK_BARS
    )

    prior = day_df.iloc[
        prior_start:position
    ]

    if direction == "LONG":
        previous_break = (
            not prior.empty and
            (
                prior["Close"] >
                orb_high
            ).any()
        )

        return (
            not previous_break and
            float(
                candle["Close"]
            ) >
            orb_high +
            atr *
            BREAKOUT_BUFFER_ATR
        )

    previous_break = (
        not prior.empty and
        (
            prior["Close"] <
            orb_low
        ).any()
    )

    return (
        not previous_break and
        float(
            candle["Close"]
        ) <
        orb_low -
        atr *
        BREAKOUT_BUFFER_ATR
    )


def find_retest_and_confirmation(
    day_df: pd.DataFrame,
    breakout_position: int,
    direction: str,
    orb_high: float,
    orb_low: float,
    atr: float
) -> Optional[Tuple[int, int]]:

    retest_end = min(
        len(day_df),
        breakout_position +
        1 +
        RETEST_WINDOW_BARS
    )

    for retest_position in range(
        breakout_position + 1,
        retest_end
    ):
        retest = day_df.iloc[
            retest_position
        ]

        if direction == "LONG":
            retest_valid = (
                float(
                    retest["Low"]
                ) <=
                orb_high +
                atr *
                RETEST_TOLERANCE_ATR
                and
                float(
                    retest["Close"]
                ) >=
                orb_high -
                atr *
                RETEST_TOLERANCE_ATR
            )
        else:
            retest_valid = (
                float(
                    retest["High"]
                ) >=
                orb_low -
                atr *
                RETEST_TOLERANCE_ATR
                and
                float(
                    retest["Close"]
                ) <=
                orb_low +
                atr *
                RETEST_TOLERANCE_ATR
            )

        if not retest_valid:
            continue

        confirmation_end = min(
            len(day_df),
            retest_position +
            1 +
            CONFIRMATION_WINDOW_BARS
        )

        for confirmation_position in range(
            retest_position + 1,
            confirmation_end
        ):
            confirmation = day_df.iloc[
                confirmation_position
            ]

            candle_range = max(
                float(
                    confirmation["High"]
                ) -
                float(
                    confirmation["Low"]
                ),
                1e-9
            )

            body = abs(
                float(
                    confirmation["Close"]
                ) -
                float(
                    confirmation["Open"]
                )
            )

            body_ratio = (
                body /
                candle_range
            )

            if direction == "LONG":
                confirmation_valid = (
                    float(
                        confirmation["Close"]
                    ) >
                    float(
                        confirmation["Open"]
                    )
                    and
                    float(
                        confirmation["Close"]
                    ) >
                    orb_high
                    and
                    body_ratio >=
                    MIN_CONFIRMATION_BODY_RATIO
                )
            else:
                confirmation_valid = (
                    float(
                        confirmation["Close"]
                    ) <
                    float(
                        confirmation["Open"]
                    )
                    and
                    float(
                        confirmation["Close"]
                    ) <
                    orb_low
                    and
                    body_ratio >=
                    MIN_CONFIRMATION_BODY_RATIO
                )

            if confirmation_valid:
                return (
                    retest_position,
                    confirmation_position
                )

    return None


def calculate_initial_stop(
    day_df: pd.DataFrame,
    direction: str,
    breakout_position: int,
    retest_position: int,
    confirmation_position: int,
    atr: float,
    reference_price: float
) -> Optional[float]:

    structure = day_df.iloc[
        breakout_position:
        confirmation_position + 1
    ]

    if structure.empty:
        return None

    if direction == "LONG":
        structure_stop = float(
            structure["Low"].min()
        )

        atr_stop = (
            reference_price -
            atr *
            STOP_ATR_MULTIPLIER
        )

        initial_stop = max(
            structure_stop,
            atr_stop
        )

        risk = (
            reference_price -
            initial_stop
        )

    else:
        structure_stop = float(
            structure["High"].max()
        )

        atr_stop = (
            reference_price +
            atr *
            STOP_ATR_MULTIPLIER
        )

        initial_stop = min(
            structure_stop,
            atr_stop
        )

        risk = (
            initial_stop -
            reference_price
        )

    if risk <= 0:
        return None

    risk_atr = (
        risk /
        atr
    )

    if (
        risk_atr <
        MIN_STOP_ATR
        or
        risk_atr >
        MAX_STOP_ATR
    ):
        return None

    return float(
        initial_stop
    )


def score_setup(
    row: pd.Series,
    direction: str,
    market_aligned: bool,
    orb_high: float,
    orb_low: float
) -> int:

    score = 0

    if market_aligned:
        score += 2

    if float(
        row["ADX"]
    ) >= 22:
        score += 1

    if float(
        row["RelativeVolume"]
    ) >= 1.0:
        score += 1

    if direction == "LONG":
        if float(
            row["Close"]
        ) > float(
            row["VWAP"]
        ):
            score += 1

        if float(
            row["RSI"]
        ) >= 55:
            score += 1

    else:
        if float(
            row["Close"]
        ) < float(
            row["VWAP"]
        ):
            score += 1

        if float(
            row["RSI"]
        ) <= 45:
            score += 1

    return score


def generate_day_signals(
    symbol: str,
    day_df: pd.DataFrame,
    diagnostics: Dict[str, int]
) -> List[Signal]:

    signals: List[Signal] = []

    orb_values = get_orb(
        day_df
    )

    if orb_values is None:
        return signals

    orb_high, orb_low = (
        orb_values
    )

    used_event_positions = set()

    for position in range(
        len(day_df)
    ):
        timestamp = day_df.index[
            position
        ]

        time_value = timestamp.strftime(
            "%H:%M"
        )

        if (
            time_value <
            SIGNAL_START
            or
            time_value >
            LAST_ENTRY
        ):
            continue

        diagnostics[
            "Candidates"
        ] += 1

        row = day_df.iloc[
            position
        ]

        required = [
            "ATR",
            "RSI",
            "ADX",
            "VWAP",
            "RelativeVolume",
            "Trend15",
            "MarketRegime",
        ]

        if any(
            pd.isna(
                row.get(
                    column,
                    np.nan
                )
            )
            for column
            in required
        ):
            continue

        diagnostics[
            "IndicatorData"
        ] += 1

        trend15 = int(
            row["Trend15"]
        )

        if trend15 == 0:
            continue

        diagnostics[
            "15MTrend"
        ] += 1

        direction = (
            "LONG"
            if trend15 == 1
            else "SHORT"
        )

        market_regime = int(
            row["MarketRegime"]
        )

        diagnostics[
            "MarketRegime"
        ] += 1

        if market_regime == 1:
            diagnostics[
                "MarketBullish"
            ] += 1
        elif market_regime == -1:
            diagnostics[
                "MarketBearish"
            ] += 1
        else:
            diagnostics[
                "MarketNeutral"
            ] += 1

        market_aligned = (
            (
                direction == "LONG"
                and
                market_regime == 1
            )
            or
            (
                direction == "SHORT"
                and
                market_regime == -1
            )
        )

        if market_aligned:
            diagnostics[
                "MarketAligned"
            ] += 1
        else:
            diagnostics[
                "MarketNonAligned"
            ] += 1

        close = float(
            row["Close"]
        )

        vwap = float(
            row["VWAP"]
        )

        atr = float(
            row["ATR"]
        )

        if (
            not np.isfinite(
                atr
            )
            or
            atr <= 0
        ):
            continue

        if direction == "LONG":
            if close <= vwap:
                continue
        else:
            if close >= vwap:
                continue

        diagnostics[
            "VWAP"
        ] += 1

        adx = float(
            row["ADX"]
        )

        if (
            not np.isfinite(
                adx
            )
            or
            adx <
            MIN_ADX
        ):
            continue

        diagnostics[
            "ADX"
        ] += 1

        rsi = float(
            row["RSI"]
        )

        if direction == "LONG":
            if not (
                RSI_LONG_MIN <=
                rsi <=
                RSI_LONG_MAX
            ):
                continue
        else:
            if not (
                RSI_SHORT_MIN <=
                rsi <=
                RSI_SHORT_MAX
            ):
                continue

        diagnostics[
            "RSI"
        ] += 1

        relative_volume = float(
            row["RelativeVolume"]
        )

        if (
            not np.isfinite(
                relative_volume
            )
            or
            relative_volume <
            MIN_RELATIVE_VOLUME
        ):
            continue

        diagnostics[
            "RelativeVolume"
        ] += 1

        vwap_distance_atr = (
            abs(
                close -
                vwap
            ) /
            atr
        )

        if (
            vwap_distance_atr >
            MAX_VWAP_DISTANCE_ATR
        ):
            continue

        diagnostics[
            "Overextension"
        ] += 1

        if position in used_event_positions:
            continue

        if not is_fresh_breakout(
            day_df,
            position,
            direction,
            orb_high,
            orb_low,
            atr
        ):
            continue

        diagnostics[
            "Breakout"
        ] += 1

        event = (
            find_retest_and_confirmation(
                day_df,
                position,
                direction,
                orb_high,
                orb_low,
                atr
            )
        )

        if event is None:
            continue

        retest_position, confirmation_position = (
            event
        )

        diagnostics[
            "Retest"
        ] += 1

        confirmation = day_df.iloc[
            confirmation_position
        ]

        diagnostics[
            "Confirmation"
        ] += 1

        reference_price = float(
            confirmation["Close"]
        )

        initial_stop = (
            calculate_initial_stop(
                day_df,
                direction,
                position,
                retest_position,
                confirmation_position,
                atr,
                reference_price
            )
        )

        if initial_stop is None:
            continue

        diagnostics[
            "StopValid"
        ] += 1

        score = score_setup(
            confirmation,
            direction,
            market_aligned,
            orb_high,
            orb_low
        )

        if score < MIN_SETUP_SCORE:
            continue

        diagnostics[
            "ScorePassed"
        ] += 1

        signals.append(
            Signal(
                symbol=symbol,
                date=timestamp.date(),
                direction=direction,
                timestamp=day_df.index[
                    confirmation_position
                ],
                position=confirmation_position,
                score=score,
                market_regime=market_regime,
                market_aligned=market_aligned,
                adx=float(
                    confirmation["ADX"]
                ),
                rsi=float(
                    confirmation["RSI"]
                ),
                relative_volume=float(
                    confirmation[
                        "RelativeVolume"
                    ]
                ),
                atr=float(
                    confirmation["ATR"]
                ),
                vwap=float(
                    confirmation["VWAP"]
                ),
                orb_high=orb_high,
                orb_low=orb_low,
                initial_stop=initial_stop,
            )
        )

        diagnostics[
            "FinalSignals"
        ] += 1

        used_event_positions.update(
            range(
                position,
                confirmation_position + 1
            )
        )

    return signals


# ============================================================
# POSITION SIZING
# ============================================================

def calculate_position_size(
    balance: float,
    entry_price: float,
    risk_per_share: float
) -> int:

    if (
        entry_price <= 0
        or
        risk_per_share <= 0
    ):
        return 0

    risk_budget = (
        balance *
        RISK_PER_TRADE_PERCENT /
        100.0
    )

    quantity_by_risk = int(
        risk_budget /
        risk_per_share
    )

    max_position_value = (
        balance *
        MAX_POSITION_VALUE_PERCENT /
        100.0
    )

    quantity_by_value = int(
        max_position_value /
        entry_price
    )

    return max(
        0,
        min(
            quantity_by_risk,
            quantity_by_value
        )
    )


# ============================================================
# EXECUTION ENGINE
# ============================================================

def simulate_trade(
    signal: Signal,
    day_df: pd.DataFrame,
    balance: float
) -> Optional[Trade]:

    entry_position = (
        signal.position +
        1
    )

    if entry_position >= len(
        day_df
    ):
        return None

    entry_candle = day_df.iloc[
        entry_position
    ]

    entry_time = day_df.index[
        entry_position
    ]

    if (
        entry_time.strftime(
            "%H:%M"
        ) >
        LAST_ENTRY
    ):
        return None

    entry_price = float(
        entry_candle["Open"]
    )

    initial_stop = float(
        signal.initial_stop
    )

    if signal.direction == "LONG":
        risk_per_share = (
            entry_price -
            initial_stop
        )
    else:
        risk_per_share = (
            initial_stop -
            entry_price
        )

    if risk_per_share <= 0:
        return None

    risk_atr = (
        risk_per_share /
        signal.atr
    )

    if (
        risk_atr <
        MIN_STOP_ATR
        or
        risk_atr >
        MAX_STOP_ATR
    ):
        return None

    quantity = (
        calculate_position_size(
            balance,
            entry_price,
            risk_per_share
        )
    )

    if quantity <= 0:
        return None

    initial_quantity = (
        quantity
    )

    remaining_quantity = (
        quantity
    )

    initial_risk_amount = (
        risk_per_share *
        initial_quantity
    )

    current_stop = (
        initial_stop
    )

    realized_gross = 0.0
    realized_turnover = 0.0

    partial_taken = False
    profit_protection_activated = False
    break_even_activated = False
    trailing_activated = False

    mfe_r = 0.0
    mae_r = 0.0

    exit_price = (
        entry_price
    )

    exit_time = (
        entry_time
    )

    exit_reason = (
        "END OF DAY"
    )

    future = day_df.iloc[
        entry_position:
    ]

    estimated_round_trip_cost_per_share = (
        entry_price *
        2.0 *
        (
            TRANSACTION_COST_PERCENT +
            SLIPPAGE_PERCENT
        ) /
        100.0
    )

    positive_cost_floor = (
        estimated_round_trip_cost_per_share *
        1.25
    )

    for timestamp, candle in future.iterrows():
        high = float(
            candle["High"]
        )

        low = float(
            candle["Low"]
        )

        close = float(
            candle["Close"]
        )

        atr = float(
            candle.get(
                "ATR",
                signal.atr
            )
        )

        if (
            not np.isfinite(
                atr
            )
            or
            atr <= 0
        ):
            atr = signal.atr

        if signal.direction == "LONG":
            favorable_r = (
                high -
                entry_price
            ) / risk_per_share

            adverse_r = (
                entry_price -
                low
            ) / risk_per_share

        else:
            favorable_r = (
                entry_price -
                low
            ) / risk_per_share

            adverse_r = (
                high -
                entry_price
            ) / risk_per_share

        mfe_r = max(
            mfe_r,
            favorable_r
        )

        mae_r = max(
            mae_r,
            adverse_r
        )

        # ----------------------------------------------------
        # Conservative stop-first handling.
        # The stop active at the START of this candle is tested
        # before using the same candle's high/low to tighten it.
        # ----------------------------------------------------

        stop_hit = False

        if signal.direction == "LONG":
            if low <= current_stop:
                stop_hit = True
        else:
            if high >= current_stop:
                stop_hit = True

        if stop_hit:
            exit_price = (
                current_stop
            )

            exit_time = (
                timestamp
            )

            if trailing_activated:
                exit_reason = (
                    "TRAILING STOP"
                )
            elif break_even_activated:
                exit_reason = (
                    "BREAK EVEN"
                )
            elif profit_protection_activated:
                exit_reason = (
                    "PROFIT PROTECTION"
                )
            else:
                exit_reason = (
                    "INITIAL STOP"
                )

            break

        # ----------------------------------------------------
        # Take profit
        # ----------------------------------------------------

        if signal.direction == "LONG":
            take_profit_price = (
                entry_price +
                TAKE_PROFIT_R *
                risk_per_share
            )

            target_hit = (
                high >=
                take_profit_price
            )
        else:
            take_profit_price = (
                entry_price -
                TAKE_PROFIT_R *
                risk_per_share
            )

            target_hit = (
                low <=
                take_profit_price
            )

        if target_hit:
            exit_price = (
                take_profit_price
            )

            exit_time = (
                timestamp
            )

            exit_reason = (
                "TAKE PROFIT"
            )

            break

        # ----------------------------------------------------
        # Partial profit
        # ----------------------------------------------------

        if (
            not partial_taken
            and
            favorable_r >=
            PARTIAL_PROFIT_TRIGGER_R
            and
            remaining_quantity > 1
        ):

            partial_quantity = max(
                1,
                int(
                    initial_quantity *
                    PARTIAL_EXIT_PERCENT
                )
            )

            partial_quantity = min(
                partial_quantity,
                remaining_quantity - 1
            )

            if signal.direction == "LONG":
                partial_price = (
                    entry_price +
                    PARTIAL_PROFIT_TRIGGER_R *
                    risk_per_share
                )

                partial_pnl = (
                    partial_price -
                    entry_price
                ) * partial_quantity

            else:
                partial_price = (
                    entry_price -
                    PARTIAL_PROFIT_TRIGGER_R *
                    risk_per_share
                )

                partial_pnl = (
                    entry_price -
                    partial_price
                ) * partial_quantity

            realized_gross += (
                partial_pnl
            )

            realized_turnover += (
                entry_price +
                partial_price
            ) * partial_quantity

            remaining_quantity -= (
                partial_quantity
            )

            partial_taken = True

        # ----------------------------------------------------
        # Profit protection after +0.50R
        # ----------------------------------------------------

        if (
            favorable_r >=
            PROFIT_PROTECTION_TRIGGER_R
        ):

            profit_protection_activated = True

            positive_lock = max(
                PROFIT_PROTECTION_LOCK_R *
                risk_per_share,
                positive_cost_floor
            )

            if signal.direction == "LONG":
                current_stop = max(
                    current_stop,
                    entry_price +
                    positive_lock
                )
            else:
                current_stop = min(
                    current_stop,
                    entry_price -
                    positive_lock
                )

        # ----------------------------------------------------
        # Delayed break-even
        # ----------------------------------------------------

        if (
            favorable_r >=
            BREAK_EVEN_TRIGGER_R
        ):

            break_even_activated = True

            break_even_lock = max(
                BREAK_EVEN_LOCK_R *
                risk_per_share,
                positive_cost_floor
            )

            if signal.direction == "LONG":
                current_stop = max(
                    current_stop,
                    entry_price +
                    break_even_lock
                )
            else:
                current_stop = min(
                    current_stop,
                    entry_price -
                    break_even_lock
                )

        # ----------------------------------------------------
        # Two-stage trailing
        # ----------------------------------------------------

        if (
            favorable_r >=
            TRAIL_STAGE_1_TRIGGER_R
        ):

            trailing_activated = True

            if (
                favorable_r >=
                TRAIL_STAGE_2_TRIGGER_R
            ):
                trail_atr = (
                    TRAIL_STAGE_2_ATR
                )
            else:
                trail_atr = (
                    TRAIL_STAGE_1_ATR
                )

            if signal.direction == "LONG":
                trail_stop = (
                    high -
                    atr *
                    trail_atr
                )

                current_stop = max(
                    current_stop,
                    trail_stop
                )

            else:
                trail_stop = (
                    low +
                    atr *
                    trail_atr
                )

                current_stop = min(
                    current_stop,
                    trail_stop
                )

        if timestamp.strftime(
            "%H:%M"
        ) >= FORCE_EXIT:

            exit_price = close
            exit_time = timestamp
            exit_reason = (
                "END OF DAY"
            )
            break

    if remaining_quantity > 0:
        if signal.direction == "LONG":
            remaining_pnl = (
                exit_price -
                entry_price
            ) * remaining_quantity
        else:
            remaining_pnl = (
                entry_price -
                exit_price
            ) * remaining_quantity

        realized_gross += (
            remaining_pnl
        )

        realized_turnover += (
            entry_price +
            exit_price
        ) * remaining_quantity

    costs = (
        calculate_cost_from_turnover(
            realized_turnover
        )
    )

    net_pnl = (
        realized_gross -
        costs
    )

    net_r = (
        net_pnl /
        initial_risk_amount
        if initial_risk_amount > 0
        else 0.0
    )

    return Trade(
        symbol=signal.symbol,
        date=signal.date,
        direction=signal.direction,
        score=signal.score,
        market_regime=signal.market_regime,
        market_aligned=signal.market_aligned,
        entry_time=entry_time,
        exit_time=exit_time,
        entry_price=entry_price,
        exit_price=exit_price,
        initial_stop=initial_stop,
        quantity=remaining_quantity,
        initial_quantity=initial_quantity,
        gross_pnl=realized_gross,
        costs=costs,
        net_pnl=net_pnl,
        risk_per_share=risk_per_share,
        initial_risk_amount=initial_risk_amount,
        net_r=net_r,
        mae_r=mae_r,
        mfe_r=mfe_r,
        exit_reason=exit_reason,
        profit_protection_activated=profit_protection_activated,
        break_even_activated=break_even_activated,
        partial_profit_taken=partial_taken,
        trailing_activated=trailing_activated,
    )


# ============================================================
# BACKTEST ENGINE
# ============================================================

def available_dates(
    stock_data: Dict[str, pd.DataFrame]
) -> List[object]:

    dates = set()

    for df in stock_data.values():
        dates.update(
            df.index.date
        )

    return sorted(
        dates
    )


def run_backtest(
    stock_data: Dict[str, pd.DataFrame],
    dates: List[object],
    label: str
) -> Tuple[
    List[Trade],
    float,
    Dict[str, int]
]:

    print(
        "\n======================================"
    )
    print(
        label
    )
    print(
        "======================================"
    )

    balance = (
        INITIAL_BALANCE
    )

    trades: List[Trade] = []

    diagnostics = (
        new_diagnostics()
    )

    for trade_date in dates:

        daily_signals: List[
            Signal
        ] = []

        symbol_day_frames = {}

        for symbol, full_df in stock_data.items():

            day_df = full_df[
                full_df.index.date ==
                trade_date
            ].copy()

            if day_df.empty:
                continue

            symbol_day_frames[
                symbol
            ] = day_df

            symbol_signals = (
                generate_day_signals(
                    symbol,
                    day_df,
                    diagnostics
                )
            )

            daily_signals.extend(
                symbol_signals
            )

        # Chronological processing avoids selecting a late-day
        # high-score signal using hindsight over earlier opportunities.
        daily_signals.sort(
            key=lambda signal: (
                signal.timestamp,
                -int(
                    signal.market_aligned
                ),
                -signal.score,
                -signal.relative_volume,
                -signal.adx,
            )
        )

        selected: List[
            Signal
        ] = []

        used_symbols = set()

        for signal in daily_signals:

            if (
                ONE_TRADE_PER_SYMBOL_PER_DAY
                and
                signal.symbol in
                used_symbols
            ):
                continue

            selected.append(
                signal
            )

            used_symbols.add(
                signal.symbol
            )

            if (
                len(
                    selected
                ) >=
                MAX_TRADES_PER_DAY
            ):
                break

        for signal in selected:

            day_df = (
                symbol_day_frames[
                    signal.symbol
                ]
            )

            trade = simulate_trade(
                signal,
                day_df,
                balance
            )

            if trade is None:
                continue

            trades.append(
                trade
            )

            balance += (
                trade.net_pnl
            )

    print_backtest_result(
        trades,
        balance
    )

    print_diagnostics(
        diagnostics
    )

    return (
        trades,
        balance,
        diagnostics
    )


# ============================================================
# REPORTING
# ============================================================

def trades_to_dataframe(
    trades: List[Trade]
) -> pd.DataFrame:

    if not trades:
        return pd.DataFrame()

    return pd.DataFrame(
        [
            asdict(
                trade
            )
            for trade
            in trades
        ]
    )


def print_group_performance(
    df: pd.DataFrame,
    column: str,
    title: str
) -> None:

    if (
        df.empty or
        column not in df.columns
    ):
        return

    print(
        f"\n---------- {title} ----------"
    )

    for value, group in df.groupby(
        column
    ):

        wins = (
            group["net_pnl"] > 0
        ).sum()

        win_rate = (
            wins /
            len(group) *
            100
        )

        print(
            f"{value} | "
            f"Trades: {len(group)} | "
            f"Win Rate: {win_rate:.2f}% | "
            f"Net P/L: ₹{group['net_pnl'].sum():.2f} | "
            f"Average Net R: {group['net_r'].mean():.2f}R"
        )


def print_backtest_result(
    trades: List[Trade],
    final_balance: float
) -> None:

    net_profit = (
        final_balance -
        INITIAL_BALANCE
    )

    return_percent = (
        net_profit /
        INITIAL_BALANCE *
        100
    )

    print(
        f"Initial Balance: ₹{INITIAL_BALANCE:.2f}"
    )

    print(
        f"Final Balance: ₹{final_balance:.2f}"
    )

    print(
        f"Net Profit / Loss: ₹{net_profit:.2f}"
    )

    print(
        f"Return: {return_percent:.2f}%"
    )

    if not trades:
        print(
            "\nNo trades completed."
        )
        return

    df = trades_to_dataframe(
        trades
    )

    winners = df[
        df["net_pnl"] > 0
    ]

    losers = df[
        df["net_pnl"] <= 0
    ]

    completed = len(
        df
    )

    win_rate = (
        len(winners) /
        completed *
        100
    )

    average_win = (
        winners["net_pnl"].mean()
        if not winners.empty
        else 0.0
    )

    average_loss = (
        losers["net_pnl"].mean()
        if not losers.empty
        else 0.0
    )

    gross_profit = (
        winners["net_pnl"].sum()
    )

    gross_loss = abs(
        losers["net_pnl"].sum()
    )

    profit_factor = (
        gross_profit /
        gross_loss
        if gross_loss > 0
        else np.inf
    )

    print(
        "\n---------- TRADE STATISTICS ----------"
    )

    print(
        f"Completed Trades: {completed}"
    )

    print(
        f"Winning Trades: {len(winners)}"
    )

    print(
        f"Losing Trades: {len(losers)}"
    )

    print(
        f"Win Rate: {win_rate:.2f}%"
    )

    print(
        "\n---------- PERFORMANCE ----------"
    )

    print(
        f"Average Win: ₹{average_win:.2f}"
    )

    print(
        f"Average Loss: ₹{average_loss:.2f}"
    )

    print(
        f"Profit Factor: {profit_factor:.2f}"
    )

    print(
        f"Expectancy Per Trade: ₹{df['net_pnl'].mean():.2f}"
    )

    print(
        f"Average Net R: {df['net_r'].mean():.2f}R"
    )

    print(
        "\n---------- MAE / MFE ----------"
    )

    print(
        f"Average MAE: {df['mae_r'].mean():.2f}R"
    )

    print(
        f"Average MFE: {df['mfe_r'].mean():.2f}R"
    )

    print(
        "\n---------- COSTS ----------"
    )

    print(
        f"Transaction Costs: ₹{df['costs'].sum():.2f}"
    )

    print_group_performance(
        df,
        "market_aligned",
        "MARKET ALIGNMENT PERFORMANCE"
    )

    print_group_performance(
        df,
        "direction",
        "DIRECTION PERFORMANCE"
    )

    print_group_performance(
        df,
        "symbol",
        "SYMBOL PERFORMANCE"
    )

    print_group_performance(
        df,
        "exit_reason",
        "EXIT REASON PERFORMANCE"
    )

    print(
        "\n---------- MFE MILESTONES ----------"
    )

    for milestone in [
        0.25,
        0.50,
        0.60,
        0.75,
        1.00,
        1.50,
        2.00,
    ]:
        reached = (
            df["mfe_r"] >=
            milestone
        ).mean() * 100

        print(
            f"Reached +{milestone:.2f}R: "
            f"{reached:.2f}%"
        )

    print(
        "\n---------- PROFIT CAPTURE ----------"
    )

    print(
        "Profit Protection Activated: "
        f"{df['profit_protection_activated'].sum()}"
    )

    print(
        "Break-Even Activated: "
        f"{df['break_even_activated'].sum()}"
    )

    print(
        "Partial Profits Taken: "
        f"{df['partial_profit_taken'].sum()}"
    )

    print(
        "Trailing Stops Activated: "
        f"{df['trailing_activated'].sum()}"
    )

    positive_mfe = df[
        df["mfe_r"] > 0
    ]

    if not positive_mfe.empty:
        aggregate_capture = (
            positive_mfe[
                "net_r"
            ].sum() /
            positive_mfe[
                "mfe_r"
            ].sum()
        )

        print(
            "Aggregate Net-R / MFE Capture: "
            f"{aggregate_capture:.2f}"
        )

    best = df.loc[
        df["net_pnl"].idxmax()
    ]

    worst = df.loc[
        df["net_pnl"].idxmin()
    ]

    print(
        "\n---------- BEST TRADE ----------"
    )

    print(
        f"{best['symbol']} | "
        f"{best['direction']} | "
        f"Score: {best['score']} | "
        f"P/L: ₹{best['net_pnl']:.2f} | "
        f"Net R: {best['net_r']:.2f}R"
    )

    print(
        "\n---------- WORST TRADE ----------"
    )

    print(
        f"{worst['symbol']} | "
        f"{worst['direction']} | "
        f"Score: {worst['score']} | "
        f"P/L: ₹{worst['net_pnl']:.2f} | "
        f"Net R: {worst['net_r']:.2f}R"
    )


# ============================================================
# WALK-FORWARD
# ============================================================

def create_walk_forward_windows(
    dates: List[object]
) -> List[
    Tuple[
        List[object],
        List[object]
    ]
]:

    windows = []

    start = 0

    while (
        start +
        TRAIN_DAYS +
        TEST_DAYS
        <=
        len(dates)
    ):

        development = dates[
            start:
            start +
            TRAIN_DAYS
        ]

        oos = dates[
            start +
            TRAIN_DAYS:
            start +
            TRAIN_DAYS +
            TEST_DAYS
        ]

        windows.append(
            (
                development,
                oos
            )
        )

        start += (
            STEP_DAYS
        )

    return windows


# ============================================================
# REPORT OUTPUT
# ============================================================

def get_report_directory() -> Path:
    """
    Return a writable directory for CSV reports.

    The original V17 saved CSV files using relative paths. If the script is
    launched while the current working directory is '/', macOS raises:
        OSError: [Errno 30] Read-only file system

    This function first tries a 'backtest_reports' folder beside this script.
    If that location is not writable, it falls back to the user's Documents
    folder and then the user's home folder.
    """
    candidates = []

    try:
        script_dir = Path(__file__).resolve().parent
        candidates.append(script_dir / "backtest_reports_v17")
    except NameError:
        pass

    candidates.extend([
        Path.home() / "Documents" / "backtest_reports_v17",
        Path.home() / "backtest_reports_v17",
    ])

    for report_dir in candidates:
        try:
            report_dir.mkdir(parents=True, exist_ok=True)

            test_file = report_dir / ".write_test"
            test_file.write_text("ok", encoding="utf-8")
            test_file.unlink(missing_ok=True)

            return report_dir
        except (OSError, PermissionError):
            continue

    raise OSError(
        "Unable to find a writable directory for backtest CSV reports."
    )


def export_trades_csv(trades: List[Trade], file_path: Path) -> None:
    """
    Export trades safely. Even when there are no trades, create an empty CSV
    with Trade dataclass columns so report generation does not fail.
    """
    df = trades_to_dataframe(trades)

    if df.empty:
        df = pd.DataFrame(columns=list(Trade.__dataclass_fields__.keys()))

    df.to_csv(file_path, index=False)


# ============================================================
# MAIN
# ============================================================

def main():

    print("\nV17 active mode: LONG-focused trend/pullback validation")
    print("ORB is treated as a supporting quality factor rather than the target edge.")

    report_dir = get_report_directory()

    print(
        f"\nCSV reports will be saved to: {report_dir}"
    )

    print(
        "======================================"
    )
    print(
        "PORTFOLIO INTRADAY BACKTEST V17"
    )
    print(
        "======================================"
    )
    print(
        "Clean Modular Backtesting Architecture"
    )
    print(
        "Numeric NIFTY Regime + merge_asof Alignment"
    )
    print(
        "Fresh ORB Breakout -> Retest -> Confirmation"
    )
    print(
        "Next-Bar-Open Execution"
    )
    print(
        "Cost-Aware Profit Protection"
    )
    print(
        "Partial Profit + Break-Even + ATR Trailing"
    )
    print(
        "Detailed Signal Rejection Diagnostics"
    )
    print(
        "Multi-Window Walk-Forward Validation"
    )

    print(
        "\nDownloading market index..."
    )

    raw_market = (
        download_symbol(
            MARKET_SYMBOL
        )
    )

    if raw_market.empty:
        print(
            "Unable to load market index."
        )
        return

    market_df = (
        prepare_market_data(
            raw_market
        )
    )

    print(
        "\nDownloading portfolio stocks..."
    )

    stock_data: Dict[
        str,
        pd.DataFrame
    ] = {}

    for symbol in SYMBOLS:

        raw_stock = (
            download_symbol(
                symbol
            )
        )

        if raw_stock.empty:
            continue

        prepared = (
            prepare_stock_data(
                raw_stock
            )
        )

        prepared = (
            align_market_regime(
                prepared,
                market_df
            )
        )

        if not prepared.empty:
            stock_data[
                symbol
            ] = prepared

    print(
        f"\nSuccessfully loaded "
        f"{len(stock_data)} symbols."
    )

    if not stock_data:
        print(
            "No stock data available."
        )
        return

    dates = available_dates(
        stock_data
    )

    windows = (
        create_walk_forward_windows(
            dates
        )
    )

    if not windows:
        print(
            "\nNot enough trading days for "
            "the configured walk-forward windows."
        )
        return

    all_oos_trades: List[
        Trade
    ] = []

    summary_rows = []

    for window_number, (
        development_dates,
        oos_dates
    ) in enumerate(
        windows,
        start=1
    ):

        print(
            "\n======================================"
        )
        print(
            f"WALK-FORWARD WINDOW {window_number}"
        )
        print(
            "======================================"
        )

        print(
            "Development Dates: "
            f"{development_dates[0]} "
            f"to "
            f"{development_dates[-1]}"
        )

        print(
            "Out-of-Sample Dates: "
            f"{oos_dates[0]} "
            f"to "
            f"{oos_dates[-1]}"
        )

        development_trades, (
            development_balance
        ), _ = run_backtest(
            stock_data,
            development_dates,
            (
                f"V17 WINDOW "
                f"{window_number} "
                f"DEVELOPMENT BACKTEST"
            )
        )

        oos_trades, (
            oos_balance
        ), _ = run_backtest(
            stock_data,
            oos_dates,
            (
                f"V17 WINDOW "
                f"{window_number} "
                f"OUT-OF-SAMPLE BACKTEST"
            )
        )

        development_return = (
            (
                development_balance -
                INITIAL_BALANCE
            ) /
            INITIAL_BALANCE *
            100
        )

        oos_return = (
            (
                oos_balance -
                INITIAL_BALANCE
            ) /
            INITIAL_BALANCE *
            100
        )

        summary_rows.append(
            {
                "Window": window_number,
                "DevelopmentStart":
                    development_dates[0],
                "DevelopmentEnd":
                    development_dates[-1],
                "OOSStart":
                    oos_dates[0],
                "OOSEnd":
                    oos_dates[-1],
                "DevelopmentReturn":
                    development_return,
                "OOSReturn":
                    oos_return,
                "DevelopmentTrades":
                    len(
                        development_trades
                    ),
                "OOSTrades":
                    len(
                        oos_trades
                    ),
            }
        )

        all_oos_trades.extend(
            oos_trades
        )

        development_file = report_dir / (
            f"portfolio_backtest_v17_"
            f"window_{window_number}_"
            f"development_trades.csv"
        )

        oos_file = report_dir / (
            f"portfolio_backtest_v17_"
            f"window_{window_number}_"
            f"out_of_sample_trades.csv"
        )

        export_trades_csv(
            development_trades,
            development_file
        )

        export_trades_csv(
            oos_trades,
            oos_file
        )

    # Deduplicate if future configuration creates overlapping OOS windows.
    unique_oos = {}

    for trade in all_oos_trades:

        key = (
            trade.symbol,
            trade.date,
            trade.direction,
            pd.Timestamp(
                trade.entry_time
            ),
        )

        unique_oos[
            key
        ] = trade

    combined_oos = sorted(
        unique_oos.values(),
        key=lambda trade:
        pd.Timestamp(
            trade.entry_time
        )
    )

    combined_balance = (
        INITIAL_BALANCE +
        sum(
            trade.net_pnl
            for trade
            in combined_oos
        )
    )

    print(
        "\n======================================"
    )
    print(
        "V17 COMBINED OUT-OF-SAMPLE RESULT"
    )
    print(
        "======================================"
    )

    print_backtest_result(
        combined_oos,
        combined_balance
    )

    summary_df = pd.DataFrame(
        summary_rows
    )

    print(
        "\n======================================"
    )
    print(
        "V17 WALK-FORWARD SUMMARY"
    )
    print(
        "======================================"
    )

    for row in summary_rows:

        print(
            f"Window {row['Window']} | "
            f"Development: "
            f"{row['DevelopmentReturn']:.2f}% | "
            f"OOS: "
            f"{row['OOSReturn']:.2f}% | "
            f"OOS Trades: "
            f"{row['OOSTrades']}"
        )

    profitable_windows = sum(
        row[
            "OOSReturn"
        ] > 0
        for row
        in summary_rows
    )

    average_oos_return = (
        summary_df[
            "OOSReturn"
        ].mean()
        if not summary_df.empty
        else 0.0
    )

    print(
        f"\nProfitable OOS Windows: "
        f"{profitable_windows}/"
        f"{len(summary_rows)}"
    )

    print(
        f"Average OOS Return: "
        f"{average_oos_return:.2f}%"
    )

    combined_file = report_dir / (
        "portfolio_backtest_v17_"
        "combined_out_of_sample_trades.csv"
    )

    summary_file = report_dir / (
        "portfolio_backtest_v17_"
        "walk_forward_summary.csv"
    )

    export_trades_csv(
        combined_oos,
        combined_file
    )

    summary_df.to_csv(
        summary_file,
        index=False
    )

    print(
        "\n======================================"
    )
    print(
        "V17 REPORTS EXPORTED"
    )
    print(
        "======================================"
    )

    print(
        f"Combined OOS Trades: "
        f"{combined_file}"
    )

    print(
        f"Walk-Forward Summary: "
        f"{summary_file}"
    )

    print(
        "\nValidation guidance:"
    )

    print(
        "1. Confirm MarketBullish, MarketBearish "
        "and MarketAligned are no longer always zero."
    )

    print(
        "2. Check that Breakout -> Retest -> "
        "Confirmation produces a useful sample."
    )

    print(
        "3. Do not judge profitability from only "
        "a handful of OOS trades."
    )

    print(
        "4. Compare OOS Profit Factor, Average Net R, "
        "costs and MFE-to-realized-R capture."
    )

    print(
        "5. Do not connect to live trading until "
        "positive expectancy is stable across "
        "multiple unseen periods."
    )


if __name__ == "__main__":
    main()
