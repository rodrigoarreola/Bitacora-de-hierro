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
//
// Librerías de CDN (Chart.js, html2canvas, Font Awesome, Google Fonts): van a un
// segundo caché, LIBS_CACHE, que NO se versiona con el shell (sus URLs ya llevan
// la versión y no cambian) y sobrevive a las actualizaciones. Caché primero; la
// primera vez se guardan en la instalación, leyendo las URLs del propio
// index.html, para que la app abra completa sin conexión desde la primera visita.

const CACHE_NAME = 'bitacora-shell-v1.68.1-84e8c0643c';
const SHELL_ASSETS = [
  './',
  'index.html',
  'css/tokens.css',
  'css/components.css',
  'css/base.css',
  'css/views/hoy.css',
  'css/views/ajustes.css',
  'css/views/login.css',
  'css/views/perfil.css',
  'css/views/calendario.css',
  'css/views/historial.css',
  'css/views/progreso.css',
  'js/offline-queue.js',
  'js/snapshot.js',
  'js/api.js',
  'js/changelog-data.js',
  'js/split-catalog.js',
  'js/app.js',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

const LIBS_CACHE = 'bitacora-libs-v1';
const LIB_HOSTS = new Set(['cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com']);

// Guarda `url` en LIBS_CACHE (si no estaba) y devuelve la respuesta. Se pide en
// modo CORS a propósito: una respuesta opaca (no-cors) le cuesta a Chrome ~7 MB de
// cuota de almacenamiento cada una, aunque pese 40 KB.
async function cacheLib(libs, url) {
  let res = await libs.match(url, { ignoreVary: true });
  if (res) return res;
  res = await fetch(url, { mode: 'cors', credentials: 'omit' });
  if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + url);
  await libs.put(url, res.clone());
  return res;
}

// De un CSS de librería, solo las fuentes que la app usa de verdad (no las ~1 MB
// de subconjuntos de otros alfabetos ni los estilos regular/brands de Font Awesome).
function fontUrlsToWarm(cssUrl, css) {
  const urls = [];
  let m;
  if (new URL(cssUrl).hostname === 'fonts.googleapis.com') {
    // Un bloque @font-face por subconjunto, precedido de /* latin */. Para español
    // bastan latin y latin-ext.
    const re = /\/\*\s*([a-z-]+)\s*\*\/\s*@font-face\s*\{[^}]*?url\(([^)]+)\)/g;
    while ((m = re.exec(css))) if (m[1] === 'latin' || m[1] === 'latin-ext') urls.push(m[2].replace(/['"]/g, ''));
  } else if (cssUrl.includes('font-awesome')) {
    // La app solo usa el estilo "solid" (fa-solid).
    const re = /url\(([^)]*fa-solid-900\.woff2[^)]*)\)/g;
    while ((m = re.exec(css))) urls.push(new URL(m[1].replace(/['"]/g, ''), cssUrl).href);
  }
  return [...new Set(urls)];
}

// Precarga (mejor esfuerzo: un fallo no impide instalar el shell).
async function warmLibs() {
  const shell = await caches.open(CACHE_NAME);
  const indexRes = await shell.match('index.html');
  if (!indexRes) return;
  const html = await indexRes.text();
  const urls = [...html.matchAll(/(?:href|src)="(https:\/\/[^"]+)"/g)]
    .map((m) => m[1].replace(/&amp;/g, '&'))
    .filter((u) => LIB_HOSTS.has(new URL(u).hostname) && new URL(u).pathname.length > 1); // sin los <link rel="preconnect">
  const libs = await caches.open(LIBS_CACHE);
  await Promise.allSettled(urls.map(async (url) => {
    const res = await cacheLib(libs, url);
    if (!/\.css(\?|$)|fonts\.googleapis\.com/.test(url)) return;
    const css = await res.clone().text();
    await Promise.allSettled(fontUrlsToWarm(url, css).map((fontUrl) => cacheLib(libs, fontUrl)));
  }));
}

// Caché primero. Sin copia: red (CORS, y si el CDN no lo permite, la petición
// original); sin red y sin copia, error de red, igual que sin service worker.
async function libResponse(request) {
  const libs = await caches.open(LIBS_CACHE);
  const cached = await libs.match(request.url, { ignoreVary: true });
  if (cached) return cached;
  try {
    return await cacheLib(libs, request.url);
  } catch (err) {
    try { return await fetch(request); } catch (err2) { return Response.error(); }
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // cache:'reload' salta la caché HTTP del navegador/hosting: si no, un
      // sw.js nuevo podría guardar en su caché archivos viejos.
      Promise.all(SHELL_ASSETS.map((url) => cache.add(new Request(url, { cache: 'reload' }))))
    ).then(() => warmLibs().catch(() => { /* las librerías se guardarán al pedirlas */ }))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      // Solo los shells viejos: LIBS_CACHE se conserva entre versiones.
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('bitacora-shell-') && k !== CACHE_NAME).map((k) => caches.delete(k))))
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

  // Librerías de CDN: caché primero (ver libResponse).
  if (LIB_HOSTS.has(url.hostname)) {
    if (event.request.method === 'GET') event.respondWith(libResponse(event.request));
    return;
  }

  // Cualquier otro origen y todo lo de la API: sin interceptar, se comportan
  // como si no hubiera service worker.
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
