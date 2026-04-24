// === SERVICE WORKER ORBIX ===
const CACHE_NAME = `orbix-v${ORBIX_CONFIG?.version || '0.1.0'}`;
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icon-144.png',
  './icon-192.png',
  './icon-512.png'
];

// Installation
self.addEventListener('install', (event) => {
  console.log('[Orbix SW] Installation...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Orbix SW] Mise en cache des assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activation
self.addEventListener('activate', (event) => {
  console.log('[Orbix SW] Activation');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request)
          .then((response) => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            return response;
          });
      })
  );
});

// Messages de l'application
self.addEventListener('message', (event) => {
  console.log('[Orbix SW] Message reçu:', event.data);
  
  if (event.data.type === 'ping') {
    // Garder le SW actif
    const unread = event.data.unread || 0;
    
    // Mettre à jour le badge via les clients
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: 'badge_update',
          count: unread
        });
      });
    });
  }
  
  if (event.data.type === 'skipWaiting') {
    self.skipWaiting();
  }
});

// Background Sync (si supporté)
self.addEventListener('sync', (event) => {
  console.log('[Orbix SW] Background Sync:', event.tag);
  if (event.tag === 'check-emails') {
    event.waitUntil(checkEmailsInBackground());
  }
});

async function checkEmailsInBackground() {
  // Logique de vérification en arrière-plan
  console.log('[Orbix SW] Vérification en arrière-plan');
}

// Push Notifications (prêt pour extension future)
self.addEventListener('push', (event) => {
  console.log('[Orbix SW] Push reçu');
  const options = {
    body: event.data ? event.data.text() : 'Nouveau mail détecté',
    icon: './icon-192.png',
    badge: './icon-144.png',
    vibrate: [200, 100, 200],
    tag: 'orbix-notification'
  };
  
  event.waitUntil(
    self.registration.showNotification('Orbix', options)
  );
});