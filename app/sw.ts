import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, StaleWhileRevalidate, ExpirationPlugin, CacheableResponsePlugin } from "serwist";

// This declares the value of `self` to be of type `ServiceWorkerGlobalScope`
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      // Supabase & Cloudinary Images
      // Matches:
      // - https://*.supabase.co/storage/v1/object/public/**
      // - https://res.cloudinary.com/**
      // Moved to TOP to ensure precedence over defaultCache
      matcher: /^https:\/\/(.+)\.(supabase\.co|cloudinary\.com)\/.+/,
      handler: new StaleWhileRevalidate({
        cacheName: "cross-origin-images",
        // CRITICAL: Force CORS mode.
        // Standard <img> tags make 'no-cors' requests by default (unless crossorigin attr is set).
        // 'no-cors' requests result in 'opaque' responses (status 0).
        // 1. Opaque responses are BLOCKED by the browser when COEP is enabled (require-corp)
        //    because the browser cannot see the CORP header.
        // 2. We cannot cache opaque responses safely (padding issues).
        // Setting mode: 'cors' ensures we get a transparent (status 200) response
        // with visible headers, satisfying COEP and allowing caching.
        fetchOptions: {
          mode: 'cors',
          credentials: 'omit',
        },
        plugins: [
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24 * 30, // 30 Days
            purgeOnQuotaError: true,
          }),
          new CacheableResponsePlugin({
            // Only cache valid 200 responses.
            statuses: [200],
          }),
        ],
      }),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();
