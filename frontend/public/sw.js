// GoREAL PWA Service Worker
// Advanced caching strategy for optimal offline experience

const CACHE_NAME = 'goreal-pwa-v1.0.2';
const RUNTIME_CACHE = 'goreal-runtime-v1.0.2';

// Static assets to cache on install (cache-first strategy)
const STATIC_ASSETS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/logo192.png',
  '/logo512.png',
  '/favicon.ico'
];

// Dynamic routes that need network-first strategy
const DYNAMIC_ROUTES = [
  '/api/',
  '/dashboard',
  '/profile',
  '/chat',
  '/guild-selection',
  '/admin'
];

// Firebase/Firestore patterns (network-first)
const FIREBASE_PATTERNS = [
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com'
];

// Strava API patterns (network-first with cache fallback)
const STRAVA_PATTERNS = [
  'strava.com/api',
  'www.strava.com/api'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing GoREAL Service Worker v1.0.0');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        console.error('[SW] Error caching static assets:', error);
      })
  );
});

// Activate event - cleanup old caches and notify clients
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating GoREAL Service Worker');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service Worker activated, claiming clients');
        return self.clients.claim();
      })
      .then(() => {
        // Notify all clients that the new SW is now controlling
        return self.clients.matchAll();
      })
      .then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'SW_ACTIVATED',
            message: 'New service worker is now active'
          });
        });
      })
  );
});

// Fetch event - sophisticated caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') return;
  
  event.respondWith(
    handleFetchStrategy(request, url)
  );
});

// Main fetch strategy handler
async function handleFetchStrategy(request, url) {
  try {
    // Strategy 1: Static Assets (Cache First)
    if (isStaticAsset(url)) {
      return await cacheFirst(request);
    }
    
    // Strategy 2: Firebase APIs (Network First)
    if (isFirebaseAPI(url)) {
      return await networkFirst(request);
    }
    
    // Strategy 3: Strava APIs (Network First with extended timeout)
    if (isStravaAPI(url)) {
      return await networkFirstStrava(request);
    }
    
    // Strategy 4: App Routes (Stale While Revalidate)
    if (isAppRoute(url)) {
      return await staleWhileRevalidate(request);
    }
    
    // Strategy 5: Default (Network First)
    return await networkFirst(request);
    
  } catch (error) {
    console.error('[SW] Fetch strategy error:', error);
    return await fallbackResponse(request);
  }
}

// Cache-first strategy (for static assets)
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    console.log('[SW] Cache hit:', request.url);
    return cached;
  }
  
  console.log('[SW] Cache miss, fetching:', request.url);
  const response = await fetch(request);
  
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone()); // Clone BEFORE consuming response
  }
  
  return response;
}

// Network-first strategy (for dynamic content)
async function networkFirst(request) {
  try {
    const response = await fetch(request, { timeout: 5000 });
    
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone()); // Clone BEFORE consuming response
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Network failed, checking cache:', request.url);
    const cached = await caches.match(request);
    
    if (cached) {
      console.log('[SW] Serving from cache:', request.url);
      return cached;
    }
    
    throw error;
  }
}

// Network-first for Strava API (with extended timeout)
async function networkFirstStrava(request) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout for Strava
    
    const response = await fetch(request, {
      signal: controller.signal,
      headers: {
        ...request.headers,
        'Cache-Control': 'no-cache'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      // Cache Strava responses for 5 minutes - Clone FIRST
      const responseToCache = response.clone();
      responseToCache.headers.set('sw-cache-timestamp', Date.now().toString());
      cache.put(request, responseToCache);
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Strava network failed, checking cache:', request.url);
    const cached = await caches.match(request);
    
    if (cached) {
      // Check if cached Strava data is less than 5 minutes old
      const cacheTimestamp = cached.headers.get('sw-cache-timestamp');
      if (cacheTimestamp && (Date.now() - parseInt(cacheTimestamp)) < 300000) {
        console.log('[SW] Serving fresh cached Strava data:', request.url);
        return cached;
      }
    }
    
    throw error;
  }
}

// Stale-while-revalidate strategy (for app routes)
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  
  // Always try to fetch in the background
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        const cache = caches.open(RUNTIME_CACHE);
        cache.then(c => c.put(request, response.clone())); // Clone BEFORE consuming
      }
      return response;
    })
    .catch(error => {
      console.log('[SW] Background fetch failed:', error);
      return null;
    });
  
  // Return cached version immediately if available
  if (cached) {
    console.log('[SW] Serving from cache (stale-while-revalidate):', request.url);
    return cached;
  }
  
  // Otherwise wait for network
  return await fetchPromise || fallbackResponse(request);
}

// Fallback response for offline scenarios
async function fallbackResponse(request) {
  const url = new URL(request.url);
  
  // Return offline page for navigation requests
  if (request.mode === 'navigate') {
    const offlineHtml = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>GoREAL - Offline</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #0F1419; color: white; }
          .offline-icon { font-size: 4rem; margin-bottom: 1rem; }
          .offline-title { font-size: 2rem; margin-bottom: 1rem; color: #FF6B35; }
          .offline-message { font-size: 1.2rem; margin-bottom: 2rem; color: #ccc; }
          .retry-btn { padding: 1rem 2rem; background: #FF6B35; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1rem; }
        </style>
      </head>
      <body>
        <div class="offline-icon">⚡</div>
        <h1 class="offline-title">GoREAL Offline</h1>
        <p class="offline-message">Bạn hiện đang offline. Vui lòng kiểm tra kết nối mạng.</p>
        <button class="retry-btn" onclick="window.location.reload()">Thử Lại</button>
      </body>
      </html>
    `;
    
    return new Response(offlineHtml, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
  
  // Return generic offline response for other requests
  return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
}

// Helper functions to determine request types
function isStaticAsset(url) {
  return url.pathname.includes('/static/') || 
         url.pathname.endsWith('.js') || 
         url.pathname.endsWith('.css') || 
         url.pathname.endsWith('.png') || 
         url.pathname.endsWith('.jpg') || 
         url.pathname.endsWith('.ico') ||
         url.pathname === '/manifest.json';
}

function isFirebaseAPI(url) {
  return FIREBASE_PATTERNS.some(pattern => url.hostname.includes(pattern));
}

function isStravaAPI(url) {
  return STRAVA_PATTERNS.some(pattern => url.href.includes(pattern));
}

function isAppRoute(url) {
  return url.origin === self.location.origin && 
         DYNAMIC_ROUTES.some(route => url.pathname.startsWith(route));
}

// Background sync for AURA Stream activities
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-strava-activities') {
    event.waitUntil(syncStravaActivities());
  }
});

// Background sync implementation
async function syncStravaActivities() {
  try {
    console.log('[SW] Syncing Strava activities in background...');
    
    // This will trigger when the app comes back online
    const response = await fetch('/api/sync-strava-activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      console.log('[SW] Background sync successful');
      
      // Notify the app about successful sync
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'STRAVA_SYNC_SUCCESS',
          data: 'Activities synced successfully'
        });
      });
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Push notification handler for AURA Stream updates
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'New AURA Stream update available!',
    icon: '/logo192.png',
    badge: '/logo192.png',
    vibrate: [200, 100, 200],
    tag: 'aura-stream-update',
    actions: [
      { action: 'view', title: 'View Dashboard', icon: '/logo192.png' },
      { action: 'dismiss', title: 'Dismiss', icon: '/logo192.png' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('GoREAL - AURA Stream', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/dashboard')
    );
  }
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Received SKIP_WAITING message, skipping waiting state');
    self.skipWaiting();
  }
});


console.log('[SW] GoREAL Service Worker loaded successfully');