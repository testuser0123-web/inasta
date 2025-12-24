export function getBaseUrl() {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return `http://localhost:${process.env.PORT || 3000}`;
}

export function getOptimizedImageUrl(
  originalUrl: string | null | undefined,
  id: number,
  type: 'post' | 'diary' | 'avatar' | 'post_thumbnail' | 'contest',
  fallbackToProxy: boolean = true
): string {
  if (!originalUrl) {
    if (!fallbackToProxy) return '';
    // Generate proxy URL based on type
    switch (type) {
      case 'post':
        return `/api/image/${id}.jpg`;
      case 'post_thumbnail':
        return `/api/post_thumbnail/${id}.jpg`;
      case 'diary':
        return `/api/diary_thumbnail/${id}.jpg`;
      case 'contest':
        return `/api/contest_image/${id}.jpg`;
      case 'avatar':
        // Avatar ID is username, but here we expect ID to be number...
        // This function might need to accept string ID for avatar.
        // But for now, avatars are handled differently in most places.
        return '';
    }
  }

  // If it's a Vercel Blob URL, force proxy
  if (originalUrl.includes('vercel-storage.com')) {
    switch (type) {
      case 'post':
        return `/api/image/${id}.jpg`;
      case 'post_thumbnail':
        return `/api/post_thumbnail/${id}.jpg`;
      case 'diary':
        return `/api/diary_thumbnail/${id}.jpg`;
      case 'contest':
        return `/api/contest_image/${id}.jpg`;
    }
  }

  // If Supabase or other working URL, return as is
  return originalUrl;
}

// Special handler for video thumbnails which have complex logic in Feed.tsx
export function getVideoThumbnailUrl(post: {
  id: number;
  thumbnailUrl?: string | null;
  imageUrl?: string;
}): string {
  // If thumbnailUrl exists, check if it needs proxying
  if (post.thumbnailUrl) {
    if (post.thumbnailUrl.includes('vercel-storage.com')) {
      return `/api/post_thumbnail/${post.id}.jpg`;
    }
    return post.thumbnailUrl;
  }

  // If no thumbnailUrl, we CANNOT use imageUrl if it's a video.
  // But we can try the proxy which might find a thumbnail?
  // Actually, if mediaType is VIDEO, and no thumbnailUrl is set in DB,
  // we used to fallback to imageUrl (which is wrong for video).
  // The correct fallback for a missing video thumbnail is likely the proxy
  // (assuming the proxy might be able to find one, or we just show a placeholder).
  // But for now, let's force the proxy if thumbnail is missing for video.
  return `/api/post_thumbnail/${post.id}.jpg`;
}
