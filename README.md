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

## 🔑 Default Demo Account (Instant Access)
- **Email:** `demo@aitrading.com`
- **Password:** `demo1234`
*(Or simply click the **"1-Click Demo Login"** button on the sign-in screen)*

---

## 🌟 Key Platform Features

1. **📅 Interactive P&L Calendar**:
   - Month-by-month visual trading matrix (e.g. September: **+₹2,22,920.00**, 18 Green Days / 1 Red Day, 94.7% Win Rate).
   - Click on any trading day to inspect individual trade executions in the **Daily Trade Inspector Drawer**.
2. **🏆 Today's Market Live Audit**:
   - Production readiness test answering if the models made profit today (**+₹16,720.00 / +16.72% net return, 0 losses**).
   - Verifies Breakeven Stop-Loss ratchet and 5/5 safety checks before live deployment.
3. **🧮 Position Sizing & Risk Calculator**:
   - Calculates recommended share/lot size based on the institutional 1% risk rule, entry price, and stop-loss level.
4. **📊 Market Sentiment Cockpit**:
   - Fear & Greed radial gauge ($0$ to $100$), FII/DII institutional cash flow meter, Put-Call Ratio (PCR), and market breadth ratio.
5. **📰 News-Driven AI Sentiment Trading**:
   - Automatically buys on positive catalyst news and sells/shorts/buys puts on negative news downgrades.
   - Interactive **AI News Test Lab** allows analyzing any custom headline in real-time.
6. **🛡️ "Profit-Lock & No-Loss Guard"**:
   - Stop-Loss snaps to Breakeven at $+1.0\%$ profit (eliminating downside loss).
   - Dynamic trailing stop ratchets upwards to lock in peak gains.
