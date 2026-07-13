/* 营养追踪 — Service Worker */
const CACHE_NAME = 'nutrition-tracker-v6';
const urlsToCache = [
  './',
  'index.html',
  'native-app.js?v=2.0.0',
  'workout.css?v=2.0.0',
  'workout-core.js?v=2.0.0',
  'workout.js?v=2.0.0',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  'qrcode.html',
  'qrcode.png'
];

const restNotificationTimers = new Map();

function cancelRestNotification(id) {
  const handle = restNotificationTimers.get(id);
  if (handle) clearTimeout(handle);
  restNotificationTimers.delete(id);
}

async function notifyRestFinished(timer) {
  restNotificationTimers.delete(timer.id);
  const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  windowClients.forEach(client => client.postMessage({ type: 'REST_TIMER_FINISHED', timerId: timer.id }));

  const hasVisibleClient = windowClients.some(client => client.visibilityState === 'visible');
  if (!hasVisibleClient) {
    await self.registration.showNotification('组间休息结束', {
      body: '可以开始下一组了',
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      tag: `rest-${timer.id}`,
      renotify: true,
      vibrate: [250, 100, 250],
      data: { url: './index.html#workout' },
    });
  }
}

self.addEventListener('message', event => {
  const message = event.data || {};
  const timer = message.timer || {};
  if (message.type === 'CANCEL_REST_NOTIFICATION' && timer.id) {
    cancelRestNotification(timer.id);
    return;
  }
  if (message.type !== 'SCHEDULE_REST_NOTIFICATION' || !timer.id || !timer.endAt) return;

  cancelRestNotification(timer.id);
  const delay = Math.max(0, Number(timer.endAt) - Date.now());
  const handle = setTimeout(() => notifyRestFinished(timer), Math.min(delay, 2147483647));
  restNotificationTimers.set(timer.id, handle);
});

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
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);
  const isAppRequest = requestUrl.origin === self.location.origin;
  const isSupportedApi = event.request.url.includes('openfoodfacts.org') || event.request.url.includes('api.github.com');
  if (!isAppRequest && !isSupportedApi) return;

  // Navigations use network first so a newly released app shell is not pinned
  // behind the previous version's cached index.html.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put('index.html', clone));
          }
          return res;
        })
        .catch(() => caches.match('index.html'))
    );
    return;
  }

  // Network first for API calls, cache first for static assets
  if (isSupportedApi) {
    // API: network with cache fallback
    event.respondWith(
      fetch(event.request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Static: cache first, network fallback
    event.respondWith(
      caches.match(event.request)
        .then(res => res || fetch(event.request).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return res;
        }))
    );
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || './index.html#workout', self.location.href).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      const existing = windowClients.find(client => client.url.startsWith(new URL('./', self.location.href).href));
      if (existing) return existing.focus();
      return self.clients.openWindow(targetUrl);
    })
  );
});
