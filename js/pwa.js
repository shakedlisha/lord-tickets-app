// Lord Tickets - PWA Helper
// Handles service worker registration and install prompts

(function() {
    'use strict';
    
    let deferredPrompt = null;
    let installButton = null;
    
    // Register service worker (force-clear ALL old caches on every load)
    async function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                // Force clear ALL old caches (anything not v4)
                const cacheNames = await caches.keys();
                const oldCaches = cacheNames.filter(n => n !== 'lord-tickets-v4');
                if (oldCaches.length > 0) {
                    console.log('[PWA] Clearing old caches:', oldCaches);
                    await Promise.all(oldCaches.map(n => caches.delete(n)));
                }
                
                // Unregister any existing service workers and re-register fresh
                const existingRegs = await navigator.serviceWorker.getRegistrations();
                let hadOldSW = false;
                for (const reg of existingRegs) {
                    // Check if the active SW is outdated (not v3)
                    if (reg.active && !reg.active.scriptURL.includes('sw.js')) {
                        await reg.unregister();
                        hadOldSW = true;
                    }
                }
                
                // Use relative paths so it works on GitHub Pages subdirectories
                const basePath = new URL('.', document.baseURI).pathname;
                const registration = await navigator.serviceWorker.register(basePath + 'sw.js', {
                    scope: basePath,
                    updateViaCache: 'none' // Always fetch sw.js from network
                });
                
                console.log('[PWA] Service Worker registered:', registration.scope);
                
                // Force update check on every page load
                await registration.update();
                
                // When a new SW is found, activate it immediately
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('[PWA] New Service Worker found, installing...');
                    
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            newWorker.postMessage({ type: 'SKIP_WAITING' });
                            console.log('[PWA] New SW activated, reloading...');
                            location.reload();
                        }
                    });
                });
                
                // Listen for sync complete messages
                navigator.serviceWorker.addEventListener('message', event => {
                    if (event.data && event.data.type === 'SYNC_COMPLETE') {
                        showToast('הנתונים סונכרנו בהצלחה');
                    }
                });
                
            } catch (error) {
                console.error('[PWA] Service Worker registration failed:', error);
            }
        }
    }
    
    // Handle install prompt
    function handleInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('[PWA] Install prompt available');
            e.preventDefault();
            deferredPrompt = e;
            
            // Show install button if it exists
            showInstallButton();
        });
        
        // Handle successful install
        window.addEventListener('appinstalled', () => {
            console.log('[PWA] App installed');
            deferredPrompt = null;
            hideInstallButton();
            showToast('האפליקציה הותקנה בהצלחה!');
        });
    }
    
    // Show install button
    function showInstallButton() {
        // Create floating install button if it doesn't exist
        if (!document.getElementById('pwaInstallBtn')) {
            const btn = document.createElement('button');
            btn.id = 'pwaInstallBtn';
            btn.className = 'pwa-install-btn';
            btn.innerHTML = `
                <span class="material-icons">install_mobile</span>
                <span>התקן אפליקציה</span>
            `;
            btn.onclick = promptInstall;
            document.body.appendChild(btn);
            
            // Add styles
            const style = document.createElement('style');
            style.textContent = `
                .pwa-install-btn {
                    position: fixed;
                    bottom: 20px;
                    left: 20px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: linear-gradient(135deg, #D4AF37 0%, #B8960C 100%);
                    color: #0F1F3A;
                    padding: 12px 20px;
                    border: none;
                    border-radius: 30px;
                    font-family: 'Heebo', sans-serif;
                    font-size: 0.9rem;
                    font-weight: 600;
                    cursor: pointer;
                    box-shadow: 0 4px 20px rgba(212, 175, 55, 0.4);
                    z-index: 9999;
                    animation: pwa-bounce 2s ease-in-out infinite;
                    transition: transform 0.2s;
                }
                
                .pwa-install-btn:hover {
                    transform: scale(1.05);
                }
                
                .pwa-install-btn .material-icons {
                    font-size: 1.2rem;
                }
                
                @keyframes pwa-bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                }
                
                @media (max-width: 480px) {
                    .pwa-install-btn span:not(.material-icons) {
                        display: none;
                    }
                    .pwa-install-btn {
                        padding: 12px;
                        border-radius: 50%;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        installButton = document.getElementById('pwaInstallBtn');
        installButton.style.display = 'flex';
    }
    
    // Hide install button
    function hideInstallButton() {
        if (installButton) {
            installButton.style.display = 'none';
        }
    }
    
    // Prompt user to install
    async function promptInstall() {
        if (!deferredPrompt) {
            console.log('[PWA] No install prompt available');
            return;
        }
        
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        console.log('[PWA] User choice:', outcome);
        
        if (outcome === 'accepted') {
            hideInstallButton();
        }
        
        deferredPrompt = null;
    }
    
    // Show update notification
    function showUpdateNotification() {
        const notification = document.createElement('div');
        notification.className = 'pwa-update-notification';
        notification.innerHTML = `
            <span>גרסה חדשה זמינה!</span>
            <button onclick="location.reload()">עדכן עכשיו</button>
        `;
        document.body.appendChild(notification);
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .pwa-update-notification {
                position: fixed;
                top: 70px;
                left: 50%;
                transform: translateX(-50%);
                background: #1B365D;
                color: white;
                padding: 12px 20px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                gap: 15px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                z-index: 10000;
                font-family: 'Heebo', sans-serif;
            }
            
            .pwa-update-notification button {
                background: #D4AF37;
                color: #0F1F3A;
                border: none;
                padding: 8px 16px;
                border-radius: 6px;
                font-family: 'Heebo', sans-serif;
                font-weight: 600;
                cursor: pointer;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Check if running as installed PWA
    function isStandalone() {
        return window.matchMedia('(display-mode: standalone)').matches ||
               window.navigator.standalone === true;
    }
    
    // Show toast message
    function showToast(message) {
        let toast = document.getElementById('pwaToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'pwaToast';
            toast.style.cssText = `
                position: fixed;
                bottom: 80px;
                left: 50%;
                transform: translateX(-50%);
                background: #28A745;
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                font-family: 'Heebo', sans-serif;
                z-index: 10000;
                opacity: 0;
                transition: opacity 0.3s;
            `;
            document.body.appendChild(toast);
        }
        
        toast.textContent = message;
        toast.style.opacity = '1';
        
        setTimeout(() => {
            toast.style.opacity = '0';
        }, 3000);
    }
    
    // Add to offline queue
    function addToOfflineQueue(url, method, headers, body) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('LordTicketsOffline', 1);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('queue')) {
                    db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
                }
            };
            
            request.onsuccess = () => {
                const db = request.result;
                const tx = db.transaction('queue', 'readwrite');
                const store = tx.objectStore('queue');
                
                store.add({
                    url,
                    method,
                    headers,
                    body,
                    timestamp: Date.now()
                });
                
                tx.oncomplete = () => {
                    resolve();
                    // Request background sync
                    if ('sync' in navigator.serviceWorker) {
                        navigator.serviceWorker.ready.then(registration => {
                            registration.sync.register('sync-passengers');
                        });
                    }
                };
                
                tx.onerror = () => reject(tx.error);
            };
        });
    }
    
    // Initialize
    function init() {
        registerServiceWorker();
        handleInstallPrompt();
        
        // Log if running as PWA
        if (isStandalone()) {
            console.log('[PWA] Running as installed app');
        }
    }
    
    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Expose to global scope
    window.LordPWA = {
        promptInstall,
        isStandalone,
        addToOfflineQueue,
        showToast
    };
})();
