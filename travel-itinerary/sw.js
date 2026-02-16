/* ================================================
   SERVICE WORKER - Offline support & caching
   ================================================
   Strategy:
   - Static assets: Cache-first (CSS, JS, fonts, images)
   - API calls: Network-first with cache fallback
   - Navigation: Network-first with offline fallback
   ================================================ */

const CACHE_VERSION = 'v11';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;

const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './css/base.css',
    './css/admin.css',
    './css/ai-panel.css',
    './css/client.css',
    './css/print.css',
    './js/ai-config.js',
    './js/supabase-config.js',
    './js/utils.js',
    './js/router.js',
    './js/checklist.js',
    './js/sakura.js',
    './js/admin-dashboard.js',
    './js/admin-attractions.js',
    './js/ai-panel.js',
    './js/admin-form.js',
    './js/client-view.js',
    './icons/icon-192.png',
    './icons/icon-512.png',
];

const FONT_ORIGINS = [
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
];

const API_ORIGIN = 'supabase.co';

/* ---- Install: Pre-cache static assets ---- */

self.addEventListener('install', (event) => {
    console.log(`[SW ${CACHE_VERSION}] Installing...`);
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
            .catch(err => console.error('[SW] Install failed:', err))
    );
});

/* ---- Activate: Clean old caches ---- */

self.addEventListener('activate', (event) => {
    console.log(`[SW ${CACHE_VERSION}] Activating...`);
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE && key !== API_CACHE)
                    .map(key => {
                        console.log(`[SW] Deleting old cache: ${key}`);
                        return caches.delete(key);
                    })
            )
        ).then(() => self.clients.claim())
    );
});

/* ---- Fetch: Route requests to appropriate strategy ---- */

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip chrome-extension and other non-http
    if (!url.protocol.startsWith('http')) return;

    // API requests: Network-first
    if (url.hostname.includes(API_ORIGIN)) {
        event.respondWith(networkFirst(request, API_CACHE));
        return;
    }

    // Font requests: Cache-first (long-lived)
    if (FONT_ORIGINS.some(origin => request.url.startsWith(origin))) {
        event.respondWith(cacheFirst(request, DYNAMIC_CACHE));
        return;
    }

    // CDN scripts (Supabase SDK): Cache-first
    if (url.hostname.includes('cdn.jsdelivr.net')) {
        event.respondWith(cacheFirst(request, DYNAMIC_CACHE));
        return;
    }

    // Navigation requests: Network-first with offline fallback
    if (request.mode === 'navigate') {
        event.respondWith(networkFirstNav(request));
        return;
    }

    // Static assets: Cache-first
    event.respondWith(cacheFirst(request, STATIC_CACHE));
});

/* ---- Strategies ---- */

async function cacheFirst(request, cacheName) {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }
        return response;
    } catch (err) {
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
    }
}

async function networkFirst(request, cacheName) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }
        return response;
    } catch (err) {
        const cached = await caches.match(request);
        if (cached) return cached;
        return new Response(JSON.stringify({ error: 'offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

async function networkFirstNav(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch (err) {
        const cached = await caches.match('./index.html');
        if (cached) return cached;
        return new Response(offlineHTML(), {
            status: 200,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
    }
}

/* ---- Offline fallback page ---- */

function offlineHTML() {
    return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>אופליין | מסלול טיול</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Heebo', sans-serif;
            background: #FAFAFA;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 24px;
            text-align: center;
            direction: rtl;
        }
        .offline-container {
            max-width: 400px;
        }
        .offline-icon {
            font-size: 64px;
            margin-bottom: 16px;
        }
        h1 {
            font-size: 1.5rem;
            color: #212121;
            margin-bottom: 8px;
        }
        p {
            color: #616161;
            line-height: 1.6;
            margin-bottom: 24px;
        }
        button {
            background: #5C6BC0;
            color: white;
            border: none;
            padding: 12px 32px;
            border-radius: 12px;
            font-size: 1rem;
            font-family: inherit;
            cursor: pointer;
        }
        button:hover { background: #3F51B5; }
    </style>
</head>
<body>
    <div class="offline-container">
        <div class="offline-icon">📡</div>
        <h1>אין חיבור לאינטרנט</h1>
        <p>נראה שאתם לא מחוברים כרגע. המסלולים שצפיתם בהם לאחרונה עדיין זמינים אופליין.</p>
        <button onclick="location.reload()">נסו שוב</button>
    </div>
</body>
</html>`;
}

/* ---- IndexedDB for trip data caching ---- */

const DB_NAME = 'travel-itinerary-cache';
const DB_VERSION = 1;
const TRIP_STORE = 'trips';

function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(TRIP_STORE)) {
                db.createObjectStore(TRIP_STORE, { keyPath: 'id' });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function cacheTrip(trip) {
    try {
        const db = await openDB();
        const tx = db.transaction(TRIP_STORE, 'readwrite');
        tx.objectStore(TRIP_STORE).put({ ...trip, _cachedAt: Date.now() });
        return new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
    } catch (e) {
        console.error('[SW] Failed to cache trip:', e);
    }
}

async function getCachedTrip(tripId) {
    try {
        const db = await openDB();
        const tx = db.transaction(TRIP_STORE, 'readonly');
        const req = tx.objectStore(TRIP_STORE).get(tripId);
        return new Promise((resolve, reject) => {
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        });
    } catch (e) {
        return null;
    }
}

/* ---- Message handling for trip caching from main thread ---- */

self.addEventListener('message', (event) => {
    const { type, data } = event.data || {};

    if (type === 'CACHE_TRIP' && data) {
        cacheTrip(data).then(() => {
            console.log(`[SW] Cached trip: ${data.id}`);
        });
    }

    if (type === 'GET_CACHED_TRIP') {
        getCachedTrip(data.tripId).then(trip => {
            event.source.postMessage({ type: 'CACHED_TRIP', data: trip });
        });
    }

    if (type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
