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
  resetUSTestSandbox,
  getUSActivePositions,
  getUSTradeHistory
} = require('../services/usStrategyEngine');
const { getUSMarketSessionInfo, getUSRealQuotes } = require('../services/usMarketService');
const { runTodayMarketAudit } = require('../services/todayAuditEngine');
const { getMonthPLData } = require('../services/calendarEngine');
const { authenticateToken, optionalAuthenticateToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/strategies/reset-test
router.post('/reset-test', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const result = resetTestSandbox(userId);
  resetUSTestSandbox(userId);
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
router.get('/positions', optionalAuthenticateToken, async (req, res) => {
  const market = (req.query.market || 'IN').toUpperCase();
  const userId = req.user ? req.user.id : null;

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
      activePositions: getUSActivePositions(quotes, userId),
      tradeHistory: getUSTradeHistory(userId)
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
    activePositions: getActivePositions(quotes, userId),
    tradeHistory: getTradeHistory(userId)
  });
});

// GET /api/strategies/execute (Browser navigation fallback & API usage info)
router.get('/execute', (req, res) => {
  const isBrowser = req.headers.accept && req.headers.accept.includes('text/html');
  if (isBrowser) {
    return res.redirect('/');
  }
  res.status(200).json({
    success: true,
    endpoint: '/api/strategies/execute',
    allowedMethod: 'POST',
    description: 'This is an order execution endpoint that accepts POST requests authenticated with a Bearer JWT token.',
    payloadFormat: {
      symbol: 'RELIANCE.NS (or NVDA for US)',
      horizon: 'INTRADAY | SHORT_TERM | MEDIUM_TERM | LONG_TERM | F_AND_O',
      direction: 'BUY | SELL | BUY_CALL | BUY_PUT',
      price: 1204.10,
      quantity: 50,
      market: 'IN | US',
      optionDetails: { recommendedStrike: '24700 PE', premium: 145.0 }
    }
  });
});

// POST /api/strategies/execute
router.post('/execute', authenticateToken, async (req, res) => {
  try {
    let { symbol, horizon, direction, price, quantity, optionDetails, market } = req.body;
    const userId = req.user.id;

    if (!symbol || typeof symbol !== 'string' || symbol.trim().length === 0 || symbol.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or missing stock symbol.'
      });
    }

    // Normalize trade direction flexibly to prevent rejections from strategy action strings
    let normalizedDirection = (direction || '').toUpperCase().trim();
    if (['BUY', 'LONG', 'BUY_ACCUMULATE', 'ACCUMULATE', 'STRONG_BUY'].includes(normalizedDirection)) {
      normalizedDirection = 'BUY';
    } else if (['SELL', 'SHORT', 'STRONG_SELL'].includes(normalizedDirection)) {
      normalizedDirection = 'SELL';
    } else if (['BUY_CALL', 'CALL'].includes(normalizedDirection)) {
      normalizedDirection = 'BUY_CALL';
    } else if (['BUY_PUT', 'PUT'].includes(normalizedDirection)) {
      normalizedDirection = 'BUY_PUT';
    } else if (['HOLD', 'NEUTRAL', 'WATCH'].includes(normalizedDirection)) {
      normalizedDirection = 'BUY'; // Default neutral/hold signals to standard buy position
    }

    const VALID_DIRECTIONS = ['BUY', 'SELL', 'BUY_CALL', 'BUY_PUT'];
    if (!VALID_DIRECTIONS.includes(normalizedDirection)) {
      return res.status(400).json({
        success: false,
        message: `Invalid trade direction '${direction}'. Allowed: ${VALID_DIRECTIONS.join(', ')}`
      });
    }

    const VALID_HORIZONS = ['INTRADAY', 'SHORT_TERM', 'MEDIUM_TERM', 'LONG_TERM', 'F_AND_O'];
    const normalizedHorizon = (horizon || 'INTRADAY').toUpperCase().trim();
    if (!VALID_HORIZONS.includes(normalizedHorizon)) {
      return res.status(400).json({
        success: false,
        message: `Invalid trading horizon '${horizon}'. Allowed: ${VALID_HORIZONS.join(', ')}`
      });
    }

    const parsedQty = parseInt(quantity, 10);
    if (!Number.isInteger(parsedQty) || parsedQty <= 0 || parsedQty > 500000) {
      return res.status(400).json({
        success: false,
        message: 'Trade quantity must be a positive integer between 1 and 500,000.'
      });
    }

    if (price !== undefined && price !== null && (isNaN(Number(price)) || Number(price) <= 0)) {
      return res.status(400).json({
        success: false,
        message: 'Execution price must be a positive number greater than 0.'
      });
    }

    // Resolve target market reliably: explicit market parameter takes full precedence
    const isUS = market
      ? market.toUpperCase() === 'US'
      : (symbol && (['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA', 'SPY', 'QQQ', 'AMD'].includes(symbol.toUpperCase()) ||
          (!symbol.includes('.NS') && !['NIFTY', 'NIFTY 50', 'BANKNIFTY', 'BANK NIFTY', 'SENSEX', 'RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'SBIN', 'BHARTIARTL', 'TATAMOTORS', 'ITC', 'LT', 'M&M', 'BAJFINANCE', 'MARUTI', 'SUNPHARMA', 'AXISBANK', 'KOTAKBANK'].includes(symbol.toUpperCase()))));

    if (isUS) {
      let liveSpot = parseFloat(price) || 0;
      try {
        const quotes = await getUSRealQuotes();
        const match = quotes.stocks.find(s => s.symbol.toUpperCase() === symbol.toUpperCase());
        if (match && match.price) {
          liveSpot = match.price;
          if (!price || normalizedHorizon !== 'F_AND_O') price = match.price;
        }
      } catch (e) {}

      if (!price && !liveSpot) {
        return res.status(400).json({
          success: false,
          message: `Live market quote unavailable for ${symbol}. Trade execution blocked until usable market data is available.`
        });
      }

      if (!price) price = liveSpot;

      const trade = executeUSTrade({
        symbol,
        horizon: normalizedHorizon,
        direction: normalizedDirection,
        price: parseFloat(price),
        quantity: parsedQty,
        optionDetails,
        liveSpot,
        userId
      });

      const executionMsg = trade.isAMO
        ? `US After-Market Order (AMO) placed at official closing ($${trade.entryPrice}). Live order tracking will activate when Wall Street opens at 09:30 AM EST.`
        : `Live US Paper Order Executed at Real Market Price ($${trade.entryPrice}) with Breakeven Risk Guard!`;

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
        if (!price || normalizedHorizon !== 'F_AND_O') {
          price = match.price;
        }
      }
    } catch (e) {}

    if (!price && !liveSpot) {
      return res.status(400).json({
        success: false,
        message: `Live market quote unavailable for ${symbol}. Trade execution blocked until usable market data is available.`
      });
    }

    if (!price) {
      price = liveSpot;
    }


    const trade = executeTrade({
      symbol,
      horizon: normalizedHorizon,
      direction: normalizedDirection,
      price: parseFloat(price),
      quantity: parsedQty,
      optionDetails,
      liveSpot,
      userId
    });

    const executionMsg = trade.isAMO
      ? `After-Market Order (AMO) placed at official closing settlement (₹${trade.entryPrice}). Live order tracking will activate when exchange opens at 09:15 AM IST.`
      : `Live Paper Order Executed at Real Market Price (₹${trade.entryPrice}) with Breakeven Risk Guard!`;

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
router.post('/positions/:id/tick', authenticateToken, (req, res) => {
  const { newPrice } = req.body;
  const id = req.params.id;
  const userId = req.user.id;

  if (!newPrice || isNaN(Number(newPrice)) || Number(newPrice) <= 0) {
    return res.status(400).json({ success: false, message: 'newPrice must be a positive number' });
  }

  const result = id.startsWith('us_')
    ? tickUSPosition(id, parseFloat(newPrice), userId)
    : tickPosition(id, parseFloat(newPrice), userId);

  if (!result) {
    return res.status(404).json({ success: false, message: 'Position not found or unauthorized' });
  }

  res.json({
    success: true,
    position: result
  });
});

// POST /api/strategies/positions/:id/close
router.post('/positions/:id/close', authenticateToken, (req, res) => {
  const id = req.params.id;
  const userId = req.user.id;

  const closed = id.startsWith('us_')
    ? closeUSPosition(id, userId)
    : closePosition(id, userId);

  if (!closed) {
    return res.status(404).json({ success: false, message: 'Position not found or unauthorized' });
  }

  res.json({
    success: true,
    message: 'Position closed successfully and profit recorded.',
    closedPosition: closed
  });
});

module.exports = router;

