/* Eagle Legend Arcade service worker.
 * - App shell: precached on install (cache 'ela-shell-<SHELL_VERSION>').
 * - Games: served under <scope>play/<slug>/... so they are inside this worker's scope; each request maps to the live
 *   copy at <ARCADE_BASE><slug>/... and is answered cache-first from 'ela-games-<PRECACHE.version>'.
 *   Files are cached on demand (when played) or all at once via the 'download-all' message.
 * - Old 'ela-*' caches are deleted on activate. Bump SHELL_VERSION when shell files change; PRECACHE.version changes
 *   automatically when gen-precache.py sees different game files.
 * No external requests: only same-origin URLs are ever fetched or cached. */
importScripts('config.js', 'precache-manifest.js');
var SHELL_VERSION = '3';
var SHELL = 'ela-shell-' + SHELL_VERSION, GAMES = 'ela-games-' + self.PRECACHE.version;
var SCOPE = self.registration.scope;                       // e.g. https://host/arcade/staging/app/
var BASE = new URL(self.ARCADE_BASE, SCOPE).href;          // e.g. https://host/arcade/
var PLAY = SCOPE + 'play/';
var SHELL_FILES = ['./', 'index.html', 'app.js', 'app.css', 'config.js', 'precache-manifest.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-192.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png']
  .map(function (f) { return new URL(f, SCOPE).href; })
  .concat(Object.keys(self.PRECACHE.games).map(function (s) { return BASE + self.PRECACHE.games[s].thumb; }));

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(SHELL).then(function (c) { return c.addAll(SHELL_FILES.map(function (u) { return new Request(u, { cache: 'reload' }); })); })
    .then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('ela-') === 0 && k !== SHELL && k !== GAMES; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function realUrl(url) {                                    // play/<slug>/<rest> -> <BASE><slug>/<rest>
  var rest = url.slice(PLAY.length).split('#')[0], q = rest.indexOf('?'); if (q >= 0) rest = rest.slice(0, q);
  var slug = rest.split('/')[0]; if (!self.PRECACHE.games[slug]) return null;
  var path = rest.slice(slug.length + 1); if (path === '' || path.slice(-1) === '/') path += 'index.html';
  return { slug: slug, url: BASE + slug + '/' + path };
}
function cacheFirst(cacheName, key) {
  return caches.open(cacheName).then(function (c) {
    return c.match(key).then(function (hit) {
      return hit || fetch(key).then(function (r) { if (r.ok && r.type === 'basic') c.put(key, r.clone()); return r; });
    });
  });
}
self.addEventListener('fetch', function (e) {
  var req = e.request, url = req.url;
  if (req.method !== 'GET' || url.indexOf(self.location.origin + '/') !== 0) return;   // never touch other origins
  if (url.indexOf(PLAY) === 0) {
    var m = realUrl(url);
    if (!m) return e.respondWith(new Response('Not found', { status: 404 }));
    return e.respondWith(cacheFirst(GAMES, m.url).catch(function () { return new Response('Offline: this file is not downloaded yet.', { status: 503 }); }));
  }
  var bare = url.split('#')[0].split('?')[0];
  if (SHELL_FILES.indexOf(bare) >= 0 || (req.mode === 'navigate' && bare.indexOf(SCOPE) === 0)) {
    var key = req.mode === 'navigate' ? SCOPE : bare;
    e.respondWith(caches.open(SHELL).then(function (c) { return c.match(key).then(function (hit) {
      var net = fetch(req).then(function (r) { if (r.ok && r.type === 'basic') c.put(key, r.clone()); return r; });
      return hit ? (net.catch(function () {}), hit) : net;  // stale-while-revalidate for the shell
    }); }));
  }
});

function gameUrls(slug) { return self.PRECACHE.games[slug].files.map(function (f) { return BASE + slug + '/' + f; }); }
function cacheList(urls, report) {
  return caches.open(GAMES).then(function (c) {
    var i = 0, done = 0, failed = 0, N = urls.length;
    function worker() {
      if (i >= N) return Promise.resolve(); var u = urls[i++];
      return c.match(u).then(function (hit) { return hit || fetch(u, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw 0; return c.put(u, r); }); })
        .catch(function () { failed++; }).then(function () { done++; report(done, N, failed); return worker(); });
    }
    return Promise.all([worker(), worker(), worker(), worker()]).then(function () { return { done: done, failed: failed, total: N }; });
  });
}
function status() {
  return caches.open(GAMES).then(function (c) { return c.keys(); }).then(function (keys) {
    var have = {}; keys.forEach(function (k) { have[k.url] = 1; }); var out = {};
    Object.keys(self.PRECACHE.games).forEach(function (s) { var u = gameUrls(s); out[s] = u.filter(function (x) { return have[x]; }).length === u.length; });
    return out;
  });
}
self.addEventListener('message', function (e) {
  var d = e.data || {}, src = e.source; function post(m) { try { src.postMessage(m); } catch (err) {} }
  if (d.type === 'status') status().then(function (s) { post({ type: 'status', games: s, version: self.PRECACHE.version }); });
  if (d.type === 'download-game' && self.PRECACHE.games[d.slug])
    e.waitUntil(cacheList(gameUrls(d.slug), function () {}).then(function (r) { post({ type: 'game-cached', slug: d.slug, result: r }); }));
  if (d.type === 'download-all') {
    var all = []; Object.keys(self.PRECACHE.games).forEach(function (s) { all = all.concat(gameUrls(s)); });
    var last = 0;
    e.waitUntil(cacheList(all, function (n, N, f) { var now = Date.now(); if (n === N || now - last > 250) { last = now; post({ type: 'progress', done: n, total: N, failed: f }); } })
      .then(function (r) { return status().then(function (s) { post({ type: 'download-done', result: r, games: s }); }); }));
  }
});
