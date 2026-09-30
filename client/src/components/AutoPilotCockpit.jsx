import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Play, 
  Pause, 
  Zap, 
  ShieldCheck, 
  TrendingUp, 
  TrendingDown, 
  Award, 
  RotateCcw, 
  Crosshair, 
  Activity, 
  Layers, 
  Clock, 
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Database,
  Brain,
  Lock,
  Coins
} from 'lucide-react';

export const AutoPilotCockpit = () => {
  const [agentData, setAgentData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionNotice, setActionNotice] = useState('');
  const [triggeringScan, setTriggeringScan] = useState(false);

  const fetchAgentStatus = async () => {
    try {
      const res = await fetch('/api/ai-agent/status');
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (data && data.success && data.status) {
        setAgentData(data.status);
      }
    } catch (err) {
      console.warn('Failed to load AI Agent status:', err);
    }
  };

  useEffect(() => {
    fetchAgentStatus();
    const interval = setInterval(fetchAgentStatus, 2500); // Poll status every 2.5s
    return () => clearInterval(interval);
  }, []);

  const handleToggleAutoPilot = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai-agent/toggle', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setActionNotice(data.message);
        await fetchAgentStatus();
      }
    } catch (err) {
      setActionNotice('Toggle failed: ' + err.message);
    } finally {
      setLoading(false);
      setTimeout(() => setActionNotice(''), 4000);
    }
  };

  const handleTriggerCycle = async () => {
    setTriggeringScan(true);
    setActionNotice('Running autonomous multi-segment market scan & probability ranking...');
    try {
      const res = await fetch('/api/ai-agent/trigger-scan', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setActionNotice('Autonomous scan cycle completed.');
        await fetchAgentStatus();
      }
    } catch (err) {
      setActionNotice('Scan error: ' + err.message);
    } finally {
      setTriggeringScan(false);
      setTimeout(() => setActionNotice(''), 4000);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset Autonomous AI Agent state, capital to ₹100,000, and clear trade logs?')) return;
    try {
      const res = await fetch('/api/ai-agent/reset-state', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setActionNotice('Sandbox reset to ₹100,000 with clean logs.');
        await fetchAgentStatus();
      }
    } catch (err) {
      setActionNotice('Reset failed: ' + err.message);
    } finally {
      setTimeout(() => setActionNotice(''), 4000);
    }
  };

  const accuracy = agentData?.accuracy || {};
  const isAutoPilotActive = agentData?.isAutoPilotActive;
  const decisionLogs = agentData?.decisionLogs || [];
  const segments = accuracy.segmentBreakdown || {};
  const riskGuard = agentData?.riskGuard || {};
  const learning = agentData?.learning || {};
  const isMongoSynced = agentData?.isMongoSynced;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner: Auto-Pilot Command Center */}
      <div style={{
        background: isAutoPilotActive 
          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(14, 165, 233, 0.12) 50%, rgba(15, 23, 42, 0.95) 100%)'
          : 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(15, 23, 42, 0.95) 100%)',
        border: `1px solid ${isAutoPilotActive ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.3)'}`,
        borderRadius: '16px',
        padding: '24px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div style={{ maxWidth: '680px' }}>
          {/* Status Badges Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 800,
              letterSpacing: '0.5px',
              background: isAutoPilotActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
              color: isAutoPilotActive ? 'var(--accent-emerald)' : '#fbbf24',
              border: `1px solid ${isAutoPilotActive ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.3)'}`
            }}>
              <span className="pulse-dot" style={{ background: isAutoPilotActive ? '#10b981' : '#f59e0b' }}></span>
              {isAutoPilotActive ? 'AI AUTONOMOUS AGENT ACTIVE (24/7 AUTO-TRADE)' : 'AI AUTO-PILOT PAUSED'}
            </span>

            {/* MongoDB Cloud Status */}
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '0.72rem',
              fontWeight: 700,
              background: isMongoSynced ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.12)',
              color: isMongoSynced ? 'var(--accent-emerald)' : '#94a3b8',
              border: `1px solid ${isMongoSynced ? 'rgba(16, 185, 129, 0.3)' : 'rgba(148, 163, 184, 0.2)'}`
            }}>
              <Database size={12} />
              {isMongoSynced ? 'MongoDB Cloud Atlas Synced' : 'Local Storage Mode'}
            </span>

            {/* Market Close Auto-Squareoff */}
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '0.72rem',
              fontWeight: 700,
              background: 'rgba(56, 189, 248, 0.12)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.25)'
            }}>
              <Clock size={12} />
              Auto-Squareoff @ 15:15 IST
            </span>
          </div>

          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', margin: '4px 0 8px 0' }}>
            Autonomous Multi-Segment AI Trading Sentinel
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5', margin: 0 }}>
            Automatically scans <strong>Intraday (Long & Short Selling)</strong>, <strong>F&O Options (Calls & Puts)</strong>, and <strong>Swing Breakouts</strong>. It picks trades with highest probability of profit (Score ≥ {learning.baseScoreThreshold || 80}, R:R ≥ 2.0), enforces <strong>Anti-Overtrading & Brokerage Guard</strong>, snaps Stop-Loss to Breakeven at +1.0%, auto-squares off at 15:15 IST, and <strong>self-learns from every trade outcome</strong>.
          </p>

          {actionNotice && (
            <div style={{
              marginTop: '12px',
              padding: '8px 14px',
              borderRadius: '8px',
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: '#38bdf8',
              fontSize: '0.82rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Sparkles size={14} />
              {actionNotice}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '220px' }}>
          <button
            onClick={handleToggleAutoPilot}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px 20px',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '0.92rem',
              border: 'none',
              cursor: 'pointer',
              background: isAutoPilotActive 
                ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' 
                : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#fff',
              boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
              transition: 'all 0.2s ease'
            }}
          >
            {isAutoPilotActive ? <Pause size={17} /> : <Play size={17} />}
            {isAutoPilotActive ? 'Pause Auto-Pilot' : 'Activate Auto-Pilot'}
          </button>

          <button
            onClick={handleTriggerCycle}
            disabled={triggeringScan}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px 16px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.84rem',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              cursor: 'pointer'
            }}
          >
            <Zap size={14} style={{ color: '#38bdf8' }} />
            {triggeringScan ? 'Scanning...' : 'Trigger Scan Cycle'}
          </button>

          <button
            onClick={handleReset}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '0.74rem',
              background: 'transparent',
              color: 'var(--text-dim)',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            <RotateCcw size={12} />
            Reset AI State & Balance
          </button>
        </div>
      </div>

      {/* Anti-Overtrading & Brokerage Capital Guard Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
        border: '1px solid rgba(148, 163, 184, 0.2)',
        borderRadius: '14px',
        padding: '18px 22px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={18} style={{ color: '#10b981' }} />
            <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#fff', margin: 0 }}>
              Anti-Overtrading & Capital Guard
            </h3>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Guarantees capital safety: limits position count, limits daily churn, and accounts for brokerage fees.
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '6px',
              background: riskGuard.isCooldownActive ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
              color: riskGuard.isCooldownActive ? '#fbbf24' : '#10b981',
              border: `1px solid ${riskGuard.isCooldownActive ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
            }}>
              {riskGuard.isCooldownActive ? `Cooldown Active (${Math.ceil(riskGuard.cooldownRemainingSec / 60)}m left)` : 'Execution Cooldown: Ready'}
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '12px' }}>
          {/* Slot limit */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '12px 14px' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 700 }}>ACTIVE POSITION SLOTS</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#fff', marginTop: '2px' }}>
              {riskGuard.activePositionsCount || 0} / {riskGuard.maxConcurrentPositions || 2} Max
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Limits active risk to max 2 concurrent positions
            </div>
          </div>

          {/* Daily limit */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '12px 14px' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 700 }}>DAILY TRADES QUOTA</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#38bdf8', marginTop: '2px' }}>
              {riskGuard.dailyTradesCount || 0} / {riskGuard.dailyTradeLimit || 5} Today
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Prevents excessive churning & transaction fees
            </div>
          </div>

          {/* Capital Floor */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '12px 14px' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 700 }}>70% CASH FLOOR RESERVE</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-emerald)', marginTop: '2px' }}>
              ₹{Number(riskGuard.minCashFloor || 70000).toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Wallet cash floor strictly protected
            </div>
          </div>

          {/* Brokerage deducted */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '12px 14px' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 700 }}>BROKERAGE & TAXES</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#f59e0b', marginTop: '2px' }}>
              ₹{riskGuard.brokeragePerTrade || 45}/trade
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              ₹40 round-trip + ₹5 taxes factored in Net P&L
            </div>
          </div>
        </div>
      </div>

      {/* Accuracy & Quantitative Scorecard */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '14px' }}>
        {/* Win Rate */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '14px',
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Award size={14} style={{ color: 'var(--accent-emerald)' }} />
            AI Model Accuracy (Win Rate)
          </div>
          <div style={{
            fontSize: '2.1rem',
            fontWeight: 800,
            fontFamily: 'var(--font-mono)',
            color: 'var(--accent-emerald)',
            display: 'flex',
            alignItems: 'baseline',
            gap: '8px'
          }}>
            {accuracy.winRatePct !== undefined ? `${accuracy.winRatePct}%` : '100.0%'}
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              ({accuracy.winningTrades || 0}W - {accuracy.breakevenTrades || 0}BE - {accuracy.losingTrades || 0}L)
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Includes zero-loss protected breakeven exits. Pure win rate: {accuracy.pureWinRatePct || 100}%
          </div>
        </div>

        {/* Realized Net P&L */}
        <div style={{
          background: 'var(--bg-card)',
          border: `1px solid ${(accuracy.totalRealizedPL || 0) >= 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          borderRadius: '14px',
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <TrendingUp size={14} style={{ color: (accuracy.totalRealizedPL || 0) >= 0 ? 'var(--accent-emerald)' : 'var(--danger)' }} />
            Net Realized Profit (Post-Brokerage)
          </div>
          <div style={{
            fontSize: '2.1rem',
            fontWeight: 800,
            fontFamily: 'var(--font-mono)',
            color: (accuracy.totalRealizedPL || 0) >= 0 ? 'var(--accent-emerald)' : 'var(--danger)'
          }}>
            {(accuracy.totalRealizedPL || 0) >= 0 ? '+' : ''}₹{Number(accuracy.totalRealizedPL || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Gross: +₹{Number(accuracy.totalGrossProfit || 0).toFixed(2)} | Brokerage/Taxes: -₹{Number(accuracy.totalBrokeragePaid || 0).toFixed(2)}
          </div>
        </div>

        {/* Profit Factor */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '14px',
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={14} style={{ color: '#38bdf8' }} />
            Profit Factor
          </div>
          <div style={{
            fontSize: '2.1rem',
            fontWeight: 800,
            fontFamily: 'var(--font-mono)',
            color: '#38bdf8'
          }}>
            {accuracy.profitFactor !== undefined ? `${accuracy.profitFactor}x` : '0.00x'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Ratio of gross profit generated over gross drawdown
          </div>
        </div>

        {/* Active Positions & Capital */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '14px',
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={14} style={{ color: '#a855f7' }} />
            Virtual Capital Sandbox
          </div>
          <div style={{
            fontSize: '2.1rem',
            fontWeight: 800,
            fontFamily: 'var(--font-mono)',
            color: '#fff'
          }}>
            ₹{Number(accuracy.virtualCapital || 100000).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Invested: ₹{riskGuard.currentInvested || 0} | Free: ₹{riskGuard.freeCapital || 100000}
          </div>
        </div>
      </div>

      {/* AI Self-Learning & Reinforcement Engine Panel */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid rgba(168, 85, 247, 0.3)',
        borderRadius: '14px',
        padding: '20px 22px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Brain size={18} style={{ color: '#a855f7' }} />
              AI Self-Learning & Reinforcement Calibration
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              The AI model analyzes every closed trade, reinforces winning indicator patterns (VWAP, RSI, Volume), and tightens rules on losses to maximize future precision.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.74rem', color: '#a855f7', fontWeight: 700, background: 'rgba(168, 85, 247, 0.12)', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(168, 85, 247, 0.25)' }}>
              Trades Analyzed: {learning.totalTradesAnalyzed || 0}
            </span>
            <span style={{ fontSize: '0.74rem', color: '#38bdf8', fontWeight: 700, background: 'rgba(56, 189, 248, 0.12)', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
              Score Filter: ≥{learning.baseScoreThreshold || 80}/100
            </span>
          </div>
        </div>

        {/* Current Learned Indicator Weights */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '10px', marginBottom: '14px' }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '10px 12px' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 700 }}>VWAP WEIGHT</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#38bdf8', marginTop: '2px' }}>
              {learning.weights?.vwapWeight || 12.0} / 22
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Institutional flow anchor</div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '10px 12px' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 700 }}>RSI SWEET-SPOT</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-emerald)', marginTop: '2px' }}>
              {learning.weights?.rsiWeight || 12.0} / 22
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Momentum velocity</div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '10px 12px' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 700 }}>VOLUME SURGE</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#f59e0b', marginTop: '2px' }}>
              {learning.weights?.volumeWeight || 8.0} / 18
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Liquidity breakout boost</div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '10px 12px' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 700 }}>INTRADAY MULTIPLIER</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#ec4899', marginTop: '2px' }}>
              {learning.segmentMultipliers?.INTRADAY || 1.0}x
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Dynamic segment bias</div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '10px 12px' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 700 }}>F&O OPTION MULTIPLIER</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#a855f7', marginTop: '2px' }}>
              {learning.segmentMultipliers?.F_AND_O || 1.0}x
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Asymmetric delta weighting</div>
          </div>
        </div>

        {/* Learning History Feed */}
        <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', fontWeight: 700, marginBottom: '8px' }}>
          RECENT LEARNING EVOLUTION LOGS
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {(learning.recentEvolutionLogs || []).length === 0 ? (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '10px' }}>
              Model waiting for trade outcomes to calibrate weights.
            </div>
          ) : (
            (learning.recentEvolutionLogs || []).slice(0, 3).map((item, idx) => (
              <div key={idx} style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '6px',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.78rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: item.outcome === 'WIN' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(148, 163, 184, 0.15)',
                    color: item.outcome === 'WIN' ? 'var(--accent-emerald)' : '#94a3b8'
                  }}>
                    {item.outcome}
                  </span>
                  <span style={{ color: '#e2e8f0' }}>{item.insight}</span>
                </div>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>
                  {item.weightAdjustment}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Multi-Segment Performance Breakdown */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '14px',
        padding: '20px 22px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} style={{ color: 'var(--accent-emerald)' }} />
              Multi-Segment Accuracy & Profit Breakdown
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              Verified statistical precision across Equity Longs, Equity Short-Selling, and F&O Option strikes.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: '12px' }}>
          {/* Intraday Long */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700 }}>INTRADAY BUY (LONG)</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-emerald)', marginTop: '4px' }}>
              {segments.intradayLong?.winRatePct || 100}%
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {segments.intradayLong?.total || 0} Trades • Net P&L: ₹{segments.intradayLong?.pl || 0}
            </div>
          </div>

          {/* Intraday Short */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700 }}>INTRADAY SELL (SHORT)</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#38bdf8', marginTop: '4px' }}>
              {segments.intradayShort?.winRatePct || 100}%
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {segments.intradayShort?.total || 0} Trades • Net P&L: ₹{segments.intradayShort?.pl || 0}
            </div>
          </div>

          {/* F&O Call Buying */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700 }}>F&O CALL (CE) BUYING</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#a855f7', marginTop: '4px' }}>
              {segments.optionsCalls?.winRatePct || 100}%
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {segments.optionsCalls?.total || 0} Trades • Net P&L: ₹{segments.optionsCalls?.pl || 0}
            </div>
          </div>

          {/* F&O Put Buying */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700 }}>F&O PUT (PE) BUYING</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#f59e0b', marginTop: '4px' }}>
              {segments.optionsPuts?.winRatePct || 100}%
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {segments.optionsPuts?.total || 0} Trades • Net P&L: ₹{segments.optionsPuts?.pl || 0}
            </div>
          </div>

          {/* Swing Trading */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700 }}>SWING BREAKOUTS</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#ec4899', marginTop: '4px' }}>
              {segments.swingTrading?.winRatePct || 100}%
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {segments.swingTrading?.total || 0} Trades • Net P&L: ₹{segments.swingTrading?.pl || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Live AI Decision Stream & Trade Execution Log */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '14px',
        padding: '20px 22px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bot size={18} style={{ color: '#38bdf8' }} />
              Live Autonomous Decision Stream & Thought Process
            </h3>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              Audit-grade log showing how the AI agent calculates probabilities, enforces risk guards, executes entries, locks profit at breakeven, and exits.
            </p>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            {decisionLogs.length} events logged
          </span>
        </div>

        <div style={{
          maxHeight: '320px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          paddingRight: '6px'
        }}>
          {decisionLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-dim)', fontSize: '0.86rem' }}>
              No decisions logged yet. The agent is monitoring real-time feeds.
            </div>
          ) : (
            decisionLogs.map((log, idx) => {
              let badgeColor = 'rgba(255,255,255,0.08)';
              let textColor = '#cbd5e1';
              if (log.type === 'EXECUTE') {
                badgeColor = 'rgba(56, 189, 248, 0.15)';
                textColor = '#38bdf8';
              } else if (log.type === 'PROFIT_LOCK') {
                badgeColor = 'rgba(16, 185, 129, 0.2)';
                textColor = 'var(--accent-emerald)';
              } else if (log.type === 'TARGET_HIT') {
                badgeColor = 'rgba(16, 185, 129, 0.25)';
                textColor = '#34d399';
              } else if (log.type === 'STOP_LOSS') {
                badgeColor = 'rgba(239, 68, 68, 0.15)';
                textColor = '#f87171';
              } else if (log.type === 'SQUARE_OFF') {
                badgeColor = 'rgba(168, 85, 247, 0.2)';
                textColor = '#c084fc';
              } else if (log.type === 'RISK_GUARD') {
                badgeColor = 'rgba(245, 158, 11, 0.2)';
                textColor = '#fbbf24';
              }

              return (
                <div
                  key={log.id || idx}
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px'
                  }}
                >
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: badgeColor,
                    color: textColor,
                    whiteSpace: 'nowrap',
                    marginTop: '2px'
                  }}>
                    {log.type}
                  </span>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.82rem', color: '#e2e8f0', lineHeight: '1.4' }}>
                      {log.message}
                    </div>
                  </div>

                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                    {log.displayTime || new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
