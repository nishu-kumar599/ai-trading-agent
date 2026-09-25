import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  TrendingUp, 
  ShieldCheck, 
  Cpu, 
  BarChart2, 
  AlertCircle,
  Sparkles
} from 'lucide-react';

export const Login = ({ onSwitchToSignup }) => {
  const { login, authError, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setLocalError('');
    setForgotMsg('');

    if (!email.trim() || !password) {
      setLocalError('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      // Error is stored in auth context or err.message
      setLocalError(err.message || 'Login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    clearError();
    setLocalError('');
    setForgotMsg('');
    setEmail('demo@aitrading.com');
    setPassword('demo1234');
    setIsSubmitting(true);

    try {
      await login('demo@aitrading.com', 'demo1234');
    } catch (err) {
      setLocalError(err.message || 'Demo login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = () => {
    setForgotMsg('Password reset instructions have been simulated for ' + (email || 'your email') + '. For demo purposes, you can use demo@aitrading.com / demo1234');
  };

  const activeError = localError || authError;

  return (
    <div className="auth-wrapper">
      <div className="auth-container glass-card">
        {/* Left Side: Product Showcase */}
        <div className="auth-showcase">
          <div>
            <div className="brand-badge">
              <div className="brand-icon-wrapper">
                <TrendingUp size={24} />
              </div>
              <div className="brand-title">
                AlphaTrade <span>AI</span>
              </div>
            </div>

            <div className="showcase-header">
              <h2>Autonomous Algorithmic Trading Intelligence</h2>
              <p>
                Connect your quantitative models, scan markets with dual EMA/MACD strategies, and manage risk with sub-second execution.
              </p>
            </div>

            <div className="feature-list">
              <div className="feature-item">
                <div className="feature-icon">
                  <Cpu size={18} />
                </div>
                <div className="feature-text">
                  <h4>AI Market Sentinel</h4>
                  <p>Continuous scanning across NSE symbols & live market feeds.</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon">
                  <BarChart2 size={18} />
                </div>
                <div className="feature-text">
                  <h4>Paper Trading & Backtesting</h4>
                  <p>Risk-free trade simulation with historical equity curves.</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon">
                  <ShieldCheck size={18} />
                </div>
                <div className="feature-text">
                  <h4>Automated Risk Guards</h4>
                  <p>Pre-trade risk filtering, stop-loss & position sizing engine.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="market-pulse-box">
            <div className="pulse-indicator">
              <span className="pulse-dot"></span>
              Live Trading Core Online
            </div>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
              NIFTY / NSE
            </span>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="auth-form-panel">
          <div className="form-header">
            <h3>Welcome back</h3>
            <p>Enter your credentials to access your trading cockpit</p>
          </div>

          {activeError && (
            <div className="alert-box alert-error">
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{activeError}</div>
            </div>
          )}

          {forgotMsg && (
            <div className="alert-box alert-success">
              <Sparkles size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{forgotMsg}</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Work Email</label>
              <div className="input-container">
                <span className="input-icon">
                  <Mail size={18} />
                </span>
                <input
                  id="email"
                  type="email"
                  className="input-field"
                  placeholder="trader@quantfund.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <div className="input-container">
                <span className="input-icon">
                  <Lock size={18} />
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="input-field input-password"
                  placeholder="Enter your master password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="toggle-password-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-options">
              <label className="remember-label">
                <input
                  type="checkbox"
                  className="custom-checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Remember this terminal
              </label>

              <button
                type="button"
                className="link-btn"
                onClick={handleForgotPassword}
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner"></span>
                  Authenticating Agent...
                </>
              ) : (
                <>
                  Sign In to Terminal
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            <button
              type="button"
              className="btn-demo"
              onClick={handleDemoLogin}
              disabled={isSubmitting}
            >
              <Sparkles size={16} />
              1-Click Demo Login (Instant Access)
            </button>
          </form>

          <div className="auth-switch-text">
            Don't have an account yet?
            <button
              type="button"
              onClick={() => {
                clearError();
                onSwitchToSignup();
              }}
            >
              Create Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
