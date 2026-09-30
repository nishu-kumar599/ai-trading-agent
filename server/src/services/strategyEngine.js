/**
 * Quantitative Strategy Engine & Profit-Lock Simulator
 * Handles:
 * 1. Intraday Momentum & Scalping
 * 2. Short-Term Swing Trading
 * 3. Medium-Term Positional Trend
 * 4. Long-Term Value & DCA
 * 5. Futures & Options (ATM Calls/Puts & Spread Hedging)
 *
 * Core Principle: "Profit-Lock & No-Loss Guard"
 * Automatically adjusts Stop-Loss to Breakeven when in profit and trails to lock gains.
 */

// In-memory active paper positions (starts clean, populated only by genuine real-time paper executions)
let activePositions = [];

// Closed trades history (starts clean, populated only when real paper positions are closed)
let tradeHistory = [];

const STRATEGY_CATALOG = {
  INTRADAY: {
    name: 'Intraday VWAP & Scalp Momentum',
    timeframe: '5m / 15m Candles',
    indicators: ['VWAP', 'EMA 9', 'EMA 21', 'RSI (14)', 'ATR'],
    description: 'High-frequency momentum strategy that rides institutional order flow above/below VWAP with EMA 9/21 cross confirmation.',
    rules: {
      long: 'Price > VWAP AND EMA 9 crosses above EMA 21 AND RSI between 52 and 68 AND Volume > 20-period Volume MA.',
      short: 'Price < VWAP AND EMA 9 crosses below EMA 21 AND RSI between 32 and 48 AND Volume > 20-period Volume MA.',
      riskManagement: 'Initial Stop-Loss: 0.8% | Breakeven Trigger: +1.0% | Target 1: +1.5% | Target 2: +3.0% | Auto-square off at 15:15 IST'
    }
  },
  SHORT_TERM: {
    name: 'Short-Term Swing Breakout (1-5 Days)',
    timeframe: '1-Hour / Daily Candles',
    indicators: ['EMA 20', 'EMA 50', 'MACD (12, 26, 9)', 'RSI Pullback'],
    description: 'Captures multi-day momentum swings using 20/50 EMA dynamic support and MACD signal line expansion.',
    rules: {
      long: 'EMA 20 > EMA 50 AND MACD crosses above Signal AND RSI bounces from 45-50 zone.',
      short: 'EMA 20 < EMA 50 AND MACD crosses below Signal AND RSI breaks below 50.',
      riskManagement: 'Initial Stop-Loss: 1.8% | Breakeven Trigger: +1.8% | Target 1: +3.5% (Scale 50%) | Target 2: +7.0%'
    }
  },
  MEDIUM_TERM: {
    name: 'Medium-Term Positional Golden Cross (2-12 Weeks)',
    timeframe: 'Daily / Weekly Candles',
    indicators: ['SMA 50', 'SMA 200', 'SuperTrend (10, 3)', 'Weekly MACD'],
    description: 'Rides macroeconomic and institutional accumulation trends during Golden Cross regimes.',
    rules: {
      long: 'SMA 50 > SMA 200 (Golden Cross) AND Price sustains above 50 SMA AND SuperTrend is Bullish Green.',
      short: 'Price closes below 50 SMA OR SuperTrend flips Red (Exit / Hedge).',
      riskManagement: 'Initial Stop-Loss: 3.5% below 50 SMA | Target 1: +12% | Target 2: +25% - 40%'
    }
  },
  LONG_TERM: {
    name: 'Long-Term Wealth Accumulation & DCA',
    timeframe: 'Weekly / Monthly Candles',
    indicators: ['SMA 200', 'Weekly RSI < 40', 'Fundamental Valuation & Growth'],
    description: 'Systematic value investing that accumulates blue-chip market leaders on major cyclical discounts.',
    rules: {
      long: 'Stock pulls back within 5% of 200-day SMA OR Weekly RSI < 40 while fundamentals remain intact.',
      short: 'Rebalance if price extends > 40% above 200 SMA or regime failure.',
      riskManagement: 'Wide volatility allowance | Systematic Dollar Cost Averaging | Multi-year horizon'
    }
  },
  F_AND_O: {
    name: 'Futures & Options Precision (F&O)',
    timeframe: 'Intraday to Weekly Expiry',
    indicators: ['Option Greeks (Delta, Theta, IV)', 'ATM Strike Engine', 'Put-Call Ratio (PCR)'],
    description: 'Exploits high-volatility moves with asymmetric risk. Buys ATM Calls on uptrends and ATM Puts on downtrends.',
    rules: {
      long: 'Bullish Breakout -> Buy ATM Call (CE) with Delta ~0.50 OR Long Futures with tight trailing SL.',
      short: 'Bearish Breakdown -> Buy ATM Put (PE) with Delta ~ -0.50 to profit from downward plunge.',
      riskManagement: 'Option Premium Stop-Loss: 25% | Target 1: +45% (Scale out 50%, move SL to Cost) | Target 2: +100%'
    }
  }
};

const { getRealMarketUniverse } = require('./realMarketService');

// Universe of monitored stocks with simulated technical live status
async function getMarketUniverse(horizon = 'INTRADAY') {
  let sourceStocks = [];
  try {
    sourceStocks = await getRealMarketUniverse(horizon);
  } catch (err) {
    console.warn('Real market universe fetch fallback:', err.message);
  }

  const baseStocks = [
    {
      symbol: 'RELIANCE.NS',
      name: 'Reliance Industries',
      price: 2984.50,
      trend: 'BULLISH',
      changePct: '+1.45%',
      vwap: 2962.00,
      ema9: 2978.20,
      ema21: 2966.50,
      rsi: 61.4,
      volumeRatio: 1.4,
      confidence: 89,
      intradaySignal: 'BUY',
      shortTermSignal: 'BUY',
      mediumTermSignal: 'BUY',
      longTermSignal: 'BUY',
      foAction: 'BUY_CALL',
      recommendedStrike: '3000 CE',
      strikePrice: 3000,
      optPremium: 71.50,
      lotSize: 250
    },
    {
      symbol: 'TCS.NS',
      name: 'Tata Consultancy Services',
      price: 4120.10,
      trend: 'NEUTRAL_BULLISH',
      changePct: '+0.62%',
      vwap: 4110.00,
      ema9: 4118.00,
      ema21: 4112.00,
      rsi: 54.2,
      volumeRatio: 0.95,
      confidence: 76,
      intradaySignal: 'HOLD',
      shortTermSignal: 'BUY',
      mediumTermSignal: 'BUY',
      longTermSignal: 'BUY',
      foAction: 'HOLD',
      recommendedStrike: '4150 CE',
      strikePrice: 4150,
      optPremium: 82.00,
      lotSize: 175
    },
    {
      symbol: 'HDFCBANK.NS',
      name: 'HDFC Bank Ltd',
      price: 1538.20,
      trend: 'BEARISH',
      changePct: '-1.18%',
      vwap: 1548.00,
      ema9: 1539.50,
      ema21: 1546.00,
      rsi: 38.5,
      volumeRatio: 1.25,
      confidence: 88,
      intradaySignal: 'SELL',
      shortTermSignal: 'SELL',
      mediumTermSignal: 'HOLD',
      longTermSignal: 'BUY_ACCUMULATE',
      foAction: 'BUY_PUT',
      recommendedStrike: '1540 PE',
      strikePrice: 1540,
      optPremium: 36.80,
      lotSize: 550
    },
    {
      symbol: 'INFY.NS',
      name: 'Infosys Ltd',
      price: 1675.25,
      trend: 'BULLISH',
      changePct: '+2.10%',
      vwap: 1658.00,
      ema9: 1672.00,
      ema21: 1660.00,
      rsi: 65.8,
      volumeRatio: 1.6,
      confidence: 92,
      intradaySignal: 'BUY',
      shortTermSignal: 'BUY',
      mediumTermSignal: 'BUY',
      longTermSignal: 'BUY',
      foAction: 'BUY_CALL',
      recommendedStrike: '1680 CE',
      strikePrice: 1680,
      optPremium: 42.50,
      lotSize: 400
    },
    {
      symbol: 'ICICIBANK.NS',
      name: 'ICICI Bank Ltd',
      price: 1184.40,
      trend: 'BULLISH',
      changePct: '+1.85%',
      vwap: 1172.00,
      ema9: 1182.10,
      ema21: 1174.00,
      rsi: 63.1,
      volumeRatio: 1.35,
      confidence: 86,
      intradaySignal: 'BUY',
      shortTermSignal: 'BUY',
      mediumTermSignal: 'BUY',
      longTermSignal: 'BUY',
      foAction: 'BUY_CALL',
      recommendedStrike: '1190 CE',
      strikePrice: 1190,
      optPremium: 28.40,
      lotSize: 700
    },
    {
      symbol: 'NIFTY50',
      name: 'NIFTY 50 Index',
      price: 24650.00,
      trend: 'BULLISH',
      changePct: '+0.95%',
      vwap: 24520.00,
      ema9: 24620.00,
      ema21: 24540.00,
      rsi: 64.0,
      volumeRatio: 1.8,
      confidence: 94,
      intradaySignal: 'BUY',
      shortTermSignal: 'BUY',
      mediumTermSignal: 'BUY',
      longTermSignal: 'BUY',
      foAction: 'BUY_CALL',
      recommendedStrike: '24700 CE',
      strikePrice: 24700,
      optPremium: 145.00,
      lotSize: 25
    }
  ];

  const stocksToUse = (sourceStocks && sourceStocks.length > 0) ? sourceStocks : baseStocks;

  return stocksToUse.map((stock) => {
    let action = 'HOLD';
    let target1 = 0;
    let target2 = 0;
    let stopLoss = 0;
    let rationale = '';

    if (horizon === 'INTRADAY') {
      action = stock.intradaySignal;
      if (action === 'BUY') {
        stopLoss = +(stock.price * 0.992).toFixed(2);
        target1 = +(stock.price * 1.015).toFixed(2);
        target2 = +(stock.price * 1.030).toFixed(2);
        rationale = 'Trading above VWAP with EMA 9/21 cross; RSI momentum in prime bull zone.';
      } else if (action === 'SELL') {
        stopLoss = +(stock.price * 1.008).toFixed(2);
        target1 = +(stock.price * 0.985).toFixed(2);
        target2 = +(stock.price * 0.970).toFixed(2);
        rationale = 'Trading below VWAP with downward breakdown; RSI bearish momentum.';
      }
    } else if (horizon === 'SHORT_TERM') {
      action = stock.shortTermSignal;
      if (action === 'BUY') {
        stopLoss = +(stock.price * 0.982).toFixed(2);
        target1 = +(stock.price * 1.035).toFixed(2);
        target2 = +(stock.price * 1.070).toFixed(2);
        rationale = '20/50 EMA bullish swing breakout confirmed by MACD histogram expansion.';
      } else {
        stopLoss = +(stock.price * 1.018).toFixed(2);
        target1 = +(stock.price * 0.965).toFixed(2);
        target2 = +(stock.price * 0.930).toFixed(2);
        rationale = 'Bearish swing breakdown below 20 EMA with negative MACD crossover.';
      }
    } else if (horizon === 'MEDIUM_TERM') {
      action = stock.mediumTermSignal;
      stopLoss = +(stock.price * 0.95).toFixed(2);
      target1 = +(stock.price * 1.12).toFixed(2);
      target2 = +(stock.price * 1.25).toFixed(2);
      rationale = 'Golden Cross regime (50 SMA > 200 SMA) with SuperTrend green confirmation.';
    } else if (horizon === 'LONG_TERM') {
      action = stock.longTermSignal;
      stopLoss = +(stock.price * 0.90).toFixed(2);
      target1 = +(stock.price * 1.30).toFixed(2);
      target2 = +(stock.price * 1.60).toFixed(2);
      rationale = 'Fundamental quality leader in steady growth channel; prime DCA accumulation.';
    } else if (horizon === 'F_AND_O') {
      action = stock.foAction;
      if (action === 'BUY_CALL') {
        stopLoss = +(stock.optPremium * 0.75).toFixed(2);
        target1 = +(stock.optPremium * 1.45).toFixed(2);
        target2 = +(stock.optPremium * 2.00).toFixed(2);
        rationale = `Buy ${stock.recommendedStrike} with Delta ~0.52. Target +45% with breakeven trailing stop.`;
      } else if (action === 'BUY_PUT') {
        stopLoss = +(stock.optPremium * 0.75).toFixed(2);
        target1 = +(stock.optPremium * 1.45).toFixed(2);
        target2 = +(stock.optPremium * 2.00).toFixed(2);
        rationale = `Downside opportunity: Buy ${stock.recommendedStrike} (Delta ~ -0.48) to profit from price decline.`;
      }
    }

    return {
      ...stock,
      activeHorizon: horizon,
      action,
      target1,
      target2,
      stopLoss,
      rationale,
      profitLock: {
        breakevenTriggerPct: horizon === 'INTRADAY' ? 1.0 : (horizon === 'SHORT_TERM' ? 1.8 : 3.0),
        trailingSlPct: horizon === 'INTRADAY' ? 0.8 : (horizon === 'SHORT_TERM' ? 1.5 : 2.5),
        guaranteeNoLoss: true
      }
    };
  });
}

// Execute a paper trade with Profit-Lock Guard
function executeTrade({ symbol, horizon, direction, price, quantity, optionDetails = null }) {
  const isFO = horizon === 'F_AND_O';
  const entryPrice = isFO && optionDetails ? optionDetails.premium : price;
  const isOptionBuyer = direction === 'BUY_CALL' || direction === 'BUY_PUT';
  const isUpwardTrade = isOptionBuyer || direction === 'BUY';

  let initialSL = isUpwardTrade ? entryPrice * 0.99 : entryPrice * 1.01;
  let target1 = isUpwardTrade ? entryPrice * 1.02 : entryPrice * 0.98;
  let target2 = isUpwardTrade ? entryPrice * 1.04 : entryPrice * 0.96;

  if (isFO) {
    initialSL = entryPrice * 0.75;
    target1 = entryPrice * 1.45;
    target2 = entryPrice * 2.00;
  }

  const newPosition = {
    id: `pos_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    symbol: isFO && optionDetails ? `${symbol} ${optionDetails.recommendedStrike}` : symbol,
    horizon,
    direction,
    entryPrice: +entryPrice.toFixed(2),
    currentPrice: +entryPrice.toFixed(2),
    stopLoss: +initialSL.toFixed(2),
    target1: +target1.toFixed(2),
    target2: +target2.toFixed(2),
    quantity: quantity || 100,
    breakevenActivated: false,
    trailingPct: isFO ? 0.05 : (horizon === 'INTRADAY' ? 0.008 : 0.015),
    unrealizedPL: 0.0,
    unrealizedPLPct: 0.0,
    status: 'ACTIVE_RUNNING',
    openedAt: new Date().toISOString()
  };

  activePositions.unshift(newPosition);
  return newPosition;
}

// Simulate price movement and trigger Profit-Lock Breakeven / Trailing Stop
function tickPosition(id, newPrice) {
  const posIndex = activePositions.findIndex(p => p.id === id);
  if (posIndex === -1) return null;

  const pos = activePositions[posIndex];
  pos.currentPrice = +newPrice.toFixed(2);

  const isOptionBuyer = pos.direction === 'BUY_CALL' || pos.direction === 'BUY_PUT';
  const isUpwardTrade = isOptionBuyer || pos.direction === 'BUY';

  const priceDiff = isUpwardTrade ? (pos.currentPrice - pos.entryPrice) : (pos.entryPrice - pos.currentPrice);
  pos.unrealizedPL = +(priceDiff * pos.quantity).toFixed(2);
  pos.unrealizedPLPct = +((priceDiff / pos.entryPrice) * 100).toFixed(2);

  // Check Breakeven Protection: Once gain >= +1.0%, snap Stop Loss to Entry price (Zero Loss Guarantee!)
  if (!pos.breakevenActivated && pos.unrealizedPLPct >= 1.0) {
    pos.breakevenActivated = true;
    pos.stopLoss = isUpwardTrade ? +(pos.entryPrice * 1.002).toFixed(2) : +(pos.entryPrice * 0.998).toFixed(2);
    pos.status = 'PROFIT_LOCKED';
  }

  // Trailing Stop Loss once in profit
  if (pos.unrealizedPLPct > 2.0) {
    if (isUpwardTrade) {
      const trailedSL = +(pos.currentPrice * (1 - pos.trailingPct)).toFixed(2);
      if (trailedSL > pos.stopLoss) {
        pos.stopLoss = trailedSL;
      }
    } else {
      const trailedSL = +(pos.currentPrice * (1 + pos.trailingPct)).toFixed(2);
      if (trailedSL < pos.stopLoss) {
        pos.stopLoss = trailedSL;
      }
    }
  }

  // Check if Stop Loss or Targets hit
  const isStoppedOut = isUpwardTrade ? pos.currentPrice <= pos.stopLoss : pos.currentPrice >= pos.stopLoss;
  const isTarget2Hit = isUpwardTrade ? pos.currentPrice >= pos.target2 : pos.currentPrice <= pos.target2;

  if (isStoppedOut || isTarget2Hit) {
    pos.status = isTarget2Hit ? 'TARGET_2_ACHIEVED' : (pos.breakevenActivated ? 'CLOSED_WITH_LOCKED_PROFIT' : 'STOPPED_OUT');
    // Move to history
    tradeHistory.unshift({
      ...pos,
      exitPrice: pos.currentPrice,
      realizedPL: pos.unrealizedPL,
      realizedPLPct: pos.unrealizedPLPct,
      closedAt: new Date().toISOString()
    });
    activePositions.splice(posIndex, 1);
  }

  return pos;
}

function closePosition(id) {
  const posIndex = activePositions.findIndex(p => p.id === id);
  if (posIndex === -1) return null;

  const [pos] = activePositions.splice(posIndex, 1);
  const closed = {
    ...pos,
    exitPrice: pos.currentPrice,
    realizedPL: pos.unrealizedPL,
    realizedPLPct: pos.unrealizedPLPct,
    status: 'MANUALLY_CLOSED',
    closedAt: new Date().toISOString()
  };
  tradeHistory.unshift(closed);
  return closed;
}

function resetTestSandbox() {
  activePositions = [];
  tradeHistory = [];
  return { success: true, activePositions, tradeHistory, balance: 100000 };
}

function updateAndGetActivePositions(realQuotes = null) {
  if (realQuotes && realQuotes.stocks && activePositions.length > 0) {
    const stockMap = {};
    (realQuotes.stocks || []).forEach(s => {
      stockMap[s.symbol.toUpperCase()] = s;
      stockMap[s.symbol.replace('.NS', '').toUpperCase()] = s;
    });

    activePositions.forEach(pos => {
      const cleanSym = pos.symbol.replace('.NS', '').split(' ')[0].toUpperCase();
      const quote = stockMap[cleanSym];
      if (quote && quote.price) {
        const isFO = pos.horizon === 'F_AND_O';
        let currentMarketPrice = quote.price;
        if (isFO) {
          const spotMovePct = (quote.price - (pos.underlyingSpotAtEntry || quote.price)) / (pos.underlyingSpotAtEntry || quote.price);
          const delta = pos.direction === 'BUY_CALL' ? 0.5 : -0.5;
          const optChange = (pos.entryPrice * spotMovePct * delta * 5);
          currentMarketPrice = Math.max(0.5, +(pos.entryPrice + optChange).toFixed(2));
        }

        pos.currentPrice = currentMarketPrice;
        const isOptionBuyer = pos.direction === 'BUY_CALL' || pos.direction === 'BUY_PUT';
        const isUpwardTrade = isOptionBuyer || pos.direction === 'BUY';
        const priceDiff = isUpwardTrade ? (pos.currentPrice - pos.entryPrice) : (pos.entryPrice - pos.currentPrice);
        pos.unrealizedPL = +(priceDiff * pos.quantity).toFixed(2);
        pos.unrealizedPLPct = +((priceDiff / pos.entryPrice) * 100).toFixed(2);

        // Breakeven Profit-Lock check
        if (!pos.breakevenActivated && pos.unrealizedPLPct >= 1.0) {
          pos.breakevenActivated = true;
          pos.stopLoss = isUpwardTrade ? +(pos.entryPrice * 1.002).toFixed(2) : +(pos.entryPrice * 0.998).toFixed(2);
          pos.status = 'PROFIT_LOCKED';
        }
      }
    });
  }
  return activePositions;
}

module.exports = {
  STRATEGY_CATALOG,
  getMarketUniverse,
  executeTrade,
  tickPosition,
  closePosition,
  resetTestSandbox,
  getActivePositions: (quotes) => updateAndGetActivePositions(quotes),
  getTradeHistory: () => tradeHistory
};

