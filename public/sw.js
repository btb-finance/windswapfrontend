// WindSwap Service Worker - Caches static assets for offline/instant load

const CACHE_NAME = 'windswap-v1';
const STATIC_ASSETS = [
    '/',
    '/swap',
    '/pools',
    '/logo.png',
];

// Install - cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching static assets');
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch - network first, fallback to cache
self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Skip non-GET and API requests
    if (request.method !== 'GET') return;
    if (request.url.includes('/api/') || request.url.includes('rpc')) return;
    if (request.url.includes('dexscreener') || request.url.includes('subgraph')) return;

    event.respondWith(
        fetch(request)
            .then((response) => {
                // Cache successful responses
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, clone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Fallback to cache
                return caches.match(request).then((cached) => {
                    if (cached) return cached;
                    // Return offline page for navigation requests
                    if (request.mode === 'navigate') {
                        return caches.match('/');
                    }
                    return new Response('Offline', { status: 503 });
                });
            })
    );
});
