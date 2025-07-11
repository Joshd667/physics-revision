// sw.js - Fixed Service Worker for Physics Audit Tool
// Place this file in your project root (same folder as index.html)

const CACHE_NAME = 'physics-audit-v1.3'; // Incremented for favicon addition
const APP_VERSION = '1.3';

// 🎯 Corrected resource list - only paths that actually exist
const CRITICAL_RESOURCES = [
    // Main page (the one that shows "🌐 Fetching: /")
    './',
    './index.html',
    './favicon.ico', // Added favicon
    
    // Core app files (these are working already)
    './css/style.css',
    './js/app-loader.js',
    './js/physics-audit-tool.js',
    './js/data/revision-mappings.js',
    './js/data/index.js',
    './js/data/unified-csv-loader.js',
    './js/data/combined-data.json',
    
    // Module dependencies
    './js/modules/auth.js',
    './js/modules/data-management.js',
    './js/modules/navigation.js',
    './js/modules/search.js',
    './js/modules/statistics.js',
    './js/modules/ui-helpers.js',
    
    // External resources that work
    'https://unpkg.com/alpinejs@3.x.x/dist/module.esm.js',
    'https://unpkg.com/lucide@latest/dist/umd/lucide.js'
    
    // Note: Removed Tailwind CSS due to CORS policy
    // Note: Removed duplicate ./physics-audit/ paths that don't exist
];

// 🔧 Install event - cache only resources that exist
self.addEventListener('install', event => {
    console.log(`🔧 Service Worker ${APP_VERSION} installing...`);
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('📦 Caching verified resources...');
                
                // Cache resources with individual error handling
                const cachePromises = CRITICAL_RESOURCES.map(url => 
                    cache.add(url)
                        .then(() => {
                            console.log(`✅ Cached: ${url}`);
                            return { url, success: true };
                        })
                        .catch(error => {
                            console.warn(`⚠️ Failed to cache ${url}:`, error.message);
                            return { url, success: false, error: error.message };
                        })
                );
                
                return Promise.all(cachePromises);
            })
            .then(results => {
                const successful = results.filter(r => r.success).length;
                const failed = results.filter(r => !r.success).length;
                
                console.log(`✅ Successfully cached ${successful}/${CRITICAL_RESOURCES.length} resources`);
                if (failed > 0) {
                    console.log(`⚠️ Failed to cache ${failed} resources (expected for some external URLs)`);
                }
                
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('❌ Cache installation failed:', error);
                return self.skipWaiting(); // Continue anyway
            })
    );
});

// 🚀 Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log(`🚀 Service Worker ${APP_VERSION} activating...`);
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(cacheName => cacheName !== CACHE_NAME)
                    .map(oldCacheName => {
                        console.log(`🗑️ Deleting old cache: ${oldCacheName}`);
                        return caches.delete(oldCacheName);
                    })
            );
        }).then(() => {
            console.log('✅ Service Worker activated and caches cleaned');
            return self.clients.claim();
        })
    );
});

// ⚡ Fetch event - handle requests efficiently
self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);
    
    // Only handle GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Handle same-origin requests and specific external resources
    if (url.origin === location.origin || isAllowedExternalResource(url)) {
        event.respondWith(handleRequest(request));
    }
});

// 🎯 Optimized request handler
async function handleRequest(request) {
    const url = new URL(request.url);
    
    try {
        // Check cache first
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            console.log(`⚡ Cache hit: ${url.pathname}`);
            return cachedResponse;
        }
        
        // Not in cache - fetch from network
        console.log(`🌐 Fetching: ${url.pathname}`);
        const networkResponse = await fetch(request);
        
        // Cache successful responses for same-origin resources
        if (networkResponse.status === 200 && url.origin === location.origin) {
            try {
                const cache = await caches.open(CACHE_NAME);
                await cache.put(request, networkResponse.clone());
                console.log(`💾 Cached new resource: ${url.pathname}`);
            } catch (cacheError) {
                console.warn(`Failed to cache ${url.pathname}:`, cacheError);
            }
        }
        
        return networkResponse;
        
    } catch (error) {
        console.error(`❌ Fetch failed for ${url.pathname}:`, error);
        
        // Offline fallback for HTML requests
        if (request.destination === 'document') {
            const fallback = await caches.match('./index.html');
            if (fallback) {
                console.log('🔄 Serving offline fallback');
                return fallback;
            }
        }
        
        throw error;
    }
}

// 🔍 Helper function for allowed external resources
function isAllowedExternalResource(url) {
    const allowedDomains = [
        'unpkg.com'
        // Removed cdn.tailwindcss.com due to CORS issues
    ];
    
    return allowedDomains.some(domain => url.hostname.includes(domain));
}

// 📱 Handle messages from main thread
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ 
            version: APP_VERSION, 
            cache: CACHE_NAME,
            resources: CRITICAL_RESOURCES.length
        });
    }
});

console.log(`🔧 Service Worker ${APP_VERSION} loaded with ${CRITICAL_RESOURCES.length} resources to cache`);
