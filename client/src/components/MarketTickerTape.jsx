import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

export const MarketTickerTape = ({ onSelectTicker }) => {
  const [ticks, setTicks] = useState([
    { symbol: 'NIFTY 50', price: 25388.90, change: 145.20, pct: '+0.58%', isUp: true, isIndex: true },
    { symbol: 'SENSEX', price: 82890.94, change: 412.30, pct: '+0.50%', isUp: true, isIndex: true },
    { symbol: 'BANK NIFTY', price: 52180.40, change: 320.15, pct: '+0.62%', isUp: true, isIndex: true },
    { symbol: 'INDIA VIX', price: 12.85, change: -0.42, pct: '-3.16%', isUp: false, isIndex: true },
    { symbol: 'RELIANCE', price: 2984.50, change: 42.60, pct: '+1.45%', isUp: true, isIndex: false },
    { symbol: 'HDFCBANK', price: 1642.10, change: 14.80, pct: '+0.91%', isUp: true, isIndex: false },
    { symbol: 'TCS', price: 4120.10, change: 25.40, pct: '+0.62%', isUp: true, isIndex: false },
    { symbol: 'INFY', price: 1894.20, change: 18.50, pct: '+0.99%', isUp: true, isIndex: false },
    { symbol: 'ICICIBANK', price: 1234.80, change: 16.30, pct: '+1.34%', isUp: true, isIndex: false },
    { symbol: 'TATAMOTORS', price: 985.40, change: 12.10, pct: '+1.24%', isUp: true, isIndex: false },
    { symbol: 'SBIN', price: 818.25, change: 6.80, pct: '+0.84%', isUp: true, isIndex: false },
    { symbol: 'BHARTIARTL', price: 1540.00, change: 11.20, pct: '+0.73%', isUp: true, isIndex: false }
  ]);

  // Minor live micro-fluctuation to give real-time feel
  useEffect(() => {
    const interval = setInterval(() => {
      setTicks(prevTicks => {
        const randIdx = Math.floor(Math.random() * prevTicks.length);
        const item = prevTicks[randIdx];
        const drift = (Math.random() - 0.48) * (item.price * 0.0006);
        const newPrice = +(item.price + drift).toFixed(2);
        const newChange = +(item.change + drift).toFixed(2);
        const isUp = newChange >= 0;
        const newPct = `${isUp ? '+' : ''}${((newChange / (newPrice - newChange)) * 100).toFixed(2)}%`;

        const updated = [...prevTicks];
        updated[randIdx] = { ...item, price: newPrice, change: newChange, pct: newPct, isUp };
        return updated;
      });
    }, 2800);

    return () => clearInterval(interval);
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
          textTransform: 'uppercase'
        }}>
          LIVE TAPE
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
          animation: 'tickerScroll 38s linear infinite',
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
              ₹{item.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
