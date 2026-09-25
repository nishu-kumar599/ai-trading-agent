from market_data import get_stock_data
from strategy import apply_strategy
from paper_trader import run_backtest


def main():

    stock_symbol = "RELIANCE.NS"

    print(f"\nTesting strategy for: {stock_symbol}")

    # ==========================================
    # 1. DOWNLOAD MARKET DATA
    # ==========================================

    data = get_stock_data(
        symbol=stock_symbol,
        period="2y",
        interval="1d"
    )

    if data is None:
        print("Could not download stock data.")
        return

    # ==========================================
    # 2. APPLY TRADING STRATEGY
    # ==========================================

    data = apply_strategy(data)

    # ==========================================
    # 3. RUN PAPER TRADING / BACKTEST
    # ==========================================

    result = run_backtest(
        data,
        initial_balance=100000,
        allow_short=True
    )

    # ==========================================
    # 4. DISPLAY TRADES
    # ==========================================

    print("\n========== TRADES ==========")

    if len(result["trades"]) == 0:

        print("No trades generated.")

    else:

        for trade in result["trades"]:

            # ----------------------------------
            # OPENING TRADE
            # ----------------------------------

            if trade["Action"] in [
                "BUY",
                "SHORT SELL"
            ]:

                print(
                    f"{trade['Date']} | "
                    f"{trade['Action']} | "
                    f"Position: {trade['Position']} | "
                    f"Price: ₹{trade['Price']:.2f} | "
                    f"Quantity: {trade['Quantity']} | "
                    f"Stop Loss: ₹{trade['StopLoss']:.2f} | "
                    f"Take Profit: ₹{trade['TakeProfit']:.2f} | "
                    f"Cash: ₹{trade['Cash']:.2f}"
                )

            # ----------------------------------
            # CLOSING TRADE
            # ----------------------------------

            elif trade["Action"] in [
                "SELL",
                "BUY TO COVER"
            ]:

                print(
                    f"{trade['Date']} | "
                    f"{trade['Action']} | "
                    f"Position: {trade['Position']} | "
                    f"Reason: {trade['Reason']} | "
                    f"Price: ₹{trade['Price']:.2f} | "
                    f"Quantity: {trade['Quantity']} | "
                    f"Profit: ₹{trade['Profit']:.2f} | "
                    f"Cash: ₹{trade['Cash']:.2f}"
                )

    # ==========================================
    # 5. DISPLAY FINAL BACKTEST RESULT
    # ==========================================

    print("\n========== BACKTEST RESULT ==========")

    print(
        f"Initial Balance: "
        f"₹{result['initial_balance']:.2f}"
    )

    print(
        f"Final Cash: "
        f"₹{result['final_cash']:.2f}"
    )

    # Changed from shares_held to quantity
    print(
        f"Current Position: "
        f"{result['position']}"
    )

    print(
        f"Quantity: "
        f"{result['quantity']}"
    )

    print(
        f"Position Value: "
        f"₹{result['position_value']:.2f}"
    )

    print(
        f"Portfolio Value: "
        f"₹{result['portfolio_value']:.2f}"
    )

    print(
        f"Realized P/L: "
        f"₹{result['realized_profit']:.2f}"
    )

    print(
        f"Unrealized P/L: "
        f"₹{result['unrealized_profit']:.2f}"
    )

    print(
        f"Total Profit / Loss: "
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


if __name__ == "__main__":
    main()