// Service worker U-Express : rend l'application installable et utilisable
// avec un réseau faible. Les pages sont servies depuis le réseau d'abord,
// puis depuis le cache si la connexion tombe.
const CACHE = 'u-express-v2';

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

// Notifications Web Push (gratuites) : envoyées par la fonction serveur « envoyer-push ».
self.addEventListener('push', (event) => {
  let d = {};
  try {
    d = event.data ? event.data.json() : {};
  } catch {
    d = { titre: event.data ? event.data.text() : '' };
  }
  const titre = d.titre || d.title || 'U-Express';
  event.waitUntil(
    self.registration.showNotification(titre, {
      body: d.corps || d.body || '',
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      tag: d.type === 'nouvelle_course' ? `course-${d.id}` : undefined,
      renotify: d.type === 'nouvelle_course',
      vibrate: d.type === 'nouvelle_course' ? [300, 120, 300, 120, 300] : [200],
      data: { lien: d.lien || '/' },
    }),
  );
});

// Toucher la notification ouvre (ou réveille) l'application sur la bonne page.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const lien = (event.notification.data && event.notification.data.lien) || '/';
  const cible = new URL(`./#${lien}`, self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((fenetres) => {
      for (const f of fenetres) {
        if (f.url.startsWith(self.registration.scope) && 'focus' in f) {
          f.navigate(cible).catch(() => {});
          return f.focus();
        }
      }
      return self.clients.openWindow(cible);
    }),
  );
});
