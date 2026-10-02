import React from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft, ShieldCheck } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error in section:', error, errorInfo);
  }

  componentDidUpdate(prevProps) {
    // If the active section/tab changes, automatically reset the error boundary
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(15, 23, 42, 0.95) 100%)',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          borderRadius: '16px',
          padding: '32px 24px',
          margin: '20px 0',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f87171'
          }}>
            <AlertTriangle size={28} />
          </div>

          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: '0 0 6px 0' }}>
              Section Temporarily Unavailable
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: '540px', margin: '0 auto', lineHeight: '1.5' }}>
              This section encountered an unexpected render issue while fetching live market feeds. Your active trades, capital, and risk guards remain 100% safe and unaffected.
            </p>
            {this.state.error && (
              <div style={{
                marginTop: '10px',
                padding: '6px 12px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontSize: '0.74rem',
                color: '#f87171',
                maxWidth: '520px',
                margin: '10px auto 0 auto',
                wordBreak: 'break-word'
              }}>
                {this.state.error.message || String(this.state.error)}
              </div>
            )}
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '0.76rem',
            color: 'var(--accent-emerald)',
            fontWeight: 700
          }}>
            <ShieldCheck size={14} />
            Auto-Pilot Sentinel & Capital Reserves Protected
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={this.handleRetry}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 18px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.84rem',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={14} />
              Retry Loading Section
            </button>

            {this.props.fallbackAction && (
              <button
                onClick={this.props.fallbackAction}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  color: '#cbd5e1',
                  fontWeight: 600,
                  fontSize: '0.84rem',
                  cursor: 'pointer'
                }}
              >
                <ArrowLeft size={14} />
                Return to P&L Calendar
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
