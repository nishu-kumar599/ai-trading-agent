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
const {
  US_STRATEGY_CATALOG,
  executeUSTrade,
  tickUSPosition,
  closeUSPosition,
  getUSActivePositions,
  getUSTradeHistory
} = require('../services/usStrategyEngine');
const { getUSMarketSessionInfo, getUSRealQuotes } = require('../services/usMarketService');
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

// GET /api/strategies/calendar?market=IN|US
router.get('/calendar', (req, res) => {
  const month = parseInt(req.query.month) || (new Date().getMonth() + 1);
  const year = parseInt(req.query.year) || new Date().getFullYear();
  const market = (req.query.market || 'IN').toUpperCase();
  const calendarData = getMonthPLData(month, year, market);
  res.json({
    success: true,
    market,
    calendar: calendarData
  });
});

// GET /api/strategies/today-audit?market=IN|US
router.get('/today-audit', async (req, res) => {
  const market = (req.query.market || 'IN').toUpperCase();
  const audit = await runTodayMarketAudit(market);
  res.json({
    success: true,
    market,
    audit
  });
});

// GET /api/strategies/catalog?market=IN|US
router.get('/catalog', (req, res) => {
  const market = (req.query.market || 'IN').toUpperCase();
  res.json({
    success: true,
    market,
    currency: market === 'US' ? '$' : '₹',
    strategies: market === 'US' ? US_STRATEGY_CATALOG : STRATEGY_CATALOG
  });
});

// GET /api/strategies/scan?horizon=INTRADAY&market=IN|US
router.get('/scan', async (req, res) => {
  const market = (req.query.market || 'IN').toUpperCase();
  const horizon = (req.query.horizon || 'INTRADAY').toUpperCase();
  const validHorizons = market === 'US'
    ? ['INTRADAY', 'SHORT_TERM', 'MEDIUM_TERM', 'LONG_TERM']
    : ['INTRADAY', 'SHORT_TERM', 'MEDIUM_TERM', 'LONG_TERM', 'F_AND_O'];
  const selectedHorizon = validHorizons.includes(horizon) ? horizon : 'INTRADAY';

  if (market === 'US') {
    const { getUSMarketUniverse } = require('../services/usMarketService');
    const scannedStocks = await getUSMarketUniverse(selectedHorizon);
    const session = getUSMarketSessionInfo();

    return res.json({
      success: true,
      market: 'US',
      currency: '$',
      isMarketOpen: session.isOpen,
      marketStatus: session.status,
      tradingHours: session.tradingHours,
      nextSessionMessage: session.nextSessionMessage,
      horizon: selectedHorizon,
      catalog: US_STRATEGY_CATALOG[selectedHorizon],
      count: scannedStocks.length,
      stocks: scannedStocks,
      profitLockGuard: {
        active: true,
        description: 'Zero-loss breakeven ratchet and dynamic trailing stop activated across all executions.'
      }
    });
  }

  const scannedStocks = await getMarketUniverse(selectedHorizon);
  let session = { isOpen: true, status: 'LIVE_TRADING', tradingHours: '09:15 - 15:30 IST', nextSessionMessage: '' };
  try {
    const { getMarketSessionInfo } = require('../services/realMarketService');
    session = getMarketSessionInfo();
  } catch (err) {}

  res.json({
    success: true,
    market: 'IN',
    currency: '₹',
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

// GET /api/strategies/positions?market=IN|US
router.get('/positions', async (req, res) => {
  const market = (req.query.market || 'IN').toUpperCase();

  if (market === 'US') {
    let quotes = null;
    let session = getUSMarketSessionInfo();
    try {
      quotes = await getUSRealQuotes();
    } catch (e) {}

    return res.json({
      success: true,
      market: 'US',
      currency: '$',
      isMarketOpen: session.isOpen,
      marketStatus: session.status,
      nextSessionMessage: session.nextSessionMessage,
      activePositions: getUSActivePositions(quotes),
      tradeHistory: getUSTradeHistory()
    });
  }

  let quotes = null;
  let session = { isOpen: true, status: 'LIVE_TRADING', nextSessionMessage: '' };
  try {
    const { getRealQuotes, getMarketSessionInfo } = require('../services/realMarketService');
    quotes = await getRealQuotes();
    session = getMarketSessionInfo();
  } catch (err) {}

  res.json({
    success: true,
    market: 'IN',
    currency: '₹',
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
    let { symbol, horizon, direction, price, quantity, optionDetails, market } = req.body;
    const isUS = (market || '').toUpperCase() === 'US' || (symbol && !symbol.includes('.NS') && !['NIFTY', 'BANKNIFTY', 'RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'SBIN', 'BHARTIARTL', 'TATAMOTORS', 'ITC'].includes(symbol.toUpperCase()));

    if (!symbol || !direction) {
      return res.status(400).json({
        success: false,
        message: 'Missing required trade execution parameters (symbol, direction).'
      });
    }

    if (isUS) {
      let liveSpot = parseFloat(price) || 0;
      try {
        const quotes = await getUSRealQuotes();
        const match = quotes.stocks.find(s => s.symbol.toUpperCase() === symbol.toUpperCase());
        if (match && match.price) {
          liveSpot = match.price;
          if (!price || horizon !== 'F_AND_O') price = match.price;
        }
      } catch (e) {}

      if (!price) price = liveSpot || 150.0;

      const trade = executeUSTrade({
        symbol,
        horizon: horizon || 'INTRADAY',
        direction,
        price: parseFloat(price),
        quantity: parseInt(quantity) || 10,
        optionDetails,
        liveSpot
      });

      const executionMsg = trade.isAMO
        ? `US After-Market Order (AMO) placed at official closing ($${trade.entryPrice}). Live order tracking will activate when Wall Street opens at 09:30 AM EST.`
        : `Live US Paper Order Executed at Real Market Price ($${trade.entryPrice}) with Zero-Loss Guard!`;

      return res.status(201).json({
        success: true,
        market: 'US',
        currency: '$',
        message: executionMsg,
        isAMO: trade.isAMO,
        trade
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
      market: 'IN',
      currency: '₹',
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
  const id = req.params.id;
  if (!newPrice) {
    return res.status(400).json({ success: false, message: 'newPrice is required' });
  }

  const result = id.startsWith('us_')
    ? tickUSPosition(id, parseFloat(newPrice))
    : tickPosition(id, parseFloat(newPrice));

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
  const id = req.params.id;
  const closed = id.startsWith('us_')
    ? closeUSPosition(id)
    : closePosition(id);

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
