const express = require('express');
const {
  getMarketSentiment,
  getNewsFeed,
  analyzeNewsText,
  addNewsAndAnalyze,
  executeNewsTrade
} = require('../services/sentimentEngine');

const router = express.Router();

// GET /api/sentiment/market
router.get('/market', (req, res) => {
  res.json({
    success: true,
    data: getMarketSentiment()
  });
});

// GET /api/sentiment/news
router.get('/news', (req, res) => {
  res.json({
    success: true,
    news: getNewsFeed()
  });
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
router.post('/publish-news', (req, res) => {
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
router.post('/trade', (req, res) => {
  try {
    const { newsId, horizon, quantity } = req.body;
    if (!newsId) {
      return res.status(400).json({ success: false, message: 'newsId is required.' });
    }

    const result = executeNewsTrade(newsId, horizon || 'INTRADAY', parseInt(quantity) || 50);
    if (!result) {
      return res.status(404).json({ success: false, message: 'News item not found.' });
    }

    res.json({
      success: true,
      message: `News-driven trade executed successfully! ${result.trade.symbol} (${result.trade.direction}) with Profit-Lock Guard.`,
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
