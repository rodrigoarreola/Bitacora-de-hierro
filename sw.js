// Service worker del app shell. Nunca intercepta nada bajo api/ (las
// respuestas de la API siempre van a la red; la edición sin conexión la
// resuelve la cola de js/offline-queue.js y la copia de js/snapshot.js).
//
// Estrategia: TODO el shell (HTML, CSS, JS, íconos) sale de un único caché
// versionado (CACHE_NAME, que scripts/bump-sw-cache.php recalcula en cada
// commit según el contenido del shell). Así nunca se mezclan un HTML nuevo
// con un JS viejo. Una versión nueva se instala en segundo plano y ESPERA:
// la página muestra "Hay una versión nueva — Actualizar" y, al aceptar, le
// pide al SW que se active (mensaje SKIP_WAITING) y se recarga.

const CACHE_NAME = 'bitacora-shell-427cce0093';
const SHELL_ASSETS = [
  './',
  'index.html',
  'css/tokens.css',
  'css/components.css',
  'css/styles.css',
  'js/offline-queue.js',
  'js/snapshot.js',
  'js/api.js',
  'js/app.js',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // cache:'reload' salta la caché HTTP del navegador/hosting: si no, un
      // sw.js nuevo podría guardar en su caché archivos viejos.
      Promise.all(SHELL_ASSETS.map((url) => cache.add(new Request(url, { cache: 'reload' }))))
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      // Solo tiene efecto en la primera instalación (toma el control de la
      // página ya abierta) o tras aceptar una actualización.
      .then(() => self.clients.claim())
  );
});

// La página pide activar la versión que está esperando.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Otros orígenes (fonts.googleapis.com, cdnjs, etc.) y todo lo de la API:
  // sin interceptar, se comportan como si no hubiera service worker.
  if (url.origin !== self.location.origin || url.pathname.includes('/api/')) {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('index.html').then((cached) => cached || fetch(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
