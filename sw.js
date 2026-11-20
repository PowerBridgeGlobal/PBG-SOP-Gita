/* PBG Geeta service worker — caches the APP SHELL ONLY.
   It never caches handbook data, PINs, feedback, photos, audio or any
   authenticated response: those come from the backend (script.google.com),
   which is always fetched from the network and never stored here. */
var CACHE = 'pbg-geeta-shell-v1';
var SHELL = [
  './', './index.html', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  // Backend / auth / any cross-origin request: straight to network, never cached.
  if (url.origin !== self.location.origin || url.hostname.indexOf('script.google.com') >= 0) return;
  if (e.request.method !== 'GET') return;
  // App shell: cache-first, fall back to network, then to the cached shell.
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      return cached || fetch(e.request).catch(function () { return caches.match('./index.html'); });
    })
  );
});
