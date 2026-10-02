const express = require('express');
const {
  getAgentStatus,
  getAccuracyMetrics,
  getRiskGuardStatus,
  toggleAutoPilot,
  runAutonomousCycle,
  resetAgentSandbox,
  panicSquareOffAll,
  setRiskProfile
} = require('../services/aiAgentEngine');
const {
  getUSAgentStatus,
  toggleUSAutoPilot,
  getUSTradeHistory,
  runUSAutonomousCycle,
  panicSquareOffUSAll,
  resetUSAgentSandbox
} = require('../services/usAiAgentEngine');
const { getLearningStats } = require('../services/aiLearningEngine');
const { getNotifications, clearNotifications } = require('../services/notificationService');

const router = express.Router();

// GET /api/ai-agent/status?market=IN|US
router.get('/status', (req, res) => {
  try {
    const market = (req.query.market || 'IN').toUpperCase();
    if (market === 'US') {
      const status = getUSAgentStatus();
      return res.json({
        success: true,
        market: 'US',
        status
      });
    }

    const status = getAgentStatus();
    res.json({
      success: true,
      market: 'IN',
      status
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/ai-agent/accuracy?market=IN|US
router.get('/accuracy', (req, res) => {
  try {
    const market = (req.query.market || 'IN').toUpperCase();
    if (market === 'US') {
      const { getUSAccuracyMetrics } = require('../services/usAiAgentEngine');
      return res.json({
        success: true,
        market: 'US',
        accuracy: getUSAccuracyMetrics()
      });
    }

    const accuracy = getAccuracyMetrics();
    res.json({
      success: true,
      market: 'IN',
      accuracy
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/ai-agent/learning-stats
router.get('/learning-stats', (req, res) => {
  try {
    const learning = getLearningStats();
    res.json({
      success: true,
      learning
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/ai-agent/risk-guard
router.get('/risk-guard', (req, res) => {
  try {
    const market = (req.query.market || 'IN').toUpperCase();
    if (market === 'US') {
      const { getUSRiskGuardStatus } = require('../services/usAiAgentEngine');
      return res.json({
        success: true,
        market: 'US',
        riskGuard: getUSRiskGuardStatus()
      });
    }

    const riskGuard = getRiskGuardStatus();
    res.json({
      success: true,
      market: 'IN',
      riskGuard
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/ai-agent/notifications
router.get('/notifications', (req, res) => {
  try {
    const notifications = getNotifications();
    res.json({
      success: true,
      notifications
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/ai-agent/panic-exit-all (1-Click Emergency Panic Square-off)
router.post('/panic-exit-all', async (req, res) => {
  try {
    const market = (req.body.market || req.query.market || 'IN').toUpperCase();
    if (market === 'US') {
      const result = await panicSquareOffUSAll();
      const status = getUSAgentStatus();
      return res.json({
        success: true,
        market: 'US',
        message: result.message,
        liquidatedCount: result.count,
        totalNetPL: result.totalNetPL,
        status
      });
    }

    const result = await panicSquareOffAll();
    const status = getAgentStatus();
    res.json({
      success: true,
      market: 'IN',
      message: result.message,
      liquidatedCount: result.count,
      totalNetPL: result.totalNetPL,
      status
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/ai-agent/risk-profile (Conservative, Balanced, Aggressive)
router.post('/risk-profile', (req, res) => {
  try {
    const { profile } = req.body;
    const result = setRiskProfile(profile);
    const status = getAgentStatus();
    res.json({
      success: true,
      message: `Risk Profile successfully updated to ${result.profile}.`,
      profile: result.details,
      status
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/ai-agent/toggle
router.post('/toggle', (req, res) => {
  try {
    const market = (req.body.market || req.query.market || 'IN').toUpperCase();
    if (market === 'US') {
      const isAutoPilotActive = toggleUSAutoPilot(req.body.enabled);
      return res.json({
        success: true,
        market: 'US',
        isAutoPilotActive,
        message: `US Auto-Pilot is now ${isAutoPilotActive ? 'ENABLED' : 'PAUSED'}.`
      });
    }

    const { enabled } = req.body;
    const isAutoPilotActive = toggleAutoPilot(enabled);
    res.json({
      success: true,
      market: 'IN',
      isAutoPilotActive,
      message: `Auto-Pilot is now ${isAutoPilotActive ? 'ENABLED' : 'PAUSED'}.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/ai-agent/trigger-scan
router.post('/trigger-scan', async (req, res) => {
  try {
    const market = (req.body.market || req.query.market || 'IN').toUpperCase();
    if (market === 'US') {
      await runUSAutonomousCycle();
      const status = getUSAgentStatus();
      return res.json({
        success: true,
        market: 'US',
        message: 'US Autonomous scan and execution cycle completed.',
        status
      });
    }

    await runAutonomousCycle();
    const status = getAgentStatus();
    res.json({
      success: true,
      market: 'IN',
      message: 'Autonomous scan and execution cycle completed.',
      status
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/ai-agent/reset-state
router.post('/reset-state', async (req, res) => {
  try {
    const market = (req.body.market || req.query.market || 'IN').toUpperCase();
    if (market === 'US') {
      const result = await resetUSAgentSandbox();
      return res.json(result);
    }

    const result = await resetAgentSandbox();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
