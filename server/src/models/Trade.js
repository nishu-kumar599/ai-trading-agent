const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  symbol: { type: String, required: true },
  baseSymbol: { type: String },
  horizon: { type: String, enum: ['INTRADAY', 'SHORT_TERM', 'MEDIUM_TERM', 'LONG_TERM', 'F_AND_O'], default: 'INTRADAY' },
  direction: { type: String, required: true }, // BUY, SELL, BUY_CALL, BUY_PUT
  entryPrice: { type: Number, required: true },
  currentPrice: { type: Number, required: true },
  exitPrice: { type: Number },
  stopLoss: { type: Number, required: true },
  target1: { type: Number, required: true },
  target2: { type: Number, required: true },
  quantity: { type: Number, required: true },
  breakevenActivated: { type: Boolean, default: false },
  trailingPct: { type: Number, default: 0.01 },
  unrealizedPL: { type: Number, default: 0.0 },
  unrealizedPLPct: { type: Number, default: 0.0 },
  grossPL: { type: Number, default: 0.0 },
  brokerageCharges: { type: Number, default: 45.0 }, // ₹20 entry + ₹20 exit + ₹5 taxes
  netRealizedPL: { type: Number, default: 0.0 },
  realizedPL: { type: Number, default: 0.0 }, // Mirrors netRealizedPL for backwards compatibility
  realizedPLPct: { type: Number, default: 0.0 },
  status: { type: String, default: 'ACTIVE_RUNNING' }, // ACTIVE_RUNNING, PROFIT_LOCKED, TARGET_1_PROFIT_TAKEN, TARGET_2_ACHIEVED, CLOSED_WITH_LOCKED_PROFIT, STOP_LOSS_EXIT, MARKET_CLOSE_SQUAREOFF, MANUALLY_CLOSED
  outcome: { type: String, enum: ['WIN', 'BREAKEVEN', 'LOSS', 'RUNNING'], default: 'RUNNING' },
  openedAt: { type: Date, default: Date.now },
  closedAt: { type: Date },
  isAutonomous: { type: Boolean, default: true },
  score: { type: Number },
  confidence: { type: Number },
  rrRatio: { type: Number },
  rationale: { type: String },
  ticksObserved: { type: Number, default: 0 },
  underlyingSpotAtEntry: { type: Number },
  featuresAtEntry: {
    rsi: { type: Number },
    vwapDiffPct: { type: Number },
    volumeRatio: { type: Number },
    emaAligned: { type: Boolean }
  }
}, {
  timestamps: true
});

module.exports = mongoose.models.Trade || mongoose.model('Trade', tradeSchema);
