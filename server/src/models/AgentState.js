const mongoose = require('mongoose');

const agentStateSchema = new mongoose.Schema({
  key: { type: String, default: 'primary_sentinel', unique: true },
  isAutoPilotActive: { type: Boolean, default: true },
  virtualCapital: { type: Number, default: 100000 },
  maxConcurrentPositions: { type: Number, default: 2 }, // Strict cap: max 2 simultaneous trades
  dailyTradeLimit: { type: Number, default: 5 }, // Strict cap: max 5 trades per calendar day
  dailyTradesCount: { type: Number, default: 0 },
  lastTradeDate: { type: String, default: () => new Date().toISOString().split('T')[0] },
  lastTradeTimestamp: { type: Number, default: 0 },
  tradeCooldownMs: { type: Number, default: 600000 }, // 10 minutes between new entries
  minCashReserveRatio: { type: Number, default: 0.70 }, // 70% cash floor protection
  decisionLogs: [{
    id: String,
    timestamp: String,
    displayTime: String,
    type: String,
    message: String,
    metadata: mongoose.Schema.Types.Mixed
  }]
}, {
  timestamps: true
});

module.exports = mongoose.models.AgentState || mongoose.model('AgentState', agentStateSchema);
