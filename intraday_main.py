from intraday_market_data import (
    get_intraday_data
)

from intraday_strategy import (
    apply_intraday_strategy
)

from intraday_trader import (
    run_intraday_backtest
)


def main():

    stock_symbol = "RELIANCE.NS"

    initial_balance = 100000

    print(
        f"\nTesting intraday strategy: "
        f"{stock_symbol}"
    )

    # =====================================
    # 1. DOWNLOAD 5-MINUTE DATA
    # =====================================

    data = get_intraday_data(
        symbol=stock_symbol,
        period="30d",
        interval="5m"
    )

    if data is None:

        print(
            "Could not download "
            "intraday data."
        )

        return

    # =====================================
    # 2. APPLY INTRADAY STRATEGY
    # =====================================

    data = apply_intraday_strategy(
        data
    )

    # =====================================
    # 3. DISPLAY SIGNALS
    # =====================================

    signals = data[
        data["Signal"].isin(
            ["BUY", "SELL"]
        )
    ]

    print(
        "\n========== "
        "INTRADAY SIGNALS "
        "=========="
    )

    if signals.empty:

        print(
            "No signals generated."
        )

    else:

        for index, row in (
            signals.iterrows()
        ):

            print(
                f"{index} | "
                f"{row['Signal']} | "
                f"Price: ₹{row['Close']:.2f} | "
                f"EMA9: {row['EMA_9']:.2f} | "
                f"EMA21: {row['EMA_21']:.2f} | "
                f"RSI: {row['RSI']:.2f} | "
                f"VWAP: ₹{row['VWAP']:.2f} | "
                f"Volume: {int(row['Volume'])} | "
                f"Avg Volume: "
                f"{int(row['Volume_MA'])}"
            )

    # =====================================
    # 4. RUN PAPER TRADING
    # =====================================

    result = run_intraday_backtest(
        data=data,
        initial_balance=100000,
        max_trades_per_day=3,
        max_daily_loss_percentage=1.0,
        cooldown_minutes=30,
        max_consecutive_losses=2,
        allow_momentum_exception=True
    )

    # =====================================
    # 5. DISPLAY EXECUTED TRADES
    # =====================================

    print(
        "\n========== "
        "INTRADAY TRADES "
        "=========="
    )

    if len(result["trades"]) == 0:

        print(
            "No trades executed."
        )

    else:

        for trade in result["trades"]:

            # -----------------------------
            # OPENING TRADE
            # -----------------------------

            if trade["Action"] in [
                "BUY",
                "SHORT SELL"
            ]:

                print(
                    f"{trade['Date']} | "
                    f"{trade['Action']} | "
                    f"{trade['Position']} | "
                    f"Price: "
                    f"₹{trade['Price']:.2f} | "
                    f"Qty: "
                    f"{trade['Quantity']} | "
                    f"SL: "
                    f"₹{trade['StopLoss']:.2f} | "
                    f"TP: "
                    f"₹{trade['TakeProfit']:.2f}"
                )

            # -----------------------------
            # CLOSING TRADE
            # -----------------------------

            elif trade["Action"] in [
                "SELL",
                "BUY TO COVER"
            ]:

                print(
                    f"{trade['Date']} | "
                    f"{trade['Action']} | "
                    f"{trade['Position']} | "
                    f"Reason: "
                    f"{trade['Reason']} | "
                    f"Price: "
                    f"₹{trade['Price']:.2f} | "
                    f"Qty: "
                    f"{trade['Quantity']} | "
                    f"P/L: "
                    f"₹{trade['Profit']:.2f}"
                )

    # =====================================
    # 6. DISPLAY FINAL RESULT
    # =====================================

    print(
        "\n========== "
        "INTRADAY BACKTEST RESULT "
        "=========="
    )

    print(
        f"Initial Balance: "
        f"₹{result['initial_balance']:.2f}"
    )

    print(
        f"Final Balance: "
        f"₹{result['final_cash']:.2f}"
    )

    print(
        f"Net Profit / Loss: "
        f"₹{result['profit_loss']:.2f}"
    )

    print(
        f"Return: "
        f"{result['profit_percentage']:.2f}%"
    )

    print(
        f"Transaction Costs: "
        f"₹{result['total_transaction_cost']:.2f}"
    )

    print(
        "\n---------- "
        "TRADE STATISTICS "
        "----------"
    )

    print(
        f"Completed Trades: "
        f"{result['completed_trades']}"
    )

    print(
        f"Winning Trades: "
        f"{result['winning_trades']}"
    )

    print(
        f"Losing Trades: "
        f"{result['losing_trades']}"
    )

    print(
        f"Win Rate: "
        f"{result['win_rate']:.2f}%"
    )

    print(
        f"LONG Trades: "
        f"{result['long_trades']}"
    )

    print(
        f"SHORT Trades: "
        f"{result['short_trades']}"
    )

    print(
        "\n---------- "
        "EXIT STATISTICS "
        "----------"
    )

    print(
        f"Stop Loss Exits: "
        f"{result['stop_loss_exits']}"
    )

    print(
        f"Take Profit Exits: "
        f"{result['take_profit_exits']}"
    )

    print(
        f"Opposite Signal Exits: "
        f"{result['opposite_signal_exits']}"
    )

    print(
        f"End Of Day Exits: "
        f"{result['end_of_day_exits']}"
    )

    print(
        "\n---------- "
        "POSITION CHECK "
        "----------"
    )
    

    print(
        f"Current Position: "
        f"{result['position']}"
    )

    print(
        f"Quantity: "
        f"{result['quantity']}"
    )
    print(
    "\n---------- "
    "RISK CONTROL STATISTICS "
    "----------"
    )

    print(
        f"Normal Trades: "
        f"{result['normal_trades']}"
    )

    print(
        f"Exceptional Momentum Trades: "
        f"{result['exceptional_trades']}"
    )

    print(
        f"Blocked By Max Trades: "
        f"{result['max_trade_blocks']}"
    )

    print(
        f"Blocked By Cooldown: "
        f"{result['cooldown_blocks']}"
    )

    print(
        f"Blocked By Daily Loss Limit: "
        f"{result['daily_limit_blocks']}"
    )

    print(
        f"Blocked By Consecutive Losses: "
        f"{result['consecutive_loss_blocks']}"
    )


if __name__ == "__main__":
    main()