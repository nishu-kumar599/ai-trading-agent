const express = require('express');
const {
  getIPOList,
  getIPODetails,
  submitPaperBid,
  getUserBids,
  simulateListingDay
} = require('../services/ipoEngine');

const router = express.Router();

// GET /api/ipo/list?status=ALL&category=ALL&search=&market=IN|US
router.get('/list', async (req, res) => {
  try {
    const { status, category, search, market } = req.query;
    const data = await getIPOList({ status, category, search, market: (market || 'IN').toUpperCase() });
    res.json({
      success: true,
      ...data
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/ipo/:id/details?market=IN|US
router.get('/:id/details', async (req, res) => {
  try {
    const ipo = await getIPODetails(req.params.id, req.query.market);
    if (!ipo) {
      return res.status(404).json({ success: false, error: 'IPO not found' });
    }
    res.json({
      success: true,
      ipo
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/ipo/bid
router.post('/bid', async (req, res) => {
  try {
    const { ipoId, lots, category, upiId, market } = req.body;
    if (!ipoId) {
      return res.status(400).json({ success: false, error: 'ipoId is required' });
    }
    const result = await submitPaperBid({ ipoId, lots, category, upiId, market });
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/ipo/my-bids?market=IN|US
router.get('/my-bids', (req, res) => {
  try {
    const bids = getUserBids(req.query.market);
    res.json({
      success: true,
      market: (req.query.market || 'IN').toUpperCase(),
      currency: (req.query.market || 'IN').toUpperCase() === 'US' ? '$' : '₹',
      bids
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/ipo/bid/:bidId/simulate-listing
router.post('/bid/:bidId/simulate-listing', (req, res) => {
  try {
    const result = simulateListingDay(req.params.bidId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
