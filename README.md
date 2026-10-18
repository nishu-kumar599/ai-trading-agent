# 🚀 AlphaTrade AI — Full-Stack Institutional AI Trading Agent Web Application

An institutional-grade AI Trading Agent platform featuring a **React.js** web application, **Node.js Express** backend API with JWT authentication, and an integrated **Python** quantitative algorithmic trading engine.

---

## 🏗️ Architecture

```
ai-trading-agent/
├── client/                     # React Frontend (Vite + Modern Fintech Dark Theme)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx             # Left sidebar navigation with grouped hubs
│   │   │   ├── PLCalendar.jsx          # Interactive monthly P&L calendar & daily inspector
│   │   │   ├── RiskCalculatorModal.jsx # Position sizing & 1% institutional risk calculator
│   │   │   ├── TodayMarketAudit.jsx    # Live market audit & production readiness verifier
│   │   │   ├── MarketSentimentView.jsx # Fear & Greed gauge, FII/DII flow, PCR skew
│   │   │   ├── NewsSentimentTrader.jsx # NLP news sentiment trading & test lab
│   │   │   ├── SegmentExplainer.jsx    # Segment guides, holding periods & zero-loss rules
│   │   │   ├── StrategyCenter.jsx      # Multi-horizon scanner & order execution engine
│   │   │   ├── Login.jsx               # Sign in terminal with 1-click Demo account
│   │   │   ├── Signup.jsx              # Registration with live password strength meter
│   │   │   └── Dashboard.jsx           # Main trading cockpit
│   │   ├── context/AuthContext.jsx     # JWT authentication & session state
│   │   └── index.css                   # Custom fintech palette & animations
│   └── vite.config.js                  # Port 3000 with /api reverse proxy
│
├── server/                     # Node.js Express Backend
│   ├── src/
│   │   ├── db.js                       # User storage & local persistence
│   │   ├── middleware/auth.js          # JWT Bearer token authentication
│   │   ├── services/
│   │   │   ├── strategyEngine.js       # Strategy indicators & Profit-Lock simulator
│   │   │   ├── sentimentEngine.js      # NLP news sentiment & market breadth
│   │   │   ├── calendarEngine.js       # Daily P&L calendar matrix & monthly stats
│   │   │   └── todayAuditEngine.js     # Live today performance audit
│   │   ├── routes/
│   │   │   ├── auth.js                 # Authentication endpoints
│   │   │   ├── strategies.js           # Multi-horizon & calendar endpoints
│   │   │   └── sentiment.js            # Sentiment & news trading endpoints
│   │   └── index.js                    # Express server (Port 5001)
│   └── data/users.json                 # User accounts database
│
└── *.py                                # Python Quantitative Core
    ├── multi_horizon_strategies.py     # All 5 horizon algorithms & Profit-Lock Guard
    ├── intraday_strategy.py            # VWAP & EMA 9/21 momentum strategy
    ├── intraday_trader.py              # Intraday risk control & paper execution
    └── portfolio_trader.py             # Multi-stock quantitative scanner
```

---

## ⚡ Quick Start

### 1. Start the Backend API (Node.js)
```bash
cd server
npm install
npm run dev
```
*Server runs at:* `http://localhost:5001`

### 2. Start the Frontend (React.js)
In a new terminal:
```bash
cd client
npm install
npm run dev
```
*Web App opens at:* `http://localhost:3000`

---

## 🔑 Development Demo Account (Local Sandbox Only)
- **Email:** `demo@aitrading.com`
- **Password:** `demo1234`
*(Available in local development mode only; disabled in production environments)*

---

## 🌟 Key Platform Features

1. **📅 Interactive P&L Calendar**:
   - Month-by-month visual trading matrix dynamically computed from actual executed paper trades.
   - Click on any trading day to inspect individual trade executions in the **Daily Trade Inspector Drawer**.
2. **🏆 Today's Market Live Audit**:
   - Production readiness test evaluating real-time model execution against live exchange quotes.
   - Verifies Breakeven Stop-Loss ratchet and 5/5 safety checks before live deployment.
3. **🧮 Position Sizing & Risk Calculator**:
   - Calculates recommended share/lot size based on the institutional 1% risk rule, entry price, and actual stop-loss distance.
4. **📊 Market Sentiment Cockpit**:
   - Fear & Greed radial gauge ($0$ to $100$), FII/DII institutional cash flow meter, Put-Call Ratio (PCR), and market breadth ratio.
5. **📰 News-Driven AI Sentiment Trading**:
   - Automatically evaluates positive catalyst news and negative news downgrades with NLP sentiment scoring.
   - Interactive **AI News Test Lab** allows analyzing any custom headline in real-time.
6. **🛡️ "Profit-Lock & Breakeven Protection Guard"**:
   - Stop-Loss moves to Breakeven (+0.1% covering statutory costs) once Target 1 is attained.
   - Dynamic trailing stop ratchets upwards after breakeven is reached to lock in peak unrealized gains.
   - Two-stage profit booking: automatically scales out 50% at Target 1.

---

## ⚠️ Risk & Disclaimers

> **IMPORTANT**: Financial trading in equities, derivatives, and currencies involves substantial risk of loss. Algorithmic protection mechanisms such as breakeven stop-losses and trailing exits mitigate downside exposure but cannot eliminate risk entirely due to potential market gaps, execution slippage, illiquid order books, and transaction fees. All trading capabilities within this application are provided in paper-trading sandbox mode for research and educational purposes.
