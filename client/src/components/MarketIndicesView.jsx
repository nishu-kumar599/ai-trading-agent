import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Layers, 
  Zap, 
  ArrowUpRight, 
  ArrowDownRight, 
  CheckCircle2, 
  RefreshCw,
  Sliders,
  Sparkles
} from 'lucide-react';

export const MarketIndicesView = ({ onExecuteQuickTrade }) => {
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [lastRefreshed, setLastRefreshed] = useState(new Date().toLocaleTimeString());

  const indices = [
    {
      name: 'NIFTY 50',
      category: 'BENCHMARK',
      value: 25388.90,
      change: 145.20,
      pct: '+0.58%',
      isUp: true,
      dayLow: 25240.10,
      dayHigh: 25412.50,
      advances: 34,
      declines: 16,
      pcr: 1.18,
      status: 'BULLISH_TREND',
      description: 'National benchmark crossing all-time highs led by IT & private banks.'
    },
    {
      name: 'SENSEX',
      category: 'BENCHMARK',
      value: 82890.94,
      change: 412.30,
      pct: '+0.50%',
      isUp: true,
      dayLow: 82410.00,
      dayHigh: 82950.20,
      advances: 21,
      declines: 9,
      pcr: 1.12,
      status: 'BULLISH_TREND',
      description: 'BSE 30 heavyweights recording sustained institutional accumulation.'
    },
    {
      name: 'BANK NIFTY',
      category: 'SECTORAL',
      value: 52180.40,
      change: 320.15,
      pct: '+0.62%',
      isUp: true,
      dayLow: 51840.00,
      dayHigh: 52290.00,
      advances: 9,
      declines: 3,
      pcr: 1.04,
      status: 'BREAKOUT',
      description: 'Private banking majors HDFC Bank and ICICI Bank holding above VWAP.'
    },
    {
      name: 'INDIA VIX',
      category: 'VOLATILITY',
      value: 12.85,
      change: -0.42,
      pct: '-3.16%',
      isUp: false,
      dayLow: 12.60,
      dayHigh: 13.40,
      status: 'CALM_REGIME',
      description: 'Low implied volatility regime favors directional options buying and swing trading.'
    }
  ];

  const stocksUniverse = [
    {
      symbol: 'RELIANCE.NS',
      name: 'Reliance Industries',
      sector: 'Energy / Conglomerate',
      price: 2984.50,
      change: 42.60,
      pct: '+1.45%',
      isUp: true,
      vwap: 2962.00,
      rsi: 61.4,
      dayLow: 2950.00,
      dayHigh: 2995.00,
      trend: 'BULLISH_MOMENTUM',
      actionSignal: 'BUY'
    },
    {
      symbol: 'HDFCBANK.NS',
      name: 'HDFC Bank Ltd',
      sector: 'Banking & Financials',
      price: 1642.10,
      change: 14.80,
      pct: '+0.91%',
      isUp: true,
      vwap: 1634.00,
      rsi: 58.2,
      dayLow: 1628.00,
      dayHigh: 1648.50,
      trend: 'ACCUMULATION',
      actionSignal: 'BUY'
    },
    {
      symbol: 'TCS.NS',
      name: 'Tata Consultancy Services',
      sector: 'IT & Software',
      price: 4120.10,
      change: 25.40,
      pct: '+0.62%',
      isUp: true,
      vwap: 4108.00,
      rsi: 64.1,
      dayLow: 4095.00,
      dayHigh: 4135.00,
      trend: 'STEADY_TREND',
      actionSignal: 'BUY'
    },
    {
      symbol: 'INFY.NS',
      name: 'Infosys Ltd',
      sector: 'IT & Software',
      price: 1894.20,
      change: 18.50,
      pct: '+0.99%',
      isUp: true,
      vwap: 1880.00,
      rsi: 66.8,
      dayLow: 1872.00,
      dayHigh: 1902.00,
      trend: 'BREAKOUT_RUN',
      actionSignal: 'BUY'
    },
    {
      symbol: 'ICICIBANK.NS',
      name: 'ICICI Bank Ltd',
      sector: 'Banking & Financials',
      price: 1234.80,
      change: 16.30,
      pct: '+1.34%',
      isUp: true,
      vwap: 1222.00,
      rsi: 68.2,
      dayLow: 1218.00,
      dayHigh: 1239.00,
      trend: 'SUPER_TREND',
      actionSignal: 'BUY'
    },
    {
      symbol: 'TATAMOTORS.NS',
      name: 'Tata Motors Ltd',
      sector: 'Automotive & EV',
      price: 985.40,
      change: 12.10,
      pct: '+1.24%',
      isUp: true,
      vwap: 976.00,
      rsi: 62.0,
      dayLow: 971.00,
      dayHigh: 991.00,
      trend: 'BREAKOUT',
      actionSignal: 'BUY'
    },
    {
      symbol: 'SBIN.NS',
      name: 'State Bank of India',
      sector: 'PSU Banking',
      price: 818.25,
      change: 6.80,
      pct: '+0.84%',
      isUp: true,
      vwap: 814.00,
      rsi: 57.5,
      dayLow: 811.50,
      dayHigh: 821.00,
      trend: 'BULLISH',
      actionSignal: 'BUY'
    },
    {
      symbol: 'BHARTIARTL.NS',
      name: 'Bharti Airtel Ltd',
      sector: 'Telecom & 5G',
      price: 1540.00,
      change: 11.20,
      pct: '+0.73%',
      isUp: true,
      vwap: 1532.00,
      rsi: 65.4,
      dayLow: 1528.00,
      dayHigh: 1546.00,
      trend: 'UPTREND',
      actionSignal: 'BUY'
    }
  ];

  const sectorPerformance = [
    { name: 'Nifty IT', pct: '+1.42%', isUp: true },
    { name: 'Nifty Auto', pct: '+1.18%', isUp: true },
    { name: 'Nifty Bank', pct: '+0.62%', isUp: true },
    { name: 'Nifty Energy', pct: '+0.45%', isUp: true },
    { name: 'Nifty Metal', pct: '-0.32%', isUp: false },
    { name: 'Nifty Pharma', pct: '+0.12%', isUp: true }
  ];

  const handleRefresh = () => {
    setLastRefreshed(new Date().toLocaleTimeString());
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & Status Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(17, 22, 34, 0.95) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.25)',
        borderRadius: '16px',
        padding: '22px 26px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{
              background: 'rgba(16, 185, 129, 0.15)',
              color: 'var(--accent-emerald)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              padding: '3px 10px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <BarChart3 size={14} />
              REAL-TIME MARKET FEED
            </span>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              NSE & BSE Index Monitor • Heavyweight Momentum
            </span>
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.4px' }}>
            Live Market Overview & Index Terminal
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginTop: '4px' }}>
            Track live benchmark index movements (NIFTY 50, SENSEX, BANK NIFTY, INDIA VIX) and sector heavyweights with 1-click test trade executions.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            fontSize: '0.78rem',
            color: 'var(--text-dim)',
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '6px 12px',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)'
          }}>
            Updated: <strong style={{ color: '#fff' }}>{lastRefreshed}</strong>
          </div>

          <button
            onClick={handleRefresh}
            style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: 'var(--accent-emerald)',
              padding: '8px 14px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              fontWeight: 600
            }}
          >
            <RefreshCw size={13} />
            Refresh Ticks
          </button>
        </div>
      </div>

      {/* Benchmark Indices Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px'
      }}>
        {indices.map((idx, i) => {
          const rangePct = Math.min(100, Math.max(0, ((idx.value - idx.dayLow) / (idx.dayHigh - idx.dayLow)) * 100));
          return (
            <div 
              key={i} 
              className="glass-card" 
              style={{ 
                padding: '20px', 
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '14px',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.4px' }}>
                    {idx.name}
                  </span>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: idx.isUp ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                    color: idx.isUp ? 'var(--accent-emerald)' : 'var(--danger)'
                  }}>
                    {idx.status}
                  </span>
                </div>

                {/* Price and Change */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                  <span style={{
                    fontSize: '1.6rem',
                    fontWeight: 800,
                    fontFamily: 'var(--font-mono)',
                    color: '#fff'
                  }}>
                    {idx.name === 'INDIA VIX' ? idx.value.toFixed(2) : `₹${idx.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    color: idx.isUp ? 'var(--accent-emerald)' : 'var(--danger)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px'
                  }}>
                    {idx.isUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                    {idx.change > 0 ? `+${idx.change}` : idx.change} ({idx.pct})
                  </span>
                </div>

                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.4 }}>
                  {idx.description}
                </p>
              </div>

              {/* Day Range Slider & Metrics */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '4px' }}>
                  <span>Low: ₹{idx.dayLow.toLocaleString()}</span>
                  <span>Day Range</span>
                  <span>High: ₹{idx.dayHigh.toLocaleString()}</span>
                </div>
                <div style={{ width: '100%', height: '5px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '3px', position: 'relative' }}>
                  <div style={{
                    width: `${rangePct}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #ef4444, #10b981)',
                    borderRadius: '3px'
                  }}></div>
                </div>

                {/* Breadth metrics */}
                {idx.advances && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    <span>Breadth: <strong style={{ color: 'var(--accent-emerald)' }}>{idx.advances} Adv</strong> / <strong style={{ color: 'var(--danger)' }}>{idx.declines} Dec</strong></span>
                    <span>PCR: <strong style={{ color: '#fff' }}>{idx.pcr}</strong></span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sector Performance Horizontal Tape */}
      <div style={{
        background: 'rgba(17, 17, 22, 0.8)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '12px',
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          Sectoral Heatmap
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {sectorPerformance.map((sec, sIdx) => (
            <div key={sIdx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem' }}>
              <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{sec.name}:</span>
              <span style={{
                color: sec.isUp ? 'var(--accent-emerald)' : 'var(--danger)',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)'
              }}>
                {sec.pct}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Heavyweight Stocks Real-Time Heatlist */}
      <div className="signals-table-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
              Nifty 50 Heavyweights & High-Beta Stocks
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Real-time technical tracking with automated VWAP & RSI momentum indicators.
            </p>
          </div>

          <span style={{
            fontSize: '0.74rem',
            color: 'var(--accent-emerald)',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            padding: '4px 10px',
            borderRadius: '6px',
            fontWeight: 700
          }}>
            {stocksUniverse.length} Active Heavyweights Monitored
          </span>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 14px' }}>Stock & Sector</th>
                <th style={{ padding: '12px 14px' }}>LTP (Price)</th>
                <th style={{ padding: '12px 14px' }}>Change</th>
                <th style={{ padding: '12px 14px' }}>VWAP</th>
                <th style={{ padding: '12px 14px' }}>RSI (14)</th>
                <th style={{ padding: '12px 14px' }}>Day Range</th>
                <th style={{ padding: '12px 14px' }}>Setup</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Quick Test Action</th>
              </tr>
            </thead>
            <tbody>
              {stocksUniverse.map((stk, sIndex) => (
                <tr 
                  key={sIndex} 
                  style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', transition: 'background 0.15s ease' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '14px' }}>
                    <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.88rem' }}>{stk.symbol}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{stk.name} • {stk.sector}</div>
                  </td>

                  <td style={{ padding: '14px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fff' }}>
                    ₹{stk.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>

                  <td style={{ padding: '14px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: stk.isUp ? 'var(--accent-emerald)' : 'var(--danger)' }}>
                    {stk.pct}
                  </td>

                  <td style={{ padding: '14px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    ₹{stk.vwap.toFixed(2)}
                  </td>

                  <td style={{ padding: '14px', fontFamily: 'var(--font-mono)' }}>
                    <span style={{
                      color: stk.rsi >= 60 ? 'var(--accent-emerald)' : (stk.rsi <= 40 ? 'var(--danger)' : '#fff'),
                      fontWeight: 700
                    }}>
                      {stk.rsi}
                    </span>
                  </td>

                  <td style={{ padding: '14px', minWidth: '130px' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginBottom: '3px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>₹{stk.dayLow}</span>
                      <span>₹{stk.dayHigh}</span>
                    </div>
                    <div style={{ width: '100%', height: '4px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '2px' }}>
                      <div style={{
                        width: `${Math.min(100, Math.max(0, ((stk.price - stk.dayLow) / (stk.dayHigh - stk.dayLow)) * 100))}%`,
                        height: '100%',
                        background: 'var(--accent-emerald)',
                        borderRadius: '2px'
                      }}></div>
                    </div>
                  </td>

                  <td style={{ padding: '14px' }}>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      background: 'rgba(16, 185, 129, 0.12)',
                      color: 'var(--accent-emerald)',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      border: '1px solid rgba(16, 185, 129, 0.25)'
                    }}>
                      {stk.trend}
                    </span>
                  </td>

                  <td style={{ padding: '14px', textAlign: 'right' }}>
                    <button
                      onClick={() => onExecuteQuickTrade && onExecuteQuickTrade(stk)}
                      style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#051610',
                        border: 'none',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                      }}
                    >
                      <Zap size={12} />
                      Paper Trade
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
