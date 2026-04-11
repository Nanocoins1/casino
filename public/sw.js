// HATHOR Casino — Service Worker v1.3
var CACHE = 'hathor-v1.3';
var STATIC = [
  '/',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Orbitron:wght@700;900&family=DM+Mono:wght@400;500&display=swap'
];

// Pages that should always come from network (live game data)
var NETWORK_FIRST = ['/api/', '/socket.io/', '/admin', '/kyc-file/'];

// Pages that work offline (static pages)
var CACHE_FIRST = [
  '/terms.html', '/privacy.html', '/responsible.html',
  '/provably-fair.html', '/aml.html', '/login.html'
];

self.addEventListener('install', function(e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(STATIC).catch(function() {});
    })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // Skip non-GET
  if (e.request.method !== 'GET') return;

  // Skip chrome-extension etc
  if (!url.startsWith('http')) return;

  // Network-first for API and socket calls
  var netFirst = NETWORK_FIRST.some(function(p) { return url.indexOf(p) >= 0; });
  if (netFirst) {
    e.respondWith(
      fetch(e.request).catch(function() {
        return new Response(JSON.stringify({error:'offline'}), {
          headers: {'Content-Type':'application/json'}
        });
      })
    );
    return;
  }

  // Cache-first for static compliance pages
  var cacheFirst = CACHE_FIRST.some(function(p) { return url.indexOf(p) >= 0; });
  if (cacheFirst) {
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        return cached || fetch(e.request).then(function(res) {
          var clone = res.clone();
          caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
          return res;
        });
      })
    );
    return;
  }

  // Stale-while-revalidate for main pages
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      var fetchPromise = fetch(e.request).then(function(res) {
        if (res && res.status === 200 && res.type !== 'opaque') {
          var clone = res.clone();
          caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
        }
        return res;
      }).catch(function() { return cached; });

      return cached || fetchPromise;
    })
  );
});

// Push notifications
self.addEventListener('push', function(e) {
  var data = {};
  try { data = e.data.json(); } catch(err) {
    data = { title: 'HATHOR Casino', body: e.data ? e.data.text() : 'Naujas pranešimas!' };
  }
  var options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: 'Atidaryti' },
      { action: 'close', title: 'Uždaryti' }
    ],
    tag: 'hathor-notification',
    renotify: true
  };
  e.waitUntil(self.registration.showNotification(data.title || 'HATHOR Casino', options));
});

self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  if (e.action === 'close') return;
  var url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(cls) {
      for (var i = 0; i < cls.length; i++) {
        if (cls[i].url.indexOf(self.location.origin) >= 0) {
          cls[i].focus();
          cls[i].navigate(url);
          return;
        }
      }
      return clients.openWindow(url);
    })
  );
});
