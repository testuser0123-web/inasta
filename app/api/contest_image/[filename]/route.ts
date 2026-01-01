import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const resolvedParams = await params;
  const idStr = resolvedParams.filename.split('.')[0];
  const id = parseInt(idStr, 10);

  // Common headers for all responses to support crossOrigin="anonymous"
  const HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Cross-Origin-Resource-Policy': 'cross-origin',
  };

  if (isNaN(id)) {
    return new NextResponse('Invalid ID', { status: 400, headers: HEADERS });
  }

  const CACHE_CONTROL = 'public, max-age=31536000, s-maxage=31536000, immutable';

  try {
    const post = await db.contestPost.findUnique({
      where: { id },
      select: { imageUrl: true },
    });

    if (!post) {
      return new NextResponse('Not Found', { status: 404, headers: HEADERS });
    }

    const imageUrl = post.imageUrl;

    // Proxy URL
    if (imageUrl.startsWith('http')) {
        const response = await fetch(imageUrl);
        if (!response.ok) {
            return new NextResponse('Error fetching image', { status: response.status, headers: HEADERS });
        }
        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        const buffer = await response.arrayBuffer();

        return new NextResponse(buffer, {
            headers: {
                ...HEADERS,
                'Content-Type': contentType,
                'Cache-Control': CACHE_CONTROL,
            }
        });
    }

    // Check if it's a Data URI
    if (!imageUrl.startsWith('data:')) {
         return new NextResponse('Invalid Image Format', { status: 500, headers: HEADERS });
    }

    const commaIndex = imageUrl.indexOf(',');
    if (commaIndex === -1) {
        return new NextResponse('Invalid Image Data', { status: 500, headers: HEADERS });
    }

    const meta = imageUrl.substring(5, commaIndex);
    const base64Data = imageUrl.substring(commaIndex + 1);
    const mimeType = meta.split(';')[0];
    const buffer = Buffer.from(base64Data, 'base64');

    const response = new NextResponse(buffer, {
      headers: {
        ...HEADERS,
        'Content-Type': mimeType,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': CACHE_CONTROL,
        'CDN-Cache-Control': CACHE_CONTROL,
      },
    });

    return response;

  } catch (error) {
      console.error('Error serving contest image:', error);
      return new NextResponse('Internal Server Error', { status: 500, headers: HEADERS });
  }
}
