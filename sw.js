// Service worker del app shell. Nunca cachea nada bajo api/: esta app no
// tiene sincronización offline, así que servir una respuesta vieja de la
// API sería mostrar datos incorrectos sin avisar. Solo acelera/permite
// instalar el shell estático (HTML/CSS/JS/íconos).

const CACHE_NAME = 'bitacora-shell-697cb5b1e3';
const SHELL_ASSETS = [
  './',
  'index.html',
  'css/styles.css',
  'js/offline-queue.js',
  'js/api.js',
  'js/app.js',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Otros orígenes (fonts.googleapis.com, cdnjs, etc.) y todo lo de la API:
  // sin interceptar, se comportan como si no hubiera service worker.
  if (url.origin !== self.location.origin || url.pathname.includes('/api/')) {
    return;
  }

  if (event.request.mode === 'navigate') {
    // network-first: un deploy nuevo se ve de inmediato; si no hay red, cae al shell cacheado.
    event.respondWith(
      fetch(event.request).catch(() => caches.match('index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
