import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, Wifi } from 'lucide-react';
import { useMarket } from '../context/MarketContext';

export const MarketTickerTape = ({ onSelectTicker }) => {
  const { marketRegion, currency } = useMarket();
  const [ticks, setTicks] = useState([]);
  const [isLiveStream, setIsLiveStream] = useState(true);
  const [sessionInfo, setSessionInfo] = useState({
    isOpen: true,
    status: 'LIVE_TRADING',
    tradingHours: '09:15 - 15:30 IST',
    nextSessionMessage: ''
  });

  // Fetch real market quotes
  const fetchLiveQuotes = async () => {
    try {
      const res = await fetch(`/api/market/real-quotes?market=${marketRegion}`);
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (data && data.success) {
        if (data.isMarketOpen !== undefined) {
          setSessionInfo({
            isOpen: data.isMarketOpen,
            status: data.marketStatus || 'LIVE_TRADING',
            tradingHours: data.tradingHours || '09:15 - 15:30 IST',
            nextSessionMessage: data.nextSessionMessage || ''
          });
        }

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
          setIsLiveStream(data.isMarketOpen ?? true);
        }
      }
    } catch (err) {
      console.warn('Real quotes stream polling error:', err);
    }
  };

  useEffect(() => {
    fetchLiveQuotes();
    // High-frequency 2.5-second live quotes polling for real-time price flickers (Groww style)
    const pollInterval = setInterval(fetchLiveQuotes, 2500);
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
      <div 
        title={sessionInfo.isOpen ? "NSE/BSE Live Market Session Active (09:15 - 15:30 IST)" : (sessionInfo.nextSessionMessage || "Exchange Closed • Prices frozen at official closing settlement")}
        style={{
          background: 'rgba(11, 16, 28, 0.98)',
          height: '100%',
          padding: '0 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          borderRight: '1px solid var(--border-subtle)',
          zIndex: 10,
          flexShrink: 0
        }}
      >
        <span style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          background: sessionInfo.isOpen ? 'var(--accent-emerald)' : '#f59e0b',
          boxShadow: sessionInfo.isOpen ? '0 0 8px var(--accent-emerald)' : 'none',
          display: 'inline-block'
        }}></span>
        <span style={{
          fontSize: '0.68rem',
          fontWeight: 800,
          color: sessionInfo.isOpen ? 'var(--accent-emerald)' : '#fbbf24',
          letterSpacing: '0.6px',
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          {marketRegion === 'US' ? '🇺🇸 NYSE/NASDAQ' : '🇮🇳 NSE/BSE'}: {sessionInfo.isOpen ? 'LIVE' : 'CLOSED'}
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
            title={`${item.symbol}: ${currency}${item.price} (${item.pct})`}
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
              {currency}{Number(item.price || 0).toLocaleString(marketRegion === 'US' ? 'en-US' : 'en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
