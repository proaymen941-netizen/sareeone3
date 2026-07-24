// Service Worker for Tamtom Delivery App
// This file provides runtime caching configuration for vite-plugin-pwa

export function register() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then(
        (registration) => {
          console.log('ServiceWorker registration successful:', registration);
        },
        (err) => {
          console.log('ServiceWorker registration failed: ', err);
        }
      );
    });
  }
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}

// Runtime caching configuration for API calls
export const apiCacheConfig = {
  cacheName: 'tamtom-api-cache',
  expiration: {
    maxEntries: 100,
    maxAgeSeconds: 60 * 60 * 24, // 24 hours
  },
  cacheableResponse: {
    statuses: [0, 200],
  },
};

// Runtime caching for static assets
export const staticCacheConfig = {
  cacheName: 'tamtom-static-cache',
  expiration: {
    maxEntries: 50,
    maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
  },
  cacheableResponse: {
    statuses: [0, 200],
  },
};
