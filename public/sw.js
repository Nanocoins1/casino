// HATHOR Casino — Service Worker v4.8 (GLB material fix — invalidate 3D models)
var CACHE = 'hathor-v4.8';
var STATIC = [
  '/',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Space+Grotesk:wght@400;500;600;700&family=Orbitron:wght@700;900&family=DM+Mono:wght@400;500&display=swap'
];

// Key images to pre-cache for instant lobby loading
var IMG_CACHE = [
  '/img/favicon.webp',
  '/img/hathor-logo-mark.png',
  '/img/hathor-logo-topbar.png',
  '/img/hathor-text-3d.png',
  '/img/topbar-bg.jpg',
  '/img/loading-screen.webp',
  '/img/win-celebration.webp',
  '/img/bonus-bg.webp',
  '/img/vip-card-bg.webp',
  '/img/cashier-hero.jpg',
  '/img/cat-all.webp',
  '/img/cat-tables.webp',
  '/img/cat-slots.webp',
  '/img/cat-crash.webp',
  '/img/cat-sports.webp',
  '/img/icon-slots.png',
  '/img/icon-roulette.png',
  '/img/icon-blackjack.png',
  '/img/icon-crash.png',
  '/img/icon-dragon.webp',
  '/img/icon-mines.webp',
  '/img/icon-dice.webp',
  '/img/icon-pyramid.webp',
  '/img/av-lion.webp',
  '/img/av-tiger.webp',
  '/img/av-wolf.webp',
  '/img/av-eagle.webp',
  '/img/av-dragon.webp',
  '/img/av-king.webp',
  '/img/av-queen.webp',
  // AI-generated nav icons (DALL-E 3)
  '/img/nav-lobby.png',
  '/img/nav-slots.png',
  '/img/nav-sports.png',
  '/img/nav-poker.png',
  '/img/nav-pyramid.png',
  '/img/nav-cashier.png',
  // Sports hero + sport tab icons (DALL-E 3)
  '/img/icon-deposit.png',
  '/img/icon-bonus.png',
  '/img/icon-all-games.png',
  '/img/icon-slots.png',
  '/img/icon-poker.png',
  '/img/icon-blackjack.png',
  '/img/icon-roulette.png',
  '/img/icon-crash.png',
  '/img/icon-pyramid-game.png',
  '/img/icon-vip.png',
  // Gold 3D button textures (DALL-E 3)
  '/img/btn-primary.png',
  '/img/btn-secondary.png',
  '/img/btn-danger.png',
  '/img/sports-hero.jpg',
  '/img/sport-icon-soccer.png',
  '/img/sport-icon-basketball.png',
  '/img/sport-icon-tennis.png',
  '/img/sport-icon-hockey.png',
  '/img/sport-icon-football.png',
  '/img/sport-icon-mma.png',
  '/img/sport-icon-baseball.png',
];

// Pages that should always come from network (live game data)
var NETWORK_FIRST = ['/api/', '/socket.io/', '/admin', '/kyc-file/'];

// Pages that work offline (static compliance pages)
var CACHE_FIRST = [
  '/terms.html', '/privacy.html', '/responsible.html',
  '/provably-fair.html', '/aml.html', '/login.html', '/404.html'
];

self.addEventListener('message', function(e) {
  if(e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if(e.data && e.data.type === 'NUKE_CACHE') {
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(k) { return caches.delete(k); }));
    }).then(function() { self.skipWaiting(); });
  }
});

self.addEventListener('install', function(e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      // Cache static + key images (ignore failures for optional images)
      return cache.addAll(STATIC).catch(function() {}).then(function() {
        return Promise.all(IMG_CACHE.map(function(url) {
          return cache.add(url).catch(function() {});
        }));
      });
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

  // HTML pages: ALWAYS from network, NEVER from cache
  // This ensures every visitor always gets the latest version without needing to clear cache
  var isHTML = url.indexOf('.html') >= 0 || url.endsWith('/') || url.split('?')[0].endsWith('/index');
  if (isHTML) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Stale-while-revalidate for assets (images, fonts, js, css)
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
    data = { title: 'HATHOR Casino', body: e.data ? e.data.text() : 'New notification!' };
  }
  var options = {
    body: data.body || '',
    icon: data.icon || '/img/favicon.webp',
    badge: '/img/favicon.webp',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' },
    actions: [
      { action: 'open',  title: 'Open' },
      { action: 'close', title: 'Dismiss' }
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
