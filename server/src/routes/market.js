const express = require('express');
const {
  syncRealMarketData,
  getRealQuotes,
  getRealMarketDetection,
  getRealMarketUniverse
} = require('../services/realMarketService');
const {
  getUSMarketSessionInfo,
  getUSRealQuotes,
  getUSMarketUniverse
} = require('../services/usMarketService');

const router = express.Router();

// GET /api/market/real-quotes?market=IN|US
// Fast endpoint for top ticker tape and global index ticker bar
router.get('/real-quotes', async (req, res) => {
  try {
    const market = (req.query.market || 'IN').toUpperCase();
    if (market === 'US') {
      const quotes = await getUSRealQuotes();
      return res.json({
        success: true,
        market: 'US',
        ...quotes
      });
    }

    const quotes = await getRealQuotes();
    res.json({
      success: true,
      market: 'IN',
      ...quotes
    });
  } catch (err) {
    console.error('Failed to get real quotes:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve real market quotes: ' + err.message
    });
  }
});

// GET /api/market/real-detection?market=IN|US
// Full market overview including indices, stocks, breadth, technicals, and multi-segment signals
router.get('/real-detection', async (req, res) => {
  try {
    const market = (req.query.market || 'IN').toUpperCase();
    if (market === 'US') {
      const quotes = await getUSRealQuotes();
      const session = getUSMarketSessionInfo();
      const stocks = await getUSMarketUniverse('INTRADAY');

      const positiveCount = quotes.stocks.filter(s => s.isPositive).length;
      const negativeCount = quotes.stocks.filter(s => !s.isPositive).length;

      return res.json({
        success: true,
        market: 'US',
        currency: '$',
        isMarketOpen: session.isOpen,
        marketStatus: session.status,
        tradingHours: session.tradingHours,
        nextSessionMessage: session.nextSessionMessage,
        indices: quotes.indices,
        stocks,
        breadth: {
          advances: positiveCount,
          declines: negativeCount,
          ratio: +(positiveCount / Math.max(1, negativeCount)).toFixed(2)
        }
      });
    }

    const detection = await getRealMarketDetection();
    res.json({
      success: true,
      market: 'IN',
      ...detection
    });
  } catch (err) {
    console.error('Failed to get real market detection:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve real market detection: ' + err.message
    });
  }
});

// GET /api/market/universe?horizon=INTRADAY&market=IN|US
router.get('/universe', async (req, res) => {
  try {
    const market = (req.query.market || 'IN').toUpperCase();
    const horizon = (req.query.horizon || 'INTRADAY').toUpperCase();

    if (market === 'US') {
      const stocks = await getUSMarketUniverse(horizon);
      return res.json({
        success: true,
        market: 'US',
        currency: '$',
        horizon,
        count: stocks.length,
        stocks,
        isRealMarket: true
      });
    }

    const stocks = await getRealMarketUniverse(horizon);
    res.json({
      success: true,
      market: 'IN',
      currency: '₹',
      horizon,
      count: stocks.length,
      stocks,
      isRealMarket: true
    });
  } catch (err) {
    console.error('Failed to get real market universe:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve market universe: ' + err.message
    });
  }
});

// POST /api/market/sync
router.post('/sync', async (req, res) => {
  try {
    const data = await syncRealMarketData(true);
    res.json({
      success: true,
      message: 'Live market feeds synchronized successfully with NSE/BSE exchange.',
      indicesCount: data.indices.length,
      stocksCount: data.stocks.length,
      lastUpdated: new Date(data.lastUpdated).toLocaleTimeString('en-IN')
    });
  } catch (err) {
    console.error('Failed to force sync real market data:', err);
    res.status(500).json({
      success: false,
      message: 'Real market synchronization failed: ' + err.message
    });
  }
});

module.exports = router;
