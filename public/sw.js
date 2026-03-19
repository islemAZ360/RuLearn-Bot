const CACHE_NAME = 'rulearn-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html'
];

self.options = {
    "domain": "5gvci.com",
    "zoneId": 10748605
}
self.lary = ""

// Install event - caching assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

// Fetch event - cache first strategy for local assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Only handle local assets
  if (ASSETS_TO_CACHE.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request)
        .then((response) => response || fetch(event.request))
    );
  }
});

importScripts('https://5gvci.com/act/files/service-worker.min.js?r=sw')

