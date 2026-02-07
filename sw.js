// Lord Tickets - Service Worker v7
// NEVER caches HTML files — always fetches fresh from network
// Only caches external CDN resources for offline use

const CACHE_NAME = 'lord-tickets-v7';

// Only cache external CDN resources (never local HTML/JS files)
const CDN_HOSTS = [
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'cdn.jsdelivr.net',
    'cdn.sheetjs.com'
];

// Install — skip waiting immediately
self.addEventListener('install', event => {
    console.log('[SW v7] Installing...');
    self.skipWaiting();
});

// Activate — delete ALL old caches, claim clients
self.addEventListener('activate', event => {
    console.log('[SW v7] Activating...');
    event.waitUntil(
        caches.keys()
            .then(names => Promise.all(
                names.filter(n => n !== CACHE_NAME).map(n => {
                    console.log('[SW v7] Deleting old cache:', n);
                    return caches.delete(n);
                })
            ))
            .then(() => self.clients.claim())
    );
});

// Listen for skip waiting message
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Fetch — NEVER cache local files, only cache CDN resources
self.addEventListener('fetch', event => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // CDN resources: cache-first (fonts, chart.js, xlsx)
    if (CDN_HOSTS.some(host => url.hostname.includes(host))) {
        event.respondWith(
            caches.match(request).then(cached => {
                if (cached) return cached;
                return fetch(request).then(response => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(c => c.put(request, clone));
                    }
                    return response;
                });
            })
        );
        return;
    }

    // Everything else (HTML, JS, API): ALWAYS fetch from network, no caching
    // This ensures code changes are immediately visible
});

// Background sync
self.addEventListener('sync', event => {
    if (event.tag === 'sync-passengers') {
        event.waitUntil(syncOfflineData());
    }
});

async function syncOfflineData() {
    try {
        const offlineData = await getOfflineQueue();
        for (const item of offlineData) {
            await fetch(item.url, {
                method: item.method,
                headers: item.headers,
                body: JSON.stringify(item.body)
            });
        }
        await clearOfflineQueue();
        const clients = await self.clients.matchAll();
        clients.forEach(client => client.postMessage({ type: 'SYNC_COMPLETE' }));
    } catch (error) {
        console.error('[SW v7] Sync failed:', error);
    }
}

function getOfflineQueue() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('LordTicketsOffline', 1);
        request.onerror = () => reject(request.error);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('queue')) {
                db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
            }
        };
        request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction('queue', 'readonly');
            const store = tx.objectStore('queue');
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
        };
    });
}

function clearOfflineQueue() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('LordTicketsOffline', 1);
        request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction('queue', 'readwrite');
            tx.objectStore('queue').clear();
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        };
    });
}

// Push notifications
self.addEventListener('push', event => {
    const data = event.data?.json() || {};
    event.waitUntil(
        self.registration.showNotification(data.title || 'Lord Tickets', {
            body: data.body || 'התראה חדשה',
            icon: './icons/icon.svg',
            badge: './icons/icon.svg',
            vibrate: [100, 50, 100],
            data: data.url || '/',
            dir: 'rtl',
            lang: 'he'
        })
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    if (event.action === 'open' || !event.action) {
        event.waitUntil(clients.openWindow(event.notification.data || './'));
    }
});

console.log('[SW v7] Service Worker loaded');
