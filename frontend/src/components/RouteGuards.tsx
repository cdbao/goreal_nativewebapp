import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Loading spinner component
const LoadingSpinner: React.FC = () => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      color: 'white',
    }}
  >
    <div style={{ textAlign: 'center' }}>
      <h2>🏛️ Đang tải Học Viện...</h2>
      <div
        style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(255,255,255,0.3)',
          borderTop: '3px solid #FFD700',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '1rem auto',
        }}
      ></div>
    </div>
  </div>
);

// Route guard for protected routes that require both authentication and guild selection
export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { currentUser, userData, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  // Not authenticated - redirect to landing
  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  // Authenticated but no guild selected - redirect to guild selection
  if (!userData?.guild || userData.guild.trim() === '') {
    return <Navigate to="/select-guild" replace />;
  }

  // All checks passed - render protected content
  return <>{children}</>;
};

// Route guard for guild selection page
export const GuildSelectionRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { currentUser, userData, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  // Not authenticated - redirect to landing
  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  // Already has guild - redirect to dashboard
  if (userData?.guild && userData.guild.trim() !== '') {
    return <Navigate to="/dashboard" replace />;
  }

  // Show guild selection content
  return <>{children}</>;
};

// Route guard for authentication pages (login/register)
export const AuthRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { currentUser, userData, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (currentUser) {
    // User is authenticated, check if they have a guild
    if (!userData?.guild || userData.guild.trim() === '') {
      return <Navigate to="/select-guild" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }

  // Not authenticated - show auth content
  return <>{children}</>;
};

// Route guard for landing page
export const LandingRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { currentUser, userData, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (currentUser) {
    // User is authenticated, check if they have a guild
    if (!userData?.guild || userData.guild.trim() === '') {
      return <Navigate to="/select-guild" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }

  // Not authenticated - show landing content
  return <>{children}</>;
};

// Admin route guard - requires authentication, guild selection, and admin role
export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { currentUser, userData, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  // Not authenticated - redirect to landing
  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  // Authenticated but no guild selected - redirect to guild selection
  if (!userData?.guild || userData.guild.trim() === '') {
    return <Navigate to="/select-guild" replace />;
  }

  // Check for admin role - redirect to dashboard if not admin
  if (userData?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  // All checks passed - render admin content
  return <>{children}</>;
};
