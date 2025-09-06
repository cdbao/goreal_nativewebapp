import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Login from './Login';
import Register from './Register';
import FirebaseDebug from './FirebaseDebug';
import SentryTestButton from './SentryTestButton';

const AuthPage: React.FC = () => {
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(true);

  useEffect(() => {
    setIsLogin(location.pathname === '/login');
  }, [location.pathname]);

  return (
    <div>
      {isLogin ? (
        <Login onSwitchToRegister={() => setIsLogin(false)} />
      ) : (
        <Register onSwitchToLogin={() => setIsLogin(true)} />
      )}
      {process.env.NODE_ENV === 'development' && (
        <>
          <FirebaseDebug />
          <SentryTestButton />
        </>
      )}
    </div>
  );
};

export default AuthPage;
