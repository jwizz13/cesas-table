// ============================================================
// Cesa's Table — Service Worker
// ============================================================
// Caching strategy:
//   - App shell (HTML, CSS, JS): cache-first, network fallback
//   - Supabase API calls: network-only (never cache dynamic data)
//   - CDN scripts: cache-first (they're versioned/immutable)
//   - Everything else: network-first, cache fallback
// ============================================================

const CACHE_NAME = 'cesas-table-v28';

// App shell files to pre-cache on install
const APP_SHELL = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/data.js',
  './manifest.json'
];

// ------------------------------------------------------------
// Install: pre-cache the app shell so the app works offline
// ------------------------------------------------------------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell');
      return cache.addAll(APP_SHELL);
    })
  );
  // Activate immediately instead of waiting for old tabs to close
  self.skipWaiting();
});

// ------------------------------------------------------------
// Activate: clean up old cache versions
// ------------------------------------------------------------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  // Take control of all open tabs immediately
  self.clients.claim();
});

// ------------------------------------------------------------
// Fetch: route requests to the appropriate caching strategy
// ------------------------------------------------------------
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // --- Supabase API calls: network-only (never cache) ---
  // API responses are dynamic and must always be fresh
  if (url.hostname.endsWith('.supabase.co')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // --- App shell & navigation: cache-first, network fallback ---
  // Serves the cached version instantly; falls back to network if not cached
  const isNavigation = event.request.mode === 'navigate';
  const basePath = self.registration.scope.replace(url.origin, '');
  const isAppShell = APP_SHELL.some((path) => {
    const fullPath = basePath + path.replace('./', '');
    return url.pathname === fullPath || url.pathname === fullPath.replace('index.html', '');
  });

  if (isNavigation || isAppShell) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request).then((response) => {
          // Cache the fresh response for next time
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // --- CDN scripts: cache-first ---
  // CDN resources are typically versioned/immutable, safe to serve from cache
  const isCDN = url.hostname.includes('cdn') ||
                url.hostname.includes('unpkg.com') ||
                url.hostname.includes('cdnjs.cloudflare.com') ||
                url.hostname.includes('jsdelivr.net');

  if (isCDN) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // --- Everything else: network-first, cache fallback ---
  // Try the network for fresh data; fall back to cache if offline
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses for offline fallback
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
