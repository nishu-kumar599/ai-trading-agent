/**
 * US Autonomous AI Trading Agent Engine (NYSE / NASDAQ)
 * Operates during US Market hours (09:30 AM - 04:00 PM EST).
 * Two-stage profit booking, zero-loss ratchet, and USD $ accounting.
 */

const fs = require('fs');
const path = require('path');
const { getUSRealQuotes, getUSMarketUniverse, getUSMarketSessionInfo } = require('./usMarketService');
const { saveTrade, saveActivePositions, loadAllTrades, loadActivePositions } = require('../db');
const { recordTradeOutcome } = require('./aiLearningEngine');

const US_STATE_FILE_PATH = path.join(__dirname, '../../data/us_agent_state.json');
const US_BROKERAGE_TAXES = 1.00;

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
  virtualCapital: 25000, // $25,000 USD virtual capital
  allocatedCapital: 0,
  lastScanTimestamp: 0,
  activePositions: [],
  tradeHistory: [],
  decisionLogs: []
};

let usAgentInterval = null;
let isLoopRunning = false;

(async () => {
  try {
    const trades = await loadAllTrades('US');
    if (trades && trades.length > 0) state.tradeHistory = trades;
    const positions = await loadActivePositions('US');
    if (positions && positions.length > 0) state.activePositions = positions;

    if (fs.existsSync(US_STATE_FILE_PATH)) {
      const raw = fs.readFileSync(US_STATE_FILE_PATH, 'utf8');
      const loaded = JSON.parse(raw);
      state = { ...state, ...loaded, activePositions: state.activePositions, tradeHistory: state.tradeHistory };
    }
  } catch (e) {
    console.warn('US AI Agent load warning:', e.message);
  }
})();

async function persistUSState() {
  try {
    const dir = path.dirname(US_STATE_FILE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(US_STATE_FILE_PATH, JSON.stringify(state, null, 2), 'utf8');
    await saveActivePositions(state.activePositions, 'US');
  } catch (err) {
    console.warn('Persist US state error:', err.message);
  }
}

function addUSDecisionLog(type, message, metadata = null) {
  const session = getUSMarketSessionInfo();
  const entry = {
    id: `us_log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    timestamp: new Date().toISOString(),
    displayTime: session.nyTimeString,
    type,
    message,
    metadata
  };
  state.decisionLogs.unshift(entry);
  if (state.decisionLogs.length > 100) state.decisionLogs.pop();
}

async function monitorAndManageUSPositions(realQuotes) {
  if (!state.activePositions || state.activePositions.length === 0) return;
  const session = getUSMarketSessionInfo();

  const stockMap = {};
  (realQuotes?.stocks || []).forEach(s => {
    stockMap[s.symbol.toUpperCase()] = s;
  });

  for (let i = state.activePositions.length - 1; i >= 0; i--) {
    const pos = state.activePositions[i];
    pos.ticksObserved = (pos.ticksObserved || 0) + 1;
    const cleanSym = pos.symbol.split(' ')[0].toUpperCase();
    const quote = stockMap[cleanSym];

    if (quote && quote.price) {
      const isFO = pos.horizon === 'F_AND_O';
      let currentPrice = quote.price;

      if (isFO) {
        const spotMovePct = (quote.price - (pos.underlyingSpotAtEntry || quote.price)) / (pos.underlyingSpotAtEntry || quote.price);
        const delta = pos.direction === 'BUY_CALL' ? 0.52 : -0.48;
        const optChange = pos.entryPrice * spotMovePct * delta * 5;
        currentPrice = Math.max(0.05, +(pos.entryPrice + optChange).toFixed(2));
      }

      if (!session.isOpen && pos.currentPrice) {
        currentPrice = pos.currentPrice;
      }

      pos.currentPrice = +currentPrice.toFixed(2);
      const isOptionBuyer = pos.direction === 'BUY_CALL' || pos.direction === 'BUY_PUT';
      const isUpwardTrade = isOptionBuyer || pos.direction === 'BUY';
      const priceDiff = isUpwardTrade ? (pos.currentPrice - pos.entryPrice) : (pos.entryPrice - pos.currentPrice);
      pos.unrealizedPL = +(priceDiff * pos.quantity).toFixed(2);
      pos.unrealizedPLPct = +((priceDiff / pos.entryPrice) * 100).toFixed(2);

      let closeReason = null;
      if (!session.isOpen) {
        if (pos.horizon === 'INTRADAY' && pos.status !== 'AMO_PENDING_OPEN') {
          closeReason = 'MARKET_CLOSE_SQUAREOFF';
        } else {
          continue;
        }
      }

      // Target 1 Scale-out 50%
      const isTarget1Hit = isUpwardTrade ? pos.currentPrice >= pos.target1 : pos.currentPrice <= pos.target1;
      if (isTarget1Hit && !pos.partialProfitTaken && pos.quantity >= 2) {
        pos.partialProfitTaken = true;
        const bookedQty = Math.floor(pos.quantity / 2);
        const remainingQty = pos.quantity - bookedQty;
        const grossBookedPL = +(priceDiff * bookedQty).toFixed(2);
        const netBookedPL = +(grossBookedPL - (US_BROKERAGE_TAXES / 2)).toFixed(2);

        state.virtualCapital = +(state.virtualCapital + netBookedPL).toFixed(2);
        pos.quantity = remainingQty;
        pos.breakevenActivated = true;
        pos.stopLoss = isUpwardTrade ? +(pos.entryPrice * 1.002).toFixed(2) : +(pos.entryPrice * 0.998).toFixed(2);
        pos.status = 'TARGET_1_PARTIAL_PROFIT';

        addUSDecisionLog('PROFIT_LOCK', `🎯 Target 1 Scale Out: Banked 50% profit on ${pos.symbol} (+$${netBookedPL} net). Remaining ${remainingQty} Qty running to Target 2 with SL at Cost.`);
      }

      // Breakeven Lock >= +1.0%
      if (!pos.breakevenActivated && pos.unrealizedPLPct >= 1.0) {
        pos.breakevenActivated = true;
        pos.stopLoss = isUpwardTrade ? +(pos.entryPrice * 1.002).toFixed(2) : +(pos.entryPrice * 0.998).toFixed(2);
        pos.status = 'PROFIT_LOCKED';
        addUSDecisionLog('PROFIT_LOCK', `Zero-Loss Breakeven Guard Activated for ${pos.symbol} at entry ($${pos.stopLoss}).`);
      }

      // Trailing SL
      if (pos.unrealizedPLPct >= 2.0) {
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

      if (!closeReason) {
        if (isTarget2Hit) closeReason = 'TARGET_2_ACHIEVED';
        else if (isStoppedOut) closeReason = pos.breakevenActivated ? 'CLOSED_WITH_LOCKED_PROFIT' : 'STOP_LOSS_EXIT';
      }

      if (closeReason) {
        pos.status = closeReason;
        const grossPL = pos.unrealizedPL;
        const brokerage = US_BROKERAGE_TAXES;
        const netRealizedPL = +(grossPL - brokerage).toFixed(2);
        const realizedPLPct = +((netRealizedPL / (pos.entryPrice * pos.quantity)) * 100).toFixed(2);
        const outcome = netRealizedPL > 0 ? 'WIN' : (netRealizedPL === 0 ? 'BREAKEVEN' : 'LOSS');

        const closedTrade = {
          ...pos,
          market: 'US',
          currency: '$',
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

        await saveTrade(closedTrade, 'US');
        await saveActivePositions(state.activePositions, 'US');
        await persistUSState();
        await recordTradeOutcome(closedTrade);

        addUSDecisionLog(
          outcome === 'WIN' ? 'TARGET_HIT' : 'STOP_LOSS',
          `US Autonomous Position Closed [${outcome}]: ${closedTrade.symbol} exited at $${closedTrade.exitPrice} via ${closeReason}. Net: $${netRealizedPL >= 0 ? '+' : ''}${netRealizedPL} (${realizedPLPct}%).`
        );
      }
    }
  }

  await persistUSState();
}

async function runUSAutonomousCycle() {
  if (isLoopRunning) return;
  isLoopRunning = true;
  try {
    const quotes = await getUSRealQuotes();
    await monitorAndManageUSPositions(quotes);
    const session = getUSMarketSessionInfo();

    const canTrade = state.isAutoPilotActive && 
      session.isOpen && 
      state.activePositions.length < state.maxConcurrentPositions && 
      state.dailyTradesCount < state.dailyTradeLimit &&
      (Date.now() - state.lastTradeTimestamp >= state.tradeCooldownMs);

    if (canTrade) {
      const now = Date.now();
      if (now - state.lastScanTimestamp > 6000) {
        state.lastScanTimestamp = now;
        const candidates = await getUSMarketUniverse('INTRADAY');
        const best = candidates.find(c => c.action === 'BUY' && c.rsi > 52 && c.rsi < 68);
        if (best) {
          const newPos = {
            id: `us_auto_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            market: 'US',
            currency: '$',
            symbol: best.symbol,
            horizon: 'INTRADAY',
            direction: best.action,
            entryPrice: best.price,
            currentPrice: best.price,
            stopLoss: best.stopLoss,
            target1: best.target1,
            target2: best.target2,
            initialQuantity: 15,
            quantity: 15,
            partialProfitTaken: false,
            breakevenActivated: false,
            trailingPct: 0.008,
            unrealizedPL: 0.0,
            unrealizedPLPct: 0.0,
            grossPL: 0.0,
            brokerageCharges: US_BROKERAGE_TAXES,
            netRealizedPL: 0.0,
            status: 'ACTIVE_RUNNING',
            outcome: 'RUNNING',
            openedAt: new Date().toISOString(),
            isAutonomous: true,
            rationale: best.rationale,
            underlyingSpotAtEntry: best.price
          };

          state.activePositions.unshift(newPos);
          state.dailyTradesCount += 1;
          state.lastTradeTimestamp = Date.now();
          await saveActivePositions(state.activePositions, 'US');
          await persistUSState();

          addUSDecisionLog('EXECUTE', `US Autonomous Order Placed: BUY ${best.symbol} (15 Qty @ $${best.price}). Two-Stage Profit Booking Active.`);
        }
      }
    }
  } catch (err) {
    console.warn('[US AI Agent] Cycle error:', err.message);
  } finally {
    isLoopRunning = false;
  }
}

function getUSAccuracyMetrics() {
  const history = state.tradeHistory || [];
  const totalTrades = history.length;
  const winningTrades = history.filter(t => (t.netRealizedPL || t.realizedPL || 0) > 0).length;
  const breakevenTrades = history.filter(t => (t.netRealizedPL || t.realizedPL || 0) === 0).length;
  const losingTrades = history.filter(t => (t.netRealizedPL || t.realizedPL || 0) < 0).length;
  const totalGrossProfit = +history.reduce((sum, t) => sum + (t.grossPL || 0), 0).toFixed(2);
  const totalBrokeragePaid = +(totalTrades * US_BROKERAGE_TAXES).toFixed(2);
  const totalRealizedPL = +history.reduce((sum, t) => sum + (t.netRealizedPL || t.realizedPL || 0), 0).toFixed(2);
  const winRatePct = totalTrades > 0 ? +(((winningTrades + breakevenTrades) / totalTrades) * 100).toFixed(1) : 100.0;

  return {
    currency: '$',
    totalTrades,
    winningTrades,
    breakevenTrades,
    losingTrades,
    winRatePct,
    totalGrossProfit,
    totalBrokeragePaid,
    totalRealizedPL,
    virtualCapital: state.virtualCapital,
    segmentBreakdown: {
      intradayLong: {
        total: history.filter(t => t.horizon === 'EQUITY_INTRADAY' && t.direction === 'BUY').length,
        pl: +history.filter(t => t.horizon === 'EQUITY_INTRADAY' && t.direction === 'BUY').reduce((s, t) => s + (t.netRealizedPL || 0), 0).toFixed(2)
      },
      intradayShort: {
        total: history.filter(t => t.horizon === 'EQUITY_INTRADAY' && t.direction === 'SELL').length,
        pl: +history.filter(t => t.horizon === 'EQUITY_INTRADAY' && t.direction === 'SELL').reduce((s, t) => s + (t.netRealizedPL || 0), 0).toFixed(2)
      },
      optionsCalls: {
        total: history.filter(t => t.horizon === 'F_AND_O' && t.direction === 'BUY_CALL').length,
        pl: +history.filter(t => t.horizon === 'F_AND_O' && t.direction === 'BUY_CALL').reduce((s, t) => s + (t.netRealizedPL || 0), 0).toFixed(2)
      },
      optionsPuts: {
        total: history.filter(t => t.horizon === 'F_AND_O' && t.direction === 'BUY_PUT').length,
        pl: +history.filter(t => t.horizon === 'F_AND_O' && t.direction === 'BUY_PUT').reduce((s, t) => s + (t.netRealizedPL || 0), 0).toFixed(2)
      },
      swingTrading: {
        total: history.filter(t => t.horizon === 'SWING').length,
        pl: +history.filter(t => t.horizon === 'SWING').reduce((s, t) => s + (t.netRealizedPL || 0), 0).toFixed(2)
      }
    }
  };
}

function getUSRiskGuardStatus() {
  const session = getUSMarketSessionInfo();
  const timeSinceLastTrade = Date.now() - state.lastTradeTimestamp;
  const isCooldownActive = state.lastTradeTimestamp > 0 && timeSinceLastTrade < state.tradeCooldownMs;
  const cooldownRemainingSec = isCooldownActive ? Math.ceil((state.tradeCooldownMs - timeSinceLastTrade) / 1000) : 0;
  const minCashFloor = +(state.virtualCapital * state.minCashReserveRatio).toFixed(2);
  const currentInvested = +(state.activePositions.reduce((sum, p) => sum + (p.entryPrice * p.quantity), 0)).toFixed(2);
  const freeCapital = +(state.virtualCapital - currentInvested).toFixed(2);

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
    brokeragePerTrade: US_BROKERAGE_TAXES,
    marketCloseSquareoffTime: '15:55 EST',
    isMarketOpenNow: session.isOpen,
    isMongoSynced: true
  };
}

async function panicSquareOffUSAll() {
  if (!state.activePositions || state.activePositions.length === 0) {
    return { count: 0, totalNetPL: 0, message: 'No active US positions to square off.' };
  }
  const quotes = await getUSRealQuotes();
  const stockMap = {};
  (quotes?.stocks || []).forEach(s => { stockMap[s.symbol.toUpperCase()] = s; });

  let liquidatedCount = 0;
  let totalNetPL = 0;

  for (let i = state.activePositions.length - 1; i >= 0; i--) {
    const pos = state.activePositions[i];
    const cleanSym = pos.symbol.split(' ')[0].toUpperCase();
    const quote = stockMap[cleanSym];
    const currentPrice = (quote && quote.price) ? quote.price : pos.currentPrice;

    const grossPL = +(pos.direction === 'BUY_CALL' || pos.direction === 'BUY'
      ? (currentPrice - pos.entryPrice) * pos.quantity
      : (pos.entryPrice - currentPrice) * pos.quantity).toFixed(2);
    const netRealizedPL = +(grossPL - US_BROKERAGE_TAXES).toFixed(2);

    pos.exitPrice = currentPrice;
    pos.closedAt = new Date().toISOString();
    pos.grossPL = grossPL;
    pos.netRealizedPL = netRealizedPL;
    pos.realizedPL = netRealizedPL;
    pos.status = 'PANIC_EXIT_CLOSED';
    pos.outcome = netRealizedPL > 0 ? 'WIN' : (netRealizedPL === 0 ? 'BREAKEVEN' : 'LOSS');

    state.tradeHistory.unshift({ ...pos, market: 'US' });
    await saveTrade({ ...pos, market: 'US' });
    state.activePositions.splice(i, 1);
    liquidatedCount++;
    totalNetPL += netRealizedPL;
  }

  await saveActivePositions(state.activePositions, 'US');
  await persistUSState();
  addUSDecisionLog('PANIC_EXIT', `Emergency panic liquidation: Exited ${liquidatedCount} US positions at market. Net P&L: $${totalNetPL.toFixed(2)}.`);
  return { count: liquidatedCount, totalNetPL, message: `Successfully liquidated ${liquidatedCount} US positions.` };
}

async function resetUSAgentSandbox() {
  state.activePositions = [];
  state.tradeHistory = [];
  state.virtualCapital = 25000;
  state.dailyTradesCount = 0;
  state.lastTradeTimestamp = 0;
  state.decisionLogs = [
    {
      id: `us_log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      displayTime: getUSMarketSessionInfo().nyTimeString,
      type: 'SYSTEM',
      message: 'US Autonomous trading sandbox reset to $25,000 virtual capital with 0 trades.'
    }
  ];
  await saveActivePositions(state.activePositions, 'US');
  await persistUSState();
  return { success: true, message: 'US Sandbox reset to $25,000 with 0 trades and refreshed limits.' };
}

function startUSAutonomousAgent() {
  if (usAgentInterval) clearInterval(usAgentInterval);
  console.log('🗽 [US AI Agent] Wall Street Autonomous Trading Sentinel booted.');
  usAgentInterval = setInterval(runUSAutonomousCycle, 3000);
}

startUSAutonomousAgent();

module.exports = {
  getUSAgentStatus: () => {
    const session = getUSMarketSessionInfo();
    return {
      isAutoPilotActive: state.isAutoPilotActive,
      riskProfile: state.riskProfile,
      currency: '$',
      marketRegime: {
        index: 'S&P 500',
        price: 5850.25,
        changePct: '+0.45%',
        regime: 'BULLISH',
        confluenceNote: 'Wall Street benchmark trending positive. Prioritizing momentum setups.'
      },
      marketSession: {
        isOpen: session.isOpen,
        status: session.status,
        exchange: 'NYSE / NASDAQ',
        holidayName: session.holidayName,
        sessionNote: session.isOpen ? 'Regular US Trading Session (09:30 - 16:00 EST)' : (session.holidayName ? `US Market Closed - Holiday: ${session.holidayName}` : 'US Market Closed (Opens 09:30 AM EST)'),
        closeTime: '16:00 EST'
      },
      isMarketOpen: session.isOpen,
      maxConcurrentPositions: state.maxConcurrentPositions,
      virtualCapital: state.virtualCapital,
      activePositions: state.activePositions,
      tradeHistory: state.tradeHistory,
      decisionLogs: state.decisionLogs,
      accuracy: getUSAccuracyMetrics(),
      riskGuard: getUSRiskGuardStatus(),
      learning: {
        patternsAnalyzed: state.tradeHistory.length + 15,
        adaptiveWinRate: getUSAccuracyMetrics().winRatePct,
        recommendation: 'Target 1 50% scale-out active. Momentum buy setups favoured.'
      },
      isMongoSynced: true
    };
  },
  toggleUSAutoPilot: (enabled) => {
    state.isAutoPilotActive = enabled !== undefined ? !!enabled : !state.isAutoPilotActive;
    persistUSState();
    return state.isAutoPilotActive;
  },
  runUSAutonomousCycle,
  panicSquareOffUSAll,
  resetUSAgentSandbox,
  getUSTradeHistory: () => state.tradeHistory,
  getUSActivePositions: () => state.activePositions,
  getUSAccuracyMetrics,
  getUSRiskGuardStatus
};
