from risk_manager import RiskManager


def run_intraday_backtest(
    data,
    initial_balance=100000,
    brokerage_rate=0.0003,
    slippage_rate=0.0005,
    max_trades_per_day=3,
    max_daily_loss_percentage=1.0,
    cooldown_minutes=30,
    max_consecutive_losses=2,
    allow_momentum_exception=True
):

    # =====================================
    # ACCOUNT VARIABLES
    # =====================================

    cash = initial_balance

    position = None
    quantity = 0

    entry_price = None
    entry_cost = 0

    stop_loss = None
    take_profit = None

    trades = []

    total_transaction_cost = 0
    realized_profit = 0

    # Track whether current position
    # is a normal or exceptional trade
    current_trade_type = None

    # =====================================
    # DAILY RISK CONTROL VARIABLES
    # =====================================

    current_trading_day = None

    daily_starting_balance = (
        initial_balance
    )

    daily_realized_profit = 0

    trades_today = 0

    consecutive_losses = 0

    last_exit_time = None

    momentum_exception_used = False

    # =====================================
    # STATISTICS
    # =====================================

    normal_trades_count = 0

    exceptional_trades_count = 0

    daily_limit_blocks = 0

    cooldown_blocks = 0

    consecutive_loss_blocks = 0

    max_trade_blocks = 0

    # =====================================
    # RISK MANAGER
    # =====================================

    risk_manager = RiskManager(
        risk_per_trade=0.005,
        max_position_size=0.20,
        stop_loss_percentage=0.005,
        take_profit_percentage=0.01
    )

    # =====================================
    # PROCESS EACH CANDLE
    # =====================================

    for i in range(len(data)):

        timestamp = data.index[i]

        day = timestamp.date()

        open_price = float(
            data["Open"].iloc[i]
        )

        high_price = float(
            data["High"].iloc[i]
        )

        low_price = float(
            data["Low"].iloc[i]
        )

        close_price = float(
            data["Close"].iloc[i]
        )

        signal = (
            data["Signal"].iloc[i]
        )

        # =================================
        # GET EXCEPTIONAL MOMENTUM SIGNAL
        # =================================

        # The multi-stock scanner we build
        # next will eventually generate
        # this column.
        #
        # Possible values:
        #
        # NONE
        # LONG
        # SHORT

        if (
            "ExceptionalMomentum"
            in data.columns
        ):

            exceptional_signal = (
                data[
                    "ExceptionalMomentum"
                ].iloc[i]
            )

        else:

            exceptional_signal = "NONE"

        # =================================
        # RESET DAILY RISK CONTROLS
        # =================================

        if (
            current_trading_day
            != day
        ):

            current_trading_day = day

            daily_starting_balance = (
                cash
            )

            daily_realized_profit = 0

            trades_today = 0

            consecutive_losses = 0

            last_exit_time = None

            momentum_exception_used = (
                False
            )

        # =================================
        # CHECK LAST CANDLE OF DAY
        # =================================

        if i == len(data) - 1:

            is_last_candle_of_day = True

        else:

            next_day = (
                data.index[i + 1]
                .date()
            )

            is_last_candle_of_day = (
                next_day != day
            )

        # =================================
        # DAILY LOSS LIMIT
        # =================================

        daily_loss_limit = (

            daily_starting_balance

            * max_daily_loss_percentage

            / 100
        )

        daily_loss_limit_reached = (

            daily_realized_profit

            <=

            -daily_loss_limit
        )

        # =================================
        # COOLDOWN CHECK
        # =================================

        cooldown_active = False

        if last_exit_time is not None:

            minutes_since_last_exit = (

                timestamp
                - last_exit_time

            ).total_seconds() / 60

            if (
                minutes_since_last_exit
                < cooldown_minutes
            ):

                cooldown_active = True

        # =================================
        # MANAGE LONG POSITION
        # =================================

        if position == "LONG":

            exit_price = None
            exit_reason = None

            # -----------------------------
            # Gap below stop loss
            # -----------------------------

            if (
                open_price
                <= stop_loss
            ):

                exit_price = (
                    open_price
                )

                exit_reason = (
                    "STOP LOSS GAP"
                )

            # -----------------------------
            # Stop loss
            # -----------------------------

            elif (
                low_price
                <= stop_loss
            ):

                exit_price = (
                    stop_loss
                )

                exit_reason = (
                    "STOP LOSS"
                )

            # -----------------------------
            # Take profit
            # -----------------------------

            elif (
                high_price
                >= take_profit
            ):

                exit_price = (
                    take_profit
                )

                exit_reason = (
                    "TAKE PROFIT"
                )

            # -----------------------------
            # Opposite signal
            # -----------------------------

            elif signal == "SELL":

                exit_price = (
                    close_price
                )

                exit_reason = (
                    "OPPOSITE SIGNAL"
                )

            # -----------------------------
            # End of day
            # -----------------------------

            elif is_last_candle_of_day:

                exit_price = (
                    close_price
                )

                exit_reason = (
                    "END OF DAY"
                )

            # =================================
            # EXECUTE LONG EXIT
            # =================================

            if exit_price is not None:

                execution_price = (

                    exit_price

                    * (
                        1
                        - slippage_rate
                    )
                )

                sale_value = (

                    execution_price

                    * quantity
                )

                exit_cost = (

                    sale_value

                    * brokerage_rate
                )

                gross_profit = (

                    execution_price

                    - entry_price

                ) * quantity

                net_profit = (

                    gross_profit

                    - entry_cost

                    - exit_cost
                )

                cash += (

                    sale_value

                    - exit_cost
                )

                total_transaction_cost += (
                    exit_cost
                )

                realized_profit += (
                    net_profit
                )

                daily_realized_profit += (
                    net_profit
                )

                # Update last exit time
                last_exit_time = timestamp

                # Update consecutive losses
                if net_profit > 0:

                    consecutive_losses = 0

                else:

                    consecutive_losses += 1

                trades.append({

                    "Date":
                        timestamp,

                    "Action":
                        "SELL",

                    "Position":
                        "LONG",

                    "TradeType":
                        current_trade_type,

                    "Reason":
                        exit_reason,

                    "Price":
                        execution_price,

                    "Quantity":
                        quantity,

                    "GrossProfit":
                        gross_profit,

                    "EntryCost":
                        entry_cost,

                    "ExitCost":
                        exit_cost,

                    "Profit":
                        net_profit,

                    "DailyProfit":
                        daily_realized_profit,

                    "Cash":
                        cash
                })

                # Reset position
                position = None

                quantity = 0

                entry_price = None

                entry_cost = 0

                stop_loss = None

                take_profit = None

                current_trade_type = None

                continue

        # =================================
        # MANAGE SHORT POSITION
        # =================================

        elif position == "SHORT":

            exit_price = None
            exit_reason = None

            # -----------------------------
            # Gap above stop loss
            # -----------------------------

            if (
                open_price
                >= stop_loss
            ):

                exit_price = (
                    open_price
                )

                exit_reason = (
                    "STOP LOSS GAP"
                )

            # -----------------------------
            # Stop loss
            # -----------------------------

            elif (
                high_price
                >= stop_loss
            ):

                exit_price = (
                    stop_loss
                )

                exit_reason = (
                    "STOP LOSS"
                )

            # -----------------------------
            # Take profit
            # -----------------------------

            elif (
                low_price
                <= take_profit
            ):

                exit_price = (
                    take_profit
                )

                exit_reason = (
                    "TAKE PROFIT"
                )

            # -----------------------------
            # Opposite signal
            # -----------------------------

            elif signal == "BUY":

                exit_price = (
                    close_price
                )

                exit_reason = (
                    "OPPOSITE SIGNAL"
                )

            # -----------------------------
            # End of day
            # -----------------------------

            elif is_last_candle_of_day:

                exit_price = (
                    close_price
                )

                exit_reason = (
                    "END OF DAY"
                )

            # =================================
            # EXECUTE SHORT EXIT
            # =================================

            if exit_price is not None:

                execution_price = (

                    exit_price

                    * (
                        1
                        + slippage_rate
                    )
                )

                buyback_value = (

                    execution_price

                    * quantity
                )

                exit_cost = (

                    buyback_value

                    * brokerage_rate
                )

                gross_profit = (

                    entry_price

                    - execution_price

                ) * quantity

                net_profit = (

                    gross_profit

                    - entry_cost

                    - exit_cost
                )

                reserved_capital = (

                    entry_price

                    * quantity
                )

                cash += (

                    reserved_capital

                    + gross_profit

                    - exit_cost
                )

                total_transaction_cost += (
                    exit_cost
                )

                realized_profit += (
                    net_profit
                )

                daily_realized_profit += (
                    net_profit
                )

                # Update exit time
                last_exit_time = timestamp

                # Update consecutive losses
                if net_profit > 0:

                    consecutive_losses = 0

                else:

                    consecutive_losses += 1

                trades.append({

                    "Date":
                        timestamp,

                    "Action":
                        "BUY TO COVER",

                    "Position":
                        "SHORT",

                    "TradeType":
                        current_trade_type,

                    "Reason":
                        exit_reason,

                    "Price":
                        execution_price,

                    "Quantity":
                        quantity,

                    "GrossProfit":
                        gross_profit,

                    "EntryCost":
                        entry_cost,

                    "ExitCost":
                        exit_cost,

                    "Profit":
                        net_profit,

                    "DailyProfit":
                        daily_realized_profit,

                    "Cash":
                        cash
                })

                # Reset position
                position = None

                quantity = 0

                entry_price = None

                entry_cost = 0

                stop_loss = None

                take_profit = None

                current_trade_type = None

                continue

        # =================================
        # DO NOT OPEN TRADE AT EOD
        # =================================

        if is_last_candle_of_day:

            continue

        # =================================
        # RECALCULATE DAILY LOSS STATUS
        # =================================

        daily_loss_limit_reached = (

            daily_realized_profit

            <=

            -daily_loss_limit
        )

        # =================================
        # NORMAL TRADING PERMISSION
        # =================================

        normal_trade_allowed = (

            trades_today
            < max_trades_per_day

            and

            not daily_loss_limit_reached

            and

            consecutive_losses
            < max_consecutive_losses

            and

            not cooldown_active
        )

        # =================================
        # EXCEPTIONAL TRADE PERMISSION
        # =================================

        # IMPORTANT:
        #
        # The exceptional trade can bypass
        # the normal 3-trade limit.
        #
        # It CANNOT bypass:
        #
        # 1. Daily loss limit
        # 2. Consecutive loss protection
        # 3. One exception per day

        exceptional_trade_allowed = (

            allow_momentum_exception

            and

            trades_today
            >= max_trades_per_day

            and

            not momentum_exception_used

            and

            not daily_loss_limit_reached

            and

            consecutive_losses
            < max_consecutive_losses

            and

            not cooldown_active

            and

            exceptional_signal
            in [
                "LONG",
                "SHORT"
            ]
        )

        # =================================
        # DETERMINE ENTRY TYPE
        # =================================

        entry_direction = None

        trade_type = None

        # -----------------------------
        # Normal signal
        # -----------------------------

        if normal_trade_allowed:

            if signal == "BUY":

                entry_direction = (
                    "LONG"
                )

                trade_type = (
                    "NORMAL"
                )

            elif signal == "SELL":

                entry_direction = (
                    "SHORT"
                )

                trade_type = (
                    "NORMAL"
                )

        # -----------------------------
        # Exceptional momentum
        # -----------------------------

        elif exceptional_trade_allowed:

            entry_direction = (
                exceptional_signal
            )

            trade_type = (
                "EXCEPTIONAL MOMENTUM"
            )

        # =================================
        # OPEN LONG POSITION
        # =================================

        if (
            position is None

            and

            entry_direction
            == "LONG"
        ):

            execution_price = (

                close_price

                * (
                    1
                    + slippage_rate
                )
            )

            new_quantity = (

                risk_manager
                .calculate_position_size(

                    capital=cash,

                    entry_price=
                        execution_price
                )
            )

            if new_quantity > 0:

                position_value = (

                    execution_price

                    * new_quantity
                )

                new_entry_cost = (

                    position_value

                    * brokerage_rate
                )

                total_required = (

                    position_value

                    + new_entry_cost
                )

                if (
                    total_required
                    <= cash
                ):

                    cash -= (
                        total_required
                    )

                    total_transaction_cost += (
                        new_entry_cost
                    )

                    position = "LONG"

                    quantity = (
                        new_quantity
                    )

                    entry_price = (
                        execution_price
                    )

                    entry_cost = (
                        new_entry_cost
                    )

                    current_trade_type = (
                        trade_type
                    )

                    stop_loss = (

                        risk_manager
                        .get_stop_loss(

                            entry_price,

                            "LONG"
                        )
                    )

                    take_profit = (

                        risk_manager
                        .get_take_profit(

                            entry_price,

                            "LONG"
                        )
                    )

                    # ---------------------
                    # UPDATE COUNTERS
                    # ---------------------

                    if (
                        trade_type
                        == "NORMAL"
                    ):

                        trades_today += 1

                        normal_trades_count += 1

                    else:

                        momentum_exception_used = (
                            True
                        )

                        exceptional_trades_count += (
                            1
                        )

                    trades.append({

                        "Date":
                            timestamp,

                        "Action":
                            "BUY",

                        "Position":
                            "LONG",

                        "TradeType":
                            trade_type,

                        "Reason":

                            (
                                "BUY SIGNAL"

                                if trade_type
                                == "NORMAL"

                                else

                                "EXCEPTIONAL MOMENTUM"
                            ),

                        "Price":
                            entry_price,

                        "Quantity":
                            quantity,

                        "StopLoss":
                            stop_loss,

                        "TakeProfit":
                            take_profit,

                        "TransactionCost":
                            entry_cost,

                        "TradesToday":
                            trades_today,

                        "Cash":
                            cash
                    })

        # =================================
        # OPEN SHORT POSITION
        # =================================

        elif (
            position is None

            and

            entry_direction
            == "SHORT"
        ):

            execution_price = (

                close_price

                * (
                    1
                    - slippage_rate
                )
            )

            new_quantity = (

                risk_manager
                .calculate_position_size(

                    capital=cash,

                    entry_price=
                        execution_price
                )
            )

            if new_quantity > 0:

                position_value = (

                    execution_price

                    * new_quantity
                )

                new_entry_cost = (

                    position_value

                    * brokerage_rate
                )

                total_required = (

                    position_value

                    + new_entry_cost
                )

                if (
                    total_required
                    <= cash
                ):

                    # Reserve capital
                    cash -= (
                        total_required
                    )

                    total_transaction_cost += (
                        new_entry_cost
                    )

                    position = "SHORT"

                    quantity = (
                        new_quantity
                    )

                    entry_price = (
                        execution_price
                    )

                    entry_cost = (
                        new_entry_cost
                    )

                    current_trade_type = (
                        trade_type
                    )

                    stop_loss = (

                        risk_manager
                        .get_stop_loss(

                            entry_price,

                            "SHORT"
                        )
                    )

                    take_profit = (

                        risk_manager
                        .get_take_profit(

                            entry_price,

                            "SHORT"
                        )
                    )

                    # ---------------------
                    # UPDATE COUNTERS
                    # ---------------------

                    if (
                        trade_type
                        == "NORMAL"
                    ):

                        trades_today += 1

                        normal_trades_count += 1

                    else:

                        momentum_exception_used = (
                            True
                        )

                        exceptional_trades_count += (
                            1
                        )

                    trades.append({

                        "Date":
                            timestamp,

                        "Action":
                            "SHORT SELL",

                        "Position":
                            "SHORT",

                        "TradeType":
                            trade_type,

                        "Reason":

                            (
                                "SELL SIGNAL"

                                if trade_type
                                == "NORMAL"

                                else

                                "EXCEPTIONAL MOMENTUM"
                            ),

                        "Price":
                            entry_price,

                        "Quantity":
                            quantity,

                        "StopLoss":
                            stop_loss,

                        "TakeProfit":
                            take_profit,

                        "TransactionCost":
                            entry_cost,

                        "TradesToday":
                            trades_today,

                        "Cash":
                            cash
                    })

        # =================================
        # TRACK BLOCK REASONS
        # =================================

        if (
            position is None

            and

            signal in [
                "BUY",
                "SELL"
            ]
        ):

            if daily_loss_limit_reached:

                daily_limit_blocks += 1

            elif (
                consecutive_losses
                >= max_consecutive_losses
            ):

                consecutive_loss_blocks += (
                    1
                )

            elif cooldown_active:

                cooldown_blocks += 1

            elif (
                trades_today
                >= max_trades_per_day
            ):

                max_trade_blocks += 1

    # =====================================
    # SAFETY CHECK
    # =====================================

    if position is not None:

        print(
            "WARNING: Position remained "
            "open after backtest."
        )

    # =====================================
    # COMPLETED TRADES
    # =====================================

    completed_trades = [

        trade

        for trade in trades

        if trade["Action"]

        in [
            "SELL",
            "BUY TO COVER"
        ]
    ]

    # =====================================
    # WINNING / LOSING TRADES
    # =====================================

    winning_trades = [

        trade

        for trade in completed_trades

        if trade["Profit"] > 0
    ]

    losing_trades = [

        trade

        for trade in completed_trades

        if trade["Profit"] <= 0
    ]

    total_completed = len(
        completed_trades
    )

    # =====================================
    # WIN RATE
    # =====================================

    if total_completed > 0:

        win_rate = (

            len(winning_trades)

            /

            total_completed

        ) * 100

    else:

        win_rate = 0

    # =====================================
    # EXIT STATISTICS
    # =====================================

    stop_loss_exits = len([

        trade

        for trade in completed_trades

        if "STOP LOSS"
        in trade["Reason"]
    ])

    take_profit_exits = len([

        trade

        for trade in completed_trades

        if trade["Reason"]
        == "TAKE PROFIT"
    ])

    opposite_signal_exits = len([

        trade

        for trade in completed_trades

        if trade["Reason"]
        == "OPPOSITE SIGNAL"
    ])

    end_of_day_exits = len([

        trade

        for trade in completed_trades

        if trade["Reason"]
        == "END OF DAY"
    ])

    # =====================================
    # LONG / SHORT STATISTICS
    # =====================================

    long_trades = len([

        trade

        for trade in completed_trades

        if trade["Position"]
        == "LONG"
    ])

    short_trades = len([

        trade

        for trade in completed_trades

        if trade["Position"]
        == "SHORT"
    ])

    # =====================================
    # PROFIT CALCULATION
    # =====================================

    profit_loss = (

        cash

        - initial_balance
    )

    profit_percentage = (

        profit_loss

        / initial_balance

    ) * 100

    # =====================================
    # RETURN RESULT
    # =====================================

    return {

        "initial_balance":
            initial_balance,

        "final_cash":
            cash,

        "portfolio_value":
            cash,

        "position":
            position,

        "quantity":
            quantity,

        "realized_profit":
            realized_profit,

        "profit_loss":
            profit_loss,

        "profit_percentage":
            profit_percentage,

        "total_transaction_cost":
            total_transaction_cost,

        "completed_trades":
            total_completed,

        "winning_trades":
            len(winning_trades),

        "losing_trades":
            len(losing_trades),

        "win_rate":
            win_rate,

        "long_trades":
            long_trades,

        "short_trades":
            short_trades,

        "normal_trades":
            normal_trades_count,

        "exceptional_trades":
            exceptional_trades_count,

        "stop_loss_exits":
            stop_loss_exits,

        "take_profit_exits":
            take_profit_exits,

        "opposite_signal_exits":
            opposite_signal_exits,

        "end_of_day_exits":
            end_of_day_exits,

        "daily_limit_blocks":
            daily_limit_blocks,

        "cooldown_blocks":
            cooldown_blocks,

        "consecutive_loss_blocks":
            consecutive_loss_blocks,

        "max_trade_blocks":
            max_trade_blocks,

        "trades":
            trades
    }