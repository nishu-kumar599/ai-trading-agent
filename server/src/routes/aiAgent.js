const express = require('express');
const {
  getAgentStatus,
  getAccuracyMetrics,
  getRiskGuardStatus,
  toggleAutoPilot,
  runAutonomousCycle,
  resetAgentSandbox
} = require('../services/aiAgentEngine');
const { getLearningStats } = require('../services/aiLearningEngine');

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
