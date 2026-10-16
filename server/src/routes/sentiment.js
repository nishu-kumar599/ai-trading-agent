const express = require('express');
const {
  getMarketSentiment,
  getNewsFeed,
  analyzeNewsText,
  addNewsAndAnalyze,
  executeNewsTrade
} = require('../services/sentimentEngine');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();


// GET /api/sentiment/market
router.get('/market', async (req, res) => {
  try {
    const data = await getMarketSentiment();
    res.json({
      success: true,
      data
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch market sentiment: ' + err.message });
  }
});

// GET /api/sentiment/news
router.get('/news', async (req, res) => {
  try {
    const news = await getNewsFeed();
    res.json({
      success: true,
      count: news.length,
      news
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch news feed: ' + err.message });
  }
});

// POST /api/sentiment/analyze
router.post('/analyze', (req, res) => {
  const { text, symbol } = req.body;
  if (!text) {
    return res.status(400).json({ success: false, message: 'News text is required.' });
  }

  const analysis = analyzeNewsText(text, symbol);
  res.json({
    success: true,
    analysis
  });
});

// POST /api/sentiment/publish-news
router.post('/publish-news', authenticateToken, (req, res) => {
  const { headline, source, symbol } = req.body;
  if (!headline) {
    return res.status(400).json({ success: false, message: 'Headline is required.' });
  }

  const newItem = addNewsAndAnalyze(headline, source || 'Live User Feed', symbol || 'RELIANCE.NS');
  res.json({
    success: true,
    newsItem: newItem
  });
});

// POST /api/sentiment/trade
router.post('/trade', authenticateToken, async (req, res) => {
  try {
    const { newsId, horizon, quantity } = req.body;
    const userId = req.user.id;

    if (!newsId) {
      return res.status(400).json({ success: false, message: 'newsId is required.' });
    }

    const parsedQty = parseInt(quantity, 10);
    if (quantity && (!Number.isInteger(parsedQty) || parsedQty <= 0)) {
      return res.status(400).json({ success: false, message: 'Quantity must be a positive integer.' });
    }

    const result = await executeNewsTrade(newsId, horizon || 'INTRADAY', parsedQty || 50, userId);
    if (!result) {
      return res.status(404).json({ success: false, message: 'News item not found.' });
    }

    const message = result.trade.isAMO
      ? `After-Market Order (AMO) placed on ${result.trade.symbol} (${result.trade.direction}) at official closing settlement (₹${result.trade.entryPrice}). Live order tracking activates at 09:15 AM IST.`
      : `News-driven trade executed successfully! ${result.trade.symbol} (${result.trade.direction}) with Breakeven Risk Guard.`;

    res.json({
      success: true,
      message,
      isAMO: result.trade.isAMO,
      result
    });
  } catch (err) {
    console.error('News trade error:', err);
    res.status(400).json({
      success: false,
      message: err.message || 'Failed to execute news-driven trade.'
    });
  }
});


module.exports = router;
