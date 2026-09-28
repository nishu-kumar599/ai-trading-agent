import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, Wifi } from 'lucide-react';

export const MarketTickerTape = ({ onSelectTicker }) => {
  const [ticks, setTicks] = useState([
    { symbol: 'NIFTY 50', price: 22794.95, change: -345.55, pct: '-1.49%', isUp: false, isIndex: true },
    { symbol: 'SENSEX', price: 72851.70, change: -1044.00, pct: '-1.41%', isUp: false, isIndex: true },
    { symbol: 'BANK NIFTY', price: 54489.70, change: -1725.85, pct: '-3.07%', isUp: false, isIndex: true },
    { symbol: 'RELIANCE', price: 1198.80, change: -41.60, pct: '-3.35%', isUp: false, isIndex: false },
    { symbol: 'TCS', price: 2075.20, change: -29.80, pct: '-1.42%', isUp: false, isIndex: false },
    { symbol: 'HDFCBANK', price: 719.10, change: -16.50, pct: '-2.24%', isUp: false, isIndex: false },
    { symbol: 'M&M', price: 2995.00, change: -49.50, pct: '-1.63%', isUp: false, isIndex: false },
    { symbol: 'INFY', price: 1540.20, change: -24.80, pct: '-1.58%', isUp: false, isIndex: false }
  ]);
  const [isLiveStream, setIsLiveStream] = useState(true);

  // Fetch real market quotes
  const fetchLiveQuotes = async () => {
    try {
      const res = await fetch('/api/market/real-quotes');
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (data && data.success) {
        const combined = [];
        
        // Add indices
        if (data.indices && data.indices.length > 0) {
          data.indices.forEach(idx => {
            combined.push({
              symbol: idx.name,
              price: idx.price,
              change: idx.changeValue,
              pct: idx.changePct,
              isUp: idx.isPositive,
              isIndex: true
            });
          });
        }

        // Add top stocks
        if (data.stocks && data.stocks.length > 0) {
          data.stocks.forEach(stk => {
            combined.push({
              symbol: stk.symbol,
              price: stk.price,
              change: stk.changeValue,
              pct: stk.changePct,
              isUp: stk.isPositive,
              isIndex: false,
              trend: stk.trend,
              rsi: stk.rsi
            });
          });
        }

        if (combined.length > 0) {
          setTicks(combined);
          setIsLiveStream(true);
        }
      }
    } catch (err) {
      console.warn('Real quotes stream polling error:', err);
    }
  };

  useEffect(() => {
    fetchLiveQuotes();
    // Poll real quotes every 35 seconds to stay synchronized with live exchange
    const pollInterval = setInterval(fetchLiveQuotes, 35000);
    return () => clearInterval(pollInterval);
  }, []);

  // Double items for seamless infinite scroll
  const marqueeItems = [...ticks, ...ticks];

  return (
    <div style={{
      width: '100%',
      height: '38px',
      background: 'rgba(11, 16, 28, 0.98)',
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      overflow: 'hidden',
      position: 'relative',
      zIndex: 95
    }}>
      {/* Live Badge Left Anchor */}
      <div style={{
        background: 'rgba(11, 16, 28, 0.98)',
        height: '100%',
        padding: '0 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        borderRight: '1px solid var(--border-subtle)',
        zIndex: 10,
        flexShrink: 0
      }}>
        <span style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          background: 'var(--accent-emerald)',
          boxShadow: '0 0 8px var(--accent-emerald)',
          display: 'inline-block'
        }}></span>
        <span style={{
          fontSize: '0.68rem',
          fontWeight: 800,
          color: 'var(--accent-emerald)',
          letterSpacing: '0.6px',
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          REAL MARKET
        </span>
      </div>

      {/* Scrolling Tape Container */}
      <div 
        className="ticker-tape-scroll"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '28px',
          whiteSpace: 'nowrap',
          animation: 'tickerScroll 40s linear infinite',
          paddingLeft: '20px'
        }}
        onMouseEnter={(e) => e.currentTarget.style.animationPlayState = 'paused'}
        onMouseLeave={(e) => e.currentTarget.style.animationPlayState = 'running'}
      >
        {marqueeItems.map((item, idx) => (
          <div
            key={idx}
            onClick={() => onSelectTicker && onSelectTicker(item)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.78rem',
              cursor: 'pointer',
              userSelect: 'none'
            }}
            title={`${item.symbol}: ₹${item.price} (${item.pct})`}
          >
            <span style={{
              fontWeight: 700,
              color: item.isIndex ? '#38bdf8' : '#f8fafc',
              fontFamily: 'var(--font-main)'
            }}>
              {item.symbol}
            </span>

            <span style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              color: '#fff'
            }}>
              ₹{Number(item.price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>

            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              color: item.isUp ? 'var(--accent-emerald)' : 'var(--danger)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.72rem',
              fontWeight: 700
            }}>
              {item.isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {item.pct}
            </span>

            <span style={{ color: '#272733', margin: '0 4px' }}>|</span>
          </div>
        ))}
      </div>

      {/* Inline Keyframes for Marquee Animation */}
      <style>{`
        @keyframes tickerScroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
};
