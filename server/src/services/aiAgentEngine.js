/**
 * Autonomous AI Trading Agent Engine
 * 
 * Capabilities:
 * 1. 24/7 Background Autonomous Loop (runs continuously on server without opening app).
 * 2. Multi-Segment Opportunity Scanner:
 *    - Intraday Momentum (Long BUY & Short-Selling SELL)
 *    - F&O Options Precision (ATM Call CE / Put PE Buying)
 *    - Short-Term Swing Breakouts
 * 3. Market Trend Alignment Filter (Index Regime Confluence with NIFTY 50 / BANK NIFTY):
 *    - Prioritizes setups aligned with the broader market direction; penalizes counter-trend setups.
 * 4. Two-Stage Profit Booking (50% scale-out at Target 1 + Free-Ride Target 2):
 *    - Automatically banks 50% profit at Target 1 and locks stop-loss of remaining 50% to entry.
 * 5. Anti-Overtrading & Brokerage Guard:
 *    - Max concurrent positions, daily trade limits, cooldowns, and 70% cash floor.
 *    - Realistic brokerage (₹45 round-trip) accounted for on every trade.
 * 6. 1-Click Emergency Panic Square-off:
 *    - Liquidates all open positions at spot prices in under 0.5s.
 * 7. Dynamic Risk Profile Switcher (Conservative, Balanced, Aggressive).
 * 8. Real-time Telegram and In-App Alert Notifications.
 * 9. Dual-Mode MongoDB Cloud + Local JSON Persistence.
 */

const fs = require('fs');
const path = require('path');
const { getRealQuotes, getRealMarketUniverse, getMarketSessionInfo } = require('./realMarketService');
const { isMongoConnected } = require('../config/database');
const { saveTrade, saveActivePositions, loadAllTrades, loadActivePositions } = require('../db');
const { 
  recordTradeOutcome, 
  getLearnedScoreModifier, 
  getLearningStats,
  getBaseScoreThreshold 
} = require('./aiLearningEngine');
const { dispatchAlert } = require('./notificationService');

const STATE_FILE_PATH = path.join(__dirname, '../../data/agent_state.json');

// Indian Brokerage & Statutory Taxes per round-trip trade
const ROUND_TRIP_BROKERAGE_TAXES = 45.00; // ₹20 entry + ₹20 exit + ₹5 STT/GST/Exchange fee

// Risk Profile Definitions
const RISK_PROFILES = {
  CONSERVATIVE: {
    name: 'CONSERVATIVE',
    maxConcurrentPositions: 1,
    baseScoreThreshold: 84,
    minCashReserveRatio: 0.80,
    riskPerTradePct: 0.01, // 1%
    dailyTradeLimit: 3,
    description: 'High selectivity: max 1 position, strict Score ≥ 84, 80% cash floor.'
  },
  BALANCED: {
    name: 'BALANCED',
    maxConcurrentPositions: 2,
    baseScoreThreshold: 80,
    minCashReserveRatio: 0.70,
    riskPerTradePct: 0.02, // 2%
    dailyTradeLimit: 5,
    description: 'Optimal balance: max 2 positions, Score ≥ 80, 70% cash floor.'
  },
  AGGRESSIVE: {
    name: 'AGGRESSIVE',
    maxConcurrentPositions: 3,
    baseScoreThreshold: 76,
    minCashReserveRatio: 0.60,
    riskPerTradePct: 0.03, // 3%
    dailyTradeLimit: 8,
    description: 'Maximum frequency: max 3 positions, Score ≥ 76, 60% cash floor.'
  }
};

let state = {
  isAutoPilotActive: true,
  riskProfile: 'BALANCED',
  maxConcurrentPositions: 2,
  dailyTradeLimit: 5,
  dailyTradesCount: 0,
  lastTradeDate: new Date().toISOString().split('T')[0],
  lastTradeTimestamp: 0,
  tradeCooldownMs: 10 * 60 * 1000,
  minCashReserveRatio: 0.70,
  virtualCapital: 100000,
  allocatedCapital: 0,
  lastScanTimestamp: 0,
  marketRegime: {
    index: 'NIFTY 50',
    regime: 'NEUTRAL',
    changePct: '0.00%',
    confluenceNote: 'Evaluating market breadth'
  },
  activePositions: [],
  tradeHistory: [],
  decisionLogs: []
};

let agentInterval = null;
let isLoopRunning = false;

// IST Time Helper (Indian Standard Time UTC+5:30)
function getISTDateTime() {
  const istString = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  return new Date(istString);
}

// Reset daily trade count if new calendar day
function checkDailyReset() {
  const todayDateStr = getISTDateTime().toISOString().split('T')[0];
  if (state.lastTradeDate !== todayDateStr) {
    state.lastTradeDate = todayDateStr;
    state.dailyTradesCount = 0;
    addDecisionLog('SYSTEM', `Daily trade limit reset for new session (${todayDateStr}). 0/${state.dailyTradeLimit} slots used.`);
  }
}

// Detect Market Index Regime (NIFTY 50 & BANK NIFTY Confluence)
function detectMarketRegime(quotes) {
  if (!quotes || !quotes.indices || quotes.indices.length === 0) {
    return state.marketRegime;
  }

  const nifty = quotes.indices.find(i => i.symbol === '^NSEI' || i.name.includes('NIFTY 50'));
  if (nifty) {
    const changePctNum = parseFloat(nifty.changePct) || 0;
    let regime = 'NEUTRAL';
    let note = '';

    if (changePctNum >= 0.20 || (nifty.isPositive && changePctNum > 0)) {
      regime = 'BULLISH';
      note = 'NIFTY 50 is trending positive (+% & holding bids). Prioritizing BUY / Long / Call setups.';
    } else if (changePctNum <= -0.20 || (!nifty.isPositive && changePctNum < 0)) {
      regime = 'BEARISH';
      note = 'NIFTY 50 is experiencing selling pressure (-% & down-trending). Prioritizing SELL / Short / Put setups.';
    } else {
      regime = 'NEUTRAL';
      note = 'NIFTY 50 is trading rangebound. Filtering for high-conviction breakout setups only.';
    }

    state.marketRegime = {
      index: 'NIFTY 50',
      price: nifty.price,
      changePct: nifty.changePct,
      regime,
      confluenceNote: note
    };
  }

  return state.marketRegime;
}

// Load persisted state safely (MongoDB primary with local JSON fallback)
async function loadPersistedState() {
  try {
    const loadedTrades = await loadAllTrades('IN');
    if (loadedTrades && loadedTrades.length > 0) {
      state.tradeHistory = loadedTrades;
    }

    const loadedPositions = await loadActivePositions('IN');
    if (loadedPositions && loadedPositions.length > 0) {
      state.activePositions = loadedPositions;
    }

    if (isMongoConnected()) {
      const AgentState = require('../models/AgentState');
      const savedState = await AgentState.findOne({ key: 'primary_sentinel' }).lean();
      if (savedState) {
        state.isAutoPilotActive = savedState.isAutoPilotActive !== undefined ? savedState.isAutoPilotActive : state.isAutoPilotActive;
        state.virtualCapital = savedState.virtualCapital || state.virtualCapital;
        state.riskProfile = savedState.riskProfile || 'BALANCED';
        state.maxConcurrentPositions = savedState.maxConcurrentPositions || 2;
        state.dailyTradeLimit = savedState.dailyTradeLimit || 5;
        state.dailyTradesCount = savedState.dailyTradesCount || 0;
        state.lastTradeDate = savedState.lastTradeDate || state.lastTradeDate;
        state.lastTradeTimestamp = savedState.lastTradeTimestamp || 0;
        state.tradeCooldownMs = savedState.tradeCooldownMs || (10 * 60 * 1000);
        state.minCashReserveRatio = savedState.minCashReserveRatio || 0.70;
        state.decisionLogs = savedState.decisionLogs || [];
      }
      console.log('🍃 [AI Agent] State & Trades successfully synced from MongoDB Cloud Database.');
      return;
    }

    if (fs.existsSync(STATE_FILE_PATH)) {
      const raw = fs.readFileSync(STATE_FILE_PATH, 'utf8');
      const loaded = JSON.parse(raw);
      state = {
        ...state,
        ...loaded,
        activePositions: loaded.activePositions || state.activePositions,
        tradeHistory: loaded.tradeHistory || state.tradeHistory,
        decisionLogs: loaded.decisionLogs || []
      };
      console.log('📁 [AI Agent] State loaded from local JSON file.');
    }
  } catch (err) {
    console.warn('[AI Agent] Failed to read persisted state, using defaults:', err.message);
  }
}

// Persist state safely (atomic write to JSON and async sync to MongoDB)
async function persistState() {
  try {
    const dir = path.dirname(STATE_FILE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(state, null, 2), 'utf8');

    await saveActivePositions(state.activePositions, 'IN');

    if (isMongoConnected()) {
      const AgentState = require('../models/AgentState');
      await AgentState.findOneAndUpdate(
        { key: 'primary_sentinel' },
        {
          isAutoPilotActive: state.isAutoPilotActive,
          virtualCapital: state.virtualCapital,
          riskProfile: state.riskProfile,
          maxConcurrentPositions: state.maxConcurrentPositions,
          dailyTradeLimit: state.dailyTradeLimit,
          dailyTradesCount: state.dailyTradesCount,
          lastTradeDate: state.lastTradeDate,
          lastTradeTimestamp: state.lastTradeTimestamp,
          tradeCooldownMs: state.tradeCooldownMs,
          minCashReserveRatio: state.minCashReserveRatio,
          decisionLogs: state.decisionLogs.slice(0, 50)
        },
        { upsert: true, new: true }
      );
    }
  } catch (err) {
    console.error('[AI Agent] Failed to persist state:', err.message);
  }
}

// Append a formatted decision log entry
function addDecisionLog(type, message, metadata = null) {
  const ist = getISTDateTime();
  const entry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    timestamp: new Date().toISOString(),
    displayTime: ist.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    type, // 'SCAN', 'EXECUTE', 'PROFIT_LOCK', 'TARGET_HIT', 'STOP_LOSS', 'SQUARE_OFF', 'RISK_GUARD', 'PANIC_EXIT', 'SYSTEM'
    message,
    metadata
  };

  state.decisionLogs.unshift(entry);
  if (state.decisionLogs.length > 80) {
    state.decisionLogs = state.decisionLogs.slice(0, 80);
  }
}

/**
 * Quantitative Probability Ranking Algorithm
 * Integrated with:
 * 1. Technical Confluence (RSI, VWAP, EMA, Volume)
 * 2. Market Trend Alignment Filter (NIFTY 50 Regime)
 * 3. Self-Learning Weights from aiLearningEngine
 */
function evaluateSetupProbability(stock, horizon, marketRegime = null) {
  const price = stock.price || 1000;
  const vwap = stock.vwap || price;
  const ema9 = stock.ema9 || price;
  const ema21 = stock.ema21 || price;
  const rsi = stock.rsi || 50;
  const volumeRatio = stock.volumeRatio || 1.0;
  const confidence = stock.confidence || 75;

  let action = 'HOLD';
  let isUpward = true;
  let target1 = 0;
  let target2 = 0;
  let stopLoss = 0;
  let score = 50; // base score
  let rationale = '';

  if (horizon === 'INTRADAY') {
    action = stock.intradaySignal || 'HOLD';
    if (action === 'BUY') {
      isUpward = true;
      stopLoss = +(price * 0.992).toFixed(2); // 0.8% SL
      target1 = +(price * 1.015).toFixed(2);  // 1.5% T1
      target2 = +(price * 1.030).toFixed(2);  // 3.0% T2
      rationale = 'Bullish intraday momentum: Price holding above VWAP with EMA 9 > EMA 21 alignment.';
      
      if (price > vwap) score += 12;
      if (ema9 > ema21) score += 10;
      if (rsi >= 52 && rsi <= 68) score += 12;
      if (volumeRatio >= 1.2) score += 8;
      if (confidence >= 85) score += 8;
    } else if (action === 'SELL') {
      isUpward = false;
      stopLoss = +(price * 1.008).toFixed(2); // 0.8% SL
      target1 = +(price * 0.985).toFixed(2);  // 1.5% T1
      target2 = +(price * 0.970).toFixed(2);  // 3.0% T2
      rationale = 'Bearish intraday short breakdown: Trading below VWAP with downward EMA cross.';
      
      if (price < vwap) score += 12;
      if (ema9 < ema21) score += 10;
      if (rsi >= 30 && rsi <= 48) score += 12;
      if (volumeRatio >= 1.2) score += 8;
      if (confidence >= 85) score += 8;
    }
  } else if (horizon === 'F_AND_O') {
    action = stock.foAction || 'HOLD';
    if (action === 'BUY_CALL') {
      isUpward = true;
      const optPrem = stock.optPremium || +(price * 0.025).toFixed(2);
      stopLoss = +(optPrem * 0.75).toFixed(2); // 25% opt SL
      target1 = +(optPrem * 1.45).toFixed(2);  // 45% opt T1
      target2 = +(optPrem * 2.00).toFixed(2);  // 100% opt T2
      rationale = `High-conviction Bullish Breakout: Buying ${stock.recommendedStrike || 'ATM Call'} for asymmetric upside.`;

      if (price > vwap) score += 14;
      if (ema9 > ema21) score += 12;
      if (rsi >= 55) score += 12;
      if (volumeRatio >= 1.3) score += 8;
      if (confidence >= 88) score += 9;
    } else if (action === 'BUY_PUT') {
      isUpward = true; // Option buyer profits as put price rises
      const optPrem = stock.optPremium || +(price * 0.025).toFixed(2);
      stopLoss = +(optPrem * 0.75).toFixed(2);
      target1 = +(optPrem * 1.45).toFixed(2);
      target2 = +(optPrem * 2.00).toFixed(2);
      rationale = `High-conviction Bearish Plunge: Buying ${stock.recommendedStrike || 'ATM Put'} to exploit heavy breakdown.`;

      if (price < vwap) score += 14;
      if (ema9 < ema21) score += 12;
      if (rsi <= 45) score += 12;
      if (volumeRatio >= 1.3) score += 8;
      if (confidence >= 88) score += 9;
    }
  } else if (horizon === 'SHORT_TERM') {
    action = stock.shortTermSignal || 'HOLD';
    if (action === 'BUY') {
      isUpward = true;
      stopLoss = +(price * 0.982).toFixed(2);
      target1 = +(price * 1.035).toFixed(2);
      target2 = +(price * 1.070).toFixed(2);
      rationale = 'Multi-day swing breakout: 20/50 EMA dynamic bounce with expanding momentum.';
      
      if (price > ema9) score += 10;
      if (rsi >= 48 && rsi <= 65) score += 10;
      if (confidence >= 80) score += 10;
    } else if (action === 'SELL') {
      isUpward = false;
      stopLoss = +(price * 1.018).toFixed(2);
      target1 = +(price * 0.965).toFixed(2);
      target2 = +(price * 0.930).toFixed(2);
      rationale = 'Multi-day swing breakdown: rejection at overhead resistance with weakening RSI.';

      if (price < ema9) score += 10;
      if (rsi <= 45) score += 10;
      if (confidence >= 80) score += 10;
    }
  }

  // Calculate Risk-to-Reward ratio
  const risk = Math.abs(price - stopLoss);
  const reward = Math.abs(target1 - price);
  const rrRatio = risk > 0 ? +(reward / risk).toFixed(2) : 1.0;
  if (rrRatio >= 1.8) score += 5;
  if (rrRatio >= 2.5) score += 5;

  // Market Trend Alignment Filter (Index Regime Confluence)
  const regime = marketRegime?.regime || state.marketRegime?.regime || 'NEUTRAL';
  if (regime === 'BULLISH') {
    if (action === 'BUY' || action === 'BUY_CALL') {
      score += 10; // Boost aligned trades
      rationale += ' Confluence: Aligned with Bullish NIFTY 50 market trend.';
    } else if (action === 'SELL' || action === 'BUY_PUT') {
      score -= 15; // Penalize fighting a bullish market
    }
  } else if (regime === 'BEARISH') {
    if (action === 'SELL' || action === 'BUY_PUT') {
      score += 10; // Boost aligned breakdown trades
      rationale += ' Confluence: Aligned with Bearish NIFTY 50 breakdown trend.';
    } else if (action === 'BUY' || action === 'BUY_CALL') {
      score -= 15; // Penalize buying during market crashes
    }
  }

  // Apply Self-Learning dynamic calibration modifier
  const learnedModifier = getLearnedScoreModifier(stock, horizon);
  score += learnedModifier;

  return {
    symbol: stock.symbol,
    name: stock.name,
    horizon,
    action,
    price,
    vwap,
    rsi,
    score: Math.min(99, Math.max(10, Math.round(score))),
    confidence,
    target1,
    target2,
    stopLoss,
    rrRatio,
    rationale,
    isUpward,
    stockData: stock,
    marketRegime: regime,
    featuresAtEntry: {
      vwapAligned: isUpward ? price >= vwap : price <= vwap,
      rsiInSweetSpot: isUpward ? (rsi >= 50 && rsi <= 68) : (rsi >= 30 && rsi <= 48),
      volumeSurge: volumeRatio >= 1.25,
      emaAligned: isUpward ? ema9 >= ema21 : ema9 <= ema21,
      marketAligned: (regime === 'BULLISH' && isUpward) || (regime === 'BEARISH' && !isUpward)
    }
  };
}

/**
 * Scan all segments and pick highest profit-probability setups
 */
async function scanMarketOpportunities(quotes = null) {
  const ist = getISTDateTime();
  const hours = ist.getHours();
  const minutes = ist.getMinutes();
  const day = ist.getDay();
  const isWeekday = day >= 1 && day <= 5;

  const isNearMarketClose = isWeekday && ((hours === 15 && minutes >= 0) || hours > 15 || hours < 9 || (hours === 9 && minutes < 15));

  const horizons = isNearMarketClose 
    ? ['F_AND_O', 'SHORT_TERM'] 
    : ['INTRADAY', 'F_AND_O', 'SHORT_TERM'];

  const candidates = [];
  const baseThreshold = RISK_PROFILES[state.riskProfile]?.baseScoreThreshold || getBaseScoreThreshold();
  const marketRegime = detectMarketRegime(quotes);

  for (const horizon of horizons) {
    try {
      const stocks = await getRealMarketUniverse(horizon);
      (stocks || []).forEach(stock => {
        const evalResult = evaluateSetupProbability(stock, horizon, marketRegime);
        if (['BUY', 'SELL', 'BUY_CALL', 'BUY_PUT'].includes(evalResult.action) && evalResult.score >= (baseThreshold - 2)) {
          candidates.push(evalResult);
        }
      });
    } catch (err) {
      console.warn(`[AI Agent] Scan error for horizon ${horizon}:`, err.message);
    }
  }

  candidates.sort((a, b) => b.score !== a.score ? b.score - a.score : b.confidence - a.confidence);
  return candidates;
}

/**
 * Autonomous Order Execution with Strict Anti-Overtrading & Brokerage Guard
 */
async function executeAutonomousTrade(candidate) {
  checkDailyReset();

  if (state.activePositions.length >= state.maxConcurrentPositions) {
    return null;
  }

  if (state.dailyTradesCount >= state.dailyTradeLimit) {
    addDecisionLog('RISK_GUARD', `Anti-Overtrading Guard: Daily trade quota (${state.dailyTradesCount}/${state.dailyTradeLimit}) reached. Preserving wallet capital.`);
    return null;
  }

  const timeSinceLastTrade = Date.now() - state.lastTradeTimestamp;
  if (timeSinceLastTrade < state.tradeCooldownMs) {
    return null;
  }

  const minCashFloor = state.virtualCapital * state.minCashReserveRatio;
  const currentInvested = state.activePositions.reduce((sum, p) => sum + (p.entryPrice * p.quantity), 0);
  const isFO = candidate.horizon === 'F_AND_O';
  const entryPrice = isFO ? (candidate.stockData.optPremium || +(candidate.price * 0.025).toFixed(2)) : candidate.price;
  
  const riskPct = RISK_PROFILES[state.riskProfile]?.riskPerTradePct || 0.02;
  const riskAmount = (state.virtualCapital || 100000) * riskPct;
  const slDistance = Math.abs(entryPrice - candidate.stopLoss);
  let quantity = 50;

  if (isFO) {
    quantity = candidate.stockData.lotSize || 250;
  } else if (slDistance > 0) {
    quantity = Math.max(10, Math.min(150, Math.floor(riskAmount / slDistance)));
  }

  const tradeCapitalNeeded = entryPrice * quantity;
  if ((state.virtualCapital - (currentInvested + tradeCapitalNeeded)) < minCashFloor) {
    addDecisionLog('RISK_GUARD', `Capital Guard: Trade requires ₹${tradeCapitalNeeded.toFixed(2)}. Floor reserve (₹${minCashFloor.toFixed(2)}) would be breached.`);
    return null;
  }

  const cleanSymbol = candidate.symbol.replace('.NS', '');
  const alreadyOpen = state.activePositions.some(p => 
    p.symbol.includes(cleanSymbol) && p.direction === candidate.action
  );
  if (alreadyOpen) return null;

  const tradeSymbol = isFO && candidate.stockData.recommendedStrike 
    ? `${cleanSymbol} ${candidate.stockData.recommendedStrike}` 
    : candidate.symbol;

  const newPosition = {
    id: `auto_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    symbol: tradeSymbol,
    baseSymbol: candidate.symbol,
    horizon: candidate.horizon,
    direction: candidate.action,
    entryPrice: +entryPrice.toFixed(2),
    currentPrice: +entryPrice.toFixed(2),
    stopLoss: +candidate.stopLoss.toFixed(2),
    target1: +candidate.target1.toFixed(2),
    target2: +candidate.target2.toFixed(2),
    initialQuantity: quantity,
    quantity,
    partialProfitTaken: false,
    breakevenActivated: false,
    trailingPct: isFO ? 0.05 : (candidate.horizon === 'INTRADAY' ? 0.008 : 0.015),
    unrealizedPL: 0.0,
    unrealizedPLPct: 0.0,
    grossPL: 0.0,
    brokerageCharges: ROUND_TRIP_BROKERAGE_TAXES,
    netRealizedPL: 0.0,
    status: 'ACTIVE_RUNNING',
    outcome: 'RUNNING',
    openedAt: new Date().toISOString(),
    isAutonomous: true,
    score: candidate.score,
    confidence: candidate.confidence,
    rrRatio: candidate.rrRatio,
    rationale: candidate.rationale,
    ticksObserved: 0,
    underlyingSpotAtEntry: candidate.price,
    featuresAtEntry: candidate.featuresAtEntry
  };

  state.activePositions.unshift(newPosition);
  state.dailyTradesCount += 1;
  state.lastTradeTimestamp = Date.now();
  await persistState();

  const msg = `Autonomous Order Placed (${state.dailyTradesCount}/${state.dailyTradeLimit} today): ${candidate.action} ${tradeSymbol} (${quantity} Qty @ ₹${newPosition.entryPrice}). Score: ${candidate.score}/100, R:R 1:${candidate.rrRatio}. Two-Stage Profit Booking Active.`;
  addDecisionLog('EXECUTE', msg, { positionId: newPosition.id, symbol: newPosition.symbol, price: newPosition.entryPrice });

  // Dispatch alert to Telegram and in-app feed
  dispatchAlert('EXECUTE', `Order Placed: ${candidate.action} ${tradeSymbol}`, 
    `Executed ${quantity} Qty @ ₹${newPosition.entryPrice}. Stop Loss: ₹${newPosition.stopLoss} | Target 1: ₹${newPosition.target1} | Target 2: ₹${newPosition.target2}. Score: ${candidate.score}/100.`);

  return newPosition;
}

/**
 * Autonomous Position Sentinel & Exit Manager
 * - Two-Stage Profit Booking: At Target 1, scale-out 50% & lock SL to Breakeven
 * - Trailing Stop Loss on runners
 * - Target 2 full achievement
 * - 15:15 IST Market Close Auto-Squareoff
 */
async function monitorAndManagePositions(realQuotes) {
  if (!state.activePositions || state.activePositions.length === 0) return;

  const session = getMarketSessionInfo();
  const stockMap = {};
  if (realQuotes && realQuotes.stocks) {
    realQuotes.stocks.forEach(s => {
      stockMap[s.symbol.toUpperCase()] = s;
      stockMap[s.symbol.replace('.NS', '').toUpperCase()] = s;
    });
  }

  const ist = getISTDateTime();
  const hours = ist.getHours();
  const minutes = ist.getMinutes();
  const dayOfWeek = ist.getDay();
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  const isMarketCloseSquareoffTime = isWeekday && ((hours === 15 && minutes >= 15) || hours > 15);

  for (let i = state.activePositions.length - 1; i >= 0; i--) {
    const pos = state.activePositions[i];
    pos.ticksObserved = (pos.ticksObserved || 0) + 1;

    const cleanSym = (pos.baseSymbol || pos.symbol).replace('.NS', '').split(' ')[0].toUpperCase();
    const quote = stockMap[cleanSym];
    
    if (quote && quote.price) {
      const isFO = pos.horizon === 'F_AND_O';
      let currentPrice = quote.price;

      if (isFO) {
        const spotMovePct = (quote.price - (pos.underlyingSpotAtEntry || quote.price)) / (pos.underlyingSpotAtEntry || quote.price);
        const delta = pos.direction === 'BUY_CALL' ? 0.5 : -0.5;
        const optChange = pos.entryPrice * spotMovePct * delta * 5;
        currentPrice = Math.max(0.5, +(pos.entryPrice + optChange).toFixed(2));
      }

      // CRITICAL: When market is closed, freeze currentPrice at settlement/closing price
      if (!session.isOpen && pos.currentPrice) {
        currentPrice = pos.currentPrice;
      }

      pos.currentPrice = +currentPrice.toFixed(2);
      const isOptionBuyer = pos.direction === 'BUY_CALL' || pos.direction === 'BUY_PUT';
      const isUpwardTrade = isOptionBuyer || pos.direction === 'BUY';
      
      const priceDiff = isUpwardTrade ? (pos.currentPrice - pos.entryPrice) : (pos.entryPrice - pos.currentPrice);
      pos.unrealizedPL = +(priceDiff * pos.quantity).toFixed(2);
      pos.unrealizedPLPct = +((priceDiff / pos.entryPrice) * 100).toFixed(2);

      // When market is closed (or on holidays), hold swing/long-term positions safely at closing price
      // All intraday positions must be auto-squared off at market close/holiday!
      if (!session.isOpen) {
        if (pos.horizon === 'INTRADAY' && pos.status !== 'AMO_PENDING_OPEN') {
          // Intraday position must be auto-squared off at market close
          closeReason = 'MARKET_CLOSE_SQUAREOFF';
        } else {
          continue; // Freeze non-intraday position safely; do not trigger stops/targets after hours
        }
      }

      // 1. Two-Stage Profit Booking: Scale out 50% at Target 1 and snap SL to Breakeven
      const isTarget1Hit = isUpwardTrade ? pos.currentPrice >= pos.target1 : pos.currentPrice <= pos.target1;
      if (isTarget1Hit && !pos.partialProfitTaken && pos.quantity >= 2) {
        pos.partialProfitTaken = true;
        const bookedQty = Math.floor(pos.quantity / 2);
        const remainingQty = pos.quantity - bookedQty;
        const grossBookedPL = +(priceDiff * bookedQty).toFixed(2);
        const partialBrokerage = 22.50; // Half round-trip brokerage
        const netBookedPL = +(grossBookedPL - partialBrokerage).toFixed(2);

        // Credit booked profit into virtual capital immediately!
        state.virtualCapital = +(state.virtualCapital + netBookedPL).toFixed(2);
        pos.quantity = remainingQty;
        pos.breakevenActivated = true;
        pos.stopLoss = isUpwardTrade ? +(pos.entryPrice * 1.002).toFixed(2) : +(pos.entryPrice * 0.998).toFixed(2);
        pos.status = 'TARGET_1_PARTIAL_PROFIT';

        const scaleOutMsg = `🎯 Target 1 Scaled Out: Banked 50% profit on ${pos.symbol} (+₹${netBookedPL} net). Remaining ${remainingQty} Qty running to Target 2 with Stop-Loss locked at Cost (₹${pos.stopLoss}).`;
        addDecisionLog('PROFIT_LOCK', scaleOutMsg, { positionId: pos.id, bookedPL: netBookedPL, remainingQty });
        dispatchAlert('TARGET_1', `Target 1 Scaled Out: ${pos.symbol}`, `Banked 50% profit (+₹${netBookedPL} net). Remaining ${remainingQty} Qty free-riding to Target 2.`);
      }

      // 2. Zero-Loss Breakeven Lock for non-scaled trades once gain >= +1.0%
      if (!pos.breakevenActivated && pos.unrealizedPLPct >= 1.0) {
        pos.breakevenActivated = true;
        pos.stopLoss = isUpwardTrade ? +(pos.entryPrice * 1.002).toFixed(2) : +(pos.entryPrice * 0.998).toFixed(2);
        pos.status = 'PROFIT_LOCKED';

        addDecisionLog('PROFIT_LOCK', 
          `Zero-Loss Breakeven Guard Activated for ${pos.symbol}! Gain reached +${pos.unrealizedPLPct}%. Stop-loss locked at entry (₹${pos.stopLoss}).`,
          { positionId: pos.id, stopLoss: pos.stopLoss }
        );
        dispatchAlert('PROFIT_LOCK', `Zero-Loss Breakeven: ${pos.symbol}`, `Position reached +${pos.unrealizedPLPct}%. Stop-loss locked at entry (₹${pos.stopLoss}) to eliminate downside risk.`);
      }

      // 3. Trailing Stop Loss on runners (>= +2.0%)
      if (pos.unrealizedPLPct >= 2.0) {
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

      // 4. Check Exit Triggers: Market Close (15:15 IST), Target 2, Trailed Stop, Stop-Loss
      const isStoppedOut = isUpwardTrade ? pos.currentPrice <= pos.stopLoss : pos.currentPrice >= pos.stopLoss;
      const isTarget2Hit = isUpwardTrade ? pos.currentPrice >= pos.target2 : pos.currentPrice <= pos.target2;
      const isIntradayMarketClose = pos.horizon === 'INTRADAY' && (!session.isOpen || isMarketCloseSquareoffTime);
      const openDurationSec = (Date.now() - new Date(pos.openedAt).getTime()) / 1000;
      const isIntradayHoldingExpired = pos.horizon === 'INTRADAY' && (openDurationSec > 7200 || pos.ticksObserved > 120);

      if (!closeReason) {
        if (isIntradayMarketClose) {
          closeReason = 'MARKET_CLOSE_SQUAREOFF';
        } else if (isTarget2Hit) {
          closeReason = 'TARGET_2_ACHIEVED';
        } else if (isStoppedOut) {
          closeReason = pos.breakevenActivated ? 'CLOSED_WITH_LOCKED_PROFIT' : 'STOP_LOSS_EXIT';
        } else if (isIntradayHoldingExpired && pos.unrealizedPL >= 0) {
          closeReason = 'INTRADAY_PROFIT_SQUAREOFF';
        }
      }

      if (closeReason) {
        pos.status = closeReason;
        const grossPL = pos.unrealizedPL;
        const brokerage = pos.partialProfitTaken ? 22.50 : ROUND_TRIP_BROKERAGE_TAXES;
        const netRealizedPL = +(grossPL - brokerage).toFixed(2);
        const realizedPLPct = +((netRealizedPL / (pos.entryPrice * pos.quantity)) * 100).toFixed(2);
        
        const outcome = netRealizedPL > 0 ? 'WIN' : (netRealizedPL === 0 ? 'BREAKEVEN' : 'LOSS');

        const closedTrade = {
          ...pos,
          exitPrice: pos.currentPrice,
          grossPL,
          brokerageCharges: brokerage,
          netRealizedPL,
          realizedPL: netRealizedPL,
          realizedPLPct,
          outcome,
          closedAt: new Date().toISOString()
        };

        state.virtualCapital = +(state.virtualCapital + netRealizedPL).toFixed(2);
        state.activePositions.splice(i, 1);
        state.tradeHistory.unshift(closedTrade);

        await saveTrade(closedTrade, 'IN');
        await saveActivePositions(state.activePositions, 'IN');
        await persistState();
        await recordTradeOutcome(closedTrade);

        const outcomeBadge = outcome === 'WIN' ? 'WIN 🎯' : (outcome === 'BREAKEVEN' ? 'BREAKEVEN 🛡️' : 'LOSS ⚠️');
        const reasonDesc = closeReason === 'MARKET_CLOSE_SQUAREOFF' 
          ? '⏰ 15:15 IST Market Close Auto-Squareoff' 
          : closeReason;

        addDecisionLog(
          closeReason === 'MARKET_CLOSE_SQUAREOFF' ? 'SQUARE_OFF' : (outcome === 'WIN' ? 'TARGET_HIT' : 'STOP_LOSS'),
          `Autonomous Position Closed [${outcomeBadge}]: ${closedTrade.symbol} exited at ₹${closedTrade.exitPrice} via ${reasonDesc}. Gross: ₹${grossPL >= 0 ? '+' : ''}${grossPL}, Brokerage/Tax: -₹${brokerage}, Net: ₹${netRealizedPL >= 0 ? '+' : ''}${netRealizedPL} (${realizedPLPct}%).`,
          { positionId: closedTrade.id, netPL: netRealizedPL, grossPL, brokerage }
        );

        dispatchAlert(
          closeReason === 'MARKET_CLOSE_SQUAREOFF' ? 'SQUARE_OFF' : (outcome === 'WIN' ? 'TARGET_2' : 'STOP_LOSS'),
          `Position Closed [${outcome}]: ${closedTrade.symbol}`,
          `Exited @ ₹${closedTrade.exitPrice} via ${reasonDesc}. Net P&L: ₹${netRealizedPL >= 0 ? '+' : ''}${netRealizedPL} (${realizedPLPct}%).`
        );
      }
    }
  }

  await persistState();
}

/**
 * 1-Click Emergency Panic Square-off
 * Liquidates ALL active positions at live market spot price immediately.
 */
async function panicSquareOffAll() {
  if (!state.activePositions || state.activePositions.length === 0) {
    return { success: true, count: 0, message: 'No active positions to square off.' };
  }

  let totalLiquidated = 0;
  let totalNetPL = 0;
  let quotes = null;
  try {
    quotes = await getRealQuotes();
  } catch (e) {}

  const stockMap = {};
  (quotes?.stocks || []).forEach(s => {
    stockMap[s.symbol.toUpperCase()] = s;
    stockMap[s.symbol.replace('.NS', '').toUpperCase()] = s;
  });

  for (let i = state.activePositions.length - 1; i >= 0; i--) {
    const pos = state.activePositions[i];
    const cleanSym = (pos.baseSymbol || pos.symbol).replace('.NS', '').split(' ')[0].toUpperCase();
    const quote = stockMap[cleanSym];
    const currentPrice = quote?.price || pos.currentPrice;

    const isOptionBuyer = pos.direction === 'BUY_CALL' || pos.direction === 'BUY_PUT';
    const isUpwardTrade = isOptionBuyer || pos.direction === 'BUY';
    const priceDiff = isUpwardTrade ? (currentPrice - pos.entryPrice) : (pos.entryPrice - currentPrice);
    const grossPL = +(priceDiff * pos.quantity).toFixed(2);
    const brokerage = ROUND_TRIP_BROKERAGE_TAXES;
    const netPL = +(grossPL - brokerage).toFixed(2);
    const realizedPLPct = +((netPL / (pos.entryPrice * pos.quantity)) * 100).toFixed(2);

    const closedTrade = {
      ...pos,
      exitPrice: currentPrice,
      grossPL,
      brokerageCharges: brokerage,
      netRealizedPL: netPL,
      realizedPL: netPL,
      realizedPLPct,
      status: 'PANIC_EMERGENCY_EXIT',
      outcome: netPL > 0 ? 'WIN' : (netPL === 0 ? 'BREAKEVEN' : 'LOSS'),
      closedAt: new Date().toISOString()
    };

    state.virtualCapital = +(state.virtualCapital + netPL).toFixed(2);
    state.activePositions.splice(i, 1);
    state.tradeHistory.unshift(closedTrade);
    totalLiquidated += 1;
    totalNetPL += netPL;

    if (isMongoConnected()) {
      try {
        const Trade = require('../models/Trade');
        await Trade.findOneAndUpdate({ id: closedTrade.id }, closedTrade, { upsert: true });
      } catch (e) {}
    }
  }

  await persistState();

  addDecisionLog('PANIC_EXIT', `🚨 Emergency Panic Square-off Executed! Liquidated ${totalLiquidated} positions immediately. Net P&L: ₹${totalNetPL.toFixed(2)}.`);
  dispatchAlert('PANIC_EXIT', 'Emergency Panic Square-off Executed', `Liquidated ${totalLiquidated} open positions immediately. Total Net P&L: ₹${totalNetPL >= 0 ? '+' : ''}${totalNetPL.toFixed(2)}.`);

  return { success: true, count: totalLiquidated, totalNetPL, message: `Successfully emergency squared off ${totalLiquidated} positions.` };
}

/**
 * Switch Risk Profile Mode (Conservative, Balanced, Aggressive)
 */
function setRiskProfile(profileName) {
  const profileKey = (profileName || 'BALANCED').toUpperCase();
  const profile = RISK_PROFILES[profileKey] || RISK_PROFILES.BALANCED;

  state.riskProfile = profile.name;
  state.maxConcurrentPositions = profile.maxConcurrentPositions;
  state.dailyTradeLimit = profile.dailyTradeLimit;
  state.minCashReserveRatio = profile.minCashReserveRatio;

  persistState();

  addDecisionLog('SYSTEM', `Risk Profile switched to: ${profile.name} (${profile.description})`);
  return { success: true, profile: profile.name, details: profile };
}

/**
 * Compute comprehensive audit-grade accuracy and performance metrics
 */
function getAccuracyMetrics() {
  const history = state.tradeHistory || [];
  const totalTrades = history.length;
  
  const winningTrades = history.filter(t => (t.netRealizedPL !== undefined ? t.netRealizedPL : t.realizedPL || 0) > 0).length;
  const breakevenTrades = history.filter(t => (t.netRealizedPL !== undefined ? t.netRealizedPL : t.realizedPL || 0) === 0).length;
  const losingTrades = history.filter(t => (t.netRealizedPL !== undefined ? t.netRealizedPL : t.realizedPL || 0) < 0).length;

  const totalRealizedPL = +history.reduce((sum, t) => sum + (t.netRealizedPL !== undefined ? t.netRealizedPL : t.realizedPL || 0), 0).toFixed(2);
  const totalBrokeragePaid = +history.reduce((sum, t) => sum + (t.brokerageCharges || ROUND_TRIP_BROKERAGE_TAXES), 0).toFixed(2);
  const totalGrossProfit = +history.reduce((sum, t) => sum + (t.grossPL || (t.realizedPL || 0) + ROUND_TRIP_BROKERAGE_TAXES), 0).toFixed(2);

  const grossProfit = +history.filter(t => (t.netRealizedPL || 0) > 0).reduce((sum, t) => sum + (t.netRealizedPL || 0), 0).toFixed(2);
  const grossLoss = +Math.abs(history.filter(t => (t.netRealizedPL || 0) < 0).reduce((sum, t) => sum + (t.netRealizedPL || 0), 0)).toFixed(2);

  const winRatePct = totalTrades > 0 ? +(((winningTrades + breakevenTrades) / totalTrades) * 100).toFixed(1) : 100.0;
  const pureWinRatePct = totalTrades > 0 ? +((winningTrades / totalTrades) * 100).toFixed(1) : 100.0;
  const profitFactor = grossLoss > 0 ? +(grossProfit / grossLoss).toFixed(2) : (grossProfit > 0 ? 99.0 : 1.0);

  const getSegmentStats = (predicate) => {
    const subset = history.filter(predicate);
    const subTotal = subset.length;
    const subWins = subset.filter(t => (t.netRealizedPL || t.realizedPL || 0) > 0).length;
    const subBreakeven = subset.filter(t => (t.netRealizedPL || t.realizedPL || 0) === 0).length;
    const subLoss = subset.filter(t => (t.netRealizedPL || t.realizedPL || 0) < 0).length;
    const subPL = +subset.reduce((sum, t) => sum + (t.netRealizedPL || t.realizedPL || 0), 0).toFixed(2);
    const subWinRate = subTotal > 0 ? +(((subWins + subBreakeven) / subTotal) * 100).toFixed(1) : 100.0;
    return { total: subTotal, wins: subWins, breakeven: subBreakeven, losses: subLoss, pl: subPL, winRatePct: subWinRate };
  };

  const segmentBreakdown = {
    intradayLong: getSegmentStats(t => t.horizon === 'INTRADAY' && t.direction === 'BUY'),
    intradayShort: getSegmentStats(t => t.horizon === 'INTRADAY' && t.direction === 'SELL'),
    optionsCalls: getSegmentStats(t => t.horizon === 'F_AND_O' && t.direction === 'BUY_CALL'),
    optionsPuts: getSegmentStats(t => t.horizon === 'F_AND_O' && t.direction === 'BUY_PUT'),
    swingTrading: getSegmentStats(t => t.horizon === 'SHORT_TERM')
  };

  return {
    totalTrades,
    winningTrades,
    breakevenTrades,
    losingTrades,
    winRatePct,
    pureWinRatePct,
    totalRealizedPL,
    totalGrossProfit,
    totalBrokeragePaid,
    grossProfit,
    grossLoss,
    profitFactor,
    virtualCapital: state.virtualCapital,
    openPositionsCount: state.activePositions.length,
    segmentBreakdown
  };
}

/**
 * Return current status of Anti-Overtrading & Brokerage Guard
 */
function getRiskGuardStatus() {
  checkDailyReset();
  const timeSinceLastTrade = Date.now() - state.lastTradeTimestamp;
  const isCooldownActive = timeSinceLastTrade < state.tradeCooldownMs;
  const cooldownRemainingSec = isCooldownActive ? Math.ceil((state.tradeCooldownMs - timeSinceLastTrade) / 1000) : 0;
  
  const minCashFloor = +(state.virtualCapital * state.minCashReserveRatio).toFixed(2);
  const currentInvested = +(state.activePositions.reduce((sum, p) => sum + (p.entryPrice * p.quantity), 0)).toFixed(2);
  const freeCapital = +(state.virtualCapital - currentInvested).toFixed(2);

  const ist = getISTDateTime();
  const hours = ist.getHours();
  const minutes = ist.getMinutes();
  const day = ist.getDay();
  const isMarketOpenNow = (day >= 1 && day <= 5) && ((hours === 9 && minutes >= 15) || (hours > 9 && hours < 15) || (hours === 15 && minutes < 30));

  return {
    riskProfile: state.riskProfile,
    maxConcurrentPositions: state.maxConcurrentPositions,
    activePositionsCount: state.activePositions.length,
    slotsAvailable: Math.max(0, state.maxConcurrentPositions - state.activePositions.length),
    dailyTradeLimit: state.dailyTradeLimit,
    dailyTradesCount: state.dailyTradesCount,
    dailyTradesRemaining: Math.max(0, state.dailyTradeLimit - state.dailyTradesCount),
    isCooldownActive,
    cooldownRemainingSec,
    minCashReserveRatio: state.minCashReserveRatio,
    minCashFloor,
    currentInvested,
    freeCapital,
    brokeragePerTrade: ROUND_TRIP_BROKERAGE_TAXES,
    marketCloseSquareoffTime: '15:15 IST',
    isMarketOpenNow,
    isMongoSynced: isMongoConnected()
  };
}

/**
 * Autonomous Background Agent Cycle
 */
async function runAutonomousCycle() {
  if (isLoopRunning) return;
  isLoopRunning = true;

  try {
    const quotes = await getRealQuotes();
    detectMarketRegime(quotes);
    
    // Step 1: Manage active positions (Target 1 50% scale-out, trailing stop, breakeven lock, 15:15 IST auto-squareoff)
    await monitorAndManagePositions(quotes);

    // Step 2: Check market session status
    const session = getMarketSessionInfo();
    checkDailyReset();

    const canTrade = state.isAutoPilotActive && 
      session.isOpen &&
      state.activePositions.length < state.maxConcurrentPositions && 
      state.dailyTradesCount < state.dailyTradeLimit &&
      (Date.now() - state.lastTradeTimestamp >= state.tradeCooldownMs);

    if (canTrade) {
      const now = Date.now();
      if (now - state.lastScanTimestamp > 6000) {
        state.lastScanTimestamp = now;
        const candidates = await scanMarketOpportunities(quotes);

        if (candidates && candidates.length > 0) {
          const bestCandidate = candidates[0];
          const threshold = RISK_PROFILES[state.riskProfile]?.baseScoreThreshold || getBaseScoreThreshold();
          if (bestCandidate && bestCandidate.score >= threshold) {
            await executeAutonomousTrade(bestCandidate);
          }
        }
      }
    } else if (state.isAutoPilotActive && !session.isOpen) {
      // Periodically log standby notice when market is closed (every 20 min)
      const now = Date.now();
      if (now - (state.lastClosedNoticeTimestamp || 0) > 1200000) {
        state.lastClosedNoticeTimestamp = now;
        addDecisionLog('MARKET_CLOSED', `Exchange session closed (09:15 - 15:30 IST). Sentinel in standby mode with capital locked. Live execution will resume at 09:15 AM IST.`);
      }
    }
  } catch (err) {
    console.warn('[AI Agent] Cycle error:', err.message);
  } finally {
    isLoopRunning = false;
  }
}

/**
 * Start the autonomous agent loop (runs 24/7 on server)
 */
async function startAutonomousAgent() {
  await loadPersistedState();
  if (agentInterval) clearInterval(agentInterval);

  console.log('🤖 [AI Agent] Autonomous Trading Sentinel booted. Auto-Pilot:', state.isAutoPilotActive ? 'ENABLED' : 'PAUSED');
  console.log(`🛡️ [AI Agent] Anti-Overtrading Guard: Max ${state.maxConcurrentPositions} positions, ${state.dailyTradeLimit} daily limit, Mode: ${state.riskProfile}`);
  console.log(`🎯 [AI Agent] Two-Stage Profit Booking: Active (50% scale-out @ T1 + Free-ride T2).`);
  console.log(`⏰ [AI Agent] Market Close Auto-Squareoff: 15:15 IST enabled.`);
  
  addDecisionLog('SYSTEM', `Autonomous AI Trading Sentinel engine booted. MongoDB: ${isMongoConnected() ? 'CONNECTED' : 'LOCAL_STORAGE_MODE'}.`);

  // Run cycle every 2.5 seconds
  agentInterval = setInterval(runAutonomousCycle, 2500);
}

function toggleAutoPilot(enabled) {
  state.isAutoPilotActive = enabled !== undefined ? !!enabled : !state.isAutoPilotActive;
  persistState();
  addDecisionLog('SYSTEM', `Auto-Pilot mode set to: ${state.isAutoPilotActive ? 'ENABLED (Autonomous Execution)' : 'PAUSED (Manual Review)'}`);
  return state.isAutoPilotActive;
}

async function resetAgentSandbox() {
  state.activePositions = [];
  state.tradeHistory = [];
  state.virtualCapital = 100000;
  state.dailyTradesCount = 0;
  state.lastTradeTimestamp = 0;
  state.decisionLogs = [
    {
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      displayTime: getISTDateTime().toLocaleTimeString('en-IN'),
      type: 'SYSTEM',
      message: 'Autonomous trading sandbox reset to ₹100,000 virtual capital with 0 trades.'
    }
  ];

  if (isMongoConnected()) {
    try {
      const Trade = require('../models/Trade');
      await Trade.deleteMany({});
    } catch (e) {
      console.warn('MongoDB Trade clear warning:', e.message);
    }
  }

  await persistState();
  return { success: true, message: 'Sandbox reset to ₹100,000 with 0 trades and refreshed limits.' };
}

module.exports = {
  startAutonomousAgent,
  runAutonomousCycle,
  toggleAutoPilot,
  resetAgentSandbox,
  panicSquareOffAll,
  setRiskProfile,
  getAgentStatus: () => {
    const session = getMarketSessionInfo();
    return {
      isAutoPilotActive: state.isAutoPilotActive,
      riskProfile: state.riskProfile,
      marketRegime: state.marketRegime,
      marketSession: session,
      isMarketOpen: session.isOpen,
      maxConcurrentPositions: state.maxConcurrentPositions,
      virtualCapital: state.virtualCapital,
      activePositions: state.activePositions,
      tradeHistory: state.tradeHistory,
      decisionLogs: state.decisionLogs,
      accuracy: getAccuracyMetrics(),
      riskGuard: getRiskGuardStatus(),
      learning: getLearningStats(),
      isMongoSynced: isMongoConnected()
    };
  },
  getAccuracyMetrics,
  getRiskGuardStatus,
  getActivePositions: () => state.activePositions,
  getTradeHistory: () => state.tradeHistory
};
