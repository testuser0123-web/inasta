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
    {
      // Supabase & Cloudinary Images
      // Matches:
      // - https://*.supabase.co/storage/v1/object/public/**
      // - https://res.cloudinary.com/**
      // Moved to TOP to ensure precedence over defaultCache
      matcher: /^https:\/\/(.+)\.(supabase\.co|cloudinary\.com)\/.+/,
      handler: async ({ request, event, params }) => {
        const strategy = new CacheFirst({
          cacheName: "cross-origin-images",
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
              statuses: [200],
            }),
          ],
        });

        const response = await strategy.handle({ request, event });

        // If we have a valid 200 response, we MUST ensure it has the correct CORP header
        // to satisfy the browser's Cross-Origin-Embedder-Policy: require-corp.
        // We act as a proxy here: enforcing strict security compliance so the browser
        // doesn't block the image.
        if (response && response.status === 200) {
          const newHeaders = new Headers(response.headers);
          newHeaders.set("Cross-Origin-Resource-Policy", "cross-origin");

          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
          });
        }

        return response;
      },
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();
