// GiftQuest service worker — caches the static app shell only.
// All game data comes live from your Tailscale backend, never cached here.
const CACHE_NAME = 'giftquest-shell-v3.7';
const SHELL_FILES = ['./index.html', './game.js', './manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Never intercept API calls to the game backend — always go live.
  if (event.request.method !== 'GET' || url.pathname.includes('/api/')) return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});