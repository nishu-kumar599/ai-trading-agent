import json
import os
import time
from datetime import datetime, time as dt_time

import yfinance as yf

from market_scanner import (
    scan_market,
    display_results,
    display_exceptional_opportunities
)

from portfolio_trader import (
    PortfolioTrader,
    select_best_exceptional_opportunity,
    select_normal_opportunities
)


# =========================================================
# CONFIGURATION
# =========================================================

STATE_FILE = "portfolio_state.json"

INITIAL_BALANCE = 100000

MONITOR_INTERVAL_SECONDS = 60

SCAN_INTERVAL_SECONDS = 300

MARKET_OPEN = dt_time(
    9,
    15
)

INTRADAY_SQUARE_OFF = dt_time(
    15,
    20
)

MARKET_CLOSE = dt_time(
    15,
    30
)


# =========================================================
# JSON DATETIME SERIALIZATION
# =========================================================

def serialize_value(value):

    if isinstance(
        value,
        datetime
    ):

        return {

            "__type__":
                "datetime",

            "value":
                value.isoformat()
        }

    return value


def deserialize_value(value):

    if (
        isinstance(
            value,
            dict
        )

        and

        value.get(
            "__type__"
        )
        == "datetime"
    ):

        return datetime.fromisoformat(
            value[
                "value"
            ]
        )

    return value


# =========================================================
# SAVE PORTFOLIO
# =========================================================

def save_state(
    trader
):

    state = {

        "initial_balance":
            trader.initial_balance,

        "cash":
            trader.cash,

        "normal_trades_today":
            trader.normal_trades_today,

        "exceptional_trades_today":
            trader.exceptional_trades_today,

        "daily_realized_profit":
            trader.daily_realized_profit,

        "open_positions":
            trader.open_positions,

        "trade_history":
            trader.trade_history,

        "last_trading_date":
            datetime.now()
            .date()
            .isoformat()
    }

    try:

        with open(
            STATE_FILE,
            "w"
        ) as file:

            json.dump(
                state,
                file,
                indent=4,
                default=serialize_value
            )

    except Exception as error:

        print(
            "\nError saving state:"
        )

        print(
            error
        )


# =========================================================
# LOAD PORTFOLIO
# =========================================================

def load_state(
    trader
):

    if not os.path.exists(
        STATE_FILE
    ):

        print(
            "\nNo previous portfolio "
            "state found."
        )

        print(
            "Starting new paper "
            "trading account."
        )

        return trader

    try:

        with open(
            STATE_FILE,
            "r"
        ) as file:

            state = json.load(
                file,
                object_hook=
                    deserialize_value
            )

        trader.initial_balance = (
            state.get(
                "initial_balance",
                INITIAL_BALANCE
            )
        )

        trader.cash = (
            state.get(
                "cash",
                INITIAL_BALANCE
            )
        )

        trader.normal_trades_today = (
            state.get(
                "normal_trades_today",
                0
            )
        )

        trader.exceptional_trades_today = (
            state.get(
                "exceptional_trades_today",
                0
            )
        )

        trader.daily_realized_profit = (
            state.get(
                "daily_realized_profit",
                0
            )
        )

        trader.open_positions = (
            state.get(
                "open_positions",
                {}
            )
        )

        trader.trade_history = (
            state.get(
                "trade_history",
                []
            )
        )

        last_trading_date = (
            state.get(
                "last_trading_date"
            )
        )

        today = (

            datetime.now()

            .date()

            .isoformat()
        )

        # =====================================
        # RESET DAILY COUNTERS
        # =====================================

        if (
            last_trading_date
            != today
        ):

            print(
                "\nNew trading day detected."
            )

            trader.normal_trades_today = 0

            trader.exceptional_trades_today = 0

            trader.daily_realized_profit = 0

        print(
            "\nPortfolio state "
            "loaded successfully."
        )

        return trader

    except Exception as error:

        print(
            "\nError loading state:"
        )

        print(
            error
        )

        return trader


# =========================================================
# GET CURRENT PRICE
# =========================================================

def get_current_price(
    symbol
):

    try:

        ticker = yf.Ticker(
            symbol
        )

        data = ticker.history(
            period="1d",
            interval="1m"
        )

        if data.empty:

            print(
                f"No price available "
                f"for {symbol}"
            )

            return None

        return float(

            data[
                "Close"
            ]

            .iloc[
                -1
            ]
        )

    except Exception as error:

        print(
            f"Price error "
            f"{symbol}: "
            f"{error}"
        )

        return None


# =========================================================
# MARKET OPEN CHECK
# =========================================================

def is_market_open():

    now = (
        datetime.now()
    )

    if (
        now.weekday()
        >= 5
    ):

        return False

    return (

        MARKET_OPEN

        <=

        now.time()

        <=

        MARKET_CLOSE
    )


# =========================================================
# SQUARE OFF CHECK
# =========================================================

def should_square_off():

    return (

        datetime.now()
        .time()

        >=

        INTRADAY_SQUARE_OFF
    )


# =========================================================
# MONITOR OPEN POSITIONS
# =========================================================

def monitor_open_positions(
    trader
):

    if not trader.open_positions:

        return

    print(
        "\n========== "
        "MONITORING POSITIONS "
        "=========="
    )

    symbols = list(

        trader.open_positions.keys()
    )

    for symbol in symbols:

        if (
            symbol
            not in trader.open_positions
        ):

            continue

        position = (
            trader.open_positions[
                symbol
            ]
        )

        current_price = (
            get_current_price(
                symbol
            )
        )

        if current_price is None:

            continue

        print(
            f"\n{symbol}"
        )

        print(
            f"Position: "
            f"{position['Position']}"
        )

        print(
            f"Current: "
            f"₹{current_price:.2f}"
        )

        print(
            f"Entry: "
            f"₹{position['EntryPrice']:.2f}"
        )

        print(
            f"Stop Loss: "
            f"₹{position['StopLoss']:.2f}"
        )

        # =====================================
        # INTRADAY SQUARE OFF
        # =====================================

        if (

            position.get(
                "ProductType"
            )
            == "INTRADAY"

            and

            should_square_off()
        ):

            trader.close_position(

                symbol,

                current_price,

                "END OF DAY"
            )

            save_state(
                trader
            )

            continue

        # =====================================
        # TRAILING STOP MONITOR
        # =====================================

        trader.monitor_position(

            symbol,

            current_price
        )

        save_state(
            trader
        )


# =========================================================
# EXECUTE NORMAL TRADES
# =========================================================

def execute_normal_trades(
    trader,
    results
):

    remaining_trades = (

        trader.max_normal_trades

        -

        trader.normal_trades_today
    )

    if remaining_trades <= 0:

        print(
            "\nNormal trade "
            "daily limit reached."
        )

        return

    opportunities = (
        select_normal_opportunities(
            results
        )
    )

    if not opportunities:

        print(
            "\nNo qualified normal "
            "trading opportunities."
        )

        return

    print(
        "\n========== "
        "NORMAL TRADE OPPORTUNITIES "
        "=========="
    )

    executed_count = 0

    for opportunity in opportunities:

        if (
            executed_count
            >= remaining_trades
        ):

            break

        symbol = opportunity[
            "Symbol"
        ]

        if (
            trader.already_in_position(
                symbol
            )
        ):

            continue

        print(
            f"\nSelected: "
            f"{symbol}"
        )

        print(
            f"Exchange: "
            f"{opportunity['Exchange']}"
        )

        print(
            f"Direction: "
            f"{opportunity['TradeDirection']}"
        )

        print(
            f"Score: "
            f"{opportunity['Score']}/9"
        )

        print(
            f"Momentum: "
            f"{opportunity['Momentum']:.2f}%"
        )

        print(
            f"Relative Volume: "
            f"{opportunity['RelativeVolume']:.2f}x"
        )

        executed = (
            trader.execute_normal_opportunity(

                opportunity,

                product_type=
                    "INTRADAY"
            )
        )

        if executed:

            executed_count += 1

            save_state(
                trader
            )


# =========================================================
# EXECUTE EXCEPTIONAL TRADE
# =========================================================

def execute_exceptional_trade(
    trader,
    results
):

    if (

        trader.exceptional_trades_today

        >=

        trader.max_exceptional_trades
    ):

        print(
            "\nExceptional trade "
            "daily limit reached."
        )

        return

    opportunity = (
        select_best_exceptional_opportunity(
            results
        )
    )

    if opportunity is None:

        print(
            "\nNo exceptional momentum "
            "opportunity found."
        )

        return

    symbol = opportunity[
        "Symbol"
    ]

    if (
        trader.already_in_position(
            symbol
        )
    ):

        print(
            f"\nExceptional opportunity "
            f"{symbol} already held."
        )

        return

    print(
        "\n========== "
        "EXCEPTIONAL TRADE "
        "=========="
    )

    print(
        f"Selected: "
        f"{symbol}"
    )

    print(
        f"Exchange: "
        f"{opportunity['Exchange']}"
    )

    print(
        f"Direction: "
        f"{opportunity['ExceptionalMomentum']}"
    )

    print(
        f"Score: "
        f"{opportunity['Score']}/9"
    )

    print(
        f"Momentum: "
        f"{opportunity['Momentum']:.2f}%"
    )

    print(
        f"Relative Volume: "
        f"{opportunity['RelativeVolume']:.2f}x"
    )

    executed = (
        trader.execute_opportunity(

            opportunity,

            product_type=
                "INTRADAY"
        )
    )

    if executed:

        save_state(
            trader
        )


# =========================================================
# SCAN AND EXECUTE
# =========================================================

def scan_and_execute(
    trader
):

    print(
        "\n======================================"
    )

    print(
        "SCANNING NSE + BSE"
    )

    print(
        "======================================"
    )

    # =====================================
    # RISK CHECK
    # =====================================

    if (
        trader.daily_loss_limit_reached()
    ):

        print(
            "\nDaily loss limit reached."
        )

        print(
            "All new trades blocked."
        )

        return

    try:

        results = (
            scan_market()
        )

    except Exception as error:

        print(
            "\nScanner error:"
        )

        print(
            error
        )

        return

    if not results:

        print(
            "\nNo scanner results."
        )

        return

    # =====================================
    # DISPLAY RESULTS
    # =====================================

    display_results(
        results
    )

    display_exceptional_opportunities(
        results
    )

    # =====================================
    # EXCEPTIONAL TRADE
    # =====================================

    execute_exceptional_trade(

        trader,

        results
    )

    # =====================================
    # NORMAL TRADES
    # =====================================

    execute_normal_trades(

        trader,

        results
    )


# =========================================================
# DISPLAY ENGINE STATUS
# =========================================================

def display_engine_status(
    trader
):

    print(
        "\n======================================"
    )

    print(
        "AI TRADING AGENT STATUS"
    )

    print(
        "======================================"
    )

    print(
        f"Time: "
        f"{datetime.now()}"
    )

    print(
        f"Available Cash: "
        f"₹{trader.cash:.2f}"
    )

    print(
        f"Daily Realized P/L: "
        f"₹{trader.daily_realized_profit:.2f}"
    )

    print(
        f"Open Positions: "
        f"{len(trader.open_positions)}"
    )

    print(
        f"Normal Trades Today: "
        f"{trader.normal_trades_today}"
    )

    print(
        f"Exceptional Trades Today: "
        f"{trader.exceptional_trades_today}"
    )

    print(
        "======================================"
    )


# =========================================================
# MAIN
# =========================================================

def main():

    print(
        "\n======================================"
    )

    print(
        "INDIAN MARKET AI PAPER TRADING AGENT"
    )

    print(
        "======================================"
    )

    trader = PortfolioTrader(

        initial_balance=
            INITIAL_BALANCE,

        max_normal_trades=
            3,

        max_exceptional_trades=
            1,

        max_daily_loss_percentage=
            1.0,

        max_position_percentage=
            20,

        intraday_trailing_percentage=
            0.005,

        equity_trailing_percentage=
            0.03
    )

    trader = (
        load_state(
            trader
        )
    )

    trader.display_portfolio()

    last_scan_time = 0

    print(
        "\nTrading engine started."
    )

    print(
        f"Monitoring every "
        f"{MONITOR_INTERVAL_SECONDS} seconds"
    )

    print(
        f"Scanning every "
        f"{SCAN_INTERVAL_SECONDS} seconds"
    )

    try:

        while True:

            # =================================
            # MARKET CLOSED
            # =================================

            if not is_market_open():

                print(
                    "\nMarket is currently closed."
                )

                display_engine_status(
                    trader
                )

                print(
                    "Waiting 60 seconds..."
                )

                time.sleep(
                    60
                )

                continue

            # =================================
            # MONITOR POSITIONS
            # =================================

            monitor_open_positions(
                trader
            )

            current_timestamp = (
                time.time()
            )

            # =================================
            # MARKET SCAN
            # =================================

            if (

                current_timestamp

                -

                last_scan_time

                >=

                SCAN_INTERVAL_SECONDS
            ):

                if not should_square_off():

                    scan_and_execute(
                        trader
                    )

                else:

                    print(
                        "\nNo new trades."
                    )

                    print(
                        "Intraday square-off "
                        "time reached."
                    )

                last_scan_time = (
                    current_timestamp
                )

            save_state(
                trader
            )

            display_engine_status(
                trader
            )

            time.sleep(
                MONITOR_INTERVAL_SECONDS
            )

    except KeyboardInterrupt:

        print(
            "\nTrading agent stopped."
        )

        save_state(
            trader
        )

        print(
            "Portfolio state saved."
        )

        trader.display_portfolio()

    except Exception as error:

        print(
            "\nTrading engine error:"
        )

        print(
            error
        )

        save_state(
            trader
        )


# =========================================================
# START
# =========================================================

if __name__ == "__main__":

    main()