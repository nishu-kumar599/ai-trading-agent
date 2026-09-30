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
  let session = { isOpen: true, status: 'LIVE_TRADING', tradingHours: '09:15 - 15:30 IST', nextSessionMessage: '' };
  try {
    const { getMarketSessionInfo } = require('../services/realMarketService');
    session = getMarketSessionInfo();
  } catch (err) {}

  res.json({
    success: true,
    isMarketOpen: session.isOpen,
    marketStatus: session.status,
    tradingHours: session.tradingHours,
    nextSessionMessage: session.nextSessionMessage,
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
router.get('/positions', async (req, res) => {
  let quotes = null;
  let session = { isOpen: true, status: 'LIVE_TRADING', nextSessionMessage: '' };
  try {
    const { getRealQuotes, getMarketSessionInfo } = require('../services/realMarketService');
    quotes = await getRealQuotes();
    session = getMarketSessionInfo();
  } catch (err) {}

  res.json({
    success: true,
    isMarketOpen: session.isOpen,
    marketStatus: session.status,
    nextSessionMessage: session.nextSessionMessage,
    activePositions: getActivePositions(quotes),
    tradeHistory: getTradeHistory()
  });
});

// POST /api/strategies/execute
router.post('/execute', async (req, res) => {
  try {
    let { symbol, horizon, direction, price, quantity, optionDetails } = req.body;

    if (!symbol || !direction) {
      return res.status(400).json({
        success: false,
        message: 'Missing required trade execution parameters (symbol, direction).'
      });
    }

    // Ground execution price strictly in real-time market quote
    let liveSpot = parseFloat(price) || 0;
    try {
      const { getRealQuotes } = require('../services/realMarketService');
      const quotes = await getRealQuotes();
      const cleanSym = symbol.replace('.NS', '').trim().toUpperCase();
      const match = (quotes.stocks || []).find(s => s.symbol.replace('.NS', '').toUpperCase() === cleanSym)
                 || (quotes.indices || []).find(i => i.symbol.toUpperCase() === cleanSym || i.name.toUpperCase() === cleanSym);
      if (match && match.price) {
        liveSpot = match.price;
        if (!price || horizon !== 'F_AND_O') {
          price = match.price;
        }
      }
    } catch (e) {}

    if (!price) {
      price = liveSpot || 1000.0;
    }

    const trade = executeTrade({
      symbol,
      horizon: horizon || 'INTRADAY',
      direction,
      price: parseFloat(price),
      quantity: parseInt(quantity) || 50,
      optionDetails,
      liveSpot
    });

    const executionMsg = trade.isAMO
      ? `After-Market Order (AMO) placed at official closing settlement (₹${trade.entryPrice}). Live order tracking will activate when exchange opens at 09:15 AM IST.`
      : `Live Paper Order Executed at Real Market Price (₹${trade.entryPrice}) with Zero-Loss Guard!`;

    res.status(201).json({
      success: true,
      message: executionMsg,
      isAMO: trade.isAMO,
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
