const express = require('express');
const {
  getAgentStatus,
  getAccuracyMetrics,
  toggleAutoPilot,
  runAutonomousCycle,
  resetAgentSandbox
} = require('../services/aiAgentEngine');

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
router.post('/reset-state', (req, res) => {
  try {
    const result = resetAgentSandbox();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
