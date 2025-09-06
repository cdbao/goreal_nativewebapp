import React from 'react';
import * as Sentry from '@sentry/react';

const SentryTestButton: React.FC = () => {
  const testSentryError = () => {
    // Test error capture
    throw new Error(
      '🔥 Test error from Lò Rèn Titan - Sentry Integration Test'
    );
  };

  const testSentryMessage = () => {
    // Test message capture
    Sentry.captureMessage(
      "🛡️ Test message from Titans' Guild - Sentry working!",
      'info'
    );
    alert('Message sent to Sentry! Check your dashboard.');
  };

  const testSentryEvent = () => {
    // Test custom event
    Sentry.addBreadcrumb({
      message: 'User tested Sentry integration',
      category: 'debug',
      data: {
        feature: 'error_tracking',
        location: 'test_button',
      },
    });

    Sentry.captureMessage('🔍 Custom event logged to Sentry', 'debug');
    alert('Custom event sent to Sentry!');
  };

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '10px',
        left: '10px',
        background: 'rgba(255, 69, 69, 0.9)',
        padding: '15px',
        borderRadius: '8px',
        fontSize: '12px',
        color: 'white',
        zIndex: 9999,
        border: '2px solid #ff4444',
      }}
    >
      <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>
        🔍 Sentry Test Panel (Dev Only)
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          onClick={testSentryMessage}
          style={{
            padding: '6px 12px',
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px',
          }}
        >
          📤 Test Message
        </button>

        <button
          onClick={testSentryEvent}
          style={{
            padding: '6px 12px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px',
          }}
        >
          📊 Test Event
        </button>

        <button
          onClick={testSentryError}
          style={{
            padding: '6px 12px',
            background: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px',
          }}
        >
          💥 Test Error
        </button>
      </div>

      <div style={{ marginTop: '8px', fontSize: '10px', opacity: 0.8 }}>
        Check Sentry Dashboard for results
      </div>
    </div>
  );
};

export default SentryTestButton;
