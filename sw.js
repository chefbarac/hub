const PREFIX = 'hub-cache';
const CACHE_NAME = PREFIX + '-v1.1.5';
const SHELL = [
    './',
    './script.js',
    './style.css',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

// Install: pre-cache the app shell
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
    );
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE_NAME).map((k) => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;
    event.respondWith(cacheFirst(request));
});

async function cacheFirst(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);

    // Have it cached — serve it, no network call at all.
    if (cachedResponse) return cachedResponse;

    // Not cached yet — fetch from network and cache for next time.
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
        cache.put(request, networkResponse.clone());
    }
    return networkResponse;
}