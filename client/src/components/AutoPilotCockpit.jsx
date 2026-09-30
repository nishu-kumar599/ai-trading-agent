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
  Sparkles
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
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

            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={12} />
              Evaluates every 2.5s across all segments
            </span>
          </div>

          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', margin: '4px 0 8px 0' }}>
            Autonomous Multi-Segment AI Trading Agent
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5', margin: 0 }}>
            Automatically scans <strong>Intraday (Long & Short Selling)</strong>, <strong>F&O Options (Calls & Puts)</strong>, and <strong>Swing Breakouts</strong>. It selects trades with highest probability of profit (Score ≥ 80, R:R ≥ 2.0), executes at genuine real-time market prices, snaps Stop-Loss to Breakeven at +1.0% profit, and auto-closes trades on target achievement.
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

      {/* Accuracy & Quantitative Scorecard */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
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

        {/* Realized P&L */}
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
            Net Realized Profit
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
            Gross Profit: +₹{Number(accuracy.grossProfit || 0).toFixed(2)} | Loss: ₹{Number(accuracy.grossLoss || 0).toFixed(2)}
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
            Active Slots & Capital
          </div>
          <div style={{
            fontSize: '2.1rem',
            fontWeight: 800,
            fontFamily: 'var(--font-mono)',
            color: '#fff'
          }}>
            {accuracy.openPositionsCount || 0} / {agentData?.maxConcurrentPositions || 4}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Available Sandbox Balance: ₹{Number(accuracy.virtualCapital || 100000).toLocaleString('en-IN')}
          </div>
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          {/* Intraday Long */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700 }}>INTRADAY BUY (LONG)</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-emerald)', marginTop: '4px' }}>
              {segments.intradayLong?.winRatePct || 100}%
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {segments.intradayLong?.total || 0} Trades • P&L: ₹{segments.intradayLong?.pl || 0}
            </div>
          </div>

          {/* Intraday Short */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700 }}>INTRADAY SELL (SHORT)</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#38bdf8', marginTop: '4px' }}>
              {segments.intradayShort?.winRatePct || 100}%
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {segments.intradayShort?.total || 0} Trades • P&L: ₹{segments.intradayShort?.pl || 0}
            </div>
          </div>

          {/* F&O Call Buying */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700 }}>F&O CALL (CE) BUYING</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#a855f7', marginTop: '4px' }}>
              {segments.optionsCalls?.winRatePct || 100}%
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {segments.optionsCalls?.total || 0} Trades • P&L: ₹{segments.optionsCalls?.pl || 0}
            </div>
          </div>

          {/* F&O Put Buying */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700 }}>F&O PUT (PE) BUYING</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#f59e0b', marginTop: '4px' }}>
              {segments.optionsPuts?.winRatePct || 100}%
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {segments.optionsPuts?.total || 0} Trades • P&L: ₹{segments.optionsPuts?.pl || 0}
            </div>
          </div>

          {/* Swing Trading */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700 }}>SWING BREAKOUTS</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#ec4899', marginTop: '4px' }}>
              {segments.swingTrading?.winRatePct || 100}%
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {segments.swingTrading?.total || 0} Trades • P&L: ₹{segments.swingTrading?.pl || 0}
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
              Audit-grade log showing how the AI agent calculates probabilities, executes entries, locks profit at breakeven, and exits.
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
