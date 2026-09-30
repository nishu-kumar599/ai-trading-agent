/**
 * AI Trading Agent Self-Learning & Reinforcement Engine
 * 
 * Capabilities:
 * 1. Post-Trade Analysis: Evaluates actual outcome (WIN, BREAKEVEN, LOSS, net P&L after brokerage).
 * 2. Adaptive Calibration: Dynamically recalibrates indicator weights (RSI, VWAP, EMA, Volume) and segment multipliers.
 * 3. Stringency Ratchet: Dynamically raises score threshold if losses occur to prevent repeating mistakes.
 * 4. Dual-Mode Cloud & Local Persistence:
 *    - Saves to MongoDB `LearningModel` collection when cloud DB is connected.
 *    - Seamlessly falls back to `server/data/learning_weights.json`.
 */

const fs = require('fs');
const path = require('path');
const { isMongoConnected } = require('../config/database');

const LEARNING_FILE_PATH = path.join(__dirname, '../../data/learning_weights.json');

// Default initial learning state
let learningState = {
  modelName: 'reinforcement_v1',
  totalTradesAnalyzed: 0,
  consecutiveWins: 0,
  consecutiveLosses: 0,
  baseScoreThreshold: 80,
  learnedAccuracyRate: 100,
  weights: {
    rsiWeight: 12.0,
    vwapWeight: 12.0,
    emaWeight: 10.0,
    volumeWeight: 8.0,
    riskRewardMultiplier: 1.0
  },
  segmentMultipliers: {
    INTRADAY: 1.0,
    F_AND_O: 1.0,
    SHORT_TERM: 1.0
  },
  evolutionLogs: [
    {
      timestamp: new Date().toISOString(),
      tradeId: 'init_calibration',
      symbol: 'SYSTEM_BOOT',
      outcome: 'INITIALIZED',
      pnl: 0,
      insight: 'AI Self-Learning Engine initialized. Quantitative baseline weights calibrated for Indian equities & F&O.',
      weightAdjustment: 'RSI: 12.0, VWAP: 12.0, EMA: 10.0, Vol: 8.0'
    }
  ]
};

// Load persisted weights
async function loadLearningModel() {
  try {
    if (isMongoConnected()) {
      const LearningModel = require('../models/LearningModel');
      const doc = await LearningModel.findOne({ modelName: 'reinforcement_v1' }).lean();
      if (doc) {
        learningState = {
          ...learningState,
          ...doc,
          weights: { ...learningState.weights, ...(doc.weights || {}) },
          segmentMultipliers: { ...learningState.segmentMultipliers, ...(doc.segmentMultipliers || {}) },
          evolutionLogs: doc.evolutionLogs || learningState.evolutionLogs
        };
        console.log('🍃 [AI Learning] Loaded learned weights from MongoDB Cloud Database.');
        return;
      }
    }

    // Local fallback
    if (fs.existsSync(LEARNING_FILE_PATH)) {
      const raw = fs.readFileSync(LEARNING_FILE_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      learningState = {
        ...learningState,
        ...parsed,
        weights: { ...learningState.weights, ...(parsed.weights || {}) },
        segmentMultipliers: { ...learningState.segmentMultipliers, ...(parsed.segmentMultipliers || {}) },
        evolutionLogs: parsed.evolutionLogs || learningState.evolutionLogs
      };
      console.log('📁 [AI Learning] Loaded learned weights from local JSON file.');
    }
  } catch (err) {
    console.warn('⚠️ [AI Learning] Error loading weights, using defaults:', err.message);
  }
}

// Persist learning weights
async function saveLearningModel() {
  try {
    // 1. Save to local JSON
    const dir = path.dirname(LEARNING_FILE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(LEARNING_FILE_PATH, JSON.stringify(learningState, null, 2), 'utf8');

    // 2. Save to MongoDB if connected
    if (isMongoConnected()) {
      const LearningModel = require('../models/LearningModel');
      await LearningModel.findOneAndUpdate(
        { modelName: 'reinforcement_v1' },
        learningState,
        { upsert: true, new: true }
      );
    }
  } catch (err) {
    console.warn('⚠️ [AI Learning] Error persisting weights:', err.message);
  }
}

/**
 * Record a closed trade outcome and adaptively calibrate feature weights
 * @param {Object} closedTrade 
 */
async function recordTradeOutcome(closedTrade) {
  if (!closedTrade) return;

  learningState.totalTradesAnalyzed += 1;
  const netPL = closedTrade.netRealizedPL !== undefined ? closedTrade.netRealizedPL : (closedTrade.realizedPL || 0);
  const outcome = closedTrade.outcome || (netPL > 0 ? 'WIN' : (netPL === 0 ? 'BREAKEVEN' : 'LOSS'));
  const horizon = closedTrade.horizon || 'INTRADAY';
  const symbol = closedTrade.symbol || 'STOCK';
  const features = closedTrade.featuresAtEntry || {};

  let insight = '';
  let weightAdjustment = '';

  if (outcome === 'WIN') {
    learningState.consecutiveWins += 1;
    learningState.consecutiveLosses = 0;

    // Reinforce indicators that aligned with this winner
    if (features.vwapAligned !== false) {
      learningState.weights.vwapWeight = Math.min(22, +(learningState.weights.vwapWeight + 0.3).toFixed(2));
    }
    if (features.rsiInSweetSpot !== false) {
      learningState.weights.rsiWeight = Math.min(22, +(learningState.weights.rsiWeight + 0.25).toFixed(2));
    }
    if (features.volumeSurge) {
      learningState.weights.volumeWeight = Math.min(18, +(learningState.weights.volumeWeight + 0.2).toFixed(2));
    }

    // Boost confidence in this segment
    if (learningState.segmentMultipliers[horizon] !== undefined) {
      learningState.segmentMultipliers[horizon] = Math.min(1.3, +(learningState.segmentMultipliers[horizon] + 0.03).toFixed(2));
    }

    insight = `Profitable trade executed on ${symbol} (Net +₹${netPL.toFixed(2)}). Reinforcing VWAP & RSI confluence weights for ${horizon}.`;
    weightAdjustment = `VWAP: ${learningState.weights.vwapWeight}, RSI: ${learningState.weights.rsiWeight}, Multiplier (${horizon}): ${learningState.segmentMultipliers[horizon]}`;

  } else if (outcome === 'BREAKEVEN') {
    learningState.consecutiveLosses = 0;
    insight = `Zero-Loss Breakeven ratchet defended capital on ${symbol} (Net ₹${netPL.toFixed(2)}). Stop-loss lock validated.`;
    weightAdjustment = `Weights maintained; risk ceiling confirmed.`;

  } else {
    // LOSS: Calibrate defensively to prevent repeating mistakes
    learningState.consecutiveLosses += 1;
    learningState.consecutiveWins = 0;

    // Raise score threshold to make entry filter stricter
    learningState.baseScoreThreshold = Math.min(86, learningState.baseScoreThreshold + 1);

    // If loss lacked volume confirmation, penalize low-volume setups
    if (!features.volumeSurge) {
      learningState.weights.volumeWeight = Math.min(20, +(learningState.weights.volumeWeight + 0.5).toFixed(2));
    }

    // Soft dampener on segment multiplier
    if (learningState.segmentMultipliers[horizon] !== undefined) {
      learningState.segmentMultipliers[horizon] = Math.max(0.75, +(learningState.segmentMultipliers[horizon] - 0.05).toFixed(2));
    }

    insight = `Loss registered on ${symbol} (Net -₹${Math.abs(netPL).toFixed(2)}). Raised entry score threshold to ${learningState.baseScoreThreshold} and tightened volume requirements.`;
    weightAdjustment = `Threshold: ${learningState.baseScoreThreshold}, VolReq: ${learningState.weights.volumeWeight}, Multiplier (${horizon}): ${learningState.segmentMultipliers[horizon]}`;
  }

  // Add to evolution logs (keep last 30)
  learningState.evolutionLogs.unshift({
    timestamp: new Date().toISOString(),
    tradeId: closedTrade.id,
    symbol,
    outcome,
    pnl: +netPL.toFixed(2),
    insight,
    weightAdjustment
  });

  if (learningState.evolutionLogs.length > 30) {
    learningState.evolutionLogs = learningState.evolutionLogs.slice(0, 30);
  }

  await saveLearningModel();
  console.log(`🧠 [AI Learning] Analyzed Trade ${closedTrade.id}: ${insight}`);
}

/**
 * Calculate dynamic score adjustment for a candidate setup using learned weights
 * @param {Object} stock 
 * @param {string} horizon 
 * @returns {number} Score modifier (+/- points)
 */
function getLearnedScoreModifier(stock, horizon) {
  let modifier = 0;
  const price = stock.price || 1000;
  const vwap = stock.vwap || price;
  const rsi = stock.rsi || 50;
  const volumeRatio = stock.volumeRatio || 1.0;

  // 1. VWAP confluence bonus based on learned weight (baseline 12)
  const vwapExtra = (learningState.weights.vwapWeight - 12.0);
  if (Math.abs(price - vwap) / price < 0.015) {
    modifier += vwapExtra * 0.4;
  }

  // 2. RSI sweet-spot bonus based on learned weight (baseline 12)
  const rsiExtra = (learningState.weights.rsiWeight - 12.0);
  if (rsi >= 54 && rsi <= 64) {
    modifier += rsiExtra * 0.4;
  }

  // 3. Volume surge bonus based on learned weight (baseline 8)
  const volExtra = (learningState.weights.volumeWeight - 8.0);
  if (volumeRatio >= 1.3) {
    modifier += volExtra * 0.5;
  }

  // 4. Segment multiplier adjustment
  const segMultiplier = learningState.segmentMultipliers[horizon] || 1.0;
  if (segMultiplier > 1.0) {
    modifier += (segMultiplier - 1.0) * 10;
  } else if (segMultiplier < 1.0) {
    modifier -= (1.0 - segMultiplier) * 10;
  }

  return Math.round(modifier);
}

/**
 * Get current learning statistics and evolution history
 */
function getLearningStats() {
  return {
    modelName: learningState.modelName,
    totalTradesAnalyzed: learningState.totalTradesAnalyzed,
    consecutiveWins: learningState.consecutiveWins,
    consecutiveLosses: learningState.consecutiveLosses,
    baseScoreThreshold: learningState.baseScoreThreshold,
    weights: learningState.weights,
    segmentMultipliers: learningState.segmentMultipliers,
    recentEvolutionLogs: learningState.evolutionLogs.slice(0, 10),
    isMongoSynced: isMongoConnected()
  };
}

// Initialize on module load
loadLearningModel();

module.exports = {
  loadLearningModel,
  saveLearningModel,
  recordTradeOutcome,
  getLearnedScoreModifier,
  getLearningStats,
  getBaseScoreThreshold: () => learningState.baseScoreThreshold
};
