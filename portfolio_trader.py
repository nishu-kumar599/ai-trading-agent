from datetime import datetime


# =========================================================
# SELECT NORMAL TRADING OPPORTUNITIES
# =========================================================

def select_normal_opportunities(results):

    opportunities = []

    for stock in results:

        score = stock.get(
            "Score",
            0
        )

        trend = stock.get(
            "Trend",
            "NEUTRAL"
        )

        price = stock.get(
            "Price",
            0
        )

        vwap = stock.get(
            "VWAP",
            0
        )

        momentum = stock.get(
            "Momentum",
            0
        )

        relative_volume = stock.get(
            "RelativeVolume",
            0
        )

        rsi = stock.get(
            "RSI",
            50
        )

        direction = None

        # =====================================
        # NORMAL LONG
        # =====================================

        if (
            score >= 5
            and trend == "BULLISH"
            and price > vwap
            and momentum > 0
            and relative_volume >= 1.0
            and 50 <= rsi <= 75
        ):

            direction = "LONG"

        # =====================================
        # NORMAL SHORT
        # =====================================

        elif (
            score >= 5
            and trend == "BEARISH"
            and price < vwap
            and momentum < 0
            and relative_volume >= 1.0
            and 25 <= rsi <= 50
        ):

            direction = "SHORT"

        if direction is None:

            continue

        # Do not treat exceptional
        # opportunity as normal trade

        if stock.get(
            "ExceptionalMomentum"
        ) in [
            "LONG",
            "SHORT"
        ]:

            continue

        opportunity = (
            stock.copy()
        )

        opportunity[
            "TradeDirection"
        ] = direction

        opportunities.append(
            opportunity
        )

    # =====================================
    # RANK BEST OPPORTUNITIES
    # =====================================

    opportunities.sort(

        key=lambda stock: (

            stock.get(
                "Score",
                0
            ),

            abs(
                stock.get(
                    "Momentum",
                    0
                )
            ),

            stock.get(
                "RelativeVolume",
                0
            )
        ),

        reverse=True
    )

    return opportunities


# =========================================================
# SELECT BEST EXCEPTIONAL OPPORTUNITY
# =========================================================

def select_best_exceptional_opportunity(
    results
):

    exceptional = []

    for stock in results:

        direction = stock.get(
            "ExceptionalMomentum"
        )

        if direction not in [
            "LONG",
            "SHORT"
        ]:

            continue

        exceptional.append(
            stock
        )

    if not exceptional:

        return None

    exceptional.sort(

        key=lambda stock: (

            stock.get(
                "Score",
                0
            ),

            abs(
                stock.get(
                    "Momentum",
                    0
                )
            ),

            stock.get(
                "RelativeVolume",
                0
            )
        ),

        reverse=True
    )

    return exceptional[0]


# =========================================================
# PORTFOLIO TRADER
# =========================================================

class PortfolioTrader:

    def __init__(
        self,
        initial_balance=100000,
        max_normal_trades=3,
        max_exceptional_trades=1,
        max_daily_loss_percentage=1.0,
        max_position_percentage=20,
        intraday_trailing_percentage=0.005,
        equity_trailing_percentage=0.03
    ):

        self.initial_balance = (
            initial_balance
        )

        self.cash = (
            initial_balance
        )

        self.max_normal_trades = (
            max_normal_trades
        )

        self.max_exceptional_trades = (
            max_exceptional_trades
        )

        self.max_daily_loss_percentage = (
            max_daily_loss_percentage
        )

        self.max_position_percentage = (
            max_position_percentage
        )

        self.intraday_trailing_percentage = (
            intraday_trailing_percentage
        )

        self.equity_trailing_percentage = (
            equity_trailing_percentage
        )

        self.normal_trades_today = 0

        self.exceptional_trades_today = 0

        self.daily_realized_profit = 0

        self.open_positions = {}

        self.trade_history = []


    # =====================================================
    # CHECK DAILY LOSS LIMIT
    # =====================================================

    def daily_loss_limit_reached(
        self
    ):

        maximum_loss = (

            self.initial_balance

            *

            (
                self.max_daily_loss_percentage
                / 100
            )
        )

        return (

            self.daily_realized_profit

            <=

            -maximum_loss
        )


    # =====================================================
    # CHECK EXISTING POSITION
    # =====================================================

    def already_in_position(
        self,
        symbol
    ):

        return (
            symbol
            in self.open_positions
        )


    # =====================================================
    # CALCULATE POSITION SIZE
    # =====================================================

    def calculate_quantity(
        self,
        price
    ):

        if price <= 0:

            return 0

        maximum_position_value = (

            self.cash

            *

            (
                self.max_position_percentage
                / 100
            )
        )

        quantity = int(

            maximum_position_value

            /

            price
        )

        return max(
            quantity,
            0
        )


    # =====================================================
    # CREATE POSITION
    # =====================================================

    def open_position(
        self,
        opportunity,
        direction,
        trade_type,
        product_type
    ):

        symbol = opportunity[
            "Symbol"
        ]

        price = float(
            opportunity[
                "Price"
            ]
        )

        if (
            self.already_in_position(
                symbol
            )
        ):

            print(
                f"\nDuplicate trade blocked: "
                f"{symbol}"
            )

            return False

        if (
            self.daily_loss_limit_reached()
        ):

            print(
                "\nDaily loss limit reached."
            )

            return False

        quantity = (
            self.calculate_quantity(
                price
            )
        )

        if quantity <= 0:

            print(
                "\nInsufficient cash "
                "for position."
            )

            return False

        position_value = (
            price
            *
            quantity
        )

        # =====================================
        # INITIAL STOP LOSS
        # =====================================

        if (
            product_type
            == "INTRADAY"
        ):

            trailing_percentage = (
                self.intraday_trailing_percentage
            )

        else:

            trailing_percentage = (
                self.equity_trailing_percentage
            )

        # =====================================
        # LONG POSITION
        # =====================================

        if direction == "LONG":

            stop_loss = (

                price

                *

                (
                    1
                    -
                    trailing_percentage
                )
            )

            # Reserve capital

            self.cash -= (
                position_value
            )

        # =====================================
        # SHORT POSITION
        # =====================================

        elif direction == "SHORT":

            stop_loss = (

                price

                *

                (
                    1
                    +
                    trailing_percentage
                )
            )

            # For paper trading we reserve
            # equivalent capital for short

            self.cash -= (
                position_value
            )

        else:

            return False

        # =====================================
        # CREATE POSITION
        # =====================================

        position = {

            "Symbol":
                symbol,

            "Exchange":
                opportunity.get(
                    "Exchange",
                    "UNKNOWN"
                ),

            "Position":
                direction,

            "TradeType":
                trade_type,

            "ProductType":
                product_type,

            "EntryPrice":
                price,

            "Quantity":
                quantity,

            "PositionValue":
                position_value,

            "StopLoss":
                stop_loss,

            "TrailingPercentage":
                trailing_percentage,

            "HighestPrice":
                price,

            "LowestPrice":
                price,

            "MomentumScore":
                opportunity.get(
                    "Score",
                    0
                ),

            "EntryMomentum":
                opportunity.get(
                    "Momentum",
                    0
                ),

            "EntryRelativeVolume":
                opportunity.get(
                    "RelativeVolume",
                    0
                ),

            "EntryTime":
                datetime.now()
        }

        self.open_positions[
            symbol
        ] = position

        # =====================================
        # TRADE HISTORY
        # =====================================

        self.trade_history.append({

            "Symbol":
                symbol,

            "Action":
                (
                    "BUY"
                    if direction == "LONG"
                    else "SHORT SELL"
                ),

            "Position":
                direction,

            "TradeType":
                trade_type,

            "ProductType":
                product_type,

            "Price":
                price,

            "Quantity":
                quantity,

            "StopLoss":
                stop_loss,

            "Time":
                datetime.now()
        })

        print(
            "\nPAPER TRADE OPENED"
        )

        print(
            f"Symbol: "
            f"{symbol}"
        )

        print(
            f"Position: "
            f"{direction}"
        )

        print(
            f"Trade Type: "
            f"{trade_type}"
        )

        print(
            f"Product Type: "
            f"{product_type}"
        )

        print(
            f"Entry Price: "
            f"₹{price:.2f}"
        )

        print(
            f"Quantity: "
            f"{quantity}"
        )

        print(
            f"Initial Stop Loss: "
            f"₹{stop_loss:.2f}"
        )

        return True


    # =====================================================
    # EXECUTE EXCEPTIONAL OPPORTUNITY
    # =====================================================

    def execute_opportunity(
        self,
        opportunity,
        product_type="INTRADAY"
    ):

        if (

            self.exceptional_trades_today

            >=

            self.max_exceptional_trades
        ):

            print(
                "\nExceptional trade "
                "limit reached."
            )

            return False

        direction = opportunity.get(
            "ExceptionalMomentum"
        )

        if direction not in [
            "LONG",
            "SHORT"
        ]:

            return False

        executed = (
            self.open_position(

                opportunity=
                    opportunity,

                direction=
                    direction,

                trade_type=
                    "EXCEPTIONAL MOMENTUM",

                product_type=
                    product_type
            )
        )

        if executed:

            self.exceptional_trades_today += 1

        return executed


    # =====================================================
    # EXECUTE NORMAL OPPORTUNITY
    # =====================================================

    def execute_normal_opportunity(
        self,
        opportunity,
        product_type="INTRADAY"
    ):

        if (

            self.normal_trades_today

            >=

            self.max_normal_trades
        ):

            print(
                "\nNormal trade "
                "limit reached."
            )

            return False

        direction = opportunity.get(
            "TradeDirection"
        )

        if direction not in [
            "LONG",
            "SHORT"
        ]:

            return False

        executed = (
            self.open_position(

                opportunity=
                    opportunity,

                direction=
                    direction,

                trade_type=
                    "NORMAL",

                product_type=
                    product_type
            )
        )

        if executed:

            self.normal_trades_today += 1

        return executed


    # =====================================================
    # MONITOR POSITION
    # =====================================================

    def monitor_position(
        self,
        symbol,
        current_price
    ):

        if (
            symbol
            not in self.open_positions
        ):

            return

        position = (
            self.open_positions[
                symbol
            ]
        )

        direction = (
            position[
                "Position"
            ]
        )

        trailing_percentage = (
            position[
                "TrailingPercentage"
            ]
        )

        # =====================================
        # LONG TRAILING STOP
        # =====================================

        if direction == "LONG":

            # Update highest price

            if (

                current_price

                >

                position[
                    "HighestPrice"
                ]
            ):

                position[
                    "HighestPrice"
                ] = current_price

                new_stop_loss = (

                    current_price

                    *

                    (
                        1
                        -
                        trailing_percentage
                    )
                )

                # Stop loss can only
                # move upward

                if (

                    new_stop_loss

                    >

                    position[
                        "StopLoss"
                    ]
                ):

                    old_stop = (
                        position[
                            "StopLoss"
                        ]
                    )

                    position[
                        "StopLoss"
                    ] = (
                        new_stop_loss
                    )

                    print(
                        f"\nTrailing SL updated "
                        f"for {symbol}"
                    )

                    print(
                        f"Old SL: "
                        f"₹{old_stop:.2f}"
                    )

                    print(
                        f"New SL: "
                        f"₹{new_stop_loss:.2f}"
                    )

            # =================================
            # LONG STOP LOSS HIT
            # =================================

            if (

                current_price

                <=

                position[
                    "StopLoss"
                ]
            ):

                self.close_position(
                    symbol,
                    current_price,
                    "TRAILING STOP LOSS"
                )


        # =====================================
        # SHORT TRAILING STOP
        # =====================================

        elif direction == "SHORT":

            # Update lowest price

            if (

                current_price

                <

                position[
                    "LowestPrice"
                ]
            ):

                position[
                    "LowestPrice"
                ] = current_price

                new_stop_loss = (

                    current_price

                    *

                    (
                        1
                        +
                        trailing_percentage
                    )
                )

                # Short SL can only
                # move downward

                if (

                    new_stop_loss

                    <

                    position[
                        "StopLoss"
                    ]
                ):

                    old_stop = (
                        position[
                            "StopLoss"
                        ]
                    )

                    position[
                        "StopLoss"
                    ] = (
                        new_stop_loss
                    )

                    print(
                        f"\nTrailing SL updated "
                        f"for {symbol}"
                    )

                    print(
                        f"Old SL: "
                        f"₹{old_stop:.2f}"
                    )

                    print(
                        f"New SL: "
                        f"₹{new_stop_loss:.2f}"
                    )

            # =================================
            # SHORT STOP LOSS HIT
            # =================================

            if (

                current_price

                >=

                position[
                    "StopLoss"
                ]
            ):

                self.close_position(
                    symbol,
                    current_price,
                    "TRAILING STOP LOSS"
                )


    # =====================================================
    # CLOSE POSITION
    # =====================================================

    def close_position(
        self,
        symbol,
        exit_price,
        reason
    ):

        if (
            symbol
            not in self.open_positions
        ):

            return False

        position = (
            self.open_positions[
                symbol
            ]
        )

        direction = (
            position[
                "Position"
            ]
        )

        entry_price = (
            position[
                "EntryPrice"
            ]
        )

        quantity = (
            position[
                "Quantity"
            ]
        )

        position_value = (
            position[
                "PositionValue"
            ]
        )

        # =====================================
        # LONG PROFIT
        # =====================================

        if direction == "LONG":

            profit = (

                exit_price

                -

                entry_price
            ) * quantity

        # =====================================
        # SHORT PROFIT
        # =====================================

        else:

            profit = (

                entry_price

                -

                exit_price
            ) * quantity

        # =====================================
        # RELEASE RESERVED CAPITAL
        # =====================================

        self.cash += (

            position_value

            +

            profit
        )

        self.daily_realized_profit += (
            profit
        )

        # =====================================
        # SAVE TRADE HISTORY
        # =====================================

        self.trade_history.append({

            "Symbol":
                symbol,

            "Action":
                (
                    "SELL"
                    if direction == "LONG"
                    else "BUY TO COVER"
                ),

            "Position":
                direction,

            "TradeType":
                position[
                    "TradeType"
                ],

            "ProductType":
                position[
                    "ProductType"
                ],

            "EntryPrice":
                entry_price,

            "ExitPrice":
                exit_price,

            "Quantity":
                quantity,

            "Profit":
                profit,

            "Reason":
                reason,

            "Time":
                datetime.now()
        })

        print(
            "\n========== "
            "POSITION CLOSED "
            "=========="
        )

        print(
            f"Symbol: "
            f"{symbol}"
        )

        print(
            f"Position: "
            f"{direction}"
        )

        print(
            f"Entry: "
            f"₹{entry_price:.2f}"
        )

        print(
            f"Exit: "
            f"₹{exit_price:.2f}"
        )

        print(
            f"Quantity: "
            f"{quantity}"
        )

        print(
            f"Reason: "
            f"{reason}"
        )

        print(
            f"Profit / Loss: "
            f"₹{profit:.2f}"
        )

        del self.open_positions[
            symbol
        ]

        return True


    # =====================================================
    # DISPLAY PORTFOLIO
    # =====================================================

    def display_portfolio(
        self
    ):

        print(
            "\n========== "
            "PORTFOLIO "
            "=========="
        )

        print(
            f"Available Cash: "
            f"₹{self.cash:.2f}"
        )

        print(
            f"Daily Realized P/L: "
            f"₹{self.daily_realized_profit:.2f}"
        )

        print(
            f"Normal Trades Today: "
            f"{self.normal_trades_today}"
        )

        print(
            f"Exceptional Trades Today: "
            f"{self.exceptional_trades_today}"
        )

        print(
            f"Open Positions: "
            f"{len(self.open_positions)}"
        )

        if not self.open_positions:

            print(
                "No open positions."
            )

            return

        for symbol, position in (
            self.open_positions.items()
        ):

            print(
                "\n--------------------"
            )

            print(
                f"Symbol: "
                f"{symbol}"
            )

            print(
                f"Exchange: "
                f"{position['Exchange']}"
            )

            print(
                f"Position: "
                f"{position['Position']}"
            )

            print(
                f"Trade Type: "
                f"{position['TradeType']}"
            )

            print(
                f"Product Type: "
                f"{position['ProductType']}"
            )

            print(
                f"Entry Price: "
                f"₹{position['EntryPrice']:.2f}"
            )

            print(
                f"Quantity: "
                f"{position['Quantity']}"
            )

            print(
                f"Stop Loss: "
                f"₹{position['StopLoss']:.2f}"
            )

            print(
                f"Momentum Score: "
                f"{position['MomentumScore']}/9"
            )