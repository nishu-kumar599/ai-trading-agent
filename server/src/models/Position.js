const mongoose = require('mongoose');

const positionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  market: { type: String, enum: ['IN', 'US'], default: 'IN' },
  symbol: { type: String, required: true },
  baseSymbol: { type: String },
  horizon: { type: String, enum: ['INTRADAY', 'SHORT_TERM', 'MEDIUM_TERM', 'LONG_TERM', 'F_AND_O'], default: 'INTRADAY' },
  direction: { type: String, required: true }, // BUY, SELL, BUY_CALL, BUY_PUT
  entryPrice: { type: Number, required: true },
  currentPrice: { type: Number, required: true },
  stopLoss: { type: Number, required: true },
  target1: { type: Number, required: true },
  target2: { type: Number, required: true },
  quantity: { type: Number, required: true },
  initialQuantity: { type: Number },
  partialProfitTaken: { type: Boolean, default: false },
  breakevenActivated: { type: Boolean, default: false },
  trailingPct: { type: Number, default: 0.01 },
  unrealizedPL: { type: Number, default: 0.0 },
  unrealizedPLPct: { type: Number, default: 0.0 },
  status: { type: String, default: 'ACTIVE_RUNNING' }, // ACTIVE_RUNNING, PROFIT_LOCKED, TARGET_1_PARTIAL_PROFIT, AMO_PENDING_OPEN
  isAMO: { type: Boolean, default: false },
  isAutonomous: { type: Boolean, default: false },
  underlyingSpotAtEntry: { type: Number },
  openedAt: { type: Date, default: Date.now },
  score: { type: Number },
  confidence: { type: Number },
  rrRatio: { type: Number },
  rationale: { type: String },
  ticksObserved: { type: Number, default: 0 }
}, {
  timestamps: true
});

module.exports = mongoose.models.Position || mongoose.model('Position', positionSchema);
