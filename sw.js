const PREFIX = 'hub-cache';
const CACHE_NAME = PREFIX + '-v1.0.1';
const SHELL = [
    './',
    './index.html',
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

// Fetch: stale-while-revalidate. Serves cache instantly if present,
// updates the cache in the background, and falls back to cache when offline.
// This also transparently caches whatever pages get loaded into the app iframe.
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cached) => {
            const network = fetch(event.request)
                .then((response) => {
                    if (response && response.status === 200 && response.type !== 'opaque') {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    }
                    return response;
                })
                .catch(() => cached);
            return cached || network;
        })
    );
});

// Let the page ask us to pre-cache a specific URL (e.g. "save offline" on an app tile)
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'CACHE_URL' && event.data.url) {
        caches.open(CACHE_NAME).then((cache) =>
            fetch(event.data.url).then((res) => res.ok && cache.put(event.data.url, res))
        );
    }
});

