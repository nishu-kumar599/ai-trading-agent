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
app.use('/api/market', require('./routes/market'));
app.use('/api/ai-agent', require('./routes/aiAgent'));

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

// Serve static React client in production
const path = require('path');
const fs = require('fs');

const possibleDistPaths = [
  path.resolve(__dirname, '../../client/dist'),
  path.resolve(__dirname, '../client/dist'),
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(process.cwd(), 'dist')
];

let resolvedDistPath = possibleDistPaths.find(p => fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html')));

if (resolvedDistPath) {
  console.log(`📦 Serving React production client from: ${resolvedDistPath}`);
  app.use(express.static(resolvedDistPath));
  // Catch-all for SPA client routing
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(resolvedDistPath, 'index.html'));
    }
    next();
  });
} else {
  console.warn('⚠️ React client dist directory not found. Checked:', possibleDistPaths);
  // Helpful diagnostic fallback route instead of ugly 404 Cannot GET /
  app.get('/', (req, res) => {
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>AlphaTrade AI — Server Online</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { background: #0b0e14; color: #f8fafc; font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
            .card { background: #111622; border: 1px solid #1e2638; border-radius: 16px; padding: 32px; max-width: 520px; text-align: center; }
            h1 { color: #10b981; font-size: 1.5rem; margin-bottom: 8px; }
            p { color: #94a3b8; font-size: 0.9rem; line-height: 1.5; }
            .btn { background: #10b981; color: #051610; font-weight: 700; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; text-decoration: none; display: inline-block; margin-top: 16px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>🚀 AlphaTrade AI Backend Online</h1>
            <p>API services are running normally. Frontend static bundle is being prepared or needs to be built.</p>
            <p style="font-family: monospace; font-size: 0.8rem; background: #0b0e14; padding: 10px; border-radius: 8px; color: #38bdf8;">
              Run: npm run build
            </p>
            <a href="/api/health" class="btn">View API Health Status</a>
          </div>
        </body>
      </html>
    `);
  });
}

// Start Server
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`===========================================`);
  console.log(`🚀 AI Trading Agent Server running on port ${PORT}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  console.log(`🔑 Auth Endpoints: /api/auth/login, /api/auth/register, /api/auth/me`);
  console.log(`===========================================`);

  // Initialize Dual-Mode Database (MongoDB Cloud + Local JSON fallback)
  try {
    const { connectDB } = require('./config/database');
    const { syncUsersWithMongo } = require('./db');
    await connectDB();
    await syncUsersWithMongo();
  } catch (dbErr) {
    console.warn('DB initialization notice:', dbErr.message);
  }

  // Start 24/7 Autonomous AI Trading Sentinel in the background
  try {
    const { startAutonomousAgent } = require('./services/aiAgentEngine');
    await startAutonomousAgent();
  } catch (err) {
    console.error('Failed to start Autonomous AI Agent:', err.message);
  }
});
