/* 营养追踪 — Service Worker */
const CACHE_NAME = 'nutrition-tracker-v1';
const urlsToCache = ['index.html','manifest.json'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Network first for API calls, cache first for static assets
  if (event.request.url.includes('openfoodfacts.org')) {
    // API: network with cache fallback
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Static: cache first, network fallback
    event.respondWith(
      caches.match(event.request)
        .then(res => res || fetch(event.request).then(res => {
          if (event.request.method === 'GET') {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return res;
        }))
    );
  }
});
