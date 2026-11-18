/*
 * Service worker de MetaHub: caché básico de la interfaz (no de los datos).
 *
 * - Navegación (HTML): primero red; sin conexión, la última interfaz guardada.
 * - /assets/* (archivos con hash de Vite): primero caché; nunca cambian de contenido.
 * - Íconos, manifest y fuentes: se sirven desde caché y se actualizan en segundo plano.
 * - /api/*: NUNCA se guarda. Los datos de atletas y videos son personales y deben ser actuales.
 *
 * El marcador de VERSION se reemplaza al compilar (plugin metahub-sw-version de vite.config.js), así cada versión usa su propio caché
 * y la anterior se elimina al activarse.
 */
const VERSION = '__BUILD_ID__';
const CACHE = 'metahub-ui-' + VERSION;
const SHELL = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/favicon.png'];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('metahub-ui-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put('/', response.clone());
    return response;
  } catch {
    return (await cache.match('/')) || Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  const update = fetch(request)
    .then(response => { if (response.ok || response.type === 'opaque') cache.put(request, response.clone()); return response; })
    .catch(() => hit);
  return hit || update;
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith('/api/')) return;              // datos: siempre a la red
    if (request.mode === 'navigate') return event.respondWith(networkFirst(request));
    if (url.pathname.startsWith('/assets/')) return event.respondWith(cacheFirst(request));
    if (url.pathname.startsWith('/icons/') || url.pathname === '/manifest.webmanifest') {
      return event.respondWith(staleWhileRevalidate(request));
    }
    return;
  }
  if (FONT_HOSTS.includes(url.hostname)) event.respondWith(staleWhileRevalidate(request));
});
