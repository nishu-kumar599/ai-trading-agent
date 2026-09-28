const express = require('express');
const {
  getIPOList,
  getIPODetails,
  submitPaperBid,
  getUserBids,
  simulateListingDay
} = require('../services/ipoEngine');

const router = express.Router();

// GET /api/ipo/list?status=ALL&category=ALL&search=
router.get('/list', async (req, res) => {
  try {
    const { status, category, search } = req.query;
    const data = await getIPOList({ status, category, search });
    res.json({
      success: true,
      ...data
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/ipo/:id/details
router.get('/:id/details', async (req, res) => {
  try {
    const ipo = await getIPODetails(req.params.id);
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
    const { ipoId, lots, category, upiId } = req.body;
    if (!ipoId) {
      return res.status(400).json({ success: false, error: 'ipoId is required' });
    }
    const result = await submitPaperBid({ ipoId, lots, category, upiId });
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/ipo/my-bids
router.get('/my-bids', (req, res) => {
  try {
    const bids = getUserBids();
    res.json({
      success: true,
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
