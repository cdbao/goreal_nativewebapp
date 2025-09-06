import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import * as Sentry from "@sentry/react";
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import LandingPage from './components/LandingPage';
import AuthPage from './components/AuthPage';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/AdminPanel';
import GuildSelection from './components/GuildSelection';
import { 
  ProtectedRoute, 
  GuildSelectionRoute, 
  AuthRoute, 
  LandingRoute, 
  AdminRoute 
} from './components/RouteGuards';
import './App.css';
import './styles/guild-themes.css';

const AppContent: React.FC = () => {
  return (
    <Routes>
      {/* Landing page - smart redirect for authenticated users */}
      <Route path="/" element={<LandingRoute><LandingPage /></LandingRoute>} />
      
      {/* Auth routes - smart redirect for authenticated users */}
      <Route path="/login" element={<AuthRoute><AuthPage /></AuthRoute>} />
      <Route path="/register" element={<AuthRoute><AuthPage /></AuthRoute>} />
      
      {/* Guild selection route - requires auth but no guild */}
      <Route path="/select-guild" element={<GuildSelectionRoute><GuildSelection /></GuildSelectionRoute>} />
      
      {/* Protected routes - require both auth and guild selection */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      
      {/* Admin routes - require auth, guild selection, and admin role */}
      <Route 
        path="/admin" 
        element={
          <AdminRoute>
            <AdminPanel />
          </AdminRoute>
        } 
      />
      
      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

// Component Error Fallback cho Sentry
const SentryErrorFallback = ({ error, resetError }: { error: any; resetError: () => void }) => (
  <div style={{ 
    padding: '40px', 
    textAlign: 'center', 
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    color: 'white',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  }}>
    <h1 style={{ color: '#ffd700', marginBottom: '20px' }}>🛡️ Lò Rèn Titan Gặp Sự Cố</h1>
    <p style={{ marginBottom: '20px', fontSize: '18px' }}>
      Có lỗi xảy ra trong hệ thống. Chúng tôi đã được thông báo và sẽ khắc phục sớm nhất.
    </p>
    <button 
      onClick={resetError}
      style={{
        background: 'linear-gradient(135deg, #ffd700, #ffed4a)',
        color: '#1a1a2e',
        border: 'none',
        padding: '12px 24px',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '16px'
      }}
    >
      🔄 Thử lại
    </button>
    {process.env.NODE_ENV === 'development' && (
      <details style={{ marginTop: '20px', textAlign: 'left' }}>
        <summary>Chi tiết lỗi (Development)</summary>
        <pre style={{ background: '#000', padding: '10px', borderRadius: '4px', overflow: 'auto' }}>
          {error?.message || String(error)}
          {'\n'}
          {error?.stack}
        </pre>
      </details>
    )}
  </div>
);

function App() {
  return (
    <Sentry.ErrorBoundary fallback={SentryErrorFallback} showDialog>
      <AuthProvider>
        <ThemeProvider>
          <Router>
            <div className="App">
              <AppContent />
            </div>
          </Router>
        </ThemeProvider>
      </AuthProvider>
    </Sentry.ErrorBoundary>
  );
}

export default App;
