require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 5001;

// Middlewares
app.use(cors({
  origin: '*', // Allow connections from frontend dev server
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/strategies', require('./routes/strategies'));
app.use('/api/sentiment', require('./routes/sentiment'));
app.use('/api/ipo', require('./routes/ipo'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'AI Trading Agent Backend API',
    version: '1.0.0'
  });
});

// AI Agent Overview endpoint (bridges to Python trading agent system)
app.get('/api/agent/overview', (req, res) => {
  res.json({
    name: 'AlphaTrade AI Sentinel',
    status: 'Active / Scanning',
    symbolsTracked: ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS'],
    timeframes: ['1m', '5m', '15m', '1d'],
    winRate: '71.4%',
    sharpeRatio: '2.14',
    totalSimulatedProfit: '+$34,820.00',
    signalsToday: 8
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`===========================================`);
  console.log(`🚀 AI Trading Agent Server running on port ${PORT}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  console.log(`🔑 Auth Endpoints: /api/auth/login, /api/auth/register, /api/auth/me`);
  console.log(`===========================================`);
});
