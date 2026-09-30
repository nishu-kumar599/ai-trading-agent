import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './components/Login';
import { Signup } from './components/Signup';
import { Dashboard } from './components/Dashboard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TrendingUp } from 'lucide-react';

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  const [authView, setAuthView] = useState('login'); // 'login' | 'signup'

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: '16px'
      }}>
        <div className="brand-icon-wrapper" style={{ width: '48px', height: '48px' }}>
          <TrendingUp size={28} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="spinner" style={{ borderTopColor: '#10b981' }}></span>
          <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Initializing AI Trading Agent...</span>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Dashboard />;
  }

  return (
    <div className="app-container">
      {authView === 'login' ? (
        <Login onSwitchToSignup={() => setAuthView('signup')} />
      ) : (
        <Signup onSwitchToLogin={() => setAuthView('login')} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <div className="grid-overlay"></div>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </AuthProvider>
  );
}
