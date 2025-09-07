import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Khởi tạo Sentry cho Error Tracking
Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN, // Sẽ được cấu hình trong .env
  environment: process.env.NODE_ENV || 'development',
  beforeSend(event, hint) {
    // Chỉ gửi lỗi trong production hoặc khi có SENTRY_DSN
    if (
      process.env.NODE_ENV === 'development' &&
      !process.env.REACT_APP_SENTRY_DSN
    ) {
      console.log('Sentry event (dev mode):', event);
      return null;
    }
    return event;
  },
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Service Worker Registration for GoREAL
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Register Firebase Cloud Messaging Service Worker
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .then((registration) => {
        console.log('✅ Firebase Messaging Service Worker registered successfully:', registration);
      })
      .catch((error) => {
        console.error('❌ Firebase Messaging Service Worker registration failed:', error);
      });

    // Register main PWA Service Worker in production
    if (process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('✅ GoREAL PWA Service Worker registered successfully:', registration);
          
          // Listen for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New content is available, show update notification
                  const updateAccepted = window.confirm('Đã có phiên bản mới của GoREAL! Bạn có muốn cập nhật không?');
                  if (updateAccepted) {
                    console.log('🔄 User accepted update, activating new service worker');
                    // Send skip waiting message to the new service worker
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                  } else {
                    console.log('⏭️ User declined update, continuing with current version');
                    // User can continue with the old version for this session
                  }
                }
              });
            }
          });

          // Listen for controller change (when new SW takes control)
          let refreshing = false;
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshing) return;
            console.log('🔄 New service worker is now controlling the page');
            refreshing = true;
            // Reload the page to use the new service worker
            window.location.reload();
          });
        })
        .catch((error) => {
          console.error('❌ GoREAL PWA Service Worker registration failed:', error);
        });
    }
    
    // Listen for messages from service workers
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data.type === 'STRAVA_SYNC_SUCCESS') {
        console.log('🎉 Background Strava sync completed:', event.data.data);
        // You could show a toast notification here
      } else if (event.data.type === 'NOTIFICATION_CLICKED') {
        console.log('📢 Push notification clicked:', event.data);
        // Handle notification click navigation
        if (event.data.url && event.data.url !== window.location.pathname) {
          window.location.href = event.data.url;
        }
      } else if (event.data.type === 'SW_ACTIVATED') {
        console.log('✅ Service worker activation confirmed:', event.data.message);
      }
    });
  });
}

// Register for background sync when online
if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
  navigator.serviceWorker.ready.then((registration) => {
    // Register for background sync when the app comes back online
    return (registration as any).sync.register('sync-strava-activities');
  }).catch((error) => {
    console.log('Background sync registration failed:', error);
  });
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
