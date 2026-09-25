from risk_manager import RiskManager


def run_backtest(
    data,
    initial_balance=100000,
    brokerage_rate=0.0003,
    slippage_rate=0.0005,
    allow_short=True
):

    cash = initial_balance

    # Current position
    position = None

    quantity = 0

    entry_price = None
    entry_cost = 0

    stop_loss = None
    take_profit = None

    trades = []

    total_transaction_cost = 0
    realized_profit = 0

    risk_manager = RiskManager(
        risk_per_trade=0.01,
        max_position_size=0.20,
        stop_loss_percentage=0.02,
        take_profit_percentage=0.05
    )

    # =====================================
    # PROCESS MARKET DATA
    # =====================================

    for i in range(len(data)):

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

        signal = data["Signal"].iloc[i]

        date = data.index[i]

        # =================================
        # MANAGE LONG POSITION
        # =================================

        if position == "LONG":

            exit_price = None
            exit_reason = None

            # Gap below stop loss
            if open_price <= stop_loss:

                exit_price = open_price

                exit_reason = (
                    "STOP LOSS GAP"
                )

            # Stop loss hit
            elif low_price <= stop_loss:

                exit_price = stop_loss

                exit_reason = (
                    "STOP LOSS"
                )

            # Take profit hit
            elif high_price >= take_profit:

                exit_price = take_profit

                exit_reason = (
                    "TAKE PROFIT"
                )

            # Opposite signal
            elif signal == "SELL":

                exit_price = close_price

                exit_reason = (
                    "SELL SIGNAL"
                )

            # Execute LONG exit
            if exit_price is not None:

                execution_price = (
                    exit_price *
                    (1 - slippage_rate)
                )

                sale_value = (
                    execution_price *
                    quantity
                )

                exit_cost = (
                    sale_value *
                    brokerage_rate
                )

                gross_profit = (
                    execution_price -
                    entry_price
                ) * quantity

                net_profit = (
                    gross_profit
                    - entry_cost
                    - exit_cost
                )

                cash += (
                    sale_value -
                    exit_cost
                )

                total_transaction_cost += (
                    exit_cost
                )

                realized_profit += (
                    net_profit
                )

                trades.append({

                    "Date":
                        date,

                    "Action":
                        "SELL",

                    "Position":
                        "LONG",

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

                # Don't open another position
                # on the same candle
                continue


        # =================================
        # MANAGE SHORT POSITION
        # =================================

        if position == "SHORT":

            exit_price = None
            exit_reason = None

            # Gap above stop loss
            if open_price >= stop_loss:

                exit_price = open_price

                exit_reason = (
                    "STOP LOSS GAP"
                )

            # Stop loss hit
            elif high_price >= stop_loss:

                exit_price = stop_loss

                exit_reason = (
                    "STOP LOSS"
                )

            # Take profit hit
            elif low_price <= take_profit:

                exit_price = take_profit

                exit_reason = (
                    "TAKE PROFIT"
                )

            # Opposite signal
            elif signal == "BUY":

                exit_price = close_price

                exit_reason = (
                    "BUY SIGNAL"
                )

            # Execute SHORT exit
            if exit_price is not None:

                execution_price = (
                    exit_price *
                    (1 + slippage_rate)
                )

                buyback_value = (
                    execution_price *
                    quantity
                )

                exit_cost = (
                    buyback_value *
                    brokerage_rate
                )

                gross_profit = (
                    entry_price -
                    execution_price
                ) * quantity

                net_profit = (
                    gross_profit
                    - entry_cost
                    - exit_cost
                )

                # Return reserved capital
                # plus trading profit/loss
                position_capital = (
                    entry_price *
                    quantity
                )

                cash += (
                    position_capital
                    + gross_profit
                    - exit_cost
                )

                total_transaction_cost += (
                    exit_cost
                )

                realized_profit += (
                    net_profit
                )

                trades.append({

                    "Date":
                        date,

                    "Action":
                        "BUY TO COVER",

                    "Position":
                        "SHORT",

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

                continue


        # =================================
        # OPEN LONG POSITION
        # =================================

        if (
            position is None
            and signal == "BUY"
        ):

            execution_price = (
                close_price *
                (1 + slippage_rate)
            )

            new_quantity = (
                risk_manager
                .calculate_position_size(
                    capital=cash,
                    entry_price=execution_price
                )
            )

            if new_quantity > 0:

                position_value = (
                    execution_price *
                    new_quantity
                )

                new_entry_cost = (
                    position_value *
                    brokerage_rate
                )

                total_required = (
                    position_value
                    + new_entry_cost
                )

                if total_required <= cash:

                    cash -= total_required

                    total_transaction_cost += (
                        new_entry_cost
                    )

                    position = "LONG"

                    quantity = new_quantity

                    entry_price = (
                        execution_price
                    )

                    entry_cost = (
                        new_entry_cost
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

                    trades.append({

                        "Date":
                            date,

                        "Action":
                            "BUY",

                        "Position":
                            "LONG",

                        "Reason":
                            "BUY SIGNAL",

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

                        "Cash":
                            cash
                    })


        # =================================
        # OPEN SHORT POSITION
        # =================================

        elif (
            position is None
            and signal == "SELL"
            and allow_short
        ):

            execution_price = (
                close_price *
                (1 - slippage_rate)
            )

            new_quantity = (
                risk_manager
                .calculate_position_size(
                    capital=cash,
                    entry_price=execution_price
                )
            )

            if new_quantity > 0:

                position_value = (
                    execution_price *
                    new_quantity
                )

                new_entry_cost = (
                    position_value *
                    brokerage_rate
                )

                # Reserve capital
                total_required = (
                    position_value
                    + new_entry_cost
                )

                if total_required <= cash:

                    cash -= total_required

                    total_transaction_cost += (
                        new_entry_cost
                    )

                    position = "SHORT"

                    quantity = new_quantity

                    entry_price = (
                        execution_price
                    )

                    entry_cost = (
                        new_entry_cost
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

                    trades.append({

                        "Date":
                            date,

                        "Action":
                            "SHORT SELL",

                        "Position":
                            "SHORT",

                        "Reason":
                            "SELL SIGNAL",

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

                        "Cash":
                            cash
                    })


    # =====================================
    # FINAL PORTFOLIO VALUE
    # =====================================

    last_price = float(
        data["Close"].iloc[-1]
    )

    position_value = 0

    unrealized_profit = 0

    # Open LONG
    if position == "LONG":

        position_value = (
            quantity *
            last_price
        )

        unrealized_profit = (
            last_price -
            entry_price
        ) * quantity

        portfolio_value = (
            cash +
            position_value
        )

    # Open SHORT
    elif position == "SHORT":

        reserved_capital = (
            entry_price *
            quantity
        )

        unrealized_profit = (
            entry_price -
            last_price
        ) * quantity

        portfolio_value = (
            cash
            + reserved_capital
            + unrealized_profit
        )

    else:

        portfolio_value = cash


    profit_loss = (
        portfolio_value -
        initial_balance
    )

    profit_percentage = (
        profit_loss /
        initial_balance
    ) * 100


    # =====================================
    # TRADE STATISTICS
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


    if total_completed > 0:

        win_rate = (

            len(winning_trades)
            /
            total_completed

        ) * 100

    else:

        win_rate = 0


    return {

        "initial_balance":
            initial_balance,

        "final_cash":
            cash,

        "position":
            position,

        "quantity":
            quantity,

        "position_value":
            position_value,

        "portfolio_value":
            portfolio_value,

        "realized_profit":
            realized_profit,

        "unrealized_profit":
            unrealized_profit,

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

        "trades":
            trades
    }