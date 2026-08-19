// Service Worker for Lotto AI Africa
// Handles offline support, caching, and performance optimization

const CACHE_NAME = 'lotto-ai-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/about.html',
  '/privacy-policy.html',
  '/admin-portal-xyz.html'
];

// Install event: Cache static assets
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('📦 Caching static assets');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('⚠️ Some assets failed to cache:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate event: Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🧹 Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event: Implement cache-first strategy with ad network bypass
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Ad network hosts - bypass caching & do not cache responses
  const AD_HOSTS = [
    'pagead2.googlesyndication.com',
    'googleads.g.doubleclick.net',
    'doubleclick.net',
    'googleadservices.com',
    'adservice.google.com'
  ];

  if (AD_HOSTS.some(h => url.hostname.includes(h))) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // Skip Firebase and external API calls
  if (url.hostname.includes('googleapis.com') || 
      url.hostname.includes('firestore.com') ||
      url.hostname.includes('firebase.com')) {
    event.respondWith(fetch(request));
    return;
  }

  // Cache-first strategy for static assets
  event.respondWith(
    caches.match(request).then((response) => {
      if (response) {
        return response;
      }

      return fetch(request)
        .then((response) => {
          // Don't cache if not ok or status code
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          // Clone response and cache it
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // Return offline fallback if available
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || new Response('Offline - Resource not available', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
        });
    })
  );
});

// Background sync for offline form submissions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-forum-posts') {
    event.waitUntil(syncForumPosts());
  }
});

function syncForumPosts() {
  return new Promise((resolve) => {
    // Implementation: Sync pending forum posts when connection restored
    console.log('🔄 Syncing pending forum posts...');
    resolve();
  });
}

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('✅ Service Worker loaded successfully');
