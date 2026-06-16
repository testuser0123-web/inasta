import { db } from '@/lib/db';
import { unstable_cache } from 'next/cache';
import { NextResponse } from 'next/server';

const CACHE_CONTROL = 'public, max-age=31536000, s-maxage=31536000, immutable';

const getCachedCustomEmoji = unstable_cache(
  async (id: number) => db.customEmoji.findUnique({
    where: { id },
    select: { imageUrl: true, mimeType: true, isActive: true },
  }),
  ['custom-emoji:image'],
  { tags: ['custom-emojis'], revalidate: 300 }
);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const id = Number.parseInt(filename.split('.')[0] ?? '', 10);

  if (!Number.isInteger(id) || id <= 0) {
    return new NextResponse('Invalid custom emoji id', { status: 400 });
  }

  const customEmoji = await getCachedCustomEmoji(id);

  if (!customEmoji || !customEmoji.isActive) {
    return new NextResponse('Not Found', { status: 404 });
  }

  const response = await fetch(customEmoji.imageUrl);
  if (!response.ok) {
    return new NextResponse('Error fetching custom emoji', { status: response.status });
  }

  const contentType = response.headers.get('content-type') || customEmoji.mimeType || 'image/webp';
  return new NextResponse(response.body, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': CACHE_CONTROL,
      'CDN-Cache-Control': CACHE_CONTROL,
      'Cross-Origin-Resource-Policy': 'cross-origin',
    },
  });
}
