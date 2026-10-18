"""
Quantitative Institutional Risk Manager & Execution Guard
Implements:
- Dynamic Position Sizing based on actual stop-loss distance (not fixed percentage)
- Account risk budgeting with round-trip brokerage/tax deduction
- Direction normalization (BUY/SELL & LONG/SHORT) with strict validation
- Portfolio Risk Controls: Daily Loss Limit, Max Drawdown Kill Switch, Max Open Positions
- Dynamic ATR-based Stop Loss computation
- Minimum 1.5x Reward-to-Risk (R:R) filter for swing and positional setups
- Time-of-day entry filter (09:30 - 14:45 IST) for intraday execution
- Medium-term 'Don't Chase' extension cap
- Exchange tick-size rounding (0.05 tick size)
"""

from typing import Optional, Dict, Any, Union
from datetime import datetime, time


def round_to_tick(price: float, tick_size: float = 0.05) -> float:
    """Rounds price to the nearest exchange tick size (0.05 on NSE/BSE)."""
    if price <= 0:
        return 0.0
    return round(round(price / tick_size) * tick_size, 2)


class RiskManager:

    def __init__(
        self,
        risk_per_trade: float = 0.01,         # 1% account risk per trade
        max_position_size: float = 0.20,       # 20% max portfolio allocation per position
        daily_loss_limit_pct: float = 0.03,    # 3% daily account loss threshold
        max_drawdown_limit_pct: float = 0.05,  # 5% max drawdown circuit breaker
        max_open_positions: int = 5,           # Maximum concurrent active positions
        round_trip_cost: float = 40.0,         # Estimated round-trip brokerage & statutory costs
        tick_size: float = 0.05
    ):
        self.risk_per_trade = risk_per_trade
        self.max_position_size = max_position_size
        self.daily_loss_limit_pct = daily_loss_limit_pct
        self.max_drawdown_limit_pct = max_drawdown_limit_pct
        self.max_open_positions = max_open_positions
        self.round_trip_cost = round_trip_cost
        self.tick_size = tick_size

    def normalize_direction(self, direction: str) -> str:
        """
        Normalizes direction string across both strategy engine and risk manager conventions.
        Accepts: BUY, LONG, BUY_CALL -> 'BUY'
        Accepts: SELL, SHORT, BUY_PUT -> 'SELL'
        Raises ValueError on any invalid or unrecognized string.
        """
        if not direction or not isinstance(direction, str):
            raise ValueError(f"Invalid direction type: {direction}")

        clean = direction.strip().upper()
        if clean in ["BUY", "LONG", "BUY_CALL"]:
            return "BUY"
        elif clean in ["SELL", "SHORT", "BUY_PUT"]:
            return "SELL"
        else:
            raise ValueError(f"Unrecognized trading direction: '{direction}'. Must be BUY/LONG or SELL/SHORT.")

    def calculate_position_size(
        self,
        capital: float,
        entry_price: float,
        stop_loss: Optional[float] = None,
        lot_size: int = 1,
        default_sl_pct: float = 0.015
    ) -> int:
        """
        Calculates position size using the signal's actual stop price distance.
        Formula:
          stop_distance = abs(entry_price - stop_loss)
          risk_budget = (capital * risk_per_trade) - round_trip_cost
          shares_by_risk = risk_budget / stop_distance
          shares_by_capital = (capital * max_position_size) / entry_price
          shares = min(shares_by_risk, shares_by_capital) rounded to lot_size
        """
        if capital <= 0 or entry_price <= 0:
            return 0

        # Determine actual stop-loss price
        if stop_loss is None or stop_loss <= 0 or stop_loss == entry_price:
            stop_distance = entry_price * default_sl_pct
        else:
            stop_distance = abs(entry_price - stop_loss)

        if stop_distance <= 0:
            return 0

        # Account risk budgeting (deducting estimated execution costs)
        gross_risk_amount = capital * self.risk_per_trade
        net_risk_budget = max(0.0, gross_risk_amount - self.round_trip_cost)

        shares_by_risk = net_risk_budget / stop_distance

        # Maximum capital allocation constraint
        max_investment = capital * self.max_position_size
        shares_by_capital = max_investment / entry_price

        raw_shares = min(shares_by_risk, shares_by_capital)

        # Lot size rounding
        lot = max(1, lot_size)
        shares = int(raw_shares // lot) * lot

        return max(0, shares)

    def calculate_atr_stop(
        self,
        entry_price: float,
        atr: float,
        direction: str = "BUY",
        atr_multiplier: float = 1.5
    ) -> float:
        """
        Computes dynamic ATR-based protective stop loss.
        """
        norm_dir = self.normalize_direction(direction)
        buffer_amount = atr * atr_multiplier

        if norm_dir == "BUY":
            raw_sl = entry_price - buffer_amount
        else:
            raw_sl = entry_price + buffer_amount

        return round_to_tick(raw_sl, self.tick_size)

    def validate_reward_to_risk(
        self,
        entry_price: float,
        stop_loss: float,
        target_1: float,
        min_ratio: float = 1.5
    ) -> Dict[str, Any]:
        """
        Enforces a minimum Reward-to-Risk ratio (default 1.5x) on swing and positional setups.
        """
        risk_distance = abs(entry_price - stop_loss)
        reward_distance = abs(target_1 - entry_price)

        if risk_distance <= 0:
            return {"is_valid": False, "ratio": 0.0, "reason": "Stop loss cannot equal entry price."}

        ratio = round(reward_distance / risk_distance, 2)
        is_valid = ratio >= min_ratio

        return {
            "is_valid": is_valid,
            "ratio": ratio,
            "min_required": min_ratio,
            "reason": f"R:R ratio {ratio}x is {'acceptable' if is_valid else 'below minimum required ' + str(min_ratio) + 'x'}."
        }

    def is_within_intraday_window(
        self,
        check_time: Optional[Union[datetime, time, str]] = None,
        start_str: str = "09:30",
        end_str: str = "14:45"
    ) -> bool:
        """
        Entry filter for intraday trades:
        Avoid opening fresh intraday positions during initial 15m opening volatility (< 09:30)
        or within 45m of market close (> 14:45).
        """
        start_h, start_m = map(int, start_str.split(":"))
        end_h, end_m = map(int, end_str.split(":"))
        start_t = time(start_h, start_m)
        end_t = time(end_h, end_m)

        if check_time is None:
            t = datetime.now().time()
        elif isinstance(check_time, datetime):
            t = check_time.time()
        elif isinstance(check_time, time):
            t = check_time
        elif isinstance(check_time, str):
            h, m = map(int, check_time.split(":")[:2])
            t = time(h, m)
        else:
            return False

        return start_t <= t <= end_t

    def validate_extension_cap(
        self,
        price: float,
        sma50: float,
        max_extension_pct: float = 0.08
    ) -> bool:
        """
        Medium-term 'don't chase' extension filter.
        Prevents buying if stock is overextended (> 8%) above its 50 SMA.
        """
        if sma50 <= 0:
            return False
        extension = (price - sma50) / sma50
        return extension <= max_extension_pct

    def check_portfolio_risk_guard(
        self,
        current_open_positions: int,
        daily_loss_realized: float,
        account_capital: float,
        current_drawdown_pct: float = 0.0
    ) -> Dict[str, Any]:
        """
        Portfolio-level kill switch checks:
        1. Max open positions reached
        2. Daily loss limit breached
        3. Max drawdown kill switch triggered
        """
        if account_capital <= 0:
            return {"allowed": False, "reason": "Account capital must be positive."}

        # 1. Max positions check
        if current_open_positions >= self.max_open_positions:
            return {
                "allowed": False,
                "reason": f"Maximum open position limit ({self.max_open_positions}) reached. Cannot take new trades."
            }

        # 2. Daily loss limit check
        daily_loss_pct = abs(daily_loss_realized) / account_capital if daily_loss_realized < 0 else 0.0
        if daily_loss_pct >= self.daily_loss_limit_pct:
            return {
                "allowed": False,
                "reason": f"Daily loss limit ({self.daily_loss_limit_pct * 100:.1f}%) breached ({daily_loss_pct * 100:.1f}%). Trading halted for session."
            }

        # 3. Max drawdown kill switch
        if current_drawdown_pct >= self.max_drawdown_limit_pct:
            return {
                "allowed": False,
                "reason": f"Max drawdown circuit breaker ({self.max_drawdown_limit_pct * 100:.1f}%) tripped. Trading halted."
            }

        return {"allowed": True, "reason": "Portfolio risk limits within approved parameters."}

    def get_stop_loss(
        self,
        entry_price: float,
        direction: str = "BUY",
        stop_loss_pct: float = 0.015
    ) -> float:
        """Returns protective stop loss rounded to tick size."""
        norm_dir = self.normalize_direction(direction)
        if norm_dir == "BUY":
            raw = entry_price * (1 - stop_loss_pct)
        else:
            raw = entry_price * (1 + stop_loss_pct)
        return round_to_tick(raw, self.tick_size)

    def get_take_profit(
        self,
        entry_price: float,
        direction: str = "BUY",
        take_profit_pct: float = 0.035
    ) -> float:
        """Returns target profit price rounded to tick size."""
        norm_dir = self.normalize_direction(direction)
        if norm_dir == "BUY":
            raw = entry_price * (1 + take_profit_pct)
        else:
            raw = entry_price * (1 - take_profit_pct)
        return round_to_tick(raw, self.tick_size)


if __name__ == "__main__":
    rm = RiskManager(
        risk_per_trade=0.01,
        max_position_size=0.20,
        daily_loss_limit_pct=0.03,
        max_drawdown_limit_pct=0.05,
        max_open_positions=3,
        round_trip_cost=40.0
    )

    print("=========================================================")
    print("Testing Risk Manager with Actual Stop Distance Sizing")
    print("=========================================================")

    capital = 100000.0  # ₹100,000

    # Test 1: Sizing with tight 0.8% intraday stop (Entry 1000, SL 992 -> distance 8)
    # Risk budget: 100000 * 0.01 - 40 = 960. Shares = 960 / 8 = 120 shares
    shares_intraday = rm.calculate_position_size(capital, entry_price=1000.0, stop_loss=992.0)
    print(f"Intraday (0.8% stop @ ₹992): {shares_intraday} shares (Invested: ₹{shares_intraday * 1000})")
    assert shares_intraday == 20 or shares_intraday == 120, f"Expected 120 (bounded by cap 20% = 20000 / 1000 = 20 shares if max cap applies)"
    # Max cap = 20,000 / 1000 = 20 shares! That correctly enforces max position size!
    assert shares_intraday == 20

    # Test 2: Direction normalization and error handling
    assert rm.normalize_direction("BUY") == "BUY"
    assert rm.normalize_direction("LONG") == "BUY"
    assert rm.normalize_direction("BUY_CALL") == "BUY"
    assert rm.normalize_direction("SELL") == "SELL"
    assert rm.normalize_direction("SHORT") == "SELL"
    assert rm.normalize_direction("BUY_PUT") == "SELL"
    try:
        rm.normalize_direction("UNKNOWN")
        assert False, "Should raise ValueError on invalid direction"
    except ValueError:
        print("Direction normalization rejection test passed!")

    # Test 3: Minimum 1.5x Reward-to-Risk ratio check
    rr_good = rm.validate_reward_to_risk(entry_price=100.0, stop_loss=98.0, target_1=104.0)
    assert rr_good["is_valid"] and rr_good["ratio"] == 2.0
    print(f"R:R 2.0x validation: {rr_good['reason']}")

    rr_bad = rm.validate_reward_to_risk(entry_price=100.0, stop_loss=98.0, target_1=101.0)
    assert not rr_bad["is_valid"] and rr_bad["ratio"] == 0.5
    print(f"R:R 0.5x rejection: {rr_bad['reason']}")

    # Test 4: Time window filter
    assert rm.is_within_intraday_window("10:15")
    assert not rm.is_within_intraday_window("09:15")
    assert not rm.is_within_intraday_window("15:10")
    print("Intraday time window filter passed!")

    # Test 5: Portfolio risk kill switch
    guard_ok = rm.check_portfolio_risk_guard(current_open_positions=1, daily_loss_realized=-500, account_capital=100000)
    assert guard_ok["allowed"]

    guard_loss_tripped = rm.check_portfolio_risk_guard(current_open_positions=1, daily_loss_realized=-3500, account_capital=100000)
    assert not guard_loss_tripped["allowed"]
    print(f"Daily loss limit kill switch passed: {guard_loss_tripped['reason']}")

    print("\nAll Risk Manager tests passed successfully!")