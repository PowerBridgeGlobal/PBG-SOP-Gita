/* PBG SOP Gita service worker — caches the APP SHELL ONLY.
   It never caches handbook data, PINs, feedback, photos, audio or any
   authenticated response: those come from the backend (script.google.com),
   which is always fetched from the network and never stored here.

   The page itself (index.html) uses NETWORK-FIRST so a living handbook always
   updates when online, falling back to the cached copy only when offline. */
var CACHE = 'pbg-sop-gita-shell-v2';
var SHELL = ['./', './index.html', './manifest.webmanifest'];

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

  var isDoc = e.request.mode === 'navigate'
    || url.pathname === '/' || url.pathname.endsWith('/') || url.pathname.endsWith('.html');

  if (isDoc) {
    // NETWORK-FIRST: always try the latest page; cache it; fall back offline.
    e.respondWith(
      fetch(e.request).then(function (resp) {
        var copy = resp.clone();
        caches.open(CACHE).then(function (c) { c.put('./index.html', copy); });
        return resp;
      }).catch(function () {
        return caches.match(e.request).then(function (m) { return m || caches.match('./index.html'); });
      })
    );
    return;
  }

  // Static assets (icons, manifest): cache-first, then network.
  e.respondWith(caches.match(e.request).then(function (m) { return m || fetch(e.request); }));
});
