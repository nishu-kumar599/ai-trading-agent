import React from 'react';
import { 
  TrendingUp, 
  Gauge, 
  Newspaper, 
  Zap, 
  Compass, 
  Calendar, 
  Layers, 
  ShieldCheck, 
  Award, 
  LogOut, 
  ChevronLeft, 
  ChevronRight, 
  Calculator, 
  BarChart3,
  Rocket,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar = ({ 
  activeTab, 
  onSelectTab, 
  onOpenCalculator,
  onOpenProfile,
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile
}) => {
  const { user, logout } = useAuth();

  const getInitials = (name) => {
    if (!name) return 'TR';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const navGroups = [
    {
      groupTitle: 'MARKET PULSE',
      items: [
        { id: 'indices', label: 'Live Indices & Stocks', icon: BarChart3, badge: 'Nifty/Sensex' },
        { id: 'ipo', label: 'IPO Intelligence', icon: Rocket, badge: 'GMP / AI Score' },
        { id: 'sentiment', label: 'Market Sentiment', icon: Gauge, badge: 'Fear/Greed' },
        { id: 'news', label: 'News Catalyst Trader', icon: Newspaper, badge: 'NLP Scoring' }
      ]
    },
    {
      groupTitle: 'TRADING SEGMENTS',
      items: [
        { id: 'intraday', label: 'Intraday Terminal', icon: Zap, badge: '1m-15m Scalp' },
        { id: 'short_term', label: 'Short-Term Swing', icon: TrendingUp, badge: '1-5d Breakout' },
        { id: 'medium_term', label: 'Medium-Term Positional', icon: Compass, badge: '2-12w Trend' },
        { id: 'long_term', label: 'Long-Term Wealth', icon: Calendar, badge: 'Value DCA' },
        { id: 'f_and_o', label: 'Futures & Options', icon: Layers, badge: 'Calls & Puts' }
      ]
    },
    {
      groupTitle: 'EXECUTION & AUDIT',
      items: [
        { id: 'calendar', label: 'P&L Calendar', icon: Calendar, badge: '+₹2.22L Mo' },
        { id: 'positions', label: 'Active Positions', icon: ShieldCheck, badge: 'Profit-Lock' },
        { id: 'today_audit', label: "Today's Live Audit", icon: Award, badge: 'Production A+' }
      ]
    }
  ];

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={onCloseMobile}
        />
      )}

      <aside className={`app-sidebar ${isMobileOpen ? 'mobile-open' : ''} ${isCollapsed ? 'collapsed' : ''}`} style={{
        width: isCollapsed ? '72px' : '280px',
        minWidth: isCollapsed ? '72px' : '280px',
        height: '100vh',
        position: 'sticky',
        top: 0,
        background: 'rgba(9, 9, 11, 0.98)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        zIndex: 200,
        padding: isCollapsed ? '20px 8px' : '20px 16px',
        transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.25s cubic-bezier(0.4, 0, 0.2, 1), padding 0.25s ease',
        overflowX: 'hidden',
        overflowY: 'auto'
      }}>
        <div>
          {/* Brand Header & Collapse Toggle */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: isCollapsed ? 'center' : 'space-between', 
            marginBottom: '24px', 
            padding: isCollapsed ? '0' : '0 4px',
            gap: '8px'
          }}>
            {!isCollapsed && (
              <div className="brand-badge">
                <div className="brand-icon-wrapper" style={{ width: '36px', height: '36px' }}>
                  <TrendingUp size={20} />
                </div>
                <div className="brand-title" style={{ fontSize: '1.15rem' }}>
                  AlphaTrade <span>AI</span>
                </div>
              </div>
            )}

            {isCollapsed && (
              <div 
                className="brand-icon-wrapper" 
                style={{ width: '38px', height: '38px', cursor: 'pointer', marginBottom: '8px' }}
                onClick={onToggleCollapse}
                title="Expand Sidebar"
              >
                <TrendingUp size={20} />
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {/* Close Button on Mobile Drawer */}
              {onCloseMobile && (
                <button
                  onClick={onCloseMobile}
                  className="mobile-close-btn"
                  type="button"
                  title="Close Navigation"
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid var(--border-subtle)',
                    color: '#fff',
                    borderRadius: '8px',
                    padding: '6px',
                    cursor: 'pointer',
                    display: 'none',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <X size={18} />
                </button>
              )}

              {/* Close / Collapse Sidebar Button for Desktop */}
              <button
                onClick={onToggleCollapse}
                className="desktop-collapse-btn"
                type="button"
                title={isCollapsed ? 'Expand Sidebar' : 'Close Sidebar'}
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-muted)',
                  borderRadius: '8px',
                  padding: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#fff';
                  e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.4)';
                  e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-muted)';
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                }}
              >
                {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              </button>
            </div>
          </div>

        {/* Navigation Groups */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: isCollapsed ? '12px' : '20px' }}>
          {navGroups.map((group, gIdx) => (
            <div key={gIdx}>
              {!isCollapsed && (
                <div style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: 'var(--text-dim)',
                  letterSpacing: '0.8px',
                  padding: '0 10px',
                  marginBottom: '8px',
                  textTransform: 'uppercase'
                }}>
                  {group.groupTitle}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectTab(item.id);
                        if (onCloseMobile) onCloseMobile();
                      }}
                      title={`${item.label} • ${item.badge}`}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: isCollapsed ? 'center' : 'space-between',
                        padding: isCollapsed ? '10px 0' : '10px 12px',
                        borderRadius: '10px',
                        border: '1px solid',
                        borderColor: isActive ? 'rgba(16, 185, 129, 0.4)' : 'transparent',
                        background: isActive ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                        color: isActive ? '#fff' : 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: '0.84rem',
                        fontWeight: isActive ? 600 : 500,
                        transition: 'all 0.2s ease',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Icon size={18} color={isActive ? 'var(--accent-emerald)' : '#94a3b8'} />
                        {!isCollapsed && <span>{item.label}</span>}
                      </div>
                      {!isCollapsed && (
                        <span style={{
                          fontSize: '0.68rem',
                          padding: '2px 6px',
                          borderRadius: '6px',
                          background: isActive ? 'rgba(16, 185, 129, 0.22)' : 'rgba(255, 255, 255, 0.04)',
                          color: isActive ? 'var(--accent-emerald)' : 'var(--text-dim)',
                          fontWeight: 600
                        }}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom User Profile & Status */}
      <div style={{ 
        paddingTop: '16px', 
        borderTop: '1px solid var(--border-subtle)', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '12px' 
      }}>
        {/* Bot Quick Pulse Chip */}
        {!isCollapsed ? (
          <div style={{
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            padding: '8px 12px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.75rem'
          }}>
            <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>● Models Active</span>
            <span style={{ color: '#fff', fontFamily: 'var(--font-mono)' }}>+16.72% Today</span>
          </div>
        ) : (
          <div 
            title="Models Active • +16.72% Today"
            style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              padding: '6px 0',
              color: 'var(--accent-emerald)' 
            }}
          >
            <span className="pulse-dot" style={{ background: '#10b981' }}></span>
          </div>
        )}

        {/* Risk & Sizing Calculator Trigger */}
        <button
          onClick={() => {
            onOpenCalculator();
            if (onCloseMobile) onCloseMobile();
          }}
          type="button"
          title="Risk & Lot Calculator"
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.08) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            color: 'var(--accent-emerald)',
            padding: isCollapsed ? '10px 0' : '8px 12px',
            borderRadius: '8px',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
        >
          <Calculator size={16} />
          {!isCollapsed && <span>Risk & Lot Sizer</span>}
        </button>

        {/* User Badge & Logout */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: isCollapsed ? 'center' : 'space-between',
          flexDirection: isCollapsed ? 'column' : 'row',
          gap: isCollapsed ? '8px' : '0'
        }}>
          <div 
            onClick={() => {
              if (onOpenProfile) onOpenProfile();
              if (onCloseMobile) onCloseMobile();
            }}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              cursor: 'pointer',
              padding: '4px 6px',
              borderRadius: '8px',
              transition: 'background 0.2s ease'
            }} 
            title="Click to view Account Profile & Security Settings"
          >
            <div className="user-avatar" style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#051610' }}>
              {getInitials(user?.name)}
            </div>
            {!isCollapsed && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#fff' }}>
                  {user?.name || 'Trader'}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                  {user?.email || 'demo@aitrading.com'}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              logout();
              if (onCloseMobile) onCloseMobile();
            }}
            title="Log Out"
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: 'var(--danger)',
              padding: '6px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
    </>
  );
};
