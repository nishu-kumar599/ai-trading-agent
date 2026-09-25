import React from 'react';
import { 
  Zap, 
  TrendingUp, 
  Compass, 
  Calendar, 
  Layers, 
  ShieldCheck, 
  Clock, 
  Target, 
  AlertTriangle,
  Info,
  CheckCircle2
} from 'lucide-react';

const SEGMENT_GUIDES = {
  INTRADAY: {
    title: 'Intraday Trading Terminal (1m – 15m)',
    subtitle: 'High-frequency algorithmic momentum and VWAP mean-reversion trading',
    riskLevel: 'MEDIUM - CONTROLLED',
    riskColor: '#f59e0b',
    holdingPeriod: '15 Minutes to 4 Hours (Auto-square off at 15:15 IST)',
    idealFor: 'Quick daily gains without overnight gap-down risk',
    profitMechanism: [
      'Identifies institutional volume surges crossing above or below daily VWAP.',
      'Enters on EMA 9 crossing EMA 21 with confirming RSI momentum (52-70 for long, 30-48 for short).',
      'Captures quick 1.5% to 3.0% swings while automatically escaping before market close.'
    ],
    zeroLossRule: 'At +1.0% profit, the Stop-Loss immediately snaps to Entry + 0.1% (Breakeven). If the market reverses, your capital is 100% protected with zero loss.'
  },
  SHORT_TERM: {
    title: 'Short-Term Swing Breakout (1 – 5 Days)',
    subtitle: 'Capturing multi-day momentum breakouts and sector rotation waves',
    riskLevel: 'LOW TO MEDIUM',
    riskColor: '#10b981',
    holdingPeriod: '1 to 5 Trading Days',
    idealFor: 'Riding sustained stock rallies without watching candles every minute',
    profitMechanism: [
      'Filters for 20 EMA > 50 EMA trend alignment on 1-hour and daily charts.',
      'Confirms entry when MACD histogram expands upward and RSI bounces from the 45-55 pullback support zone.',
      'Targets 3.5% (Target 1) and 7.0% (Target 2) multi-day swing profits.'
    ],
    zeroLossRule: 'Target 1 books 50% partial profit at +3.5%. Stop-Loss is then moved above cost price, guaranteeing a profitable trade outcome.'
  },
  MEDIUM_TERM: {
    title: 'Medium-Term Positional Golden Cross (2 – 12 Weeks)',
    subtitle: 'Institutional trend-following during macro Golden Cross cycles',
    riskLevel: 'MODERATE - TREND FOLLOWING',
    riskColor: '#38bdf8',
    holdingPeriod: '2 to 12 Weeks (Quarterly cycles)',
    idealFor: 'Capturing massive multi-week rallies in sector leaders',
    profitMechanism: [
      'Executes only in a confirmed Golden Cross regime (50 SMA > 200 SMA).',
      'Confirms sustained weekly closes above 50 SMA with SuperTrend indicator green.',
      'Aims for +12% to +25%+ macro trend gains.'
    ],
    zeroLossRule: 'Stop loss trails dynamically along the rising 50-day moving average. As the stock climbs, profits are locked along the baseline.'
  },
  LONG_TERM: {
    title: 'Long-Term Wealth Accumulation & Value DCA',
    subtitle: 'Systematic value investing in monopoly & bluechip leaders on major cyclical discounts',
    riskLevel: 'VERY CONSERVATIVE',
    riskColor: '#10b981',
    holdingPeriod: '6 Months to 3+ Years',
    idealFor: 'Long-term wealth creation, compounding, and dividend harvesting',
    profitMechanism: [
      'Monitors premier bluechips (RELIANCE, TCS, HDFCBANK, INFY) for pullbacks within 5% of their 200-day SMA.',
      'Validates weekly RSI < 40 indicating temporary market panic / extreme discount.',
      'Accumulates in tranches to average down acquisition costs.'
    ],
    zeroLossRule: 'Enforces a 10% catastrophic circuit stop-loss while rebalancing profits when price extends >35% above the 200 SMA.'
  },
  F_AND_O: {
    title: 'Futures & Options Precision (F&O)',
    subtitle: 'High-leverage asymmetric derivative trades: Buy Calls on uptrends, Buy Puts on downtrends',
    riskLevel: 'HIGH LEVERAGE - ASYMMETRIC REWARD',
    riskColor: '#f43f5e',
    holdingPeriod: 'Intraday to Weekly / Monthly Expiry',
    idealFor: 'Exponential percentage returns (45% to 100%+) on explosive breakout moves',
    profitMechanism: [
      'When stock goes UP: Buys At-The-Money Call Options (CE) with Delta ~0.50.',
      'When stock goes DOWN: Buys At-The-Money Put Options (PE) with Delta ~ -0.50 to profit from market drops.',
      'Enforces strict Target 1 (+45% premium gain) and Target 2 (+100% doubler).'
    ],
    zeroLossRule: 'Strict 25% premium stop-loss prevents theta wipeout. Once Target 1 (+45%) is achieved, 50% is booked and the remainder is trailed at cost price.'
  }
};

export const SegmentExplainer = ({ segment }) => {
  const guide = SEGMENT_GUIDES[segment] || SEGMENT_GUIDES.INTRADAY;

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(10, 15, 29, 0.95) 100%)',
      border: '1px solid var(--border-subtle)',
      borderRadius: '14px',
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#34d399',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '0.72rem',
              fontWeight: 700
            }}>
              SEGMENT GUIDE & RULES
            </span>
            <span style={{ fontSize: '0.8rem', color: guide.riskColor, fontWeight: 600 }}>
              Risk Level: {guide.riskLevel}
            </span>
          </div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>
            {guide.title}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {guide.subtitle}
          </p>
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          background: 'rgba(255, 255, 255, 0.02)',
          padding: '8px 14px',
          borderRadius: '8px',
          border: '1px solid var(--border-subtle)',
          fontSize: '0.78rem'
        }}>
          <div>
            <div style={{ color: 'var(--text-dim)' }}>Holding Period</div>
            <div style={{ color: '#fff', fontWeight: 600 }}>{guide.holdingPeriod}</div>
          </div>
        </div>
      </div>

      {/* 3 Step Mechanism Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '12px',
        background: 'rgba(255, 255, 255, 0.02)',
        padding: '12px 16px',
        borderRadius: '10px'
      }}>
        {guide.profitMechanism.map((rule, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.8rem', color: '#cbd5e1' }}>
            <CheckCircle2 size={16} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{rule}</span>
          </div>
        ))}
      </div>

      {/* Zero Loss Rule Box */}
      <div style={{
        background: 'rgba(16, 185, 129, 0.08)',
        border: '1px solid rgba(16, 185, 129, 0.25)',
        borderRadius: '8px',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '0.8rem',
        color: '#34d399'
      }}>
        <ShieldCheck size={20} style={{ flexShrink: 0 }} />
        <div>
          <strong>Zero-Loss Protection Rule:</strong> {guide.zeroLossRule}
        </div>
      </div>
    </div>
  );
};
