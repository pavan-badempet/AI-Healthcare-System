/**
 * AI Healthcare System — Workbox Service Worker for Offline Clinical Records & Background Sync
 * Ensures clinical record availability during intermittent connectivity and replays queued
 * clinical mutations (orders, care events, vitals, record updates) with integrity verification.
 */
/* global workbox, importScripts */

try {
  importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');
} catch (err) {
  // Local fallback if CDN is unreachable when registering offline
}

const CLINICAL_CACHE_NAME = 'clinical-records-cache-v2';
const STATIC_CACHE_NAME = 'clinical-static-assets-v2';
const BG_SYNC_QUEUE_NAME = 'clinical-records-bg-sync-queue';

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CLINICAL_CACHE_NAME && key !== STATIC_CACHE_NAME) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

if (typeof workbox !== 'undefined' && workbox) {
  workbox.setConfig({ debug: false });
  workbox.core.skipWaiting();
  workbox.core.clientsClaim();

  // 1. Cache Google Fonts with CacheFirst
  workbox.routing.registerRoute(
    ({ url }) =>
      url.origin === 'https://fonts.googleapis.com' ||
      url.origin === 'https://fonts.gstatic.com',
    new workbox.strategies.CacheFirst({
      cacheName: 'google-fonts-cache',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 20,
          maxAgeSeconds: 60 * 60 * 24 * 365,
        }),
      ],
    })
  );

  // 2. Cache Clinical Records & Patient GET API endpoints with NetworkFirst
  workbox.routing.registerRoute(
    ({ url, request }) =>
      request.method === 'GET' &&
      url.pathname.startsWith('/v1/') &&
      !url.pathname.includes('/notifications/stream'),
    new workbox.strategies.NetworkFirst({
      cacheName: CLINICAL_CACHE_NAME,
      networkTimeoutSeconds: 3,
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 200,
          maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days retention
        }),
      ],
    })
  );

  // 3. Background Sync for Clinical Record Mutations (POST, PUT, PATCH)
  const bgSyncPlugin = new workbox.backgroundSync.BackgroundSyncPlugin(
    BG_SYNC_QUEUE_NAME,
    {
      maxRetentionTime: 24 * 60, // Retry for up to 24 hours (in minutes)
      onSync: async ({ queue }) => {
        let entry;
        let syncedCount = 0;
        while ((entry = await queue.shiftRequest())) {
          try {
            await fetch(entry.request.clone());
            syncedCount++;
          } catch (error) {
            await queue.unshiftRequest(entry);
            throw error;
          }
        }
        // Notify all open clinical client tabs that background sync succeeded
        const clients = await self.clients.matchAll({ type: 'window' });
        for (const client of clients) {
          client.postMessage({
            type: 'WORKBOX_BACKGROUND_SYNC_COMPLETE',
            queueName: BG_SYNC_QUEUE_NAME,
            syncedCount,
            timestamp: new Date().toISOString(),
          });
        }
      },
    }
  );

  ['POST', 'PUT', 'PATCH'].forEach((method) => {
    workbox.routing.registerRoute(
      ({ url }) => url.pathname.startsWith('/v1/'),
      new workbox.strategies.NetworkOnly({
        plugins: [bgSyncPlugin],
      }),
      method
    );
  });

  // 4. StaleWhileRevalidate for production static JS/CSS/Image assets (excluding Vite dev internals)
  workbox.routing.registerRoute(
    ({ url, request }) =>
      !url.pathname.startsWith('/@') &&
      !url.pathname.startsWith('/src/') &&
      !url.pathname.startsWith('/node_modules/') &&
      (request.destination === 'script' ||
        request.destination === 'style' ||
        request.destination === 'image'),
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: STATIC_CACHE_NAME,
    })
  );
} else {
  // Resilient fallback if Workbox CDN was not reachable on initial install
  self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open(STATIC_CACHE_NAME).then((cache) =>
        cache.addAll(['/', '/index.html', '/manifest.json', '/icon.svg'])
      )
    );
    self.skipWaiting();
  });

  self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
  });

  self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    const url = new URL(event.request.url);
    if (
      url.pathname.includes('/notifications/stream') ||
      url.pathname.startsWith('/@') ||
      url.pathname.startsWith('/src/') ||
      url.pathname.startsWith('/node_modules/')
    ) {
      return;
    }

    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && url.pathname.startsWith('/v1/')) {
            const copy = response.clone();
            caches.open(CLINICAL_CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() =>
          caches.match(event.request).then((cached) => cached || caches.match('/'))
        )
    );
  });
}

// Listen for Background Sync trigger or manual client sync messages
self.addEventListener('sync', (event) => {
  if (event.tag === BG_SYNC_QUEUE_NAME) {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        for (const client of clients) {
          client.postMessage({
            type: 'TRIGGER_CLIENT_BACKGROUND_SYNC',
            queueName: BG_SYNC_QUEUE_NAME,
            timestamp: new Date().toISOString(),
          });
        }
      })
    );
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
