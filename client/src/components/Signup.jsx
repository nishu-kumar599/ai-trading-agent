import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  TrendingUp, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle,
  Check,
  X
} from 'lucide-react';

export const Signup = ({ onSwitchToLogin }) => {
  const { register, authError, clearError } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  // Password strength calculation
  const calculateStrength = (pwd) => {
    let score = 0;
    if (!pwd) return { score: 0, text: '', class: '' };

    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 1) return { score: 1, text: 'Weak', class: 'weak' };
    if (score <= 3) return { score: 2, text: 'Medium', class: 'medium' };
    return { score: 3, text: 'Strong', class: 'strong' };
  };

  const strength = calculateStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setLocalError('');

    if (!name.trim()) {
      setLocalError('Please enter your full name.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setLocalError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match. Please verify.');
      return;
    }

    if (!agreeTerms) {
      setLocalError('Please accept the Terms of Service & Risk Disclosure to proceed.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register(name.trim(), email.trim(), password);
    } catch (err) {
      setLocalError(err.message || 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
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
              <h2>Deploy Your Personal AI Trading Fleet</h2>
              <p>
                Get instant access to automated strategy pipelines, backtested portfolio models, and intraday algorithmic trading bots.
              </p>
            </div>

            <div className="feature-list">
              <div className="feature-item">
                <div className="feature-icon">
                  <CheckCircle2 size={18} />
                </div>
                <div className="feature-text">
                  <h4>$100,000 Paper Trading Account</h4>
                  <p>Practice live market strategies with virtual zero-risk capital.</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon">
                  <ShieldCheck size={18} />
                </div>
                <div className="feature-text">
                  <h4>Institutional-Grade Risk Rules</h4>
                  <p>Built-in drawdown stops, daily circuit limits, and trailing stops.</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon">
                  <TrendingUp size={18} />
                </div>
                <div className="feature-text">
                  <h4>Multi-Timeframe Technical Analytics</h4>
                  <p>MACD momentum, EMA crosses, and volume breakout detection.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="market-pulse-box">
            <div className="pulse-indicator">
              <span className="pulse-dot"></span>
              Fast-Track Account Setup
            </div>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Instant Activation
            </span>
          </div>
        </div>

        {/* Right Side: Registration Form */}
        <div className="auth-form-panel">
          <div className="form-header">
            <h3>Create your account</h3>
            <p>Start trading with AI-assisted algorithmic intelligence</p>
          </div>

          {activeError && (
            <div className="alert-box alert-error">
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{activeError}</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="name">Full Name</label>
              <div className="input-container">
                <span className="input-icon">
                  <User size={18} />
                </span>
                <input
                  id="name"
                  type="text"
                  className="input-field"
                  placeholder="Tarun Pal"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="email">Email Address</label>
              <div className="input-container">
                <span className="input-icon">
                  <Mail size={18} />
                </span>
                <input
                  id="email"
                  type="email"
                  className="input-field"
                  placeholder="trader@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Create Password</label>
              <div className="input-container">
                <span className="input-icon">
                  <Lock size={18} />
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="input-field input-password"
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
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

              {password && (
                <div className="strength-meter">
                  <div className="strength-bars">
                    <div className={`strength-bar ${strength.score >= 1 ? strength.class : ''}`}></div>
                    <div className={`strength-bar ${strength.score >= 2 ? strength.class : ''}`}></div>
                    <div className={`strength-bar ${strength.score >= 3 ? strength.class : ''}`}></div>
                  </div>
                  <div className="strength-feedback">
                    <span>Password Strength:</span>
                    <span className={`strength-label ${strength.class}`}>{strength.text}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
              <div className="input-container">
                <span className="input-icon">
                  <Lock size={18} />
                </span>
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  className="input-field"
                  placeholder="Re-type your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                {confirmPassword && (
                  <span style={{ position: 'absolute', right: '14px', display: 'flex', alignItems: 'center' }}>
                    {password === confirmPassword ? (
                      <Check size={18} color="#10b981" />
                    ) : (
                      <X size={18} color="#f43f5e" />
                    )}
                  </span>
                )}
              </div>
            </div>

            <div className="form-options">
              <label className="remember-label" style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>
                <input
                  type="checkbox"
                  className="custom-checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                />
                I agree to the Algo Trading Platform Terms of Service & Risk Policy
              </label>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner"></span>
                  Setting Up Portfolio...
                </>
              ) : (
                <>
                  Create Account & Start Trading
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="auth-switch-text">
            Already registered?
            <button
              type="button"
              onClick={() => {
                clearError();
                onSwitchToLogin();
              }}
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
