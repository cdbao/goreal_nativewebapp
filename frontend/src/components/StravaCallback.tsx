import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './StravaCallback.css';

const StravaCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing Strava connection...');

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Get parameters from URL
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        // Check for OAuth errors
        if (error) {
          setStatus('error');
          setMessage(`Strava authorization failed: ${error}`);
          setTimeout(() => {
            navigate('/dashboard?tab=aura-stream');
          }, 3000);
          return;
        }

        // Check required parameters
        if (!code || !state) {
          setStatus('error');
          setMessage('Missing authorization code or state parameter');
          setTimeout(() => {
            navigate('/dashboard?tab=aura-stream');
          }, 3000);
          return;
        }

        // Check user authentication
        if (!currentUser) {
          setStatus('error');
          setMessage('User not authenticated. Please log in and try again.');
          setTimeout(() => {
            navigate('/login');
          }, 3000);
          return;
        }

        setMessage('Exchanging authorization code for access token...');

        // Get Firebase ID token
        const idToken = await currentUser.getIdToken();

        // Use production API URL during development since rewrites only work in production
        const apiUrl = process.env.NODE_ENV === 'development' 
          ? 'https://goreal-native.web.app/api/handleStravaCallback'
          : '/api/handleStravaCallback';

        // Send code to backend for token exchange
        const response = await fetch(`${apiUrl}?code=${code}&state=${state}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setStatus('success');
          setMessage(`🎉 Successfully connected to Strava! Welcome, ${data.athlete?.name || 'Athlete'}!`);
          
          // Redirect to dashboard after success
          setTimeout(() => {
            navigate('/dashboard?tab=aura-stream');
          }, 2000);
        } else {
          const errorData = await response.json();
          setStatus('error');
          setMessage(`Failed to connect Strava account: ${errorData.error || 'Unknown error'}`);
          setTimeout(() => {
            navigate('/dashboard?tab=aura-stream');
          }, 3000);
        }

      } catch (error) {
        console.error('Error processing Strava callback:', error);
        setStatus('error');
        setMessage('An unexpected error occurred while connecting to Strava.');
        setTimeout(() => {
          navigate('/dashboard?tab=aura-stream');
        }, 3000);
      }
    };

    processCallback();
  }, [searchParams, navigate, currentUser]);

  return (
    <div className="strava-callback">
      <div className="strava-callback-container">
        <div className="strava-callback-header">
          <img 
            src="/logo192.png" 
            alt="GoREAL" 
            className="callback-logo"
          />
          <h1>GoREAL AURA Stream</h1>
        </div>

        <div className={`callback-content ${status}`}>
          {status === 'loading' && (
            <>
              <div className="loading-spinner">
                <div className="spinner"></div>
              </div>
              <h2>Connecting to Strava...</h2>
              <p>{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="success-icon">✅</div>
              <h2>Connection Successful!</h2>
              <p>{message}</p>
              <p className="redirect-note">Redirecting you to your dashboard...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="error-icon">❌</div>
              <h2>Connection Failed</h2>
              <p>{message}</p>
              <p className="redirect-note">Redirecting you back...</p>
            </>
          )}
        </div>

        <div className="callback-footer">
          <p>Powered by GoREAL AURA Stream</p>
        </div>
      </div>
    </div>
  );
};

export default StravaCallback;