// Service Worker para Escola da Fé PWA
const CACHE_NAME = 'escoladafe-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Pass-through padrão para navegação e requisições dinâmicas
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
