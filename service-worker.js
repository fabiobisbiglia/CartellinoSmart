/* CartellinoSmart 3.2.0 — cache offline dell'applicazione. Incrementare il nome cache a ogni release. */
'use strict';

const CACHE_NAME = 'cartellinosmart-3.2.0';
const APP_SHELL = [
  './',
  './index.html',
  './anagrafica.js',
  './commesse.js',
  './xlsx.full.min.js',
  './manifest.webmanifest',
  './pwa-install.css',
  './pwa-install.js',
  './icons/cartellinosmart-192.png',
  './icons/cartellinosmart-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => key.startsWith('cartellinosmart-') && key !== CACHE_NAME)
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const scope = new URL(self.registration.scope);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await fetch(request);
      if (response && response.ok && response.type === 'basic') {
        await cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      const cached = await cache.match(request, { ignoreSearch: true });
      if (cached) return cached;
      if (request.mode === 'navigate') {
        return (await cache.match(new URL('./', scope).href)) || Response.error();
      }
      return Response.error();
    }
  })());
});
