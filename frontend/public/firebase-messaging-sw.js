// Firebase Cloud Messaging Service Worker for GoREAL
// This service worker handles background push notifications

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Firebase configuration for service worker
const firebaseConfig = {
  apiKey: "AIzaSyBqGqJ_ZFXw5e_7JGd5y5v8q9J8Bf8Zn9A",
  authDomain: "goreal-native.firebaseapp.com", 
  projectId: "goreal-native",
  storageBucket: "goreal-native.firebasestorage.app",
  messagingSenderId: "413996351697",
  appId: "1:413996351697:web:5d9f8b2c3a4e5f6g7h8i9j0k"
};

// Initialize Firebase for messaging
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[FCM SW] Received background message:', payload);

  // Customize notification based on payload
  const notificationTitle = payload.notification?.title || payload.data?.title || 'GoREAL';
  
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'Bạn có một thông báo mới từ GoREAL!',
    icon: payload.notification?.icon || payload.data?.icon || '/logo192.png',
    badge: '/logo192.png',
    image: payload.data?.image || payload.notification?.image,
    vibrate: [200, 100, 200, 100, 200],
    silent: false,
    requireInteraction: payload.data?.requireInteraction === 'true',
    tag: payload.data?.tag || 'goreal-notification',
    renotify: true,
    timestamp: Date.now(),
    data: {
      url: payload.data?.click_action || payload.fcmOptions?.link || '/dashboard',
      ...payload.data
    },
    actions: [
      {
        action: 'open',
        title: 'Mở GoREAL',
        icon: '/logo192.png'
      },
      {
        action: 'dismiss', 
        title: 'Đóng',
        icon: '/logo192.png'
      }
    ]
  };

  // Show the notification
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[FCM SW] Notification clicked:', event);
  
  event.notification.close();

  // Handle different actions
  if (event.action === 'dismiss') {
    return; // Just close the notification
  }

  // Default action or 'open' action
  const urlToOpen = event.notification.data?.url || '/dashboard';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Check if GoREAL is already open
      for (const client of clientList) {
        const url = new URL(client.url);
        if (url.origin === self.location.origin) {
          // Focus existing window and navigate to the target URL
          client.focus();
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            url: urlToOpen,
            data: event.notification.data
          });
          return;
        }
      }
      
      // Open new window if GoREAL is not already open
      return clients.openWindow(urlToOpen);
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[FCM SW] Notification closed:', event.notification.tag);
  
  // Optional: Send analytics or tracking data about dismissed notifications
  if (event.notification.data?.trackDismissal) {
    fetch('/api/track-notification-dismissal', {
      method: 'POST',
      body: JSON.stringify({
        tag: event.notification.tag,
        timestamp: Date.now()
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    }).catch(error => {
      console.log('[FCM SW] Failed to track dismissal:', error);
    });
  }
});

console.log('[FCM SW] Firebase Cloud Messaging Service Worker loaded');