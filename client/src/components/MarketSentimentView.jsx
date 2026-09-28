import React, { useState, useEffect } from 'react';
import { 
  Gauge, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  ShieldCheck, 
  BarChart2, 
  RefreshCw, 
  ArrowUpRight, 
  ArrowDownRight,
  Compass,
  Zap,
  Info
} from 'lucide-react';

export const MarketSentimentView = () => {
  const [sentiment, setSentiment] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchSentiment = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sentiment/market');
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (data && data.success) {
        setSentiment(data.data);
      }
    } catch (err) {
      console.error('Failed to load market sentiment:', err);
    } finally {
      setTimeout(() => setLoading(false), 300);
    }
  };

  useEffect(() => {
    fetchSentiment();
  }, []);

  const getMeterColor = (score) => {
    if (score >= 75) return '#10b981'; // Extreme Greed (Emerald)
    if (score >= 55) return '#34d399'; // Greed (Green)
    if (score >= 45) return '#f59e0b'; // Neutral (Amber)
    if (score >= 25) return '#f97316'; // Fear (Orange)
    return '#f43f5e'; // Extreme Fear (Rose/Red)
  };

  const score = sentiment?.fearAndGreedIndex || 68;
  const meterColor = getMeterColor(score);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(6, 182, 212, 0.08) 50%, rgba(15, 23, 42, 0.8) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.25)',
        borderRadius: '16px',
        padding: '24px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span className="badge-signal-buy" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Gauge size={14} />
              Macro Sentiment Sentinel
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Real-time Institutional & Breadth Scoring
            </span>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
            Market Sentiment Cockpit
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '4px' }}>
            Aggregates Fear & Greed Index, FII/DII institutional cash flows, Options Put-Call Ratio (PCR), and market breadth.
          </p>
        </div>

        <button
          onClick={fetchSentiment}
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-subtle)',
            color: '#fff',
            padding: '10px 18px',
            borderRadius: '10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.85rem'
          }}
        >
          <RefreshCw size={16} className={loading ? 'spinner' : ''} />
          Sync Sentiment
        </button>
      </div>

      {/* Main Grid: Gauge + 3 Core Sentiment Drivers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '20px'
      }}>
        {/* Fear & Greed Gauge Card */}
        <div className="glass-card" style={{ padding: '28px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
            Fear & Greed Index
          </span>

          {/* Visual Gauge Meter */}
          <div style={{ position: 'relative', width: '220px', height: '120px', margin: '14px 0 10px 0' }}>
            <svg width="220" height="120" viewBox="0 0 220 120">
              {/* Semi-circle Track */}
              <path
                d="M 20 110 A 90 90 0 0 1 200 110"
                fill="none"
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth="16"
                strokeLinecap="round"
              />
              {/* Colored Arc based on score */}
              <path
                d="M 20 110 A 90 90 0 0 1 200 110"
                fill="none"
                stroke={meterColor}
                strokeWidth="16"
                strokeLinecap="round"
                strokeDasharray="283"
                strokeDashoffset={283 - (283 * score) / 100}
                style={{ transition: 'stroke-dashoffset 1s ease' }}
              />
            </svg>
            <div style={{
              position: 'absolute',
              bottom: '10px',
              left: '50%',
              transform: 'translateX(-50%)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#fff', lineHeight: 1 }}>
                {score}
              </div>
              <div style={{ fontSize: '0.78rem', color: meterColor, fontWeight: 700, marginTop: '4px' }}>
                {sentiment?.sentimentLabel || 'GREED'}
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%',
            maxWidth: '240px',
            fontSize: '0.72rem',
            color: 'var(--text-dim)',
            marginTop: '8px',
            paddingTop: '8px',
            borderTop: '1px solid rgba(255,255,255,0.06)'
          }}>
            <span style={{ color: '#f43f5e' }}>0 (Extreme Fear)</span>
            <span style={{ color: '#f59e0b' }}>50 (Neutral)</span>
            <span style={{ color: '#10b981' }}>100 (Greed)</span>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '16px', lineHeight: '1.4' }}>
            Current score indicates bullish institutional risk-on appetite. Dips are actively bought by quantitative algorithms.
          </p>
        </div>

        {/* FII / DII Institutional Flow Card */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>Institutional Net Activity</h4>
              <span className="badge-signal-buy" style={{ fontSize: '0.72rem' }}>FII & DII INFLOW</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Foreign Institutional (FII)</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#10b981' }}>
                    {sentiment?.institutionalFlows?.fiiNet || '+₹2,140.50 Cr'}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Aggressive cash market net accumulation</div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Domestic Institutional (DII)</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#10b981' }}>
                    {sentiment?.institutionalFlows?.diiNet || '+₹1,320.80 Cr'}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Systematic mutual fund SIP liquidity support</div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Combined Net Inflow:</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#34d399', fontSize: '0.95rem' }}>
              {sentiment?.institutionalFlows?.totalNet || '+₹3,461.30 Cr'}
            </span>
          </div>
        </div>

        {/* Derivatives Sentiment: PCR & India VIX */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>Derivatives & Volatility</h4>
              <span style={{ fontSize: '0.72rem', background: 'rgba(6,182,212,0.15)', color: '#38bdf8', padding: '2px 8px', borderRadius: '4px' }}>
                OPTIONS SKEW
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Put-Call Ratio (PCR)</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#38bdf8' }}>
                    {sentiment?.derivativesSentiment?.pcrIndex || 1.18}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#10b981' }}>
                  {sentiment?.derivativesSentiment?.pcrInterpretation || 'Bullish Put Writing Support'}
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>India VIX (Volatility)</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#f59e0b' }}>
                    {sentiment?.derivativesSentiment?.indiaVIX || 13.45} ({sentiment?.derivativesSentiment?.vixChange || '-3.2%'})
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Low volatility regime favors trend following strategies</div>
              </div>
            </div>
          </div>

          {/* Market Breadth Advance / Decline Bar */}
          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
              <span>Market Breadth (NIFTY 50)</span>
              <span style={{ color: '#10b981', fontWeight: 600 }}>{sentiment?.marketBreadth?.ratio || '2.13'}</span>
            </div>
            <div style={{ height: '8px', background: 'rgba(244, 63, 94, 0.4)', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: '68%', background: '#10b981' }} title="Advances: 34"></div>
              <div style={{ width: '32%', background: '#f43f5e' }} title="Declines: 16"></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '4px' }}>
              <span style={{ color: '#34d399' }}>34 Advances</span>
              <span style={{ color: '#fda4af' }}>16 Declines</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
