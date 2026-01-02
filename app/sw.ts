import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, CacheFirst, ExpirationPlugin, CacheableResponsePlugin } from "serwist";

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
    ...defaultCache,
    {
      // Supabase & Cloudinary Images
      // Matches:
      // - https://*.supabase.co/storage/v1/object/public/**
      // - https://res.cloudinary.com/**
      matcher: /^https:\/\/(.+)\.(supabase\.co|cloudinary\.com)\/.+/,
      handler: new CacheFirst({
        cacheName: "cross-origin-images",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24 * 30, // 30 Days
            purgeOnQuotaError: true,
          }),
          new CacheableResponsePlugin({
            // IMPORTANT: With COEP: require-corp, we MUST ONLY cache requests that return status 200.
            // Opaque responses (status 0) are NOT CORS-safe and will be blocked by the browser
            // when served from the service worker to a COEP-protected page.
            statuses: [200],
          }),
        ],
      }),
    },
  ],
});

serwist.addEventListeners();
