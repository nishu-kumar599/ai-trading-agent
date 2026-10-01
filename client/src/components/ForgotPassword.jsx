import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Lock, 
  Mail, 
  KeyRound, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ArrowLeft, 
  TrendingUp, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  Clock
} from 'lucide-react';

export const ForgotPassword = ({ onSwitchToLogin }) => {
  const { forgotPassword, resetPassword, authError, clearError } = useAuth();
  const [step, setStep] = useState(1); // 1 = Enter Email, 2 = Enter Code & New Password
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [serverResetCode, setServerResetCode] = useState('');

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

  const strength = calculateStrength(newPassword);

  // Step 1: Request Code
  const handleRequestCode = async (e) => {
    e.preventDefault();
    clearError();
    setLocalError('');
    setSuccessNotice('');

    if (!email.trim() || !email.includes('@')) {
      setLocalError('Please enter a valid registered email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await forgotPassword(email.trim());
      setSuccessNotice(data.message || 'Verification code generated!');
      if (data.resetCode) {
        setServerResetCode(data.resetCode);
        setCode(data.resetCode); // Pre-fill for seamless user experience
      }
      setStep(2);
    } catch (err) {
      setLocalError(err.message || 'Failed to request reset code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Submit Reset
  const handleResetPassword = async (e) => {
    e.preventDefault();
    clearError();
    setLocalError('');
    setSuccessNotice('');

    if (!code.trim()) {
      setLocalError('Please enter the 6-digit verification code.');
      return;
    }

    if (newPassword.length < 6) {
      setLocalError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setLocalError('Passwords do not match. Please verify both fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await resetPassword(email.trim(), code.trim(), newPassword);
      setSuccessNotice('Password reset successfully! Logging you in...');
      // AuthContext sets user and token upon successful reset
    } catch (err) {
      setLocalError(err.message || 'Password reset failed.');
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
              <h2>Secure Account Recovery & Terminal Shield</h2>
              <p>
                Reset your master terminal password with 256-bit cryptographic verification tokens.
              </p>
            </div>

            <div className="feature-list">
              <div className="feature-item">
                <div className="feature-icon">
                  <KeyRound size={18} />
                </div>
                <div className="feature-text">
                  <h4>Cryptographic Verification</h4>
                  <p>Time-bound 15-minute one-time verification tokens.</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon">
                  <ShieldCheck size={18} />
                </div>
                <div className="feature-text">
                  <h4>Bcrypt Hash Security</h4>
                  <p>All passwords are encrypted with salted 10-round bcrypt hashing.</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon">
                  <Clock size={18} />
                </div>
                <div className="feature-text">
                  <h4>Instant Session Recovery</h4>
                  <p>Immediate automatic login once your password is verified and reset.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="market-pulse-box">
            <div className="pulse-indicator">
              <span className="pulse-dot"></span>
              Security Sentinel Active
            </div>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
              SHA-256 / Bcrypt
            </span>
          </div>
        </div>

        {/* Right Side: Password Reset Form */}
        <div className="auth-form-panel">
          <div className="form-header">
            <h3>{step === 1 ? 'Reset Your Password' : 'Set New Master Password'}</h3>
            <p>
              {step === 1 
                ? 'Enter your registered email address to receive a secure recovery code' 
                : `Enter the verification code and choose a new password for ${email}`}
            </p>
          </div>

          {activeError && (
            <div className="alert-box alert-error">
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{activeError}</div>
            </div>
          )}

          {successNotice && (
            <div className="alert-box alert-success">
              <Sparkles size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{successNotice}</div>
            </div>
          )}

          {step === 1 ? (
            /* STEP 1: Enter Email */
            <form onSubmit={handleRequestCode}>
              <div className="form-group">
                <label className="form-label" htmlFor="reset-email">Registered Email Address</label>
                <div className="input-container">
                  <span className="input-icon">
                    <Mail size={18} />
                  </span>
                  <input
                    id="reset-email"
                    type="email"
                    className="input-field"
                    placeholder="trader@quantfund.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={isSubmitting}
                style={{ marginTop: '14px' }}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner"></span>
                    Generating Recovery Code...
                  </>
                ) : (
                  <>
                    Send Verification Code
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              <button
                type="button"
                className="btn-demo"
                onClick={() => {
                  setEmail('demo@aitrading.com');
                  setTimeout(() => {
                    const btn = document.querySelector('button[type="submit"]');
                    if (btn) btn.click();
                  }, 100);
                }}
                disabled={isSubmitting}
              >
                <Sparkles size={16} />
                Test Reset with Demo Account (demo@aitrading.com)
              </button>
            </form>
          ) : (
            /* STEP 2: Enter Verification Code & New Password */
            <form onSubmit={handleResetPassword}>
              {serverResetCode && (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px'
                }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                      Generated Reset OTP
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-emerald)', letterSpacing: '2px' }}>
                      {serverResetCode}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCode(serverResetCode)}
                    style={{
                      background: 'rgba(16, 185, 129, 0.2)',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      color: 'var(--accent-emerald)',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Auto-Fill Code
                  </button>
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="reset-code">6-Digit Verification Code</label>
                <div className="input-container">
                  <span className="input-icon">
                    <KeyRound size={18} />
                  </span>
                  <input
                    id="reset-code"
                    type="text"
                    className="input-field"
                    placeholder="Enter 6-digit code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    maxLength={6}
                    required
                    autoFocus
                    style={{ letterSpacing: '2px', fontFamily: 'var(--font-mono)' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="new-password">New Master Password</label>
                <div className="input-container">
                  <span className="input-icon">
                    <Lock size={18} />
                  </span>
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    className="input-field input-password"
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
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

                {newPassword && (
                  <div className="password-strength-container" style={{ marginTop: '8px' }}>
                    <div className="strength-bars">
                      <div className={`strength-bar ${strength.score >= 1 ? strength.class : ''}`}></div>
                      <div className={`strength-bar ${strength.score >= 2 ? strength.class : ''}`}></div>
                      <div className={`strength-bar ${strength.score >= 3 ? strength.class : ''}`}></div>
                    </div>
                    <span className={`strength-label ${strength.class}`}>
                      Password Strength: {strength.text}
                    </span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="confirm-password">Confirm New Password</label>
                <div className="input-container">
                  <span className="input-icon">
                    <Lock size={18} />
                  </span>
                  <input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    className="input-field"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={isSubmitting}
                style={{ marginTop: '14px' }}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner"></span>
                    Resetting Password & Signing In...
                  </>
                ) : (
                  <>
                    Reset Password & Enter Terminal
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setServerResetCode('');
                  setCode('');
                  setLocalError('');
                }}
                className="btn-demo"
              >
                <ArrowLeft size={16} />
                Change Email / Request New Code
              </button>
            </form>
          )}

          <div className="auth-switch-text" style={{ marginTop: '20px' }}>
            Remembered your password?
            <button
              type="button"
              onClick={() => {
                clearError();
                onSwitchToLogin();
              }}
            >
              Sign In Instead
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
