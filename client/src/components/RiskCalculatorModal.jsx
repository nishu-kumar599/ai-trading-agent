import React, { useState } from 'react';
import { 
  Calculator, 
  ShieldCheck, 
  DollarSign, 
  Target, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  X
} from 'lucide-react';
import { useMarket } from '../context/MarketContext';

export const RiskCalculatorModal = ({ isOpen, onClose }) => {
  const { marketRegion, currency } = useMarket();
  const [capital, setCapital] = useState(marketRegion === 'US' ? 25000 : 100000);
  const [riskPct, setRiskPct] = useState(1.0); // 1% risk per trade
  const [entryPrice, setEntryPrice] = useState(marketRegion === 'US' ? 120.0 : 2980.0);
  const [stopLoss, setStopLoss] = useState(marketRegion === 'US' ? 117.0 : 2950.0);
  const [targetPrice, setTargetPrice] = useState(marketRegion === 'US' ? 126.0 : 3050.0);

  if (!isOpen) return null;

  const cap = parseFloat(capital) || 0;
  const rPct = parseFloat(riskPct) || 1;
  const entry = parseFloat(entryPrice) || 1;
  const sl = parseFloat(stopLoss) || 1;
  const target = parseFloat(targetPrice) || 1;

  // Calculations
  const maxRiskCapital = (cap * rPct) / 100;
  const riskPerShare = Math.abs(entry - sl);
  const recommendedQuantity = riskPerShare > 0 ? Math.floor(maxRiskCapital / riskPerShare) : 0;
  const requiredInvestment = recommendedQuantity * entry;
  const profitPerShare = Math.abs(target - entry);
  const totalProjectedProfit = recommendedQuantity * profitPerShare;
  const riskRewardRatio = riskPerShare > 0 ? (profitPerShare / riskPerShare).toFixed(2) : '0';
  const breakevenTriggerPrice = +(entry * 1.01).toFixed(2);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(5, 9, 18, 0.85)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '16px'
    }}>
      <div className="glass-card" style={{ maxWidth: '580px', width: '100%', padding: '28px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-emerald)'
            }}>
              <Calculator size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>
                Position Sizing & Risk Calculator
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                Institutional 1% Risk Allocation & Breakeven Engine
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: 'none',
              color: '#94a3b8',
              borderRadius: '8px',
              padding: '6px',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Input Fields Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
          <div>
            <label className="form-label">Total Account Capital ({currency})</label>
            <input
              type="number"
              className="input-field"
              value={capital}
              onChange={(e) => setCapital(e.target.value)}
              style={{ paddingLeft: '14px' }}
            />
          </div>

          <div>
            <label className="form-label">Risk Per Trade (%)</label>
            <input
              type="number"
              step="0.1"
              className="input-field"
              value={riskPct}
              onChange={(e) => setRiskPct(e.target.value)}
              style={{ paddingLeft: '14px' }}
            />
          </div>

          <div>
            <label className="form-label">Entry Price ({currency})</label>
            <input
              type="number"
              className="input-field"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              style={{ paddingLeft: '14px' }}
            />
          </div>

          <div>
            <label className="form-label">Stop-Loss Price ({currency})</label>
            <input
              type="number"
              className="input-field"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              style={{ paddingLeft: '14px' }}
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Target Price ({currency})</label>
            <input
              type="number"
              className="input-field"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              style={{ paddingLeft: '14px' }}
            />
          </div>
        </div>

        {/* Output Metrics Card */}
        <div style={{
          background: 'rgba(16, 185, 129, 0.06)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: '12px',
          padding: '18px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '14px',
          marginBottom: '18px'
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Recommended Qty</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)' }}>
              {recommendedQuantity} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>shares</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Capital Required</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)' }}>
              {currency}{requiredInvestment.toLocaleString(marketRegion === 'US' ? 'en-US' : 'en-IN', { maximumFractionDigits: 0 })}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Risk : Reward</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
              1 : {riskRewardRatio}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Projected Gain</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)' }}>
              +{currency}{totalProjectedProfit.toLocaleString(marketRegion === 'US' ? 'en-US' : 'en-IN', { maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>

        {/* Zero Loss Rule Note */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '10px',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.78rem',
          color: '#cbd5e1'
        }}>
          <ShieldCheck size={18} color="var(--accent-emerald)" style={{ flexShrink: 0 }} />
          <div>
            <strong>Profit-Lock Trigger:</strong> Once price touches <strong>{currency}{breakevenTriggerPrice}</strong> (+1.0%), Stop-Loss automatically shifts to Breakeven ({currency}{entry}), eliminating risk of loss!
          </div>
        </div>

        <button
          type="button"
          className="btn-primary"
          onClick={onClose}
          style={{ marginTop: '18px' }}
        >
          Apply Parameters & Close
        </button>
      </div>
    </div>
  );
};
