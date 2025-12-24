import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const resolvedParams = await params;
  const idStr = resolvedParams.filename.split('.')[0];
  const id = parseInt(idStr, 10);

  const headers = {
    'Cross-Origin-Resource-Policy': 'cross-origin',
  };

  if (isNaN(id)) {
    return new NextResponse('Invalid ID', { status: 400, headers });
  }

  const CACHE_CONTROL =
    'public, max-age=31536000, s-maxage=31536000, immutable';

  try {
    const post = await db.post.findUnique({
      where: { id },
      select: { thumbnailUrl: true },
    });

    if (!post || !post.thumbnailUrl) {
      return new NextResponse('Not Found', { status: 404, headers });
    }

    const imageUrl = post.thumbnailUrl;

    // Proxy URL
    if (imageUrl.startsWith('http')) {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        return new NextResponse('Error fetching image', {
          status: response.status,
          headers,
        });
      }
      const contentType =
        response.headers.get('content-type') || 'application/octet-stream';
      const buffer = await response.arrayBuffer();

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': CACHE_CONTROL,
          ...headers,
        },
      });
    }

    // Check if it's a Data URI
    if (!imageUrl.startsWith('data:')) {
      return new NextResponse('Invalid Image Format', { status: 500, headers });
    }

    const commaIndex = imageUrl.indexOf(',');
    if (commaIndex === -1) {
      return new NextResponse('Invalid Image Data', { status: 500, headers });
    }

    const meta = imageUrl.substring(5, commaIndex);
    const base64Data = imageUrl.substring(commaIndex + 1);
    const mimeType = meta.split(';')[0];
    const buffer = Buffer.from(base64Data, 'base64');

    const response = new NextResponse(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': CACHE_CONTROL,
        'CDN-Cache-Control': CACHE_CONTROL,
        ...headers,
      },
    });

    return response;
  } catch (error) {
    console.error('Error serving post thumbnail:', error);
    return new NextResponse('Internal Server Error', { status: 500, headers });
  }
}
