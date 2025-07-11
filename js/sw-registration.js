// js/sw-registration.js - Service Worker Registration & Performance Monitoring
// Extracted from index.html for better organization and caching

/**
 * Enhanced Service Worker Registration with update handling and performance monitoring
 */
export function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(registration => {
                    console.log('✅ Service Worker registered successfully');
                    console.log('📍 Scope:', registration.scope);
                    
                    // Check for immediate updates
                    if (registration.installing) {
                        console.log('🔄 New Service Worker installing...');
                    } else if (registration.waiting) {
                        console.log('⏳ New Service Worker waiting to activate');
                        // Auto-activate new version
                        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                    }
                    
                    // Listen for updates
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        console.log('🔄 Service Worker update found - installing new version');
                        
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed') {
                                if (navigator.serviceWorker.controller) {
                                    console.log('🎉 New Service Worker installed! Taking control...');
                                    // Auto-refresh for immediate performance improvement
                                    setTimeout(() => {
                                        console.log('🔄 Refreshing for new cache...');
                                        window.location.reload();
                                    }, 500);
                                } else {
                                    console.log('✅ Service Worker installed for first time');
                                }
                            }
                        });
                    });
                    
                    // Handle controller change
                    navigator.serviceWorker.addEventListener('controllerchange', () => {
                        console.log('🚀 Service Worker controller changed - new version active');
                    });
                    
                    // Get service worker version info
                    if (registration.active) {
                        const messageChannel = new MessageChannel();
                        messageChannel.port1.onmessage = (event) => {
                            console.log(`📋 Service Worker: ${event.data.version}, Cache: ${event.data.cache}`);
                        };
                        registration.active.postMessage({ type: 'GET_VERSION' }, [messageChannel.port2]);
                    }
                    
                })
                .catch(error => {
                    console.log('❌ Service Worker registration failed:', error);
                    console.log('💡 App will continue working without caching');
                });
        });
        
        // Initialize performance monitoring
        initPerformanceMonitoring();
        
    } else {
        console.log('❌ Service Worker not supported in this browser');
        console.log('💡 App will work normally without caching');
    }
}

/**
 * Performance monitoring and reporting
 */
function initPerformanceMonitoring() {
    if (window.performance && window.performance.navigation) {
        const perfData = window.performance.getEntriesByType('navigation')[0];
        if (perfData) {
            setTimeout(() => {
                const loadTime = perfData.loadEventEnd - perfData.fetchStart;
                console.log(`📊 Page load performance: ${loadTime.toFixed(2)}ms`);
                
                if (loadTime < 200) {
                    console.log('🚀 Lightning fast! Cache working perfectly');
                } else if (loadTime < 500) {
                    console.log('⚡ Very fast loading');
                } else if (loadTime < 1000) {
                    console.log('✅ Good loading speed');
                } else {
                    console.log('💡 First visit or cache building...');
                }
                
                // Report to analytics if needed
                reportPerformanceMetrics({
                    loadTime,
                    cacheStatus: loadTime < 500 ? 'hit' : 'miss',
                    timestamp: Date.now()
                });
                
            }, 100);
        }
    }
}

/**
 * Optional: Report performance metrics to analytics
 */
function reportPerformanceMetrics(metrics) {
    // Store locally for debugging
    if (typeof(Storage) !== "undefined") {
        const perfHistory = JSON.parse(localStorage.getItem('perfMetrics') || '[]');
        perfHistory.push(metrics);
        
        // Keep only last 10 measurements
        if (perfHistory.length > 10) {
            perfHistory.shift();
        }
        
        localStorage.setItem('perfMetrics', JSON.stringify(perfHistory));
    }
    
    // Future: Send to analytics service
    // analytics.track('page_load_performance', metrics);
}

/**
 * Get performance history for debugging
 */
export function getPerformanceHistory() {
    if (typeof(Storage) !== "undefined") {
        return JSON.parse(localStorage.getItem('perfMetrics') || '[]');
    }
    return [];
}

/**
 * Check if Service Worker is active
 */
export function isServiceWorkerActive() {
    return navigator.serviceWorker && navigator.serviceWorker.controller;
}
