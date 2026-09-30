const mongoose = require('mongoose');

const learningModelSchema = new mongoose.Schema({
  modelName: { type: String, default: 'reinforcement_v1', unique: true },
  totalTradesAnalyzed: { type: Number, default: 0 },
  consecutiveWins: { type: Number, default: 0 },
  consecutiveLosses: { type: Number, default: 0 },
  baseScoreThreshold: { type: Number, default: 80 },
  learnedAccuracyRate: { type: Number, default: 100 },
  weights: {
    rsiWeight: { type: Number, default: 12 },
    vwapWeight: { type: Number, default: 12 },
    emaWeight: { type: Number, default: 10 },
    volumeWeight: { type: Number, default: 8 },
    riskRewardMultiplier: { type: Number, default: 1.0 }
  },
  segmentMultipliers: {
    INTRADAY: { type: Number, default: 1.0 },
    F_AND_O: { type: Number, default: 1.0 },
    SHORT_TERM: { type: Number, default: 1.0 }
  },
  evolutionLogs: [{
    timestamp: { type: Date, default: Date.now },
    tradeId: String,
    symbol: String,
    outcome: String,
    pnl: Number,
    insight: String,
    weightAdjustment: String
  }]
}, {
  timestamps: true
});

module.exports = mongoose.models.LearningModel || mongoose.model('LearningModel', learningModelSchema);
