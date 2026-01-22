// Minimal Service Worker for PWA
// No offline caching - just registers as a service worker for PWA requirements

const CACHE_NAME = 'pow-v1';

// Install event - minimal setup
self.addEventListener('install', (event) => {
    console.log('[SW] Install');
    self.skipWaiting();
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activate');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Fetch event - pass through all requests (no offline support)
self.addEventListener('fetch', (event) => {
    // Let the browser handle all fetches normally
    // No caching, no offline support
    return;
});
