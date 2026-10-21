/**
 * US Quantitative Strategy Engine (NYSE / NASDAQ)
 * Operates in USD ($) with real-time profit lock, zero-loss ratchet,
 * and database persistence via MongoDB and server/data/trades_us.json.
 */

const { saveTrade, loadAllTrades, saveActivePositions, loadActivePositions } = require('../db');
const { getUSMarketSessionInfo, getUSMarketUniverse } = require('./usMarketService');

let activePositions = [];
let tradeHistory = [];

const US_BROKERAGE_TAXES = 1.00; // $1.00 standard SEC/FINRA/exchange fee

// Restore state from database / disk
(async () => {
  try {
    const loadedTrades = await loadAllTrades('US');
    if (loadedTrades && loadedTrades.length > 0) {
      tradeHistory = loadedTrades;
      console.log(`🇺🇸 [US Strategy Engine] Restored ${tradeHistory.length} trades from database.`);
    }
    const loadedPositions = await loadActivePositions('US');
    if (loadedPositions && loadedPositions.length > 0) {
      activePositions = loadedPositions;
      console.log(`🇺🇸 [US Strategy Engine] Restored ${activePositions.length} active positions from database.`);
    }
  } catch (err) {
    console.warn('US Strategy Engine boot warning:', err.message);
  }
})();

const US_STRATEGY_CATALOG = {
  INTRADAY: {
    name: 'US Intraday VWAP & Scalp Momentum',
    timeframe: '5m / 15m Candles',
    indicators: ['VWAP', 'EMA 9', 'EMA 21', 'RSI (14)', 'ATR'],
    description: 'High-frequency momentum strategy that rides Wall Street order flow above/below VWAP.',
    rules: {
      long: 'Price > VWAP AND EMA 9 crosses above EMA 21 AND RSI between 52 and 68.',
      short: 'Price < VWAP AND EMA 9 crosses below EMA 21 AND RSI between 32 and 48.',
      riskManagement: 'Initial Stop-Loss: 0.8% | Breakeven Trigger: +1.0% | Target 1: +1.5% | Auto-square off at 15:55 EST'
    }
  },
  SHORT_TERM: {
    name: 'US Tech Swing Breakout (1-5 Days)',
    timeframe: '1-Hour / Daily Candles',
    indicators: ['EMA 20', 'EMA 50', 'MACD', 'RSI Pullback'],
    description: 'Captures multi-day momentum swings in US mega-caps using 20/50 EMA support.',
    rules: {
      long: 'EMA 20 > EMA 50 AND MACD crosses above Signal AND RSI bounces from 45-50 zone.',
      short: 'EMA 20 < EMA 50 AND MACD crosses below Signal AND RSI breaks below 50.',
      riskManagement: 'Initial Stop-Loss: 1.8% | Breakeven Trigger: +1.8% | Target 1: +3.5% | Target 2: +7.0%'
    }
  },
  MEDIUM_TERM: {
    name: 'US Golden Cross Trend (2-12 Weeks)',
    timeframe: 'Daily / Weekly Candles',
    indicators: ['SMA 50', 'SMA 200', 'SuperTrend', 'Weekly MACD'],
    description: 'Rides macroeconomic trends in S&P 500 & NASDAQ during Golden Cross regimes.',
    rules: {
      long: 'SMA 50 > SMA 200 (Golden Cross) AND Price sustains above 50 SMA.',
      short: 'Price closes below 50 SMA (Exit / Hedge).',
      riskManagement: 'Initial Stop-Loss: 3.5% | Target 1: +12% | Target 2: +25%'
    }
  },
  LONG_TERM: {
    name: 'US Mega-Cap Dollar Cost Averaging (DCA)',
    timeframe: 'Weekly / Monthly Candles',
    indicators: ['SMA 200', 'Weekly RSI < 40', 'Fundamental Free Cash Flow'],
    description: 'Systematic value investing in US market monopolies (Apple, Microsoft, Nvidia, Google).',
    rules: {
      long: 'Stock pulls back within 5% of 200-day SMA OR Weekly RSI < 40.',
      short: 'Rebalance if price extends > 40% above 200 SMA.',
      riskManagement: 'Systematic Dollar Cost Averaging | Multi-year horizon'
    }
  }
};

function executeUSTrade({ symbol, horizon, direction, price, quantity, optionDetails = null, liveSpot = null, userId = 'usr_demo_trader_001' }) {
  const session = getUSMarketSessionInfo();
  const isFO = horizon === 'F_AND_O';

  // Robust entry price determination
  let rawEntryPrice = (isFO && optionDetails && optionDetails.premium !== undefined && optionDetails.premium !== null)
    ? parseFloat(optionDetails.premium)
    : (parseFloat(price) || parseFloat(liveSpot) || 0);

  if (isFO && (!rawEntryPrice || isNaN(rawEntryPrice) || rawEntryPrice <= 0)) {
    const spot = parseFloat(price) || parseFloat(liveSpot) || 100;
    rawEntryPrice = +(spot * 0.025).toFixed(2);
  }

  const numEntryPrice = (!isNaN(rawEntryPrice) && rawEntryPrice > 0)
    ? parseFloat(rawEntryPrice.toFixed(2))
    : (parseFloat(price) || parseFloat(liveSpot) || 50.0);

  const isOptionBuyer = direction === 'BUY_CALL' || direction === 'BUY_PUT';
  const isUpwardTrade = isOptionBuyer || direction === 'BUY';

  let initialSL = isUpwardTrade ? numEntryPrice * 0.992 : numEntryPrice * 1.008;
  let target1 = isUpwardTrade ? numEntryPrice * 1.015 : numEntryPrice * 0.985;
  let target2 = isUpwardTrade ? numEntryPrice * 1.030 : numEntryPrice * 0.970;

  if (isFO) {
    initialSL = numEntryPrice * 0.75;
    target1 = numEntryPrice * 1.45;
    target2 = numEntryPrice * 2.00;
  }

  const effectiveUserId = userId || 'usr_demo_trader_001';

  const strikeDesc = (optionDetails && optionDetails.recommendedStrike)
    ? optionDetails.recommendedStrike
    : (direction === 'BUY_PUT' ? `${Math.round(numEntryPrice * 0.98)} PUT` : `${Math.round(numEntryPrice * 1.02)} CALL`);

  const tradeSymbol = isFO && !symbol.includes('CALL') && !symbol.includes('PUT')
    ? `${symbol} ${strikeDesc}`
    : symbol;

  const newPosition = {
    id: `us_pos_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    userId: effectiveUserId,
    market: 'US',
    currency: '$',
    symbol: tradeSymbol,
    horizon,
    direction,
    entryPrice: +numEntryPrice.toFixed(2),
    currentPrice: +numEntryPrice.toFixed(2),
    stopLoss: +initialSL.toFixed(2),
    target1: +target1.toFixed(2),
    target2: +target2.toFixed(2),
    quantity: quantity || 20,
    breakevenActivated: false,
    trailingPct: isFO ? 0.05 : (horizon === 'INTRADAY' ? 0.008 : 0.015),
    unrealizedPL: 0.0,
    unrealizedPLPct: 0.0,
    status: session.isOpen ? 'ACTIVE_RUNNING' : 'AMO_PENDING_OPEN',
    isAMO: !session.isOpen,
    underlyingSpotAtEntry: liveSpot || price || numEntryPrice,
    openedAt: new Date().toISOString()
  };

  activePositions.unshift(newPosition);
  saveActivePositions(activePositions, 'US', effectiveUserId);
  return newPosition;
}

function tickUSPosition(id, newPrice, userId = null) {
  const posIndex = activePositions.findIndex(p => p.id === id && (!userId || !p.userId || p.userId === userId));
  if (posIndex === -1) return null;

  const pos = activePositions[posIndex];
  pos.currentPrice = +newPrice.toFixed(2);

  const isOptionBuyer = pos.direction === 'BUY_CALL' || pos.direction === 'BUY_PUT';
  const isUpwardTrade = isOptionBuyer || pos.direction === 'BUY';

  const priceDiff = isUpwardTrade ? (pos.currentPrice - pos.entryPrice) : (pos.entryPrice - pos.currentPrice);
  pos.unrealizedPL = +(priceDiff * pos.quantity).toFixed(2);
  pos.unrealizedPLPct = +((priceDiff / pos.entryPrice) * 100).toFixed(2);

  // Breakeven Ratchet
  if (!pos.breakevenActivated && pos.unrealizedPLPct >= 1.0) {
    pos.breakevenActivated = true;
    pos.stopLoss = isUpwardTrade ? +(pos.entryPrice * 1.002).toFixed(2) : +(pos.entryPrice * 0.998).toFixed(2);
    pos.status = 'PROFIT_LOCKED';
  }

  // Trailing Stop Loss
  if (pos.unrealizedPLPct > 2.0) {
    if (isUpwardTrade) {
      const trailedSL = +(pos.currentPrice * (1 - pos.trailingPct)).toFixed(2);
      if (trailedSL > pos.stopLoss) pos.stopLoss = trailedSL;
    } else {
      const trailedSL = +(pos.currentPrice * (1 + pos.trailingPct)).toFixed(2);
      if (trailedSL < pos.stopLoss) pos.stopLoss = trailedSL;
    }
  }

  const isStoppedOut = isUpwardTrade ? pos.currentPrice <= pos.stopLoss : pos.currentPrice >= pos.stopLoss;
  const isTarget2Hit = isUpwardTrade ? pos.currentPrice >= pos.target2 : pos.currentPrice <= pos.target2;

  if (isStoppedOut || isTarget2Hit) {
    pos.status = isTarget2Hit ? 'TARGET_2_ACHIEVED' : (pos.breakevenActivated ? 'CLOSED_WITH_LOCKED_PROFIT' : 'STOPPED_OUT');
    const grossPL = pos.unrealizedPL;
    const brokerageCharges = US_BROKERAGE_TAXES;
    const netRealizedPL = +(grossPL - brokerageCharges).toFixed(2);
    const realizedPLPct = +((netRealizedPL / (pos.entryPrice * pos.quantity)) * 100).toFixed(2);
    const outcome = netRealizedPL > 0 ? 'WIN' : (netRealizedPL === 0 ? 'BREAKEVEN' : 'LOSS');

    const closed = {
      ...pos,
      market: 'US',
      currency: '$',
      exitPrice: pos.currentPrice,
      grossPL,
      brokerageCharges,
      netRealizedPL,
      realizedPL: netRealizedPL,
      realizedPLPct,
      outcome,
      closedAt: new Date().toISOString()
    };

    tradeHistory.unshift(closed);
    activePositions.splice(posIndex, 1);
    saveTrade(closed, 'US', closed.userId || userId);
    saveActivePositions(activePositions, 'US', closed.userId || userId);
  }

  return pos;
}

function closeUSPosition(id, userId = null) {
  const posIndex = activePositions.findIndex(p => p.id === id && (!userId || !p.userId || p.userId === userId));
  if (posIndex === -1) return null;

  const [pos] = activePositions.splice(posIndex, 1);
  const grossPL = pos.unrealizedPL;
  const brokerageCharges = US_BROKERAGE_TAXES;
  const netRealizedPL = +(grossPL - brokerageCharges).toFixed(2);
  const realizedPLPct = +((netRealizedPL / (pos.entryPrice * pos.quantity)) * 100).toFixed(2);
  const outcome = netRealizedPL > 0 ? 'WIN' : (netRealizedPL === 0 ? 'BREAKEVEN' : 'LOSS');

  const closed = {
    ...pos,
    market: 'US',
    currency: '$',
    exitPrice: pos.currentPrice,
    grossPL,
    brokerageCharges,
    netRealizedPL,
    realizedPL: netRealizedPL,
    realizedPLPct,
    outcome,
    status: 'MANUALLY_CLOSED',
    closedAt: new Date().toISOString()
  };

  tradeHistory.unshift(closed);
  saveTrade(closed, 'US', closed.userId || userId);
  saveActivePositions(activePositions, 'US', closed.userId || userId);
  return closed;
}

function updateAndGetUSActivePositions(realQuotes = null) {
  const session = getUSMarketSessionInfo();

  if (realQuotes && realQuotes.stocks && activePositions.length > 0) {
    const stockMap = {};
    (realQuotes.stocks || []).forEach(s => {
      stockMap[s.symbol.toUpperCase()] = s;
    });

    activePositions.forEach(pos => {
      const cleanSym = pos.symbol.split(' ')[0].toUpperCase();
      const quote = stockMap[cleanSym];
      if (quote && quote.price) {
        if (!session.isOpen && pos.currentPrice) return;

        const isFO = pos.horizon === 'F_AND_O';
        let currentMarketPrice = quote.price;
        if (isFO) {
          const spotMovePct = (quote.price - (pos.underlyingSpotAtEntry || quote.price)) / (pos.underlyingSpotAtEntry || quote.price);
          const delta = pos.direction === 'BUY_CALL' ? 0.52 : -0.48;
          const optChange = (pos.entryPrice * spotMovePct * delta * 5);
          currentMarketPrice = Math.max(0.05, +(pos.entryPrice + optChange).toFixed(2));
        }

        pos.currentPrice = currentMarketPrice;
        const isOptionBuyer = pos.direction === 'BUY_CALL' || pos.direction === 'BUY_PUT';
        const isUpwardTrade = isOptionBuyer || pos.direction === 'BUY';
        const priceDiff = isUpwardTrade ? (pos.currentPrice - pos.entryPrice) : (pos.entryPrice - pos.currentPrice);
        pos.unrealizedPL = +(priceDiff * pos.quantity).toFixed(2);
        pos.unrealizedPLPct = +((priceDiff / pos.entryPrice) * 100).toFixed(2);

        if (session.isOpen && !pos.breakevenActivated && pos.unrealizedPLPct >= 1.0) {
          pos.breakevenActivated = true;
          pos.stopLoss = isUpwardTrade ? +(pos.entryPrice * 1.002).toFixed(2) : +(pos.entryPrice * 0.998).toFixed(2);
          pos.status = 'PROFIT_LOCKED';
        }
      }
    });
  }

  // Auto-square off intraday positions when US market closes
  if (!session.isOpen && activePositions.length > 0) {
    let squaredAny = false;
    for (let i = activePositions.length - 1; i >= 0; i--) {
      const pos = activePositions[i];
      if (pos.horizon === 'INTRADAY' && !pos.isAMO && pos.status !== 'AMO_PENDING_OPEN') {
        const [squaredPos] = activePositions.splice(i, 1);
        const grossPL = squaredPos.unrealizedPL || 0;
        const brokerageCharges = US_BROKERAGE_TAXES;
        const netRealizedPL = +(grossPL - brokerageCharges).toFixed(2);
        const realizedPLPct = +((netRealizedPL / (squaredPos.entryPrice * squaredPos.quantity)) * 100).toFixed(2);
        const outcome = netRealizedPL > 0 ? 'WIN' : (netRealizedPL === 0 ? 'BREAKEVEN' : 'LOSS');
        const closed = {
          ...squaredPos,
          market: 'US',
          currency: '$',
          exitPrice: squaredPos.currentPrice || squaredPos.entryPrice,
          grossPL,
          brokerageCharges,
          netRealizedPL,
          realizedPL: netRealizedPL,
          realizedPLPct,
          outcome,
          status: 'MARKET_CLOSE_SQUAREOFF',
          exitReason: 'MARKET_CLOSE_SQUAREOFF',
          closedAt: new Date().toISOString()
        };
        tradeHistory.unshift(closed);
        saveTrade(closed, 'US');
        squaredAny = true;
      }
    }
    if (squaredAny) {
      saveActivePositions(activePositions, 'US');
    }
  }

  return activePositions;
}

function resetUSTestSandbox(userId = null) {
  if (userId) {
    activePositions = activePositions.filter(p => p.userId && p.userId !== userId);
    tradeHistory = tradeHistory.filter(t => t.userId && t.userId !== userId);
    saveActivePositions(activePositions, 'US', userId);
  } else {
    activePositions = [];
    tradeHistory = [];
    saveActivePositions([], 'US');
  }
  return { success: true, activePositions, tradeHistory, balance: 100000 };
}

module.exports = {
  US_STRATEGY_CATALOG,
  executeUSTrade,
  tickUSPosition,
  closeUSPosition,
  resetUSTestSandbox,
  getUSActivePositions: (quotes, userId = null) => {
    const positions = updateAndGetUSActivePositions(quotes);
    return userId ? positions.filter(p => !p.userId || p.userId === userId) : positions;
  },
  getUSTradeHistory: (userId = null) => {
    return userId ? tradeHistory.filter(t => !t.userId || t.userId === userId) : tradeHistory;
  }
};

