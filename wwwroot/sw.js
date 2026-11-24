// Copyright (c) 2026 thezencirs - Circle FIDIC Network-First Offline-Fallback Service Worker
const CACHE_NAME = 'circle-fidic-v3';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/i18n.js',
  '/app.js',
  '/data/fidic_kb.json',
  '/samples/kat_plani_rev02.svg',
  '/icon-192.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, clone)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
