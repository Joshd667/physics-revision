// js/sw-registration.js - Simple Service Worker Registration with Update Handling

/**
 * Register service worker with proper update handling
 */
export function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', async () => {
            try {
                const registration = await navigator.serviceWorker.register('./sw.js');
                console.log('✅ Service Worker registered successfully');
                console.log('📍 Scope:', registration.scope);
                
                // Handle updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('🔄 Service Worker update found');
                    
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('🎉 New Service Worker installed!');
                            
                            // Auto-activate in development
                            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                                console.log('🛠️ Development mode: Auto-activating');
                                newWorker.postMessage({ type: 'SKIP_WAITING' });
                            } else {
                                // Show update notification in production
                                if (confirm('🚀 New version available! Update now?')) {
                                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                                }
                            }
                        }
                    });
                });
                
                // Handle controller changes
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    console.log('🚀 Service Worker updated - reloading');
                    window.location.reload();
                });
                
                // Get version info
                if (registration.active) {
                    const messageChannel = new MessageChannel();
                    messageChannel.port1.onmessage = (event) => {
                        console.log(`📋 SW Version: ${event.data.version}, Cache: ${event.data.cache}`);
                    };
                    registration.active.postMessage({ type: 'GET_VERSION' }, [messageChannel.port2]);
                }
                
            } catch (error) {
                console.log('❌ Service Worker registration failed:', error);
            }
        });
    } else {
        console.log('❌ Service Worker not supported');
    }
}

// Performance monitoring
export function getPerformanceHistory() {
    if (typeof(Storage) !== "undefined") {
        return JSON.parse(localStorage.getItem('perfMetrics') || '[]');
    }
    return [];
}

export function isServiceWorkerActive() {
    return navigator.serviceWorker && navigator.serviceWorker.controller;
}

// Debug function - clear cache manually
window.clearSWCache = function() {
    if ('caches' in window) {
        caches.keys().then(names => {
            names.forEach(name => {
                caches.delete(name);
            });
            console.log('🗑️ All caches cleared');
            window.location.reload();
        });
    }
};

console.log('📡 SW Registration module loaded');
