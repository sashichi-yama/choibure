// ちょいブレ service worker: works offline, and always tries the network first for the page itself
// so updates show up on the next launch (GitHub Pages lets browsers cache files for 10 minutes).
const CACHE = 'choibure-v12';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const isPage = req.mode === 'navigate' || (new URL(req.url).origin === location.origin && /\/(index\.html)?$/.test(new URL(req.url).pathname));
  if (isPage) {
    // network first (skipping the HTTP cache), cached copy when offline
    e.respondWith(fetch(req, { cache: 'no-cache' }).then((r) => {
      if (r && r.ok) caches.open(CACHE).then((c) => c.put('index.html', r.clone()));
      return r;
    }).catch(() => caches.match('index.html')));
    return;
  }
  // everything else: answer from cache at once, refresh in the background
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const hit = await c.match(req, { ignoreSearch: true });
    const net = fetch(req).then((r) => { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
