class RiskManager:

    def __init__(
        self,
        risk_per_trade=0.01,
        max_position_size=0.20,
        stop_loss_percentage=0.02,
        take_profit_percentage=0.05
    ):
        """
        risk_per_trade:
        Maximum account risk per trade.
        0.01 = 1%

        max_position_size:
        Maximum percentage of capital in one position.
        0.20 = 20%

        stop_loss_percentage:
        0.02 = 2%

        take_profit_percentage:
        0.05 = 5%
        """

        self.risk_per_trade = risk_per_trade
        self.max_position_size = max_position_size
        self.stop_loss_percentage = stop_loss_percentage
        self.take_profit_percentage = take_profit_percentage


    def calculate_position_size(self, capital, entry_price):

        # Maximum money we are willing to lose
        risk_amount = capital * self.risk_per_trade

        # Loss per share if stop-loss is triggered
        risk_per_share = entry_price * self.stop_loss_percentage

        if risk_per_share <= 0:
            return 0

        # Position size based on risk
        shares_by_risk = int(
            risk_amount / risk_per_share
        )

        # Maximum allowed investment
        max_investment = (
            capital * self.max_position_size
        )

        shares_by_capital = int(
            max_investment / entry_price
        )

        return min(
            shares_by_risk,
            shares_by_capital
        )


    def get_stop_loss(self, entry_price, position_type="LONG"):

        if position_type == "LONG":
            return entry_price * (
                1 - self.stop_loss_percentage
            )

        elif position_type == "SHORT":
            return entry_price * (
                1 + self.stop_loss_percentage
            )


    def get_take_profit(self, entry_price, position_type="LONG"):

        if position_type == "LONG":
            return entry_price * (
                1 + self.take_profit_percentage
            )

        elif position_type == "SHORT":
            return entry_price * (
                1 - self.take_profit_percentage
            )