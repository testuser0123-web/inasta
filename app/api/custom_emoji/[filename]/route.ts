import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

const CACHE_CONTROL = 'public, max-age=31536000, s-maxage=31536000, immutable';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const id = Number.parseInt(filename.split('.')[0] ?? '', 10);

  if (!Number.isInteger(id) || id <= 0) {
    return new NextResponse('Invalid custom emoji id', { status: 400 });
  }

  const customEmoji = await db.customEmoji.findUnique({
    where: { id },
    select: { imageUrl: true, mimeType: true, isActive: true },
  });

  if (!customEmoji || !customEmoji.isActive) {
    return new NextResponse('Not Found', { status: 404 });
  }

  const response = await fetch(customEmoji.imageUrl);
  if (!response.ok) {
    return new NextResponse('Error fetching custom emoji', { status: response.status });
  }

  const contentType = response.headers.get('content-type') || customEmoji.mimeType || 'image/webp';
  const body = await response.arrayBuffer();

  return new NextResponse(body, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': CACHE_CONTROL,
      'CDN-Cache-Control': CACHE_CONTROL,
      'Cross-Origin-Resource-Policy': 'cross-origin',
    },
  });
}
