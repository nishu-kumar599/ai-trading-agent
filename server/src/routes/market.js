const express = require('express');
const {
  syncRealMarketData,
  getRealQuotes,
  getRealMarketDetection,
  getRealMarketUniverse
} = require('../services/realMarketService');

const router = express.Router();

// GET /api/market/real-quotes
// Fast endpoint for top ticker tape and global index ticker bar
router.get('/real-quotes', async (req, res) => {
  try {
    const quotes = await getRealQuotes();
    res.json({
      success: true,
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

// GET /api/market/real-detection
// Full market overview including indices, stocks, breadth, technicals, and multi-segment signals
router.get('/real-detection', async (req, res) => {
  try {
    const detection = await getRealMarketDetection();
    res.json({
      success: true,
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

// GET /api/market/universe?horizon=INTRADAY
// Stocks filtered and signals evaluated for specific segment (INTRADAY, SHORT_TERM, MEDIUM_TERM, LONG_TERM, F_AND_O)
router.get('/universe', async (req, res) => {
  try {
    const horizon = (req.query.horizon || 'INTRADAY').toUpperCase();
    const stocks = await getRealMarketUniverse(horizon);
    res.json({
      success: true,
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
// Force an on-demand real-time re-sync with exchange data feeds
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
