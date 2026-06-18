/* ==========================================================================
   VOICEFLOW PROMPTER - Service Worker
   Cache-first for the static app shell so it installs and works offline.
   Media streams/recordings are never cached.
   ========================================================================== */

const CACHE_VERSION = 'vfp-v2';
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js?v=11',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

// Pre-cache the app shell on install.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      // addAll fails the whole install if any request fails; add individually
      // so a missing optional asset (e.g. an icon) doesn't block installation.
      Promise.all(
        APP_SHELL.map((url) => cache.add(url).catch((err) => {
          console.warn('[VFP SW] Skipped caching', url, err);
        }))
      )
    )
  );
  self.skipWaiting();
});

// Drop old caches on activate.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Cache-first for same-origin GET requests; network fallback otherwise.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Only handle our own origin; let cross-origin (fonts/CDN) go to the network.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          // Cache successful responses for future offline use.
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
