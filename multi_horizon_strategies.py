"""
Multi-Horizon AI Trading Strategy Engine
Supports:
1. INTRADAY (VWAP + 9/21 EMA + RSI Momentum + Dynamic ATR Trailing SL)
2. SHORT_TERM (1-5 Days Swing: 20/50 EMA + MACD Crossover + Volume Breakout)
3. MEDIUM_TERM (Positional 2-12 Weeks: 50/200 SMA Golden Cross + SuperTrend)
4. LONG_TERM (Value & Momentum Investing: 200 SMA Pullbacks + Valuation Filter)
5. FUTURES_OPTIONS (F&O: Call/Put Options with Black-Scholes Pricing & Accurate Lot Sizes)

Featuring: "PROFIT-LOCK & BREAKEVEN PROTECTION GUARD"
- Breakeven trigger: Moves SL to entry price once trade reaches Target 1 (+1.0% to +1.5%)
- Dynamic Trailing Stop-Loss: Trails after breakeven is activated to lock in peak profits
- Two-stage profit booking: 50% scale-out at Target 1
- Bidirectional Execution: Handles Long/Call and Short/Put
"""

from dataclasses import dataclass
from enum import Enum
from typing import Dict, Any, Optional
import math


class Direction(str, Enum):
    BUY = "BUY"
    SELL = "SELL"
    BUY_CALL = "BUY_CALL"
    BUY_PUT = "BUY_PUT"


class Horizon(str, Enum):
    INTRADAY = "INTRADAY"
    SHORT_TERM = "SHORT_TERM"
    MEDIUM_TERM = "MEDIUM_TERM"
    LONG_TERM = "LONG_TERM"
    F_AND_O = "F_AND_O"


# Standard NSE Lot Sizes for major liquid securities
NSE_LOT_SIZES: Dict[str, int] = {
    "RELIANCE": 250,
    "TCS": 175,
    "HDFCBANK": 550,
    "INFY": 400,
    "ICICIBANK": 700,
    "SBIN": 750,
    "BHARTIARTL": 475,
    "ITC": 1600,
    "TATAMOTORS": 1100,
    "M&M": 350,
    "LT": 175,
    "AXISBANK": 625,
    "KOTAKBANK": 400,
    "WIPRO": 1500,
    "MARUTI": 50,
    "NIFTY": 50,
    "BANKNIFTY": 15,
}


def get_nse_lot_size(symbol: str) -> int:
    clean_sym = symbol.replace(".NS", "").replace("^", "").upper()
    for key, lot in NSE_LOT_SIZES.items():
        if key in clean_sym:
            return lot
    return 250


def norm_cdf(x: float) -> float:
    """Standard normal cumulative distribution function (Abramowitz and Stegun approximation)."""
    return (1.0 + math.erf(x / math.sqrt(2.0))) / 2.0


def black_scholes_price(
    spot: float,
    strike: float,
    tte_days: float = 20.0,
    volatility: float = 0.22,
    rate: float = 0.065,
    option_type: str = "CE"
) -> Dict[str, float]:
    """
    Computes theoretical option price and Delta via Black-Scholes model.
    """
    T = max(1.0 / 365.0, tte_days / 365.0)
    sigma = max(0.05, volatility)
    r = rate

    d1 = (math.log(spot / strike) + (r + 0.5 * sigma ** 2) * T) / (sigma * math.sqrt(T))
    d2 = d1 - sigma * math.sqrt(T)

    if option_type.upper() in ["CE", "CALL"]:
        price = spot * norm_cdf(d1) - strike * math.exp(-r * T) * norm_cdf(d2)
        delta = norm_cdf(d1)
    else:
        price = strike * math.exp(-r * T) * norm_cdf(-d2) - spot * norm_cdf(-d1)
        delta = norm_cdf(d1) - 1.0

    return {
        "price": max(0.5, round(price, 2)),
        "delta": round(delta, 2)
    }


def get_strike_interval(spot: float) -> int:
    """Determines realistic NSE option strike interval based on spot price brackets."""
    if spot < 250:
        return 5
    elif spot < 500:
        return 10
    elif spot < 1500:
        return 20
    elif spot < 3000:
        return 50
    elif spot < 5000:
        return 100
    else:
        return 200


@dataclass
class TradeSignal:
    symbol: str
    horizon: str
    direction: Direction
    entry_price: float
    stop_loss: float
    target_1: float
    target_2: float
    trailing_sl_pct: float
    breakeven_trigger_pct: float
    confidence: float
    rationale: str
    option_contract: Optional[Dict[str, Any]] = None


class ProfitLockGuard:
    """
    Manages Breakeven and Trailing Stop-Loss risk controls:
    - Step 1: Enforces initial protective stop-loss (0.8% - 2%)
    - Step 2: Moves stop-loss to Breakeven (+0.1% covering slippage/brokerage) when gain >= breakeven_trigger_pct
    - Step 3: Books partial profit (50%) at Target 1
    - Step 4: Dynamically trails remainder position ONLY AFTER breakeven is active
    """

    def __init__(
        self,
        entry_price: float,
        direction: str = "BUY",
        initial_sl_pct: float = 0.015,
        breakeven_trigger_pct: float = 0.01,
        trailing_sl_pct: float = 0.01,
        target_1_pct: Optional[float] = None
    ):
        self.entry_price = float(entry_price)
        # Normalize direction
        clean_dir = direction.upper() if isinstance(direction, str) else direction.value
        if clean_dir in ["BUY", "BUY_CALL", "LONG"]:
            self.direction = Direction.BUY
        elif clean_dir in ["SELL", "BUY_PUT", "SHORT"]:
            self.direction = Direction.SELL
        else:
            raise ValueError(f"Invalid direction: {direction}")

        self.initial_sl_pct = initial_sl_pct
        self.breakeven_trigger_pct = breakeven_trigger_pct
        self.trailing_sl_pct = trailing_sl_pct
        self.target_1_pct = target_1_pct or breakeven_trigger_pct

        self.peak_price = entry_price
        self.is_breakeven_activated = False
        self.is_target_1_booked = False

        if self.direction == Direction.BUY:
            self.current_stop_loss = round(entry_price * (1 - initial_sl_pct), 2)
        else:
            self.current_stop_loss = round(entry_price * (1 + initial_sl_pct), 2)

    def update_price(self, current_price: float) -> Dict[str, Any]:
        """
        Updates the profit-lock state based on latest market price tick.
        """
        is_long = self.direction == Direction.BUY
        partial_booked_qty_pct = 0.0

        # Calculate current gain
        if is_long:
            gain_pct = (current_price - self.entry_price) / self.entry_price
            if current_price > self.peak_price:
                self.peak_price = current_price
        else:
            gain_pct = (self.entry_price - current_price) / self.entry_price
            if current_price < self.peak_price:
                self.peak_price = current_price

        # Step 2: Check Breakeven Protection Trigger
        if not self.is_breakeven_activated and gain_pct >= self.breakeven_trigger_pct:
            self.is_breakeven_activated = True
            # Move Stop-Loss to Breakeven (+0.1% to cover brokerage)
            if is_long:
                self.current_stop_loss = max(self.current_stop_loss, round(self.entry_price * 1.001, 2))
            else:
                self.current_stop_loss = min(self.current_stop_loss, round(self.entry_price * 0.999, 2))

        # Step 3: Check Partial Profit Booking at Target 1
        if not self.is_target_1_booked and gain_pct >= self.target_1_pct:
            self.is_target_1_booked = True
            partial_booked_qty_pct = 0.50

        # Step 4: Dynamic Trailing Stop-Loss — trails ONLY after breakeven is active
        # This prevents premature whipsaw exits before reaching the profit threshold
        if self.is_breakeven_activated:
            if is_long:
                trailing_level = round(self.peak_price * (1 - self.trailing_sl_pct), 2)
                if trailing_level > self.current_stop_loss:
                    self.current_stop_loss = trailing_level
            else:
                trailing_level = round(self.peak_price * (1 + self.trailing_sl_pct), 2)
                if trailing_level < self.current_stop_loss:
                    self.current_stop_loss = trailing_level

        # Check Exit conditions
        stopped_out = (current_price <= self.current_stop_loss) if is_long else (current_price >= self.current_stop_loss)

        return {
            "entry_price": self.entry_price,
            "current_price": current_price,
            "peak_price": self.peak_price,
            "current_stop_loss": round(self.current_stop_loss, 2),
            "gain_pct": round(gain_pct * 100, 2),
            "is_breakeven_active": self.is_breakeven_activated,
            "is_target_1_booked": self.is_target_1_booked,
            "partial_booked_qty_pct": partial_booked_qty_pct,
            "is_stopped_out": stopped_out,
            "status": "STOPPED_OUT" if stopped_out else ("PROFIT_LOCKED" if self.is_breakeven_activated else "ACTIVE_RUNNING")
        }


class MultiHorizonStrategyEngine:
    """
    Master Strategy Controller implementing:
    - Intraday Scalping & Momentum (VWAP + EMA9/21 + RSI)
    - Short-Term Swing Trading (EMA20/50 + MACD Crossover + Volume Breakout)
    - Medium-Term Positional (SMA50/200 Golden Cross + SuperTrend)
    - Long-Term Wealth Accumulation (200 SMA Pullback + Valuation Filter)
    - Futures & Options with Black-Scholes Pricing & Strict Trend Direction
    """

    def analyze_intraday(
        self,
        symbol: str,
        price: float,
        vwap: float,
        ema9: float,
        ema21: float,
        rsi: float,
        volume_ratio: float
    ) -> Optional[TradeSignal]:
        """
        Intraday Strategy (1m - 15m):
        - Long on: Price > VWAP, EMA9 > EMA21, RSI 52-70, Volume Ratio >= 1.0
        - Short on: Price < VWAP, EMA9 < EMA21, RSI 30-48, Volume Ratio >= 1.0
        """
        if volume_ratio < 1.0:
            return None

        # Long Trigger (BUY)
        if price > vwap and ema9 > ema21 and 52 <= rsi <= 70:
            sl = round(price * 0.992, 2)         # 0.8% Stop Loss
            t1 = round(price * 1.015, 2)         # 1.5% Target 1
            t2 = round(price * 1.030, 2)         # 3.0% Target 2
            
            # Heuristic confidence based on indicator confluence
            rsi_score = 100 - abs(rsi - 60) * 3
            vol_score = min(100, volume_ratio * 70)
            confidence = round(min(95.0, max(70.0, 0.4 * rsi_score + 0.4 * vol_score + 15)), 1)

            return TradeSignal(
                symbol=symbol,
                horizon=Horizon.INTRADAY.value,
                direction=Direction.BUY,
                entry_price=price,
                stop_loss=sl,
                target_1=t1,
                target_2=t2,
                trailing_sl_pct=0.008,
                breakeven_trigger_pct=0.010,
                confidence=confidence,
                rationale="Price trading above VWAP with Bullish EMA9/21 cross and healthy RSI momentum."
            )

        # Short Trigger (SELL)
        elif price < vwap and ema9 < ema21 and 30 <= rsi <= 48:
            sl = round(price * 1.008, 2)         # 0.8% Stop Loss
            t1 = round(price * 0.985, 2)         # 1.5% Target 1
            t2 = round(price * 0.970, 2)         # 3.0% Target 2

            rsi_score = 100 - abs(rsi - 40) * 3
            vol_score = min(100, volume_ratio * 70)
            confidence = round(min(95.0, max(70.0, 0.4 * rsi_score + 0.4 * vol_score + 15)), 1)

            return TradeSignal(
                symbol=symbol,
                horizon=Horizon.INTRADAY.value,
                direction=Direction.SELL,
                entry_price=price,
                stop_loss=sl,
                target_1=t1,
                target_2=t2,
                trailing_sl_pct=0.008,
                breakeven_trigger_pct=0.010,
                confidence=confidence,
                rationale="Price breaking below VWAP with Bearish EMA9/21 cross and downward momentum."
            )

        return None

    def analyze_short_term(
        self,
        symbol: str,
        price: float,
        ema20: float,
        ema50: float,
        macd: float,
        macd_signal: float,
        rsi: float,
        prev_macd: Optional[float] = None,
        prev_macd_signal: Optional[float] = None,
        volume_ratio: float = 1.0
    ) -> Optional[TradeSignal]:
        """
        Short-Term Swing Strategy (1-5 Days):
        - Bullish: 20 EMA > 50 EMA, MACD line >= Signal line (or fresh cross), RSI in 48-68 zone
        - Bearish: 20 EMA < 50 EMA, MACD line <= Signal line (or fresh cross), RSI in 32-52 zone
        """
        # MACD crossover verification when historical values are provided
        is_bullish_cross = (macd >= macd_signal)
        if prev_macd is not None and prev_macd_signal is not None:
            is_bullish_cross = (prev_macd <= prev_macd_signal) and (macd > macd_signal)

        is_bearish_cross = (macd <= macd_signal)
        if prev_macd is not None and prev_macd_signal is not None:
            is_bearish_cross = (prev_macd >= prev_macd_signal) and (macd < macd_signal)

        if ema20 > ema50 and is_bullish_cross and 48 <= rsi <= 68 and volume_ratio >= 0.9:
            sl = round(price * 0.982, 2)         # 1.8% Stop Loss
            t1 = round(price * 1.035, 2)         # 3.5% Target 1
            t2 = round(price * 1.070, 2)         # 7.0% Target 2
            
            diff_pct = abs(ema20 - ema50) / ema50
            confidence = round(min(94.0, max(72.0, 75.0 + diff_pct * 300 + (volume_ratio - 1.0) * 10)), 1)

            return TradeSignal(
                symbol=symbol,
                horizon=Horizon.SHORT_TERM.value,
                direction=Direction.BUY,
                entry_price=price,
                stop_loss=sl,
                target_1=t1,
                target_2=t2,
                trailing_sl_pct=0.015,
                breakeven_trigger_pct=0.018,
                confidence=confidence,
                rationale="Swing breakout: 20/50 EMA bullish alignment with MACD expansion and volume support."
            )

        elif ema20 < ema50 and is_bearish_cross and 32 <= rsi <= 52 and volume_ratio >= 0.9:
            sl = round(price * 1.018, 2)
            t1 = round(price * 0.965, 2)
            t2 = round(price * 0.930, 2)

            diff_pct = abs(ema20 - ema50) / ema50
            confidence = round(min(94.0, max(72.0, 75.0 + diff_pct * 300 + (volume_ratio - 1.0) * 10)), 1)

            return TradeSignal(
                symbol=symbol,
                horizon=Horizon.SHORT_TERM.value,
                direction=Direction.SELL,
                entry_price=price,
                stop_loss=sl,
                target_1=t1,
                target_2=t2,
                trailing_sl_pct=0.015,
                breakeven_trigger_pct=0.018,
                confidence=confidence,
                rationale="Swing breakdown: Bearish 20/50 EMA alignment confirmed by negative MACD."
            )

        return None

    def analyze_medium_term(
        self,
        symbol: str,
        price: float,
        sma50: float,
        sma200: float,
        supertrend_bullish: bool,
        extension_cap_pct: float = 0.08
    ) -> Optional[TradeSignal]:
        """
        Medium-Term Positional Strategy (2-12 Weeks):
        - Golden Cross regime (50 SMA > 200 SMA)
        - Price sustained above 50 SMA with SuperTrend support
        - Don't chase extension filter: price not more than extension_cap_pct above 50 SMA
        """
        if sma50 > sma200 and price > sma50 and supertrend_bullish:
            # Check extension cap
            extension = (price - sma50) / sma50
            if extension > extension_cap_pct:
                return None  # Price over-extended; wait for pullback

            sl = round(sma50 * 0.97, 2)          # Stop loss 3% below 50 SMA
            t1 = round(price * 1.12, 2)          # 12% Target 1
            t2 = round(price * 1.25, 2)          # 25% Target 2

            confidence = round(min(95.0, max(75.0, 80.0 + (1.0 - extension / extension_cap_pct) * 15)), 1)

            return TradeSignal(
                symbol=symbol,
                horizon=Horizon.MEDIUM_TERM.value,
                direction=Direction.BUY,
                entry_price=price,
                stop_loss=sl,
                target_1=t1,
                target_2=t2,
                trailing_sl_pct=0.035,
                breakeven_trigger_pct=0.040,
                confidence=confidence,
                rationale="Positional Golden Cross with SuperTrend green; multi-month accumulation pattern."
            )
        return None

    def analyze_long_term(
        self,
        symbol: str,
        price: float,
        sma200: float,
        weekly_rsi: float,
        pe_ratio: Optional[float] = None
    ) -> Optional[TradeSignal]:
        """
        Long-Term Wealth Accumulation (Multi-Month to Years):
        - Value Dips: High-quality stock pulls back near 200 SMA (within 5%)
        - Technical filter: Weekly RSI is not overbought (weekly_rsi <= 45)
        - Valuation filter: If PE ratio is supplied, must be reasonable (PE <= 40)
        """
        near_200_sma = abs(price - sma200) / sma200 <= 0.05
        rsi_valid = weekly_rsi <= 45.0
        pe_valid = True if pe_ratio is None else (0 < pe_ratio <= 40.0)

        # Requires BOTH technical base near 200 SMA and weekly oversold/healthy RSI
        if near_200_sma and rsi_valid and pe_valid:
            sl = round(sma200 * 0.90, 2)         # 10% Protection Stop Loss
            t1 = round(price * 1.30, 2)          # 30% Growth Target
            t2 = round(price * 1.60, 2)          # 60% Multi-year Target

            confidence = round(min(96.0, max(75.0, 82.0 + (45.0 - weekly_rsi) * 0.4)), 1)

            return TradeSignal(
                symbol=symbol,
                horizon=Horizon.LONG_TERM.value,
                direction=Direction.BUY,
                entry_price=price,
                stop_loss=sl,
                target_1=t1,
                target_2=t2,
                trailing_sl_pct=0.08,
                breakeven_trigger_pct=0.08,
                confidence=confidence,
                rationale="Value pullback near 200-day SMA; institutional DCA accumulation zone."
            )
        return None

    def analyze_futures_options(
        self,
        symbol: str,
        spot_price: float,
        trend: str,
        implied_volatility: float = 22.0,
        lot_size: Optional[int] = None,
        live_premium: Optional[float] = None
    ) -> Optional[TradeSignal]:
        """
        Futures & Options (F&O) Strategy:
        - Strict trend: BULLISH -> Call Option (CE); BEARISH -> Put Option (PE); Any other value -> None
        - Dynamic strike selection based on underlying price brackets
        - Black-Scholes option pricing model with Delta calculation (or live quote)
        - Lot size derived from exchange registry
        """
        clean_trend = (trend or "").strip().upper()
        if clean_trend not in ["BULLISH", "BEARISH"]:
            # Critical Bug Fix: Never send a PUT on neutral, typo, or invalid input!
            return None

        strike_interval = get_strike_interval(spot_price)
        atm_strike = round(spot_price / strike_interval) * strike_interval
        actual_lot_size = lot_size if (lot_size and lot_size > 0) else get_nse_lot_size(symbol)

        is_call = clean_trend == "BULLISH"
        opt_type = "CE" if is_call else "PE"

        # Pricing from Black-Scholes model if live premium not provided
        bs_calc = black_scholes_price(
            spot=spot_price,
            strike=atm_strike,
            tte_days=20.0,
            volatility=implied_volatility / 100.0,
            option_type=opt_type
        )
        premium = live_premium if (live_premium and live_premium > 0) else bs_calc["price"]
        delta = bs_calc["delta"]

        sl_premium = round(premium * 0.75, 2)    # 25% Stop Loss on option premium
        t1_premium = round(premium * 1.45, 2)    # 45% Target 1 (Scale out 50%)
        t2_premium = round(premium * 2.00, 2)    # 100% Target 2 (Doubler)

        # Heuristic confidence based on delta and trend conviction
        confidence = round(min(95.0, max(72.0, 78.0 + abs(delta) * 20)), 1)

        option_contract_name = f"{symbol.replace('.NS', '')} {int(atm_strike)} {opt_type}"

        if is_call:
            return TradeSignal(
                symbol=symbol,
                horizon=Horizon.F_AND_O.value,
                direction=Direction.BUY_CALL,
                entry_price=spot_price,
                stop_loss=round(spot_price * 0.99, 2),
                target_1=round(spot_price * 1.025, 2),
                target_2=round(spot_price * 1.050, 2),
                trailing_sl_pct=0.015,
                breakeven_trigger_pct=0.012,
                confidence=confidence,
                rationale=f"High momentum Call trigger: ATM Strike {int(atm_strike)} CE selected with Delta {delta} & IV {implied_volatility}%.",
                option_contract={
                    "contract": option_contract_name,
                    "strike": atm_strike,
                    "type": "CALL (CE)",
                    "premium": premium,
                    "stop_loss_premium": sl_premium,
                    "target_1_premium": t1_premium,
                    "target_2_premium": t2_premium,
                    "delta": delta,
                    "iv": f"{implied_volatility}%",
                    "lot_size": actual_lot_size
                }
            )
        else:
            return TradeSignal(
                symbol=symbol,
                horizon=Horizon.F_AND_O.value,
                direction=Direction.BUY_PUT,
                entry_price=spot_price,
                stop_loss=round(spot_price * 1.01, 2),
                target_1=round(spot_price * 0.975, 2),
                target_2=round(spot_price * 0.950, 2),
                trailing_sl_pct=0.015,
                breakeven_trigger_pct=0.012,
                confidence=confidence,
                rationale=f"Downward momentum Put trigger: ATM Strike {int(atm_strike)} PE selected with Delta {delta} & IV {implied_volatility}%.",
                option_contract={
                    "contract": option_contract_name,
                    "strike": atm_strike,
                    "type": "PUT (PE)",
                    "premium": premium,
                    "stop_loss_premium": sl_premium,
                    "target_1_premium": t1_premium,
                    "target_2_premium": t2_premium,
                    "delta": delta,
                    "iv": f"{implied_volatility}%",
                    "lot_size": actual_lot_size
                }
            )


if __name__ == "__main__":
    engine = MultiHorizonStrategyEngine()

    print("=========================================================")
    print("Testing Multi-Horizon Strategy Engine & Profit-Lock Guard")
    print("=========================================================")

    # Test Intraday
    sig_intraday = engine.analyze_intraday("RELIANCE.NS", 2980.0, 2960.0, 2975.0, 2968.0, 62.0, 1.3)
    if sig_intraday:
        print(f"\n[INTRADAY] {sig_intraday.symbol} -> {sig_intraday.direction.value}")
        print(f"Entry: ₹{sig_intraday.entry_price} | SL: ₹{sig_intraday.stop_loss} | T1: ₹{sig_intraday.target_1} | Confidence: {sig_intraday.confidence}%")

    # Test F&O Call
    sig_fo_call = engine.analyze_futures_options("RELIANCE.NS", 2980.0, "BULLISH")
    if sig_fo_call and sig_fo_call.option_contract:
        print(f"\n[F&O CALL] {sig_fo_call.option_contract['contract']} @ Premium ₹{sig_fo_call.option_contract['premium']}")
        print(f"Delta: {sig_fo_call.option_contract['delta']} | Lot Size: {sig_fo_call.option_contract['lot_size']} | Confidence: {sig_fo_call.confidence}%")

    # Test Non-bullish/Non-bearish rejection
    neutral_res = engine.analyze_futures_options("RELIANCE.NS", 2980.0, "NEUTRAL")
    assert neutral_res is None, "Failed: Neutral trend must return None, not a PUT!"
    print("\n[F&O NEUTRAL TEST] Passed: NEUTRAL returns None.")

    # Test Profit-Lock Simulation
    print("\nSimulating 'Profit-Lock & Breakeven Protection Guard':")
    guard = ProfitLockGuard(entry_price=1000.0, initial_sl_pct=0.015, breakeven_trigger_pct=0.01, trailing_sl_pct=0.01)
    
    # Tick 1: Price goes to 1005 (+0.5%) -> Stop loss remains at initial SL 985.0
    t1 = guard.update_price(1005.0)
    assert t1["current_stop_loss"] == 985.0, f"Expected 985.0, got {t1['current_stop_loss']}"
    assert not t1["is_breakeven_active"]

    # Tick 2: Price reaches 1015 (+1.5% -> triggers Breakeven and Target 1 partial booking)
    t2 = guard.update_price(1015.0)
    assert t2["is_breakeven_active"]
    assert t2["is_target_1_booked"]
    assert t2["partial_booked_qty_pct"] == 0.5

    # Tick 3: Price rises to 1030 (+3.0% -> trails up)
    t3 = guard.update_price(1030.0)
    assert t3["current_stop_loss"] == round(1030.0 * 0.99, 2)
    print(f"Price ₹1030 (+3.0%): SL Trailed to ₹{t3['current_stop_loss']} (PROFIT LOCKED!)")

    # Tick 4: Price pulls back to 1018 (hits trailed SL at ₹1019.7)
    t4 = guard.update_price(1018.0)
    assert t4["is_stopped_out"]
    print(f"Price pulls back to ₹1018: Status = {t4['status']}, Stopped out with profit: {t4['gain_pct']}%!")
    print("\nAll Multi-Horizon Strategy Engine assertions passed successfully!")
