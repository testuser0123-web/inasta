'use client';

import { fetchCustomEmojis } from '@/app/actions/custom-emoji';
import type { CustomEmojiSummary } from '@/lib/reactions';

let customEmojiCache: CustomEmojiSummary[] | null = null;
let customEmojiPromise: Promise<CustomEmojiSummary[]> | null = null;

export function getCustomEmojiImageSrc(customEmoji: CustomEmojiSummary) {
  return customEmoji.imageUrl || '';
}

export function preloadCustomEmojiImages(emojis: CustomEmojiSummary[]) {
  if (typeof window === 'undefined') return;

  emojis.forEach((emoji) => {
    const src = getCustomEmojiImageSrc(emoji);
    if (!src) return;

    const image = new Image();
    image.decoding = 'async';
    image.src = src;
  });
}

export async function loadCustomEmojis() {
  if (customEmojiCache) return customEmojiCache;

  customEmojiPromise ??= fetchCustomEmojis()
    .then((emojis) => {
      customEmojiCache = emojis;
      preloadCustomEmojiImages(emojis);
      return emojis;
    })
    .finally(() => {
      customEmojiPromise = null;
    });

  return customEmojiPromise;
}

export function warmCustomEmojis() {
  if (customEmojiCache || customEmojiPromise || typeof window === 'undefined') return;

  const warm = () => {
    void loadCustomEmojis().catch(() => {
      // Picker open path still reports the user-facing error. Idle warmup stays silent.
    });
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(warm, { timeout: 1500 });
  } else {
    setTimeout(warm, 250);
  }
}

export function primeCustomEmojiCache(emojis: CustomEmojiSummary[]) {
  customEmojiCache = emojis;
  preloadCustomEmojiImages(emojis);
}

export function invalidateCustomEmojiCache() {
  customEmojiCache = null;
  customEmojiPromise = null;
}
