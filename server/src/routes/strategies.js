const express = require('express');
const {
  STRATEGY_CATALOG,
  getMarketUniverse,
  executeTrade,
  tickPosition,
  closePosition,
  resetTestSandbox,
  getActivePositions,
  getTradeHistory
} = require('../services/strategyEngine');
const { runTodayMarketAudit } = require('../services/todayAuditEngine');
const { getMonthPLData } = require('../services/calendarEngine');

const router = express.Router();

// POST /api/strategies/reset-test
router.post('/reset-test', (req, res) => {
  const result = resetTestSandbox();
  res.json({
    success: true,
    message: 'Test sandbox reset to initial state with ₹100,000 virtual capital.',
    result
  });
});


// GET /api/strategies/calendar
router.get('/calendar', (req, res) => {
  const month = parseInt(req.query.month) || 9;
  const year = parseInt(req.query.year) || 2026;
  const calendarData = getMonthPLData(month, year);
  res.json({
    success: true,
    calendar: calendarData
  });
});

// GET /api/strategies/today-audit
router.get('/today-audit', async (req, res) => {
  const audit = await runTodayMarketAudit();
  res.json({
    success: true,
    audit
  });
});

// GET /api/strategies/catalog
router.get('/catalog', (req, res) => {
  res.json({
    success: true,
    strategies: STRATEGY_CATALOG
  });
});

// GET /api/strategies/scan?horizon=INTRADAY
router.get('/scan', async (req, res) => {
  const horizon = (req.query.horizon || 'INTRADAY').toUpperCase();
  const validHorizons = ['INTRADAY', 'SHORT_TERM', 'MEDIUM_TERM', 'LONG_TERM', 'F_AND_O'];

  const selectedHorizon = validHorizons.includes(horizon) ? horizon : 'INTRADAY';
  const scannedStocks = await getMarketUniverse(selectedHorizon);

  res.json({
    success: true,
    horizon: selectedHorizon,
    catalog: STRATEGY_CATALOG[selectedHorizon],
    count: scannedStocks.length,
    stocks: scannedStocks,
    profitLockGuard: {
      active: true,
      description: 'Zero-loss breakeven ratchet and dynamic trailing stop activated across all executions.'
    }
  });
});

// GET /api/strategies/positions
router.get('/positions', (req, res) => {
  res.json({
    success: true,
    activePositions: getActivePositions(),
    tradeHistory: getTradeHistory()
  });
});

// POST /api/strategies/execute
router.post('/execute', (req, res) => {
  try {
    const { symbol, horizon, direction, price, quantity, optionDetails } = req.body;

    if (!symbol || !direction || !price) {
      return res.status(400).json({
        success: false,
        message: 'Missing required trade execution parameters (symbol, direction, price).'
      });
    }

    const trade = executeTrade({
      symbol,
      horizon: horizon || 'INTRADAY',
      direction,
      price: parseFloat(price),
      quantity: parseInt(quantity) || 50,
      optionDetails
    });

    res.status(201).json({
      success: true,
      message: `Trade placed successfully with Profit-Lock Guard!`,
      trade
    });
  } catch (error) {
    console.error('Execute trade error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute simulated trade.'
    });
  }
});

// POST /api/strategies/positions/:id/tick
router.post('/positions/:id/tick', (req, res) => {
  const { newPrice } = req.body;
  if (!newPrice) {
    return res.status(400).json({ success: false, message: 'newPrice is required' });
  }

  const result = tickPosition(req.params.id, parseFloat(newPrice));
  if (!result) {
    return res.status(404).json({ success: false, message: 'Position not found' });
  }

  res.json({
    success: true,
    position: result
  });
});

// POST /api/strategies/positions/:id/close
router.post('/positions/:id/close', (req, res) => {
  const closed = closePosition(req.params.id);
  if (!closed) {
    return res.status(404).json({ success: false, message: 'Position not found' });
  }

  res.json({
    success: true,
    message: 'Position closed successfully and profit recorded.',
    closedPosition: closed
  });
});

module.exports = router;
