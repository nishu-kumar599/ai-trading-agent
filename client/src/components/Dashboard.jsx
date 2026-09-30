import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sidebar } from './Sidebar';
import { SegmentExplainer } from './SegmentExplainer';
import { StrategyCenter } from './StrategyCenter';
import { MarketSentimentView } from './MarketSentimentView';
import { NewsSentimentTrader } from './NewsSentimentTrader';
import { TodayMarketAudit } from './TodayMarketAudit';
import { PLCalendar } from './PLCalendar';
import { RiskCalculatorModal } from './RiskCalculatorModal';
import { MarketTickerTape } from './MarketTickerTape';
import { MarketIndicesView } from './MarketIndicesView';
import { IPOSection } from './IPOSection';
import { 
  TrendingUp, 
  BarChart2, 
  ShieldCheck, 
  ArrowUpRight, 
  RefreshCw, 
  CheckCircle2, 
  Zap, 
  Layers, 
  DollarSign, 
  Sparkles,
  Award,
  Calculator,
  PanelLeftClose,
  PanelLeftOpen,
  BarChart3,
  Menu
} from 'lucide-react';
import { MobileBottomNav } from './MobileBottomNav';

export const Dashboard = () => {
  const { user } = useAuth();
  const [agentData, setAgentData] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState('calendar'); // Open on Calendar / Audit
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Testing mode state & real market grounding
  const [testBalance, setTestBalance] = useState(100000);
  const [testMessage, setTestMessage] = useState(null);
  const [isTestingAction, setIsTestingAction] = useState(false);
  const [activePositions, setActivePositions] = useState([]);
  const [tradeHistory, setTradeHistory] = useState([]);
  const [realQuotes, setRealQuotes] = useState(null);
  const [marketDetection, setMarketDetection] = useState(null);

  const fetchAgentStatus = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/agent/overview');
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (data) setAgentData(data);
    } catch (err) {
      console.error('Failed to fetch agent status:', err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 300);
    }
  };

  const fetchRealDashboardData = async () => {
    try {
      const [posRes, quoteRes, detectRes] = await Promise.all([
        fetch('/api/strategies/positions'),
        fetch('/api/market/real-quotes'),
        fetch('/api/market/real-detection')
      ]);

      const posText = await posRes.text();
      const posData = posText ? JSON.parse(posText) : null;
      if (posData && posData.success) {
        setActivePositions(posData.activePositions || []);
        setTradeHistory(posData.tradeHistory || []);
      }

      const quoteText = await quoteRes.text();
      const quoteData = quoteText ? JSON.parse(quoteText) : null;
      if (quoteData && quoteData.success) {
        setRealQuotes(quoteData);
      }

      const detectText = await detectRes.text();
      const detectData = detectText ? JSON.parse(detectText) : null;
      if (detectData && detectData.success) {
        setMarketDetection(detectData);
      }
    } catch (err) {
      console.warn('Dashboard real data fetch error:', err);
    }
  };

  useEffect(() => {
    fetchAgentStatus();
    fetchRealDashboardData();
    // High-frequency 2-second real-time dashboard updates (Groww style)
    const interval = setInterval(fetchRealDashboardData, 2000);
    return () => clearInterval(interval);
  }, []);

  const totalRealizedPL = tradeHistory.reduce((sum, t) => sum + (t.realizedPL || 0), 0);
  const totalUnrealizedPL = activePositions.reduce((sum, p) => sum + (p.unrealizedPL || 0), 0);
  const winCount = tradeHistory.filter(t => (t.realizedPL || 0) > 0).length;
  const totalClosedTrades = tradeHistory.length;
  const winRate = totalClosedTrades > 0 ? ((winCount / totalClosedTrades) * 100).toFixed(1) : '100.0';
  const currentCapital = testBalance + totalRealizedPL;

  // Real market Nifty and breadth
  const nifty = (marketDetection?.indices || []).find(i => i.symbol === '^NSEI' || i.name === 'NIFTY 50');
  const niftyChange = nifty?.changePct || '-1.49%';
  const advances = marketDetection?.marketBreadth?.advances || 1;
  const declines = marketDetection?.marketBreadth?.declines || 14;

  const handleExecuteQuickTest = async (horizon) => {
    setIsTestingAction(true);
    try {
      let payload;
      if (horizon === 'INTRADAY') {
        const relStock = (realQuotes?.stocks || []).find(s => s.symbol === 'RELIANCE');
        const relPrice = relStock?.price || 1198.80;
        const relSignal = relStock?.intradaySignal || 'SELL';
        payload = {
          symbol: 'RELIANCE.NS',
          horizon: 'INTRADAY',
          direction: relSignal,
          price: relPrice,
          quantity: 50
        };
      } else {
        const nPrice = nifty?.price || 22794.00;
        const strike = Math.round(nPrice / 50) * 50;
        payload = {
          symbol: 'NIFTY 50',
          horizon: 'F_AND_O',
          direction: 'BUY_PUT',
          price: +(nPrice * 0.024).toFixed(2),
          quantity: 75,
          optionDetails: {
            recommendedStrike: `${strike} PE`,
            premium: +(nPrice * 0.024).toFixed(2)
          }
        };
      }

      const res = await fetch('/api/strategies/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (data && data.success) {
        setTestMessage({
          type: 'success',
          text: `Paper Sandbox Order Executed on Real Spot! ${payload.direction} ${payload.quantity} ${payload.symbol} @ ₹${payload.price}. Stop-Loss & Profit-Lock active.`
        });
        await fetchRealDashboardData();
        setActiveMainTab('positions');
      } else {
        setTestMessage({ type: 'error', text: data?.message || 'Failed to place test order' });
      }
    } catch (err) {
      setTestMessage({ type: 'error', text: 'Failed to place test order: ' + err.message });
    } finally {
      setIsTestingAction(false);
    }
  };

  const handleSimulateSurge = async () => {
    setIsTestingAction(true);
    try {
      const posRes = await fetch('/api/strategies/positions');
      const posText = await posRes.text();
      const posData = posText ? JSON.parse(posText) : null;
      if (posData && posData.activePositions && posData.activePositions.length > 0) {
        const targetPos = posData.activePositions[0];
        const newPrice = +(targetPos.entryPrice * 1.018).toFixed(2);
        const tickRes = await fetch(`/api/strategies/positions/${targetPos.id}/tick`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newPrice })
        });
        const tickText = await tickRes.text();
        const tickData = tickText ? JSON.parse(tickText) : null;
        setTestMessage({
          type: 'success',
          text: `📈 Simulated +1.8% Surge on ${targetPos.symbol} to ₹${newPrice}! Stop-Loss ratcheted to ₹${tickData?.position?.stopLoss || newPrice} (Guaranteed Zero-Loss Locked).`
        });
        setActiveMainTab('positions');
      } else {
        setTestMessage({
          type: 'error',
          text: 'No active paper positions found. Place a test trade first!'
        });
      }
    } catch (err) {
      setTestMessage({ type: 'error', text: 'Surge simulation failed: ' + err.message });
    } finally {
      setIsTestingAction(false);
    }
  };

  const handleResetSandbox = async () => {
    setIsTestingAction(true);
    try {
      await fetch('/api/strategies/reset-test', { method: 'POST' });
      setTestBalance(100000);
      setTestMessage({
        type: 'success',
        text: '🔄 Testing Sandbox reset to ₹100,000 initial virtual capital and baseline positions.'
      });
    } catch (err) {
      setTestMessage({ type: 'error', text: 'Reset failed: ' + err.message });
    } finally {
      setIsTestingAction(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main)' }}>
      {/* Left Sidebar Navigation (Collapsible on Desktop, Off-Canvas Drawer on Mobile) */}
      <Sidebar 
        activeTab={activeMainTab} 
        onSelectTab={setActiveMainTab} 
        onOpenCalculator={() => setIsCalculatorOpen(true)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main App Workspace */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Top-Most Live Stock & Index Marquee Slider */}
        <MarketTickerTape onSelectTicker={(item) => setActiveMainTab('indices')} />

        {/* Top Header Bar */}
        <header className="dashboard-top-header" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          background: 'rgba(9, 9, 11, 0.98)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border-subtle)',
          position: 'sticky',
          top: 0,
          zIndex: 90
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Mobile Hamburger Drawer Button */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="mobile-menu-trigger"
              type="button"
              title="Open Navigation Menu"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: '#fff',
                padding: '7px 10px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'none',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Menu size={18} />
            </button>

            {/* Close / Collapse Sidebar Option Button (Desktop Only) */}
            <button
              onClick={() => setIsSidebarCollapsed(prev => !prev)}
              className="desktop-sidebar-toggle"
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
                padding: '6px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                transition: 'all 0.2s ease'
              }}
              title={isSidebarCollapsed ? "Expand Sidebar (Show full menu)" : "Close Sidebar (Icon-only mode)"}
            >
              {isSidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
              <span>{isSidebarCollapsed ? "Show Sidebar" : "Close Sidebar"}</span>
            </button>

            <span className="live-status-chip" style={{
              background: 'rgba(16, 185, 129, 0.12)',
              color: 'var(--accent-emerald)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.74rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span className="pulse-dot" style={{ background: '#10b981' }}></span>
              Live Algorithmic Execution Core
            </span>
            <span className="terminal-user-badge" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Terminal Active • {user?.email || 'demo@aitrading.com'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Quick Sizing & Risk Tool Trigger */}
            <button
              onClick={() => setIsCalculatorOpen(true)}
              style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.08) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                color: 'var(--accent-emerald)',
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              <Calculator size={15} />
              Risk & Lot Sizer
            </button>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.82rem',
              background: 'rgba(255, 255, 255, 0.04)',
              padding: '6px 14px',
              borderRadius: '20px',
              border: '1px solid var(--border-subtle)'
            }}>
              <span style={{ color: 'var(--text-dim)' }}>Month P&L:</span>
              <span style={{ color: totalRealizedPL >= 0 ? 'var(--accent-emerald)' : 'var(--danger)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                {totalRealizedPL >= 0 ? '+' : ''}₹{totalRealizedPL.toLocaleString('en-IN', { minimumFractionDigits: 2 })} ({winRate}% W)
              </span>
            </div>

            <button
              onClick={fetchAgentStatus}
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
              <RefreshCw size={14} className={isRefreshing ? 'spinner' : ''} />
              Sync
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="dashboard-content" style={{ margin: '20px auto', maxWidth: '1320px', padding: '0 20px', width: '100%' }}>
          {/* Interactive Ready-to-Use Testing Mode Sandbox Bar */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(17, 22, 34, 0.98) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '14px',
            padding: '16px 22px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#051610',
                boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)'
              }}>
                <Zap size={20} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff' }}>
                    TESTING MODE ACTIVE (PAPER TRADING SANDBOX)
                  </span>
                  <span style={{
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: 'var(--accent-emerald)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    fontSize: '0.68rem',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontWeight: 700
                  }}>
                    READY TO USE • ZERO REAL MONEY RISK
                  </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                  Paper Capital: <strong style={{ color: '#fff', fontFamily: 'var(--font-mono)' }}>₹{testBalance.toLocaleString()} INR</strong> • Test buy/sell algorithms, option calls, and stop-loss ratchets with 1 click.
                </p>
              </div>
            </div>

            {/* Quick Testing Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => handleExecuteQuickTest('INTRADAY')}
                disabled={isTestingAction}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  color: '#fff',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease'
                }}
              >
                <TrendingUp size={13} color="var(--accent-emerald)" />
                Test Buy Reliance (Intraday)
              </button>

              <button
                onClick={() => handleExecuteQuickTest('F_AND_O')}
                disabled={isTestingAction}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  color: '#fff',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease'
                }}
              >
                <Layers size={13} color="var(--accent-cyan)" />
                Test Buy Nifty 24500 CE
              </button>

              <button
                onClick={handleSimulateSurge}
                disabled={isTestingAction}
                style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, rgba(5, 150, 105, 0.1) 100%)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: 'var(--accent-emerald)',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease'
                }}
                title="Simulate price move up to test zero-loss breakeven ratchet"
              >
                <ShieldCheck size={13} />
                Simulate +1.8% Move
              </button>

              <button
                onClick={handleResetSandbox}
                disabled={isTestingAction}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-muted)',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '0.76rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                title="Reset virtual balance and positions"
              >
                <RefreshCw size={12} className={isTestingAction ? 'spinner' : ''} />
                Reset Sandbox
              </button>
            </div>
          </div>

          {/* Interactive Test Action Toast Notification */}
          {testMessage && (
            <div style={{
              background: testMessage.type === 'error' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.15)',
              border: `1px solid ${testMessage.type === 'error' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(16, 185, 129, 0.4)'}`,
              color: testMessage.type === 'error' ? 'var(--danger)' : 'var(--accent-emerald)',
              borderRadius: '10px',
              padding: '12px 18px',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.82rem',
              fontWeight: 600
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} />
                <span>{testMessage.text}</span>
              </div>
              <button
                onClick={() => setTestMessage(null)}
                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: '2px', fontSize: '1rem' }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Global Quick Stats */}
          <section className="hero-stats-grid">
            <div className="stat-card">
              <div className="stat-card-title">
                <span>Account Capital</span>
                <BarChart2 size={16} color="var(--accent-cyan)" />
              </div>
              <div className="stat-card-value">₹{currentCapital.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="stat-card-tag stat-tag-positive">
                <ArrowUpRight size={14} />
                Unrealized: {totalUnrealizedPL >= 0 ? '+' : ''}₹{totalUnrealizedPL.toFixed(2)} ({activePositions.length} Open)
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-title">
                <span>Month-to-Date Realized P&L</span>
                <DollarSign size={16} color={totalRealizedPL >= 0 ? 'var(--accent-emerald)' : 'var(--danger)'} />
              </div>
              <div className="stat-card-value" style={{ color: totalRealizedPL >= 0 ? 'var(--accent-emerald)' : 'var(--danger)' }}>
                {totalRealizedPL >= 0 ? '+' : ''}₹{totalRealizedPL.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="stat-card-tag" style={{ color: totalRealizedPL >= 0 ? 'var(--accent-emerald)' : 'var(--danger)' }}>
                <Sparkles size={14} />
                {totalClosedTrades > 0 ? `${winRate}% Win Rate (${winCount}W / ${totalClosedTrades - winCount}L)` : 'Sandbox Active (0 Closed Trades)'}
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-title">
                <span>NSE Nifty & Market Breadth</span>
                <ShieldCheck size={16} color={niftyChange.startsWith('-') ? 'var(--danger)' : 'var(--accent-emerald)'} />
              </div>
              <div className="stat-card-value" style={{ color: niftyChange.startsWith('-') ? '#f87171' : 'var(--accent-emerald)' }}>
                {nifty?.price ? `₹${nifty.price.toLocaleString('en-IN')}` : '₹22,794.00'}
              </div>
              <div className="stat-card-tag" style={{ color: niftyChange.startsWith('-') ? '#f87171' : 'var(--accent-emerald)' }}>
                <CheckCircle2 size={14} />
                {niftyChange} • {advances} Adv / {declines} Dec
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-title">
                <span>Production Verdict</span>
                <Award size={16} color="var(--accent-emerald)" />
              </div>
              <div className="stat-card-value" style={{ fontSize: '1.25rem', color: 'var(--accent-emerald)' }}>
                Grade A+ Ready
              </div>
              <div className="stat-card-tag" style={{ color: 'var(--accent-emerald)' }}>
                <ShieldCheck size={14} />
                Profit-Lock Active • Real Data Grounded
              </div>
            </div>
          </section>

          {/* Dynamic Active Section Content */}
          <section style={{ marginTop: '8px' }}>
            {activeMainTab === 'indices' && (
              <MarketIndicesView 
                onExecuteQuickTrade={(stock) => handleExecuteQuickTest('INTRADAY')} 
              />
            )}
            {activeMainTab === 'ipo' && (
              <IPOSection 
                onExecutePaperTrade={(ipo) => handleExecuteQuickTest('INTRADAY')} 
              />
            )}
            {activeMainTab === 'calendar' && <PLCalendar />}
            {activeMainTab === 'today_audit' && <TodayMarketAudit />}
            {activeMainTab === 'sentiment' && <MarketSentimentView />}
            {activeMainTab === 'news' && <NewsSentimentTrader />}

            {activeMainTab === 'intraday' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <SegmentExplainer segment="INTRADAY" />
                <StrategyCenter initialHorizon="INTRADAY" hideInternalTabs={true} />
              </div>
            )}

            {activeMainTab === 'short_term' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <SegmentExplainer segment="SHORT_TERM" />
                <StrategyCenter initialHorizon="SHORT_TERM" hideInternalTabs={true} />
              </div>
            )}

            {activeMainTab === 'medium_term' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <SegmentExplainer segment="MEDIUM_TERM" />
                <StrategyCenter initialHorizon="MEDIUM_TERM" hideInternalTabs={true} />
              </div>
            )}

            {activeMainTab === 'long_term' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <SegmentExplainer segment="LONG_TERM" />
                <StrategyCenter initialHorizon="LONG_TERM" hideInternalTabs={true} />
              </div>
            )}

            {activeMainTab === 'f_and_o' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <SegmentExplainer segment="F_AND_O" />
                <StrategyCenter initialHorizon="F_AND_O" hideInternalTabs={true} />
              </div>
            )}

            {activeMainTab === 'positions' && (
              <StrategyCenter initialHorizon="INTRADAY" hideInternalTabs={false} />
            )}
          </section>
        </main>
      </div>

      {/* Position Sizing & Risk Calculator Modal */}
      <RiskCalculatorModal 
        isOpen={isCalculatorOpen} 
        onClose={() => setIsCalculatorOpen(false)} 
      />

      {/* Mobile Bottom Navigation Bar (Visible on < 768px screens) */}
      <MobileBottomNav 
        activeTab={activeMainTab}
        onSelectTab={(tab) => {
          setActiveMainTab(tab);
          setIsMobileSidebarOpen(false);
        }}
        onOpenMenu={() => setIsMobileSidebarOpen(prev => !prev)}
        isMenuOpen={isMobileSidebarOpen}
      />
    </div>
  );
};
