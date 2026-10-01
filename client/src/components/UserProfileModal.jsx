import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  User, 
  Mail, 
  Lock, 
  ShieldCheck, 
  Database, 
  Clock, 
  KeyRound, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  X,
  Wallet,
  LogOut,
  Save
} from 'lucide-react';

export const UserProfileModal = ({ isOpen, onClose }) => {
  const { user, changePassword, updateProfile, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'security'

  // Profile form state
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileNotice, setProfileNotice] = useState('');

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [securityNotice, setSecurityNotice] = useState('');
  const [securityError, setSecurityError] = useState('');

  if (!isOpen) return null;

  // Handle Profile Update
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileNotice('');
    if (!name.trim()) return;

    setIsUpdatingProfile(true);
    try {
      await updateProfile({ name: name.trim(), phone: phone.trim() });
      setProfileNotice('Profile information updated successfully!');
      setTimeout(() => setProfileNotice(''), 4000);
    } catch (err) {
      setProfileNotice('Failed to update profile: ' + err.message);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setSecurityError('');
    setSecurityNotice('');

    if (!currentPassword) {
      setSecurityError('Please enter your current password.');
      return;
    }

    if (newPassword.length < 6) {
      setSecurityError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setSecurityError('New passwords do not match. Please verify.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await changePassword(currentPassword, newPassword);
      setSecurityNotice(res.message || 'Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setTimeout(() => setSecurityNotice(''), 5000);
    } catch (err) {
      setSecurityError(err.message || 'Failed to change password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '16px'
    }}>
      <div className="glass-card" style={{
        maxWidth: '560px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '28px',
        borderRadius: '20px',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
      }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#051610',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.1rem'
            }}>
              {(user?.name || 'TR').substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                {user?.name || 'Trader Terminal'}
              </h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {user?.email || 'demo@aitrading.com'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              color: '#94a3b8',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          gap: '8px',
          background: 'rgba(255, 255, 255, 0.04)',
          padding: '4px',
          borderRadius: '10px',
          marginBottom: '20px'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            style={{
              flex: 1,
              padding: '8px 14px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'profile' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
              color: activeTab === 'profile' ? 'var(--accent-emerald)' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <User size={15} />
            Account Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            style={{
              flex: 1,
              padding: '8px 14px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'security' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
              color: activeTab === 'security' ? 'var(--accent-emerald)' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <KeyRound size={15} />
            Security & Password
          </button>
        </div>

        {/* TAB 1: Profile & Terminal Settings */}
        {activeTab === 'profile' && (
          <div>
            {/* Account Quick Stats Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '10px',
              marginBottom: '20px'
            }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '12px 14px'
              }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Virtual Capital</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                  ₹{(user?.virtualBalance || 100000).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '12px 14px'
              }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Role / Tier</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', textTransform: 'capitalize', marginTop: '2px' }}>
                  {user?.role || 'Trader'}
                </div>
              </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '12px 14px'
              }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>DB Sync</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Database size={13} />
                  Dual Mongo / Disk
                </div>
              </div>
            </div>

            {profileNotice && (
              <div className="alert-box alert-success" style={{ marginBottom: '14px' }}>
                <CheckCircle2 size={16} />
                <div>{profileNotice}</div>
              </div>
            )}

            <form onSubmit={handleSaveProfile}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div className="input-container">
                  <span className="input-icon"><User size={18} /></span>
                  <input
                    type="text"
                    className="input-field"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Registered Work Email</label>
                <div className="input-container">
                  <span className="input-icon"><Mail size={18} /></span>
                  <input
                    type="email"
                    className="input-field"
                    value={user?.email || ''}
                    disabled
                    style={{ opacity: 0.7, cursor: 'not-allowed' }}
                  />
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--accent-emerald)', marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={12} /> Email Verified & Grounded
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Terminal Account ID</label>
                <div style={{
                  padding: '10px 14px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)'
                }}>
                  {user?.id || 'usr_demo_trader_001'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isUpdatingProfile}
                  style={{ flex: 1 }}
                >
                  <Save size={16} />
                  {isUpdatingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: Security & Password */}
        {activeTab === 'security' && (
          <div>
            <div style={{
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#38bdf8',
              fontSize: '0.82rem'
            }}>
              <ShieldCheck size={20} style={{ flexShrink: 0 }} />
              <div>
                <strong>Master Password Protection:</strong> Changing your password will update your credentials across MongoDB and local encrypted storage.
              </div>
            </div>

            {securityError && (
              <div className="alert-box alert-error" style={{ marginBottom: '14px' }}>
                <AlertCircle size={16} />
                <div>{securityError}</div>
              </div>
            )}

            {securityNotice && (
              <div className="alert-box alert-success" style={{ marginBottom: '14px' }}>
                <CheckCircle2 size={16} />
                <div>{securityNotice}</div>
              </div>
            )}

            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label className="form-label">Current Master Password</label>
                <div className="input-container">
                  <span className="input-icon"><Lock size={18} /></span>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    className="input-field input-password"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="toggle-password-btn"
                    onClick={() => setShowPasswords(!showPasswords)}
                  >
                    {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">New Master Password</label>
                <div className="input-container">
                  <span className="input-icon"><Lock size={18} /></span>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    className="input-field input-password"
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <div className="input-container">
                  <span className="input-icon"><Lock size={18} /></span>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    className="input-field"
                    placeholder="Re-enter new password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={isChangingPassword}
                style={{ width: '100%', marginTop: '16px' }}
              >
                {isChangingPassword ? (
                  <>
                    <span className="spinner"></span>
                    Updating Password...
                  </>
                ) : (
                  <>
                    <KeyRound size={16} />
                    Confirm & Update Password
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Modal Footer: Logout Option */}
        <div style={{
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            Close Window
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              logout();
            }}
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--danger)',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <LogOut size={14} />
            Sign Out of Terminal
          </button>
        </div>
      </div>
    </div>
  );
};
