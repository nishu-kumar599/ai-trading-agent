import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Compass, 
  ShieldCheck, 
  Lock, 
  ArrowUpRight, 
  ArrowDownRight, 
  CheckCircle2, 
  AlertTriangle, 
  Play, 
  RefreshCw, 
  Check, 
  Layers,
  ChevronRight,
  Sliders,
  DollarSign,
  Sparkles
} from 'lucide-react';

export const StrategyCenter = ({ initialHorizon = 'INTRADAY', hideInternalTabs = false }) => {
  const [selectedHorizon, setSelectedHorizon] = useState(initialHorizon);

  useEffect(() => {
    if (initialHorizon) {
      setSelectedHorizon(initialHorizon);
    }
  }, [initialHorizon]);
  const [scanData, setScanData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activePositions, setActivePositions] = useState([]);
  const [tradeHistory, setTradeHistory] = useState([]);
  const [selectedStockToTrade, setSelectedStockToTrade] = useState(null);
  const [orderQuantity, setOrderQuantity] = useState(50);
  const [executingOrder, setExecutingOrder] = useState(false);
  const [executionNotice, setExecutionNotice] = useState('');

  // Profit-Lock interactive controls
  const [autoBreakeven, setAutoBreakeven] = useState(true);
  const [trailingStopPct, setTrailingStopPct] = useState(1.0);

  const horizons = [
    { id: 'INTRADAY', label: 'Intraday (1m-15m)', icon: Zap, badge: 'Scalp & Momentum' },
    { id: 'SHORT_TERM', label: 'Short-Term (1-5d)', icon: TrendingUp, badge: 'Swing Breakout' },
    { id: 'MEDIUM_TERM', label: 'Medium-Term (2-12w)', icon: Compass, badge: 'Positional Trend' },
    { id: 'LONG_TERM', label: 'Long-Term (Months+)', icon: Calendar, badge: 'Value & DCA' },
    { id: 'F_AND_O', label: 'Futures & Options', icon: Layers, badge: 'Calls, Puts & Spreads' }
  ];

  // Fetch scan data for chosen horizon
  const fetchScan = async (horizon) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/strategies/scan?horizon=${horizon}`);
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (data && data.success) {
        setScanData(data);
      }
    } catch (err) {
      console.error('Failed to load strategy scan:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch positions & history
  const fetchPositions = async () => {
    try {
      const res = await fetch('/api/strategies/positions');
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (data && data.success) {
        setActivePositions(data.activePositions || []);
        setTradeHistory(data.tradeHistory || []);
      }
    } catch (err) {
      console.error('Failed to fetch positions:', err);
    }
  };

  useEffect(() => {
    fetchScan(selectedHorizon);
    fetchPositions();
  }, [selectedHorizon]);

  // Execute trade
  const handleExecuteTrade = async (stock) => {
    setExecutingOrder(true);
    setExecutionNotice('');
    try {
      const isFO = selectedHorizon === 'F_AND_O';
      const payload = {
        symbol: stock.symbol,
        horizon: selectedHorizon,
        direction: stock.action,
        price: isFO ? stock.optPremium : stock.price,
        quantity: isFO ? stock.lotSize : orderQuantity,
        optionDetails: isFO ? { recommendedStrike: stock.recommendedStrike, premium: stock.optPremium } : null
      };

      const res = await fetch('/api/strategies/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (data && data.success) {
        setExecutionNotice(`Order Executed: ${data.trade.symbol} (${data.trade.direction}) @ ₹${data.trade.entryPrice} with Profit-Lock Guard!`);
        fetchPositions();
        setSelectedStockToTrade(null);
        setTimeout(() => setExecutionNotice(''), 6000);
      }
    } catch (err) {
      console.error('Trade execution failed:', err);
    } finally {
      setExecutingOrder(false);
    }
  };

  // Simulate price tick (demonstrates profit-lock moving stop loss to breakeven)
  const handleSimulateTick = async (positionId, changePct) => {
    const pos = activePositions.find(p => p.id === positionId);
    if (!pos) return;

    const simulatedPrice = +(pos.currentPrice * (1 + changePct / 100)).toFixed(2);
    try {
      const res = await fetch(`/api/strategies/positions/${positionId}/tick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPrice: simulatedPrice })
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (data && data.success) {
        fetchPositions();
      }
    } catch (err) {
      console.error('Tick simulation error:', err);
    }
  };

  // Close position
  const handleClosePosition = async (positionId) => {
    try {
      const res = await fetch(`/api/strategies/positions/${positionId}/close`, {
        method: 'POST'
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (data && data.success) {
        fetchPositions();
      }
    } catch (err) {
      console.error('Close position error:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Execution Notice */}
      {executionNotice && (
        <div className="alert-box alert-success" style={{ marginBottom: 0 }}>
          <Sparkles size={18} style={{ flexShrink: 0 }} />
          <div>{executionNotice}</div>
        </div>
      )}

      {/* 5-Horizon Navigation Tabs (Optional) */}
      {!hideInternalTabs && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          background: 'rgba(15, 23, 42, 0.7)',
          padding: '8px',
          borderRadius: '14px',
          border: '1px solid var(--border-subtle)'
        }}>
          {horizons.map((h) => {
            const Icon = h.icon;
            const isActive = selectedHorizon === h.id;
            return (
              <button
                key={h.id}
                onClick={() => setSelectedHorizon(h.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: isActive ? '1px solid #10b981' : '1px solid transparent',
                  background: isActive ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                  color: isActive ? '#fff' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Icon size={16} color={isActive ? '#10b981' : '#94a3b8'} />
                  <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{h.label}</span>
                </div>
                <span style={{ fontSize: '0.72rem', color: isActive ? '#34d399' : 'var(--text-dim)' }}>
                  {h.badge}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Strategy Specification & Profit-Lock Blueprint */}
      {scanData?.catalog && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(10, 15, 29, 0.95) 100%)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '16px',
          padding: '24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="badge-signal-buy">{scanData.horizon} STRATEGY</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{scanData.catalog.timeframe}</span>
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>
              {scanData.catalog.name}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.5', marginBottom: '14px' }}>
              {scanData.catalog.description}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {scanData.catalog.indicators.map((ind, i) => (
                <span
                  key={i}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    fontSize: '0.75rem',
                    color: '#93c5fd'
                  }}
                >
                  {ind}
                </span>
              ))}
            </div>
          </div>

          {/* Profit-Lock & No Loss Architecture Card */}
          <div style={{
            background: 'rgba(16, 185, 129, 0.04)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontWeight: 700, fontSize: '0.9rem' }}>
                  <ShieldCheck size={18} />
                  Profit-Lock & No-Loss Guard
                </div>
                <span style={{ fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '2px 8px', borderRadius: '4px' }}>
                  ACTIVE
                </span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', color: '#cbd5e1' }}>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                  <Check size={14} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span><strong>Breakeven Ratchet:</strong> Once trade moves +1.0% in profit, Stop-Loss instantly snaps to Entry Price (eliminating loss risk).</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                  <Check size={14} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span><strong>Target 1 Scale-out:</strong> Partial profit booked at Target 1; Stop-Loss trailed into positive territory.</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                  <Check size={14} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span><strong>Bidirectional Profit:</strong> Buys on uptrends (or ATM Calls); Shorts / Buys ATM Puts on downtrends to profit on the way down.</span>
                </li>
              </ul>
            </div>

            <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Dynamic Trailing SL</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#10b981', fontWeight: 600 }}>{trailingStopPct}% Follow Distance</span>
            </div>
          </div>
        </div>
      )}

      {/* Live Market Scanner & Opportunities Table */}
      <div className="signals-table-card">
        <div className="table-header">
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
              {selectedHorizon === 'F_AND_O' ? 'Futures & Options Signal Radar' : `${selectedHorizon} Strategy Scanner`}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '2px' }}>
              Automated buy/sell triggers with built-in breakeven ratchets & target projections
            </p>
          </div>

          <button
            onClick={() => fetchScan(selectedHorizon)}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              color: '#fff',
              padding: '8px 14px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem'
            }}
          >
            <RefreshCw size={14} className={loading ? 'spinner' : ''} />
            Refresh Scan
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="signals-table">
            <thead>
              <tr>
                <th>Symbol / Contract</th>
                <th>Price / Premium</th>
                <th>Action Trigger</th>
                <th>Target 1 (Lock)</th>
                <th>Target 2 (Runner)</th>
                <th>Stop Loss (Protected)</th>
                <th>Confidence</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {scanData?.stocks?.map((stock, idx) => {
                const isCall = stock.action === 'BUY_CALL';
                const isPut = stock.action === 'BUY_PUT';
                const isBuy = stock.action === 'BUY';
                const isSell = stock.action === 'SELL';

                let badgeStyle = 'badge-signal-hold';
                if (isBuy || isCall) badgeStyle = 'badge-signal-buy';
                else if (isSell || isPut) badgeStyle = 'badge-signal-hold'; // amber or red

                return (
                  <tr key={idx}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="symbol-badge">
                          {selectedHorizon === 'F_AND_O' && stock.recommendedStrike
                            ? `${stock.symbol} ${stock.recommendedStrike}`
                            : stock.symbol}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{stock.name}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#fff' }}>
                        ₹{selectedHorizon === 'F_AND_O' ? stock.optPremium : stock.price}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: stock.changePct.startsWith('+') ? '#34d399' : '#f43f5e' }}>
                        {stock.changePct}
                      </div>
                    </td>
                    <td>
                      <span
                        className={badgeStyle}
                        style={{
                          background: isPut ? 'rgba(244, 63, 94, 0.15)' : undefined,
                          color: isPut ? '#fda4af' : undefined,
                          borderColor: isPut ? 'rgba(244, 63, 94, 0.3)' : undefined
                        }}
                      >
                        {stock.action}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: '#34d399', fontWeight: 600 }}>
                      ₹{stock.target1}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: '#6ee7b7' }}>
                      ₹{stock.target2}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: '#f87171' }}>
                      ₹{stock.stopLoss}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '45px', height: '5px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${stock.confidence}%`, height: '100%', background: '#10b981' }}></div>
                        </div>
                        <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>{stock.confidence}%</span>
                      </div>
                    </td>
                    <td>
                      {stock.action !== 'HOLD' ? (
                        <button
                          onClick={() => setSelectedStockToTrade(stock)}
                          style={{
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            border: 'none',
                            color: '#051610',
                            fontWeight: 700,
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Play size={12} fill="#051610" />
                          Trade
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Watching</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trade Execution Modal */}
      {selectedStockToTrade && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          padding: '16px'
        }}>
          <div className="glass-card" style={{ maxWidth: '480px', width: '100%', padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <span className="badge-signal-buy">{selectedHorizon} ORDER</span>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff', marginTop: '4px' }}>
                  Execute {selectedStockToTrade.symbol}
                </h3>
              </div>
              <button
                onClick={() => setSelectedStockToTrade(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: '10px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Action:</span>
                <span style={{ fontWeight: 700, color: '#10b981' }}>{selectedStockToTrade.action}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Entry Price:</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: '#fff' }}>
                  ₹{selectedHorizon === 'F_AND_O' ? selectedStockToTrade.optPremium : selectedStockToTrade.price}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Target 1 (Lock Profit):</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: '#34d399' }}>₹{selectedStockToTrade.target1}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Initial Stop-Loss:</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: '#f87171' }}>₹{selectedStockToTrade.stopLoss}</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Order Quantity ({selectedHorizon === 'F_AND_O' ? `Lots (${selectedStockToTrade.lotSize} shares/lot)` : 'Shares'}):
              </label>
              <input
                type="number"
                className="input-field"
                value={selectedHorizon === 'F_AND_O' ? selectedStockToTrade.lotSize : orderQuantity}
                onChange={(e) => setOrderQuantity(e.target.value)}
                min="1"
              />
            </div>

            {/* Profit-Lock Confirmation Check */}
            <div style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '20px',
              fontSize: '0.8rem',
              color: '#34d399',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <ShieldCheck size={20} style={{ flexShrink: 0 }} />
              <div>
                <strong>Zero-Loss Protection Engaged:</strong> Stop-loss automatically jumps to breakeven once +1% profit is attained.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => handleExecuteTrade(selectedStockToTrade)}
                disabled={executingOrder}
              >
                {executingOrder ? 'Executing...' : 'Confirm & Execute Trade'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedStockToTrade(null)}
                style={{
                  padding: '12px 18px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Positions with Live Profit-Lock & Trailing SL Simulator */}
      <div className="signals-table-card">
        <div className="table-header">
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
              Active Positions & Profit-Lock Monitor
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '2px' }}>
              Real-time monitoring of open trades with automated Breakeven protection & trailing stops
            </p>
          </div>
          <span style={{ fontSize: '0.8rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 10px', borderRadius: '6px' }}>
            {activePositions.length} Open Positions
          </span>
        </div>

        {activePositions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-dim)' }}>
            No open positions. Select a signal above and click "Trade" to deploy a position with Profit-Lock Guard.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="signals-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Horizon</th>
                  <th>Entry Price</th>
                  <th>Live Price</th>
                  <th>Current SL</th>
                  <th>Unrealized P&L</th>
                  <th>Profit-Lock Status</th>
                  <th>Test Market Tick</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {activePositions.map((pos) => {
                  const isProfitable = pos.unrealizedPL >= 0;
                  return (
                    <tr key={pos.id}>
                      <td>
                        <span className="symbol-badge">{pos.symbol}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.75rem', color: '#93c5fd' }}>{pos.horizon}</span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>₹{pos.entryPrice}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fff' }}>₹{pos.currentPrice}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', color: pos.breakevenActivated ? '#34d399' : '#f87171' }}>
                        ₹{pos.stopLoss}
                        {pos.breakevenActivated && (
                          <span style={{ fontSize: '0.68rem', display: 'block', color: '#34d399' }}>
                            (Locked at Breakeven)
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          color: isProfitable ? '#34d399' : '#f43f5e',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {isProfitable ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                          ₹{pos.unrealizedPL} ({pos.unrealizedPLPct > 0 ? `+${pos.unrealizedPLPct}%` : `${pos.unrealizedPLPct}%`})
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            background: pos.breakevenActivated ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                            color: pos.breakevenActivated ? '#34d399' : '#94a3b8',
                            border: `1px solid ${pos.breakevenActivated ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 700
                          }}
                        >
                          {pos.status}
                        </span>
                      </td>
                      <td>
                        {/* Interactive Simulation Buttons to see Profit-Lock in action! */}
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            onClick={() => handleSimulateTick(pos.id, 1.5)}
                            title="Simulate +1.5% Price Rise (Watch SL move to Breakeven!)"
                            style={{
                              padding: '3px 6px',
                              background: 'rgba(16, 185, 129, 0.2)',
                              border: '1px solid rgba(16, 185, 129, 0.4)',
                              color: '#34d399',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.72rem'
                            }}
                          >
                            +1.5% 📈
                          </button>
                          <button
                            onClick={() => handleSimulateTick(pos.id, -1.0)}
                            title="Simulate -1.0% Pullback"
                            style={{
                              padding: '3px 6px',
                              background: 'rgba(244, 63, 94, 0.15)',
                              border: '1px solid rgba(244, 63, 94, 0.3)',
                              color: '#fda4af',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.72rem'
                            }}
                          >
                            -1.0% 📉
                          </button>
                        </div>
                      </td>
                      <td>
                        <button
                          onClick={() => handleClosePosition(pos.id)}
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--border-subtle)',
                            color: '#cbd5e1',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            cursor: 'pointer'
                          }}
                        >
                          Close
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
