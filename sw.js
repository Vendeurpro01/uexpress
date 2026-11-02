// Service worker U-Express : rend l'application installable et utilisable
// avec un réseau faible. Les pages sont servies depuis le réseau d'abord,
// puis depuis le cache si la connexion tombe.
const CACHE = 'u-express-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(['./', './index.html', './manifest.webmanifest'])).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html'))),
  );
});

// Notifications Web Push (gratuites) : branchées à l'étape des notifications.
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'U-Express', body: 'Nouvelle notification' };
  event.waitUntil(self.registration.showNotification(data.title, { body: data.body, icon: 'icons/icon-192.png' }));
});
