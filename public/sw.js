const CACHE_NAME = 'streaming-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Cache TMDB images aggressively
const IMAGE_CACHE_NAME = 'streaming-images-v1';
const API_CACHE_NAME = 'streaming-api-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Cache TMDB images (posters, backdrops)
  if (url.hostname === 'image.tmdb.org') {
    event.respondWith(
      caches.open(IMAGE_CACHE_NAME)
        .then(cache => cache.match(request)
          .then(response => {
            if (response) {
              return response;
            }
            
            return fetch(request).then(networkResponse => {
              // Clone before caching
              const responseClone = networkResponse.clone();
              cache.put(request, responseClone);
              return networkResponse;
            }).catch(() => {
              // Return placeholder if offline
              return new Response('', { status: 404 });
            });
          })
        )
    );
    return;
  }

  // Cache API responses with stale-while-revalidate strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.open(API_CACHE_NAME)
        .then(cache => cache.match(request)
          .then(response => {
            // Fetch in background to update cache
            const fetchPromise = fetch(request).then(networkResponse => {
              if (networkResponse.ok) {
                const responseClone = networkResponse.clone();
                cache.put(request, responseClone);
              }
              return networkResponse;
            });

            // Return cached version immediately if available
            if (response) {
              return response;
            }
            
            // Otherwise wait for network
            return fetchPromise;
          })
        )
    );
    return;
  }

  // Default: cache-first for static assets
  event.respondWith(
    caches.match(request)
      .then(response => response || fetch(request))
  );
});

// Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && 
              cacheName !== IMAGE_CACHE_NAME && 
              cacheName !== API_CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});