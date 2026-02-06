// Lord Tickets - Service Worker
// Provides offline support and caching

const CACHE_NAME = 'lord-tickets-v2';
const STATIC_CACHE = 'lord-tickets-static-v2';
const DATA_CACHE = 'lord-tickets-data-v2';

// Files to cache for offline use
const STATIC_FILES = [
    '/',
    '/index.html',
    '/inventory.html',
    '/login.html',
    '/calendar.html',
    '/analytics.html',
    '/users.html',
    '/flight-detail.html',
    '/setup.html',
    '/js/nav.js',
    '/js/documents.js',
    '/manifest.json',
    'https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800&display=swap',
    'https://fonts.googleapis.com/icon?family=Material+Icons',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js'
];

// Install event - cache static files
self.addEventListener('install', event => {
    console.log('[SW] Installing Service Worker...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('[SW] Caching static files');
                return cache.addAll(STATIC_FILES.filter(url => !url.startsWith('http')));
            })
            .then(() => self.skipWaiting())
            .catch(err => console.log('[SW] Cache error:', err))
    );
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
    console.log('[SW] Activating Service Worker...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(name => name !== STATIC_CACHE && name !== DATA_CACHE)
                        .map(name => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') return;
    
    // Skip Supabase API requests (always fetch fresh)
    if (url.hostname.includes('supabase')) {
        event.respondWith(
            fetch(request)
                .then(response => {
                    // Clone and cache data responses
                    if (response.ok && url.pathname.includes('/rest/v1/')) {
                        const responseClone = response.clone();
                        caches.open(DATA_CACHE).then(cache => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // Return cached data if offline
                    return caches.match(request);
                })
        );
        return;
    }
    
    // For static files - network first, cache fallback
    event.respondWith(
        fetch(request)
            .then(response => {
                // Cache successful responses for offline use
                if (response.ok) {
                    const responseClone = response.clone();
                    caches.open(STATIC_CACHE).then(cache => {
                        cache.put(request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Network failed - try cache
                return caches.match(request)
                    .then(cachedResponse => {
                        if (cachedResponse) return cachedResponse;
                        // Offline fallback for HTML pages
                        if (request.headers.get('accept')?.includes('text/html')) {
                            return caches.match('/offline.html');
                        }
                    });
            })
    );
});

// Background sync for offline actions
self.addEventListener('sync', event => {
    console.log('[SW] Background sync:', event.tag);
    
    if (event.tag === 'sync-passengers') {
        event.waitUntil(syncOfflineData());
    }
});

// Sync offline data when back online
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
        
        // Clear offline queue after successful sync
        await clearOfflineQueue();
        
        // Notify clients
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({ type: 'SYNC_COMPLETE' });
        });
    } catch (error) {
        console.error('[SW] Sync failed:', error);
    }
}

// IndexedDB helpers for offline queue
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
            const getAllRequest = store.getAll();
            
            getAllRequest.onsuccess = () => resolve(getAllRequest.result || []);
            getAllRequest.onerror = () => reject(getAllRequest.error);
        };
    });
}

function clearOfflineQueue() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('LordTicketsOffline', 1);
        
        request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction('queue', 'readwrite');
            const store = tx.objectStore('queue');
            store.clear();
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        };
    });
}

// Push notifications (for future use)
self.addEventListener('push', event => {
    const data = event.data?.json() || {};
    
    const options = {
        body: data.body || 'התראה חדשה מ-Lord Tickets',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-72.png',
        vibrate: [100, 50, 100],
        data: data.url || '/',
        dir: 'rtl',
        lang: 'he',
        actions: [
            { action: 'open', title: 'פתח' },
            { action: 'close', title: 'סגור' }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title || 'Lord Tickets', options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    if (event.action === 'open' || !event.action) {
        event.waitUntil(
            clients.openWindow(event.notification.data || '/')
        );
    }
});

console.log('[SW] Service Worker loaded');
