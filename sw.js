// Bump the cache name whenever a precached asset changes.
const PREFIX = 'snacklab-' + self.registration.scope + ':';
const CACHE = PREFIX + 'v6.5.0';
const LEGACY_CACHE = 'snacklab-v41-pwa-1';
const asset = file => new URL(file, self.registration.scope).href;
const SHELL = asset('index.html');
const ASSETS = new Set([
  'index.html', 'styles.css', 'app.js', 'core.js', 'data.js', 'model.js', 'store.js',
  'screens.js', 'features.js', 'ingredients.js', 'snack-use.js', 'v6.css', 'manifest.webmanifest',
  'vegetables.js', 'vegetables-ui.js',
  'icon-192.png', 'icon-512.png', 'gym-model.js', 'gym-ui.js', 'exercises.js', 'exercise-motion.js', 'gym.css',
  ...Array.from({ length: 23 }, (_, i) => 'recipe-' + String(i + 1).padStart(2, '0') + '.webp')
].map(asset));
const FRESH = url => new Request(url, { cache: 'reload' });

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll([...ASSETS].map(FRESH))));
});

self.addEventListener('message', event => {
  if (event.data?.type === 'ACTIVATE_UPDATE') event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    const stale = keys.filter(key => (key.startsWith(PREFIX) && key !== CACHE) || key === LEGACY_CACHE);
    await Promise.all(stale.map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (request.mode === 'navigate' && [asset('./'), SHELL].includes(url.origin + url.pathname)) {
    event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(SHELL)) ?? fetch(request)));
  } else if (ASSETS.has(request.url)) {
    event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(request)) ?? fetch(request)));
  }
});
