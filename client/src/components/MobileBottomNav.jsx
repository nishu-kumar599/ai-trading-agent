import React from 'react';
import { 
  BarChart3, 
  Zap, 
  Calendar, 
  Award, 
  Menu 
} from 'lucide-react';

export const MobileBottomNav = ({ activeTab, onSelectTab, onOpenMenu, isMenuOpen }) => {
  const tabs = [
    { id: 'indices', label: 'Markets', icon: BarChart3 },
    { id: 'intraday', label: 'Auto-Pilot', icon: Zap },
    { id: 'calendar', label: 'P&L', icon: Calendar },
    { id: 'today_audit', label: 'Audit', icon: Award }
  ];

  return (
    <nav className="mobile-bottom-nav">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              color: isActive ? 'var(--accent-emerald)' : 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px 12px',
              borderRadius: '8px',
              minWidth: '58px',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}>
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              {isActive && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  width: '5px',
                  height: '5px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-emerald)',
                  boxShadow: '0 0 6px var(--accent-emerald)'
                }} />
              )}
            </div>
            <span style={{
              fontSize: '0.68rem',
              fontWeight: isActive ? 700 : 500,
              letterSpacing: '-0.2px'
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}

      {/* Menu / Drawer Toggle */}
      <button
        onClick={onOpenMenu}
        style={{
          background: isMenuOpen ? 'rgba(16, 185, 129, 0.12)' : 'none',
          border: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          color: isMenuOpen ? 'var(--accent-emerald)' : 'var(--text-muted)',
          cursor: 'pointer',
          padding: '6px 12px',
          borderRadius: '8px',
          minWidth: '58px',
          transition: 'all 0.15s ease'
        }}
      >
        <Menu size={20} strokeWidth={isMenuOpen ? 2.5 : 1.8} />
        <span style={{
          fontSize: '0.68rem',
          fontWeight: isMenuOpen ? 700 : 500,
          letterSpacing: '-0.2px'
        }}>
          More
        </span>
      </button>
    </nav>
  );
};
