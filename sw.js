// Service Worker para Escola da Fé PWA
const CACHE_NAME = 'escoladafe-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through padrão para navegação e requisições dinâmicas
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
