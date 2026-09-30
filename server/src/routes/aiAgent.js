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
const { getLearningStats } = require('../services/aiLearningEngine');
const { getNotifications, clearNotifications } = require('../services/notificationService');

const router = express.Router();

// GET /api/ai-agent/status
router.get('/status', (req, res) => {
  try {
    const status = getAgentStatus();
    res.json({
      success: true,
      status
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/ai-agent/accuracy
router.get('/accuracy', (req, res) => {
  try {
    const accuracy = getAccuracyMetrics();
    res.json({
      success: true,
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
    const riskGuard = getRiskGuardStatus();
    res.json({
      success: true,
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
    const result = await panicSquareOffAll();
    const status = getAgentStatus();
    res.json({
      success: true,
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
    const { enabled } = req.body;
    const isAutoPilotActive = toggleAutoPilot(enabled);
    res.json({
      success: true,
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
    await runAutonomousCycle();
    const status = getAgentStatus();
    res.json({
      success: true,
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
    const result = await resetAgentSandbox();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
